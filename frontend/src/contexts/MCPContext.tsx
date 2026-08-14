import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";

// In development, we'll use mock data
const isDevelopment = import.meta.env.DEV;
import { useSnackbar } from "notistack";
import useWebSocket, { WebSocketMessage } from "../hooks/useWebSocket";
import {
  CodeIssue,
  ScanRequest,
  FixRequest,
  ExplainRequest,
  ScanResult,
  MCPState,
  FileChangeEvent,
  RealTimeScanConfig,
  CodeFix,
  FileSystemItem,
} from "../types/mcp";

// Constants
const RECONNECT_DELAY = 1000; // Initial delay in ms
const MAX_RECONNECT_ATTEMPTS = 5;
const STATE_STORAGE_KEY = "mcp_state";

// Error Boundary Component
class MCPErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("MCP Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "1rem", color: "#ff6b6b" }}>
          <h3>Something went wrong with the MCP service.</h3>
          <p>Please refresh the page or try again later.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

interface MCPContextType extends MCPState {
  // Existing methods
  scanProject: (request?: Partial<ScanRequest>) => Promise<ScanResult | null>;
  fixIssues: (request: Partial<FixRequest>) => Promise<void>;
  explainIssue: (request: ExplainRequest) => Promise<string>;
  updateConfig: (config: Partial<RealTimeScanConfig>) => Promise<void>;
  refreshIssues: () => void;
  selectFile: (filePath: string) => void;

  // New methods for batch operations
  batchFixIssues: (issueIds: string[]) => Promise<void>;
  batchDismissIssues: (issueIds: string[]) => void;
  batchApplyFixes: (
    fixes: Array<{ issueId: string; fix: CodeFix }>,
  ) => Promise<void>;

  // State management
  resetState: () => void;
  loadState: () => Promise<void>;
  saveState: () => Promise<void>;
}

const MCPContext = createContext<MCPContextType | undefined>(undefined);

// Helper function for exponential backoff
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Default state with type safety
const defaultState: MCPState = {
  isConnected: false,
  isScanning: false,
  lastScanTime: null,
  issues: [],
  activeFile: null,
  config: {
    realTimeScan: {
      enabled: true,
      debounceMs: 1000,
      includePatterns: ["*.py", "*.js", "*.ts", "*.jsx", "*.tsx"],
      excludePatterns: [
        "**/node_modules/**",
        "**/__pycache__/**",
        "**/.git/**",
      ],
      maxFileSizeMb: 5,
    },
  },
};

// Mock MCP state for development
const mockMCPState: MCPState = {
  isConnected: false,
  isScanning: false,
  lastScanTime: null,
  issues: [],
  selectedFile: null,
  fileTree: [],
  config: {
    autoFix: false,
    excludePatterns: ["**/node_modules/**", "**/.git/**"],
    includePatterns: ["**/*.{js,jsx,ts,tsx}"],
  },
  isInitialized: true,
};

export const MCPProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // In development, return a mock provider
  if (isDevelopment) {
    const mockContext: MCPContextType = {
      ...mockMCPState,
      scanProject: async () => ({
        issues: [],
        summary: {
          totalIssues: 0,
          bySeverity: {},
          byType: {},
        },
        timestamp: new Date().toISOString(),
      }),
      fixIssues: async () => {},
      explainIssue: async () =>
        "Mock explanation: This is a development build with WebSockets disabled.",
      updateConfig: async () => {},
      refreshIssues: () => {},
      selectFile: () => {},
      batchFixIssues: async () => {},
      batchDismissIssues: () => {},
      batchApplyFixes: async () => {},
      resetState: () => {},
      loadState: async () => {},
      saveState: async () => {},
      isInitialized: true,
    };

    return (
      <MCPErrorBoundary>
        <MCPContext.Provider value={mockContext}>
          {children}
        </MCPContext.Provider>
      </MCPErrorBoundary>
    );
  }
  const [state, setState] = useState<MCPState>(() => {
    // Load state from localStorage on initial render
    try {
      const savedState = localStorage.getItem(STATE_STORAGE_KEY);
      return savedState
        ? { ...defaultState, ...JSON.parse(savedState) }
        : defaultState;
    } catch (error) {
      console.error("Failed to load state from localStorage:", error);
      return defaultState;
    }
  });

  const { enqueueSnackbar } = useSnackbar();
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<NodeJS.Timeout>();
  const messageQueue = useRef<WebSocketMessage[]>([]);

  const {
    send: wsSend,
    subscribe,
    isConnected,
    reconnect,
  } = useWebSocket("/ws/mcp");

  // Wrapper for send with reconnection logic
  const sendWithReconnect = useCallback(
    async (message: WebSocketMessage) => {
      if (isConnected) {
        wsSend(message);
      } else {
        messageQueue.current.push(message);
        await attemptReconnect();
      }
    },
    [isConnected, wsSend],
  );

  // Reconnection logic with exponential backoff
  const attemptReconnect = useCallback(async (): Promise<boolean> => {
    if (isConnected) return true;

    if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
      enqueueSnackbar("Failed to reconnect to MCP service", {
        variant: "error",
      });
      return false;
    }

    const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts.current);
    reconnectAttempts.current++;

    await sleep(delay);

    try {
      await reconnect();
      reconnectAttempts.current = 0;
      return true;
    } catch (error) {
      console.warn(
        `Reconnect attempt ${reconnectAttempts.current} failed:`,
        error,
      );
      return attemptReconnect();
    }
  }, [isConnected, reconnect, enqueueSnackbar]);

  // Process message queue when connection is restored
  useEffect(() => {
    if (isConnected && messageQueue.current.length > 0) {
      messageQueue.current.forEach((msg) => wsSend(msg));
      messageQueue.current = [];
    }
  }, [isConnected, wsSend]);

  // Update connection status with reconnection handling
  useEffect(() => {
    const updateConnectionStatus = async () => {
      setState((prev) => ({
        ...prev,
        isConnected,
      }));

      if (isConnected) {
        enqueueSnackbar("Connected to MCP service", { variant: "success" });
        // Resubscribe to any topics or restore state as needed
      } else {
        enqueueSnackbar(
          "Disconnected from MCP service. Attempting to reconnect...",
          {
            variant: "warning",
            autoHideDuration: 3000,
          },
        );
        await attemptReconnect();
      }
    };

    updateConnectionStatus();

    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
    };
  }, [isConnected, attemptReconnect, enqueueSnackbar]);

  // Auto-save state when it changes
  useEffect(() => {
    const saveState = async () => {
      try {
        localStorage.setItem(
          STATE_STORAGE_KEY,
          JSON.stringify({
            // Only persist non-sensitive, non-volatile state
            issues: state.issues,
            config: state.config,
            // Don't persist connection state or active file
          }),
        );
      } catch (error) {
        console.error("Failed to save state to localStorage:", error);
      }
    };

    const timer = setTimeout(saveState, 500); // Debounce
    return () => clearTimeout(timer);
  }, [state.issues, state.config]);

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribeScanResults = subscribe("scan_result", (data: unknown) => {
      const result = data as ScanResult;
      setState((prev) => ({
        ...prev,
        issues: result.issues,
        lastScanTime: Date.now(),
        isScanning: false,
      }));
      enqueueSnackbar(`Found ${result.issues.length} issues`, {
        variant: "info",
      });
    });

    const unsubscribeFileChanges = subscribe("file_change", (data: unknown) => {
      const event = data as FileChangeEvent;
      console.log("File changed:", event);
      // Handle file change events as needed
    });

    return () => {
      unsubscribeScanResults();
      unsubscribeFileChanges();
    };
  }, [isConnected, subscribe, enqueueSnackbar]);

  const scanProject = useCallback(
    async (request: Partial<ScanRequest> = {}) => {
      try {
        setState((prev) => ({ ...prev, isScanning: true }));

        const defaultRequest: ScanRequest = {
          projectPath: "/", // This should come from workspace context
          scanType: "full",
          ...request,
        };

        const response = await fetch("/api/mcp/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(defaultRequest),
        });

        if (!response.ok) {
          throw new Error(`Scan failed: ${response.statusText}`);
        }

        const result: ScanResult = await response.json();

        setState((prev) => ({
          ...prev,
          issues: result.issues,
          lastScanTime: Date.now(),
          isScanning: false,
        }));

        return result;
      } catch (error) {
        console.error("Scan error:", error);
        enqueueSnackbar(`Scan failed: ${error.message}`, { variant: "error" });
        setState((prev) => ({ ...prev, isScanning: false }));
        return null;
      }
    },
    [enqueueSnackbar],
  );

  const fixIssues = useCallback(
    async (request: Partial<FixRequest>) => {
      try {
        const defaultRequest: FixRequest = {
          projectPath: "/", // This should come from workspace context
          autoApply: false,
          dryRun: true,
          ...request,
        };

        const response = await fetch("/api/mcp/fix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(defaultRequest),
        });

        if (!response.ok) {
          throw new Error(`Fix operation failed: ${response.statusText}`);
        }

        const result = await response.json();
        enqueueSnackbar(`Fixed ${result.fixedIssues} issues`, {
          variant: "success",
        });

        // Refresh issues after fixing
        if (result.fixedIssues > 0) {
          await scanProject();
        }
      } catch (error) {
        console.error("Fix error:", error);
        enqueueSnackbar(`Fix failed: ${error.message}`, { variant: "error" });
      }
    },
    [scanProject, enqueueSnackbar],
  );

  const explainIssue = useCallback(
    async (request: ExplainRequest) => {
      try {
        const response = await fetch("/api/mcp/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error(`Explanation failed: ${response.statusText}`);
        }

        const result = await response.json();
        return result.explanation;
      } catch (error) {
        console.error("Explain error:", error);
        enqueueSnackbar(`Failed to get explanation: ${error.message}`, {
          variant: "error",
        });
        return "Could not generate explanation.";
      }
    },
    [enqueueSnackbar],
  );

  const updateConfig = useCallback(
    async (config: Partial<RealTimeScanConfig>) => {
      try {
        setState((prev) => ({
          ...prev,
          config: {
            ...prev.config,
            realTimeScan: {
              ...prev.config.realTimeScan,
              ...config,
            },
          },
        }));

        // Update server-side config if needed
        await fetch("/api/mcp/realtime/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });
      } catch (error) {
        console.error("Config update error:", error);
        enqueueSnackbar(`Failed to update config: ${error.message}`, {
          variant: "error",
        });
      }
    },
    [enqueueSnackbar],
  );

  const refreshIssues = useCallback(() => {
    return scanProject({ scanType: "incremental" });
  }, [scanProject]);

  const selectFile = useCallback((filePath: string) => {
    setState((prev) => ({
      ...prev,
      activeFile: filePath,
    }));
  }, []);

  // Batch operation: Apply multiple fixes at once
  const batchApplyFixes = useCallback(
    async (fixes: Array<{ issueId: string; fix: any }>) => {
      try {
        const response = await fetch("/api/mcp/batch-fix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fixes }),
        });

        if (!response.ok) {
          throw new Error(`Batch fix failed: ${response.statusText}`);
        }

        const result = await response.json();
        enqueueSnackbar(`Applied ${result.appliedFixes} fixes`, {
          variant: "success",
        });

        // Refresh issues after batch fix
        if (result.appliedFixes > 0) {
          await scanProject({ scanType: "incremental" });
        }

        return result;
      } catch (error) {
        console.error("Batch fix error:", error);
        enqueueSnackbar(`Failed to apply batch fixes: ${error.message}`, {
          variant: "error",
        });
        throw error;
      }
    },
    [enqueueSnackbar, scanProject],
  );

  // Batch operation: Fix multiple issues
  const batchFixIssues = useCallback(
    async (issueIds: string[]) => {
      const issuesToFix = state.issues.filter((issue) =>
        issueIds.includes(issue.id),
      );
      const fixes = issuesToFix.map((issue) => ({
        issueId: issue.id,
        fix: issue.suggestedFixes?.[0], // Use first suggested fix by default
      }));

      return batchApplyFixes(
        fixes.filter((f) => f.fix) as Array<{ issueId: string; fix: any }>,
      );
    },
    [batchApplyFixes, state.issues],
  );

  // Batch operation: Dismiss multiple issues
  const batchDismissIssues = useCallback((issueIds: string[]) => {
    setState((prev) => ({
      ...prev,
      issues: prev.issues.filter((issue) => !issueIds.includes(issue.id)),
    }));
  }, []);

  // State management
  const resetState = useCallback(() => {
    if (
      window.confirm(
        "Are you sure you want to reset all MCP state? This cannot be undone.",
      )
    ) {
      setState(defaultState);
      localStorage.removeItem(STATE_STORAGE_KEY);
      enqueueSnackbar("MCP state has been reset", { variant: "info" });
    }
  }, [enqueueSnackbar]);

  const loadState = useCallback(async () => {
    try {
      const savedState = localStorage.getItem(STATE_STORAGE_KEY);
      if (savedState) {
        setState(JSON.parse(savedState));
        enqueueSnackbar("State loaded successfully", { variant: "success" });
      }
    } catch (error) {
      console.error("Failed to load state:", error);
      enqueueSnackbar("Failed to load state", { variant: "error" });
    }
  }, [enqueueSnackbar]);

  const saveState = useCallback(async () => {
    try {
      localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state));
      enqueueSnackbar("State saved successfully", { variant: "success" });
    } catch (error) {
      console.error("Failed to save state:", error);
      enqueueSnackbar("Failed to save state", { variant: "error" });
    }
  }, [state, enqueueSnackbar]);

  const value = {
    ...state,
    scanProject,
    fixIssues,
    explainIssue,
    updateConfig,
    refreshIssues,
    selectFile,
    batchFixIssues,
    batchDismissIssues,
    batchApplyFixes,
    resetState,
    loadState,
    saveState,
  };

  return (
    <MCPErrorBoundary>
      <MCPContext.Provider value={value}>{children}</MCPContext.Provider>
    </MCPErrorBoundary>
  );
};

export const useMCP = (): MCPContextType => {
  const context = useContext(MCPContext);
  if (context === undefined) {
    throw new Error("useMCP must be used within an MCPProvider");
  }
  return context;
};
