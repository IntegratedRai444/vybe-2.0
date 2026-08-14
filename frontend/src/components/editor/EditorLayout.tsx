import React, { useState, useRef, useCallback } from 'react';
import { SplitPane } from './SplitPane';
import { CodeEditor } from './CodeEditor';
import { DebugMonacoEditor } from './DebugMonacoEditor';
import { EditorTabs } from './EditorTabs';
import { EditorToolbar } from './EditorToolbar';
import { EditorSettings } from './EditorSettings';
import { FormatSettings } from './FormatSettings';
import { InlineCompletion } from './InlineCompletion';

type EditorSettingsType = {
  fontSize?: number;
  theme?: string;
  wordWrap?: boolean;
  minimap?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;
  formatOnSave?: boolean;
  tabSize?: number;
  insertSpaces?: boolean;
  lineNumbers?: 'on' | 'off' | 'relative';
};

// Define types for our editor tabs
export type EditorTab = {
  id: string;
  name: string;
  content: string;
  language: string;
  isDirty?: boolean;
};

// Define props for EditorLayout component
export interface EditorLayoutProps {
  initialFiles?: EditorTab[];
  initialActiveFileId?: string;
  onSave?: (file: EditorTab) => void;
  onFileChange?: (file: EditorTab) => void;
  className?: string;
}

export const EditorLayout: React.FC<EditorLayoutProps> = ({
  initialFiles = [
    { 
      id: 'file1', 
      name: 'App.tsx', 
      content: '// Start coding...\n', 
      language: 'typescript',
      isDirty: false
    },
    { 
      id: 'file2', 
      name: 'styles.css', 
      content: '/* Your styles here */', 
      language: 'css',
      isDirty: false
    },
  ],
  initialActiveFileId = 'file1',
  onSave,
  onFileChange,
  className = ''
}) => {
  const [files, setFiles] = useState<EditorTab[]>(initialFiles);
  const [activeFileId, setActiveFileId] = useState<string>(initialActiveFileId);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isDebugMode, setIsDebugMode] = useState<boolean>(false);
  const [settings, setSettings] = useState<EditorSettingsType>({
    fontSize: 14,
    theme: 'vs-dark',
    wordWrap: true,
    minimap: true,
    autoSave: false,
    autoSaveInterval: 1000,
    formatOnSave: true,
    tabSize: 2,
    insertSpaces: true,
    lineNumbers: 'on'
  });
  
  const editorRef = useRef<any>(null);

  // Get active file data
  const activeFile = files.find(file => file.id === activeFileId) || files[0];
  
  // Handle code changes
  const handleCodeChange = useCallback((value: string = '') => {
    const updatedFiles = files.map(file => 
      file.id === activeFileId 
        ? { ...file, content: value, isDirty: true } 
        : file
    );
    
    setFiles(updatedFiles);
    
    const currentFile = updatedFiles.find(f => f.id === activeFileId);
    if (currentFile && onFileChange) {
      onFileChange(currentFile);
    }
  }, [activeFileId, files, onFileChange]);

  // Handle tab changes
  const handleTabChange = useCallback((fileId: string) => {
    setActiveFileId(fileId);
  }, []);

  // Handle tab close
  const handleTabClose = useCallback((fileId: string) => {
    if (files.length <= 1) return; // Don't close the last tab
    
    const newFiles = files.filter(file => file.id !== fileId);
    setFiles(newFiles);
    
    // If we're closing the active tab, switch to another one
    if (fileId === activeFileId && newFiles.length > 0) {
      const newActiveFileId = newFiles[0].id;
      setActiveFileId(newActiveFileId);
    }
  }, [activeFileId, files]);

  // Format code
  const formatCode = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('editor', 'editor.action.formatDocument');
    }
  }, []);

  // Save current file
  const handleSave = useCallback(() => {
    const fileToSave = files.find(f => f.id === activeFileId);
    if (fileToSave) {
      const updatedFile = { ...fileToSave, isDirty: false };
      const updatedFiles = files.map(f => 
        f.id === activeFileId ? updatedFile : f
      );
      
      setFiles(updatedFiles);
      
      if (onSave) {
        onSave(updatedFile);
      }
    }
  }, [activeFileId, files, onSave]);

  // Toggle debug mode
  const toggleDebugMode = useCallback(() => {
    setIsDebugMode(prev => !prev);
  }, []);

  // Handle settings change
  const handleSettingsChange = useCallback((newSettings: Partial<EditorSettingsType>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  }, []);

  if (!activeFile) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">No file is currently open</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-gray-100 dark:bg-gray-900 ${className}`}>
      {/* Toolbar */}
      <EditorToolbar 
        onSave={handleSave}
        onFormat={formatCode}
        onToggleSettings={() => setShowSettings(!showSettings)}
        onToggleDebug={toggleDebugMode}
        isDebugging={isDebugMode}
        className="border-b border-gray-200 dark:border-gray-700"
      />

      {/* Editor Tabs */}
      <EditorTabs 
        files={files}
        activeFile={activeFileId}
        onTabChange={handleTabChange}
        onTabClose={handleTabClose}
        className="border-b border-gray-200 dark:border-gray-700"
      />

      {/* Main Editor Area */}
      <div className="flex-1 overflow-hidden">
        <SplitPane
          left={
            <div className="h-full">
              {isDebugMode ? (
                <DebugMonacoEditor
                  code={activeFile.content}
                  language={activeFile.language}
                  onChange={handleCodeChange}
                  editorRef={editorRef}
                />
              ) : (
                <CodeEditor
                  value={activeFile.content}
                  language={activeFile.language}
                  onChange={handleCodeChange}
                  path={activeFile.name}
                  options={{
                    ...settings,
                    readOnly: false,
                    automaticLayout: true,
                  }}
                />
              )}
              
              {/* Inline Code Completion */}
              <InlineCompletion 
                value={activeFile.content}
                onComplete={(suggestion) => {
                  // Handle code completion
                  handleCodeChange(activeFile.content + suggestion);
                }}
              />
            </div>
          }
          right={
            <div className="h-full bg-white dark:bg-gray-800 p-4 overflow-auto">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                {activeFile.name} Preview
              </h3>
              <div className="prose dark:prose-invert max-w-none">
                {activeFile.language === 'markdown' ? (
                  // Render markdown preview
                  <p className="text-gray-700 dark:text-gray-300">
                    Markdown preview would be rendered here
                  </p>
                ) : (
                  <pre className="text-xs p-4 bg-gray-100 dark:bg-gray-700 rounded overflow-auto">
                    <code className="text-gray-800 dark:text-gray-200">
                      {activeFile.content}
                    </code>
                  </pre>
                )}
              </div>
            </div>
          }
        />
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Editor Settings
              </h2>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
                aria-label="Close settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <EditorSettings 
              isOpen={showSettings}
              settings={settings}
              onSettingsChange={handleSettingsChange}
              onClose={() => setShowSettings(false)}
            />
            
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Formatting Options
              </h3>
              <FormatSettings 
                settings={{
                  tabSize: settings.tabSize || 2,
                  insertSpaces: settings.insertSpaces !== false,
                }}
                onChange={(formatSettings) => {
                  handleSettingsChange({
                    tabSize: formatSettings.tabSize,
                    insertSpaces: formatSettings.insertSpaces,
                  });
                }}
              />
            </div>
            
            <div className="mt-6 pt-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  // Apply settings
                  setShowSettings(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Default export for backward compatibility
export const EditorLayout = EditorLayout;

// Named exports
export { EditorLayout };
export default EditorLayout;
