import type { Project } from "../services/projectService";
import type { Story, Status, Priority } from "../services/storyService";

export class LocalStorageStorage {

  getProjects(): Project[] {
    return JSON.parse(localStorage.getItem("projects") || "[]");
  }

  createProject(name: string, description: string) {
    const projects = this.getProjects();

    const newProject: Project = {
      id: Date.now(),
      name,
      description,
    };

    projects.push(newProject);
    localStorage.setItem("projects", JSON.stringify(projects));
  }

  deleteProject(id: number) {
    const projects = this.getProjects().filter(p => p.id !== id);
    localStorage.setItem("projects", JSON.stringify(projects));

    // usuń też current project jeśli pasuje
    const current = this.getCurrentProject();
    if (current?.id === id) {
      this.setCurrentProject(null);
    }
  }

  setCurrentProject(id: number | null) {
    localStorage.setItem("currentProject", JSON.stringify(id));
  }

  getCurrentProject(): Project | null {
    const id = JSON.parse(localStorage.getItem("currentProject") || "null");
    return this.getProjects().find(p => p.id === id) || null;
  }

  getStories(): Story[] {
    return JSON.parse(localStorage.getItem("stories") || "[]");
  }

  getStoriesForCurrentProject(): Story[] {
    const current = this.getCurrentProject();
    if (!current) return [];

    return this.getStories().filter(s => s.projectId === current.id);
  }

  createStory(name: string, description: string, priority: Priority) {
    const current = this.getCurrentProject();
    if (!current) return;

    const stories = this.getStories();

    const newStory: Story = {
      id: Date.now(),
      name,
      description,
      priority,
      status: "todo",
      projectId: current.id,
      createdAt: new Date().toISOString(),
      ownerId: 1,
    };

    stories.push(newStory);
    localStorage.setItem("stories", JSON.stringify(stories));
  }

  updateStoryStatus(id: number, status: Status) {
    const stories = this.getStories().map(s =>
      s.id === id ? { ...s, status } : s
    );

    localStorage.setItem("stories", JSON.stringify(stories));
  }

  deleteStory(id: number) {
    const stories = this.getStories().filter(s => s.id !== id);
    localStorage.setItem("stories", JSON.stringify(stories));
  }
}