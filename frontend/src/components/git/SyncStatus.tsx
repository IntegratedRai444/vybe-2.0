import React from "react";
import { FiGitBranch, FiCheck, FiX, FiRefreshCw, FiAlertCircle } from "react-icons/fi";

type SyncStatusProps = {
  status: "clean" | "dirty" | "uncommitted" | "conflict";
  className?: string;
};

export const SyncStatus: React.FC<SyncStatusProps> = ({
  status,
  className = "",
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case "clean":
        return <FiCheck className="text-green-500" />;
      case "dirty":
        return <FiRefreshCw className="text-yellow-500 animate-spin" />;
      case "uncommitted":
        return <FiGitBranch className="text-blue-500" />;
      case "conflict":
        return <FiAlertCircle className="text-red-500" />;
      default:
        return <FiGitBranch className="text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "clean":
        return "Synced";
      case "dirty":
        return "Changes to push";
      case "uncommitted":
        return "Uncommitted changes";
      case "conflict":
        return "Merge conflict";
      default:
        return "Unknown status";
    }
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {getStatusIcon()}
      <span className="text-xs text-gray-500">{getStatusText()}</span>
    </div>
  );
};

// Default export for backward compatibility
export const SyncStatus = SyncStatus;

// Named exports
export { SyncStatus };
export default SyncStatus;
