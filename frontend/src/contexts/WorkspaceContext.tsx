import React, { createContext, useContext, ReactNode } from 'react';

interface WorkspaceContextType {
  currentWorkspace: string | null;
  setCurrentWorkspace: (workspace: string | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentWorkspace, setCurrentWorkspace] = React.useState<string | null>(null);

  return (
    <WorkspaceContext.Provider value={{ currentWorkspace, setCurrentWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
