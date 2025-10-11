import React, { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { CompletionBubble } from "./CompletionBubble";

type Props = {
  filePath: string;
  onContentChange?: (content: string) => void;
};

export const MonacoEditor: React.FC<Props> = ({ filePath, onContentChange }) => {
  const [code, setCode] = useState<string>("");
  const [language, setLanguage] = useState<string>("plaintext");
  const [bubble, setBubble] = useState<{ text: string; range: any } | null>(null);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  useEffect(() => {
    if (!filePath) return;
    fetch(`http://127.0.0.1:8000/file/content?path=${encodeURIComponent(filePath)}`)
      .then((r) => r.json())
      .then((data) => {
        setCode(data.content || "");
        const ext = filePath.split(".").pop() ?? "";
        let lang = "plaintext";
        switch (ext) {
          case "js": lang = "javascript"; break;
          case "ts": lang = "typescript"; break;
          case "py": lang = "python"; break;
          case "jsx": lang = "javascript"; break;
          case "tsx": lang = "typescript"; break;
          case "html": lang = "html"; break;
          case "css": lang = "css"; break;
          case "json": lang = "json"; break;
          case "md": lang = "markdown"; break;
          case "yml":
          case "yaml": lang = "yaml"; break;
          default: lang = "plaintext";
        }
        setLanguage(lang);
      })
      .catch(console.error);
  }, [filePath]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Add custom keybindings
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      requestCompletion();
    });
  };

  const requestCompletion = async () => {
    if (!editorRef.current) return;
    const model = editorRef.current.getModel();
    const position = editorRef.current.getPosition();
    const lineContent = model.getLineContent(position.lineNumber);
    
    const prompt = `Complete the following code. Show only the continuation, no explanations.\n${lineContent}`;
    
    try {
      const resp = await fetch("http://127.0.0.1:8000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          file_path: filePath,
          model: null,
          top_k: 5,
        }),
      }).then((r) => r.json());

      const suggestion = resp.answer.trim();
      const range = new monacoRef.current.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column
      );
      setBubble({ text: suggestion, range });
    } catch (error) {
      console.error("Completion error:", error);
    }
  };

  const acceptBubble = () => {
    if (!bubble || !editorRef.current) return;
    const editOp = {
      range: bubble.range,
      text: bubble.text,
      forceMoveMarkers: true,
    };
    editorRef.current.executeEdits("completion", [editOp]);
    setBubble(null);
  };

  const rejectBubble = () => setBubble(null);

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Tab" && bubble) {
        e.preventDefault();
        acceptBubble();
      }
      if (e.key === "Escape" && bubble) {
        e.preventDefault();
        rejectBubble();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [bubble]);

  // Auto-dismiss bubble after 5 seconds
  useEffect(() => {
    if (!bubble) return;
    const timer = setTimeout(() => setBubble(null), 5000);
    return () => clearTimeout(timer);
  }, [bubble]);

  const onChange = (value?: string) => {
    const newValue = value ?? "";
    setCode(newValue);
    onContentChange?.(newValue);
    
    // Auto-save
    fetch("http://127.0.0.1:8000/file/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath, content: newValue }),
    }).catch(console.error);
  };

  // Real-time diagnostics
  useEffect(() => {
    if (!filePath || !editorRef.current || !monacoRef.current) return;

    const timer = setTimeout(() => {
      fetch(`http://127.0.0.1:8000/lint?path=${encodeURIComponent(filePath)}`)
        .then((r) => r.json())
        .then(({ diagnostics }) => {
          const markers = diagnostics.map((d: any) => ({
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
        })
        .catch(() => {});
    }, 1000);

    return () => clearTimeout(timer);
  }, [code, filePath]);

  const fileName = filePath.split(/[/\\]/).pop() || '';

  return (
    <div className="relative h-full flex flex-col">
      {/* File Header */}
      <div className="bg-gray-700 px-4 py-2 border-b border-gray-600 flex items-center">
        <span className="text-sm text-gray-300">{fileName}</span>
        <span className="ml-2 text-xs text-gray-500">({language})</span>
        <span className="ml-auto text-xs text-gray-500">Ctrl+Space for completion</span>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          value={code}
          onMount={handleEditorDidMount}
          onChange={onChange}
          theme="vs-dark"
          options={{
            fontSize: 14,
            automaticLayout: true,
            minimap: { enabled: false },
            wordWrap: "on",
            lineNumbers: "on",
            folding: true,

            autoIndent: "full",
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
        
        {bubble && (
          <CompletionBubble
            text={bubble.text}
            onAccept={acceptBubble}
            onReject={rejectBubble}
          />
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-gray-700 px-4 py-1 text-xs text-gray-400 border-t border-gray-600">
        {code.split('\n').length} lines • {code.length} characters • {language}
      </div>
    </div>
  );
};