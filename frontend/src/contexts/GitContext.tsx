import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

// Check if WebSockets should be disabled in development
const isDevelopment = import.meta.env.DEV;
const shouldDisableWebSockets = isDevelopment && 
  !(import.meta.env.VITE_ENABLE_WEBSOCKETS === 'true');
// Using a simple in-memory store for now
// Replace with actual Tauri API calls when available
const mockGitApi = {
  status: async () => ({
    branch: "main",
    ahead: 0,
    behind: 0,
    changes: {
      staged: [],
      unstaged: [],
      untracked: [],
    },
  }),
  stage: async (_files: string[]) => {
    // Mock implementation
    return Promise.resolve();
  },
  unstage: async (_files: string[]) => {
    // Mock implementation
    return Promise.resolve();
  },
  commit: async (_message: string) => {
    // Mock implementation
    return Promise.resolve(true);
  },
  pull: async () => {
    // Mock implementation
    return Promise.resolve();
  },
  push: async () => {
    // Mock implementation
    return Promise.resolve();
  },
  listBranches: async () => {
    // Mock implementation
    return Promise.resolve(["main", "develop"]);
  },
  createBranch: async (_name: string) => {
    // Mock implementation
    return Promise.resolve(true);
  },
  checkoutBranch: async (_name: string) => {
    // Mock implementation
    return Promise.resolve(true);
  },
};

// Simple toast notification function
const showToast = (
  message: string,
  type: "log" | "error" | "info" | "success" = "info",
) => {
  if (type === "log" || type === "success") {
    console.log(message);
  } else {
    console[type](message);
  }
};

export interface GitStatus {
  branch: string | null;
  ahead: number;
  behind: number;
  changes: {
    staged: string[];
    unstaged: string[];
    untracked: string[];
  };
  lastUpdated?: Date;
  isInitialized: boolean;
}

interface GitContextType {
  status: GitStatus;
  isLoading: boolean;
  error: string | null;
  refreshStatus: (showNotification?: boolean) => Promise<void>;
  stageFiles: (filePaths: string[]) => Promise<void>;
  unstageFiles: (filePaths: string[]) => Promise<void>;
  commit: (message: string) => Promise<boolean>;
  pull: () => Promise<boolean>;
  push: () => Promise<boolean>;
  createBranch: (name: string) => Promise<boolean>;
  checkoutBranch: (name: string) => Promise<boolean>;
  fetchBranches: () => Promise<string[]>;
  currentBranch: string | null;
  branches: string[];
  lastUpdated?: Date;
  isInitialized: boolean;
}

const GitContext = createContext<GitContextType | undefined>(undefined);

const initialState: GitStatus = {
  branch: null,
  ahead: 0,
  behind: 0,
  changes: {
    staged: [],
    unstaged: [],
    untracked: [],
  },
  isInitialized: false,
};

// Mock Git status for development
const mockGitStatus: GitStatus = {
  branch: 'main',
  ahead: 0,
  behind: 0,
  changes: {
    staged: [],
    unstaged: [],
    untracked: [],
  },
  isInitialized: true,
};

