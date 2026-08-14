// ======================
// Core Components
// ======================
// Main Layout
export { default as MainLayout } from "./layout/MainLayout";

// ======================
// AI Components
// ======================
export * from "./ai";

// ======================
// Editor Components
// ======================
export * from "./editor";

// ======================
// Common Components
// ======================
export * from "./common";

// ======================
// File Explorer Components
// ======================
export { default as EnhancedFileTree } from "./FileExplorer/EnhancedFileTree";
export { default as FileContextMenu } from "./FileExplorer/FileContextMenu";
export { default as FileIcon } from "./FileExplorer/FileIcon";

// ======================
// UI Components
// ======================
export * from "./ui";

// ======================
// Utility Components
// ======================
export { default as CommandPalette } from "./CommandPalette";
export { default as DeploymentPanel } from "./DeploymentPanel";
export { default as FileTabs } from "./FileTabs";
export { default as FolderPicker } from "./FolderPicker";
export { default as LoadingSpinner } from "./LoadingSpinner";

// ======================
// Settings Components
// ======================
export * from "./Settings";

// ======================
// Toast Notifications
// ======================
import { Toaster } from "./ui/toast";
export { Toaster };

// ======================
// Theme Provider
// ======================
export { ThemeProvider } from "./theme-provider";
