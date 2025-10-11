import React from "react";

type Props = {
  currentFile: string;
  cursorPosition: { line: number; column: number };
  language: string;
  encoding: string;
  lineEnding: string;
  gitBranch?: string;
  problems: number;
  connectionStatus: "connected" | "disconnected" | "checking";
  theme: "dark" | "light";
  onThemeToggle: () => void;
  autoSaveStatus?: string;
  lastSaved?: Date | null;
};

export const StatusBar: React.FC<Props> = ({
  currentFile,
  cursorPosition,
  language,
  encoding,
  lineEnding,
  gitBranch,
  problems,
  connectionStatus,
  theme,
  onThemeToggle,
  autoSaveStatus,
  lastSaved
}) => {
  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case "connected": return "🟢";
      case "disconnected": return "🔴";
      case "checking": return "🟡";
    }
  };

  const fileName = currentFile ? currentFile.split(/[/\\]/).pop() : "";

  return (
    <div className="h-6 bg-blue-600 text-white px-2 flex items-center justify-between text-xs">
      <div className="flex items-center space-x-4">
        {/* Git Branch */}
        {gitBranch && (
          <div className="flex items-center cursor-pointer hover:bg-blue-700 px-1 rounded">
            <span className="mr-1">🌿</span>
            <span>{gitBranch}</span>
          </div>
        )}
        
        {/* Problems */}
        {problems > 0 && (
          <div className="flex items-center text-red-300 cursor-pointer hover:bg-blue-700 px-1 rounded">
            <span className="mr-1">⚠️</span>
            <span>{problems} problems</span>
          </div>
        )}

        {/* Connection Status */}
        <div className="flex items-center cursor-pointer hover:bg-blue-700 px-1 rounded">
          <span className="mr-1">{getConnectionIcon()}</span>
          <span className="capitalize">{connectionStatus}</span>
        </div>

        {/* Auto-save Status */}
        {autoSaveStatus && (
          <div className="flex items-center cursor-pointer hover:bg-blue-700 px-1 rounded">
            <span className="mr-1">💾</span>
            <span>{autoSaveStatus}</span>
          </div>
        )}

        {/* Last Saved */}
        {lastSaved && (
          <div className="flex items-center text-gray-300">
            <span className="mr-1">⏰</span>
            <span>Saved {lastSaved.toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        {/* File Info */}
        {fileName && (
          <span className="truncate max-w-48" title={currentFile}>
            {fileName}
          </span>
        )}

        {/* Cursor Position */}
        <span className="cursor-pointer hover:bg-blue-700 px-1 rounded">
          Ln {cursorPosition.line}, Col {cursorPosition.column}
        </span>

        {/* Language */}
        <span className="cursor-pointer hover:bg-blue-700 px-1 rounded capitalize">
          {language}
        </span>

        {/* Encoding */}
        <span className="cursor-pointer hover:bg-blue-700 px-1 rounded">
          {encoding}
        </span>

        {/* Line Ending */}
        <span className="cursor-pointer hover:bg-blue-700 px-1 rounded">
          {lineEnding}
        </span>

        {/* Theme Toggle */}
        <button
          onClick={onThemeToggle}
          className="hover:bg-blue-700 px-1 rounded"
          title="Toggle Theme"
        >
          {theme === "dark" ? "🌙" : "☀️"}
        </button>
      </div>
    </div>
  );
};