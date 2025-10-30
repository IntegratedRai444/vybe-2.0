import React from 'react';
import { useGitBranch, useGitConnection, useGitStatus } from '../store/gitSlice';
import { SyncStatus } from './SyncStatus';

export const GitStatusBar: React.FC = () => {
  const branch = useGitBranch();
  const status = useGitStatus();
  const isConnected = useGitConnection();

  if (!branch) return null;

  return (
    <div className="git-status-bar">
      <span className="branch-name">
        <i className="icon-git-branch" /> {branch}
        {status === 'conflict' && <span className="conflict-indicator">!</span>}
      </span>
      <SyncStatus />
      {!isConnected && <span className="connection-status">Disconnected</span>}
    </div>
  );
};
