import { storageFactory } from "../storage/storageFactory";
import type {
  Notification,
  NotificationPriority,
  UserID,
} from "../types/notification";

const STORAGE_KEY = "notifications";

type NotificationListener = (notifications: Notification[]) => void;
type NewNotificationListener = (notification: Notification) => void;

class NotificationService {
  private storage = storageFactory();
  private notifications: Notification[] = [];
  private listeners: NotificationListener[] = [];
  private newNotificationListeners: NewNotificationListener[] = [];
  private isLoaded = false;
  private loadingPromise: Promise<void> | null = null;

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.isLoaded) return;

    if (!this.loadingPromise) {
      this.loadingPromise = this.loadFromStorage();
    }

    await this.loadingPromise;
  }

  private async loadFromStorage(): Promise<void> {
    try {
      this.notifications = (await this.storage.get<Notification[]>(STORAGE_KEY)) ?? [];
    } catch (error) {
      console.error("Failed to load notifications from storage:", error);
      this.notifications = [];
    } finally {
      this.isLoaded = true;
      this.loadingPromise = null;
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      await this.storage.set(STORAGE_KEY, this.notifications);
    } catch (error) {
      console.error("Failed to save notifications to storage:", error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener([...this.notifications]));
  }

  private notifyNewNotification(notification: Notification): void {
    this.newNotificationListeners.forEach((listener) => listener(notification));
  }

  subscribe(listener: NotificationListener): () => void {
    this.listeners.push(listener);
    void this.ensureLoaded().then(() => listener([...this.notifications]));

    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  subscribeToNewNotifications(listener: NewNotificationListener): () => void {
    this.newNotificationListeners.push(listener);

    return () => {
      this.newNotificationListeners = this.newNotificationListeners.filter(
        (l) => l !== listener
      );
    };
  }

  async createNotification(
    title: string,
    message: string,
    priority: NotificationPriority,
    recipientId: UserID
  ): Promise<Notification> {
    await this.ensureLoaded();

    const notification: Notification = {
      id: this.generateId(),
      title,
      message,
      date: new Date().toISOString(),
      priority,
      isRead: false,
      recipientId,
    };

    this.notifications.unshift(notification);
    await this.saveToStorage();
    this.notifyListeners();
    this.notifyNewNotification(notification);

    return notification;
  }

  async createNotificationsForRecipients(
    title: string,
    message: string,
    priority: NotificationPriority,
    recipientIds: UserID[]
  ): Promise<Notification[]> {
    const uniqueRecipientIds = Array.from(new Set(recipientIds)).filter(Boolean);
    const created: Notification[] = [];

    for (const recipientId of uniqueRecipientIds) {
      created.push(
        await this.createNotification(title, message, priority, recipientId)
      );
    }

    return created;
  }

  async notifyProjectCreated(
    projectName: string,
    adminRecipientIds: UserID[]
  ): Promise<void> {
    await this.createNotificationsForRecipients(
      "Utworzono nowy projekt",
      `Utworzono projekt "${projectName}".`,
      "high",
      adminRecipientIds
    );
  }

  async notifyPersonAssignedToStory(
    storyName: string,
    assigneeId: UserID
  ): Promise<void> {
    await this.createNotification(
      "Przypisano Cię do historyjki",
      `Zostałeś przypisany do historyjki "${storyName}".`,
      "high",
      assigneeId
    );
  }

  async notifyTaskAddedToStory(
    storyName: string,
    taskName: string,
    storyOwnerId: UserID
  ): Promise<void> {
    await this.createNotification(
      "Nowe zadanie w historyjce",
      `Do historyjki "${storyName}" dodano zadanie "${taskName}".`,
      "medium",
      storyOwnerId
    );
  }

  async notifyTaskRemovedFromStory(
    storyName: string,
    taskName: string,
    storyOwnerId: UserID
  ): Promise<void> {
    await this.createNotification(
      "Usunięto zadanie z historyjki",
      `Z historyjki "${storyName}" usunięto zadanie "${taskName}".`,
      "medium",
      storyOwnerId
    );
  }

  async notifyTaskStatusChanged(
    storyName: string,
    taskName: string,
    status: "doing" | "done",
    storyOwnerId: UserID
  ): Promise<void> {
    await this.createNotification(
      "Zmieniono status zadania",
      `Zadanie "${taskName}" w historyjce "${storyName}" ma status ${status}.`,
      status === "done" ? "medium" : "low",
      storyOwnerId
    );
  }

  async getNotifications(): Promise<Notification[]> {
    await this.ensureLoaded();
    return [...this.notifications];
  }

  async getNotificationsForRecipient(
    recipientId: UserID
  ): Promise<Notification[]> {
    await this.ensureLoaded();
    return this.notifications.filter((n) => n.recipientId === recipientId);
  }

  async getUserNotifications(recipientId: UserID): Promise<Notification[]> {
    return this.getNotificationsForRecipient(recipientId);
  }

  async getNotificationById(id: string): Promise<Notification | undefined> {
    await this.ensureLoaded();
    return this.notifications.find((n) => n.id === id);
  }

  async getUnreadCount(recipientId: UserID): Promise<number> {
    await this.ensureLoaded();
    return this.notifications.filter(
      (n) => n.recipientId === recipientId && !n.isRead
    ).length;
  }

  async markAsRead(id: string): Promise<void> {
    await this.ensureLoaded();

    const notification = this.notifications.find((n) => n.id === id);

    if (!notification || notification.isRead) return;

    notification.isRead = true;
    await this.saveToStorage();
    this.notifyListeners();
  }

  async markAllAsRead(recipientId: UserID): Promise<void> {
    await this.ensureLoaded();

    let changed = false;

    this.notifications = this.notifications.map((notification) => {
      if (notification.recipientId === recipientId && !notification.isRead) {
        changed = true;
        return { ...notification, isRead: true };
      }

      return notification;
    });

    if (changed) {
      await this.saveToStorage();
      this.notifyListeners();
    }
  }

  async deleteNotification(id: string): Promise<void> {
    await this.ensureLoaded();
    this.notifications = this.notifications.filter((n) => n.id !== id);
    await this.saveToStorage();
    this.notifyListeners();
  }

  async clearAll(recipientId: UserID): Promise<void> {
    await this.ensureLoaded();
    this.notifications = this.notifications.filter(
      (n) => n.recipientId !== recipientId
    );

    await this.saveToStorage();
    this.notifyListeners();
  }

  async getUnreadNotifications(recipientId: UserID): Promise<Notification[]> {
    await this.ensureLoaded();
    return this.notifications.filter(
      (n) => n.recipientId === recipientId && !n.isRead
    );
  }
}

export default new NotificationService();
