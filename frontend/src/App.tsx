// Core React and routing
import React, {
  Suspense,
  lazy,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useReducer,
  Component,
  ErrorInfo,
  ReactNode,
  FC
} from 'react';
import { useTabs } from '@/hooks/useTabs';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// UI Components
import {
  Bot,
  Code as CodeIcon,
  FileCode,
  FileEdit,
  FilePlus,
  Folder,
  FolderOpen,
  GitBranch,
  GitCommit,
  GitMerge,
  GitPullRequest,
  Menu,
  Package,
  Puzzle,
  Search,
  Send,
  Settings as SettingsIcon,
  Shield,
  FileIcon,
  Terminal
} from 'lucide-react';

import { CodeEditor } from '@/components/editor/CodeEditor';


import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
// UI components from shadcn/ui
const Button = ({ children, variant = 'default', size = 'md', className = '', ...props }: any) => (
  <button className={`px-4 py-2 rounded-md ${className}`} {...props}>
    {children}
  </button>
);

const Tabs = ({ children, defaultValue, className = '' }: any) => (
  <div className={className}>{children}</div>
);

const TabsList = ({ children, className = '' }: any) => (
  <div className={`flex border-b ${className}`}>{children}</div>
);

const TabsTrigger = ({ value, children, className = '' }: any) => (
  <button className={`px-4 py-2 ${className}`} data-value={value}>
    {children}
  </button>
);

const TabsContent = ({ value, children, className = '' }: any) => (
  <div className={className} data-value={value}>
    {children}
  </div>
);

const Input = ({ className = '', ...props }: any) => (
  <input className={`border rounded px-3 py-2 ${className}`} {...props} />
);

const ScrollArea = ({ children, className = '' }: any) => (
  <div className={`overflow-auto ${className}`}>{children}</div>
);

const Separator = ({ className = '' }: { className?: string }) => (
  <hr className={`border-t border-gray-200 ${className}`} />
);

const Badge = ({ variant = 'default', children, className = '' }: any) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
    {children}
  </span>
);

const Switch = ({ checked, onChange, className = '' }: any) => (
  <button
    className={`relative inline-flex h-6 w-11 items-center rounded-full ${checked ? 'bg-blue-600' : 'bg-gray-200'} ${className}`}
    onClick={() => onChange(!checked)}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${checked ? 'translate-x-6' : 'translate-x-1'}`}
    />
  </button>
);

const Label = ({ htmlFor, children, className = '' }: any) => (
  <label htmlFor={htmlFor} className={`block text-sm font-medium text-gray-700 ${className}`}>
    {children}
  </label>
);

const Popover = ({ children, open, onOpenChange }: any) => (
  <div className="relative">
    {open && (
      <div className="absolute z-10 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
        {children}
      </div>
    )}
  </div>
);

const PopoverTrigger = ({ children, asChild = false, className = '' }: any) => (
  <div className={className}>{children}</div>
);

const PopoverContent = ({ children, className = '', ...props }: any) => (
  <div className={`p-4 ${className}`} {...props}>
    {children}
  </div>
);

const Command = ({ children, className = '' }: any) => (
  <div className={`flex flex-col ${className}`}>{children}</div>
);

const CommandInput = ({ placeholder, value, onValueChange, className = '' }: any) => (
  <input
    type="text"
    placeholder={placeholder}
    value={value}
    onChange={(e) => onValueChange?.(e.target.value)}
    className={`px-3 py-2 border rounded-md ${className}`}
  />
);

const CommandList = ({ children, className = '' }: any) => (
  <div className={`mt-1 ${className}`}>{children}</div>
);

const CommandItem = ({ children, onSelect, className = '' }: any) => (
  <div
    className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${className}`}
    onClick={onSelect}
  >
    {children}
  </div>
);
// Icons are imported at the top of the file

// Context hooks
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { useGit } from '@/contexts/GitContext';

// Types
type PanelType = 'file-explorer' | 'search' | 'git' | 'debug' | 'extensions';
type AIMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

type Project = {
  id: string;
  name: string;
  path: string;
  type?: 'file' | 'directory';
  children?: Project[];
};

type GitStatus = {
  branch: string;
  isDirty: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[]
};

type EditorSettingsType = {
  fontSize: number;
  tabSize: number;
  wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  minimap: { enabled: boolean };
  lineNumbers: 'on' | 'off' | 'relative' | 'interval' | ((lineNumber: number) => string);
  theme?: string;
  insertSpaces?: boolean;
  autoSave?: boolean;
  formatOnSave?: boolean;
};

type TerminalMessage = {
  id: string;
  type: 'stdout' | 'stderr';
  content: string;
  timestamp: number;
};

// EditorTab type is defined later in the file

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
  content?: string;
  language?: string;
  isOpen?: boolean;
}

// Additional type definitions
interface AIProviderProps {
  children: React.ReactNode;
  config: {
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
}

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
  onSearch: (query: string) => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  showCommandPalette: () => void;
  showSettings: () => void;
}

interface AIResponse {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
}

interface WorkspaceConfig {
  theme: string;
  fontSize: number;
  tabSize: number;
  insertSpaces: boolean;
  autoSave: boolean;
  formatOnSave: boolean;
  extensions: any[];
}

