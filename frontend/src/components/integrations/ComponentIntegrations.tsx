import React, { useState } from "react";
import { AnalysisButton } from "../common/AnalysisButton";
import { SecurityButton } from "../common/SecurityButton";
import { CollaborationPanel } from "../common/CollaborationPanel";
import { SnippetLibrary } from "../common/SnippetLibrary";
import { FileContextMenu } from "../FileContextMenu";
import { FolderPicker } from "../FolderPicker";
import { WorkspaceConfig } from "../Settings/WorkspaceConfig";

// Re-export components for easy access
export {
  AnalysisButton,
  SecurityButton,
  CollaborationPanel,
  SnippetLibrary,
  FileContextMenu,
  FolderPicker,
  WorkspaceConfig,
};

// Custom hook for managing component states
export const useComponentStates = () => {
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const [showWorkspaceConfig, setShowWorkspaceConfig] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    filePath?: string;
  } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const toggleCollaboration = () => setShowCollaboration(!showCollaboration);
  const toggleSnippets = () => setShowSnippets(!showSnippets);
  const toggleWorkspaceConfig = () =>
    setShowWorkspaceConfig(!showWorkspaceConfig);

  const handleFileSelect = (filePath: string) => {
    setSelectedFiles((prev) => [...prev, filePath]);
  };

  const handleContextMenu = (e: React.MouseEvent, filePath?: string) => {
    e.preventDefault();
    setContextMenu(
      contextMenu === null ? { x: e.clientX, y: e.clientY, filePath } : null,
    );
  };

  const closeContextMenu = () => setContextMenu(null);

  return {
    showCollaboration,
    showSnippets,
    showWorkspaceConfig,
    contextMenu,
    selectedFiles,
    toggleCollaboration,
    toggleSnippets,
    toggleWorkspaceConfig,
    handleFileSelect,
    handleContextMenu,
    closeContextMenu,
  };
};

// Component that renders all the integrated UI elements
export const IntegratedUI: React.FC<{
  onCollaborationClick: () => void;
  onSnippetsClick: () => void;
  onWorkspaceConfigClick: () => void;
  children: React.ReactNode;
}> = ({
  onCollaborationClick,
  onSnippetsClick,
  onWorkspaceConfigClick,
  children,
}) => {
  return (
    <>
      {children}

      {/* Floating action buttons */}
      <div className="fixed bottom-4 right-4 flex flex-col space-y-2">
        <AnalysisButton onClick={onWorkspaceConfigClick} />
        <SecurityButton />
      </div>

      {/* Collaboration and Snippet panels would be rendered by their respective parent components */}
    </>
  );
};
