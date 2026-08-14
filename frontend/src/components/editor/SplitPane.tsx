import React from "react";

interface SplitPaneProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export const SplitPane: React.FC<SplitPaneProps> = ({
  left,
  right,
  className = "",
}) => {
  return (
    <div className={`flex flex-row h-full ${className}`}>
      <div className="flex-1 overflow-auto">{left}</div>
      <div className="w-px bg-gray-200 dark:bg-gray-700" />
      <div className="flex-1 overflow-auto">{right}</div>
    </div>
  );
};

// Default export for backward compatibility
export const SplitPane = SplitPane;

// Named exports
export { SplitPane };
export default SplitPane;
