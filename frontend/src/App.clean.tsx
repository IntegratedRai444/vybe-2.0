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
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// State management
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// UI Components
import { Toaster } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Bot, 
  FileCode, 
  FolderOpen, 
  GitBranch, 
  GitCommit, 
  GitMerge, 
  GitPullRequest, 
  Package, 
  Settings as SettingsIcon,
  Puzzle
} from 'lucide-react';

// Context hooks
import { useAuth } from '@/contexts/AuthContext';

// Context providers
import { ProjectProvider } from '@/contexts/ProjectContext';
import { GitProvider } from '@/contexts/GitContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { DebuggerProvider } from '@/contexts/DebuggerContext';
import { MCPProvider } from '@/contexts/MCPContext';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

// Custom hooks
import { useTabs } from '@/hooks/useTabs';

// Types
type PanelType = 'file-explorer' | 'search' | 'git' | 'debug' | 'extensions';
type AIMessage = { role: 'user' | 'assistant'; content: string };
type Project = { id: string; name: string; path: string };
type GitStatus = { branch: string; isDirty: boolean; staged: string[]; unstaged: string[]; untracked: string[] };
type EditorSettingsType = { 
  fontSize: number; 
  tabSize: number; 
  wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded'; 
  minimap: { enabled: boolean }; 
  lineNumbers: 'on' | 'off' | 'relative' | 'interval' | ((lineNumber: number) => string) 
};
type TerminalMessage = { type: 'stdout' | 'stderr'; content: string; timestamp: number };

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  path: string;
  content?: string;
  language?: string;
  children?: FileNode[];
}

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
  contextMenu: { x: number; y: number; filePath?: string } | null;
  contextMenuPosition: { x: number; y: number } | null;
  activeRightPanel: string;
  notifications: Array<{ id: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }>;
  showDebugPanel: boolean;
  activeDebugPanel: string;
  showCollaboration: boolean;
  showDeployment: boolean;
  showMCP: boolean;
  
  // Editor State
  editorTabs: Array<{
    id: string;
    name: string;
    content: string;
    language: string;
    isDirty?: boolean;
    file?: FileNode;
  }>;
  activeTabId: string | null;
  selectedFile: FileNode | null;
  editorContent: string;
  isEditorDirty: boolean;
  editorSettings: EditorSettingsType;
  
  // AI State
  selectedModel: string;
  aiMessages: AIMessage[];
  isAILoading: boolean;
  showCompletionBubble: boolean;
  aiProvider: string;
  availableModels: Array<{ id: string; name: string }>;
  selectedAITab: string;
  aiDashboardMetrics: {
    tokensUsed: number;
    apiCalls: number;
    avgResponseTime: number;
    lastUpdated: string;
  };
  
  // Project State
  project: Project | null;
  projectStructure: FileNode[];
  
  // Git State
  gitStatus: GitStatus;
  branch: string;
  
  // Snippets
  snippets: Array<{
    id: string;
    name: string;
    content: string;
    language: string;
  }>;
  
  // Linting & Security
  lintIssues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    file: string;
    line: number;
    column: number;
  }>;
  
  securityIssues: Array<{
    severity: 'high' | 'medium' | 'low';
    message: string;
    file: string;
    line: number;
  }>;
  
  // Dependencies
  installedPackages: Array<{
    name: string;
    version: string;
    isDevDependency: boolean;
  }>;
  
  // Connection
  isConnected: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  
  // Workspace
  workspaceConfig: {
    name: string;
    settings: {
      autoSave: boolean;
      formatOnSave: boolean;
      tabSize: number;
      insertSpaces: boolean;
      theme: string;
    };
    extensions: any[];
  };
  
  // Other
  hasUncommittedChanges: boolean;
}

