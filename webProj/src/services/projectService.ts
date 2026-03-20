export interface Project {
  id: number;
  name: string;
  description: string;
}

let projects: Project[] = [
  { id: 1, name: "Projekt Alfa", description: "Opis Alfy" },
  { id: 2, name: "Projekt Beta", description: "Opis Bety" }
];

let currentProjectId: number | null = null;

export const getProjects = () => projects;

export const createProject = (name: string, description: string) => {
  const newProject = { id: Date.now(), name, description };
  projects.push(newProject);
};

export const deleteProject = (id: number) => {
  projects = projects.filter(p => p.id !== id);
  if (currentProjectId === id) currentProjectId = null;
};

export const setCurrentProject = (id: number | null) => {
  currentProjectId = id;
};

export const getCurrentProject = (): Project | null => {
  return projects.find(p => p.id === currentProjectId) || null;
};