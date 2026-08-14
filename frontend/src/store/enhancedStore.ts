import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import {
  FileTab,
  CursorPosition,
  PanelConfig,
  FileSystemItem,
  EditorSettings,
  TerminalSettings,
  UserSettings,
} from "../types";

// Helper to generate unique IDs
const generateId = (prefix = "") => `${prefix}-${uuidv4()}`;

// Default settings
const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 14,
  fontFamily: "Fira Code, monospace",
  lineHeight: 1.5,
  tabSize: 2,
  insertSpaces: true,
  wordWrap: "on",
  minimap: {
    enabled: true,
    showSlider: "mouseover",
  },
  lineNumbers: "on",
  renderWhitespace: "selection",
  renderLineHighlight: "all",
  autoClosingBrackets: "languageDefined",
  autoClosingQuotes: "languageDefined",
  autoIndent: "full",
  formatOnPaste: true,
  formatOnType: true,
  formatOnSave: true,
  codeLens: true,
  bracketPairColorization: {
    enabled: true,
    independentColorPoolPerBracketType: true,
  },
  guides: {
    bracketPairs: true,
    bracketPairsHorizontal: true,
    highlightActiveBracketPair: true,
    indentation: true,
    highlightActiveIndentation: true,
  },
  suggest: {
    snippetsPreventQuickSuggestions: false,
    showKeywords: true,
    showSnippets: true,
    showClasses: true,
    showFunctions: true,
    showVariables: true,
    showModules: true,
    showFiles: true,
    showReferences: true,
    showValues: true,
    showConstants: true,
    showProperties: true,
    showUnits: true,
  },
};

const DEFAULT_TERMINAL_SETTINGS: TerminalSettings = {
  fontSize: 14,
  fontFamily: "Fira Code, monospace",
  cursorBlink: true,
  cursorStyle: "block",
  cursorWidth: 1,
  drawBoldTextInBrightColors: true,
  fastScrollSensitivity: 5,
  fontLigatures: true,
  letterSpacing: 0,
  lineHeight: 1.5,
  rendererType: "canvas",
  scrollback: 1000,
  scrollSensitivity: 1,
  theme: {
    background: "#1E1E1E",
    foreground: "#F8F8F2",
    cursor: "#F8F8F2",
    cursorAccent: "#1E1E1E",
    selection: "#44475A",
    black: "#000000",
    red: "#FF5555",
    green: "#50FA7B",
    yellow: "#F1FA8C",
    blue: "#BD93F9",
    magenta: "#FF79C6",
    cyan: "#8BE9FD",
    white: "#F8F8F2",
    brightBlack: "#6272A4",
    brightRed: "#FF6E6E",
    brightGreen: "#69FF94",
    brightYellow: "#FFFFA5",
    brightBlue: "#D6ACFF",
    brightMagenta: "#FF92DF",
    brightCyan: "#A4FFFF",
    brightWhite: "#FFFFFF",
  },
};