interface AIProviderProps {
  config: {
    apiKey: string;
    model: string;
    temperature: number;
  };
  children: React.ReactNode;
}

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
  onSearch: (query: string) => void;
}

// Missing components
const Header: React.FC<HeaderProps> = ({ title, onMenuClick, onSearch }) => (
  <header className="flex items-center justify-between p-4 border-b">
    <Button variant="ghost" size="icon" onClick={onMenuClick} className="p-2">
      <Menu className="h-5 w-5" />
    </Button>
    <h1 className="text-lg font-semibold">{title}</h1>
    <div className="relative w-64">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search..."
        onChange={(e) => onSearch(e.target.value)}
        className="pl-10"
      />
    </div>
  </header>
);

const PanelContainer: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`flex-1 overflow-auto ${className}`}>
    <ScrollArea className="h-full">
      <div className="p-4">
        {children}
      </div>
    </ScrollArea>
  </div>
);

// Mock implementations for missing components
const FileTabs: React.FC<{
  files: Array<{ id: string; name: string }>;
  activeTab: string | null;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
}> = ({ files, activeTab, onTabClick, onTabClose }) => (
  <div className="flex border-b bg-background">
    {files.map((file) => (
      <div
        key={file.id}
        className={`flex items-center px-4 py-2 border-r border-border ${activeTab === file.id ? 'bg-background' : 'bg-muted/50'}`}
        onClick={() => onTabClick(file.id)}
      >
        <span className="mr-2">{file.name}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 ml-2 hover:bg-transparent hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onTabClose(file.id);
          }}
        >
          <span className="text-xs">×</span>
        </Button>
      </div>
    ))}
  </div>
);

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Mock components for missing UI elements
const WorkspaceConfig: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: WorkspaceConfig;
  onConfigChange: (config: WorkspaceConfig) => void;
}> = ({ open, onOpenChange, config, onConfigChange }) => (
  <div className={`fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center ${open ? 'block' : 'hidden'}`}>
    <div className="bg-background border rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Workspace Settings</h2>
        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
          <span>×</span>
        </Button>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-save">Auto Save</Label>
            <Switch
              id="auto-save"
              checked={config.autoSave}
              onCheckedChange={(checked) => onConfigChange({ ...config, autoSave: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="format-on-save">Format on Save</Label>
            <Switch
              id="format-on-save"
              checked={config.formatOnSave}
              onCheckedChange={(checked) => onConfigChange({ ...config, formatOnSave: checked })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="font-size">Font Size</Label>
              <Input
                id="font-size"
                type="number"
                value={config.fontSize}
                onChange={(e) => onConfigChange({ ...config, fontSize: parseInt(e.target.value) || 14 })}
                min={10}
                max={32}
              />
            </div>
            <div>
              <Label htmlFor="tab-size">Tab Size</Label>
              <Input
                id="tab-size"
                type="number"
                value={config.tabSize}
                onChange={(e) => onConfigChange({ ...config, tabSize: parseInt(e.target.value) || 2 })}
                min={1}
                max={8}
              />
            </div>
          </div>
        </div>
      </ScrollArea>
      <div className="flex justify-end p-4 border-t">
        <Button onClick={() => onOpenChange(false)}>Done</Button>
      </div>
    </div>
  </div>
);

interface AppState {
  // UI State
  isSidebarCollapsed: boolean;
  activeEditorTab: string;
  isTerminalOpen: boolean;
  showPackageManager: boolean;
  showWorkspaceConfig: boolean;
  showAIDashboard: boolean;
  showSettings: boolean;
  showCommandPalette: boolean;

  // Editor State
  editorTabs: Array<{
    id: string;
    name: string;
    content: string;
    language: string;
    isDirty: boolean;
    path?: string;
  }>;
  activeTabId: string | null;
  selectedFile: FileNode | null;
  editorSettings: EditorSettingsType;

  // AI State
  aiMessages: AIMessage[];
  isAILoading: boolean;
  aiResponse: string;

  // Project State
  projectStructure: FileNode[];
  currentProject: Project | null;
  gitStatus: GitStatus | null;

  // Workspace State
  workspaceConfig: WorkspaceConfig;

  // Context Menu State
  contextMenu: { type: string; x: number; y: number; data?: any } | null;
  contextMenuPosition: { x: number; y: number } | null;
  selectedFileForContext: FileNode | null;

  // Other State
  hasUncommittedChanges: boolean;
  isAIPanelOpen: boolean;
  showShortcuts: boolean;
  showSnippets: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  analysisResults: any[];
}

interface EditorTab {
  id: string;
  name: string;
  content: string;
  language: string;
  isDirty: boolean;
  path?: string;
}

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
  content?: string;
  language?: string;
}

// Constants - Single source of truth for initial state
const INITIAL_STATE: AppState = {
  // UI State
  isSidebarCollapsed: false,
  activeEditorTab: 'editor',
  isTerminalOpen: false,
  showPackageManager: false,
  showWorkspaceConfig: false,
  showAIDashboard: false,
  showSettings: false,
  showCommandPalette: false,

  // Editor State
  editorTabs: [],
  activeTabId: null,
  selectedFile: null,
  editorSettings: {
    fontSize: 14,
    tabSize: 2,
    wordWrap: 'on',
    minimap: { enabled: true },
    lineNumbers: 'on',
    theme: 'vs-dark',
    insertSpaces: true,
    autoSave: true,
    formatOnSave: true
  },

  // AI State
  aiMessages: [],
  isAILoading: false,
  aiResponse: '',

  // Project State
  project: null,
  projectStructure: [],
  gitStatus: {
    branch: 'main',
    isDirty: false,
    staged: [],
    unstaged: [],
    untracked: []
  },
  branch: 'main',
  snippets: [],
  lintIssues: [],
  securityIssues: [],
  installedPackages: [],
  isConnected: false,
  connectionStatus: 'disconnected',
  workspaceConfig: {
    name: '',
    settings: {
      autoSave: true,
      formatOnSave: true,
      tabSize: 2,
      insertSpaces: true,
      theme: 'vs-dark'
    },
    extensions: []
  },
  hasUncommittedChanges: false
};

// Reducer for state management
function appReducer(state: AppState, action: { type: string; payload?: any }): AppState {
  switch (action.type) {
    // UI State
    case 'TOGGLE_SIDEBAR':
      return { ...state, isSidebarCollapsed: !state.isSidebarCollapsed };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeEditorTab: action.payload };
    case 'TOGGLE_TERMINAL':
      return { ...state, isTerminalOpen: !state.isTerminalOpen };
    case 'SET_SHOW_SETTINGS':
      return { ...state, showSettings: action.payload };
    case 'SET_SHOW_COMMAND_PALETTE':
      return { ...state, showCommandPalette: action.payload };
    case 'SET_CONTEXT_MENU':
      return { ...state, contextMenu: action.payload };
    case 'SET_CONTEXT_MENU_POSITION':
      return { ...state, contextMenuPosition: action.payload };
    case 'SET_ACTIVE_RIGHT_PANEL':
      return { ...state, activeRightPanel: action.payload };
    case 'SET_AI_PANEL_OPEN':
      return { ...state, isAIPanelOpen: action.payload };

    // Editor State
    case 'SET_EDITOR_TABS':
      return { ...state, editorTabs: action.payload };
    case 'SET_ACTIVE_TAB_ID':
      return { ...state, activeTabId: action.payload };
    case 'SET_SELECTED_FILE':
      return { ...state, selectedFile: action.payload };
    case 'SET_EDITOR_CONTENT':
      return { ...state, editorContent: action.payload, isEditorDirty: true };
    case 'SET_EDITOR_DIRTY':
      return { ...state, isEditorDirty: action.payload };

    // AI State
    case 'SET_AI_LOADING':
      return { ...state, isAILoading: action.payload };
    case 'SET_AI_MESSAGES':
      return { ...state, aiMessages: action.payload };
    case 'SET_AI_PROVIDER':
      return { ...state, aiProvider: action.payload };
    case 'SET_SELECTED_MODEL':
      return { ...state, selectedModel: action.payload };

    // Project State
    case 'SET_PROJECT':
      return { ...state, project: action.payload };
    case 'SET_PROJECT_STRUCTURE':
      return { ...state, projectStructure: action.payload };
    case 'SET_GIT_STATUS':
      return { ...state, gitStatus: action.payload };

    // Workspace State
    case 'SET_WORKSPACE_CONFIG':
      return { ...state, workspaceConfig: action.payload };

    default:
      console.warn(`Unknown action type: ${action.type}`);
      return state;
  }
}

// Custom hooks for state management
function useAppState(initialState: AppState) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const actions = useMemo(() => ({
    toggleSidebar: () => dispatch({ type: 'TOGGLE_SIDEBAR' }),
    setActiveTab: (tab: string) => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab }),
    toggleTerminal: () => dispatch({ type: 'TOGGLE_TERMINAL' }),
    setEditorTabs: (tabs: EditorTab[]) => dispatch({ type: 'SET_EDITOR_TABS', payload: tabs }),
    setActiveTabId: (id: string | null) => dispatch({ type: 'SET_ACTIVE_TAB_ID', payload: id }),
    setSelectedFile: (file: FileNode | null) => dispatch({ type: 'SET_SELECTED_FILE', payload: file }),
    setEditorContent: (content: string) => dispatch({ type: 'SET_EDITOR_CONTENT', payload: content }),
    setAIMessages: (messages: AIMessage[]) => dispatch({ type: 'SET_AI_MESSAGES', payload: messages }),
    setAILoading: (isLoading: boolean) => dispatch({ type: 'SET_AI_LOADING', payload: isLoading }),
    setProject: (project: Project | null) => dispatch({ type: 'SET_PROJECT', payload: project }),
    setProjectStructure: (structure: FileNode[]) => dispatch({ type: 'SET_PROJECT_STRUCTURE', payload: structure }),
    setGitStatus: (status: GitStatus) => dispatch({ type: 'SET_GIT_STATUS', payload: status })
  }), []);

  return { state, actions };
}

