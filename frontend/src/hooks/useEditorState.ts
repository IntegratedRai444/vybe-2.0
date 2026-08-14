import { useCallback, useContext, useEffect } from "react";
import { EditorContext } from "../contexts/EditorContext";
import { useProject } from "./useProject";
import { useFileSystem } from "./useFileSystem";

// Re-export EditorState type from context
export type { EditorState } from "../contexts/EditorContext";

// All EditorState types are now imported from EditorContext
interface EditorState {
  emptySelectionClipboard: boolean;
  fixedOverflowWidgets: boolean;
  folding: boolean;
  foldingHighlight: boolean;
  foldingStrategy: "auto" | "indentation";
  fontLigatures: boolean | string;
  formatOnPaste: boolean;
  formatOnType: boolean;
  glyphMargin: boolean;
  guides: {
    bracketPairs: boolean | "active";
    bracketPairsHorizontal: boolean | "active";
    highlightActiveBracketPair: boolean;
    indentation: boolean;
    highlightActiveIndentation: boolean | "always" | "line";
  };
  hideCursorInOverviewRuler: boolean;
  links: boolean;
  lineDecorationsWidth: number | string;
  lineHeight: number;
  lineNumbersMinChars: number;
  matchBrackets: "always" | "never" | "near";
  mouseWheelScrollSensitivity: number;
  mouseWheelZoom: boolean;
  multiCursorModifier: "altKey" | "metaKey" | "ctrlKey" | "shiftKey";
  multiCursorPaste: "spread" | "full";
  occurrencesHighlight:
    | boolean
    | "singleFile"
    | "multiFile"
    | "multiFileNoSkipTrivia";
  overviewRulerBorder: boolean;
  overviewRulerLanes: number;
  padding: {
    top?: number;
    bottom?: number;
  };
  quickSuggestions:
    | boolean
    | {
        comments?: boolean | "inline" | "above" | "below";
        strings?: boolean | "inline" | "above" | "below";
        other?: boolean | "inline" | "above" | "below";
      };
  quickSuggestionsDelay: number;
  readOnly: boolean;
  renderControlCharacters: boolean;
  renderFinalNewline: boolean;
  renderLineHighlight: "all" | "line" | "none" | "gutter";
  renderLineHighlightOnlyWhenFocus: boolean;
  renderValidationDecorations: "editable" | "on" | "off";
  renderWhitespace: "none" | "boundary" | "selection" | "trailing" | "all";
  revealHorizontalRightPadding: number;
  roundedSelection: boolean;
  rulers: (number | { column: number; color?: string })[];
  scrollBeyondLastColumn: number;
  scrollBeyondLastLine: boolean;
  scrollbar: {
    alwaysConsumeMouseWheel: boolean;
    arrowSize: number;
    handleMouseWheel: boolean;
    horizontal: "auto" | "visible" | "hidden";
    horizontalScrollbarSize: number;
    horizontalSliderSize: number;
    useShadows: boolean;
    vertical: "auto" | "visible" | "hidden";
    verticalScrollbarSize: number;
    verticalSliderSize: number;
  };
  selectOnLineNumbers: boolean;
  selectionClipboard: boolean;
  selectionHighlight: boolean;
  showFoldingControls: "always" | "mouseover";
  smoothScrolling: boolean;
  suggestOnTriggerCharacters: boolean;
  suggestSelection:
    | "first"
    | "recentlyUsed"
    | "recentlyUsedByPrefix"
    | ((model: any, position: any, items: any[]) => number);
  tabCompletion: "on" | "off" | "onlySnippets";
  trimAutoWhitespace: boolean;
  useTabStops: boolean;
  wordSeparators: string;
  wordWrap: "off" | "on" | "wordWrapColumn" | "bounded";
  wordWrapBreakAfterCharacters: string;
  wordWrapBreakBeforeCharacters: string;
  wordWrapColumn: number;
  wrappingIndent: "none" | "same" | "indent" | "deepIndent";
  wrappingStrategy: "simple" | "advanced";
}

interface UseEditorStateProps {
  initialContent?: string;
  language?: string;
  readOnly?: boolean;
  theme?: string;
  onContentChange?: (content: string) => void;
  onCursorPositionChange?: (position: {
    lineNumber: number;
    column: number;
  }) => void;
  onSelectionChange?: (
    selection: {
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
    } | null,
  ) => void;
  onSave?: (content: string) => void;
  onError?: (error: Error) => void;
}

export const useEditorState = () => {
  const editor = useContext(EditorContext);
  const { currentFile, openFile } = useProject();
  const { readFile, writeFile } = useFileSystem();

  // Load file content when currentFile changes
  useEffect(() => {
    const loadFile = async () => {
      if (currentFile?.path) {
        try {
          const content = await readFile(currentFile.path);
          editor.setContent(content);

          // Set language based on file extension
          const extension = currentFile.path.split(".").pop()?.toLowerCase();
          if (extension) {
            const languageMap: Record<string, string> = {
              js: "javascript",
              jsx: "javascript",
              ts: "typescript",
              tsx: "typescript",
              json: "json",
              html: "html",
              css: "css",
              scss: "scss",
              md: "markdown",
              py: "python",
              java: "java",
              c: "c",
              cpp: "cpp",
              cs: "csharp",
              go: "go",
              php: "php",
              rb: "ruby",
              rs: "rust",
              swift: "swift",
              kt: "kotlin",
              sh: "shell",
              yaml: "yaml",
              yml: "yaml",
              xml: "xml",
            };
            editor.setLanguage(languageMap[extension] || "plaintext");
          }
        } catch (error) {
          console.error("Error loading file:", error);
        }
      }
    };

    loadFile();
  }, [currentFile, readFile]);

  // Save file handler
  const saveFile = useCallback(async () => {
    if (currentFile?.path) {
      try {
        await writeFile(currentFile.path, editor.content);
        // You might want to update the file's last modified time in the project state
        // This would be handled by the useProject hook's saveFile method
      } catch (error) {
        console.error("Error saving file:", error);
      }
    }
  }, [currentFile, editor.content, writeFile]);

  // Format document handler
  const formatDocument = useCallback(() => {
    // This would typically use the editor's format document command
    // Implementation depends on the editor instance
    console.log("Formatting document...");
  }, []);

  // Update editor options
  const updateOptions = useCallback(
    (options: Partial<EditorState>) => {
      editor.updateOptions(options);
    },
    [editor],
  );

  // Reset to initial content
  const reset = useCallback(() => {
    editor.setContent("");
  }, [editor]);

  return {
    ...editor,
    saveFile,
    formatDocument,
    updateOptions,
    reset,
    // Event handlers for the Monaco editor
    editorDidMount: (editor: any, monaco: any) => {
      // Store editor instance if needed
      console.log("Editor mounted");
    },

    editorWillMount: (monaco: any) => {
      // Configure monaco editor before mounting
      console.log("Editor will mount");
    },

    onChange: (value: string | undefined, event: any) => {
      // handleContentChange(value || '');
    },

    onCursorPositionChange: (event: any) => {
      // handleCursorPositionChange(event);
    },

    onSelectionChange: (event: any) => {
      handleSelectionChange(event);
    },
  };
};

export default useEditorState;
