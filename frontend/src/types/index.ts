// File system types
export type FileType = 'file' | 'directory';

export interface FileSystemItem {
  type: FileType;
  name: string;
  path: string;
  children?: FileSystemItem[];
  extension?: string;
  size?: number;
  lastModified?: number;
}

export interface FileTab {
  id: string;
  path: string;
  name: string;
  isDirty: boolean;
  content: string | null;
  language?: string;
  lastModified?: number;
  isSaving?: boolean;
  scrollPosition?: {
    scrollTop: number;
    scrollLeft: number;
  };
  cursorHistory?: CursorPosition[];
}

export interface CursorPosition {
  lineNumber: number;
  column: number;
  wordAtCursor?: {
    word: string;
    startColumn: number;
    endColumn: number;
  };
  isAtLineStart?: boolean;
  isAtLineEnd?: boolean;
}

export interface PanelConfig {
  visible: boolean;
  height?: number;
  width?: number;
  isActive?: boolean;
  title?: string;
}

export interface LayoutState {
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
    lineNumbers: 'on' | 'off' | 'relative';
    zoomLevel: number;
    renderWhitespace: 'none' | 'boundary' | 'selection' | 'trailing' | 'all';
    theme: string;
  };
}

// API types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

// Command types
export interface Command {
  id: string;
  name: string;
  description: string;
  icon?: React.ReactNode;
  category?: string;
  shortcut?: string[];
  action: () => void | Promise<void>;
}

// Theme types
export interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  [key: string]: string;
}

export interface Theme {
  name: string;
  colors: ThemeColors;
  radius: {
    sm: string;
    md: string;
    lg: string;
  };
  font: {
    sans: string;
    mono: string;
  };
}

// Editor types
export interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  tabSize: number;
  insertSpaces: boolean;
  wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  minimap: {
    enabled: boolean;
    showSlider: 'always' | 'mouseover';
  };
  lineNumbers: 'on' | 'off' | 'relative';
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'trailing' | 'all';
  renderLineHighlight: 'all' | 'line' | 'none' | 'gutter';
  autoClosingBrackets: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never';
  autoClosingQuotes: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never';
  autoIndent: 'none' | 'keep' | 'brackets' | 'advanced' | 'full';
  formatOnPaste: boolean;
  formatOnType: boolean;
  formatOnSave: boolean;
  codeLens: boolean;
  bracketPairColorization: {
    enabled: boolean;
    independentColorPoolPerBracketType: boolean;
  };
  guides: {
    bracketPairs: boolean;
    bracketPairsHorizontal: boolean;
    highlightActiveBracketPair: boolean;
    indentation: boolean;
    highlightActiveIndentation: boolean;
  };
  suggest: {
    snippetsPreventQuickSuggestions: boolean;
    showKeywords: boolean;
    showSnippets: boolean;
    showClasses: boolean;
    showFunctions: boolean;
    showVariables: boolean;
    showModules: boolean;
    showFiles: boolean;
    showReferences: boolean;
    showValues: boolean;
    showConstants: boolean;
    showProperties: boolean;
    showUnits: boolean;
  };
}

// Terminal types
export interface TerminalSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  cursorBlink: boolean;
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorWidth: number;
  drawBoldTextInBrightColors: boolean;
  fastScrollSensitivity: number;
  fontLigatures: boolean;
  letterSpacing: number;
  lineHeight: number;
  rendererType: 'canvas' | 'dom';
  scrollback: number;
  scrollSensitivity: number;
  theme: {
    background: string;
    foreground: string;
    cursor: string;
    cursorAccent: string;
    selection: string;
    black: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
    brightBlack: string;
    brightRed: string;
    brightGreen: string;
    brightYellow: string;
    brightBlue: string;
    brightMagenta: string;
    brightCyan: string;
    brightWhite: string;
  };
}

// Project types
export interface ProjectSettings {
  name: string;
  rootPath: string;
  type: 'web' | 'node' | 'python' | 'go' | 'rust' | 'other';
  buildCommand?: string;
  startCommand?: string;
  testCommand?: string;
  envFiles?: string[];
  excludePatterns?: string[];
  includePatterns?: string[];
  debugConfigurations?: Record<string, any>;
  extensions?: {
    recommendations?: string[];
  };
  settings?: Record<string, any>;
}

