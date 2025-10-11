// src/components/CodeEditor.tsx
import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import { CompletionBubble } from "./CompletionBubble";

type Props = {
  filePath: string;
  content: string;
  onContentChange?: (content: string) => void;
  isCollaborating?: boolean;
  onCollaborationEdit?: (operation: string, position: number, content?: string, length?: number) => void;
  onCollaborationCursor?: (position: { line: number; column: number }, selection?: { start: number; end: number }) => void;
};

export type EditorSearchOptions = {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  regex?: boolean;
};

export type CodeEditorHandle = {
  findNext: (query: string, options?: EditorSearchOptions) => void;
  replaceOne: (find: string, replace: string, options?: EditorSearchOptions) => void;
  replaceAll: (find: string, replace: string, options?: EditorSearchOptions) => void;
};

export const CodeEditor = forwardRef<CodeEditorHandle, Props>(({ 
  filePath,
  content,
  onContentChange,
  isCollaborating = false,
  onCollaborationEdit,
  onCollaborationCursor,
}, ref) => {
  const [language, setLanguage] = useState<string>("plaintext");
  const [bubble, setBubble] = useState<{ text: string; range: any } | null>(null);
  const editorRef = useRef<any>(null);
  const monaco = useMonaco();
  const [intellisenseEnabled] = useState(true);
  const [autoSaveEnabled] = useState(true);
  const [autoSaveInterval] = useState(2000); // 2 seconds
  // Removed unused lastSaved state
  const [isDirty, setIsDirty] = useState(false);
  const [minimapEnabled] = useState(true);

  useEffect(() => {
    const ext = filePath.split(".").pop() ?? "";
    setLanguage(ext);
  }, [filePath]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSaveEnabled || !isDirty) return;

    const timer = setTimeout(() => {
      if (onContentChange && editorRef.current) {
        const content = editorRef.current.getValue();
        onContentChange(content);
            // Auto-save completed
        setIsDirty(false);
      }
    }, autoSaveInterval);

    return () => clearTimeout(timer);
  }, [isDirty, autoSaveEnabled, autoSaveInterval, onContentChange]);

  const handleEditorDidMount = (_editor: any) => {
    editorRef.current = _editor;
    
    // Configure editor options
    _editor.updateOptions({
      minimap: {
        enabled: minimapEnabled,
        side: 'right',
        showSlider: 'always',
        renderCharacters: true,
        maxColumn: 120
      },
      folding: {
        enabled: true,
        showFoldingControls: 'always',
        unfoldOnClickAfterEnd: false
      },
      wordWrap: 'on',
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      renderControlCharacters: false,
      scrollBeyondLastLine: false,
      automaticLayout: true
    });
    
    // Configure IntelliSense
    if (monaco && intellisenseEnabled) {
      setupIntelliSense(_editor);
    }

    // Add collaborative editing support
    if (isCollaborating) {
          // Handle cursor position changes
          _editor.onDidChangeCursorPosition((e: any) => {
        if (onCollaborationCursor) {
          const position = e.position;
          const selection = _editor.getSelection();
          onCollaborationCursor(
            { line: position.lineNumber, column: position.column },
            selection ? { start: selection.startOffset, end: selection.endOffset } : undefined
          );
        }
      });

          // Handle content changes
          _editor.onDidChangeModelContent((e: any) => {
        // Mark as dirty for auto-save
        setIsDirty(true);
        
        if (onCollaborationEdit) {
          e.changes.forEach((change: any) => {
            const range = change.range;
            const text = change.text;
            const rangeLength = change.rangeLength;
            
            if (text === '') {
              // Deletion
              onCollaborationEdit('delete', range.startOffset, '', rangeLength);
            } else if (rangeLength === 0) {
              // Insertion
              onCollaborationEdit('insert', range.startOffset, text);
            } else {
              // Replacement
              onCollaborationEdit('replace', range.startOffset, text, rangeLength);
            }
          });
        }
      });
    }
  };

  const setupIntelliSense = (_editor: any) => {
    if (!monaco) return;

    // Register completion item provider
    monaco.languages.registerCompletionItemProvider(language, {
      provideCompletionItems: async (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        try {
          const suggestions = await getIntelliSenseSuggestions(model.getValue(), position, language);
          return {
            suggestions: suggestions.map((suggestion: any) => ({
              label: suggestion.label,
              kind: suggestion.kind || monaco.languages.CompletionItemKind.Text,
              insertText: suggestion.insertText || suggestion.label,
              detail: suggestion.detail,
              documentation: suggestion.documentation,
              range: range,
              sortText: suggestion.sortText || suggestion.label,
            }))
          };
        } catch (error) {
          console.error('IntelliSense error:', error);
          return { suggestions: [] };
        }
      }
    });

    // Register hover provider
    monaco.languages.registerHoverProvider(language, {
      provideHover: async (model: any, position: any) => {
        try {
          const hoverInfo = await getHoverInfo(model.getValue(), position, language);
          if (hoverInfo) {
            return {
              range: hoverInfo.range,
              contents: [
                { value: `**${hoverInfo.title}**` },
                { value: hoverInfo.content }
              ]
            };
          }
        } catch (error) {
          console.error('Hover error:', error);
        }
        return null;
      }
    });

    // Register signature help provider
    monaco.languages.registerSignatureHelpProvider(language, {
      signatureHelpTriggerCharacters: ['(', ','],
      provideSignatureHelp: async (model: any, position: any) => {
        try {
          const signatureHelp = await getSignatureHelp(model.getValue(), position, language);
          if (signatureHelp) {
            return {
              value: {
                signatures: signatureHelp.signatures,
                activeSignature: signatureHelp.activeSignature || 0,
                activeParameter: signatureHelp.activeParameter || 0,
              },
              dispose: () => {}
            };
          }
        } catch (error) {
          console.error('Signature help error:', error);
        }
        return null;
      }
    });

    // Register code action provider
    monaco.languages.registerCodeActionProvider(language, {
      provideCodeActions: async (model: any, range: any) => {
        try {
          const codeActions = await getCodeActions(model.getValue(), range, language);
          return {
            actions: codeActions.map((action: any) => ({
              title: action.title,
              kind: action.kind || 'quickfix',
              edit: action.edit,
              isPreferred: action.isPreferred || false,
            })),
            dispose: () => {}
          };
        } catch (error) {
          console.error('Code actions error:', error);
          return { actions: [], dispose: () => {} };
        }
      }
    });

    // Register definition provider
    monaco.languages.registerDefinitionProvider(language, {
      provideDefinition: async (model: any, position: any) => {
        try {
          const definition = await getDefinition(model.getValue(), position, language);
          if (definition) {
            return {
              uri: monaco.Uri.file(definition.uri),
              range: definition.range
            };
          }
        } catch (error) {
          console.error('Definition error:', error);
        }
        return [];
      }
    });

    // Register reference provider
    monaco.languages.registerReferenceProvider(language, {
      provideReferences: async (model: any, position: any) => {
        try {
          const references = await getReferences(model.getValue(), position, language);
          return references.map((ref: any) => ({
            uri: monaco.Uri.file(ref.uri),
            range: ref.range
          }));
        } catch (error) {
          console.error('References error:', error);
          return [];
        }
      }
    });
  };

  // IntelliSense API functions
  const getIntelliSenseSuggestions = async (content: string, position: any, language: string) => {
    const response = await fetch('http://127.0.0.1:8000/intellisense/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        position,
        language,
        filePath
      })
    });
    return response.json();
  };

  const getHoverInfo = async (content: string, position: any, language: string) => {
    const response = await fetch('http://127.0.0.1:8000/intellisense/hover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        position,
        language,
        filePath
      })
    });
    return response.json();
  };

  const getSignatureHelp = async (content: string, position: any, language: string) => {
    const response = await fetch('http://127.0.0.1:8000/intellisense/signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        position,
        language,
        filePath
      })
    });
    return response.json();
  };

  const getCodeActions = async (content: string, range: any, language: string) => {
    const response = await fetch('http://127.0.0.1:8000/intellisense/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        range,
        language,
        filePath
      })
    });
    return response.json();
  };

  const getDefinition = async (content: string, position: any, language: string) => {
    const response = await fetch('http://127.0.0.1:8000/intellisense/definition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        position,
        language,
        filePath
      })
    });
    return response.json();
  };

  const getReferences = async (content: string, position: any, language: string) => {
    const response = await fetch('http://127.0.0.1:8000/intellisense/references', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        position,
        language,
        filePath
      })
    });
    return response.json();
  };

  const requestCompletion = async () => {
    if (!editorRef.current || !monaco) return;
    const model = editorRef.current.getModel();
    const position = editorRef.current.getPosition();
    const lineContent = model.getLineContent(position.lineNumber);
    const prompt = `Complete the following code. Show only the continuation, no explanations.\n${lineContent}`;
    const resp = await fetch(
      "http://127.0.0.1:8000/generate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          file_path: filePath,
          model: null,
          top_k: 5,
        }),
      }
    ).then((r) => r.json());

    const suggestion = resp.answer.trim();
    const range = new monaco.Range(
      position.lineNumber,
      position.column,
      position.lineNumber,
      position.column
    );
    setBubble({ text: suggestion, range });
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
      if (e.ctrlKey && e.key === " ") {
        e.preventDefault();
        requestCompletion();
      }
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

  const onChange = (value?: string) => {
    onContentChange?.(value ?? "");
  };

  // Helpers for search/replace
  const buildRegex = (query: string, options?: EditorSearchOptions) => {
    if (!options?.regex) {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(escaped, options?.caseSensitive ? "g" : "gi");
    }
    try {
      return new RegExp(query, options?.caseSensitive ? "g" : "gi");
    } catch {
      return new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), options?.caseSensitive ? "g" : "gi");
    }
  };

  useImperativeHandle(ref, () => ({
    findNext: (query: string, options?: EditorSearchOptions) => {
      if (!editorRef.current || !query) return;
      const editor = editorRef.current;
      const model = editor.getModel();
      const text = model.getValue();
      const regex = buildRegex(query, options);
      // Start search from current cursor
      const pos = editor.getPosition();
      const offset = model.getOffsetAt(pos);
      regex.lastIndex = offset;
      const m = regex.exec(text) || (regex.lastIndex = 0, regex.exec(text));
      if (m) {
        const start = m.index;
        const end = m.index + m[0].length;
        const startPos = model.getPositionAt(start);
        const endPos = model.getPositionAt(end);
        editor.setSelection({ startLineNumber: startPos.lineNumber, startColumn: startPos.column, endLineNumber: endPos.lineNumber, endColumn: endPos.column });
        editor.revealPositionInCenter(startPos);
      }
    },
    replaceOne: (find: string, replace: string, options?: EditorSearchOptions) => {
      if (!editorRef.current || !find) return;
      const editor = editorRef.current;
      const model = editor.getModel();
      const sel = editor.getSelection();
      const selectedText = model.getValueInRange(sel);
      const regex = buildRegex(find, options);
      if (regex.test(selectedText)) {
        editor.executeEdits("replace-one", [{ range: sel, text: selectedText.replace(regex, replace) }]);
      } else {
        // If selection doesn't match, find next and replace
        (ref as any)?.current?.findNext(find, options);
        const sel2 = editor.getSelection();
        const txt2 = model.getValueInRange(sel2);
        if (buildRegex(find, options).test(txt2)) {
          editor.executeEdits("replace-one", [{ range: sel2, text: txt2.replace(buildRegex(find, options), replace) }]);
        }
      }
    },
    replaceAll: (find: string, replace: string, options?: EditorSearchOptions) => {
      if (!editorRef.current || !find) return;
      const editor = editorRef.current;
      const model = editor.getModel();
      const text = model.getValue();
      const regex = buildRegex(find, options);
      const newText = text.replace(regex, replace);
      if (newText !== text) {
        const fullRange = model.getFullModelRange();
        editor.executeEdits("replace-all", [{ range: fullRange, text: newText }]);
      }
    }
  }));

  return (
    <div className="relative h-full">
      <Editor
        height="100%"
        language={language}
        value={content}
        onMount={handleEditorDidMount}
        onChange={onChange}
        theme="vs-dark"
        options={{
          fontSize: 14,
          automaticLayout: true,
          minimap: { enabled: false },
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
  );
});