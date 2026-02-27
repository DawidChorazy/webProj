export interface Project {
  id: number;
  name: string;
  description: string;
}

let projects: Project[] = [];

export const createProject = (name: string, description: string): Project => {
  const newProject: Project = {
    id: projects.length + 1,
    name,
    description,
  };

  projects.push(newProject);
  return newProject;
};

export const getProjects = (): Project[] => {
  return projects;
};

export const getProjectById = (id: number): Project | undefined => {
  return projects.find(project => project.id === id);
};

export const updateProject = (
  id: number,
  name: string,
  description: string
): Project | undefined => {
  const project = projects.find(project => project.id === id);

  if (project) {
    project.name = name;
    project.description = description;
  }

  return project;
};

export const deleteProject = (id: number): void => {
  projects = projects.filter(project => project.id !== id);
};