// Error Boundary with fallback UI
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  componentStack: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      componentStack: ''
    };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      error,
      componentStack: error.stack || '',
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
      componentStack: errorInfo.componentStack
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      componentStack: ''
    });
  }

  render() {
    if (this.state.hasError) {
      const { error, componentStack } = this.state;
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
          <div className="max-w-2xl w-full bg-card rounded-lg shadow-lg p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 text-destructive">!</div>
              <h2 className="text-2xl font-bold text-foreground">Something went wrong</h2>
            </div>

            <div className="mt-4 p-4 bg-muted/50 rounded-md">
              <p className="text-sm font-medium text-foreground">
                {error?.message || 'An unknown error occurred'}
              </p>
              {componentStack && (
                <details className="mt-3">
                  <summary className="text-sm text-muted-foreground cursor-pointer">
                    Show error details
                  </summary>
                  <pre className="mt-2 p-2 bg-background rounded text-xs overflow-auto max-h-60">
                    {componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-border">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
              >
                <span>Reload Page</span>
              </button>
              <button
                onClick={this.handleReset}
                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
              >
                <span>Try Again</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Icons
import {
  Bot, Code, CodeIcon, FileCode, FileEdit, FilePlus, Folder, FolderOpen, GitBranch, GitCommit, GitMerge,
  GitPullRequest, Menu, Package, Puzzle, Search, Send, Settings, Settings as SettingsIcon, Shield, Terminal, AlertCircle,
  X, ChevronDown, ChevronRight, Plus, File, FileText, Maximize2, Minimize2, RotateCw, Save, Zap, MessageSquare, Type,
  FileQuestion, FileSearch, FileText as FileTextIcon, FilePlus as FilePlusIcon, FolderPlus, FolderOpen as FolderOpenIcon,
  GitFork, GitPullRequest as GitPullRequestIcon, GitCommit as GitCommitIcon, GitBranch as GitBranchIcon,
  GitMerge as GitMergeIcon, GitPullRequest as GitPullRequestIcon2, GitCommit as GitCommitIcon2, GitBranch as GitBranchIcon2,
  GitMerge as GitMergeIcon2, GitPullRequest as GitPullRequestIcon3, GitCommit as GitCommitIcon3, GitBranch as GitBranchIcon3,
  GitMerge as GitMergeIcon3, GitPullRequest as GitPullRequestIcon4, GitCommit as GitCommitIcon4, GitBranch as GitBranchIcon4,
  GitMerge as GitMergeIcon4, GitPullRequest as GitPullRequestIcon5, GitCommit as GitCommitIcon5, GitBranch as GitBranchIcon5,
  GitMerge as GitMergeIcon5, GitPullRequest as GitPullRequestIcon6, GitCommit as GitCommitIcon6, GitBranch as GitBranchIcon6,
  GitMerge as GitMergeIcon6, GitPullRequest as GitPullRequestIcon7, GitCommit as GitCommitIcon7, GitBranch as GitBranchIcon7,
  GitMerge as GitMergeIcon7, GitPullRequest as GitPullRequestIcon8, GitCommit as GitCommitIcon8, GitBranch as GitBranchIcon8,
  GitMerge as GitMergeIcon8, GitPullRequest as GitPullRequestIcon9, GitCommit as GitCommitIcon9, GitBranch as GitBranchIcon9,
  GitMerge as GitMergeIcon9, GitPullRequest as GitPullRequestIcon10, GitCommit as GitCommitIcon10, GitBranch as GitBranchIcon10,
  GitMerge as GitMergeIcon10, GitPullRequest as GitPullRequestIcon11, GitCommit as GitCommitIcon11, GitBranch as GitBranchIcon11,
  GitMerge as GitMergeIcon11, GitPullRequest as GitPullRequestIcon12, GitCommit as GitCommitIcon12, GitBranch as GitBranchIcon12,
  GitMerge as GitMergeIcon12, GitPullRequest as GitPullRequestIcon13, GitCommit as GitCommitIcon13, GitBranch as GitBranchIcon13,
  GitMerge as GitMergeIcon13, GitPullRequest as GitPullRequestIcon14, GitCommit as GitCommitIcon14, GitBranch as GitBranchIcon14,
  GitMerge as GitMergeIcon14, GitPullRequest as GitPullRequestIcon15, GitCommit as GitCommitIcon15, GitBranch as GitBranchIcon15,
  GitMerge as GitMergeIcon15, GitPullRequest as GitPullRequestIcon16, GitCommit as GitCommitIcon16, GitBranch as GitBranchIcon16,
  GitMerge as GitMergeIcon16, GitPullRequest as GitPullRequestIcon17, GitCommit as GitCommitIcon17, GitBranch as GitBranchIcon17,
  GitMerge as GitMergeIcon17, GitPullRequest as GitPullRequestIcon18, GitCommit as GitCommitIcon18, GitBranch as GitBranchIcon18,
  GitMerge as GitMergeIcon18, GitPullRequest as GitPullRequestIcon19, GitCommit as GitCommitIcon19, GitBranch as GitBranchIcon19,
  GitMerge as GitMergeIcon19, GitPullRequest as GitPullRequestIcon20, GitCommit as GitCommitIcon20, GitBranch as GitBranchIcon20
} from 'lucide-react';

// UI Components
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Custom Components
type FileTabsProps = {
  files: Array<{ id: string; name: string }>;
  activeTab: string | null;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
};

const FileTabs: React.FC<FileTabsProps> = ({ files, activeTab, onTabClick, onTabClose }) => (
  <div className="flex border-b bg-background">
    {files.map((file) => (
      <div
        key={file.id}
        className={`flex items-center px-4 py-2 border-r border-border ${activeTab === file.id ? 'bg-background' : 'bg-muted/50'}`}
        onClick={() => onTabClick(file.id)}
      >
        <span className="mr-2">{file.name}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 ml-2 hover:bg-transparent hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onTabClose(file.id);
          }}
        >
          <span className="text-xs">×</span>
        </Button>
      </div>
    ))}
  </div>
);

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Mock components for missing UI elements
const FileExplorer = ({ files, onFileSelect }: {
  files: FileNode[];
  onFileSelect: (file: FileNode | null) => void;
}) => (
  <div className="p-2">
    {files.map((file) => (
      <div
        key={file.id}
        className="flex items-center p-1 hover:bg-muted/50 rounded cursor-pointer"
        onClick={() => onFileSelect(file)}
      >
        {file.type === 'directory' ? (
          <Folder className="h-4 w-4 mr-2 text-blue-500" />
        ) : (
          <File className="h-4 w-4 mr-2 text-gray-500" />
        )}
        <span>{file.name}</span>
      </div>
    ))}
  </div>
);

const ConnectionStatus = ({ isConnected, status }: {
  isConnected: boolean;
  status: string;
}) => (
  <div className="flex items-center text-xs text-muted-foreground">
    <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
    {status}
  </div>
);

// Mock AIProvider component
const AIProvider: React.FC<AIProviderProps> = ({ children }) => {
  return <>{children}</>;
};

// Mock FileIcon component
const FileIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
  </svg>
);
import EnhancedFileTree from '@/components/EnhancedFileTree';
import OutlineView from '@/components/OutlineView';
import SnippetLibrary from '@/components/SnippetLibrary';
import MonacoEditor from '@/components/MonacoEditor';

// Providers
import AppProviders from '@/providers/AppProviders';
import MCPProvider from '@/providers/MCPProvider';
import DebuggerProvider from '@/providers/DebuggerProvider';
import WebSocketProvider from '@/providers/WebSocketProvider';
import GitProvider from '@/providers/GitProvider';
import ProjectProvider from '@/providers/ProjectProvider';
import AuthProvider from '@/providers/AuthProvider';
import { ThemeProvider } from '@/components/theme-provider';

// Initialize QueryClient for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Lazy load main app routes
const AppRoutes = lazy(() => import('@/AppRoutes').then(module => ({ default: module.default })));

// Loading component for Suspense fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  </div>
);

// Main App component
const App: React.FC = () => {
  // State management using useReducer
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);

  // Destructure state for easier access
  const {
    isSidebarCollapsed,
    isTerminalOpen,
    selectedFile,
    editorTabs,
    activeTabId,
    aiMessages,
    isAILoading,
    showSettings,
    showCommandPalette,
    contextMenu,
    contextMenuPosition,
    activeRightPanel,
    isAIPanelOpen
  } = state;

  // State setters
  const setEditorTabs = (tabs: EditorTab[]) => dispatch({ type: 'SET_EDITOR_TABS', payload: tabs });
  const setActiveTabId = (id: string | null) => dispatch({ type: 'SET_ACTIVE_TAB_ID', payload: id });
  const setSelectedFile = (file: FileNode | null) => dispatch({ type: 'SET_SELECTED_FILE', payload: file });
  const setIsAILoading = (loading: boolean) => dispatch({ type: 'SET_AI_LOADING', payload: loading });
  const setAiMessages = (messages: AIMessage[]) => dispatch({ type: 'SET_AI_MESSAGES', payload: messages });
  const setShowSettings = (show: boolean) => dispatch({ type: 'SET_SHOW_SETTINGS', payload: show });
  const setShowCommandPalette = (show: boolean) => dispatch({ type: 'SET_SHOW_COMMAND_PALETTE', payload: show });
  const setContextMenu = (menu: { x: number; y: number; filePath?: string } | null) => dispatch({ type: 'SET_CONTEXT_MENU', payload: menu });
  const setContextMenuPosition = (position: { x: number; y: number } | null) => dispatch({ type: 'SET_CONTEXT_MENU_POSITION', payload: position });
  const setActiveRightPanel = (panel: string) => dispatch({ type: 'SET_ACTIVE_RIGHT_PANEL', payload: panel });
  const setIsAIPanelOpen = (open: boolean) => dispatch({ type: 'SET_AI_PANEL_OPEN', payload: open });

  // Toggle handlers
  const toggleSidebar = () => dispatch({ type: 'TOGGLE_SIDEBAR' });
  const toggleTerminal = () => dispatch({ type: 'TOGGLE_TERMINAL' });
  const toggleSettings = () => setShowSettings(!showSettings);
  const toggleCommandPalette = () => setShowCommandPalette(!showCommandPalette);

  // Close context menu
  const closeContextMenu = () => {
    setContextMenu(null);
    setContextMenuPosition(null);
  };

  // Handle file selection
  const handleFileSelect = (file: FileNode) => {
    setSelectedFile(file);

    // Check if file is already open in a tab
    const existingTab = editorTabs.find(tab => tab.id === file.id);

    if (!existingTab) {
      // Add new tab if not already open
      const newTab: EditorTab = {
        id: file.id,
        name: file.name,
        content: file.content || '',
        language: file.language || 'plaintext',
        isDirty: false
      };
      setEditorTabs([...editorTabs, newTab]);
    }

    // Activate the tab
    setActiveTabId(file.id);
  };

  // Handle tab close
  const closeTab = (tabId: string) => {
    const newTabs = editorTabs.filter(tab => tab.id !== tabId);
    setEditorTabs(newTabs);

    // If the closed tab was active, set a new active tab
    if (activeTabId === tabId) {
      const newActiveTab = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
      setActiveTabId(newActiveTab);

      // Update selected file
      const newSelectedFile = newActiveTab
        ? state.projectStructure.find(f => f.id === newActiveTab) || null
        : null;
      setSelectedFile(newSelectedFile);
    }
  };

  // Handle AI message sending
  const handleAISendMessage = async (message: string) => {
    const userMessage: AIMessage = { role: 'user', content: message };
    setAiMessages([...aiMessages, userMessage]);
    setIsAILoading(true);

    try {
      // TODO: Implement actual AI API call
      const response = await new Promise<AIMessage>((resolve) => {
        setTimeout(() => {
          resolve({
            role: 'assistant',
            content: `I received your message: "${message}". This is a mock response.`
          });
        }, 1000);
      });

      setAiMessages(prev => [...prev, response]);
    } catch (error) {
      console.error('Error sending message to AI:', error);
      // Add error message to chat
      setAiMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, there was an error processing your request.' }
      ]);
    } finally {
      setIsAILoading(false);
    }
  };

  // Handle snippet insertion
  const handleInsertSnippet = (snippet: string) => {
    // TODO: Implement snippet insertion logic
    console.log('Insert snippet:', snippet);
  };





  // Update editor tabs when a file is selected
  useEffect(() => {
    if (selectedFile) {
      const tabExists = editorTabs.some(tab => tab.id === selectedFile.path);

      if (!tabExists) {
        const newTab: EditorTab = {
          id: selectedFile.path,
          name: selectedFile.name,
          content: selectedFile.content || '',
          language: selectedFile.language || 'plaintext',
          isDirty: false
        };

        setEditorTabs([...editorTabs, newTab]);
        setActiveTabId(selectedFile.path);
      }
    }
  }, [selectedFile, editorTabs, setEditorTabs, setActiveTabId]);

  // AI Handlers
  const handleAISendMessage = async (message: string) => {
    if (!message.trim()) return;

    const userMessage = { role: 'user' as const, content: message };
    setAiMessages([...aiMessages, userMessage]);
    setIsAILoading(true);

    try {
      // In a real app, this would call your AI service
      // const response = await aiService.sendMessage(message, aiModel);
      // For now, we'll simulate a response
      setTimeout(() => {
        const botMessage = {
          role: 'assistant' as const,
          content: `I received your message: "${message}"`
        };
        setAiMessages([...aiMessages, userMessage, botMessage]);
        setIsAILoading(false);
      }, 1000);
    } catch (error) {
      console.error('AI Error:', error);
      setAiMessages([...aiMessages, {
        role: 'assistant' as const,
        content: 'Sorry, there was an error processing your request.'
      }]);
      setIsAILoading(false);
    }
  };

  // ... (rest of the code remains the same)

  // File context menu state
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number, y: number } | null>(null);
  const [selectedFileForContext, setSelectedFileForContext] = useState<FileNode | null>(null);

  // Panel states
  const [activeRightPanel, setActiveRightPanel] = useState('ai');

  // Snippets state
  const [snippets, setSnippets] = useState([
    {
      id: '1',
      name: 'React Component',
      content: 'const MyComponent = () => {\n  return (\n    <div>\n      {/* Your component JSX */}\n    </div>\n  );\n};',
      language: 'typescript'
    }
  ]);

  // Security scan state
  const [securityIssues, setSecurityIssues] = useState<Array<{
    severity: 'high' | 'medium' | 'low';
    message: string;
    file: string;
    line: number;
  }>>([{
    severity: 'medium',
    message: 'Potential XSS vulnerability',
    file: 'index.html',
    line: 23
  }]);

  // Package manager state
  const [installedPackages, setInstalledPackages] = useState<Array<{
    name: string;
    version: string;
    isDevDependency: boolean;
  }>>([{
    name: 'react',
    version: '^18.2.0',
    isDevDependency: false
  }, {
    name: 'typescript',
    version: '^5.0.0',
    isDevDependency: true
  }]);

  // Connection status state
  const [isConnected, setIsConnected] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connected');

  // Editor State
  const [editorTabs, setEditorTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [editorSettings, setEditorSettings] = useState<EditorSettingsType>({
    fontSize: 14,
    theme: 'vs-dark',
    wordWrap: false,
    minimap: true,
    autoSave: true,
    tabSize: 2,
    insertSpaces: true,
    lineNumbers: 'on',
  });

  // Collaboration & Deployment State
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [showDeployment, setShowDeployment] = useState(false);
  const [showMCP, setShowMCP] = useState(false);

  // Debug & Analysis State
  const [activeDebugPanel, setActiveDebugPanel] = useState<string>('problems');

  // Consolidated Editor Handlers
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    const tab = editorTabs.find(t => t.id === tabId);
    if (tab) {
      updateState({
        selectedFile: tab.file,
        editorContent: tab.content,
        activeTabId: tabId
      });
    }
  }, [editorTabs, updateState]);

  const handleTabClose = useCallback((tabId: string) => {
    closeTab(tabId);
    if (activeTabId === tabId) {
      const remainingTabs = editorTabs.filter(t => t.id !== tabId);
      const newActiveId = remainingTabs.length > 0 ? remainingTabs[0].id : null;
      setActiveTabId(newActiveId);
      updateState({ activeTabId: newActiveId });
    }
  }, [activeTabId, closeTab, editorTabs, updateState]);
  const userMessage = { role: 'user' as const, content: message };
  setAiMessages(prev => [...prev, userMessage]);
  setIsAILoading(true);

  try {
    // In a real app, this would call your AI service
    // const response = await aiService.sendMessage(message, aiModel);
    // For now, we'll simulate a response
    setTimeout(() => {
      const botMessage = {
        role: 'assistant' as const,
        content: `I received your message: "${message}"`
      };
      setAiMessages(prev => [...prev, botMessage]);
      setIsAILoading(false);
    }, 1000);
  } catch (error) {
    console.error('AI Error:', error);
    setAiMessages(prev => [...prev, {
      role: 'assistant',
      content: 'Sorry, there was an error processing your request.'
    }]);
    setIsAILoading(false);
  }
};

