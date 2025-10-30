import React, { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";

type Props = {
  filePath: string;
  onContentChange?: (content: string) => void;
  onCursorChange?: (line: number, column: number) => void;
  theme?: "dark" | "light";
};

export const MonacoCodeEditor: React.FC<Props> = ({
  filePath,
  onContentChange,
  onCursorChange,
  theme = "dark"
}) => {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("plaintext");
  const [loading, setLoading] = useState(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  useEffect(() => {
    if (!filePath) return;
    loadFile();
  }, [filePath]);

  const loadFile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/file/content?path=${encodeURIComponent(filePath)}`);
      const data = await response.json();
      setCode(data.content || "");

      const ext = filePath.split('.').pop()?.toLowerCase() || "";
      setLanguage(getLanguageFromExtension(ext));
    } catch (error) {
      console.error("Failed to load file:", error);
    } finally {
      setLoading(false);
    }
  };

  const getLanguageFromExtension = (ext: string): string => {
    const langMap: Record<string, string> = {
      'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
      'py': 'python', 'java': 'java', 'cpp': 'cpp', 'c': 'c', 'cs': 'csharp',
      'css': 'css', 'scss': 'scss', 'html': 'html', 'json': 'json',
      'md': 'markdown', 'yml': 'yaml', 'yaml': 'yaml', 'xml': 'xml',
      'sql': 'sql', 'sh': 'shell', 'bash': 'shell', 'go': 'go', 'rs': 'rust',
      'php': 'php', 'rb': 'ruby', 'kt': 'kotlin', 'swift': 'swift'
    };
    return langMap[ext] || 'plaintext';
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveFile();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
      editor.getAction('actions.find').run();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, () => {
      editor.getAction('editor.action.startFindReplaceAction').run();
    });

    editor.onDidChangeCursorPosition((e: any) => {
      onCursorChange?.(e.position.lineNumber, e.position.column);
    });

    monaco.languages.registerCompletionItemProvider(language, {
      provideCompletionItems: async (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        try {
          const response = await fetch("http://127.0.0.1:8000/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: `Complete this code: ${model.getLineContent(position.lineNumber)}`,
              file_path: filePath,
              top_k: 3
            }),
          });
          const data = await response.json();

          return {
            suggestions: [{
              label: 'AI Suggestion',
              kind: monaco.languages.CompletionItemKind.Text,
              insertText: data.answer,
              range: range
            }]
          };
        } catch (error) {
          return { suggestions: [] };
        }
      }
    });

    updateDiagnostics();
  };

  const updateDiagnostics = async () => {
    if (!editorRef.current || !monacoRef.current) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/lint?path=${encodeURIComponent(filePath)}`);
      const data = await response.json();

      const markers = data.diagnostics.map((d: any) => ({
        startLineNumber: d.line + 1,
        startColumn: d.column + 1,
        endLineNumber: d.line + 1,
        endColumn: d.column + 10,
        message: d.message,
        severity: d.severity === "error" ? 8 : 4,
      }));

      monacoRef.current.editor.setModelMarkers(
        editorRef.current.getModel(),
        "diagnostics",
        markers
      );
    } catch (error) {
      console.error("Failed to get diagnostics:", error);
    }
  };

  const saveFile = async () => {
    try {
      await fetch("http://127.0.0.1:8000/file/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, content: code }),
      });
    } catch (error) {
      console.error("Failed to save file:", error);
    }
  };

  const onChange = (value?: string) => {
    const newValue = value || "";
    setCode(newValue);
    onContentChange?.(newValue);

    setTimeout(() => {
      if (newValue === code) saveFile();
    }, 2000);

    setTimeout(updateDiagnostics, 1000);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-800">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <Editor
        height="100%"
        language={language}
        value={code}
        onMount={handleEditorDidMount}
        onChange={onChange}
        theme={theme === "dark" ? "vs-dark" : "vs"}
        options={{
          fontSize: 14,
          fontFamily: "Consolas, Monaco, 'Courier New', monospace",
          automaticLayout: true,
          minimap: { enabled: true },
          wordWrap: "on",
          lineNumbers: "on",
          folding: true,
          autoIndent: "full",
          formatOnPaste: true,
          formatOnType: true,
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: "on",
          tabCompletion: "on",
          multiCursorModifier: "ctrlCmd",
          selectionHighlight: true,
          occurrencesHighlight: "singleFile",
          codeLens: true,
          colorDecorators: true,
          links: true,
          contextmenu: true,
          mouseWheelZoom: true,
          smoothScrolling: true,
          cursorBlinking: "blink",
          renderWhitespace: "selection",
          renderControlCharacters: true,
          // renderIndentGuides: true, // Not supported in this Monaco version
          // highlightActiveIndentGuide: true, // Not supported in this Monaco version
          rulers: [80, 120],
          scrollBeyondLastLine: false,
          fixedOverflowWidgets: true
        }}
      />
    </div>
  );
};