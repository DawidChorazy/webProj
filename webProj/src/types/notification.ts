type ISOString = string;
type UserID = string | number;

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: ISOString;
  priority: 'low' | 'medium' | 'high';
  isRead: boolean;
  recipientId: UserID;
}

export interface NotificationAction {
  type: 'CREATE' | 'MARK_AS_READ' | 'DELETE' | 'CLEAR_ALL';
  notification?: Notification;
  notificationId?: string;
}
