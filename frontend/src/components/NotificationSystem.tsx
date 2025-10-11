import React, { useEffect } from "react";

type Notification = {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
};

type Props = {
  notifications: Notification[];
  onDismiss: (id: string) => void;
};

export const NotificationSystem: React.FC<Props> = ({ notifications, onDismiss }) => {
  useEffect(() => {
    notifications.forEach(notification => {
      if (notification.duration !== 0) {
        const timer = setTimeout(() => {
          onDismiss(notification.id);
        }, notification.duration || 5000);

        return () => clearTimeout(timer);
      }
    });
  }, [notifications, onDismiss]);

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-900 border-green-700 text-green-200";
      case "error":
        return "bg-red-900 border-red-700 text-red-200";
      case "warning":
        return "bg-yellow-900 border-yellow-700 text-yellow-200";
      case "info":
        return "bg-blue-900 border-blue-700 text-blue-200";
      default:
        return "bg-gray-800 border-gray-600 text-gray-200";
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success": return "✅";
      case "error": return "❌";
      case "warning": return "⚠️";
      case "info": return "ℹ️";
      default: return "📢";
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-3 rounded-lg border shadow-lg ${getNotificationStyle(notification.type)} animate-slide-in`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2 flex-1">
              <span className="text-sm">{getNotificationIcon(notification.type)}</span>
              <div className="flex-1">
                <div className="font-medium text-sm">{notification.title}</div>
                {notification.message && (
                  <div className="text-xs mt-1 opacity-90">{notification.message}</div>
                )}
                {notification.action && (
                  <button
                    onClick={notification.action.onClick}
                    className="text-xs mt-2 underline hover:no-underline"
                  >
                    {notification.action.label}
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => onDismiss(notification.id)}
              className="text-gray-400 hover:text-white ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};