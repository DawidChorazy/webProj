/**
 * Dev auth API for Vite SPA: Google OAuth + session cookie.
 * Register in Google Cloud Console (OAuth 2.0 Web application):
 * - Authorized redirect URI: same as GOOGLE_CALLBACK_URL (default localhost:5173 via Vite proxy)
 */
import { config as loadEnv } from "dotenv";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, "..", ".env") });
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import cors from "cors";
import { MongoClient } from "mongodb";

const PORT = Number(process.env.AUTH_SERVER_PORT || 3001);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ||
  `${FRONTEND_ORIGIN}/auth/google/callback`;

const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const sessionSecret = process.env.SESSION_SECRET || "dev-only-change-me";
const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB_NAME || "webProj";
const mongoStorageCollection =
  process.env.MONGODB_STORAGE_COLLECTION || "app_storage";
const mongoUsersCollection = process.env.MONGODB_USERS_COLLECTION || "users";

let mongoClientPromise;

function getMongoClient() {
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!mongoClientPromise) {
    const client = new MongoClient(mongoUri);
    mongoClientPromise = client.connect();
  }

  return mongoClientPromise;
}

async function getStorageCollection() {
  const client = await getMongoClient();
  return client.db(mongoDbName).collection(mongoStorageCollection);
}

async function getUsersCollection() {
  const client = await getMongoClient();
  return client.db(mongoDbName).collection(mongoUsersCollection);
}

function requireAuthenticated(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: "unauthorized" });
  }

  next();
}

function storageDocumentKey(req, key) {
  if (key === "currentProject") {
    return `${req.user.id}:${key}`;
  }

  return key;
}

/** @type {Map<string, { id: string; email: string; role: string; isBlocked: boolean }>} */
const usersByEmail = new Map();

function parseEmailList(s) {
  if (!s) return [];
  return s
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

const adminEmails = new Set(parseEmailList(process.env.ADMIN_EMAILS));
const blockedEmails = new Set(parseEmailList(process.env.BLOCKED_EMAILS));

function roleForEmail(email, existingRole = "Guest") {
  return adminEmails.has(email.toLowerCase()) ? "Admin" : existingRole;
}

async function upsertUserFromProfile(profile) {
  const email = (profile.emails && profile.emails[0] && profile.emails[0].value) || "";
  if (!email) return null;

  const existing = usersByEmail.get(email.toLowerCase());
  const isBlocked = blockedEmails.has(email.toLowerCase());
  const role = roleForEmail(email, existing?.role);

  const user = {
    id: existing?.id || profile.id || randomUUID(),
    email,
    role,
    isBlocked,
  };
  usersByEmail.set(email.toLowerCase(), user);

  try {
    const collection = await getUsersCollection();
    await collection.updateOne(
      { emailLower: email.toLowerCase() },
      {
        $set: {
          ...user,
          emailLower: email.toLowerCase(),
          role: roleForEmail(email, user.role),
          isBlocked,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  } catch (error) {
    console.warn(
      "[users] Could not persist OAuth user:",
      error instanceof Error ? error.message : error
    );
  }

  return user;
}

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});

if (clientID && clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL: CALLBACK_URL,
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await upsertUserFromProfile(profile);
          if (!user) return done(new Error("No email on Google profile"));
          return done(null, user);
        } catch (e) {
          return done(e);
        }
      }
    )
  );
}

