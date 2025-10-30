import { useState, useCallback } from 'react';
import { GitBranch, GitCommit, GitPullRequest, GitMerge, GitFork, GitPullRequestClosed } from 'lucide-react';

interface GitStatus {
  branch: string;
  isDirty: boolean;
  hasUnpulledChanges: boolean;
  hasUnpushedChanges: boolean;
  lastCommit?: {
    hash: string;
    message: string;
    author: string;
    date: string;
  };
}

export const useGit = (workspacePath: string) => {
  const [status, setStatus] = useState<GitStatus>({
    branch: 'main',
    isDirty: false,
    hasUnpulledChanges: false,
    hasUnpushedChanges: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGitStatus = useCallback(async () => {
    if (!workspacePath) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Implement actual Git status fetching from the backend
      // This is a mock implementation
      const mockStatus: GitStatus = {
        branch: 'main',
        isDirty: false,
        hasUnpulledChanges: false,
        hasUnpushedChanges: false,
        lastCommit: {
          hash: 'a1b2c3d',
          message: 'Initial commit',
          author: 'User',
          date: new Date().toISOString(),
        },
      };
      
      setStatus(mockStatus);
      return mockStatus;
    } catch (err) {
      setError('Failed to fetch Git status');
      console.error('Git status error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [workspacePath]);

  const commitChanges = useCallback(async (message: string) => {
    if (!workspacePath) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Implement actual Git commit via backend
      console.log(`Committing changes with message: ${message}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      return true;
    } catch (err) {
      setError('Failed to commit changes');
      console.error('Commit error:', err);
      return false;
    } finally {
      setIsLoading(false);
      await fetchGitStatus(); // Refresh status after commit
    }
  }, [workspacePath, fetchGitStatus]);

  const pullChanges = useCallback(async () => {
    if (!workspacePath) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Implement actual Git pull via backend
      console.log('Pulling changes...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      return true;
    } catch (err) {
      setError('Failed to pull changes');
      console.error('Pull error:', err);
      return false;
    } finally {
      setIsLoading(false);
      await fetchGitStatus(); // Refresh status after pull
    }
  }, [workspacePath, fetchGitStatus]);

  const pushChanges = useCallback(async () => {
    if (!workspacePath) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Implement actual Git push via backend
      console.log('Pushing changes...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      return true;
    } catch (err) {
      setError('Failed to push changes');
      console.error('Push error:', err);
      return false;
    } finally {
      setIsLoading(false);
      await fetchGitStatus(); // Refresh status after push
    }
  }, [workspacePath, fetchGitStatus]);

  return {
    ...status,
    isLoading,
    error,
    fetchGitStatus,
    commitChanges,
    pullChanges,
    pushChanges,
    GitBranch,
    GitCommit,
    GitPullRequest,
    GitMerge,
    GitFork,
    GitPullRequestClosed,
  };
};

export default useGit;