const handleInsertAICode = (code: string) => {
  // This would be implemented to insert code at the cursor position
  console.log('Inserting AI generated code:', code);
};

const handleGenerateDocumentation = async () => {
  if (!selectedFile?.content) return;

  const prompt = `Generate documentation for the following code:\n\n${selectedFile.content}`;
  await handleAISendMessage(prompt);
};

const handleExplainCode = async () => {
  if (!selectedFile?.content) return;

  const prompt = `Explain this code:\n\n${selectedFile.content}`;
  await handleAISendMessage(prompt);
};

const handleFixCode = async () => {
  if (!selectedFile?.content) return;

  const prompt = `Find and fix any issues in this ${selectedFile.language || ''} code:\n\n${selectedFile.content}`;
  await handleAISendMessage(prompt);
};

const handleOptimizeCode = async () => {
  if (!selectedFile?.content) return;

  const prompt = `Optimize this ${selectedFile.language || ''} code for better performance:\n\n${selectedFile.content}`;
  await handleAISendMessage(prompt);
};

const handleGenerateTests = async () => {
  if (!selectedFile?.content) return;

  const prompt = `Generate unit tests for this ${selectedFile.language || ''} code:\n\n${selectedFile.content}`;
  await handleAISendMessage(prompt);
};

// Enhanced editor options with outline and more features
const editorOptions = {
  glyphMargin: true, // Required for breakpoints
  lineNumbers: 'on',
  lineNumbersMinChars: 4,
  renderLineHighlight: 'all',
  renderWhitespace: 'selection',

  // Minimap
  minimap: {
    enabled: true,
    showSlider: 'always',
    side: 'right',
    size: 'fit'
  },

  // Layout & Scrolling
  scrollBeyondLastLine: false,
  automaticLayout: true,
  wordWrap: 'on' as const,
  wrappingIndent: 'indent',

  // Code Folding
  folding: true,
  foldingHighlight: true,
  foldingStrategy: 'auto',

  // Editor Features
  fontSize: 14,
  tabSize: 2,
  lineDecorationsWidth: 10,
  contextmenu: true,

  // Scrollbar
  scrollbar: {
    vertical: 'auto',
    horizontal: 'auto',
    useShadows: true,
    verticalHasArrows: false,
    horizontalHasArrows: false,
    verticalScrollbarSize: 12,
    horizontalScrollbarSize: 12,
    arrowSize: 14,
  },

  // Outline View Integration
  renderLineHighlightOnlyWhenFocus: false,
  overviewRulerLanes: 3,
  overviewRulerBorder: true,
};