const DEFAULT_USER_SETTINGS: UserSettings = {
  appearance: {
    theme: "system",
    colorScheme: "system",
    fontSize: 14,
    fontFamily: "Inter, system-ui, sans-serif",
    lineHeight: 1.5,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: "on",
    minimap: {
      enabled: true,
      showSlider: "mouseover",
    },
  },
  editor: DEFAULT_EDITOR_SETTINGS,
  terminal: DEFAULT_TERMINAL_SETTINGS,
  files: {
    autoSave: "off",
    autoSaveDelay: 1000,
    hotExit: "onExit",
    restoreWindows: true,
    restoreWindowsCount: 5,
    defaultFileEncoding: "utf8",
    encoding: "utf8",
    eol: "\n",
    trimTrailingWhitespace: true,
    insertFinalNewline: true,
    trimFinalNewlines: true,
    autoGuessEncoding: false,
  },
  workbench: {
    startupEditor: "welcomePage",
    enablePreview: true,
    enablePreviewFromQuickOpen: true,
    enablePreviewFromCodeNavigation: true,
    editor: {
      enablePreview: true,
      enablePreviewFromQuickOpen: true,
      enablePreviewFromCodeNavigation: true,
    },
    tree: {
      indent: 8,
      renderIndentGuides: "onHover",
      showIcons: true,
      showDecorations: true,
      showErrors: true,
      showWarnings: true,
      showInfos: true,
      showHints: true,
    },
  },
  search: {
    exclude: {
      "**/node_modules": true,
      "**/bower_components": true,
      "**/*.code-search": true,
      "**/.git": true,
    },
    useIgnoreFiles: true,
    useGlobalIgnoreFiles: true,
    useParentIgnoreFiles: true,
    followSymlinks: true,
    smartCase: true,
    useIgnoreFilesByDefault: true,
    useGlobalIgnoreFilesByDefault: true,
    useParentIgnoreFilesByDefault: true,
  },
  debug: {
    console: {
      closeOnEnd: false,
      fontSize: 14,
      fontFamily: "Fira Code, monospace",
      lineHeight: 1.5,
      wordWrap: true,
      scrollback: 1000,
    },
    openDebug: "openOnFirstSessionStart",
    showInStatusBar: "always",
    allowBreakpointsEverywhere: true,
    showSubSessionsInToolBar: true,
    showInlineBreakpointCandidates: true,
    showBreakpointsInOverviewRuler: true,
    showInlineValues: true,
    internalConsoleOptions: "openOnFirstSessionStart",
    toolbar: {
      show: true,
      location: "floating",
    },
  },
  terminal: {
    integrated: {
      fontFamily: "Fira Code, monospace",
      fontSize: 14,
      fontWeight: "normal",
      fontWeightBold: "bold",
      lineHeight: 1.5,
      letterSpacing: 0,
      cursorBlinking: true,
      cursorStyle: "block",
      cursorWidth: 2,
      drawBoldTextInBrightColors: true,
      fastScrollSensitivity: 5,
      fontLigatures: true,
      rendererType: "canvas",
      scrollback: 1000,
      wordSeparator: " ()[]{}\\|`'\"",
      rightClickBehavior: "default",
      copyOnSelection: false,
      cursorInactiveStyle: "outline",
      cursorInactiveBackground: "#000000",
      cursorInactiveForeground: "#FFFFFF",
      cursorInactiveOpacity: 0.3,
      cursorStyleInactive: "outline",
      cursorWidthInactive: 2,
    },
  },
  extensions: {
    autoUpdate: true,
    autoCheckUpdates: true,
    ignoreRecommendations: false,
    showRecommendationsOnlyOnDemand: false,
    closeExtensionDetailsOnViewChange: false,
    confirmBeforeUninstalling: true,
    enableProposedApi: [],
    galleryUrl: "https://marketplace.visualstudio.com/_apis/public/gallery",
  },
  update: {
    mode: "default",
    enableWindowsBackgroundUpdates: true,
    showReleaseNotes: true,
  },
  telemetry: {
    enableTelemetry: true,
    enableCrashReporter: true,
  },
  security: {
    allowedUNCHosts: [],
    allowedUNCHostRegexes: [],
    allowedUNCHostRegexesWithPorts: [],
    allowedUNCHostsWithPorts: [],
    allowedUNCHostsWithSSL: [],
    allowedUNCHostRegexesWithSSL: [],
    allowedUNCHostsWithSSLAndPorts: [],
    allowedUNCHostRegexesWithSSLAndPorts: [],
    allowedUNCHostsWithSSLAndPortsAndPath: [],
    allowedUNCHostRegexesWithSSLAndPortsAndPath: [],
    allowedUNCHostsWithSSLAndPortsAndPathAndQuery: [],
    allowedUNCHostRegexesWithSSLAndPortsAndPathAndQuery: [],
    allowedUNCHostsWithSSLAndPortsAndPathAndQueryAndFragment: [],
    allowedUNCHostRegexesWithSSLAndPortsAndPathAndQueryAndFragment: [],
    allowedUNCHostsWithSSLAndPortsAndPathAndQueryAndFragmentAndUserInfo: [],
    allowedUNCHostRegexesWithSSLAndPortsAndPathAndQueryAndFragmentAndUserInfo:
      [],
    allowedUNCHostsWithSSLAndPortsAndPathAndQueryAndFragmentAndUserInfoAndProtocol:
      [],
    allowedUNCHostRegexesWithSSLAndPortsAndPathAndQueryAndFragmentAndUserInfoAndProtocol:
      [],
  },
  window: {
    title: "${dirty}${activeEditorShort}${separator}${rootName}",
    titleBarStyle: "custom",
    nativeTabs: false,
    nativeFullScreen: false,
    autoLockCommandPalette: false,
    clickThroughInactive: false,
    closeWhenEmpty: false,
    commandPalettePreserveInput: false,
    customMenuBarAltFocus: false,
    dialogStyle: "custom",
    doubleClickIconToClose: false,
    enableMenuBarMnemonics: true,
    fullscreen: {
      autoHideMenuBar: false,
      hideTabs: false,
      hideToolbar: false,
      hideStatusBar: false,
      hideActivityBar: false,
      hideSideBar: false,
      hidePanel: false,
      hideZenModeTabs: false,
      hideZenModeStatusBar: false,
      hideZenModeActivityBar: false,
      hideZenModeSideBar: false,
      hideZenModePanel: false,
      hideZenModeBreadcrumbs: false,
    },
    fullscreenWarning: true,
    menuBarVisibility: "default",
    openFilesInNewWindow: "default",
    openFoldersInNewWindow: "default",
    openWithoutArgumentsInNewWindow: "off",
    restoreWindows: "all",
    restoreFullscreen: true,
    showDevToolsOnStart: false,
    showFullPathInTitle: false,
    showProjectNameInTitle: true,
    showProjectPathInTitle: false,
    showRelativePathInTitle: true,
    showWindowControls: true,
    smoothScrollingWorkaround: false,
    zoomLevel: 0,
  },
  workbench: {
    colorTheme: "Default Dark+",
    iconTheme: "vs-seti",
    productIconTheme: null,
    preferredDarkColorTheme: "Default Dark+",
    preferredHighContrastColorTheme: "Default High Contrast",
    preferredHighContrastLightColorTheme: "Default High Contrast Light",
    preferredLightColorTheme: "Default Light+",
    autoDetectColorScheme: true,
    autoDetectHighContrast: true,
    autoDetectIconTheme: true,
    autoDetectProductIconTheme: true,
    autoDetectTheme: true,
    colorCustomizations: {},
  },
};

