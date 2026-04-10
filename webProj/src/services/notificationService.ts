import UserManager from "./userManager";
import type { Notification } from "../types/notification";

const STORAGE_KEY = "notifications";

class NotificationService {
  private notifications: Notification[] = [];
  private listeners: ((notifications: Notification[]) => void)[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.notifications = JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load notifications from storage:", error);
      this.notifications = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications));
    } catch (error) {
      console.error("Failed to save notifications to storage:", error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.notifications));
  }

  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.push(listener);
    listener(this.notifications);
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  createNotification(
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high',
    recipientId?: number
  ): Notification {
    const currentUser = UserManager.getCurrentUser();
    const userId = recipientId ?? currentUser.id;

    const notification: Notification = {
      id: this.generateId(),
      title,
      message,
      date: new Date().toISOString(),
      priority,
      isRead: false,
      recipientId: userId,
    };

    this.notifications.unshift(notification);
    this.saveToStorage();
    this.notifyListeners();

    return notification;
  }

  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  getNotificationById(id: string): Notification | undefined {
    return this.notifications.find(n => n.id === id);
  }

  getUnreadCount(): number {
    const currentUser = UserManager.getCurrentUser();
    return this.notifications.filter(
      n => n.recipientId === currentUser.id && !n.isRead
    ).length;
  }

  markAsRead(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification && !notification.isRead) {
      notification.isRead = true;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  markAllAsRead(): void {
    const currentUser = UserManager.getCurrentUser();
    let hasChanges = false;

    this.notifications.forEach(n => {
      if (n.recipientId === currentUser.id && !n.isRead) {
        n.isRead = true;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  deleteNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.saveToStorage();
    this.notifyListeners();
  }

  clearAll(): void {
    const currentUser = UserManager.getCurrentUser();
    this.notifications = this.notifications.filter(
      n => n.recipientId !== currentUser.id
    );
    this.saveToStorage();
    this.notifyListeners();
  }

  getUnreadNotifications(): Notification[] {
    const currentUser = UserManager.getCurrentUser();
    return this.notifications.filter(
      n => n.recipientId === currentUser.id && !n.isRead
    );
  }

  getUserNotifications(): Notification[] {
    const currentUser = UserManager.getCurrentUser();
    return this.notifications.filter(n => n.recipientId === currentUser.id);
  }
}

export default new NotificationService();
