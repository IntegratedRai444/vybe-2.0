import { create } from "zustand";
import { FileTab, StoreState, CursorPosition } from "../types";
import { v4 as uuidv4 } from "uuid";

// Helper function to detect file language from extension
const getLanguageFromExtension = (filename: string): string => {
  const extension = filename.split(".").pop()?.toLowerCase() || "";

  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    java: "java",
    c: "c",
    cpp: "cpp",
    cs: "csharp",
    go: "go",
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    rs: "rust",
    sh: "shell",
    json: "json",
    html: "html",
    css: "css",
    scss: "scss",
    md: "markdown",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
  };

  return languageMap[extension] || "plaintext";
};

type FileInput = Omit<
  FileTab,
  | "id"
  | "isDirty"
  | "content"
  | "language"
  | "type"
  | "lastModified"
  | "lastOpened"
> & {
  language?: string;
};

export const useStore = create<StoreState>((set, get) => ({
  // Core state
  files: {},
  directories: {},
  activeFile: null,
  workspacePath: null,

  // UI state
  isCommandPaletteOpen: false,
  connectionStatus: "connecting",
  cursorPosition: { lineNumber: 1, column: 1 },
  searchQuery: "",

  // Layout state
  layout: {
    sidebar: {
      width: 280,
      collapsed: false,
      selectedItem: "explorer",
    },
    panels: {
      terminal: { visible: true, height: 300, position: "bottom" },
      problems: { visible: false, height: 200, position: "bottom" },
      output: { visible: false, height: 200, position: "bottom" },
      debug: { visible: false, height: 300, position: "right" },
      chat: { visible: false, width: 300, position: "right" },
    },
    editor: {
      splitView: false,
    },
  },

  // Actions
  setFiles: (files: Record<string, FileTab>) => set({ files }),

  setActiveFile: (fileId: string | null) => {
    if (!fileId) {
      return set({ activeFile: null });
    }

    set((state) => {
      // Update lastOpened timestamp
      const updatedFiles = { ...state.files };
      if (updatedFiles[fileId]) {
        updatedFiles[fileId] = {
          ...updatedFiles[fileId],
          lastOpened: Date.now(),
        };
      }

      return {
        activeFile: fileId,
        files: updatedFiles,
      };
    });
  },

  setWorkspacePath: (workspacePath: string | null) => set({ workspacePath }),
  setCursorPosition: (cursorPosition: CursorPosition) =>
    set({ cursorPosition }),
  setCommandPaletteOpen: (isCommandPaletteOpen: boolean) =>
    set({ isCommandPaletteOpen }),
  setConnectionStatus: (
    connectionStatus: "connected" | "disconnected" | "connecting" | "checking",
  ) => set({ connectionStatus }),
  setSearchQuery: (searchQuery: string) => set({ searchQuery }),

  // File operations
  updateFileContent: (fileId: string, content: string) => {
    set((state) => {
      const file = state.files[fileId];
      if (!file) return state;

      const updatedFiles = {
        ...state.files,
        [fileId]: {
          ...file,
          content,
          isDirty: true,
          lastModified: Date.now(),
        },
      };

      return { files: updatedFiles };
    });
  },

  addFile: (file: FileInput, content: string = "") => {
    const id = `file-${uuidv4()}`;
    const language = file.language || getLanguageFromExtension(file.name);

    const newFile: FileTab = {
      ...file,
      id,
      type: "file",
      content,
      language,
      isDirty: true,
      lastModified: Date.now(),
      lastOpened: Date.now(),
    };

    set((state) => ({
      files: {
        ...state.files,
        [id]: newFile,
      },
      activeFile: id,
    }));

    return id;
  },

  removeFile: (fileId: string) => {
    set((state) => {
      const { [fileId]: _, ...remainingFiles } = state.files;
      let newActiveFile = state.activeFile;

      if (fileId === state.activeFile) {
        // Find the next file to activate
        const fileIds = Object.keys(remainingFiles);
        newActiveFile = fileIds.length > 0 ? fileIds[0] : null;
      }

      return {
        files: remainingFiles,
        activeFile: newActiveFile,
      };
    });
  },

  getActiveFile: () => {
    const state = get();
    return state.activeFile ? state.files[state.activeFile] || null : null;
  },

  // Layout operations
  togglePanel: (panel: string) => {
    set((state) => {
      const panelState = state.layout.panels[panel];
      if (!panelState) return state;

      // If we're opening this panel, make it the active one
      const updatedPanels = { ...state.layout.panels };

      // If we're opening a panel, close other panels in the same position
      if (!panelState.visible) {
        Object.keys(updatedPanels).forEach((key) => {
          if (
            updatedPanels[key].position === panelState.position &&
            key !== panel
          ) {
            updatedPanels[key] = { ...updatedPanels[key], visible: false };
          }
        });
      }

      updatedPanels[panel] = {
        ...panelState,
        visible: !panelState.visible,
        isActive: !panelState.visible,
      };

      return {
        layout: {
          ...state.layout,
          panels: updatedPanels,
        },
      };
    });
  },

  toggleSidebar: () => {
    set((state) => ({
      layout: {
        ...state.layout,
        sidebar: {
          ...state.layout.sidebar,
          collapsed: !state.layout.sidebar.collapsed,
        },
      },
    }));
  },

  // Workspace operations
  loadWorkspace: async (path: string) => {
    // Implementation for loading workspace
    console.log(`Loading workspace from: ${path}`);

    // For now, we'll just set the workspace path
    set({ workspacePath: path });
  },

  saveWorkspace: async () => {
    // Implementation for saving workspace
    const state = get();
    console.log("Saving workspace...");

    // Mark all files as not dirty
    const updatedFiles = { ...state.files };
    Object.keys(updatedFiles).forEach((fileId) => {
      if (updatedFiles[fileId].isDirty) {
        updatedFiles[fileId] = {
          ...updatedFiles[fileId],
          isDirty: false,
          lastSaved: Date.now(),
        };
      }
    });

    set({ files: updatedFiles });
  },
}));