// User settings
export interface UserSettings {
  appearance: {
    theme: 'system' | 'light' | 'dark';
    colorScheme: 'system' | 'light' | 'dark';
    fontSize: number;
    fontFamily: string;
    lineHeight: number;
    tabSize: number;
    insertSpaces: boolean;
    wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
    minimap: {
      enabled: boolean;
      showSlider: 'always' | 'mouseover';
    };
  };
  editor: EditorSettings;
  terminal: TerminalSettings;
  files: {
    autoSave: 'off' | 'afterDelay' | 'onFocusChange' | 'onWindowChange';
    autoSaveDelay: number;
    hotExit: 'off' | 'onExit' | 'onExitAndWindowClose';
    restoreWindows: boolean;
    restoreWindowsCount: number;
    defaultFileEncoding: string;
    encoding: 'utf8' | 'utf16le' | 'latin1' | 'ascii' | 'base64' | 'hex' | 'binary';
    eol: '\n' | '\r\n';
    trimTrailingWhitespace: boolean;
    insertFinalNewline: boolean;
    trimFinalNewlines: boolean;
    autoGuessEncoding: boolean;
  };
  workbench: {
    startupEditor: 'welcomePage' | 'newUntitledFile' | 'welcomePageInEmptyWorkbench' | 'none';
    enablePreview: boolean;
    enablePreviewFromQuickOpen: boolean;
    enablePreviewFromCodeNavigation: boolean;
    editor: {
      enablePreview: boolean;
      enablePreviewFromQuickOpen: boolean;
      enablePreviewFromCodeNavigation: boolean;
    };
    tree: {
      indent: number;
      renderIndentGuides: 'none' | 'onHover' | 'always';
      showIcons: boolean;
      showDecorations: boolean;
      showErrors: boolean;
      showWarnings: boolean;
      showInfos: boolean;
      showHints: boolean;
    };
  };
  search: {
    exclude: Record<string, boolean>;
    useIgnoreFiles: boolean;
    useGlobalIgnoreFiles: boolean;
    useParentIgnoreFiles: boolean;
    followSymlinks: boolean;
    smartCase: boolean;
    useIgnoreFilesByDefault: boolean;
    useGlobalIgnoreFilesByDefault: boolean;
    useParentIgnoreFilesByDefault: boolean;
  };
  debug: {
    console: {
      closeOnEnd: boolean;
      fontSize: number;
      fontFamily: string;
      lineHeight: number;
      wordWrap: boolean;
      scrollback: number;
    };
    openDebug: 'neverOpen' | 'openOnSessionStart' | 'openOnFirstSessionStart';
    showInStatusBar: 'never' | 'always' | 'onFirstSessionStart';
    allowBreakpointsEverywhere: boolean;
    showSubSessionsInToolBar: boolean;
    showInlineBreakpointCandidates: boolean;
    showBreakpointsInOverviewRuler: boolean;
    showInlineValues: boolean;
    internalConsoleOptions: 'neverOpen' | 'openOnSessionStart' | 'openOnFirstSessionStart';
    console: {
      closeOnEnd: boolean;
      fontSize: number;
      fontFamily: string;
      lineHeight: number;
      wordWrap: boolean;
      scrollback: number;
    };
    toolbar: {
      show: boolean;
      location: 'floating' | 'docked' | 'hidden';
    };
  };
  terminal: {
    integrated: {
      fontFamily: string;
      fontSize: number;
      fontWeight: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
      fontWeightBold: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
      lineHeight: number;
      letterSpacing: number;
      cursorBlinking: boolean;
      cursorStyle: 'block' | 'underline' | 'bar' | 'line';
      cursorWidth: number;
      drawBoldTextInBrightColors: boolean;
      fastScrollSensitivity: number;
      fontLigatures: boolean;
      rendererType: 'canvas' | 'dom' | 'experimentalWebgl';
      scrollback: number;
      wordSeparator: string;
      rightClickBehavior: 'default' | 'copyPaste' | 'selectWord' | 'selectWordAndCopy';
      copyOnSelection: boolean;
      cursorInactiveStyle: 'outline' | 'block' | 'bar' | 'underline' | 'line' | 'none';
      cursorInactiveBackground: string;
      cursorInactiveForeground: string;
      cursorInactiveOpacity: number;
      cursorStyleInactive: 'outline' | 'block' | 'bar' | 'underline' | 'line' | 'none';
      cursorWidthInactive: number;
      drawBoldTextInBrightColors: boolean;
      fastScrollSensitivity: number;
      fontLigatures: boolean;
      rendererType: 'canvas' | 'dom' | 'experimentalWebgl';
      scrollback: number;
      wordSeparator: string;
      rightClickBehavior: 'default' | 'copyPaste' | 'selectWord' | 'selectWordAndCopy';
      copyOnSelection: boolean;
      cursorInactiveStyle: 'outline' | 'block' | 'bar' | 'underline' | 'line' | 'none';
      cursorInactiveBackground: string;
      cursorInactiveForeground: string;
      cursorInactiveOpacity: number;
      cursorStyleInactive: 'outline' | 'block' | 'bar' | 'underline' | 'line' | 'none';
      cursorWidthInactive: number;
    };
  };
  extensions: {
    autoUpdate: boolean;
    autoCheckUpdates: boolean;
    ignoreRecommendations: boolean;
    showRecommendationsOnlyOnDemand: boolean;
    closeExtensionDetailsOnViewChange: boolean;
    confirmBeforeUninstalling: boolean;
    enableProposedApi: string[];
    galleryUrl: string;
    ignoreRecommendations: boolean;
    showRecommendationsOnlyOnDemand: boolean;
  };
  update: {
    mode: 'none' | 'manual' | 'start' | 'default';
    enableWindowsBackgroundUpdates: boolean;
    showReleaseNotes: boolean;
  };
  telemetry: {
    enableTelemetry: boolean;
    enableCrashReporter: boolean;
  };
  security: {
    allowedUNCHosts: string[];
    allowedUNCHostRegexes: string[];
    allowedUNCHostRegexesWithPorts: string[];
    allowedUNCHostsWithPorts: string[];
    allowedUNCHostsWithSSL: string[];
    allowedUNCHostRegexesWithSSL: string[];
    allowedUNCHostsWithSSLAndPorts: string[];
    allowedUNCHostRegexesWithSSLAndPorts: string[];
    allowedUNCHostsWithSSLAndPortsAndPath: string[];
    allowedUNCHostRegexesWithSSLAndPortsAndPath: string[];
    allowedUNCHostsWithSSLAndPortsAndPathAndQuery: string[];
    allowedUNCHostRegexesWithSSLAndPortsAndPathAndQuery: string[];
    allowedUNCHostsWithSSLAndPortsAndPathAndQueryAndFragment: string[];
    allowedUNCHostRegexesWithSSLAndPortsAndPathAndQueryAndFragment: string[];
    allowedUNCHostsWithSSLAndPortsAndPathAndQueryAndFragmentAndUserInfo: string[];
    allowedUNCHostRegexesWithSSLAndPortsAndPathAndQueryAndFragmentAndUserInfo: string[];
    allowedUNCHostsWithSSLAndPortsAndPathAndQueryAndFragmentAndUserInfoAndProtocol: string[];
    allowedUNCHostRegexesWithSSLAndPortsAndPathAndQueryAndFragmentAndUserInfoAndProtocol: string[];
  };
  window: {
    title: string;
    titleBarStyle: 'native' | 'custom';
    nativeTabs: boolean;
    nativeFullScreen: boolean;
    autoLockCommandPalette: boolean;
    clickThroughInactive: boolean;
    closeWhenEmpty: boolean;
    commandPalettePreserveInput: boolean;
    customMenuBarAltFocus: boolean;
    dialogStyle: 'native' | 'custom';
    doubleClickIconToClose: boolean;
    enableMenuBarMnemonics: boolean;
    fullscreen: {
      autoHideMenuBar: boolean;
      hideTabs: boolean;
      hideToolbar: boolean;
      hideStatusBar: boolean;
      hideActivityBar: boolean;
      hideSideBar: boolean;
      hidePanel: boolean;
      hideZenModeTabs: boolean;
      hideZenModeStatusBar: boolean;
      hideZenModeActivityBar: boolean;
      hideZenModeSideBar: boolean;
      hideZenModePanel: boolean;
      hideZenModeBreadcrumbs: boolean;
      hideZenModeTabs: boolean;
      hideZenModeStatusBar: boolean;
      hideZenModeActivityBar: boolean;
      hideZenModeSideBar: boolean;
      hideZenModePanel: boolean;
      hideZenModeBreadcrumbs: boolean;
    };
    fullscreenWarning: boolean;
    menuBarVisibility: 'default' | 'visible' | 'toggle' | 'hidden';
    nativeFullScreen: boolean;
    openFilesInNewWindow: 'on' | 'off' | 'default';
    openFoldersInNewWindow: 'on' | 'off' | 'default';
    openWithoutArgumentsInNewWindow: 'on' | 'off';
    restoreWindows: 'all' | 'folders' | 'one' | 'none';
    restoreFullscreen: boolean;
    showDevToolsOnStart: boolean;
    showFullPathInTitle: boolean;
    showProjectNameInTitle: boolean;
    showProjectPathInTitle: boolean;
    showRelativePathInTitle: boolean;
    showWindowControls: boolean;
    smoothScrollingWorkaround: boolean;
    title: string;
    titleBarStyle: 'native' | 'custom';
    zoomLevel: number;
  };
  workbench: {
    colorTheme: string;
    iconTheme: string | null;
    productIconTheme: string | null;
    preferredDarkColorTheme: string;
    preferredHighContrastColorTheme: string;
    preferredHighContrastLightColorTheme: string;
    preferredLightColorTheme: string;
    autoDetectColorScheme: boolean;
    autoDetectHighContrast: boolean;
    autoDetectIconTheme: boolean;
    autoDetectProductIconTheme: boolean;
    autoDetectTheme: boolean;
    colorCustomizations: Record<string, any>;
    editor: {
      autoSave: 'off' | 'afterDelay' | 'onFocusChange' | 'onWindowChange';
      autoSaveDelay: number;
      cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
      cursorSmoothCaretAnimation: boolean;
      cursorStyle: 'line' | 'block' | 'underline' | 'line-thin' | 'block-outline' | 'underline-thin' | 'block-outline' | 'underline-thin';
      cursorWidth: number;
      fontFamily: string;
      fontSize: number;
      fontWeight: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
      letterSpacing: number;
      lineHeight: number;
      lineNumbers: 'on' | 'off' | 'relative' | 'interval' | ((lineNumber: number) => string);
      lineNumbersMinChars: number;
      linkedEditing: boolean;
      matchBrackets: boolean;
      minimap: {
        enabled: boolean;
        maxColumn: number;
        renderCharacters: boolean;
        scale: number;
        showSlider: 'always' | 'mouseover';
        side: 'right' | 'left';
        size: 'proportional' | 'fill' | 'fit';
      };
      mouseWheelScrollSensitivity: number;
      mouseWheelZoom: boolean;
      multiCursorModifier: 'altKey' | 'ctrlKey' | 'metaKey';
      occurrencesHighlight: boolean;
      overviewRulerBorder: boolean;
      padding: {
        top: number;
        bottom: number;
      };
      quickSuggestions: {
        comments: boolean | 'inline' | 'above' | 'below';
        strings: boolean | 'inline' | 'above' | 'below';
        other: boolean | 'inline' | 'above' | 'below';
      };
      renderControlCharacters: boolean;
      renderIndentGuides: boolean;
      renderLineHighlight: 'all' | 'line' | 'none' | 'gutter';
      renderWhitespace: 'none' | 'boundary' | 'selection' | 'trailing' | 'all';
      roundedSelection: boolean;
      scrollBeyondLastColumn: number;
      scrollBeyondLastLine: boolean;
      scrollbar: {
        alwaysConsumeMouseWheel: boolean;
        arrowSize: number;
        handleMouseWheel: boolean;
        horizontal: 'auto' | 'visible' | 'hidden' | 'auto';
        horizontalScrollbarSize: number;
        scrollByPage: boolean;
        useShadows: boolean;
        vertical: 'auto' | 'visible' | 'hidden' | 'auto';
        verticalScrollbarSize: number;
      };
      selectOnLineNumbers: boolean;
      selectionClipboard: boolean;
      selectionHighlight: boolean;
      showFoldingControls: 'always' | 'mouseover';
      showUnused: boolean;
      smoothScrolling: boolean;
      suggest: {
        filterGraceful: boolean;
        hideIcons: boolean;
        insertMode: 'insert' | 'replace';
        localityBonus: boolean;
        maxVisibleSuggestions: number;
        onTriggerCharacters: boolean;
        shareSuggestSelections: boolean;
        showClasses: boolean;
        showColors: boolean;
        showConstants: boolean;
        showConstructors: boolean;
        showDeprecated: boolean;
        showEnums: boolean;
        showEvents: boolean;
        showFields: boolean;
        showFiles: boolean;
        showFolders: boolean;
        showFunctions: boolean;
        showIcons: boolean;
        showInterfaces: boolean;
        showIssues: boolean;
        showKeywords: boolean;
        showMethods: boolean;
        showModules: boolean;
        showOperators: boolean;
        showProperties: boolean;
        showReferences: boolean;
        showSnippets: boolean;
        showStructs: boolean;
        showTypeParameters: boolean;
        showUnits: boolean;
        showUsers: boolean;
        showValues: boolean;
        showVariables: boolean;
        showWords: boolean;
        snippetsPreventQuickSuggestions: boolean;
      };
      suggestOnTriggerCharacters: boolean;
      tabCompletion: 'on' | 'off' | 'onlySnippets';
      tabSize: number;
      useTabStops: boolean;
      wordBasedSuggestions: 'off' | 'matchingDocuments' | 'matchingDocumentSymbols' | 'allDocuments' | 'allDocumentSymbols';
      wordSeparators: string;
      wordWrap: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
      wordWrapColumn: number;
      wrappingIndent: 'none' | 'same' | 'indent' | 'deepIndent';
    };
  };
}
