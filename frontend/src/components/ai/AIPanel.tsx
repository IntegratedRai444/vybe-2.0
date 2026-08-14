import React, { useState, useEffect, useCallback } from "react";
import { useAI } from "./AIProvider";
import {
  FiMessageSquare,
  FiSettings,
  FiLoader,
  FiSave,
  FiCode,
} from "react-icons/fi";
import { cn } from "../../utils/cn";

export interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  model?: string;
  provider?: string;
}

export type PanelView = "chat" | "code" | "settings";

export interface AIPanelProps {
  /** Whether the panel is visible */
  visible?: boolean;
  /** Unique identifier for the panel */
  id?: string;
  /** Additional CSS class names */
  className?: string;
  onClose?: () => void;
  initialView?: PanelView;
  onError?: (error: Error) => void;
}

export const AIPanel: React.FC<AIPanelProps> = ({
  visible = true,
  id = "ai-panel",
  className = "",
  onClose,
  initialView = "chat",
}) => {
  const [activeView, setActiveView] = useState<PanelView>(initialView);
  const [isSaving, setIsSaving] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);

  const { isLoading, saveSettings } = useAI();

  // Message handling is now managed by the AIProvider
  // This function is kept for future implementation
  const handleSendMessage = useCallback(
    (content: string) => {
      const userMessage: AIMessage = {
        id: Date.now().toString(),
        role: "user",
        content,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);
    },
    [setMessages],
  );

  const handleSaveSettings = useCallback(async () => {
    if (saveSettings) {
      setIsSaving(true);
      try {
        await saveSettings();
      } catch (error) {
        console.error("Error saving settings:", error);
      } finally {
        setIsSaving(false);
      }
    }
  }, [saveSettings]);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("ai-messages", JSON.stringify(messages));
    }
  }, [messages]);

  // Load saved messages when component mounts
  useEffect(() => {
    if (visible) {
      const savedMessages = localStorage.getItem("ai-messages");
      if (savedMessages) {
        try {
          setMessages(JSON.parse(savedMessages));
        } catch (e) {
          console.error("Failed to load messages", e);
        }
      }
    }
  }, [visible, setMessages]);

  const panelId = id || "ai-panel";

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed right-4 bottom-4 w-96 max-w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col border border-gray-200 dark:border-gray-700 transition-all duration-300",
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none",
        className,
      )}
      id={panelId}
      data-testid={panelId}
      aria-labelledby={`${panelId}-header`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveView("chat")}
            className={cn(
              "p-2 rounded-md",
              activeView === "chat"
                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
            )}
            title="Chat"
          >
            <FiMessageSquare className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveView("code")}
            className={cn(
              "p-2 rounded-md",
              activeView === "code"
                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
            )}
            title="Code Editor"
          >
            <FiCode className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveView("settings")}
            className={cn(
              "p-2 rounded-md",
              activeView === "settings"
                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
            )}
            title="Settings"
          >
            <FiSettings className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
            <FiLoader
              className={cn(
                "animate-spin",
                isLoading ? "text-yellow-500" : "text-green-500",
              )}
            />
            <span>{isLoading ? "Processing..." : "Ready"}</span>
          </div>
          {onClose && (
            <button
              onClick={handleSaveSettings}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
              disabled={isSaving}
            >
              {isSaving ? <FiLoader className="animate-spin" /> : <FiSave />}
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          )}
        </div>
      </div>

      {/* Error message - removed since we're not using error state */}

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeView === "chat" && (
          <div className="p-4">
            <h3 className="text-lg font-medium mb-4">AI Chat</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Chat functionality will be implemented here.
            </p>
          </div>
        )}
        {activeView === "code" && (
          <div className="p-4">
            <h3 className="text-lg font-medium mb-4">Code Editor</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Code editor functionality will be implemented here.
            </p>
          </div>
        )}
        {activeView === "settings" && (
          <div className="p-4">
            <h3 className="text-lg font-medium mb-4">Settings</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Settings will be implemented here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Export as both named and default for backward compatibility
export { AIPanel };
export default AIPanel;
