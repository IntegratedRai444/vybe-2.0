import React from "react";
import AIChatPanel from "@/components/ai/AIChatPanel";
import { useAI } from "@/components/ai/AIProvider";
import { Button } from "@/components/ui/Button";
import { FiX, FiSettings } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

interface ChatPanelProps {
  onClose: () => void;
  className?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  onClose,
  className = "",
}) => {
  const { provider, model, apiKey } = useAI();
  const navigate = useNavigate();
  const isConfigured = Boolean(
    provider && model && (provider === "ollama" || apiKey),
  );

  const handleSettingsClick = () => {
    navigate("/settings#ai");
    onClose();
  };

  if (!isConfigured) {
    return (
      <div
        className={`h-full flex flex-col bg-[#1e1e1e] border-l border-gray-700 ${className}`}
      >
        <div className="flex items-center justify-between p-3 border-b border-gray-700">
          <h3 className="text-sm font-medium">AI Assistant</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSettingsClick}
              className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"
              title="AI Settings"
            >
              <FiSettings className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"
              aria-label="Close chat"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-yellow-900/50 border border-yellow-800 text-yellow-200 p-4 rounded-lg max-w-md">
            <h4 className="font-medium mb-2">AI Assistant Not Configured</h4>
            <p className="text-sm text-yellow-300 mb-4">
              Please configure your AI settings to start using the chat
              assistant.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSettingsClick}
              className="text-yellow-200 border-yellow-700 hover:bg-yellow-800/50 hover:text-white"
            >
              <FiSettings className="mr-2 h-4 w-4" />
              Go to AI Settings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-full flex flex-col bg-[#1e1e1e] border-l border-gray-700 ${className}`}
    >
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <h3 className="text-sm font-medium">AI Assistant</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSettingsClick}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"
            title="AI Settings"
          >
            <FiSettings className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"
            aria-label="Close chat"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <AIChatPanel
          className="h-full"
          theme={{
            colors: {
              background: "#1e1e1e",
              border: "#333",
              text: "#e0e0e0",
              surface: "#252526",
            },
          }}
        />
      </div>
    </div>
  );
};

// Default export for backward compatibility
export const ChatPanel = ChatPanel;

// Named exports
export { ChatPanel };
export default ChatPanel;
