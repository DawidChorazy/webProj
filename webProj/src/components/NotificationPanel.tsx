import { useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import notificationService from "../services/notificationService";
import type { Notification, NotificationPriority } from "../types/notification";

interface NotificationPanelProps {
  recipientId: string;
  onSelectNotification: (notification: Notification) => void;
}

const priorityLabels: Record<NotificationPriority, string> = {
  high: "Wysoki",
  medium: "Średni",
  low: "Niski",
};

export function NotificationPanel({
  recipientId,
  onSelectNotification,
}: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    let isMounted = true;

    const refresh = () => {
      void notificationService
        .getUserNotifications(recipientId)
        .then((userNotifications) => {
          if (isMounted) {
            setNotifications(userNotifications);
          }
        });
    };

    const unsubscribe = notificationService.subscribe(refresh);
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [recipientId]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  const handleNotificationClick = (notification: Notification) => {
    onSelectNotification(notification);
  };

  const handleMarkAsRead = (event: MouseEvent, id: string) => {
    event.stopPropagation();
    void notificationService.markAsRead(id);
  };

  const handleDelete = (event: MouseEvent, id: string) => {
    event.stopPropagation();
    void notificationService.deleteNotification(id);
  };

  return (
    <section className="notification-page">
      <div className="notification-header">
        <div>
          <p className="eyebrow">Centrum zdarzeń</p>
          <h1 className="page-title">Powiadomienia</h1>
          <p className="page-subtitle">
            Nieprzeczytane: {unreadCount}
          </p>
        </div>

        {notifications.length > 0 && (
          <div className="toolbar">
            <button
              className="secondary-button"
              onClick={() => void notificationService.markAllAsRead(recipientId)}
            >
              Oznacz wszystkie jako przeczytane
            </button>
            <button
              className="danger-button"
              onClick={() => void notificationService.clearAll(recipientId)}
            >
              Wyczyść
            </button>
          </div>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          Brak powiadomień.
        </div>
      ) : (
        <div className="notification-list">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`notification-card priority-${notification.priority} ${
                notification.isRead ? "" : "is-unread"
              }`}
            >
              <div>
                  <div className="meta-row">
                    <h2 className="item-title">
                      {notification.title}
                    </h2>
                    {!notification.isRead && (
                      <span className="pill pill-blue">
                        nowe
                      </span>
                    )}
                  </div>
                  <p className="notification-message">
                    {notification.message}
                  </p>
                  <div className="meta-row">
                    <span className="pill pill-amber">
                      Priorytet: {priorityLabels[notification.priority]}
                    </span>
                    <span className="pill pill-green">
                      {new Date(notification.date).toLocaleString("pl-PL")}
                    </span>
                  </div>
                </div>

                <div className="button-row">
                  {!notification.isRead && (
                    <button
                      className="secondary-button"
                      onClick={(event) =>
                        handleMarkAsRead(event, notification.id)
                      }
                    >
                      Oznacz jako przeczytane
                    </button>
                  )}
                  <button
                    className="danger-button"
                    onClick={(event) => handleDelete(event, notification.id)}
                    title="Usuń"
                  >
                    Usuń
                  </button>
                </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
