import React, { useRef, useEffect, useCallback, useMemo } from "react";
import Editor, { OnMount, OnChange, BeforeMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { useTheme } from "@/theme/ThemeProvider";

export interface CodeEditorProps {
  /** The current value of the editor */
  value: string;
  /** The language of the editor content */
  language?: string;
  /** Callback when editor content changes */
  onChange?: (value: string) => void;
  /** Callback when editor is saved (Ctrl/Cmd + S) */
  onSave?: () => void;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Path of the file being edited (used for language detection) */
  path?: string;
  /** Height of the editor */
  height?: string | number;
  /** Width of the editor */
  width?: string | number;
  /** Additional editor options */
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  /** Class name for the container */
  className?: string;
  /** Callback when editor is mounted */
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
}

const DEFAULT_LANGUAGE = "typescript";

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  language = DEFAULT_LANGUAGE,
  onChange,
  onSave,
  readOnly = false,
  path = "file.ts",
  height = "100%",
  width = "100%",
  options = {},
  className = "",
  onMount,
}) => {
  const { theme } = useTheme();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);
  const subscription = useRef<monaco.IDisposable | null>(null);

  // Set up editor theme and settings
  const setupTheme = useCallback(
    (monacoInstance: typeof monaco) => {
      if (!monacoInstance) return;

      const isDark = document.documentElement.classList.contains("dark");

      // Define custom theme
      monacoInstance.editor.defineTheme("custom-theme", {
        base: isDark ? "vs-dark" : "vs",
        inherit: true,
        rules: [
          { token: "comment", foreground: "6A9955", fontStyle: "italic" },
          { token: "keyword", foreground: "569CD6" },
          { token: "string", foreground: "CE9178" },
          { token: "number", foreground: "B5CEA8" },
          { token: "delimiter", foreground: "D4D4D4" },
        ],
        colors: {
          "editor.background": isDark ? "#1E1E1E" : "#FFFFFF",
          "editor.foreground": isDark ? "#D4D4D4" : "#1E1E1E",
          "editor.lineHighlightBackground": isDark ? "#2D2D2D" : "#F5F5F5",
          "editor.selectionBackground": isDark ? "#264F78" : "#ADD6FF",
          "editor.lineNumbers.foreground": isDark ? "#858585" : "#2A2A2A",
          "editorCursor.foreground": "#A6ACCD",
          "editor.lineHighlightBorder": isDark ? "#2D2D2D" : "#EEEEEE",
          "editor.selectionHighlightBorder": isDark ? "#515A6B" : "#C8C8C8",
          "editor.inactiveSelectionBackground": isDark ? "#3A3D41" : "#E5E5E5",
        },
      });

      // Set the theme
      monacoInstance.editor.setTheme("custom-theme");
    },
    [theme],
  );

  // Set up keybindings and editor events
  const handleEditorDidMount: OnMount = useCallback(
    (editor, monacoInstance) => {
      editorRef.current = editor;
      monacoRef.current = monacoInstance;

      // Set up theme
      setupTheme(monacoInstance);

      // Register save command (Ctrl/Cmd + S)
      editor.addCommand(
        monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS,
        () => {
          onSave?.();
        },
        "!suggestWidgetVisible && !inSnippetMode && !editorReadonly",
      );

      // Set up resize observer for the editor container
      const resizeObserver = new ResizeObserver(() => {
        editor.layout();
      });

      // Start observing the editor container
      const editorContainer = editor.getDomNode();
      if (editorContainer) {
        resizeObserver.observe(editorContainer);
      }

      // Set up IntelliSense providers
      setupIntelliSense(monacoInstance);

      // Call the onMount callback if provided
      onMount?.(editor);

      // Clean up the resize observer on unmount
      return () => {
        resizeObserver.disconnect();
      };
    },
    [onSave, onMount, setupTheme, setupIntelliSense],
  );

  const handleChange: OnChange = useCallback(
    (value = "") => {
      onChange?.(value);
    },
    [onChange],
  );

  // Set up IntelliSense providers
  const setupIntelliSense = useCallback(
    (monacoInstance: typeof monaco) => {
      if (!monacoInstance || subscription.current) return;

      // Register a completion item provider
      const disposable =
        monacoInstance.languages.registerCompletionItemProvider(language, {
          provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };

            // Default suggestions
            const suggestions: monaco.languages.CompletionItem[] = [
              {
                label: "log",
                kind: monacoInstance.languages.CompletionItemKind.Function,
                documentation: "Console log",
                insertText: "console.log(${1:value})",
                insertTextRules:
                  monacoInstance.languages.CompletionItemInsertTextRule
                    .InsertAsSnippet,
                range,
              },
              {
                label: "warn",
                kind: monacoInstance.languages.CompletionItemKind.Function,
                documentation: "Console warning",
                insertText: "console.warn(${1:message})",
                insertTextRules:
                  monacoInstance.languages.CompletionItemInsertTextRule
                    .InsertAsSnippet,
                range,
              },
              {
                label: "error",
                kind: monacoInstance.languages.CompletionItemKind.Function,
                documentation: "Console error",
                insertText: "console.error(${1:error})",
                insertTextRules:
                  monacoInstance.languages.CompletionItemInsertTextRule
                    .InsertAsSnippet,
                range,
              },
              {
                label: "if",
                kind: monacoInstance.languages.CompletionItemKind.Keyword,
                documentation: "If statement",
                insertText: "if (${1:condition}) {\n\t$0\n}",
                insertTextRules:
                  monacoInstance.languages.CompletionItemInsertTextRule
                    .InsertAsSnippet,
                range,
              },
              {
                label: "function",
                kind: monacoInstance.languages.CompletionItemKind.Keyword,
                documentation: "Function declaration",
                insertText: "function ${1:name}(${2:params}) {\n\t$0\n}",
                insertTextRules:
                  monacoInstance.languages.CompletionItemInsertTextRule
                    .InsertAsSnippet,
                range,
              },
            ];

            return { suggestions };
          },
        });

      // Register hover provider
      const hoverProvider = monacoInstance.languages.registerHoverProvider(
        language,
        {
          provideHover: (model, position) => {
            const word = model.getWordAtPosition(position);
            if (word) {
              return {
                contents: [
                  { value: `**${word.word}**` },
                  {
                    value:
                      "Type: `any`\n\nDocumentation: Hover documentation not available",
                  },
                ],
              };
            }
            return null;
          },
        },
      );

      // Store the disposable to clean up later
      subscription.current = {
        dispose: () => {
          disposable.dispose();
          hoverProvider.dispose();
        },
      };
    },
    [language],
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      subscription.current?.dispose();
      editorRef.current?.dispose();
    };
  }, []);

  // Handle theme changes
  useEffect(() => {
    if (monacoRef.current) {
      setupTheme(monacoRef.current);
    }
  }, [theme, setupTheme]);

  const editorOptions =
    useMemo<monaco.editor.IStandaloneEditorConstructionOptions>(
      () => ({
        readOnly,
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        fontSize: 14,
        wordWrap: "on",
        folding: true,
        lineNumbers: "on",
        tabSize: 2,
        automaticLayout: true,
        suggestOnTriggerCharacters: true,
        formatOnPaste: true,
        formatOnType: true,
        renderWhitespace: "selection",
        autoIndent: "full",
        quickSuggestions: {
          other: true,
          comments: true,
          strings: true,
        },
        scrollbar: {
          vertical: "auto",
          horizontal: "auto",
        },
        ...options,
      }),
      [readOnly, options],
    );

  const loadingComponent = useMemo(
    () => (
      <div className="flex items-center justify-center h-full w-full bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse text-gray-400">Loading editor...</div>
      </div>
    ),
    [],
  );

  return (
    <div
      className={`monaco-editor-container ${className}`}
      style={{
        height: typeof height === "number" ? `${height}px` : height,
        width: typeof width === "number" ? `${width}px` : width,
        position: "relative",
      }}
    >
      <Editor
        height="100%"
        width="100%"
        defaultLanguage={language}
        language={language}
        theme="custom-theme"
        value={value}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        beforeMount={handleBeforeMount}
        path={path}
        options={editorOptions}
        loading={loadingComponent}
      />
    </div>
  );
};

// Handle editor before mount
const handleBeforeMount: BeforeMount = useCallback(
  (monacoInstance) => {
    monacoRef.current = monacoInstance;
    setupTheme(monacoInstance);
  },
  [setupTheme],
);

// Default export for backward compatibility
export const CodeEditor = CodeEditor;

// Named exports
export { CodeEditor };
export default CodeEditor;
