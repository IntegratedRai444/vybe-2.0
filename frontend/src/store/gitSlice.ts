import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface GitFile {
  path: string;
  status: 'staged' | 'unstaged' | 'untracked' | 'conflicted';
  changes: {
    added: number;
    deleted: number;
  };
}

interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
  isHead?: boolean;
}

interface GitState {
  branch: string;
  branches: string[];
  status: 'clean' | 'dirty' | 'uncommitted' | 'conflict';
  stagedFiles: GitFile[];
  unstagedFiles: GitFile[];
  commits: GitCommit[];
  currentCommit: GitCommit | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  actions: {
    setBranch: (branch: string) => void;
    setBranches: (branches: string[]) => void;
    setStatus: (status: 'clean' | 'dirty' | 'uncommitted' | 'conflict') => void;
    setStagedFiles: (files: GitFile[]) => void;
    setUnstagedFiles: (files: GitFile[]) => void;
    setCommits: (commits: GitCommit[]) => void;
    setCurrentCommit: (commit: GitCommit | null) => void;
    setConnected: (isConnected: boolean) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
  };
}

const useGitStore = create<GitState>()(
  devtools(
    (set) => ({
      branch: 'main',
      branches: [],
      status: 'clean',
      stagedFiles: [],
      unstagedFiles: [],
      commits: [],
      currentCommit: null,
      isConnected: false,
      isLoading: false,
      error: null,
      actions: {
        setBranch: (branch) => set({ branch }),
        setBranches: (branches) => set({ branches }),
        setStatus: (status) => set({ status }),
        setStagedFiles: (stagedFiles) => set({ stagedFiles }),
        setUnstagedFiles: (unstagedFiles) => set({ unstagedFiles }),
        setCommits: (commits) => set({ commits }),
        setCurrentCommit: (currentCommit) => set({ currentCommit }),
        setConnected: (isConnected) => set({ isConnected }),
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
      },
    }),
    { name: 'git-store' }
  )
);

export const useGitBranch = () => useGitStore((state) => state.branch);
export const useGitBranches = () => useGitStore((state) => state.branches);
export const useGitStatus = () => useGitStore((state) => state.status);
export const useStagedFiles = () => useGitStore((state) => state.stagedFiles);
export const useUnstagedFiles = () => useGitStore((state) => state.unstagedFiles);
export const useGitCommits = () => useGitStore((state) => state.commits);
export const useCurrentCommit = () => useGitStore((state) => state.currentCommit);
export const useGitConnection = () => useGitStore((state) => state.isConnected);
export const useGitLoading = () => useGitStore((state) => state.isLoading);
export const useGitError = () => useGitStore((state) => state.error);
export const useGitActions = () => useGitStore((state) => state.actions);

export default useGitStore;