// Constants
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
  contextMenu: null,
  contextMenuPosition: null,
  activeRightPanel: 'explorer',
  notifications: [],
  showDebugPanel: false,
  activeDebugPanel: 'problems',
  showCollaboration: false,
  showDeployment: false,
  showMCP: false,
  
  // Editor State
  editorTabs: [],
  activeTabId: null,
  selectedFile: null,
  editorContent: '',
  isEditorDirty: false,
  editorSettings: {
    fontSize: 14,
    tabSize: 2,
    wordWrap: 'on',
    minimap: { enabled: true },
    lineNumbers: 'on'
  },
  
  // AI State
  selectedModel: 'gpt-4',
  aiMessages: [{
    role: 'assistant',
    content: 'Hello! How can I assist you with your code today?'
  }],
  isAILoading: false,
  showCompletionBubble: true,
  aiProvider: 'openai',
  availableModels: [
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { id: 'claude-2', name: 'Claude 2' },
  ],
  selectedAITab: 'chat',
  aiDashboardMetrics: {
    tokensUsed: 0,
    apiCalls: 0,
    avgResponseTime: 0,
    lastUpdated: new Date().toISOString(),
  },
  
  // Project State
  project: null,
  projectStructure: [],
  
  // Git State
  gitStatus: {
    branch: 'main',
    isDirty: false,
    staged: [],
    unstaged: [],
    untracked: []
  },
  branch: 'main',
  
  // Snippets
  snippets: [{
    id: '1',
    name: 'React Component',
    content: 'const MyComponent = () => {\n  return <div>Hello World</div>;\n};',
    language: 'typescript'
  }],
  
  // Linting & Security
  lintIssues: [],
  securityIssues: [],
  
  // Dependencies
  installedPackages: [{
    name: 'react',
    version: '^18.2.0',
    isDevDependency: false
  }],
  
  // Connection
  isConnected: false,
  connectionStatus: 'disconnected',
  
  // Workspace
  workspaceConfig: {
    name: 'My Workspace',
    settings: {
      autoSave: true,
      formatOnSave: true,
      tabSize: 2,
      insertSpaces: true,
      theme: 'vs-dark'
    },
    extensions: []
  },
  
  // Other
  hasUncommittedChanges: false,
};

// Reducer for state management
function appReducer(state: AppState, action: { type: string; payload?: any }): AppState {
  switch (action.type) {
    case 'TOGGLE_SIDEBAR':
      return { ...state, isSidebarCollapsed: !state.isSidebarCollapsed };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeEditorTab: action.payload };
    case 'TOGGLE_TERMINAL':
      return { ...state, isTerminalOpen: !state.isTerminalOpen };
    case 'SET_EDITOR_TABS':
      return { ...state, editorTabs: action.payload };
    case 'SET_ACTIVE_TAB_ID':
      return { ...state, activeTabId: action.payload };
    case 'SET_SELECTED_FILE':
      return { ...state, selectedFile: action.payload };
    case 'SET_EDITOR_CONTENT':
      return { ...state, editorContent: action.payload, isEditorDirty: true };
    case 'SET_AI_MESSAGES':
      return { ...state, aiMessages: action.payload };
    case 'SET_AI_LOADING':
      return { ...state, isAILoading: action.payload };
    case 'SET_PROJECT':
      return { ...state, project: action.payload };
    case 'SET_PROJECT_STRUCTURE':
      return { ...state, projectStructure: action.payload };
    default:
      return state;
  }
}

