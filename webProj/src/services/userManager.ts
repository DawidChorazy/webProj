import { storageFactory } from "../storage/storageFactory";

export type UserRole = "guest" | "user" | "admin" | "super_admin";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  blocked: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

const USERS_KEY = "users";
const CURRENT_USER_KEY = "current_user";
const SUPER_ADMIN_EMAIL = "admin@yourapp.com";

class UserManager {
  private storage = storageFactory();

  // 🔹 CURRENT USER
  async getCurrentUser(): Promise<User | null> {
    return (await this.storage.get<User>(CURRENT_USER_KEY)) || null;
  }

  async setCurrentUser(user: User): Promise<void> {
    await this.storage.set(CURRENT_USER_KEY, user);
  }

  async logout(): Promise<void> {
    await this.storage.remove(CURRENT_USER_KEY);
  }

  // 🔹 USERS DB
  private async getUsers(): Promise<User[]> {
    return (await this.storage.get<User[]>(USERS_KEY)) || [];
  }

  private async saveUsers(users: User[]): Promise<void> {
    await this.storage.set(USERS_KEY, users);
  }

  // 🔹 LOGIN / FIRST LOGIN FLOW (Google OAuth tutaj później wejdzie)
  async loginOrCreateUser(data: {
    email: string;
    firstName: string;
    lastName: string;
  }): Promise<User> {
    const users = await this.getUsers();

    let user = users.find(u => u.email === data.email);

    if (!user) {
      user = {
        id: crypto.randomUUID(),
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.email === SUPER_ADMIN_EMAIL ? "super_admin" : "guest",
        blocked: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      users.push(user);

      // 🔥 hook pod notification (na później)
      this.onFirstLogin(user);
    } else {
      user.lastLoginAt = new Date().toISOString();
    }

    await this.saveUsers(users);
    await this.setCurrentUser(user);

    return user;
  }

  // 🔥 FIRST LOGIN HOOK (tu podpinasz NotificationService)
  private onFirstLogin(user: User) {
    // na razie tylko log
    console.log("NEW USER CREATED:", user.email);

    // później:
    // NotificationService.create({ priority: "high", ... })
  }

  // 🔹 ROLE MANAGEMENT
  async updateRole(userId: string, role: UserRole): Promise<void> {
    const users = (await this.getUsers()).map(u =>
      u.id === userId ? { ...u, role } : u
    );

    await this.saveUsers(users);
  }

  // 🔹 BLOCK USER
  async blockUser(userId: string): Promise<void> {
    const users = (await this.getUsers()).map(u =>
      u.id === userId ? { ...u, blocked: true } : u
    );

    await this.saveUsers(users);
  }

  async unblockUser(userId: string): Promise<void> {
    const users = (await this.getUsers()).map(u =>
      u.id === userId ? { ...u, blocked: false } : u
    );

    await this.saveUsers(users);
  }

  // 🔹 ACCESS HELPERS
  isAdmin(user?: User | null): boolean {
    if (!user) return false;
    return user.role === "admin" || user.role === "super_admin";
  }

  isBlocked(user?: User | null): boolean {
    return !!user?.blocked;
  }
}

export default new UserManager();
