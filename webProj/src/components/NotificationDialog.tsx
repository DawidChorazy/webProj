import { useEffect, useState } from "react";
import notificationService from "../services/notificationService";
import type { Notification, NotificationPriority } from "../types/notification";

interface NotificationDialogProps {
  recipientId: string;
  onOpenNotification: (notification: Notification) => void;
}

const priorityLabels: Record<NotificationPriority, string> = {
  high: "Wysoki priorytet",
  medium: "Średni priorytet",
  low: "Niski priorytet",
};

export function NotificationDialog({
  recipientId,
  onOpenNotification,
}: NotificationDialogProps) {
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    const unsubscribe = notificationService.subscribeToNewNotifications(
      (newNotification) => {
        const shouldShow =
          newNotification.recipientId === recipientId &&
          (newNotification.priority === "medium" ||
            newNotification.priority === "high");

        if (shouldShow) {
          setNotification(newNotification);
        }
      }
    );

    return unsubscribe;
  }, [recipientId]);

  if (!notification) return null;

  const markAsRead = () => {
    void notificationService.markAsRead(notification.id);
    setNotification(null);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Nowe powiadomienie"
      className={`notification-dialog priority-${notification.priority}`}
    >
      <div className="dialog-header">
        <div>
          <span className="eyebrow">
            {priorityLabels[notification.priority]}
          </span>
          <h2 className="item-title">
            {notification.title}
          </h2>
          <p className="notification-message">{notification.message}</p>
        </div>
        <button
          className="secondary-button"
          onClick={() => setNotification(null)}
          title="Zamknij"
        >
          X
        </button>
      </div>

      <div className="dialog-actions">
        <button
          className="primary-button"
          onClick={() => {
            onOpenNotification(notification);
            setNotification(null);
          }}
        >
          Szczegóły
        </button>
        <button className="secondary-button" onClick={markAsRead}>
          Oznacz jako przeczytane
        </button>
      </div>
    </div>
  );
}