// Custom hook for state management
function useAppState(initialState: AppState) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  const updateState = useCallback((updates: Partial<AppState>) => {
    Object.entries(updates).forEach(([key, value]) => {
      dispatch({ type: `SET_${key.toUpperCase()}`, payload: value });
    });
  }, []);
  
  return [state, updateState, dispatch] as const;
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
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ 
      error,
      errorInfo,
      componentStack: errorInfo.componentStack || ''
    });
    // You can also log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
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
      return this.props.fallback || (
        <div className="p-4">
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-red-500 mb-4">{this.state.error?.toString()}</p>
          <details className="mb-4">
            <summary>Error details</summary>
            <pre className="bg-gray-100 p-2 rounded overflow-auto text-xs">
              {this.state.componentStack}
            </pre>
          </details>
          <button 
            onClick={this.handleReset}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try again
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Initialize React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Lazy load context providers with proper typing
const AuthProvider = lazy(() => import('@/contexts/AuthContext').then(module => ({ default: module.AuthProvider })));
const ProjectProvider = lazy(() => import('@/contexts/ProjectContext').then(module => ({ default: module.ProjectProvider })));
const GitProvider = lazy(() => import('@/contexts/GitContext').then(module => ({ default: module.GitProvider })));
const WebSocketProvider = lazy(() => import('@/contexts/WebSocketContext').then(module => ({ default: module.WebSocketProvider })));
const DebuggerProvider = lazy(() => import('@/contexts/DebuggerContext').then(module => ({ default: module.DebuggerProvider })));
const MCPProvider = lazy(() => import('@/contexts/MCPContext').then(module => ({ default: module.MCPProvider })));

// Lazy load main app routes
const AppRoutes = lazy(() => import('@/AppRoutes').then(module => ({ default: module.default })));

// Loading component for Suspense fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
  </div>
);

// Main App component
const App: FC = () => {
  const [state, updateState] = useAppState(INITIAL_STATE);
  const { isSidebarCollapsed, isTerminalOpen } = state;
  
  // Use the useTabs hook for tab management
  const {
    tabs: editorTabs,
    activeTabId,
    activeTab,
    addTab,
    closeTab,
    updateTabContent,
    setTabActive
  } = useTabs();
  
  // Memoized state updates
  const updateAppState = useCallback((updates: Partial<AppState>) => {
    updateState(updates);
  }, [updateState]);
  
  // Handle file selection
  const handleFileSelect = useCallback((file: FileNode) => {
    updateAppState({ selectedFile: file });
    
    // Add or activate tab for the selected file
    addTab({
      id: file.path,
      name: file.name,
      content: file.content || '',
      language: file.language || 'plaintext',
      file
    });
  }, [addTab, updateAppState]);
  
  // Handle tab changes
  const handleTabChange = useCallback((tabId: string) => {
    setTabActive(tabId);
    const tab = editorTabs.find(t => t.id === tabId);
    if (tab) {
      updateAppState({
        selectedFile: tab.file || null,
        editorContent: tab.content,
        activeTabId: tabId
      });
    }
  }, [editorTabs, setTabActive, updateAppState]);
  
  // Handle tab close
  const handleTabClose = useCallback((tabId: string) => {
    closeTab(tabId);
    if (activeTabId === tabId) {
      const remainingTabs = editorTabs.filter(t => t.id !== tabId);
      const newActiveId = remainingTabs.length > 0 ? remainingTabs[0].id : null;
      setTabActive(newActiveId);
      updateAppState({ activeTabId: newActiveId });
    }
  }, [activeTabId, closeTab, editorTabs, setTabActive, updateAppState]);
  
  // Handle editor content changes
  const handleEditorContentChange = useCallback((value: string, tabId: string) => {
    updateTabContent(tabId, value);
    updateAppState({
      editorContent: value,
      isEditorDirty: true
    });
  }, [updateAppState, updateTabContent]);
  
  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    updateAppState({ isSidebarCollapsed: !isSidebarCollapsed });
  }, [isSidebarCollapsed, updateAppState]);
  
  // Toggle terminal
  const toggleTerminal = useCallback(() => {
    updateAppState({ isTerminalOpen: !isTerminalOpen });
  }, [isTerminalOpen, updateAppState]);
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Suspense fallback={<LoadingFallback />}>
            <Router>
              <div className="min-h-screen bg-background text-foreground">
                <TooltipProvider>
                  <WebSocketProvider>
                    <ProjectProvider>
                      <GitProvider>
                        <DebuggerProvider>
                          <MCPProvider>
                            <AppRoutes />
                            <Toaster position="top-right" richColors />
                            {process.env.NODE_ENV === 'development' && (
                              <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
                            )}
                          </MCPProvider>
                        </DebuggerProvider>
                      </GitProvider>
                    </ProjectProvider>
                  </WebSocketProvider>
                </TooltipProvider>
              </div>
            </Router>
          </Suspense>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
