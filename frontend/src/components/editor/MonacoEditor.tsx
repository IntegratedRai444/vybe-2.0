// frontend/src/components/MonacoEditor.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import * as monaco from "monaco-editor";
import { Editor } from "@monaco-editor/react";
import * as api from "../../utils/api";

/*
interface LSPDiagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity: number; // 1=Error, 2=Warning, 3=Info, 4=Hint
  message: string;
  source: string;
  code?: string;
}
*/

interface LSPCompletionItem {
  label: string;
  kind: number;
  detail?: string;
  documentation?: string;
  insertText?: string;
  sortText?: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  language: string;
  filePath: string;
  theme?: string;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  onSave?: () => Promise<void>;
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
}

export const MonacoEditor: React.FC<Props> = ({
  value,
  onChange,
  language,
  filePath,
  theme = "vs-dark",
  options = {},
  onSave: _onSave,
  onMount,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [isLSPReady, setIsLSPReady] = useState(false);
  const documentVersion = useRef(1);

  // Language mapping for LSP
  const getLanguageId = (lang: string): string => {
    const mapping: Record<string, string> = {
      python: "python",
      javascript: "javascript",
      typescript: "typescript",
      jsx: "javascript",
      tsx: "typescript",
    };
    return mapping[lang] || lang;
  };

  // Start LSP server
  const startLSPServer = useCallback(async () => {
    try {
      const languageId = getLanguageId(language);
      const rootPath = filePath.split("/").slice(0, -1).join("/") || ".";

      const result = await api.startLSPServer(languageId, rootPath);
      if (result.success) {
        setIsLSPReady(true);
        console.log(`✅ LSP server started for ${languageId}`);
      }
    } catch (error) {
      console.error("❌ Failed to start LSP server:", error);
    }
  }, [language, filePath]);

  // Notify LSP about document events
  const notifyDocumentOpen = useCallback(async () => {
    if (!isLSPReady) return;

    try {
      await api.notifyLSPDocumentOpen(filePath, value, getLanguageId(language));
      console.log(`📄 Document opened: ${filePath}`);
    } catch (error) {
      console.error("Failed to notify document open:", error);
    }
  }, [isLSPReady, filePath, value, language]);

  const notifyDocumentChange = useCallback(
    async (content: string) => {
      if (!isLSPReady) return;

      try {
        documentVersion.current += 1;
        await api.notifyLSPDocumentChange(
          filePath,
          content,
          getLanguageId(language),
          documentVersion.current,
        );
      } catch (error) {
        console.error("Failed to notify document change:", error);
      }
    },
    [isLSPReady, filePath, language],
  );

  // LSP Completion Provider
  const createCompletionProvider = useCallback(
    (): monaco.languages.CompletionItemProvider => ({
      provideCompletionItems: async (_model, position) => {
        if (!isLSPReady) return { suggestions: [] };

        try {
          const result = await api.getLSPCompletions(
            filePath,
            position.lineNumber - 1, // LSP uses 0-based lines
            position.column - 1, // LSP uses 0-based columns
            getLanguageId(language),
          );

          const suggestions =
            result.completions?.map((item: LSPCompletionItem) => ({
              label: item.label,
              kind: item.kind || monaco.languages.CompletionItemKind.Text,
              detail: item.detail,
              documentation: item.documentation,
              insertText: item.insertText || item.label,
              sortText: item.sortText,
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column,
                endColumn: position.column,
              },
            })) || [];

          return { suggestions };
        } catch (error) {
          console.error("LSP completion error:", error);
          return { suggestions: [] };
        }
      },
    }),
    [isLSPReady, filePath, language],
  );

  // LSP Hover Provider
  const createHoverProvider = useCallback(
    (): monaco.languages.HoverProvider => ({
      provideHover: async (_model, position) => {
        if (!isLSPReady) return null;

        try {
          const result = await api.getLSPHover(
            filePath,
            position.lineNumber - 1,
            position.column - 1,
            getLanguageId(language),
          );

          if (result.hover) {
            return {
              contents: [{ value: result.hover }],
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column,
                endColumn: position.column,
              },
            };
          }
        } catch (error) {
          console.error("LSP hover error:", error);
        }

        return null;
      },
    }),
    [isLSPReady, filePath, language],
  );

  // LSP Definition Provider
  const createDefinitionProvider = useCallback(
    (): monaco.languages.DefinitionProvider => ({
      provideDefinition: async (_model, position) => {
        if (!isLSPReady) return null;

        try {
          const result = await api.getLSPDefinition(
            filePath,
            position.lineNumber - 1,
            position.column - 1,
            getLanguageId(language),
          );

          if (result.definition) {
            const def = result.definition;
            return {
              uri: monaco.Uri.parse(def.uri),
              range: {
                startLineNumber: def.range.start.line + 1,
                endLineNumber: def.range.end.line + 1,
                startColumn: def.range.start.character + 1,
                endColumn: def.range.end.character + 1,
              },
            };
          }
        } catch (error) {
          console.error("LSP definition error:", error);
        }

        return null;
      },
    }),
    [isLSPReady, filePath, language],
  );

  // LSP References Provider
  const createReferencesProvider = useCallback(
    (): monaco.languages.ReferenceProvider => ({
      provideReferences: async (_model, position) => {
        if (!isLSPReady) return [];

        try {
          const result = await api.getLSPReferences(
            filePath,
            position.lineNumber - 1,
            position.column - 1,
            getLanguageId(language),
          );

          return (
            result.references?.map((ref: any) => ({
              uri: monaco.Uri.parse(ref.uri),
              range: {
                startLineNumber: ref.range.start.line + 1,
                endLineNumber: ref.range.end.line + 1,
                startColumn: ref.range.start.character + 1,
                endColumn: ref.range.end.character + 1,
              },
            })) || []
          );
        } catch (error) {
          console.error("LSP references error:", error);
          return [];
        }
      },
    }),
    [isLSPReady, filePath, language],
  );

  // Update diagnostics display
  // Diagnostics functionality can be added later

  // Essential advanced editor options
  const enhancedOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    ...options,

    // Core advanced features
    minimap: { enabled: true },
    folding: true,
    foldingStrategy: "auto",
    showFoldingControls: "always",
    bracketPairColorization: { enabled: true },
    guides: {
      bracketPairs: true,
      indentation: true,
      highlightActiveIndentation: true,
    },

    // Multiple cursors
    multiCursorModifier: "ctrlCmd",

    // Inline diagnostics
    glyphMargin: true,
    lightbulb: { enabled: "on" as any },

    // Code lens
    codeLens: true,

    // Selection highlighting
    selectionHighlight: true,
    occurrencesHighlight: "singleFile",

    // Enhanced suggestions
    suggest: {
      showKeywords: true,
      showSnippets: true,
      showFunctions: true,
      showVariables: true,
      showClasses: true,
      showProperties: true,
    },
    quickSuggestions: {
      other: true,
      comments: false,
      strings: false,
    },

    // Parameter hints
    parameterHints: { enabled: true },

    // Auto-closing
    autoClosingBrackets: "always",
    autoClosingQuotes: "always",
    autoSurround: "languageDefined",
    formatOnPaste: true,
    formatOnType: true,

    // Visual enhancements
    renderWhitespace: "selection",
    // renderIndentGuides: true,
    rulers: [80, 120],
    wordWrap: "on",
    mouseWheelZoom: true,
    smoothScrolling: true,

    // Hover
    hover: { enabled: true, delay: 300 },

    // Basic styling
    fontSize: 14,
    fontFamily: "JetBrains Mono, Consolas, Monaco, monospace",
    lineHeight: 1.5,
    tabSize: 2,
    insertSpaces: true,
  };

  // Initialize editor
  const handleEditorDidMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;

      // Start LSP server
      startLSPServer();

      // Add change listener
      editor.onDidChangeModelContent(() => {
        const newValue = editor.getValue();
        onChange(newValue);
        notifyDocumentChange(newValue);
      });

      // Essential keyboard shortcuts
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG, () => {
        editor.getAction("editor.action.goToDeclaration")?.run();
      });

      editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.F12, () => {
        editor.getAction("editor.action.goToReferences")?.run();
      });

      editor.addCommand(monaco.KeyCode.F2, () => {
        editor.getAction("editor.action.rename")?.run();
      });

      // Multiple cursors
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD, () => {
        editor.getAction("editor.action.addSelectionToNextFindMatch")?.run();
      });

      // Line manipulation
      editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.DownArrow, () => {
        editor.getAction("editor.action.moveLinesDownAction")?.run();
      });

      editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.UpArrow, () => {
        editor.getAction("editor.action.moveLinesUpAction")?.run();
      });

      // Comments
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
        editor.getAction("editor.action.commentLine")?.run();
      });

      // Format
      editor.addCommand(
        monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
        () => {
          editor.getAction("editor.action.formatDocument")?.run();
        },
      );
    },
    [startLSPServer, onChange, notifyDocumentChange],
  );

  // Register providers when LSP becomes ready
  useEffect(() => {
    if (isLSPReady && editorRef.current) {
      const languageId = getLanguageId(language);

      monaco.languages.registerCompletionItemProvider(
        languageId,
        createCompletionProvider(),
      );
      monaco.languages.registerHoverProvider(languageId, createHoverProvider());
      monaco.languages.registerDefinitionProvider(
        languageId,
        createDefinitionProvider(),
      );
      monaco.languages.registerReferenceProvider(
        languageId,
        createReferencesProvider(),
      );

      notifyDocumentOpen();
    }
  }, [
    isLSPReady,
    language,
    createCompletionProvider,
    createHoverProvider,
    createDefinitionProvider,
    createReferencesProvider,
    notifyDocumentOpen,
  ]);

  return (
    <div className="relative h-full">
      {/* LSP Status Indicator */}
      <div className="absolute top-2 right-2 z-10">
        <div
          className={`px-2 py-1 rounded text-xs font-medium ${
            isLSPReady
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
          }`}
        >
          LSP: {isLSPReady ? "Ready" : "Starting..."}
        </div>
      </div>

      <Editor
        value={value}
        language={language}
        theme={theme}
        options={enhancedOptions}
        onMount={handleEditorDidMount}
      />
    </div>
  );
};

// Default export for backward compatibility
export const MonacoEditor = MonacoEditor;

// Named exports
export { MonacoEditor };
export default MonacoEditor;