interface AppState {
  // Editor state
  files: FileTab[];
  activeFile: string | null;
  workspacePath: string | null;
  cursorPosition: CursorPosition;

  // Layout state
  layout: {
    sidebar: {
      width: number;
      collapsed: boolean;
      selectedItem?: string;
    };
    panels: {
      [key: string]: PanelConfig;
    };
    editor: {
      splitView: boolean;
    };
  };

  // UI state
  isCommandPaletteOpen: boolean;
  connectionStatus: "connected" | "disconnected" | "connecting";
  searchQuery: string;

  // Settings
  settings: UserSettings;

  // Actions
  setFiles: (files: FileTab[]) => void;
  setActiveFile: (fileId: string | null) => void;
  setWorkspacePath: (path: string | null) => void;
  setCursorPosition: (position: CursorPosition) => void;
  togglePanel: (panel: string) => void;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (isOpen: boolean) => void;
  setConnectionStatus: (
    status: "connected" | "disconnected" | "connecting",
  ) => void;
  setSearchQuery: (query: string) => void;

  // File operations
  updateFileContent: (fileId: string, content: string) => void;
  addFile: (
    file: Omit<FileTab, "id" | "isDirty" | "content" | "language">,
    content?: string,
  ) => void;
  removeFile: (fileId: string) => void;
  renameFile: (fileId: string, newPath: string) => void;

  // Workspace operations
  loadWorkspace: (path: string) => Promise<boolean>;
  saveWorkspace: () => Promise<boolean>;

  // Settings operations
  updateSettings: (settings: Partial<UserSettings>) => void;
  resetSettings: () => void;
}

