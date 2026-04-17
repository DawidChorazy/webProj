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
  deleteStory,
} from "./services/storyService";

import { NotificationBadge } from "./components/NotificationBadge";
import { NotificationPanel } from "./components/NotificationPanel";
import { NotificationDialog } from "./components/NotificationDialog";
import { NotificationDetail } from "./components/NotificationDetail";

import type { Priority, Status, Story } from "./services/storyService";
import type { Project } from "./services/projectService";
import type { Notification } from "./types/notification";

interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  role: "Guest" | "User" | "Admin";
  isBlocked: boolean;
}

function Header({
  user,
  onNotificationClick,
}: {
  user: User;
  onNotificationClick: () => void;
}) {
  return (
    <header
      style={{
        padding: "10px 20px",
        background: "#282c34",
        color: "white",
        position: "fixed",
        top: 0,
        width: "100%",
        left: 0,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <span>Project Manager</span>

      <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
        <span>
          Logged User: <strong>{user.email}</strong>
        </span>
        <NotificationBadge onClick={onNotificationClick} />
      </div>
    </header>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);

  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");

  const [stories, setStories] = useState<Story[]>([]);
  const [storyName, setStoryName] = useState("");
  const [storyDesc, setStoryDesc] = useState("");
  const [storyPriority, setStoryPriority] = useState<Priority>("medium");

  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");

  // LOAD USER
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/me", {
          credentials: "include",
        });

        if (!res.ok) {
          setUser(null);
          setLoading(false);
          return;
        }

        const data: User = await res.json();
        setUser(data);

        setProjects(getProjects());
        setStories(getStoriesForCurrentProject());
      } catch {
        setUser(null);
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
    });
  };

  if (loading) return <div>Loading...</div>;

  // NO USER
  if (!user) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Login</h1>
        <button onClick={handleLogin}>Zaloguj przez Google</button>
      </div>
    );
  }

  // BLOCKED
  if (user.isBlocked) {
    return (
      <div style={{ padding: 40, color: "red" }}>
        <h1>Account blocked</h1>
        <button onClick={handleLogout}>Logout</button>
      </div>
    );
  }

  // GUEST
  if (user.role === "Guest") {
    return (
      <div style={{ padding: 40 }}>
        <h1>Oczekiwanie na zatwierdzenie konta</h1>
        <button onClick={handleLogout}>Logout</button>
      </div>
    );
  }

  const handleAddProject = () => {
    if (!projectName || !projectDesc) return;

    createProject(projectName, projectDesc);
    setProjects(getProjects());

    const u = user;

    notificationService.createNotification(
      "Utworzono nowy projekt",
      `Projekt "${projectName}" został utworzony.`,
      "high",
      u.id
    );

    setProjectName("");
    setProjectDesc("");
  };

  const handleSelectProject = (id: number) => {
    setCurrentProject(id);
    const selected = getCurrentProject();
    setCurrentProjectState(selected);
    setStories(getStoriesForCurrentProject());
  };

  const handleDeleteProject = (id: number) => {
    deleteProject(id);
    setProjects(getProjects());

    if (currentProject?.id === id) {
      setCurrentProject(null);
      setCurrentProjectState(null);
      setStories([]);
    }
  };

  const handleAddStory = () => {
    if (!storyName) return;

    createStory(storyName, storyDesc, storyPriority);
    setStories(getStoriesForCurrentProject());

    notificationService.createNotification(
      "Nowe zadanie",
      `Dodano "${storyName}"`,
      "medium",
      user.id
    );

    setStoryName("");
    setStoryDesc("");
  };

  const handleUpdateStoryStatus = (id: number, newStatus: Status) => {
    updateStoryStatus(id, newStatus);
    setStories(getStoriesForCurrentProject());
  };

  const handleDeleteStory = (id: number) => {
    deleteStory(id);
    setStories(getStoriesForCurrentProject());
  };

  return (
    <div style={{ padding: "80px 40px 40px" }}>
      <Header
        user={user}
        onNotificationClick={() => setIsNotificationPanelOpen(!isNotificationPanelOpen)}
      />

      <NotificationDialog />

      <NotificationPanel
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
        onSelectNotification={(n) => {
          setSelectedNotification(n);
          setViewMode("detail");
        }}
      />

      {viewMode === "detail" && selectedNotification && (
        <NotificationDetail
          notificationId={selectedNotification.id}
          onBack={() => setViewMode("list")}
        />
      )}

      {viewMode === "list" && (
        <>
          <h1>Projects</h1>

          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="name"
          />
          <input
            value={projectDesc}
            onChange={(e) => setProjectDesc(e.target.value)}
            placeholder="desc"
          />
          <button onClick={handleAddProject}>Add</button>

          <div>
            {projects.map((p) => (
              <div key={p.id}>
                <b>{p.name}</b>
                <button onClick={() => handleSelectProject(p.id)}>select</button>
                <button onClick={() => handleDeleteProject(p.id)}>delete</button>
              </div>
            ))}
          </div>

          {currentProject && (
            <>
              <h2>{currentProject.name}</h2>

              <input
                value={storyName}
                onChange={(e) => setStoryName(e.target.value)}
              />
              <button onClick={handleAddStory}>Add story</button>

              {stories.map((s) => (
                <div key={s.id}>
                  {s.name}
                  <button onClick={() => handleDeleteStory(s.id)}>X</button>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;