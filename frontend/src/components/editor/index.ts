// Core editor components
export { MonacoCodeEditor } from './MonacoCodeEditor';
export { DebugMonacoEditor } from './DebugMonacoEditor';
export { default as CodeEditor } from './CodeEditor';

// Editor utilities and settings
export { default as EditorSettings } from './EditorSettings';
export { default as EditorTabs } from './EditorTabs';
export { default as FormatSettings } from './FormatSettings';
export { default as InlineCompletion } from './InlineCompletion';

// Re-export Monaco editor types for convenience
export type { OnMount as EditorMountHandler, OnChange as EditorChangeHandler } from '@monaco-editor/react';

// Re-export the main Monaco editor as default
export { default as MonacoEditor } from './MonacoEditor';
