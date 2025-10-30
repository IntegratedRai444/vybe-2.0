import React from 'react';
import { useGitBranch } from '../store/gitSlice';

export const SyncStatus: React.FC = () => {
  const branch = useGitBranch();
  // TODO: Add ahead/behind tracking logic

  return (
    <div className="sync-status">
      <span className="sync-indicator" title={`Synchronized with ${branch}`}>
        ✓
      </span>
    </div>
  );
};
