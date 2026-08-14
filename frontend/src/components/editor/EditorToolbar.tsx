import React from "react";

interface EditorToolbarProps {
  onSave: () => void;
  onFormat: () => void;
  onToggleSettings: () => void;
  onToggleDebug: () => void;
  isDebugging: boolean;
  className?: string;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onSave,
  onFormat,
  onToggleSettings,
  onToggleDebug,
  isDebugging,
  className = "",
}) => {
  return (
    <div
      className={`flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${className}`}
    >
      <div className="flex space-x-2">
        <button
          onClick={onSave}
          className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Save
        </button>
        <button
          onClick={onFormat}
          className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          Format
        </button>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={onToggleSettings}
          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          title="Settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 110-6 3 3 0 010 6z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <button
          onClick={onToggleDebug}
          className={`p-1.5 rounded-full ${
            isDebugging ? "text-red-500" : "text-gray-600 dark:text-gray-400"
          } hover:bg-gray-200 dark:hover:bg-gray-700`}
          title={isDebugging ? "Stop Debugging" : "Start Debugging"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.5 3A1.5 1.5 0 003 4.5v11A1.5 1.5 0 004.5 17h11a1.5 1.5 0 001.5-1.5v-11A1.5 1.5 0 0015.5 3h-11zM7 6a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 11-2 0V8.414l-1.293 1.293a1 1 0 01-1.414-1.414L9.586 7H8a1 1 0 01-1-1zm1 7a1 1 0 100 2h4a1 1 0 100-2H8z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Default export for backward compatibility
export const EditorToolbar = EditorToolbar;

// Named exports
export { EditorToolbar };
export default EditorToolbar;
