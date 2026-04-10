import { useEffect, useState } from "react";
import notificationService from "../services/notificationService";
import type { Notification } from "../types/notification";

interface NotificationDialogProps {
  onClose?: () => void;
}

export function NotificationDialog({ onClose }: NotificationDialogProps) {
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    // Subscribe to new notifications
    let lastNotificationId: string | null = null;

    const unsubscribe = notificationService.subscribe((notifications) => {
      // Get the most recent unread notification with medium or high priority
      const recentHighPriority = notifications.find(
        (n) =>
          (n.priority === "medium" || n.priority === "high") &&
          n.id !== lastNotificationId
      );

      if (recentHighPriority) {
        lastNotificationId = recentHighPriority.id;
        setNotification(recentHighPriority);

        // Auto-close after 5 seconds
        const timer = setTimeout(() => {
          handleClose();
        }, 5000);

        return () => clearTimeout(timer);
      }
    });

    return unsubscribe;
  }, []);

  const handleClose = () => {
    if (notification) {
      notificationService.markAsRead(notification.id);
    }
    setNotification(null);
    if (onClose) onClose();
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case "high":
        return {
          background: "#ffebee",
          borderLeft: "4px solid #f44336",
          icon: "🔴",
        };
      case "medium":
        return {
          background: "#fff3e0",
          borderLeft: "4px solid #ff9800",
          icon: "🟠",
        };
      default:
        return {
          background: "#e8f5e9",
          borderLeft: "4px solid #4caf50",
          icon: "🟢",
        };
    }
  };

  if (!notification) return null;

  const styles = getPriorityStyles(notification.priority);

  return (
    <div
      style={{
        position: "fixed",
        top: "80px",
        right: "20px",
        width: "350px",
        background: styles.background,
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 2000,
        animation: "slideIn 0.3s ease-out",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>

      <div
        style={{
          padding: "20px",
          ...styles,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "start",
            gap: "15px",
          }}
        >
          <div style={{ fontSize: "24px" }}>{styles.icon}</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>
              {notification.title}
            </h3>
            <p
              style={{
                margin: "0 0 12px 0",
                fontSize: "14px",
                color: "#333",
                lineHeight: "1.4",
              }}
            >
              {notification.message}
            </p>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={handleClose}
                style={{
                  padding: "6px 12px",
                  background: "none",
                  border: "1px solid #999",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: "#333",
                }}
              >
                Zamknij
              </button>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              color: "#999",
              padding: "0",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: "3px",
          background: "rgba(0,0,0,0.1)",
          animation: "progress 5s linear forwards",
        }}
      >
        <style>{`
          @keyframes progress {
            from {
              width: 100%;
            }
            to {
              width: 0%;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
