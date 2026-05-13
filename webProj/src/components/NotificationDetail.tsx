import { useEffect, useState } from "react";
import notificationService from "../services/notificationService";
import type { Notification, NotificationPriority } from "../types/notification";

interface NotificationDetailProps {
  notificationId: string | null;
  recipientId: string;
  onBack: () => void;
}

const priorityLabels: Record<NotificationPriority, string> = {
  high: "Wysoki",
  medium: "Średni",
  low: "Niski",
};

export function NotificationDetail({
  notificationId,
  recipientId,
  onBack,
}: NotificationDetailProps) {
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    let isMounted = true;

    const refresh = () => {
      if (!notificationId) {
        setNotification(null);
        return;
      }

      void notificationService.getNotificationById(notificationId).then((selected) => {
        if (!isMounted) return;

        if (!selected || selected.recipientId !== recipientId) {
          setNotification(null);
          return;
        }

        setNotification(selected);
      });
    };

    const unsubscribe = notificationService.subscribe(refresh);

    if (notificationId) {
      void notificationService.getNotificationById(notificationId).then((selected) => {
        if (selected && selected.recipientId === recipientId && !selected.isRead) {
          void notificationService.markAsRead(selected.id);
        }
      });
    }

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [notificationId, recipientId]);

  const handleMarkAsRead = () => {
    if (!notification) return;
    void notificationService.markAsRead(notification.id);
  };

  if (!notification) {
    return (
      <section className="notification-detail">
        <div className="notification-detail-card">
        <button className="secondary-button" onClick={onBack}>Powrót</button>
        <p>Powiadomienie nie zostało znalezione.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="notification-detail">
      <div className={`notification-detail-card priority-${notification.priority}`}>
      <button className="secondary-button" onClick={onBack}>
        Powrót do powiadomień
      </button>

      <div style={{ marginTop: "20px" }}>
        <h1 className="page-title">
          {notification.title}
        </h1>
        <div className="meta-row">
          <span className="pill pill-amber">
            Priorytet: {priorityLabels[notification.priority]}
          </span>
          <span className="pill pill-green">
            {new Date(notification.date).toLocaleString("pl-PL")}
          </span>
          <span className="pill pill-blue">
            {notification.isRead ? "Przeczytane" : "Nieprzeczytane"}
          </span>
        </div>

        <p className="notification-message">
          {notification.message}
        </p>

        <div className="button-row">
          {!notification.isRead && (
            <button className="secondary-button" onClick={handleMarkAsRead}>
              Oznacz jako przeczytane
            </button>
          )}
          <button
            className="danger-button"
            onClick={() => {
              void notificationService.deleteNotification(notification.id);
              onBack();
            }}
          >
            Usuń
          </button>
        </div>
      </div>
      </div>
    </section>
  );
}
