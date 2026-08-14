import React from "react";
import { FiGitBranch, FiCircle } from "react-icons/fi";
import { useProject } from "../../contexts/ProjectContext";

const ProjectStatusBar: React.FC = () => {
  const { currentProject } = useProject();

  if (!currentProject) {
    return (
      <div className="h-6 bg-gray-100 border-t border-gray-200 px-3 flex items-center text-xs text-gray-500">
        No active project
      </div>
    );
  }

  // Mock git branch - in a real app, this would come from git integration
  const currentBranch = "main";
  const hasChanges = false; // Mock for now
  const isAhead = false; // Mock for now
  const isBehind = false; // Mock for now

  return (
    <div className="h-6 bg-gray-100 border-t border-gray-200 px-3 flex items-center justify-between text-xs">
      <div className="flex items-center space-x-4">
        <div className="flex items-center text-gray-700">
          <FiGitBranch className="mr-1" size={12} />
          <span>{currentBranch}</span>

          {isAhead && (
            <span className="ml-2 flex items-center text-green-600">
              <FiCircle size={8} className="mr-1" />
              <span>Ahead</span>
            </span>
          )}

          {isBehind && (
            <span className="ml-2 flex items-center text-yellow-600">
              <FiCircle size={8} className="mr-1" />
              <span>Behind</span>
            </span>
          )}

          {hasChanges && (
            <span className="ml-2 flex items-center text-blue-600">
              <FiCircle size={8} className="mr-1" />
              <span>Uncommitted changes</span>
            </span>
          )}
        </div>
      </div>

      <div className="text-gray-500">
        {currentProject.files.length} files •
        {currentProject.files
          .reduce((total, file) => total + (file.content?.length || 0), 0)
          .toLocaleString()}{" "}
        chars
      </div>
    </div>
  );
};

export default ProjectStatusBar;
