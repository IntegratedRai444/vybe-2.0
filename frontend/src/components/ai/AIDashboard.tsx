import React, { useState, useRef } from 'react';
import { AIPanel } from './AIPanel';
import { AICodeEditor } from './AICodeEditor';
import { CompletionBubble } from './CompletionBubble';
import { ModelSelector } from './ModelSelector';
import { AILayout } from './AILayout';
import { useAI } from './AIProvider';
import * as monaco from 'monaco-editor';

type Position = {
  top: number;
  left: number;
};

type CompletionSuggestion = {
  label: string;
  detail?: string;
  documentation?: string;
  kind: monaco.languages.CompletionItemKind;
  insertText: string;
};

type Position = {
  top: number;
  left: number;
};

interface AIDashboardProps {
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  onClose?: () => void;
}

export const AIDashboard: React.FC<AIDashboardProps> = ({
  initialCode = '// Start coding here...',
  onCodeChange,
  onClose,
}) => {
  const [code, setCode] = useState(initialCode);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionPosition, setCompletionPosition] = useState<Position>({ top: 0, left: 0 });
  const { model, setModel } = useAI();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [suggestions] = useState<CompletionSuggestion[]>([
    {
      label: 'console.log',
      detail: 'Log to console',
      documentation: 'Outputs a message to the web console.',
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: 'console.log(${1:value})',
    },
    // Add more suggestions as needed
  ]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    onCodeChange?.(newCode);
  };

  const handleEditorMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    
    // Set up code completion
    editor.onDidChangeCursorPosition(() => {
      const position = editor.getPosition();
      if (position) {
        const coords = editor.getScrolledVisiblePosition(position);
        if (coords) {
          setCompletionPosition({
            top: coords.top + 20,
            left: coords.left + 20,
          });
          setShowCompletion(true);
        }
      }
    });
  };

  return (
    <AILayout>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">AI Code Assistant</h2>
          <div className="flex items-center space-x-2">
            <div className="w-48">
              <ModelSelector 
                value={model}
                onChange={(newModel) => newModel && setModel(newModel)}
              />
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label="Close AI Dashboard"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto relative">
            <div className="h-full">
              <AICodeEditor
                value={code}
                onChange={handleCodeChange}
                language="typescript"
                onMount={handleEditorMount}
              />
            </div>
            
            {showCompletion && editorRef.current && (
              <div 
                className="absolute z-10"
                style={{
                  top: `${completionPosition.top}px`,
                  left: `${completionPosition.left}px`,
                }}
              >
                <div className="bg-white dark:bg-gray-800 shadow-lg rounded-md p-2 border border-gray-200 dark:border-gray-700">
                  {suggestions.map((suggestion, index) => (
                    <div 
                      key={index}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                      onClick={() => {
                        const editor = editorRef.current;
                        if (editor) {
                          const selection = editor.getSelection();
                          if (selection) {
                            editor.executeEdits('ai-completion', [{
                              range: selection,
                              text: suggestion.insertText,
                              forceMoveMarkers: true
                            }]);
                          }
                        }
                        setShowCompletion(false);
                      }}
                    >
                      <div className="font-mono text-sm">{suggestion.label}</div>
                      {suggestion.detail && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {suggestion.detail}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="w-1/3 border-l border-gray-200 dark:border-gray-700">
            <AIPanel 
              initialView="chat"
              onClose={() => setShowCompletion(false)}
            />
          </div>
        </div>
      </div>
    </AILayout>
  );
};

export default AIDashboard;
