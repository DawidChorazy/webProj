import { useState, useEffect } from "react";
import notificationService from "../services/notificationService";

interface NotificationBadgeProps {
  onClick?: () => void;
}

export function NotificationBadge({ onClick }: NotificationBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe(() => {
      const count = notificationService.getUnreadCount();
      setUnreadCount(count);
    });

    return unsubscribe;
  }, []);

  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: "16px",
        color: "inherit",
        padding: "5px 10px",
      }}
      title="Notifications"
    >
      🔔
      {unreadCount > 0 && (
        <span
          style={{
            position: "absolute",
            top: "-5px",
            right: "-5px",
            background: "#ff4444",
            color: "white",
            borderRadius: "50%",
            width: "20px",
            height: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            fontWeight: "bold",
          }}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
