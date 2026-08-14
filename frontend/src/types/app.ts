export type FileType = "file" | "directory";

export interface FileSystemItem {
  id: string;
  name: string;
  type: FileType;
  path: string;
  size?: number;
  lastModified?: number;
}

export interface FileNode extends FileSystemItem {
  children?: FileNode[];
  content?: string;
  isDirty?: boolean;
  language?: string;
}

export interface EditorTab {
  id: string;
  name: string;
  content: string;
  language: string;
  isDirty: boolean;
  filePath?: string;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  isOpen: boolean;
  files: FileNode[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface GitContextType {
  branch?: string;
  status?: string;
  isSyncing: boolean;
  lastSynced: Date;
  fetchStatus?: () => Promise<void>;
  pull?: () => Promise<void>;
  push?: () => Promise<void>;
  commit?: (message: string) => Promise<void>;
  stageFiles?: (paths: string[]) => Promise<void>;
  unstageFiles?: (paths: string[]) => Promise<void>;
  discardChanges?: (paths: string[]) => Promise<void>;
  getStagedFiles?: () => Promise<string[]>;
  getUnstagedFiles?: () => Promise<string[]>;
  getUntrackedFiles?: () => Promise<string[]>;
  getFileDiff?: (path: string) => Promise<string>;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface TerminalMessage {
  id: string;
  type: "command" | "output" | "error";
  content: string;
  timestamp: number;
}

export interface GitStatus {
  branch: string;
  isDirty: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  ahead: number;
  behind: number;
  changes?: {
    added: number;
    modified: number;
    deleted: number;
  };
}

export interface EditorSettingsType {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  theme: string;
  lineNumbers: "on" | "off" | "relative";
}

export interface PanelProps {
  children: React.ReactNode;
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  className?: string;
}

export interface AppState {
  // UI State
  isSidebarCollapsed: boolean;
  activeEditorTab: string;
  isTerminalOpen: boolean;
  showPackageManager: boolean;
  showWorkspaceConfig: boolean;
  showAIDashboard: boolean;
  showCompletionBubble: boolean;
  showDebugPanel: boolean;
  activeDebugPanel: string;
  showCollaboration: boolean;
  showDeployment: boolean;
  showMCP: boolean;
  isCommandPaletteOpen: boolean;
  isSettingsOpen: boolean;
  activeSettingsTab: string;
  isFileExplorerOpen: boolean;
  isOutlineViewOpen: boolean;
  isProblemsPanelOpen: boolean;
  isTerminalFocused: boolean;
  isSearching: boolean;
  isDragging: boolean;
  isRenaming: boolean;
  isCreatingFile: boolean;
  isDeleting: boolean;
  isUploading: boolean;
  isDownloading: boolean;
  isSharing: boolean;
  isCloning: boolean;
  isCommitting: boolean;
  isPushing: boolean;
  isPulling: boolean;
  isFetching: boolean;
  isMerging: boolean;
  isStashing: boolean;
  isPoppingStash: boolean;
  isDroppingStash: boolean;
  isCreatingBranch: boolean;
  isDeletingBranch: boolean;
  isCheckingOut: boolean;
  isTagging: boolean;
  isCreatingTag: boolean;
  isDeletingTag: boolean;
  isFetchingTags: boolean;
  isFetchingBranches: boolean;
  isFetchingRemotes: boolean;
  isAddingRemote: boolean;
  isRemovingRemote: boolean;
  isFetchingRemote: boolean;
  isPushingToRemote: boolean;
  isPullingFromRemote: boolean;
  isMergingFromRemote: boolean;
  isRebasing: boolean;
  isCherryPicking: boolean;
  isReverting: boolean;
  isResetting: boolean;
  isStaging: boolean;
  isUnstaging: boolean;
  isDiscarding: boolean;
  isInitialized: boolean;
  isLoading: boolean;

  // Editor State
  editorTabs: Array<{
    id: string;
    title: string;
    content: string;
    isDirty: boolean;
    filePath?: string;
  }>;
  activeTabId: string | null;
  selectedFile: FileNode | null;
  editorContent: string;
  isEditorDirty: boolean;
  editorSettings: EditorSettingsType;

  // AI State
  selectedModel: string;
  aiProvider: string;
  aiMessages: AIMessage[];
  isAILoading: boolean;
  availableModels: Array<{ id: string; name: string }>;

  // Project State
  project: Project | null;
  projectStructure: FileNode[];
  gitStatus: GitStatus;

  // Git State
  branchToDelete: string;
  branchToCheckout: string;
  mergeBranch: string;
  rebaseBranch: string;
  stashMessage: string;
  stashIndex: number;
  newBranchName: string;
  tagName: string;
  tagMessage: string;
  tagToCreate: string;
  tagToDelete: string;
  remoteName: string;
  remoteUrl: string;
  remoteToRemove: string;
  remoteToFetch: string;
  remoteToPush: string;
  branchToPush: string;
  remoteToPull: string;
  branchToPull: string;
  remoteToMerge: string;
  branchToMerge: string;
  commitToCherryPick: string;
  commitToRevert: string;
  resetMode: "soft" | "mixed" | "hard";
  commitToReset: string;
  filesToStage: string[];
  filesToUnstage: string[];
  filesToDiscard: string[];
  tags: string[];
  branches: string[];
  remotes: string[];

  // Terminal State
  terminalOutput: TerminalMessage[];
  terminalCommand: string;
  terminalHistory: string[];
  terminalHistoryIndex: number;

  // Search State
  searchQuery: string;
  searchResults: any[];
  selectedSearchResult: number;

  // Command Palette State
  commandPaletteQuery: string;
  commandPaletteResults: any[];
  selectedCommand: number;

  // Drag and Drop State
  dragOverPath: string | null;

  // File Operations State
  renamePath: string | null;
  renameValue: string;
  newFileName: string;
  newFileType: "file" | "folder";
  deletePath: string | null;
  uploadProgress: number;
  uploadFiles: File[];
  downloadPath: string | null;

  // Collaboration State
  sharePath: string | null;
  shareLink: string | null;

  // Cloning State
  cloneUrl: string;
  clonePath: string;

  // Commit State
  commitMessage: string;
  commitFiles: string[];

  // Notifications
  notifications: any[];

  // Context Menu
  contextMenu: { x: number; y: number; filePath?: string } | null;

  // Snippets
  snippets: Array<{
    id: string;
    name: string;
    content: string;
    language: string;
  }>;
  activeSnippet: string | null;

  // Error State
  error: string | null;
}

export interface PanelGroupProps {
  direction: "horizontal" | "vertical";
  children: React.ReactNode;
  className?: string;
}

export interface PanelResizeHandleProps {
  className?: string;
  style?: React.CSSProperties;
}

declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorker: (moduleId: string, label: string) => Worker;
    };
  }
}

export interface TerminalMessage {
  type: "input" | "output" | "error";
  content: string;
}

export interface GitStatus {
  ahead: number;
  behind: number;
  hasChanges: boolean;
}
