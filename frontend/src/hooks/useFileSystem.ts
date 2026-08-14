import { useState, useEffect, useCallback } from 'react';

interface FileSystemItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified?: Date;
  children?: FileSystemItem[];
}

interface UseFileSystemProps {
  initialPath?: string;
  watchChanges?: boolean;
}

const useFileSystem = ({ initialPath = '/', watchChanges = true }: UseFileSystemProps = {}) => {
  const [currentPath, setCurrentPath] = useState<string>(initialPath);
  const [currentDir, setCurrentDir] = useState<FileSystemItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [watcher, setWatcher] = useState<AbortController | null>(null);

  const listDirectory = useCallback(async (path: string = currentPath) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would call your backend API
      const response = await fetch(`/api/fs/list?path=${encodeURIComponent(path)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to list directory: ${response.statusText}`);
      }
      
      const data = await response.json();
      setCurrentDir(data);
      setCurrentPath(path);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to list directory');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [currentPath]);

  const readFile = useCallback(async (filePath: string): Promise<string> => {
    try {
      const response = await fetch(`/api/fs/read?path=${encodeURIComponent(filePath)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to read file: ${response.statusText}`);
      }
      
      return await response.text();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to read file');
      setError(error);
      throw error;
    }
  }, []);

  const writeFile = useCallback(async (filePath: string, content: string): Promise<void> => {
    try {
      const response = await fetch(`/api/fs/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath, content }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to write file: ${response.statusText}`);
      }
      
      // Refresh the current directory
      await listDirectory(currentPath);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to write file');
      setError(error);
      throw error;
    }
  }, [currentPath, listDirectory]);

  const createDirectory = useCallback(async (dirPath: string): Promise<void> => {
    try {
      const response = await fetch(`/api/fs/mkdir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: dirPath }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create directory: ${response.statusText}`);
      }
      
      await listDirectory(currentPath);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create directory');
      setError(error);
      throw error;
    }
  }, [currentPath, listDirectory]);

  const deleteItem = useCallback(async (path: string, recursive: boolean = false): Promise<void> => {
    try {
      const response = await fetch(`/api/fs/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, recursive }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete item: ${response.statusText}`);
      }
      
      await listDirectory(currentPath);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete item');
      setError(error);
      throw error;
    }
  }, [currentPath, listDirectory]);

  const renameItem = useCallback(async (oldPath: string, newPath: string): Promise<void> => {
    try {
      const response = await fetch(`/api/fs/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath, newPath }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to rename item: ${response.statusText}`);
      }
      
      await listDirectory(currentPath);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to rename item');
      setError(error);
      throw error;
    }
  }, [currentPath, listDirectory]);

  // Watch for file system changes
  useEffect(() => {
    if (!watchChanges) return;
    
    const controller = new AbortController();
    setWatcher(controller);
    
    const watchForChanges = async () => {
      try {
        const response = await fetch(`/api/fs/watch?path=${encodeURIComponent(currentPath)}`, {
          signal: controller.signal,
        });
        
        if (response.status === 200) {
          const reader = response.body?.getReader();
          
          while (true) {
            const { done } = await reader?.read() || { done: true };
            if (done) break;
            
            // Refresh the directory when changes are detected
            await listDirectory(currentPath);
          }
        }
      } catch (error) {
        const err = error as Error & { name: string };
        if (err.name !== 'AbortError') {
          console.error('File system watch error:', err);
        }
      }
    };
    
    watchForChanges();
    
    return () => {
      controller.abort();
    };
  }, [currentPath, watchChanges, listDirectory]);

  // Initial load
  useEffect(() => {
    listDirectory(initialPath);
    
    return () => {
      watcher?.abort();
    };
  }, []);

  return {
    // State
    currentPath,
    currentDir,
    isLoading,
    error,
    
    // Actions
    listDirectory,
    readFile,
    writeFile,
    createDirectory,
    deleteItem,
    renameItem,
    navigate: listDirectory,
    goBack: () => {
      const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
      return listDirectory(parentPath);
    },
  };
};

export default useFileSystem;