// Fetch git status when project changes
useEffect(() => {
  const init = async () => {
    if (currentProject?.path) {
      try {
        await fetchStatus(currentProject.path);
      } catch (error) {
        console.error('Failed to fetch git status:', error);
      }
    }
  };

  init();
}, [currentProject?.path, fetchStatus]);

// Toggle sidebar
const toggleSidebar = useCallback((): void => {
  setIsSidebarCollapsed(prev => !prev);
}, []);

// Handle file selection
const handleFileSelect = useCallback((file: FileType): void => {
  setSelectedFile(file);
}, []);

// Handle terminal command execution
const handleTerminalCommand = useCallback((command: string) => {
  const output = `$ ${command}\nExecuting...\n${command} completed at ${new Date().toLocaleTimeString()}`;
  setTerminalOutput(prev => [...prev, output]);
}, []);

// Handle AI completion
const handleAIComplete = useCallback((completion: string) => {
  setAiResponse(completion);
}, []);

// Handle code snippet insertion
const handleInsertSnippet = useCallback((snippet: string) => {
  if (selectedFile) {
    setSelectedFile({
      ...selectedFile,
      content: selectedFile.content + '\n' + snippet
    });
  }
}, [selectedFile]);

// Handle editor content change
const handleEditorChange = useCallback((value: string = '') => {
  if (selectedFile) {
    setSelectedFile({
      ...selectedFile,
      content: value
    });
  }
}, [selectedFile]);

