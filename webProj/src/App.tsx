import { useState } from "react";
import UserManager from "../src/services/userManager.ts";
import {
  createProject,
  getProjects,
  deleteProject,
  setCurrentProject,
  getCurrentProject,
} from "./services/projectService";

import type { Project } from "./services/projectService";

function Header() {
  const user = UserManager.getCurrentUser();

  return (
    <header className="header">
      Logged User: {user.firstName} {user.lastName}
    </header>
  );
}

function App() {
  const [projects, setProjects] = useState<Project[]>(getProjects());
  const [currentProject, setCurrentProjectState] = useState(getCurrentProject());

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Dodawanie projektu
  const handleAdd = () => {
    if (!name || !description) return;

    createProject(name, description);
    setProjects([...getProjects()]);
    setName("");
    setDescription("");
  };

  // Usuwanie projektu
  const handleDelete = (id: number) => {
    deleteProject(id);
    setProjects([...getProjects()]);

    if (currentProject?.id === id) {
      setCurrentProject(null);
    }
  };

  // Wybór aktualnego projektu
  const handleSelectProject = (id: number) => {
    setCurrentProject(id);
    setCurrentProjectState(getCurrentProject());
  };

  return (
    <div style={{ padding: "20px", marginTop: "60px" }}>
      <Header />

      <h1>Projects</h1>

      {/* Wyświetlenie aktualnego projektu */}
      {currentProject && (
        <div style={{ marginBottom: "20px" }}>
          <strong>Current project:</strong> {currentProject.name}
        </div>
      )}

      {/* Dodawanie nowego projektu */}
      <input
        placeholder="Project name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <br />
      <input
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <br />
      <button onClick={handleAdd}>Add Project</button>

      {/* Lista projektów */}
      <ul>
        {projects.map((project) => (
          <li key={project.id} style={{ marginBottom: "8px" }}>
            <strong>{project.name}</strong> - {project.description}
            <button onClick={() => handleSelectProject(project.id)} style={{ marginLeft: "10px" }}>
              Select
            </button>
            <button onClick={() => handleDelete(project.id)} style={{ marginLeft: "5px" }}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;