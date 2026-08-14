import React, { useRef, useState } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { useTheme } from "../../theme/ThemeProvider";
import { FiZap, FiCheck, FiX } from "react-icons/fi";
import * as monaco from "monaco-editor";

interface CursorPosition {
  lineNumber: number;
  column: number;
}

interface AICodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  path?: string;
  onSave?: () => void;
  cursorPosition?: CursorPosition;
  setCursorPosition?: (position: CursorPosition) => void;
}

export const AICodeEditor: React.FC<AICodeEditorProps> = ({
  value,
  onChange,
  language = "typescript",
  path,
  onSave,
  cursorPosition,
  setCursorPosition,
}) => {
  const { theme } = useTheme();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [suggestions, setSuggestions] = useState<
    Array<{ id: string; text: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const decorationIds = useRef<string[]>([]);

  useEffect(() => {
    if (cursorPosition && editorRef.current) {
      const { lineNumber, column } = cursorPosition;
      const position = { lineNumber, column };
      editorRef.current.setPosition(position);
      editorRef.current.revealPositionInCenter(position);
    }
  }, [cursorPosition]);

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;

    // Add command for AI suggestions
    editor.addAction({
      id: "ai-suggest",
      label: "Get AI Suggestions",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space],
      contextMenuGroupId: "ai",
      contextMenuOrder: 1,
      run: async () => {
        const selection = editor.getSelection();
        if (selection) {
          const selectedText =
            editor.getModel()?.getValueInRange(selection) || "";
          await getAISuggestions(selectedText, selection);
        }
      },
    });

    // Add command for saving
    if (onSave) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () =>
        onSave(),
      );
    }
  };

  const getAISuggestions = async (selectedText: string, selection: any) => {
    try {
      setIsLoading(true);
      // Call your AI API here
      // const response = await fetchAICompletion(selectedText);
      // setSuggestions(response.suggestions);

      // Mock response for now
      setTimeout(() => {
        setSuggestions([
          { id: "1", text: "// TODO: Implement this function" },
          { id: "2", text: "// FIXME: Handle edge cases" },
          { id: "3", text: "// OPTIMIZE: Improve performance" },
        ]);
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
      setIsLoading(false);
    }
  };

  const applySuggestion = (suggestion: string) => {
    if (editorRef.current) {
      const selection = editorRef.current.getSelection();
      editorRef.current.executeEdits("ai-suggestion", [
        {
          range: selection,
          text: suggestion,
          forceMoveMarkers: true,
        },
      ]);
      setSuggestions([]);
    }
  };

  return (
    <div className="relative h-full">
      <Editor
        height="100%"
        defaultLanguage={language}
        value={value}
        onChange={(value) => onChange(value || "")}
        onMount={handleEditorDidMount}
        theme={theme.colors.background === "#0f172a" ? "vs-dark" : "light"}
        path={path}
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          wordWrap: "on",
          automaticLayout: true,
          tabSize: 2,
          suggestOnTriggerCharacters: true,
          quickSuggestions: {
            other: true,
            comments: true,
            strings: true,
          },
        }}
      />

      {/* AI Suggestions Panel */}
      {suggestions.length > 0 && (
        <div className="absolute bottom-4 right-4 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center">
            <FiZap className="text-yellow-500 mr-2" />
            <span className="font-medium">AI Suggestions</span>
            <button
              onClick={() => setSuggestions([])}
              className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <FiX size={18} />
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700"
                onClick={() => applySuggestion(suggestion.text)}
              >
                <div className="flex items-start">
                  <div className="flex-1 font-mono text-sm">
                    {suggestion.text.split("\n").map((line, i) => (
                      <div key={i} className="whitespace-pre">
                        {line}
                      </div>
                    ))}
                  </div>
                  <button
                    className="text-green-500 hover:text-green-600 ml-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      applySuggestion(suggestion.text);
                    }}
                  >
                    <FiCheck size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          AI is thinking...
        </div>
      )}
    </div>
  );
};

// Exports
export { AICodeEditor };
