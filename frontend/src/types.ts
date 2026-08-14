// File system item types
export type FileType = "file" | "directory" | "symlink" | "unknown";

export interface BaseFileItem {
  id: string;
  name: string;
  path: string;
  type: FileType;
  parentId: string | null;
  isOpen?: boolean;
  isDirty?: boolean;
  lastModified?: number;
  lastOpened?: number;
  children?: string[];
  content?: string;
  language?: string;
  size?: number;
}

// FileTab represents a file in the editor
export interface FileTab extends BaseFileItem {
  content: string;
  language: string;
  isDirty: boolean;
  lastSaved?: number;
  viewState?: any; // Monaco editor view state
}

// Directory structure
export interface Directory extends BaseFileItem {
  type: "directory";
  children: string[];
  isOpen: boolean;
}

// Cursor position in the editor
export interface CursorPosition {
  lineNumber: number;
  column: number;
}

// Panel configuration
export interface PanelConfig {
  visible: boolean;
  height?: number;
  width?: number;
  isActive?: boolean;
  position?: "left" | "right" | "bottom";
}

// Store state interface
export interface StoreState {
  // Core state
  files: Record<string, FileTab>;
  directories: Record<string, Directory>;
  activeFile: string | null;
  workspacePath: string | null;

  // UI state
  isCommandPaletteOpen: boolean;
  connectionStatus: "connected" | "disconnected" | "checking" | "connecting";
  cursorPosition: CursorPosition;
  searchQuery: string;

  // Layout state
  layout: {
    sidebar: {
      width: number;
      collapsed: boolean;
      selectedItem?: string;
    };
    panels: {
      [key: string]: PanelConfig;
    };
    editor: {
      splitView: boolean;
    };
  };

  // Actions
  setFiles: (files: Record<string, FileTab>) => void;
  setActiveFile: (fileId: string | null) => void;
  setWorkspacePath: (path: string | null) => void;
  setCursorPosition: (position: CursorPosition) => void;
  setCommandPaletteOpen: (isOpen: boolean) => void;
  setConnectionStatus: (
    status: "connected" | "disconnected" | "checking" | "connecting",
  ) => void;
  setSearchQuery: (query: string) => void;

  // File operations
  updateFileContent: (fileId: string, content: string) => void;
  addFile: (
    file: Omit<FileTab, "id" | "isDirty" | "content" | "language">,
    content?: string,
  ) => void;
  removeFile: (fileId: string) => void;
  getActiveFile: () => FileTab | null;

  // Layout operations
  togglePanel: (panel: string) => void;
  toggleSidebar: () => void;

  // Workspace operations
  loadWorkspace: (path: string) => Promise<void>;
  saveWorkspace: () => Promise<void>;
}

// Notification types
export type NotificationType = "info" | "warning" | "error" | "success";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  duration?: number;
  action?: NotificationAction;
}

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

// AI Provider types
export type ProviderType = "ollama" | "openai" | "anthropic" | "groq";

export type ConnectionStatus =
  | "connected"
  | "disconnected"
  | "checking"
  | "connecting";

export type FileReference = string | FileTab;

export interface OutlineItem {
  name: string;
  kind: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  children?: OutlineItem[];
  detail?: string;
  tags?: string[];
}
