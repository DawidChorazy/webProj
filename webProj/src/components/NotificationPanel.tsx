import { useState, useEffect } from "react";
import notificationService from "../services/notificationService";
import type { Notification } from "../types/notification";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNotification?: (notification: Notification) => void;
}

export function NotificationPanel({
  isOpen,
  onClose,
  onSelectNotification,
}: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe(() => {
      const userNotifications = notificationService.getUserNotifications();
      setNotifications(userNotifications);
    });

    return unsubscribe;
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      notificationService.markAsRead(notification.id);
    }
    if (onSelectNotification) {
      onSelectNotification(notification);
    }
  };

  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    notificationService.deleteNotification(id);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "#ff6b6b";
      case "medium":
        return "#ffa500";
      case "low":
        return "#4caf50";
      default:
        return "#999";
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "60px",
        right: "20px",
        width: "400px",
        maxHeight: "600px",
        background: "white",
        border: "1px solid #ddd",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        zIndex: 1001,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "15px",
          borderBottom: "1px solid #ddd",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#f5f5f5",
        }}
      >
        <h3 style={{ margin: 0 }}>Powiadomienia</h3>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            fontSize: "20px",
            cursor: "pointer",
            color: "#999",
          }}
        >
          ✕
        </button>
      </div>

      {/* Toolbar */}
      {notifications.length > 0 && (
        <div
          style={{
            padding: "10px 15px",
            borderBottom: "1px solid #eee",
            display: "flex",
            gap: "10px",
          }}
        >
          <button
            onClick={handleMarkAllAsRead}
            style={{
              flex: 1,
              padding: "5px 10px",
              background: "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Oznacz wszystkie
          </button>
          <button
            onClick={() => notificationService.clearAll()}
            style={{
              flex: 1,
              padding: "5px 10px",
              background: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Wyczyść
          </button>
        </div>
      )}

      {/* Notifications List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
        {notifications.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "#999",
            }}
          >
            Brak powiadomień
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              style={{
                padding: "12px",
                marginBottom: "10px",
                border: `2px solid ${
                  notif.isRead ? "#eee" : getPriorityColor(notif.priority)
                }`,
                borderRadius: "6px",
                cursor: "pointer",
                background: notif.isRead ? "#f9f9f9" : "#fff",
                transition: "all 0.2s",
                opacity: notif.isRead ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = notif.isRead
                  ? "#f0f0f0"
                  : "#f5f5f5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = notif.isRead ? "#f9f9f9" : "#fff";
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <strong>{notif.title}</strong>
                    {!notif.isRead && (
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          background: "#2196F3",
                          borderRadius: "50%",
                        }}
                      />
                    )}
                  </div>
                  <p
                    style={{
                      margin: "5px 0 0 0",
                      fontSize: "12px",
                      color: "#666",
                    }}
                  >
                    {notif.message}
                  </p>
                  <div
                    style={{
                      marginTop: "8px",
                      display: "flex",
                      gap: "10px",
                      fontSize: "11px",
                    }}
                  >
                    <span
                      style={{
                        background: getPriorityColor(notif.priority),
                        color: "white",
                        padding: "2px 6px",
                        borderRadius: "3px",
                      }}
                    >
                      {notif.priority}
                    </span>
                    <span style={{ color: "#999" }}>
                      {new Date(notif.date).toLocaleString("pl-PL")}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, notif.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#999",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: "0 5px",
                  }}
                  title="Usuń"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
