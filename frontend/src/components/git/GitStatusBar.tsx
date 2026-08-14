import React from "react";
import { FiGitBranch } from "react-icons/fi";
import {
  useGitBranch,
  useGitConnection,
  useGitStatus,
} from "../../store/gitSlice";
import { SyncStatus } from "./SyncStatus";

export const GitStatusBar: React.FC = () => {
  const branch = useGitBranch();
  const status = useGitStatus();
  const isConnected = useGitConnection();

  if (!branch) return null;

  return (
    <div className="flex items-center space-x-4 px-3 py-1.5 bg-gray-800 text-sm text-gray-300 border-t border-gray-700">
      <div className="flex items-center space-x-1">
        <FiGitBranch className="w-3.5 h-3.5" />
        <span className="font-medium">{branch}</span>
      </div>
      {status && <SyncStatus status={status} />}
      {!isConnected && (
        <span className="text-xs text-red-400">Disconnected</span>
      )}
    </div>
  );
};

// Exports
export { GitStatusBar };
