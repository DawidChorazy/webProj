import { useEffect, useMemo, useState } from "react";

import { NotificationBadge } from "./components/NotificationBadge";
import { NotificationDetail } from "./components/NotificationDetail";
import { NotificationDialog } from "./components/NotificationDialog";
import { NotificationPanel } from "./components/NotificationPanel";
import notificationService from "./services/notificationService";
import {
  createProject,
  deleteProject,
  getCurrentProject,
  getProjects,
  setCurrentProject,
  updateProject,
  type Project,
} from "./services/projectService";
import {
  assignStoryUser,
  createStory,
  deleteStoriesForProject,
  deleteStory,
  getStoriesForCurrentProject,
  updateStory,
  updateStoryStatus,
  type Priority,
  type Status,
  type Story,
} from "./services/storyService";
import {
  assignTaskUser,
  createTask,
  deleteTask,
  deleteTasksForProject,
  deleteTasksForStory,
  getTasksForCurrentProject,
  markTaskDone,
  setTaskStatus,
  updateTask,
  type Task,
} from "./services/taskService";
import type { Notification } from "./types/notification";
import "./App.css";

type UserRole = "guest" | "admin" | "devops" | "developer";

interface User {
  id: string;
  email: string;
  role: UserRole;
  isBlocked: boolean;
}

declare global {
  interface Window {
    __MANAGEME_E2E_USER__?: User;
    __MANAGEME_E2E_USERS__?: User[];
  }
}

type KnownUser = User;
type ViewMode = "projects" | "notifications" | "notificationDetail";
type ThemeMode = "system" | "light" | "dark";

const roleLabels: Record<UserRole, string> = {
  admin: "Administrator",
  devops: "DevOps",
  developer: "Developer",
  guest: "Gość",
};

const statusLabels: Record<Status, string> = {
  todo: "Do zrobienia",
  doing: "W trakcie",
  done: "Zrobione",
};

const priorityLabels: Record<Priority, string> = {
  low: "Niski",
  medium: "Średni",
  high: "Wysoki",
};

const statusColumns: Status[] = ["todo", "doing", "done"];
const editableRoles: UserRole[] = ["guest", "developer", "devops", "admin"];