export const GitProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // In development, return a mock provider
  if (isDevelopment) {
    const mockContext: GitContextType = useMemo(() => ({
      status: {
        ...initialState,
        isInitialized: true,
      },
      isLoading: false,
      error: null,
      refreshStatus: async () => {},
      stageFiles: async () => {},
      unstageFiles: async () => {},
      commit: async () => true,
      pull: async () => true,
      push: async () => true,
      createBranch: async () => true,
      checkoutBranch: async () => true,
      fetchBranches: async () => ["main", "develop"],
      currentBranch: "main",
      branches: ["main", "develop"],
      isInitialized: true,
    }), []);

    return (
      <GitContext.Provider value={mockContext}>
        {children}
      </GitContext.Provider>
    );
  }
  const [status, setStatus] = useState<GitStatus>(initialState);
  const [branches, setBranches] = useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchStatus = useCallback(async (showNotification = false) => {
    try {
      setError(null);
      setIsLoading(true);

      // Replace with actual Tauri API call
      // const result = await invoke<GitStatus>('git_status');
      const result = await mockGitApi.status();

      const newStatus: GitStatus = {
        ...result,
        isInitialized: true,
        lastUpdated: new Date(),
      };

      setStatus(newStatus);
      setCurrentBranch(result.branch || null);
      setLastUpdated(new Date());

      if (showNotification) {
        showToast(
          `Repository status updated. Branch: ${result.branch || "main"}`,
          "info",
        );
      }

      return newStatus;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch git status";
      console.error("Failed to fetch git status:", err);
      setError(errorMessage);

      showToast(`Failed to fetch repository status: ${errorMessage}`, "error");

      return null;
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, []);

  const fetchBranches = useCallback(async (): Promise<string[]> => {
    try {
      setIsLoading(true);

      // Replace with actual Tauri API call
      // const result = await invoke<string[]>('git_list_branches');
      const result = await mockGitApi.listBranches();

      setBranches(result);
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch branches";
      console.error("Failed to fetch branches:", err);
      setError(errorMessage);
      showToast(`Failed to fetch branches: ${errorMessage}`, "error");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetchStatus();
      await fetchBranches();
    } finally {
      setIsLoading(false);
    }
  }, [fetchStatus, fetchBranches]);

  const stageFiles = useCallback(
    async (filePaths: string[]) => {
      try {
        setIsLoading(true);

        // Replace with actual Tauri API call
        // await invoke('git_stage', { filePaths });
        await mockGitApi.stage(filePaths);

        await refreshStatus();
        showToast(`${filePaths.length} file(s) staged successfully`, "success");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to stage files";
        console.error("Failed to stage files:", err);
        showToast(`Failed to stage files: ${errorMessage}`, "error");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshStatus],
  );

  const unstageFiles = useCallback(
    async (filePaths: string[]) => {
      try {
        setIsLoading(true);
        // Replace with actual Tauri API call
        // await invoke('git_unstage', { filePaths });
        await mockGitApi.unstage(filePaths);
        await refreshStatus();
        showToast(`${filePaths.length} file(s) unstaged successfully`, "log");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to unstage files";
        console.error("Failed to unstage files:", err);
        showToast(`Failed to unstage files: ${errorMessage}`, "error");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshStatus],
  );

  const commit = useCallback(
    async (message: string): Promise<boolean> => {
      try {
        setIsLoading(true);

        // Replace with actual Tauri API call
        // const success = await invoke<boolean>('git_commit', { message });
        const success = await mockGitApi.commit(message);

        if (success) {
          await refreshStatus();
          showToast("Commit created successfully", "success");
        }

        return success;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create commit";
        console.error("Failed to commit:", err);
        showToast(`Failed to create commit: ${errorMessage}`, "error");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshStatus],
  );

  const pull = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);

      // Replace with actual Tauri API call
      // await invoke('git_pull');
      await mockGitApi.pull();

      await refreshStatus();
      showToast("Pulled latest changes", "log");
      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to pull changes";
      console.error("Failed to pull:", err);
      showToast(`Failed to pull changes: ${errorMessage}`, "error");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  const push = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);

      // Replace with actual Tauri API call
      // await invoke('git_push');
      await mockGitApi.push();

      await refreshStatus();
      showToast("Pushed changes to remote", "log");
      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to push changes";
      console.error("Failed to push:", err);
      showToast(`Failed to push changes: ${errorMessage}`, "error");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  const createBranch = useCallback(
    async (name: string): Promise<boolean> => {
      try {
        setIsLoading(true);

        // Replace with actual Tauri API call
        // const success = await invoke<boolean>('git_create_branch', { name });
        const success = await mockGitApi.createBranch(name);

        if (success) {
          await fetchBranches();
          await refreshStatus();
          showToast(`Created branch: ${name}`, "log");
        }

        return success;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create branch";
        console.error("Failed to create branch:", err);
        showToast(`Failed to create branch: ${errorMessage}`, "error");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchBranches, refreshStatus],
  );

  const checkoutBranch = useCallback(
    async (name: string): Promise<boolean> => {
      try {
        if (currentBranch === name) return true;

        setIsLoading(true);

        // Replace with actual Tauri API call
        // const success = await invoke<boolean>('git_checkout_branch', { name });
        const success = await mockGitApi.checkoutBranch(name);

        if (success) {
          await refreshStatus();
          showToast(`Switched to branch: ${name}`, "log");
        }

        return success;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to checkout branch";
        console.error("Failed to checkout branch:", err);
        showToast(`Failed to checkout branch: ${errorMessage}`, "error");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [currentBranch, refreshStatus],
  );

  // Initial load and periodic refresh
  useEffect(() => {
    if (!isInitialized) {
      refreshStatus();
    }

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      refreshStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshStatus, isInitialized]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    try {
      const ws = new WebSocket("ws://localhost:3000/ws/git");

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "git_change") {
            refreshStatus();

            if (data.message) {
              showToast(`Repository updated: ${data.message}`, "log");
            }
          }
        } catch (err) {
          console.error("Error processing WebSocket message:", err);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      return () => {
        ws.close();
      };
    } catch (err) {
      console.error("Failed to initialize WebSocket:", err);
    }
  }, [refreshStatus]);

  const contextValue: GitContextType = React.useMemo(
    () => ({
      status: {
        ...status,
        lastUpdated,
        isInitialized,
      },
      isLoading,
      error,
      refreshStatus,
      stageFiles,
      unstageFiles,
      commit,
      pull,
      push,
      createBranch,
      checkoutBranch,
      fetchBranches,
      currentBranch,
      branches,
      lastUpdated: status.lastUpdated,
      isInitialized: status.isInitialized,
    }),
    [
      status,
      isLoading,
      error,
      refreshStatus,
      stageFiles,
      unstageFiles,
      commit,
      pull,
      push,
      createBranch,
      checkoutBranch,
      fetchBranches,
      currentBranch,
      branches,
    ],
  );

  return (
    <GitContext.Provider value={contextValue}>{children}</GitContext.Provider>
  );
};

export const useGit = (): GitContextType => {
  const context = useContext(GitContext);
  if (!context) {
    throw new Error("useGit must be used within a GitProvider");
  }
  return context;
};

export default GitContext;
