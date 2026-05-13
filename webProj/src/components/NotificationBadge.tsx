import { useEffect, useState } from "react";
import notificationService from "../services/notificationService";

interface NotificationBadgeProps {
  recipientId: string;
  onClick?: () => void;
}

export function NotificationBadge({
  recipientId,
  onClick,
}: NotificationBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const refresh = () => {
      void notificationService.getUnreadCount(recipientId).then((count) => {
        if (isMounted) {
          setUnreadCount(count);
        }
      });
    };

    const unsubscribe = notificationService.subscribe(refresh);
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [recipientId]);

  return (
    <button
      onClick={onClick}
      className="notification-button"
      title="Powiadomienia"
      aria-label="Przejdź do powiadomień"
    >
      <span className="notification-icon" aria-hidden="true">!</span>
      <span>Powiadomienia</span>
      {unreadCount > 0 && (
        <span
          aria-label={`${unreadCount} nieprzeczytanych powiadomień`}
          className="notification-count"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
