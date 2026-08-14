import React from "react";
import { useDebugger } from "../../contexts/DebuggerContext";
import { Button } from "../ui/button";
import {
  Play,
  Pause,
  Square,
  StepForward,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { cn } from "../../lib/utils";

export const DebuggerToolbar: React.FC = () => {
  const {
    isDebugging,
    isPaused,
    startDebugging,
    stopDebugging,
    continueExecution,
    pauseExecution,
    stepOver,
    stepInto,
    stepOut,
    loading,
  } = useDebugger();

  const handleStartDebugging = () => {
    // In a real app, you would get the current file path from the editor
    const currentFilePath = ""; // Get from editor state
    if (currentFilePath) {
      startDebugging(currentFilePath, true);
    }
  };

  return (
    <div className="flex items-center space-x-2 p-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {!isDebugging ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={handleStartDebugging}
          disabled={loading}
          className="flex items-center space-x-1"
        >
          <Play className="h-4 w-4" />
          <span>Start Debugging</span>
        </Button>
      ) : (
        <>
          {isPaused ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={continueExecution}
              disabled={loading}
              className="flex items-center space-x-1"
            >
              <Play className="h-4 w-4" />
              <span>Continue</span>
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={pauseExecution}
              disabled={loading}
              className="flex items-center space-x-1"
            >
              <Pause className="h-4 w-4" />
              <span>Pause</span>
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={stopDebugging}
            disabled={!isDebugging || loading}
            className="flex items-center space-x-1"
          >
            <Square className="h-4 w-4" />
            <span>Stop</span>
          </Button>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

          <Button
            variant="secondary"
            size="sm"
            onClick={stepOver}
            disabled={!isPaused || loading}
            className="flex items-center space-x-1"
            title="Step Over (F10)"
          >
            <StepForward className="h-4 w-4" />
            <span>Step Over</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={stepInto}
            disabled={!isPaused || loading}
            className="flex items-center space-x-1"
            title="Step Into (F11)"
          >
            <ChevronDown className="h-4 w-4" />
            <span>Step Into</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={stepOut}
            disabled={!isPaused || loading}
            className="flex items-center space-x-1"
            title="Step Out (Shift+F11)"
          >
            <ChevronUp className="h-4 w-4" />
            <span>Step Out</span>
          </Button>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.location.reload()}
            className="flex items-center space-x-1"
            title="Restart Debugging (Ctrl+Shift+F5)"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            <span>Restart</span>
          </Button>
        </>
      )}

      <div className="flex-1" />

      <div className="flex items-center space-x-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {isDebugging ? (isPaused ? "Paused" : "Running") : "Not Running"}
        </span>
        <div
          className={cn(
            "h-3 w-3 rounded-full",
            isDebugging
              ? isPaused
                ? "bg-yellow-500"
                : "bg-green-500 animate-pulse"
              : "bg-gray-400",
          )}
        />
      </div>
    </div>
  );
};

// Exports
export { DebuggerToolbar };