app.get("/auth/google", (req, res, next) => {
  if (!clientID || !clientSecret) {
    return res.status(500).send(
      "Google OAuth is not configured. Create a file named .env next to package.json " +
        "(copy from .env.example) and set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET from " +
        "Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs. " +
        "Restart npm run dev:api (or dev:full) after saving."
    );
  }
  passport.authenticate("google", { prompt: "select_account" })(req, res, next);
});

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${FRONTEND_ORIGIN}/?login=failed`,
  }),
  (req, res) => {
    res.redirect(`${FRONTEND_ORIGIN}/`);
  }
);

app.get("/api/me", (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const u = req.user;
  const role = roleForEmail(u.email, u.role);
  const isBlocked = blockedEmails.has(u.email.toLowerCase());

  req.user = {
    ...u,
    role,
    isBlocked,
  };

  res.json({
    id: u.id,
    email: u.email,
    role,
    isBlocked,
  });
});

app.get("/api/users", requireAuthenticated, async (req, res) => {
  const sessionUser = req.user;
  const normalizedSessionUser = {
    id: sessionUser.id,
    email: sessionUser.email,
    role: roleForEmail(sessionUser.email, sessionUser.role),
    isBlocked: blockedEmails.has(sessionUser.email.toLowerCase()),
  };

  usersByEmail.set(sessionUser.email.toLowerCase(), normalizedSessionUser);

  try {
    const collection = await getUsersCollection();
    const dbUsers = await collection
      .find({}, { projection: { _id: 0, id: 1, email: 1, role: 1, isBlocked: 1 } })
      .sort({ email: 1 })
      .toArray();

    const mergedUsers = new Map();
    [...dbUsers, ...usersByEmail.values(), normalizedSessionUser].forEach((user) => {
      if (!user?.email) return;
      mergedUsers.set(user.email.toLowerCase(), {
        id: user.id,
        email: user.email,
        role: roleForEmail(user.email, user.role),
        isBlocked: blockedEmails.has(user.email.toLowerCase()),
      });
    });

    res.json(
      Array.from(mergedUsers.values()).sort((a, b) =>
        a.email.localeCompare(b.email, "pl")
      )
    );
  } catch (error) {
    res.json(
      Array.from(usersByEmail.values())
        .map((knownUser) => ({
          id: knownUser.id,
          email: knownUser.email,
          role: roleForEmail(knownUser.email, knownUser.role),
          isBlocked: blockedEmails.has(knownUser.email.toLowerCase()),
        }))
        .sort((a, b) => a.email.localeCompare(b.email, "pl"))
    );
  }
});

app.get("/api/storage/:key", requireAuthenticated, async (req, res) => {
  try {
    const collection = await getStorageCollection();
    const documentKey = storageDocumentKey(req, req.params.key);
    const document = await collection.findOne({ key: documentKey });

    res.json({ value: document?.value ?? null });
  } catch (error) {
    res.status(503).json({
      error: "database_unavailable",
      message: error instanceof Error ? error.message : "Database unavailable",
    });
  }
});

app.put("/api/storage/:key", requireAuthenticated, async (req, res) => {
  try {
    const collection = await getStorageCollection();
    const documentKey = storageDocumentKey(req, req.params.key);

    await collection.updateOne(
      { key: documentKey },
      {
        $set: {
          key: documentKey,
          value: req.body.value,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    res.json({ ok: true });
  } catch (error) {
    res.status(503).json({
      error: "database_unavailable",
      message: error instanceof Error ? error.message : "Database unavailable",
    });
  }
});

app.delete("/api/storage/:key", requireAuthenticated, async (req, res) => {
  try {
    const collection = await getStorageCollection();
    const documentKey = storageDocumentKey(req, req.params.key);

    await collection.deleteOne({ key: documentKey });

    res.json({ ok: true });
  } catch (error) {
    res.status(503).json({
      error: "database_unavailable",
      message: error instanceof Error ? error.message : "Database unavailable",
    });
  }
});

app.post("/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: "logout failed" });
    req.session.destroy(() => {
      res.clearCookie("connect.sid", { path: "/" });
      res.status(204).end();
    });
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Auth API on http://localhost:${PORT}`);
  console.log(`Callback URL (register in Google Cloud): ${CALLBACK_URL}`);
  if (!clientID || !clientSecret) {
    console.warn(
      "\n[auth] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET — add them to .env (see .env.example) and restart.\n"
    );
  }
});
