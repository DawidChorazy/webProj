import { useState } from "react";
import {
  createProject,
  getProjects,
  deleteProject,
  Project,
} from "./services/projectService";

function App() {
  const [projects, setProjects] = useState<Project[]>(getProjects());
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleAdd = () => {
    if (!name || !description) return;

    createProject(name, description);
    setProjects([...getProjects()]);
    setName("");
    setDescription("");
  };

  const handleDelete = (id: number) => {
    deleteProject(id);
    setProjects([...getProjects()]);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Projects</h1>

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

      <ul>
        {projects.map((project) => (
          <li key={project.id}>
            <strong>{project.name}</strong> - {project.description}
            <button onClick={() => handleDelete(project.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;