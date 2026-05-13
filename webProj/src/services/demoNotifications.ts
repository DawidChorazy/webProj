import type { Notification } from "../types/notification";

export function createDemoNotifications(recipientId: string): Notification[] {
  const now = new Date().toISOString();

  return [
    {
      id: "demo_project_created",
      title: "Utworzono nowy projekt",
      message: "Utworzono projekt demonstracyjny.",
      date: now,
      priority: "high",
      isRead: false,
      recipientId,
    },
    {
      id: "demo_story_assignment",
      title: "Przypisano Cię do historyjki",
      message: "Zostałeś przypisany do historyjki demonstracyjnej.",
      date: now,
      priority: "high",
      isRead: false,
      recipientId,
    },
    {
      id: "demo_task_added",
      title: "Nowe zadanie w historyjce",
      message: "Do historyjki dodano zadanie demonstracyjne.",
      date: now,
      priority: "medium",
      isRead: false,
      recipientId,
    },
    {
      id: "demo_task_removed",
      title: "Usunięto zadanie z historyjki",
      message: "Z historyjki usunięto zadanie demonstracyjne.",
      date: now,
      priority: "medium",
      isRead: false,
      recipientId,
    },
    {
      id: "demo_task_done",
      title: "Zmieniono status zadania",
      message: "Zadanie demonstracyjne ma status done.",
      date: now,
      priority: "medium",
      isRead: false,
      recipientId,
    },
    {
      id: "demo_task_doing",
      title: "Zmieniono status zadania",
      message: "Zadanie demonstracyjne ma status doing.",
      date: now,
      priority: "low",
      isRead: false,
      recipientId,
    },
  ];
}
