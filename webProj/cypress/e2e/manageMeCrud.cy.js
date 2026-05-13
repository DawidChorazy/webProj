import { ProjectPage } from "../pages/projectPage";

describe("ManageMe - podstawowe funkcjonalności", () => {
  const page = new ProjectPage();

  beforeEach(() => {
    page.visitAsAdmin();
    page.assertDashboardVisible();
  });

  it("tworzy nowy projekt, historyjkę i zadanie", () => {
    const projectName = `Projekt E2E create ${Date.now()}`;
    const storyName = "Historyjka E2E create";
    const taskName = "Zadanie E2E create";

    page.createProject(projectName);
    page.selectProject(projectName);
    page.createStory(storyName);
    page.createTask(storyName, taskName);

    cy.contains('[data-testid="project-card"]', projectName).should("be.visible");
    cy.contains('[data-testid="story-card"]', storyName).should("be.visible");
    cy.contains('[data-testid="task-card"]', taskName).should("be.visible");
  });

  it("zmienia status zadania", () => {
    const projectName = `Projekt E2E status ${Date.now()}`;
    const storyName = "Historyjka E2E status";
    const taskName = "Zadanie E2E status";

    page.createProjectWithStoryAndTask(projectName, storyName, taskName);
    page.openTask(taskName);
    page.assignTaskToDeveloper();

    cy.get('[data-testid="task-status-select"]').should("have.value", "doing");

    page.changeTaskStatus("Zrobione");

    cy.contains("Status: Zrobione").should("be.visible");
    cy.contains('[data-testid="task-card"]', taskName)
      .parents(".kanban-column")
      .contains("Zrobione")
      .should("be.visible");
  });

  it("edytuje zadanie, historyjkę i projekt", () => {
    const projectName = `Projekt E2E edit ${Date.now()}`;
    const storyName = "Historyjka E2E edit";
    const taskName = "Zadanie E2E edit";
    const editedProjectName = `${projectName} po edycji`;
    const editedStoryName = "Historyjka E2E po edycji";
    const editedTaskName = "Zadanie E2E po edycji";

    page.createProjectWithStoryAndTask(projectName, storyName, taskName);

    page.openTask(taskName);
    page.editTask(editedTaskName);
    cy.contains(editedTaskName).should("be.visible");
    cy.contains("Roboczogodziny: 5/13 h").should("be.visible");

    page.editStory(storyName, editedStoryName);
    cy.contains('[data-testid="story-card"]', editedStoryName).should("be.visible");

    page.editProject(projectName, editedProjectName);
    cy.contains('[data-testid="project-card"]', editedProjectName).should("be.visible");
  });

  it("usuwa zadanie, historyjkę i projekt", () => {
    const projectName = `Projekt E2E delete ${Date.now()}`;
    const storyName = "Historyjka E2E delete";
    const taskName = "Zadanie E2E delete";

    page.createProjectWithStoryAndTask(projectName, storyName, taskName);

    page.openTask(taskName);
    page.deleteOpenedTask();
    cy.contains('[data-testid="task-card"]', taskName).should("not.exist");

    page.deleteStory(storyName);
    cy.contains('[data-testid="story-card"]', storyName).should("not.exist");

    page.deleteProject(projectName);
    cy.contains('[data-testid="project-card"]', projectName).should("not.exist");
    cy.contains("Wybierz projekt").should("be.visible");
  });
});