// Export hooks for convenience
export const useFiles = () => useStore((state) => state.files);
export const useActiveFile = () =>
  useStore((state) =>
    state.activeFile ? state.files[state.activeFile] || null : null,
  );
export const useWorkspacePath = () => useStore((state) => state.workspacePath);
export const useCursorPosition = () =>
  useStore((state) => state.cursorPosition);
export const useLayout = () => useStore((state) => state.layout);
export const useIsCommandPaletteOpen = () =>
  useStore((state) => state.isCommandPaletteOpen);
// Workspace path change subscription - using a simple effect pattern
if (typeof window !== "undefined") {
  // Store the previous value
  let previousPath: string | null = null;

  // Subscribe to store changes
  const unsubscribe = useStore.subscribe((state) => {
    const currentPath = state.workspacePath;
    if (currentPath !== previousPath) {
      console.log("Workspace path changed:", currentPath);
      previousPath = currentPath;
    }
  });

  // Clean up on unmount
  window.addEventListener("beforeunload", () => {
    unsubscribe();
  });
}

// Export hooks for actions
// Alias for updateFileContent to maintain backward compatibility
const saveFile = (fileId: string, content: string) => {
  const store = useStore.getState();
  return store.updateFileContent(fileId, content);
};

export const useFileActions = () => ({
  setFiles: useStore((state) => state.setFiles),
  setActiveFile: useStore((state) => state.setActiveFile),
  updateFileContent: useStore((state) => state.updateFileContent),
  saveFile, // Add saveFile as an alias to updateFileContent
  addFile: useStore((state) => state.addFile),
  removeFile: useStore((state) => state.removeFile),
  getActiveFile: useStore((state) => state.getActiveFile),
});

export const useLayoutActions = () => ({
  togglePanel: useStore((state) => state.togglePanel),
  toggleSidebar: useStore((state) => state.toggleSidebar),
  setCommandPaletteOpen: useStore((state) => state.setCommandPaletteOpen),
});

export const useWorkspaceActions = () => ({
  loadWorkspace: useStore((state) => state.loadWorkspace),
  saveWorkspace: useStore((state) => state.saveWorkspace),
  setWorkspacePath: useStore((state) => state.setWorkspacePath),
  setConnectionStatus: useStore((state) => state.setConnectionStatus),
});
