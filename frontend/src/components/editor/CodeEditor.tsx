import React, { useRef, useEffect } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { useTheme } from '../../theme/ThemeProvider';

export interface CodeEditorProps {
  value: string;
  language?: string;
  onChange?: (value: string) => void;
  onSave?: () => void;
  readOnly?: boolean;
  path?: string;
  height?: string | number;
}

const DEFAULT_LANGUAGE = 'typescript';

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  language = DEFAULT_LANGUAGE,
  onChange,
  onSave,
  readOnly = false,
  path = 'file.ts',
  height = '100%',
}) => {
  const { theme } = useTheme();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);

  // Set up editor theme and settings
  useEffect(() => {
    if (monacoRef.current) {
      const isDark = document.documentElement.classList.contains('dark');
      monacoRef.current.editor.defineTheme('custom-theme', {
        base: isDark ? 'vs-dark' : 'vs',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': isDark ? '#1e1e1e' : '#ffffff',
          'editor.foreground': isDark ? '#d4d4d4' : '#1e1e1e',
          'editor.lineHighlightBackground': isDark ? '#2d2d2d' : '#f5f5f5',
          'editor.selectionBackground': isDark ? '#264f78' : '#add6ff',
          'editor.lineNumbers.foreground': isDark ? '#858585' : '#2a2a2a',
        },
      });
      
      if (editorRef.current) {
        monacoRef.current.editor.setTheme('custom-theme');
      }
    }
  }, [theme]);

  // Set up keybindings and editor events
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register custom commands
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => {
        onSave?.();
      },
      '!suggestWidgetVisible && !inSnippetMode'
    );

    // Set up IntelliSense providers
    setupIntelliSense(monaco);
  };

  const handleChange: OnChange = (value = '') => {
    onChange?.(value);
  };

  // Set up IntelliSense providers
  const setupIntelliSense = (monaco: typeof import('monaco-editor')) => {
    // Register a completion item provider for TypeScript/JavaScript
    monaco.languages.registerCompletionItemProvider(language, {
      provideCompletionItems: (model, position) => {
              // Get the text until the position (commented out as it's not used)
        // const textUntilPosition = model.getValueInRange({
        //   startLineNumber: 1,
        //   startColumn: 1,
        //   endLineNumber: position.lineNumber,
        //   endColumn: position.column,
        // });

        // Simple word completion
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        // Add your custom suggestions here
        const suggestions: monaco.languages.CompletionItem[] = [
          {
            label: 'log',
            kind: monaco.languages.CompletionItemKind.Function,
            documentation: 'Console log',
            insertText: 'console.log(${1:value})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          },
          {
            label: 'warn',
            kind: monaco.languages.CompletionItemKind.Function,
            documentation: 'Console warn',
            insertText: 'console.warn(${1:value})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          },
          {
            label: 'error',
            kind: monaco.languages.CompletionItemKind.Function,
            documentation: 'Console error',
            insertText: 'console.error(${1:value})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          },
        ];

        return { suggestions };
      },
    });

    // Register hover provider
    monaco.languages.registerHoverProvider(language, {
      provideHover: (model, position) => {
        const word = model.getWordAtPosition(position);
        if (word) {
          // Add hover information based on the word
          return {
            contents: [
              { value: `**${word.word}**` },
              { value: 'Type: `any`\n\nDocumentation: Add your documentation here' },
            ],
          };
        }
        return null;
      },
    });
  };

  return (
    <div style={{ height, width: '100%' }}>
      <Editor
        height={height}
        defaultLanguage={language}
        language={language}
        theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'light'}
        value={value}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          fontSize: 14,
          wordWrap: 'on',
          folding: true,
          lineNumbers: 'on',
          tabSize: 2,
          automaticLayout: true,
          suggestOnTriggerCharacters: true,
          formatOnPaste: true,
          formatOnType: true,
          renderWhitespace: 'selection',
          autoIndent: 'full',
          quickSuggestions: {
            other: true,
            comments: true,
            strings: true,
          },
        }}
        path={path}
      />
    </div>
  );
};

export default CodeEditor;
