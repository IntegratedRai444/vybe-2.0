import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

interface ProjectFile {
  id: string;
  path: string;
  name: string;
  type: "file" | "directory";
  content?: string;
  children?: ProjectFile[];
  isOpen?: boolean;
  isSelected?: boolean;
  isModified?: boolean;
  isNew?: boolean;
  isDeleted?: boolean;
  isRenamed?: boolean;
  isBinary?: boolean;
  size?: number;
  lastModified?: number;
  language?: string;
  parentId?: string | null;
}

interface ProjectState {
  id: string;
  name: string;
  path: string;
  files: ProjectFile[];
  openFiles: string[];
  activeFile: string | null;
  isSaving: boolean;
  isLoading: boolean;
  error: Error | null;
  recentProjects: Array<{
    id: string;
    name: string;
    path: string;
    lastOpened: number;
  }>;
  settings: {
    autoSave: boolean;
    autoSaveDelay: number;
    showHiddenFiles: boolean;
    fileIcons: boolean;
    fileExtensions: boolean;
    sortOrder: "name" | "type" | "modified";
    sortDirection: "asc" | "desc";
  };
}

interface UseProjectProps {
  initialProjectPath?: string;
  onProjectLoad?: (project: ProjectState) => void;
  onProjectSave?: (project: ProjectState) => void;
  onError?: (error: Error) => void;
}

