import { useEffect, useState } from "react";

import notificationService from "./services/notificationService";

import {
  createProject,
  getProjects,
  deleteProject,
  setCurrentProject,
  getCurrentProject,
} from "./services/projectService";

import {
  getStoriesForCurrentProject,
  createStory,
  updateStoryStatus,
  assignStoryUser,
  deleteStory,
} from "./services/storyService";

import { NotificationBadge } from "./components/NotificationBadge";
import { NotificationPanel } from "./components/NotificationPanel";
import { NotificationDialog } from "./components/NotificationDialog";
import { NotificationDetail } from "./components/NotificationDetail";
import "./App.css";

import type { Priority, Status, Story } from "./services/storyService";
import type { Project } from "./services/projectService";
import type { Notification } from "./types/notification";

interface User {
  id: string;
  email: string;
  role: "Guest" | "User" | "Admin";
  isBlocked: boolean;
}

type KnownUser = User;

type ViewMode = "projects" | "notifications" | "notificationDetail";
type ThemeMode = "system" | "light" | "dark";

const roleLabels: Record<User["role"], string> = {
  Admin: "Administrator",
  User: "Użytkownik",
  Guest: "Gość",
};

const statusLabels: Record<Status, string> = {
  todo: "Do zrobienia",
  in_progress: "W trakcie",
  done: "Zrobione",
};

const priorityLabels: Record<Priority, string> = {
  low: "Niski",
  medium: "Średni",
  high: "Wysoki",
};

interface StoredUser {
  id: string;
  role?: string;
}

function getKnownAdminRecipientIds(
  currentUser: User,
  knownUsers: KnownUser[]
): string[] {
  const adminIds = new Set<string>();

  try {
    const storedUsers = JSON.parse(localStorage.getItem("users") ?? "[]") as
      | StoredUser[]
      | null;

    storedUsers?.forEach((storedUser) => {
      const role = storedUser.role?.toLowerCase();
      if (role === "admin" || role === "super_admin") {
        adminIds.add(storedUser.id);
      }
    });
  } catch {
    // The OAuth-only flow does not always have a local users directory.
  }

  if (currentUser.role === "Admin") {
    adminIds.add(currentUser.id);
  }

  knownUsers
    .filter((knownUser) => knownUser.role === "Admin" && !knownUser.isBlocked)
    .forEach((knownUser) => adminIds.add(knownUser.id));

  return Array.from(adminIds);
}

