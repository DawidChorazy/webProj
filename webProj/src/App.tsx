import { useState } from "react";
import UserManager from "./services/userManager";
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

// Importy typów z użyciem słowa kluczowego 'type' (rozwiązuje błąd must be imported using type-only)
import type { Priority, Status, Story } from "./services/storyService";
import type { Project } from "./services/projectService";

function Header() {
  const user = UserManager.getCurrentUser();
  return (
    <header style={{ 
      padding: "10px 20px", 
      background: "#282c34", 
      color: "white", 
      position: "fixed", 
      top: 0, 
      width: "100%",
      left: 0,
      display: "flex",
      justifyContent: "space-between",
      zIndex: 1000
    }}>
      <span>Project Manager</span>
      <span>Logged User: <strong>{user.firstName} {user.lastName}</strong></span>
    </header>
  );
}

function App() {
  const [projects, setProjects] = useState<Project[]>(getProjects());
  const [currentProject, setCurrentProjectState] = useState(getCurrentProject());
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");

  const [stories, setStories] = useState<Story[]>(getStoriesForCurrentProject());
  const [storyName, setStoryName] = useState("");
  const [storyDesc, setStoryDesc] = useState("");
  const [storyPriority, setStoryPriority] = useState<Priority>("medium");

  const handleAddProject = () => {
    if (!projectName || !projectDesc) return;
    createProject(projectName, projectDesc);
    setProjects([...getProjects()]);
    setProjectName("");
    setProjectDesc("");
  };

  const handleDeleteProject = (id: number) => {
    deleteProject(id);
    setProjects([...getProjects()]);
    if (currentProject?.id === id) {
      setCurrentProject(null);
      setCurrentProjectState(null);
      setStories([]);
    }
  };

  const handleSelectProject = (id: number) => {
    setCurrentProject(id);
    const selected = getCurrentProject();
    setCurrentProjectState(selected);
    setStories(getStoriesForCurrentProject());
  };

  const handleAddStory = () => {
    if (!storyName) return;
    createStory(storyName, storyDesc, storyPriority);
    setStories(getStoriesForCurrentProject());
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
    <div style={{ padding: "80px 40px 40px 40px", fontFamily: "sans-serif" }}>
      <Header />

      <section style={{ marginBottom: "40px", borderBottom: "2px solid #eee", paddingBottom: "20px" }}>
        <h1>Projects Management</h1>
        
        <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
          <input
            placeholder="Project name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
          <input
            placeholder="Description"
            value={projectDesc}
            onChange={(e) => setProjectDesc(e.target.value)}
          />
          <button onClick={handleAddProject} style={{ cursor: "pointer" }}>Add Project</button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "15px" }}>
          {projects.map((project) => (
            <div 
              key={project.id} 
              style={{ 
                border: "1px solid #ccc", 
                padding: "10px", 
                borderRadius: "8px",
                background: currentProject?.id === project.id ? "#e3f2fd" : "white"
              }}
            >
              <strong>{project.name}</strong>
              <div style={{ fontSize: "0.8em", color: "#666" }}>{project.description}</div>
              <div style={{ marginTop: "10px" }}>
                <button onClick={() => handleSelectProject(project.id)}>Select</button>
                <button onClick={() => handleDeleteProject(project.id)} style={{ marginLeft: "5px", color: "red" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {currentProject ? (
        <section>
          <h2>Stories for: <span style={{ color: "#1976d2" }}>{currentProject.name}</span></h2>
          
          <div style={{ background: "#f9f9f9", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
            <h3>Add New Story</h3>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <input placeholder="Story name" value={storyName} onChange={(e) => setStoryName(e.target.value)} />
              <input placeholder="Description" value={storyDesc} onChange={(e) => setStoryDesc(e.target.value)} />
              <select value={storyPriority} onChange={(e) => setStoryPriority(e.target.value as Priority)}>
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <button onClick={handleAddStory} style={{ background: "#4caf50", color: "white", border: "none", padding: "5px 15px", borderRadius: "4px" }}>
                Add Story
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "20px" }}>
            {(["todo", "doing", "done"] as Status[]).map((status) => (
              <div key={status} style={{ flex: 1, background: "#eee", borderRadius: "8px", padding: "10px", minHeight: "300px" }}>
                <h4 style={{ textAlign: "center", textTransform: "uppercase" }}>{status}</h4>
                {stories
                  .filter((s) => s.status === status)
                  .map((story) => (
                    <div key={story.id} style={{ background: "white", padding: "10px", marginBottom: "10px", borderRadius: "4px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                      <div style={{ fontWeight: "bold" }}>{story.name}</div>
                      <div style={{ fontSize: "0.85em", margin: "5px 0" }}>{story.description}</div>
                      <div style={{ fontSize: "0.75em", color: story.priority === 'high' ? 'red' : '#666' }}>
                        Priority: {story.priority}
                      </div>
                      
                      <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between" }}>
                        <button onClick={() => handleDeleteStory(story.id)} style={{ fontSize: "0.7em" }}>Usuń</button>
                        <div>
                          {status !== "todo" && <button onClick={() => handleUpdateStoryStatus(story.id, status === "doing" ? "todo" : "doing")} style={{ fontSize: "0.7em" }}>←</button>}
                          {status !== "done" && <button onClick={() => handleUpdateStoryStatus(story.id, status === "todo" ? "doing" : "done")} style={{ fontSize: "0.7em" }}>→</button>}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div style={{ textAlign: "center", color: "#888", marginTop: "50px" }}>
          <h3>Please select a project to see its stories</h3>
        </div>
      )}
    </div>
  );
}

export default App;