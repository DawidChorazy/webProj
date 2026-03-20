import { getCurrentProject } from "./projectService";
import UserManager from "./userManager";

export type Priority = "low" | "medium" | "high";
export type Status = "todo" | "doing" | "done";

export interface Story {
  id: number;
  name: string;
  description: string;
  priority: Priority;
  projectId: number;
  createdAt: string;
  status: Status;
  ownerId: number;
}

let stories: Story[] = [];

export const getStoriesForCurrentProject = (): Story[] => {
  const currentProject = getCurrentProject();
  if (!currentProject) return [];
  return stories.filter((s) => s.projectId === currentProject.id);
};

export const createStory = (name: string, description: string, priority: Priority) => {
  const project = getCurrentProject();
  const user = UserManager.getCurrentUser();

  if (!project) return;

  const newStory: Story = {
    id: Date.now(),
    name,
    description,
    priority,
    projectId: project.id,
    ownerId: user.id,
    status: "todo",
    createdAt: new Date().toISOString(),
  };

  stories.push(newStory);
};

export const updateStoryStatus = (id: number, status: Status) => {
  stories = stories.map((s) => (s.id === id ? { ...s, status } : s));
};

export const deleteStory = (id: number) => {
  stories = stories.filter((s) => s.id !== id);
};