// Create the store with persistence and devtools
const useStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        files: [],
        activeFile: null,
        workspacePath: null,
        cursorPosition: { lineNumber: 1, column: 1 },

        layout: {
          sidebar: {
            width: 280,
            collapsed: false,
          },
          panels: {
            terminal: {
              visible: true,
              height: 300,
              title: "Terminal",
              isActive: false,
            },
            problems: {
              visible: false,
              height: 200,
              title: "Problems",
              isActive: false,
            },
            chat: {
              visible: false,
              width: 300,
              title: "Chat",
              isActive: false,
            },
            debugger: {
              visible: false,
              width: 300,
              title: "Debug",
              isActive: false,
            },
          },
          editor: {
            splitView: false,
          },
        },

        isCommandPaletteOpen: false,
        connectionStatus: "connecting",
        searchQuery: "",
        settings: DEFAULT_USER_SETTINGS,

        // Actions implementation
        setFiles: (files) => set({ files }),
        setActiveFile: (activeFile) => set({ activeFile }),
        setWorkspacePath: (workspacePath) => set({ workspacePath }),
        setCursorPosition: (cursorPosition) => set({ cursorPosition }),

        togglePanel: (panel) =>
          set((state) => ({
            layout: {
              ...state.layout,
              panels: {
                ...Object.fromEntries(
                  Object.entries(state.layout.panels).map(
                    ([key, panelConfig]) => [
                      key,
                      {
                        ...panelConfig,
                        isActive: key === panel ? !panelConfig.isActive : false,
                      },
                    ],
                  ),
                ),
                [panel]: {
                  ...state.layout.panels[panel],
                  visible: !state.layout.panels[panel]?.visible,
                  isActive: !state.layout.panels[panel]?.isActive,
                },
              },
            },
          })),

        toggleSidebar: () =>
          set((state) => ({
            layout: {
              ...state.layout,
              sidebar: {
                ...state.layout.sidebar,
                collapsed: !state.layout.sidebar.collapsed,
              },
            },
          })),

        setCommandPaletteOpen: (isCommandPaletteOpen) =>
          set({ isCommandPaletteOpen }),
        setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
        setSearchQuery: (searchQuery) => set({ searchQuery }),

        // File operations implementation
        updateFileContent: (fileId, content) =>
          set((state) => ({
            files: state.files.map((file) =>
              file.id === fileId
                ? {
                    ...file,
                    content,
                    isDirty: true,
                    lastModified: Date.now(),
                    language: file.language || "plaintext",
                  }
                : file,
            ),
          })),

        addFile: (file, content = "") =>
          set((state) => {
            const newFile: FileTab = {
              ...file,
              id: generateId("file"),
              isDirty: true,
              content,
              language: file.language || "plaintext",
              lastModified: Date.now(),
            };

            return {
              files: [...state.files, newFile],
              activeFile: newFile.id,
            };
          }),

        removeFile: (fileId) =>
          set((state) => {
            const file = state.files.find((f) => f.id === fileId);
            if (
              file?.isDirty &&
              !confirm(
                "You have unsaved changes. Are you sure you want to close this file?",
              )
            ) {
              return state;
            }

            return {
              files: state.files.filter((file) => file.id !== fileId),
              activeFile: state.activeFile === fileId ? null : state.activeFile,
            };
          }),

        renameFile: (fileId, newPath) =>
          set((state) => ({
            files: state.files.map((file) =>
              file.id === fileId
                ? {
                    ...file,
                    path: newPath,
                    name: newPath.split("/").pop() || "Untitled",
                    isDirty: true,
                    lastModified: Date.now(),
                  }
                : file,
            ),
          })),

        // Workspace operations
        loadWorkspace: async (path) => {
          try {
            // In a real app, this would load files from the file system
            set({
              workspacePath: path,
              files: [],
              activeFile: null,
            });

            // Save the workspace path to localStorage
            localStorage.setItem("lastWorkspace", path);

            return true;
          } catch (error) {
            console.error("Failed to load workspace:", error);
            return false;
          }
        },

        saveWorkspace: async () => {
          try {
            // In a real app, this would save all dirty files
            const { files } = get();
            const dirtyFiles = files.filter((file) => file.isDirty);

            if (dirtyFiles.length === 0) {
              return true;
            }

            // Update files to mark them as not dirty
            set((state) => ({
              files: state.files.map((file) =>
                file.isDirty
                  ? { ...file, isDirty: false, lastSaved: Date.now() }
                  : file,
              ),
            }));

            return true;
          } catch (error) {
            console.error("Failed to save workspace:", error);
            return false;
          }
        },

        // Settings operations
        updateSettings: (settings) =>
          set((state) => ({
            settings: {
              ...state.settings,
              ...settings,
            },
          })),

        resetSettings: () =>
          set({
            settings: DEFAULT_USER_SETTINGS,
          }),
      }),
      {
        name: "vybe-ide-storage",
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          settings: state.settings,
          layout: state.layout,
        }),
      },
    ),
  ),
);

// Export hooks for convenience
export const useFiles = () => useStore((state) => state.files);
export const useActiveFile = () =>
  useStore(
    (state) => state.files.find((file) => file.id === state.activeFile) || null,
  );

export const useWorkspacePath = () => useStore((state) => state.workspacePath);
export const useCursorPosition = () =>
  useStore((state) => state.cursorPosition);
export const useLayout = () => useStore((state) => state.layout);
export const useIsCommandPaletteOpen = () =>
  useStore((state) => state.isCommandPaletteOpen);
export const useConnectionStatus = () =>
  useStore((state) => state.connectionStatus);
export const useSearchQuery = () => useStore((state) => state.searchQuery);
export const useSettings = () => useStore((state) => state.settings);

// Action hooks
export const useFileActions = () => ({
  setFiles: useStore((state) => state.setFiles),
  setActiveFile: useStore((state) => state.setActiveFile),
  updateFileContent: useStore((state) => state.updateFileContent),
  addFile: useStore((state) => state.addFile),
  removeFile: useStore((state) => state.removeFile),
  renameFile: useStore((state) => state.renameFile),
});

export const useLayoutActions = () => ({
  togglePanel: useStore((state) => state.togglePanel),
  toggleSidebar: useStore((state) => state.toggleSidebar),
  setCommandPaletteOpen: useStore((state) => state.setCommandPaletteOpen),
});

export const useWorkspaceActions = () => ({
  setWorkspacePath: useStore((state) => state.setWorkspacePath),
  loadWorkspace: useStore((state) => state.loadWorkspace),
  saveWorkspace: useStore((state) => state.saveWorkspace),
});

export const useSettingsActions = () => ({
  updateSettings: useStore((state) => state.updateSettings),
  resetSettings: useStore((state) => state.resetSettings),
});

export default useStore;
