import { useEffect } from 'react';
import { gitWebSocketService } from '../services/gitWebSocketService';

export const useGitWebSocket = (repoPath: string) => {
  useEffect(() => {
    if (repoPath) {
      gitWebSocketService.initializeRepository(repoPath);
    }

    return () => {
      gitWebSocketService.cleanup();
    };
  }, [repoPath]);
};
