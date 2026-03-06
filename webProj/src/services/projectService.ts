export type Project = {
  id: number;
  name: string;
  description: string;
};

let projects: Project[] = [];
let currentProjectId: number | null = null;

export function createProject(name: string, description: string) {
  const newProject: Project = {
    id: Date.now(),
    name,
    description,
  };

  projects.push(newProject);
}

export function getProjects(): Project[] {
  return projects;
}

export function deleteProject(id: number) {
  projects = projects.filter((p) => p.id !== id);

  if (currentProjectId === id) {
    currentProjectId = null;
  }
}

export function setCurrentProject(id: number | null) {
  currentProjectId = id;
}

export function getCurrentProject(): Project | null {
  return projects.find((p) => p.id === currentProjectId) ?? null;
}