const useProject = ({
  initialProjectPath = "",
  onProjectLoad,
  onProjectSave,
  onError,
}: UseProjectProps = {}) => {
  const [state, setState] = useState<ProjectState>({
    id: uuidv4(),
    name: "Untitled Project",
    path: initialProjectPath,
    files: [],
    openFiles: [],
    activeFile: null,
    isSaving: false,
    isLoading: false,
    error: null,
    recentProjects: [],
    settings: {
      autoSave: true,
      autoSaveDelay: 1000,
      showHiddenFiles: false,
      fileIcons: true,
      fileExtensions: true,
      sortOrder: "name",
      sortDirection: "asc",
    },
  });

  // Load project from path
  const loadProject = useCallback(
    async (projectPath: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // This would typically be an API call to the backend
        const response = await fetch(`/api/projects/load`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: projectPath }),
        });

        if (!response.ok) {
          throw new Error(`Failed to load project: ${response.statusText}`);
        }

        const projectData = await response.json();

        setState((prev) => ({
          ...prev,
          ...projectData,
          path: projectPath,
          isLoading: false,
          error: null,
        }));

        onProjectLoad?.(projectData);
        return projectData;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to load project");
        setState((prev) => ({ ...prev, error, isLoading: false }));
        onError?.(error);
        throw error;
      }
    },
    [onProjectLoad, onError],
  );

  // Save project
  const saveProject = useCallback(
    async (projectData?: Partial<ProjectState>) => {
      setState((prev) => ({ ...prev, isSaving: true, error: null }));

      try {
        const dataToSave = { ...state, ...projectData };

        // This would typically be an API call to the backend
        const response = await fetch(`/api/projects/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToSave),
        });

        if (!response.ok) {
          throw new Error(`Failed to save project: ${response.statusText}`);
        }

        const savedProject = await response.json();

        setState((prev) => ({
          ...prev,
          ...savedProject,
          isSaving: false,
          error: null,
        }));

        onProjectSave?.(savedProject);
        return savedProject;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to save project");
        setState((prev) => ({ ...prev, error, isSaving: false }));
        onError?.(error);
        throw error;
      }
    },
    [state, onProjectSave, onError],
  );

  // Create new project
  const createProject = useCallback(
    async (projectName: string, projectPath: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const newProject: ProjectState = {
          id: uuidv4(),
          name: projectName,
          path: projectPath,
          files: [],
          openFiles: [],
          activeFile: null,
          isSaving: false,
          isLoading: false,
          error: null,
          recentProjects: [],
          settings: {
            autoSave: true,
            autoSaveDelay: 1000,
            showHiddenFiles: false,
            fileIcons: true,
            fileExtensions: true,
            sortOrder: "name",
            sortDirection: "asc",
          },
        };

        await saveProject(newProject);
        return newProject;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to create project");
        setState((prev) => ({ ...prev, error, isLoading: false }));
        onError?.(error);
        throw error;
      }
    },
    [saveProject, onError],
  );

  // Open a file in the editor
  const openFile = useCallback((fileId: string) => {
    setState((prev) => {
      if (prev.openFiles.includes(fileId)) {
        return { ...prev, activeFile: fileId };
      }

      return {
        ...prev,
        openFiles: [...prev.openFiles, fileId],
        activeFile: fileId,
      };
    });
  }, []);

  // Close a file
  const closeFile = useCallback((fileId: string) => {
    setState((prev) => {
      const newOpenFiles = prev.openFiles.filter((id) => id !== fileId);
      let newActiveFile = prev.activeFile;

      if (prev.activeFile === fileId) {
        const currentIndex = prev.openFiles.indexOf(fileId);
        newActiveFile =
          newOpenFiles[currentIndex] || newOpenFiles[currentIndex - 1] || null;
      }

      return {
        ...prev,
        openFiles: newOpenFiles,
        activeFile: newActiveFile,
      };
    });
  }, []);

  // Update file content
  const updateFileContent = useCallback((fileId: string, content: string) => {
    setState((prev) => {
      const updateFile = (files: ProjectFile[]): ProjectFile[] => {
        return files.map((file) => {
          if (file.id === fileId) {
            return { ...file, content, isModified: true };
          }

          if (file.children) {
            return { ...file, children: updateFile(file.children) };
          }

          return file;
        });
      };

      return {
        ...prev,
        files: updateFile(prev.files),
      };
    });
  }, []);

  // Save a file
  const saveFile = useCallback(
    async (fileId: string, content: string) => {
      try {
        // This would typically be an API call to save the file
        const response = await fetch(`/api/files/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId, content }),
        });

        if (!response.ok) {
          throw new Error(`Failed to save file: ${response.statusText}`);
        }

        setState((prev) => {
          const updateFile = (files: ProjectFile[]): ProjectFile[] => {
            return files.map((file) => {
              if (file.id === fileId) {
                return { ...file, content, isModified: false };
              }

              if (file.children) {
                return { ...file, children: updateFile(file.children) };
              }

              return file;
            });
          };

          return {
            ...prev,
            files: updateFile(prev.files),
          };
        });

        return true;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to save file");
        setState((prev) => ({ ...prev, error }));
        onError?.(error);
        throw error;
      }
    },
    [onError],
  );

  // Add a new file or directory
  const addFile = useCallback(
    (
      parentId: string | null,
      file: Omit<ProjectFile, "id" | "parentId" | "isModified">,
    ) => {
      const newFile: ProjectFile = {
        ...file,
        id: uuidv4(),
        parentId,
        isModified: false,
      };

      setState((prev) => {
        if (!parentId) {
          return {
            ...prev,
            files: [...prev.files, newFile],
          };
        }

        const addFileToParent = (files: ProjectFile[]): ProjectFile[] => {
          return files.map((f) => {
            if (f.id === parentId) {
              return {
                ...f,
                children: [...(f.children || []), newFile],
                isOpen: true,
              };
            }

            if (f.children) {
              return { ...f, children: addFileToParent(f.children) };
            }

            return f;
          });
        };

        return {
          ...prev,
          files: addFileToParent(prev.files),
        };
      });

      return newFile;
    },
    [],
  );

  // Delete a file or directory
  const deleteFile = useCallback(
    async (fileId: string) => {
      try {
        // This would typically be an API call to delete the file
        const response = await fetch(`/api/files/delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId }),
        });

        if (!response.ok) {
          throw new Error(`Failed to delete file: ${response.statusText}`);
        }

        setState((prev) => {
          const removeFile = (files: ProjectFile[]): ProjectFile[] => {
            return files.reduce<ProjectFile[]>((acc, file) => {
              if (file.id === fileId) {
                return acc;
              }

              if (file.children) {
                return [
                  ...acc,
                  { ...file, children: removeFile(file.children) },
                ];
              }

              return [...acc, file];
            }, []);
          };

          return {
            ...prev,
            files: removeFile(prev.files),
            openFiles: prev.openFiles.filter((id) => id !== fileId),
            activeFile: prev.activeFile === fileId ? null : prev.activeFile,
          };
        });

        return true;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to delete file");
        setState((prev) => ({ ...prev, error }));
        onError?.(error);
        throw error;
      }
    },
    [onError],
  );

  // Rename a file or directory
  const renameFile = useCallback(
    async (fileId: string, newName: string) => {
      try {
        // This would typically be an API call to rename the file
        const response = await fetch(`/api/files/rename`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId, newName }),
        });

        if (!response.ok) {
          throw new Error(`Failed to rename file: ${response.statusText}`);
        }

        setState((prev) => {
          const updateFileName = (files: ProjectFile[]): ProjectFile[] => {
            return files.map((file) => {
              if (file.id === fileId) {
                return {
                  ...file,
                  name: newName,
                  isModified: true,
                  isRenamed: true,
                };
              }

              if (file.children) {
                return { ...file, children: updateFileName(file.children) };
              }

              return file;
            });
          };

          return {
            ...prev,
            files: updateFileName(prev.files),
          };
        });

        return true;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to rename file");
        setState((prev) => ({ ...prev, error }));
        onError?.(error);
        throw error;
      }
    },
    [onError],
  );

  // Toggle directory open/close
  const toggleDirectory = useCallback((fileId: string) => {
    setState((prev) => {
      const toggleDir = (files: ProjectFile[]): ProjectFile[] => {
        return files.map((file) => {
          if (file.id === fileId) {
            return { ...file, isOpen: !file.isOpen };
          }

          if (file.children) {
            return { ...file, children: toggleDir(file.children) };
          }

          return file;
        });
      };

      return {
        ...prev,
        files: toggleDir(prev.files),
      };
    });
  }, []);

  // Update project settings
  const updateSettings = useCallback(
    (settings: Partial<ProjectState["settings"]>) => {
      setState((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          ...settings,
        },
      }));
    },
    [],
  );

  // Load recent projects
  const loadRecentProjects = useCallback(async () => {
    try {
      // This would typically be an API call to get recent projects
      const response = await fetch("/api/projects/recent");

      if (!response.ok) {
        throw new Error(
          `Failed to load recent projects: ${response.statusText}`,
        );
      }

      const recentProjects = await response.json();

      setState((prev) => ({
        ...prev,
        recentProjects,
      }));

      return recentProjects;
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error("Failed to load recent projects");
      setState((prev) => ({ ...prev, error }));
      onError?.(error);
      throw error;
    }
  }, [onError]);

  // Initialize with default project or load from path
  useEffect(() => {
    if (initialProjectPath) {
      loadProject(initialProjectPath).catch(() => {
        // Handle error (already handled in loadProject)
      });
    } else {
      loadRecentProjects().catch(() => {
        // Handle error (already handled in loadRecentProjects)
      });
    }
  }, [initialProjectPath, loadProject, loadRecentProjects]);

  return {
    // State
    ...state,

    // Actions
    loadProject,
    saveProject,
    createProject,
    openFile,
    closeFile,
    updateFileContent,
    saveFile,
    addFile,
    deleteFile,
    renameFile,
    toggleDirectory,
    updateSettings,
    loadRecentProjects,
  };
};

export default useProject;
export type { ProjectFile, ProjectState };