async function loadKnownUsers(currentUser: User): Promise<KnownUser[]> {
  if (window.__MANAGEME_E2E_USERS__) {
    return window.__MANAGEME_E2E_USERS__;
  }

  try {
    const res = await fetch("/api/users", {
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) return [currentUser];

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
      <button onClick={() => onNavigate("projects")} className="brand-button">
        ManageMe
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
        <span className={`role-pill role-${user.role}`}>{roleLabels[user.role]}</span>
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
        <button className="ghost-button" onClick={onLogout}>
          Wyloguj
        </button>
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
  const [stories, setStories] = useState<Story[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDesc, setEditProjectDesc] = useState("");

  const [storyName, setStoryName] = useState("");
  const [storyDesc, setStoryDesc] = useState("");
  const [storyPriority, setStoryPriority] = useState<Priority>("medium");
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [editStoryName, setEditStoryName] = useState("");
  const [editStoryDesc, setEditStoryDesc] = useState("");
  const [editStoryPriority, setEditStoryPriority] = useState<Priority>("medium");

  const [taskStoryId, setTaskStoryId] = useState("");
  const [taskName, setTaskName] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState<Priority>("medium");
  const [taskEstimatedHours, setTaskEstimatedHours] = useState(1);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskName, setEditTaskName] = useState("");
  const [editTaskDesc, setEditTaskDesc] = useState("");
  const [editTaskPriority, setEditTaskPriority] = useState<Priority>("medium");
  const [editTaskEstimatedHours, setEditTaskEstimatedHours] = useState(1);
  const [editTaskSpentHours, setEditTaskSpentHours] = useState(0);

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
        if (window.__MANAGEME_E2E_USER__) {
          const e2eUser = window.__MANAGEME_E2E_USER__;
          setUser(e2eUser);
          setKnownUsers(await loadKnownUsers(e2eUser));
          await refreshWorkspaceData();
          setDataError(null);
          return;
        }

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
          await refreshWorkspaceData();
          setDataError(null);
        } catch (error) {
          console.error("Failed to load application data:", error);
          setProjects([]);
          setCurrentProjectState(null);
          setStories([]);
          setTasks([]);
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

  const allKnownUsers = useMemo(() => {
    if (!user) return knownUsers;
    return knownUsers.some((knownUser) => knownUser.id === user.id)
      ? knownUsers
      : [user, ...knownUsers];
  }, [knownUsers, user]);

  const adminRecipientIds = useMemo(
    () =>
      allKnownUsers
        .filter((knownUser) => knownUser.role === "admin" && !knownUser.isBlocked)
        .map((knownUser) => knownUser.id),
    [allKnownUsers]
  );

  const assignableTaskUsers = useMemo(() => {
    const taskUsers = allKnownUsers.filter(
      (knownUser) =>
        !knownUser.isBlocked &&
        (knownUser.role === "developer" || knownUser.role === "devops")
    );

    return taskUsers.length > 0
      ? taskUsers
      : allKnownUsers.filter((knownUser) => !knownUser.isBlocked);
  }, [allKnownUsers]);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks]
  );

  async function refreshWorkspaceData() {
    const [loadedProjects, loadedCurrentProject, loadedStories, loadedTasks] =
      await Promise.all([
        getProjects(),
        getCurrentProject(),
        getStoriesForCurrentProject(),
        getTasksForCurrentProject(),
      ]);

    setProjects(loadedProjects);
    setCurrentProjectState(loadedCurrentProject);
    setStories(loadedStories);
    setTasks(loadedTasks);
  }

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
          <p className="eyebrow">ManageMe</p>
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
          <p className="eyebrow">ManageMe</p>
          <h1>Zaloguj się</h1>
          <p>Wejdź do panelu projektów, historyjek, zadań i powiadomień.</p>
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
          <button className="danger-button" onClick={handleLogout}>
            Wyloguj
          </button>
        </div>
      </div>
    );
  }

  if (user.role === "guest") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p className="eyebrow">Konto oczekuje</p>
          <h1>Oczekiwanie na zatwierdzenie</h1>
          <p>Administrator musi nadać Ci rolę przed wejściem do panelu.</p>
          <button className="secondary-button" onClick={handleLogout}>
            Wyloguj
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === "admin";
  const currentTodoCount = stories.filter((story) => story.status === "todo").length;
  const currentDoingCount = stories.filter((story) => story.status === "doing").length;
  const currentDoneCount = stories.filter((story) => story.status === "done").length;

  const getUserLabel = (userId?: string) => {
    if (!userId) return "Nie przypisano";

    const knownUser = allKnownUsers.find((item) => item.id === userId);

    if (!knownUser) return "Nieznany użytkownik";

    return `${knownUser.email} (${roleLabels[knownUser.role]})`;
  };

  const getStoryName = (storyId: string) =>
    stories.find((story) => story.id === storyId)?.name ?? "Nieznana historyjka";

  const getStoryOwnerId = (storyId: string) =>
    stories.find((story) => story.id === storyId)?.userId;

  const startProjectEdit = (project: Project) => {
    setEditingProjectId(project.id);
    setEditProjectName(project.name);
    setEditProjectDesc(project.description);
  };

  const handleAddProject = async () => {
    if (!projectName.trim() || !projectDesc.trim()) return;

    await createProject(user.id, projectName.trim(), projectDesc.trim());
    await notificationService.notifyProjectCreated(projectName.trim(), adminRecipientIds);
    await refreshWorkspaceData();

    setProjectName("");
    setProjectDesc("");
  };

  const handleSaveProject = async (projectId: string) => {
    if (!editProjectName.trim() || !editProjectDesc.trim()) return;

    await updateProject(projectId, {
      name: editProjectName.trim(),
      description: editProjectDesc.trim(),
    });
    await refreshWorkspaceData();
    setEditingProjectId(null);
  };

  const handleSelectProject = async (id: string) => {
    await setCurrentProject(id);
    setSelectedTaskId(null);
    await refreshWorkspaceData();
  };

  const handleDeleteProject = async (projectId: string) => {
    await deleteTasksForProject(projectId);
    await deleteStoriesForProject(projectId);
    await deleteProject(projectId);

    if (currentProject?.id === projectId) {
      await setCurrentProject(null);
      setSelectedTaskId(null);
    }

    await refreshWorkspaceData();
  };

  const startStoryEdit = (story: Story) => {
    setEditingStoryId(story.id);
    setEditStoryName(story.name);
    setEditStoryDesc(story.description);
    setEditStoryPriority(story.priority);
  };

  const handleAddStory = async () => {
    if (!storyName.trim() || !currentProject) return;

    const newStory = await createStory(
      user.id,
      currentProject.id,
      storyName.trim(),
      storyDesc.trim(),
      storyPriority
    );

    setTaskStoryId(newStory.id);
    await refreshWorkspaceData();

    setStoryName("");
    setStoryDesc("");
    setStoryPriority("medium");
  };

  const handleSaveStory = async (storyId: string) => {
    if (!editStoryName.trim()) return;

    await updateStory(storyId, {
      name: editStoryName.trim(),
      description: editStoryDesc.trim(),
      priority: editStoryPriority,
    });
    await refreshWorkspaceData();
    setEditingStoryId(null);
  };

  const handleAssignStory = async (story: Story, assigneeId: string) => {
    if (story.userId === assigneeId) return;

    await assignStoryUser(story.id, assigneeId);
    await notificationService.notifyPersonAssignedToStory(story.name, assigneeId);
    await refreshWorkspaceData();
  };

  const handleUpdateStoryStatus = async (story: Story, status: Status) => {
    if (story.status === status) return;

    await updateStoryStatus(story.id, status);

    if (status === "doing" || status === "done") {
      await notificationService.notifyTaskStatusChanged(
        currentProject?.name ?? "Historyjka",
        story.name,
        status === "done" ? "done" : "doing",
        story.userId
      );
    }

    await refreshWorkspaceData();
  };

  const handleDeleteStory = async (story: Story) => {
    await notificationService.notifyTaskRemovedFromStory(
      currentProject?.name ?? "Historyjka",
      story.name,
      story.userId
    );
    await deleteTasksForStory(story.id);
    await deleteStory(story.id);
    await refreshWorkspaceData();
  };

  const startTaskEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTaskName(task.name);
    setEditTaskDesc(task.description);
    setEditTaskPriority(task.priority);
    setEditTaskEstimatedHours(task.estimatedHours);
    setEditTaskSpentHours(task.spentHours);
  };

  const handleAddTask = async () => {
    const selectedStoryId = taskStoryId || stories[0]?.id;

    if (!taskName.trim() || !currentProject || !selectedStoryId) return;

    const storyOwnerId = getStoryOwnerId(selectedStoryId);
    const createdTask = await createTask(
      selectedStoryId,
      currentProject.id,
      taskName.trim(),
      taskDesc.trim(),
      taskPriority,
      Math.max(0, Number(taskEstimatedHours) || 0)
    );

    if (storyOwnerId) {
      await notificationService.notifyTaskAddedToStory(
        getStoryName(selectedStoryId),
        createdTask.name,
        storyOwnerId
      );
    }

    await refreshWorkspaceData();
    setTaskName("");
    setTaskDesc("");
    setTaskPriority("medium");
    setTaskEstimatedHours(1);
  };

  const handleSaveTask = async (taskId: string) => {
    if (!editTaskName.trim()) return;

    await updateTask(taskId, {
      name: editTaskName.trim(),
      description: editTaskDesc.trim(),
      priority: editTaskPriority,
      estimatedHours: Math.max(0, Number(editTaskEstimatedHours) || 0),
      spentHours: Math.max(0, Number(editTaskSpentHours) || 0),
    });
    await refreshWorkspaceData();
    setEditingTaskId(null);
  };

  const handleAssignTask = async (task: Task, assigneeId: string) => {
    if (!assigneeId) return;
    if (task.responsibleUserId === assigneeId && task.status === "doing") return;

    const updatedTask = await assignTaskUser(task.id, assigneeId);

    if (updatedTask) {
      await notificationService.notifyPersonAssignedToStory(updatedTask.name, assigneeId);
      const storyOwnerId = getStoryOwnerId(updatedTask.storyId);

      if (storyOwnerId) {
        await notificationService.notifyTaskStatusChanged(
          getStoryName(updatedTask.storyId),
          updatedTask.name,
          "doing",
          storyOwnerId
        );
      }
    }

    await refreshWorkspaceData();
  };

  const handleSetTaskStatus = async (task: Task, status: Status) => {
    if (task.status === status) return;
    if ((status === "doing" || status === "done") && !task.responsibleUserId) {
      setDataError("Najpierw przypisz osobę do zadania.");
      return;
    }

    const updatedTask =
      status === "done" ? await markTaskDone(task.id) : await setTaskStatus(task.id, status);
    const storyOwnerId = getStoryOwnerId(task.storyId);

    if (updatedTask && storyOwnerId && (status === "doing" || status === "done")) {
      await notificationService.notifyTaskStatusChanged(
        getStoryName(task.storyId),
        task.name,
        status === "done" ? "done" : "doing",
        storyOwnerId
      );
    }

    await refreshWorkspaceData();
    setDataError(null);
  };

  const handleDeleteTask = async (task: Task) => {
    const storyOwnerId = getStoryOwnerId(task.storyId);

    if (storyOwnerId) {
      await notificationService.notifyTaskRemovedFromStory(
        getStoryName(task.storyId),
        task.name,
        storyOwnerId
      );
    }

    await deleteTask(task.id);

    if (selectedTaskId === task.id) {
      setSelectedTaskId(null);
    }

    await refreshWorkspaceData();
  };

  const handleUpdateKnownUser = async (
    targetUserId: string,
    updates: Partial<Pick<KnownUser, "role" | "isBlocked">>
  ) => {
    const res = await fetch(`/api/users/${targetUserId}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      setDataError("Nie udało się zaktualizować użytkownika.");
      return;
    }

    setKnownUsers(await loadKnownUsers(user));
    setDataError(null);
  };

  return (
    <div className="app-shell">
      <Header
        user={user}
        currentView={viewMode}
        themeMode={themeMode}
        onNavigate={(view) => setViewMode(view === "notificationDetail" ? "notifications" : view)}
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
              <p className="eyebrow">Panel roboczy {isAdmin && "admina"}</p>
              <h1 className="page-title">Projekty, historyjki i zadania</h1>
              <p className="page-subtitle">
                Zarządzaj aktywnym projektem, przypisuj pracę i obserwuj statusy
                na tablicy kanban.
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
              <span className="stat-label">Historyjki w trakcie</span>
              <span className="stat-value">{currentDoingCount}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Zadania</span>
              <span className="stat-value">{tasks.length}</span>
            </div>
          </section>

          <section className="panel">
            <h2 className="section-title">Nowy projekt</h2>
            <div className="form-grid">
              <label className="field">
                Nazwa projektu
                <input
                  data-testid="project-name-input"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="Nazwa"
                />
              </label>
              <label className="field">
                Opis
                <input
                  data-testid="project-description-input"
                  value={projectDesc}
                  onChange={(event) => setProjectDesc(event.target.value)}
                  placeholder="Opis"
                />
              </label>
              <button
                className="primary-button"
                data-testid="project-add-button"
                onClick={handleAddProject}
              >
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
                        data-testid="project-card"
                        className={`project-card ${
                          currentProject?.id === project.id ? "is-selected" : ""
                        }`}
                      >
                        {editingProjectId === project.id ? (
                          <div className="edit-stack">
                            <input
                              data-testid="project-edit-name-input"
                              value={editProjectName}
                              onChange={(event) => setEditProjectName(event.target.value)}
                            />
                            <input
                              data-testid="project-edit-description-input"
                              value={editProjectDesc}
                              onChange={(event) => setEditProjectDesc(event.target.value)}
                            />
                          </div>
                        ) : (
                          <div>
                            <h3 className="item-title">{project.name}</h3>
                            <p className="item-description">{project.description}</p>
                            <div className="meta-row">
                              <span className="pill pill-blue">
                                Właściciel: {getUserLabel(project.userId)}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="button-row">
                          {editingProjectId === project.id ? (
                            <>
                              <button
                                className="primary-button"
                                data-testid="project-save-button"
                                onClick={() => handleSaveProject(project.id)}
                              >
                                Zapisz
                              </button>
                              <button
                                className="secondary-button"
                                onClick={() => setEditingProjectId(null)}
                              >
                                Anuluj
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="secondary-button"
                                data-testid="project-select-button"
                                onClick={() => handleSelectProject(project.id)}
                              >
                                Wybierz
                              </button>
                              <button
                                className="secondary-button"
                                data-testid="project-edit-button"
                                onClick={() => startProjectEdit(project)}
                              >
                                Edytuj
                              </button>
                              <button
                                className="danger-button"
                                data-testid="project-delete-button"
                                onClick={() => handleDeleteProject(project.id)}
                              >
                                Usuń
                              </button>
                            </>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>

              {isAdmin && (
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
                        <div className="user-actions">
                          <select
                            value={knownUser.role}
                            onChange={(event) =>
                              handleUpdateKnownUser(knownUser.id, {
                                role: event.target.value as UserRole,
                              })
                            }
                            disabled={knownUser.id === user.id}
                          >
                            {editableRoles.map((role) => (
                              <option key={role} value={role}>
                                {roleLabels[role]}
                              </option>
                            ))}
                          </select>
                          <button
                            className={knownUser.isBlocked ? "secondary-button" : "danger-button"}
                            onClick={() =>
                              handleUpdateKnownUser(knownUser.id, {
                                isBlocked: !knownUser.isBlocked,
                              })
                            }
                            disabled={knownUser.id === user.id}
                          >
                            {knownUser.isBlocked ? "Odblokuj" : "Zablokuj"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {currentProject ? (
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
                    Historyjka
                    <input
                      value={storyName}
                      data-testid="story-name-input"
                      onChange={(event) => setStoryName(event.target.value)}
                      placeholder="Nazwa"
                    />
                  </label>
                  <label className="field">
                    Opis
                    <input
                      value={storyDesc}
                      data-testid="story-description-input"
                      onChange={(event) => setStoryDesc(event.target.value)}
                      placeholder="Opis"
                    />
                  </label>
                  <label className="field">
                    Priorytet
                    <select
                      value={storyPriority}
                      data-testid="story-priority-select"
                      onChange={(event) => setStoryPriority(event.target.value as Priority)}
                    >
                      <option value="low">Niski</option>
                      <option value="medium">Średni</option>
                      <option value="high">Wysoki</option>
                    </select>
                  </label>
                  <button
                    className="primary-button"
                    data-testid="story-add-button"
                    onClick={handleAddStory}
                  >
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

                <div className="story-board">
                  {statusColumns.map((status) => (
                    <section key={status} className="kanban-column">
                      <h3 className="column-title">{statusLabels[status]}</h3>
                      <div className="list">
                        {stories
                          .filter((story) => story.status === status)
                          .map((story) => (
                            <article
                              key={story.id}
                              className="story-card"
                              data-testid="story-card"
                            >
                              {editingStoryId === story.id ? (
                                <div className="edit-stack">
                                  <input
                                    data-testid="story-edit-name-input"
                                    value={editStoryName}
                                    onChange={(event) => setEditStoryName(event.target.value)}
                                  />
                                  <input
                                    data-testid="story-edit-description-input"
                                    value={editStoryDesc}
                                    onChange={(event) => setEditStoryDesc(event.target.value)}
                                  />
                                  <select
                                    data-testid="story-edit-priority-select"
                                    value={editStoryPriority}
                                    onChange={(event) =>
                                      setEditStoryPriority(event.target.value as Priority)
                                    }
                                  >
                                    <option value="low">Niski</option>
                                    <option value="medium">Średni</option>
                                    <option value="high">Wysoki</option>
                                  </select>
                                </div>
                              ) : (
                                <div>
                                  <h3 className="item-title">{story.name}</h3>
                                  <p className="item-description">
                                    {story.description || "Brak opisu"}
                                  </p>
                                  <div className="meta-row">
                                    <span className="pill pill-blue">
                                      {priorityLabels[story.priority]}
                                    </span>
                                    <span
                                      className="pill pill-green compact-pill"
                                      title={`Właściciel: ${getUserLabel(story.userId)}`}
                                    >
                                      {getUserLabel(story.userId)}
                                    </span>
                                  </div>
                                </div>
                              )}

                              <div className="story-actions">
                                {editingStoryId === story.id ? (
                                  <>
                                    <button
                                      className="primary-button"
                                      data-testid="story-save-button"
                                      onClick={() => handleSaveStory(story.id)}
                                    >
                                      Zapisz
                                    </button>
                                    <button
                                      className="secondary-button"
                                      onClick={() => setEditingStoryId(null)}
                                    >
                                      Anuluj
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <label className="assignment-field">
                                      Właściciel
                                      <select
                                        data-testid="story-owner-select"
                                        value={story.userId}
                                        onChange={(event) =>
                                          handleAssignStory(story, event.target.value)
                                        }
                                      >
                                        {allKnownUsers
                                          .filter((knownUser) => !knownUser.isBlocked)
                                          .map((knownUser) => (
                                            <option key={knownUser.id} value={knownUser.id}>
                                              {knownUser.email}
                                            </option>
                                          ))}
                                      </select>
                                    </label>
                                    <label className="assignment-field">
                                      Status
                                      <select
                                        data-testid="story-status-select"
                                        value={story.status}
                                        onChange={(event) =>
                                          handleUpdateStoryStatus(
                                            story,
                                            event.target.value as Status
                                          )
                                        }
                                      >
                                        {statusColumns.map((columnStatus) => (
                                          <option key={columnStatus} value={columnStatus}>
                                            {statusLabels[columnStatus]}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <button
                                      className="secondary-button"
                                      data-testid="story-edit-button"
                                      onClick={() => startStoryEdit(story)}
                                    >
                                      Edytuj
                                    </button>
                                    <button
                                      className="danger-button"
                                      data-testid="story-delete-button"
                                      onClick={() => handleDeleteStory(story)}
                                    >
                                      Usuń
                                    </button>
                                  </>
                                )}
                              </div>
                            </article>
                          ))}
                      </div>
                    </section>
                  ))}
                </div>

                <section className="task-section">
                  <h2 className="section-title">Nowe zadanie</h2>
                  <div className="form-grid task-form-grid">
                    <label className="field">
                      Historyjka
                      <select
                        value={taskStoryId || stories[0]?.id || ""}
                        data-testid="task-story-select"
                        onChange={(event) => setTaskStoryId(event.target.value)}
                      >
                        <option value="">Wybierz historyjkę</option>
                        {stories.map((story) => (
                          <option key={story.id} value={story.id}>
                            {story.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Nazwa
                      <input
                        value={taskName}
                        data-testid="task-name-input"
                        onChange={(event) => setTaskName(event.target.value)}
                        placeholder="Nazwa zadania"
                      />
                    </label>
                    <label className="field">
                      Opis
                      <input
                        value={taskDesc}
                        data-testid="task-description-input"
                        onChange={(event) => setTaskDesc(event.target.value)}
                        placeholder="Opis"
                      />
                    </label>
                    <label className="field">
                      Priorytet
                      <select
                        value={taskPriority}
                        data-testid="task-priority-select"
                        onChange={(event) => setTaskPriority(event.target.value as Priority)}
                      >
                        <option value="low">Niski</option>
                        <option value="medium">Średni</option>
                        <option value="high">Wysoki</option>
                      </select>
                    </label>
                    <label className="field">
                      Godziny
                      <input
                        type="number"
                        min="0"
                        value={taskEstimatedHours}
                        data-testid="task-estimated-hours-input"
                        onChange={(event) => setTaskEstimatedHours(Number(event.target.value))}
                      />
                    </label>
                    <button
                      className="primary-button"
                      data-testid="task-add-button"
                      onClick={handleAddTask}
                      disabled={stories.length === 0}
                    >
                      Dodaj
                    </button>
                  </div>
                </section>

                <section className="task-section">
                  <div className="page-header compact-header">
                    <div>
                      <p className="eyebrow">Tablica kanban</p>
                      <h2 className="section-title">Zadania</h2>
                    </div>
                  </div>

                  <div className="kanban-board">
                    {statusColumns.map((status) => (
                      <section key={status} className="kanban-column">
                        <h3 className="column-title">{statusLabels[status]}</h3>
                        <div className="list">
                          {tasks
                            .filter((task) => task.status === status)
                            .map((task) => (
                              <article
                                key={task.id}
                                data-testid="task-card"
                                className={`task-card ${
                                  selectedTaskId === task.id ? "is-selected" : ""
                                }`}
                              >
                                <button
                                  className="task-open-button"
                                  data-testid="task-open-button"
                                  onClick={() => setSelectedTaskId(task.id)}
                                >
                                  <span className="item-title">{task.name}</span>
                                  <span className="item-description">
                                    {getStoryName(task.storyId)}
                                  </span>
                                </button>
                                <div className="meta-row">
                                  <span
                                    className={`pill ${
                                      task.priority === "high"
                                        ? "pill-red"
                                        : task.priority === "medium"
                                          ? "pill-amber"
                                          : "pill-green"
                                    }`}
                                  >
                                    {priorityLabels[task.priority]}
                                  </span>
                                  <span className="pill pill-blue">
                                    {task.spentHours}/{task.estimatedHours} h
                                  </span>
                                </div>
                              </article>
                            ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </section>

                {selectedTask && (
                  <section className="task-detail">
                    <div className="page-header">
                      <div>
                        <p className="eyebrow">Szczegóły zadania</p>
                        <h2 className="section-title">{selectedTask.name}</h2>
                        <p className="item-description">
                          Historyjka: {getStoryName(selectedTask.storyId)}
                        </p>
                      </div>
                      <button
                        className="secondary-button"
                        onClick={() => setSelectedTaskId(null)}
                      >
                        Zamknij
                      </button>
                    </div>

                    {editingTaskId === selectedTask.id ? (
                      <div className="form-grid task-edit-grid">
                        <label className="field">
                          Nazwa
                          <input
                            value={editTaskName}
                            data-testid="task-edit-name-input"
                            onChange={(event) => setEditTaskName(event.target.value)}
                          />
                        </label>
                        <label className="field">
                          Opis
                          <input
                            value={editTaskDesc}
                            data-testid="task-edit-description-input"
                            onChange={(event) => setEditTaskDesc(event.target.value)}
                          />
                        </label>
                        <label className="field">
                          Priorytet
                          <select
                            value={editTaskPriority}
                            data-testid="task-edit-priority-select"
                            onChange={(event) =>
                              setEditTaskPriority(event.target.value as Priority)
                            }
                          >
                            <option value="low">Niski</option>
                            <option value="medium">Średni</option>
                            <option value="high">Wysoki</option>
                          </select>
                        </label>
                        <label className="field">
                          Przewidywane godziny
                          <input
                            type="number"
                            min="0"
                            value={editTaskEstimatedHours}
                            data-testid="task-edit-estimated-hours-input"
                            onChange={(event) =>
                              setEditTaskEstimatedHours(Number(event.target.value))
                            }
                          />
                        </label>
                        <label className="field">
                          Zrealizowane godziny
                          <input
                            type="number"
                            min="0"
                            value={editTaskSpentHours}
                            data-testid="task-edit-spent-hours-input"
                            onChange={(event) =>
                              setEditTaskSpentHours(Number(event.target.value))
                            }
                          />
                        </label>
                        <button
                          className="primary-button"
                          data-testid="task-save-button"
                          onClick={() => handleSaveTask(selectedTask.id)}
                        >
                          Zapisz
                        </button>
                        <button
                          className="secondary-button"
                          onClick={() => setEditingTaskId(null)}
                        >
                          Anuluj
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="notification-message">
                          {selectedTask.description || "Brak opisu"}
                        </p>
                        <div className="detail-grid">
                          <span>Status: {statusLabels[selectedTask.status]}</span>
                          <span>Priorytet: {priorityLabels[selectedTask.priority]}</span>
                          <span>Dodano: {new Date(selectedTask.createdAt).toLocaleString("pl-PL")}</span>
                          <span>
                            Start:{" "}
                            {selectedTask.startedAt
                              ? new Date(selectedTask.startedAt).toLocaleString("pl-PL")
                              : "brak"}
                          </span>
                          <span>
                            Koniec:{" "}
                            {selectedTask.finishedAt
                              ? new Date(selectedTask.finishedAt).toLocaleString("pl-PL")
                              : "brak"}
                          </span>
                          <span>
                            Osoba: {getUserLabel(selectedTask.responsibleUserId)}
                          </span>
                          <span>
                            Roboczogodziny: {selectedTask.spentHours}/
                            {selectedTask.estimatedHours} h
                          </span>
                        </div>

                        <div className="button-row detail-actions">
                          <label className="assignment-field">
                            Przypisz osobę
                            <select
                              value={selectedTask.responsibleUserId ?? ""}
                              data-testid="task-assignee-select"
                              onChange={(event) =>
                                handleAssignTask(selectedTask, event.target.value)
                              }
                            >
                              <option value="">Nie przypisano</option>
                              {assignableTaskUsers.map((knownUser) => (
                                <option key={knownUser.id} value={knownUser.id}>
                                  {knownUser.email}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="assignment-field">
                            Status
                            <select
                              value={selectedTask.status}
                              data-testid="task-status-select"
                              onChange={(event) =>
                                handleSetTaskStatus(
                                  selectedTask,
                                  event.target.value as Status
                                )
                              }
                            >
                              {statusColumns.map((status) => (
                                <option key={status} value={status}>
                                  {statusLabels[status]}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            className="secondary-button"
                            data-testid="task-edit-button"
                            onClick={() => startTaskEdit(selectedTask)}
                          >
                            Edytuj
                          </button>
                          <button
                            className="danger-button"
                            data-testid="task-delete-button"
                            onClick={() => handleDeleteTask(selectedTask)}
                          >
                            Usuń
                          </button>
                        </div>
                      </>
                    )}
                  </section>
                )}
              </section>
            ) : (
              <section className="panel">
                <p className="eyebrow">Brak wyboru</p>
                <h2 className="section-title">Wybierz projekt</h2>
                <p className="item-description">
                  Po wybraniu projektu zobaczysz tutaj formularze, historyjki,
                  zadania i tablicę kanban.
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
