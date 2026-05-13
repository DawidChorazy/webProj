export type ISOString = string;
export type UserID = string;
export type NotificationPriority = "low" | "medium" | "high";

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: ISOString;
  priority: NotificationPriority;
  isRead: boolean;
  recipientId: UserID;
}

export interface NotificationAction {
  type: "CREATE" | "MARK_AS_READ" | "DELETE" | "CLEAR_ALL";
  notification?: Notification;
  notificationId?: string;
}
