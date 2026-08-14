import React, { useRef, useEffect } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { useEditorDebugger } from "../../hooks/useEditorDebugger";
import { useDebounce } from "use-debounce";

interface DebugMonacoEditorProps {
  filePath: string;
  language: string;
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  options?: any;
  theme?: string;
}

export const DebugMonacoEditor: React.FC<DebugMonacoEditorProps> = ({
  filePath,
  language,
  value,
  onChange,
  onSave,
  options = {},
  theme = "vs-dark",
}) => {
  const editorRef = useRef<any>(null);
  const [debouncedValue] = useDebounce(value, 500);

  // Initialize debugger integration
  useEditorDebugger({
    editor: editorRef.current,
    filePath,
  });

  // Handle editor mount
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave?.();
    });

    // Add custom keybindings for debugger
    editor.addCommand(monaco.KeyCode.F5, () => {
      // Handle continue/start debugging
      console.log("F5 - Continue/Start debugging");
    });

    editor.addCommand(monaco.KeyCode.F9, () => {
      // Toggle breakpoint at current line
      const position = editor.getPosition();
      if (position) {
        console.log(`Toggle breakpoint at line ${position.lineNumber}`);
      }
    });
  };

  // Handle editor change
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  // Update editor options with debug-specific settings
  const editorOptions = {
    ...options,
    glyphMargin: true, // Required for breakpoints
    lineNumbersMinChars: 4,
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    fontSize: 14,
    tabSize: 2,
    wordWrap: "on" as const,
    folding: true,
    lineDecorationsWidth: 10,
    contextmenu: true,
    scrollbar: {
      vertical: "auto",
      horizontal: "auto",
    },
  };

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage={language}
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme={theme}
        options={editorOptions}
        path={filePath}
        saveViewState={true}
      />
    </div>
  );
};

// Default export for backward compatibility
export const DebugMonacoEditor = DebugMonacoEditor;

// Named exports
export { DebugMonacoEditor };
export default DebugMonacoEditor;
