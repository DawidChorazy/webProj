export const adminUser = {
  id: "e2e-admin",
  email: "admin.e2e@example.com",
  role: "admin",
  isBlocked: false,
};

export const developerUser = {
  id: "e2e-developer",
  email: "developer.e2e@example.com",
  role: "developer",
  isBlocked: false,
};

export const devopsUser = {
  id: "e2e-devops",
  email: "devops.e2e@example.com",
  role: "devops",
  isBlocked: false,
};

export class ProjectPage {
  visitAsAdmin() {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.localStorage.setItem("MANAGEME_STORAGE_TYPE", "local");
        win.__MANAGEME_E2E_USER__ = adminUser;
        win.__MANAGEME_E2E_USERS__ = [adminUser, developerUser, devopsUser];
      },
    });
  }

  assertDashboardVisible() {
    cy.contains("Projekty, historyjki i zadania").should("be.visible");
  }

  createProject(name, description = "Opis projektu E2E") {
    cy.get('[data-testid="project-name-input"]').clear().type(name);
    cy.get('[data-testid="project-description-input"]').clear().type(description);
    cy.get('[data-testid="project-add-button"]').click();
  }

  selectProject(name) {
    cy.contains('[data-testid="project-card"]', name).within(() => {
      cy.get('[data-testid="project-select-button"]').click();
    });
  }

  editProject(currentName, newName, newDescription = "Opis projektu po edycji") {
    cy.contains('[data-testid="project-card"]', currentName).within(() => {
      cy.get('[data-testid="project-edit-button"]').click();
    });
    cy.get('[data-testid="project-edit-name-input"]').clear().type(newName);
    cy.get('[data-testid="project-edit-description-input"]')
      .clear()
      .type(newDescription);
    cy.get('[data-testid="project-save-button"]').click();
  }

  deleteProject(name) {
    cy.contains('[data-testid="project-card"]', name).within(() => {
      cy.get('[data-testid="project-delete-button"]').click();
    });
  }

  createStory(name, description = "Opis historyjki E2E", priority = "Wysoki") {
    cy.get('[data-testid="story-name-input"]').clear().type(name);
    cy.get('[data-testid="story-description-input"]').clear().type(description);
    cy.get('[data-testid="story-priority-select"]').select(priority);
    cy.get('[data-testid="story-add-button"]').click();
  }

  editStory(currentName, newName, newDescription = "Opis historyjki po edycji") {
    cy.contains('[data-testid="story-card"]', currentName).within(() => {
      cy.get('[data-testid="story-edit-button"]').click();
    });
    cy.get('[data-testid="story-edit-name-input"]').clear().type(newName);
    cy.get('[data-testid="story-edit-description-input"]')
      .clear()
      .type(newDescription);
    cy.get('[data-testid="story-edit-priority-select"]').select("Średni");
    cy.get('[data-testid="story-save-button"]').click();
  }

  deleteStory(name) {
    cy.contains('[data-testid="story-card"]', name).within(() => {
      cy.get('[data-testid="story-delete-button"]').click();
    });
  }

  createTask(
    storyName,
    taskName,
    description = "Opis zadania E2E",
    priority = "Średni",
    estimatedHours = "8"
  ) {
    cy.get('[data-testid="task-story-select"]').select(storyName);
    cy.get('[data-testid="task-name-input"]').clear().type(taskName);
    cy.get('[data-testid="task-description-input"]').clear().type(description);
    cy.get('[data-testid="task-priority-select"]').select(priority);
    cy.get('[data-testid="task-estimated-hours-input"]').clear().type(estimatedHours);
    cy.get('[data-testid="task-add-button"]').click();
  }

  openTask(name) {
    cy.contains('[data-testid="task-card"]', name).within(() => {
      cy.get('[data-testid="task-open-button"]').click();
    });
  }

  assignTaskToDeveloper() {
    cy.get('[data-testid="task-assignee-select"]').select(developerUser.id);
  }

  changeTaskStatus(statusLabel) {
    cy.get('[data-testid="task-status-select"]').select(statusLabel);
  }

  editTask(
    newName,
    newDescription = "Opis zadania po edycji",
    priority = "Wysoki",
    estimatedHours = "13",
    spentHours = "5"
  ) {
    cy.get('[data-testid="task-edit-button"]').click();
    cy.get('[data-testid="task-edit-name-input"]').clear().type(newName);
    cy.get('[data-testid="task-edit-description-input"]')
      .clear()
      .type(newDescription);
    cy.get('[data-testid="task-edit-priority-select"]').select(priority);
    cy.get('[data-testid="task-edit-estimated-hours-input"]').clear().type(`${estimatedHours}{rightarrow}{backspace}`);
    cy.get('[data-testid="task-edit-spent-hours-input"]').clear().type(`${spentHours}{rightarrow}{backspace}`);
    cy.get('[data-testid="task-save-button"]').click();
  }

  deleteOpenedTask() {
    cy.get('[data-testid="task-delete-button"]').click();
  }

  createProjectWithStoryAndTask(projectName, storyName, taskName) {
    this.createProject(projectName);
    this.selectProject(projectName);
    this.createStory(storyName);
    this.createTask(storyName, taskName);
  }
}
