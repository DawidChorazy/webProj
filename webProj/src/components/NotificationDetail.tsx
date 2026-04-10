import { useEffect, useState } from "react";
import notificationService from "../services/notificationService";
import type { Notification } from "../types/notification";

interface NotificationDetailProps {
  notificationId: string | null;
  onBack: () => void;
}

export function NotificationDetail({
  notificationId,
  onBack,
}: NotificationDetailProps) {
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    if (notificationId) {
      const notif = notificationService.getNotificationById(notificationId);
      setNotification(notif || null);

      // Mark as read when viewing details
      if (notif && !notif.isRead) {
        notificationService.markAsRead(notificationId);
      }
    }
  }, [notificationId]);

  if (!notification) {
    return (
      <div
        style={{
          padding: "20px",
          textAlign: "center",
          color: "#999",
        }}
      >
        Powiadomienie nie zostało znalezione
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "#f44336";
      case "medium":
        return "#ff9800";
      case "low":
        return "#4caf50";
      default:
        return "#999";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "Wysoki";
      case "medium":
        return "Średni";
      case "low":
        return "Niski";
      default:
        return priority;
    }
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "600px",
        margin: "0 auto",
        padding: "20px",
      }}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          marginBottom: "20px",
          padding: "10px 15px",
          background: "#f5f5f5",
          border: "1px solid #ddd",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        ← Powrót
      </button>

      {/* Notification card */}
      <div
        style={{
          background: "white",
          border: `3px solid ${getPriorityColor(notification.priority)}`,
          borderRadius: "8px",
          padding: "30px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "20px" }}>
          <h1 style={{ margin: "0 0 10px 0", fontSize: "28px" }}>
            {notification.title}
          </h1>
          <div
            style={{
              display: "flex",
              gap: "15px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                background: getPriorityColor(notification.priority),
                color: "white",
                padding: "6px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              Priorytet: {getPriorityLabel(notification.priority)}
            </span>
            <span style={{ color: "#999", fontSize: "13px" }}>
              {new Date(notification.date).toLocaleString("pl-PL")}
            </span>
            {notification.isRead && (
              <span
                style={{
                  background: "#e0e0e0",
                  color: "#666",
                  padding: "4px 10px",
                  borderRadius: "4px",
                  fontSize: "12px",
                }}
              >
                ✓ Przeczytane
              </span>
            )}
          </div>
        </div>

        <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid #eee" }} />

        {/* Content */}
        <div
          style={{
            fontSize: "16px",
            lineHeight: "1.6",
            color: "#333",
            marginBottom: "30px",
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
          }}
        >
          {notification.message}
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
          }}
        >
          {!notification.isRead && (
            <button
              onClick={() =>
                notificationService.markAsRead(notification.id)
              }
              style={{
                padding: "10px 20px",
                background: "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Oznacz jako przeczytane
            </button>
          )}
          <button
            onClick={() => {
              notificationService.deleteNotification(notification.id);
              onBack();
            }}
            style={{
              padding: "10px 20px",
              background: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Usuń
          </button>
        </div>
      </div>
    </div>
  );
}
