import React from "react";
import { AnalysisButton } from "./AnalysisButton";
import { CollaborationPanel } from "./CollaborationPanel";
import { DeployPanel } from "./DeployPanel";
import MCPPanel from "./MCPPanel";
import { OutlineView } from "./OutlineView";
import { ProblemsPanel } from "./ProblemsPanel";
import SecurityButton from "./SecurityButton";
import { ShortcutsPanel } from "./ShortcutsPanel";
import { SnippetLibrary } from "./SnippetLibrary";
import { SyncStatus } from "./SyncStatus";
import { TerminalPane } from "./TerminalPane";

type PanelType =
  | "analysis"
  | "collaboration"
  | "deploy"
  | "mcp"
  | "outline"
  | "problems"
  | "security"
  | "shortcuts"
  | "snippets"
  | "sync"
  | "terminal";

interface PanelSwitcherProps {
  activePanel: PanelType | null;
  projectRoot: string;
  currentFile?: string;
  onSymbolClick?: (symbol: any) => void;
  onProblemClick?: (problem: any) => void;
  onSnippetInsert?: (snippet: string) => void;
  onCollaborationStart?: () => void;
  onCollaborationStop?: () => void;
  problems?: any[];
  cwd?: string;
}

export const PanelSwitcher: React.FC<PanelSwitcherProps> = ({
  activePanel,
  projectRoot,
  currentFile,
  onSymbolClick = () => {},
  onProblemClick = () => {},
  onSnippetInsert = () => {},
  onCollaborationStart = () => {},
  onCollaborationStop = () => {},
  problems = [],
  cwd = "",
}) => {
  if (!activePanel) return null;

  const commonProps = {
    projectRoot,
    currentFile,
    onSymbolClick,
    onProblemClick,
    onInsert: onSnippetInsert,
    onCollaborationStart,
    onCollaborationStop,
    problems,
    cwd: cwd || projectRoot,
  };

  const panels: Record<PanelType, React.ReactNode> = {
    analysis: (
      <AnalysisButton projectRoot={projectRoot} currentFile={currentFile} />
    ),
    collaboration: (
      <CollaborationPanel
        projectRoot={projectRoot}
        onCollaborationStart={onCollaborationStart}
        onCollaborationStop={onCollaborationStop}
      />
    ),
    deploy: <DeployPanel projectRoot={projectRoot} />,
    mcp: <MCPPanel />,
    outline: (
      <OutlineView filePath={currentFile || ""} onSymbolClick={onSymbolClick} />
    ),
    problems: (
      <ProblemsPanel problems={problems} onProblemClick={onProblemClick} />
    ),
    security: <SecurityButton />,
    shortcuts: <ShortcutsPanel />,
    snippets: <SnippetLibrary onInsert={onSnippetInsert} />,
    sync: <SyncStatus projectRoot={projectRoot} />,
    terminal: <TerminalPane cwd={cwd || projectRoot} />,
  };

  return panels[activePanel] || null;
};

// Default export for backward compatibility
export const PanelSwitcher = PanelSwitcher;

// Named exports
export { PanelSwitcher };
export default PanelSwitcher;