async function loadKnownUsers(currentUser: User): Promise<KnownUser[]> {
  try {
    const res = await fetch("/api/users", {
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) {
      return [currentUser];
    }

    const users = (await res.json()) as KnownUser[];
    return users.length > 0 ? users : [currentUser];
  } catch {
    return [currentUser];
  }
}

function Header({
  user,
  currentView,
  themeMode,
  onNavigate,
  onLogout,
  onThemeChange,
}: {
  user: User;
  currentView: ViewMode;
  themeMode: ThemeMode;
  onNavigate: (view: ViewMode) => void;
  onLogout: () => void;
  onThemeChange: (themeMode: ThemeMode) => void;
}) {
  return (
    <header className="topbar">
      <button
        onClick={() => onNavigate("projects")}
        className="brand-button"
      >
        Project Manager
      </button>

      <nav className="nav-tabs">
        <button
          onClick={() => onNavigate("projects")}
          className={`nav-button ${currentView === "projects" ? "is-active" : ""}`}
        >
          Projekty
        </button>
      </nav>

      <div className="user-tools">
        <span className="user-email">
          Zalogowano: <strong>{user.email}</strong>
        </span>
        <span className={`role-pill role-${user.role.toLowerCase()}`}>
          {roleLabels[user.role]}
        </span>
        <NotificationBadge
          recipientId={user.id}
          onClick={() => onNavigate("notifications")}
        />
        <div className="theme-switch" aria-label="Tryb wyglądu">
          {(["system", "light", "dark"] as ThemeMode[]).map((mode) => (
            <button
              key={mode}
              className={`theme-button ${themeMode === mode ? "is-active" : ""}`}
              onClick={() => onThemeChange(mode)}
              type="button"
            >
              {mode === "system" ? "System" : mode === "light" ? "Jasny" : "Ciemny"}
            </button>
          ))}
        </div>
        <button className="ghost-button" onClick={onLogout}>Wyloguj</button>
      </div>
    </header>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [knownUsers, setKnownUsers] = useState<KnownUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);

  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");

  const [stories, setStories] = useState<Story[]>([]);
  const [storyName, setStoryName] = useState("");
  const [storyDesc, setStoryDesc] = useState("");
  const [storyPriority, setStoryPriority] = useState<Priority>("medium");

  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("projects");
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const storedTheme = localStorage.getItem("themeMode");
    return storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
      ? storedTheme
      : "system";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    localStorage.setItem("themeMode", themeMode);
  }, [themeMode]);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          setUser(null);
          setKnownUsers([]);
          return;
        }

        const data: User = await res.json();
        setUser(data);
        setKnownUsers(await loadKnownUsers(data));

        try {
          setProjects(await getProjects());
          setCurrentProjectState(await getCurrentProject());
          setStories(await getStoriesForCurrentProject());
          setDataError(null);
        } catch (error) {
          console.error("Failed to load application data:", error);
          setProjects([]);
          setCurrentProjectState(null);
          setStories([]);
          setDataError(
            "Nie udało się pobrać danych z bazy. Sprawdź konfigurację MongoDB."
          );
        }
      } catch {
        setUser(null);
        setKnownUsers([]);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const handleLogin = () => {
    window.location.href = "/auth/google";
  };

  const handleLogout = () => {
    fetch("/auth/logout", {
      method: "POST",
      credentials: "include",
    }).finally(() => {
      setUser(null);
      setKnownUsers([]);
    });
  };

  const openNotificationDetail = (notification: Notification) => {
    setSelectedNotification(notification);
    setViewMode("notificationDetail");
  };

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p className="eyebrow">Project Manager</p>
          <h1>Ładowanie aplikacji</h1>
          <p>Sprawdzam sesję i pobieram dane.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p className="eyebrow">Project Manager</p>
          <h1>Zaloguj się</h1>
          <p>Wejdź do panelu projektów, historyjek i powiadomień.</p>
          <button className="primary-button" onClick={handleLogin}>
            Zaloguj przez Google
          </button>
        </div>
      </div>
    );
  }

  if (user.isBlocked) {
    return (
      <div className="auth-page">
        <div className="auth-card blocked-card">
          <p className="eyebrow">Dostęp zablokowany</p>
          <h1>Konto zablokowane</h1>
          <p>Skontaktuj się z administratorem aplikacji.</p>
          <button className="danger-button" onClick={handleLogout}>Wyloguj</button>
        </div>
      </div>
    );
  }

  if (user.role === "Guest") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p className="eyebrow">Konto oczekuje</p>
          <h1>Oczekiwanie na zatwierdzenie</h1>
          <p>Administrator musi nadać Ci rolę przed wejściem do panelu.</p>
          <button className="secondary-button" onClick={handleLogout}>Wyloguj</button>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === "Admin";
  const allKnownUsers = knownUsers.some((knownUser) => knownUser.id === user.id)
    ? knownUsers
    : [user, ...knownUsers];
  const assignableUsers = allKnownUsers.filter((knownUser) => !knownUser.isBlocked);

  const getUserLabel = (userId: string) => {
    const knownUser = allKnownUsers.find((item) => item.id === userId);

    if (!knownUser) {
      return "Nieznany użytkownik";
    }

    return `${knownUser.email} (${roleLabels[knownUser.role]})`;
  };

  const handleAddProject = async () => {
    if (!projectName.trim() || !projectDesc.trim()) return;

    await createProject(user.id, projectName.trim(), projectDesc.trim());
    setProjects(await getProjects());

    await notificationService.notifyProjectCreated(
      projectName.trim(),
      getKnownAdminRecipientIds(user, allKnownUsers)
    );

    setProjectName("");
    setProjectDesc("");
  };

  const handleSelectProject = async (id: string) => {
    await setCurrentProject(id);
    setCurrentProjectState(await getCurrentProject());
    setStories(await getStoriesForCurrentProject());
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
    setProjects(await getProjects());

    if (currentProject?.id === id) {
      await setCurrentProject(null);
      setCurrentProjectState(null);
      setStories([]);
    }
  };

  const handleAddStory = async () => {
    if (!storyName.trim() || !currentProject) return;

    await createStory(
      user.id,
      currentProject.id,
      storyName.trim(),
      storyDesc.trim(),
      storyPriority
    );

    setStories(await getStoriesForCurrentProject());

    await notificationService.notifyTaskAddedToStory(
      currentProject.name,
      storyName.trim(),
      user.id
    );

    setStoryName("");
    setStoryDesc("");
    setStoryPriority("medium");
  };

  const handleAssignStory = async (story: Story, assigneeId: string) => {
    if (story.userId === assigneeId) return;

    await assignStoryUser(story.id, assigneeId);
    setStories(await getStoriesForCurrentProject());

    await notificationService.notifyPersonAssignedToStory(story.name, assigneeId);
  };

  const handleUpdateStoryStatus = async (story: Story, status: Status) => {
    if (story.status === status) return;

    await updateStoryStatus(story.id, status);
    setStories(await getStoriesForCurrentProject());

    if (status === "in_progress" || status === "done") {
      await notificationService.notifyTaskStatusChanged(
        currentProject?.name ?? "Historyjka",
        story.name,
        status === "done" ? "done" : "doing",
        story.userId
      );
    }
  };

  const handleDeleteStory = async (story: Story) => {
    await notificationService.notifyTaskRemovedFromStory(
      currentProject?.name ?? "Historyjka",
      story.name,
      story.userId
    );

    await deleteStory(story.id);
    setStories(await getStoriesForCurrentProject());
  };

  const currentTodoCount = stories.filter((story) => story.status === "todo").length;
  const currentDoingCount = stories.filter(
    (story) => story.status === "in_progress"
  ).length;
  const currentDoneCount = stories.filter((story) => story.status === "done").length;

  return (
    <div className="app-shell">
      <Header
        user={user}
        currentView={viewMode}
        themeMode={themeMode}
        onNavigate={(view) => {
          setViewMode(view === "notificationDetail" ? "notifications" : view);
        }}
        onLogout={handleLogout}
        onThemeChange={setThemeMode}
      />

      <NotificationDialog
        recipientId={user.id}
        onOpenNotification={openNotificationDetail}
      />

      {viewMode === "notificationDetail" && selectedNotification && (
        <NotificationDetail
          recipientId={user.id}
          notificationId={selectedNotification.id}
          onBack={() => setViewMode("notifications")}
        />
      )}

      {viewMode === "notifications" && (
        <NotificationPanel
          recipientId={user.id}
          onSelectNotification={openNotificationDetail}
        />
      )}

      {viewMode === "projects" && (
        <main className="page">
          <div className="page-header">
            <div>
              <p className="eyebrow">Panel roboczy {isAdmin && "Admin"}</p>
              <h1 className="page-title">Projekty i historyjki</h1>
              <p className="page-subtitle">
                Zarządzaj projektami, dodawaj historyjki i sprawdzaj powiadomienia
                z jednego uporządkowanego miejsca.
              </p>
            </div>
          </div>

          {dataError && (
            <div className="empty-state" style={{ marginBottom: "18px" }}>
              {dataError}
            </div>
          )}

          <section className="stats-strip" aria-label="Podsumowanie">
            <div className="stat-card">
              <span className="stat-label">Projekty</span>
              <span className="stat-value">{projects.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Aktywne</span>
              <span className="stat-value">{currentDoingCount}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Zakończone</span>
              <span className="stat-value">{currentDoneCount}</span>
            </div>
          </section>

          <section className="panel">
            <h2 className="section-title">Nowy projekt</h2>
            <div className="form-grid">
            <label className="field">
              Nazwa projektu
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Nazwa"
              />
            </label>
            <label className="field">
              Opis
              <input
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                placeholder="Opis"
              />
            </label>
            <button className="primary-button" onClick={handleAddProject}>
              Dodaj
            </button>
            </div>
          </section>

          <div className="content-grid">
            <div className="side-stack">
              <section className="panel">
              <h2 className="section-title">Lista projektów</h2>
              <div className="list">
                {projects.length === 0 ? (
                  <div className="empty-state">
                    Nie ma jeszcze projektów. Dodaj pierwszy projekt powyżej.
                  </div>
                ) : (
                  projects.map((project) => (
                    <article
                      key={project.id}
                      className={`project-card ${
                        currentProject?.id === project.id ? "is-selected" : ""
                      }`}
                    >
                      <div>
                        <h3 className="item-title">{project.name}</h3>
                        <p className="item-description">{project.description}</p>
                        <div className="meta-row">
                          <span className="pill pill-blue">
                            Właściciel: {getUserLabel(project.userId)}
                          </span>
                        </div>
                      </div>
                      <div className="button-row">
                        <button
                          className="secondary-button"
                          onClick={() => handleSelectProject(project.id)}
                        >
                          Wybierz
                        </button>
                        <button
                          className="danger-button"
                          onClick={() => handleDeleteProject(project.id)}
                        >
                          Usuń
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

              <section className="panel">
                <h2 className="section-title">Użytkownicy</h2>
                <div className="list compact-list">
                  {allKnownUsers.map((knownUser) => (
                    <article key={knownUser.id} className="user-card">
                      <div>
                        <h3 className="item-title">{knownUser.email}</h3>
                        <p className="item-description">
                          ID: <span className="mono-text">{knownUser.id}</span>
                        </p>
                      </div>
                      <div className="meta-row">
                        <span
                          className={`role-pill role-${knownUser.role.toLowerCase()}`}
                        >
                          {roleLabels[knownUser.role]}
                        </span>
                        {knownUser.isBlocked && (
                          <span className="pill pill-red">Zablokowany</span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>

          {currentProject && (
            <section className="panel">
              <div className="page-header">
                <div>
                  <p className="eyebrow">Wybrany projekt</p>
                  <h2 className="section-title">{currentProject.name}</h2>
                  <p className="item-description">
                    Właściciel: {getUserLabel(currentProject.userId)}
                  </p>
                </div>
                <span className="pill pill-blue">{stories.length} historyjek</span>
              </div>

              <div className="form-grid story-form-grid">
                <label className="field">
                  Historyjka/zadanie
                  <input
                    value={storyName}
                    onChange={(e) => setStoryName(e.target.value)}
                    placeholder="Nazwa"
                  />
                </label>
                <label className="field">
                  Opis
                  <input
                    value={storyDesc}
                    onChange={(e) => setStoryDesc(e.target.value)}
                    placeholder="Opis"
                  />
                </label>
                <label className="field">
                  Priorytet
                  <select
                    value={storyPriority}
                    onChange={(e) => setStoryPriority(e.target.value as Priority)}
                  >
                    <option value="low">Niski</option>
                    <option value="medium">Średni</option>
                    <option value="high">Wysoki</option>
                  </select>
                </label>
                <button className="primary-button" onClick={handleAddStory}>
                  Dodaj
                </button>
              </div>

              <div className="meta-row">
                <span className="pill pill-amber">
                  Do zrobienia: {currentTodoCount}
                </span>
                <span className="pill pill-blue">W trakcie: {currentDoingCount}</span>
                <span className="pill pill-green">Zrobione: {currentDoneCount}</span>
              </div>

              <div className="list" style={{ marginTop: "16px" }}>
                {stories.length === 0 ? (
                  <div className="empty-state">
                    Ten projekt nie ma jeszcze historyjek.
                  </div>
                ) : (
                  stories.map((story) => (
                    <article key={story.id} className="story-card">
                      <div>
                        <h3 className="item-title">{story.name}</h3>
                        <p className="item-description">
                          {story.description || "Brak opisu"}
                        </p>
                        <div className="meta-row">
                          <span className="pill pill-blue">
                            Status: {statusLabels[story.status]}
                          </span>
                          <span
                            className={`pill ${
                              story.priority === "high"
                                ? "pill-red"
                                : story.priority === "medium"
                                  ? "pill-amber"
                                  : "pill-green"
                            }`}
                          >
                            Priorytet: {priorityLabels[story.priority]}
                          </span>
                          <span className="pill pill-green">
                            Przypisano: {getUserLabel(story.userId)}
                          </span>
                        </div>
                      </div>
                      <div className="button-row">
                        <label className="assignment-field">
                          Osoba
                          <select
                            value={story.userId}
                            onChange={(e) =>
                              handleAssignStory(story, e.target.value)
                            }
                          >
                            {assignableUsers.map((knownUser) => (
                              <option key={knownUser.id} value={knownUser.id}>
                                {knownUser.email}
                              </option>
                            ))}
                          </select>
                        </label>
                      <button
                        className="status-button"
                        onClick={() => handleUpdateStoryStatus(story, "todo")}
                      >
                        Do zrobienia
                      </button>
                      <button
                        className="status-button"
                        onClick={() =>
                          handleUpdateStoryStatus(story, "in_progress")
                        }
                      >
                        W trakcie
                      </button>
                      <button
                        className="status-button"
                        onClick={() => handleUpdateStoryStatus(story, "done")}
                      >
                        Zrobione
                      </button>
                      <button
                        className="danger-button"
                        onClick={() => handleDeleteStory(story)}
                      >
                        Usuń
                      </button>
                    </div>
                  </article>
                  ))
                )}
              </div>
            </section>
          )}
          {!currentProject && (
            <section className="panel">
              <p className="eyebrow">Brak wyboru</p>
              <h2 className="section-title">Wybierz projekt</h2>
              <p className="item-description">
                Po wybraniu projektu zobaczysz tutaj formularz historyjek oraz
                listę zadań.
              </p>
            </section>
          )}
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
