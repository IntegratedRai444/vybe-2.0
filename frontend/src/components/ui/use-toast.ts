import * as React from "react";

interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

interface ToastInstance extends ToastOptions {
  id: string;
}

interface ToastContextType {
  toasts: ToastInstance[];
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(
  undefined,
);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = React.useState<ToastInstance[]>([]);

  const toast = React.useCallback(
    ({
      title,
      description,
      variant = "default",
      duration = 5000,
    }: ToastOptions) => {
      const id = Math.random().toString(36).substring(2, 9);
      const toast = { id, title, description, variant };

      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }

      return id;
    },
    [],
  );

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const contextValue = React.useMemo(
    () => ({
      toasts,
      toast,
      dismiss,
    }),
    [toasts, toast, dismiss],
  );

  // Use React's createElement instead of JSX to avoid TSX/JSX issues
  return React.createElement(ToastContext.Provider, { value: contextValue }, [
    children,
    React.createElement(
      "div",
      {
        key: "toast-container",
        className: "fixed bottom-4 right-4 z-50 flex flex-col gap-2",
      },
      toasts.map((toastItem) => {
        const toastClasses = [
          "flex",
          "flex-col",
          "p-4",
          "rounded-md",
          "shadow-lg",
          "min-w-[300px]",
          toastItem.variant === "destructive"
            ? "bg-red-100 dark:bg-red-900/90 text-red-900 dark:text-red-100"
            : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
        ].join(" ");

        return React.createElement(
          "div",
          {
            key: toastItem.id,
            className: toastClasses,
          },
          [
            React.createElement(
              "div",
              {
                key: "header",
                className: "flex justify-between items-center",
              },
              [
                React.createElement(
                  "h3",
                  {
                    key: "title",
                    className: "font-medium",
                  },
                  toastItem.title,
                ),
                React.createElement(
                  "button",
                  {
                    key: "close",
                    onClick: () => dismiss(toastItem.id),
                    className:
                      "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                    "aria-label": "Close",
                  },
                  "×",
                ),
              ],
            ),
            toastItem.description &&
              React.createElement(
                "p",
                {
                  key: "description",
                  className: "text-sm mt-1 text-gray-600 dark:text-gray-300",
                },
                toastItem.description,
              ),
          ].filter(Boolean),
        );
      }),
    ),
  ]);
};

export const useToast = (): ToastContextType => {
  const context = React.useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

// Add this to make it a proper module
export {};
