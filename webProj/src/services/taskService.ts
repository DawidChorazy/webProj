import { storageFactory } from "../storage/storageFactory";
import {
  getStories,
  updateStoryStatus,
  type Priority,
  type Status,
} from "./storyService";

export interface Task {
  id: string;
  name: string;
  description: string;
  priority: Priority;
  storyId: string;
  projectId: string;
  estimatedHours: number;
  spentHours: number;
  status: Status;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  responsibleUserId?: string;
}

type StoredTask = Omit<Task, "status"> & {
  status: Status | "in_progress";
};

const storage = storageFactory();
const KEY = "tasks";
const CURRENT_PROJECT_KEY = "currentProject";

function normalizeTask(task: StoredTask): Task {
  return {
    ...task,
    status: task.status === "in_progress" ? "doing" : task.status,
  };
}

export const getTasks = async (): Promise<Task[]> => {
  const tasks = (await storage.get<StoredTask[]>(KEY)) ?? [];
  return tasks.map(normalizeTask);
};

export const getTasksForCurrentProject = async (): Promise<Task[]> => {
  const currentProjectId = await storage.get<string | null>(CURRENT_PROJECT_KEY);

  if (!currentProjectId) return [];

  return (await getTasks()).filter((task) => task.projectId === currentProjectId);
};

export const getTasksForStory = async (storyId: string): Promise<Task[]> => {
  return (await getTasks()).filter((task) => task.storyId === storyId);
};

export const createTask = async (
  storyId: string,
  projectId: string,
  name: string,
  description: string,
  priority: Priority,
  estimatedHours: number
): Promise<Task> => {
  const tasks = await getTasks();

  const newTask: Task = {
    id: crypto.randomUUID(),
    storyId,
    projectId,
    name,
    description,
    priority,
    estimatedHours,
    spentHours: 0,
    status: "todo",
    createdAt: new Date().toISOString(),
  };

  await storage.set(KEY, [...tasks, newTask]);
  return newTask;
};

export const updateTask = async (
  id: string,
  data: Pick<Task, "name" | "description" | "priority" | "estimatedHours" | "spentHours">
): Promise<void> => {
  const tasks = (await getTasks()).map((task) =>
    task.id === id ? { ...task, ...data } : task
  );

  await storage.set(KEY, tasks);
};

export const assignTaskUser = async (
  id: string,
  responsibleUserId: string
): Promise<Task | null> => {
  let updatedTask: Task | null = null;

  const tasks = (await getTasks()).map((task) => {
    if (task.id !== id) return task;

    updatedTask = {
      ...task,
      responsibleUserId,
      status: "doing",
      startedAt: task.startedAt ?? new Date().toISOString(),
    };

    return updatedTask;
  });

  await storage.set(KEY, tasks);

  if (updatedTask) {
    const story = (await getStories()).find((item) => item.id === updatedTask?.storyId);

    if (story?.status === "todo") {
      await updateStoryStatus(story.id, "doing");
    }
  }

  return updatedTask;
};

export const markTaskDone = async (id: string): Promise<Task | null> => {
  let updatedTask: Task | null = null;

  const tasks = (await getTasks()).map((task) => {
    if (task.id !== id) return task;

    updatedTask = {
      ...task,
      status: "done",
      finishedAt: task.finishedAt ?? new Date().toISOString(),
    };

    return updatedTask;
  });

  await storage.set(KEY, tasks);

  const doneTask = updatedTask as Task | null;

  if (doneTask) {
    const storyTasks = tasks.filter((task) => task.storyId === doneTask.storyId);

    if (storyTasks.length > 0 && storyTasks.every((task) => task.status === "done")) {
      await updateStoryStatus(doneTask.storyId, "done");
    }
  }

  return updatedTask;
};

export const setTaskStatus = async (
  id: string,
  status: Status
): Promise<Task | null> => {
  if (status === "done") {
    return markTaskDone(id);
  }

  let updatedTask: Task | null = null;

  const tasks = (await getTasks()).map((task) => {
    if (task.id !== id) return task;

    updatedTask = {
      ...task,
      status,
      startedAt: status === "doing" ? task.startedAt ?? new Date().toISOString() : task.startedAt,
      finishedAt: status === "todo" ? undefined : task.finishedAt,
    };

    return updatedTask;
  });

  await storage.set(KEY, tasks);

  if (updatedTask && status === "doing") {
    const story = (await getStories()).find((item) => item.id === updatedTask?.storyId);

    if (story?.status === "todo") {
      await updateStoryStatus(story.id, "doing");
    }
  }

  return updatedTask;
};

export const deleteTask = async (id: string): Promise<Task | null> => {
  const tasks = await getTasks();
  const deletedTask = tasks.find((task) => task.id === id) ?? null;

  await storage.set(
    KEY,
    tasks.filter((task) => task.id !== id)
  );

  return deletedTask;
};

export const deleteTasksForStory = async (storyId: string): Promise<void> => {
  const tasks = (await getTasks()).filter((task) => task.storyId !== storyId);
  await storage.set(KEY, tasks);
};

export const deleteTasksForProject = async (projectId: string): Promise<void> => {
  const tasks = (await getTasks()).filter((task) => task.projectId !== projectId);
  await storage.set(KEY, tasks);
};
