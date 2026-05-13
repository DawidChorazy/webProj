import { storageFactory } from "../storage/storageFactory";

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
}

const storage = storageFactory();
const KEY = "projects";
const CURRENT_PROJECT_KEY = "currentProject";

export const getProjects = async (): Promise<Project[]> => {
  return (await storage.get<Project[]>(KEY)) ?? [];
};

export const createProject = async (
  userId: string,
  name: string,
  description: string
): Promise<Project> => {
  const projects = await getProjects();

  const newProject: Project = {
    id: crypto.randomUUID(),
    userId,
    name,
    description,
  };

  await storage.set(KEY, [...projects, newProject]);
  return newProject;
};

export const deleteProject = async (id: string): Promise<void> => {
  const projects = (await getProjects()).filter((project) => project.id !== id);
  await storage.set(KEY, projects);
};

export const setCurrentProject = async (id: string | null): Promise<void> => {
  await storage.set(CURRENT_PROJECT_KEY, id);
};

export const getCurrentProject = async (): Promise<Project | null> => {
  const projects = await getProjects();
  const id = await storage.get<string | null>(CURRENT_PROJECT_KEY);

  return projects.find((project) => project.id === id) || null;
};
