import { storageFactory } from "../storage/storageFactory";

export type Status = "todo" | "in_progress" | "done";
export type Priority = "low" | "medium" | "high";

export interface Story {
  id: string;
  userId: string;
  projectId: string;
  name: string;
  description: string;
  priority: Priority;
  status: Status;
  createdAt: string;
}

const storage = storageFactory();
const KEY = "stories";
const CURRENT_PROJECT_KEY = "currentProject";

export const getStories = async (): Promise<Story[]> => {
  return (await storage.get<Story[]>(KEY)) ?? [];
};

export const getStoriesForCurrentProject = async (): Promise<Story[]> => {
  const currentProjectId = await storage.get<string | null>(CURRENT_PROJECT_KEY);

  if (!currentProjectId) return [];

  return (await getStories()).filter((story) => story.projectId === currentProjectId);
};

export const createStory = async (
  userId: string,
  projectId: string,
  name: string,
  description: string,
  priority: Priority
): Promise<Story> => {
  const stories = await getStories();

  const newStory: Story = {
    id: crypto.randomUUID(),
    userId,
    projectId,
    name,
    description,
    priority,
    status: "todo",
    createdAt: new Date().toISOString(),
  };

  await storage.set(KEY, [...stories, newStory]);
  return newStory;
};

export const updateStoryStatus = async (
  id: string,
  status: Status
): Promise<void> => {
  const stories = (await getStories()).map((story) =>
    story.id === id ? { ...story, status } : story
  );

  await storage.set(KEY, stories);
};

export const assignStoryUser = async (
  id: string,
  userId: string
): Promise<void> => {
  const stories = (await getStories()).map((story) =>
    story.id === id ? { ...story, userId } : story
  );

  await storage.set(KEY, stories);
};

export const deleteStory = async (id: string): Promise<void> => {
  const stories = (await getStories()).filter((story) => story.id !== id);
  await storage.set(KEY, stories);
};
