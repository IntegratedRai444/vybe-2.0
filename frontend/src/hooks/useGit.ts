import { useState, useCallback, useEffect } from "react";

interface GitStatus {
  branch: string | null;
  ahead: number;
  behind: number;
  hasChanges: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  conflicts: string[];
}

interface GitCommit {
  hash: string;
  author: string;
  date: Date;
  message: string;
}

interface GitRemote {
  name: string;
  url: string;
}

const useGit = (repoPath: string) => {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [history, setHistory] = useState<GitCommit[]>([]);
  const [remotes, setRemotes] = useState<GitRemote[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const executeGitCommand = useCallback(
    async <T = any>(command: string, args: string[] = []): Promise<T> => {
      setIsLoading(true);
      setError(null);

      try {
        const response: Response = await fetch("/api/git/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoPath, command, args }),
        });

        if (!response.ok) {
          throw new Error(`Git command failed: ${await response.text()}`);
        }

        return await response.json();
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error("Git command execution failed");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [repoPath],
  );

  const getStatus = useCallback(async (): Promise<GitStatus> => {
    const data = await executeGitCommand("status", ["--porcelain", "--branch"]);
    // Parse the status data and update state
    // This is a simplified example - you'll need to parse the actual output
    setStatus({
      branch: data.branch || null,
      ahead: data.ahead || 0,
      behind: data.behind || 0,
      hasChanges: data.hasChanges || false,
      staged: data.staged || [],
      unstaged: data.unstaged || [],
      untracked: data.untracked || [],
      conflicts: data.conflicts || [],
    });
    return data;
  }, [executeGitCommand]);

  const getHistory = useCallback(
    async (limit: number = 10): Promise<GitCommit[]> => {
      const data = await executeGitCommand("log", [
        `-n ${limit}`,
        '--pretty=format:{%n  "hash": "%H",%n  "author": "%an <%ae>",%n  "date": "%ad",%n  "message": "%s"%n}',
      ]);
      setHistory(Array.isArray(data) ? data : []);
      return data;
    },
    [executeGitCommand],
  );

  const getRemotes = useCallback(async (): Promise<GitRemote[]> => {
    const data = await executeGitCommand("remote", ["-v"]);
    setRemotes(Array.isArray(data) ? data : []);
    return data;
  }, [executeGitCommand]);

  const stageFiles = useCallback(
    async (files: string[]) => {
      return await executeGitCommand("add", [...files]);
    },
    [executeGitCommand],
  );

  const commit = useCallback(
    async (message: string) => {
      return await executeGitCommand("commit", ["-m", `"${message}"`]);
    },
    [executeGitCommand],
  );

  const push = useCallback(
    async (remote: string = "origin", branch: string = "main") => {
      return await executeGitCommand("push", [remote, branch]);
    },
    [executeGitCommand],
  );

  const pull = useCallback(
    async (remote: string = "origin", branch: string = "main") => {
      return await executeGitCommand("pull", [remote, branch]);
    },
    [executeGitCommand],
  );

  const fetch = useCallback(async () => {
    return await executeGitCommand("fetch");
  }, [executeGitCommand]);

  const checkout = useCallback(
    async (branch: string, createBranch: boolean = false) => {
      const args = createBranch ? ["-b", branch] : [branch];
      return await executeGitCommand("checkout", args);
    },
    [executeGitCommand],
  );

  // Initial load
  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([getStatus(), getHistory(), getRemotes()]);
      } catch (err) {
        console.error("Failed to initialize Git:", err);
      }
    };

    if (repoPath) {
      init();
    }
  }, [repoPath, getStatus, getHistory, getRemotes]);

  return {
    // State
    status,
    history,
    remotes,
    isLoading,
    error,

    // Actions
    getStatus,
    getHistory,
    getRemotes,
    stageFiles,
    commit,
    push,
    pull,
    fetch,
    checkout,
    executeGitCommand,
  };
};

export default useGit;