// Render the application
return (
  <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
    <WebSocketProvider>
      <ProjectProvider>
        <GitProvider>
          <DebuggerProvider>
            <MCPProvider>
              <AIProvider config={aiConfig}>
                <div className="flex flex-col h-screen bg-background text-foreground">
                  {/* Top Navigation */}
                  <Header
                    isSidebarCollapsed={isSidebarCollapsed}
                    toggleSidebar={toggleSidebar}
                    showCommandPalette={() => setShowCommandPalette(true)}
                    showSettings={() => setShowSettings(true)}
                  />

                  {/* Main Content */}


                  <TabsContent value="explorer" className="flex-1 overflow-auto p-2">
                    <Suspense fallback={<LoadingSpinner />}>
                      <EnhancedFileTree
                        onFileSelect={handleFileSelect}
                        selectedFile={selectedFile}
                        className="h-full"
                      />
                    </Suspense>
                  </TabsContent>

                  <TabsContent value="outline" className="flex-1 overflow-auto p-2">
                    <Suspense fallback={<LoadingSpinner />}>
                      <OutlineView />
                    </Suspense>
                  </TabsContent>
                </Tabs>

                <div className="mt-auto p-2 border-t">
                  <Suspense fallback={<LoadingSpinner />}>
                    <div className="space-y-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
                        className="w-full justify-start"
                        aria-label="Open AI Assistant"
                      >
                        <span className="mr-2" aria-hidden="true">🤖</span>
                        {!isSidebarCollapsed && 'AI Assistant'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowPackageManager(true)}
                        className="w-full justify-start"
                        aria-label="Open Package Manager"
                      >
                        <span className="mr-2" aria-hidden="true">📦</span>
                        {!isSidebarCollapsed && 'Packages'}
                      </Button>
                    </div>
                  </Suspense>
                </ErrorBoundary>
              </div>
            </div>

            {/* Main Content */}
            <PanelContainer className="flex-1 flex flex-col overflow-hidden">
              {/* Editor Tabs */}
              <Suspense fallback={<div className="h-10 bg-muted"></div>}>
                <FileTabs
                  files={selectedFile ? [selectedFile] : []}
                  activeFile={selectedFile}
                  onFileSelect={setSelectedFile}
                  className="border-b"
                />
              </Suspense>

              {/* Main Editor Area */}
              <PanelGroup direction="vertical" className="flex-1">
                <Panel defaultSize={80} minSize={30} className="flex flex-col">
                  <PanelGroup direction="horizontal" className="flex-1">
                    {/* Left Panel - Outline/Problems */}
                    <Panel defaultSize={20} minSize={15} className="bg-card">
                      <Tabs defaultValue="outline" className="h-full flex flex-col">
                        <TabsList className="grid grid-cols-2">
                          <TabsTrigger value="outline">Outline</TabsTrigger>
                          <TabsTrigger value="snippets">Snippets</TabsTrigger>
                        </TabsList>
                        <TabsContent value="outline" className="flex-1 overflow-auto">
                          <OutlineView />
                        </TabsContent>
                        <TabsContent value="snippets" className="flex-1 overflow-auto">
                          <SnippetLibrary onInsertSnippet={handleInsertSnippet} />
                        </TabsContent>
                      </Tabs>
                    </Panel>

                    <PanelResizeHandle className="w-2 bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors" />

                    {/* Main Editor Panel */}
                    <Panel defaultSize={60} minSize={40}>
                      <PanelGroup direction="vertical" className="h-full">
                        <Panel defaultSize={80} minSize={50} className="flex flex-col">
                          <div className="flex-1 overflow-hidden">
                            <CodeEditor
                              value={selectedFile?.content || ''}
                              language={selectedFile?.language || 'typescript'}
                              onChange={(value) => {
                                // Handle change
                              }}
                              path={selectedFile?.path}
                            />
                          </div>
                        </Panel>
                      </PanelGroup>
                    </Panel>
                  </PanelGroup>
                </Panel>
              </PanelGroup>
            </PanelContainer>
          </div>
          <WorkspaceConfig
            isOpen={showWorkspaceConfig}
            onClose={() => setShowWorkspaceConfig(false)}
            config={workspaceConfig}
            onSave={(config) => {
              setWorkspaceConfig(config);
              setShowWorkspaceConfig(false);
            }}
          />

          <ShortcutsPanel
            isOpen={showShortcuts}
            onClose={() => setShowShortcuts(false)}
          />

          <SnippetLibrary
            isOpen={showSnippets}
            onClose={() => setShowSnippets(false)}
            onInsertSnippet={(snippet) => {
              // Handle snippet insertion
            }}
          />

          <FileContextMenu
            position={contextMenu}
            onClose={closeContextMenu}
            onNewFile={() => { }}
            onNewFolder={() => { }}
            onRename={() => { }}
            onDelete={() => { }}
            showGitActions={false}
          />

          <Toaster />
        </AIProvider >
      </MCPProvider >
    </DebuggerProvider >
  </WebSocketProvider >
</GitProvider >
</ProjectProvider >
</AuthProvider >
</QueryClientProvider >
</ThemeProvider >
);
};

export default App;
