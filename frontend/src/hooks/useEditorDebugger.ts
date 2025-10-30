import { useEffect, useRef, useCallback } from 'react';
import * as monaco from 'monaco-editor';
import { useDebugger } from '../contexts/DebuggerContext';

interface UseEditorDebuggerProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  filePath: string;
}

export const useEditorDebugger = ({ editor, filePath }: UseEditorDebuggerProps) => {
  const { 
    isDebugging, 
    isPaused, 
    currentLine, 
    breakpoints, 
    addBreakpoint, 
    removeBreakpoint,
    variables
  } = useDebugger();
  
  const decorationsRef = useRef<string[]>([]);
  const hoverProviderRef = useRef<monaco.IDisposable | null>(null);
  const currentLineDecorationRef = useRef<string | null>(null);

  // Update breakpoints in the editor
  useEffect(() => {
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    // Clear existing breakpoint decorations
    const currentDecorations = decorationsRef.current;
    decorationsRef.current = [];

    if (isDebugging) {
      // Add breakpoint decorations
      const breakpointDecorations: monaco.editor.IModelDeltaDecoration[] = [];
      
      // Add breakpoints for the current file
      const fileBreakpoints = breakpoints[filePath] || [];
      
      fileBreakpoints.forEach(bp => {
        breakpointDecorations.push({
          range: new monaco.Range(bp.line, 1, bp.line, 1),
          options: {
            isWholeLine: true,
            className: 'debug-breakpoint',
            glyphMarginClassName: 'debug-breakpoint-glyph',
            glyphMarginHoverMessage: {
              value: bp.condition ? `Breakpoint (${bp.condition})` : 'Breakpoint',
            },
          },
        });
      });

      // Apply new decorations
      decorationsRef.current = editor.deltaDecorations(
        currentDecorations,
        breakpointDecorations
      );
    } else {
      // Clear all decorations when not debugging
      editor.deltaDecorations(currentDecorations, []);
    }
  }, [editor, filePath, breakpoints, isDebugging]);

  // Handle gutter clicks for breakpoints
  useEffect(() => {
    if (!editor || !isDebugging) return;

    const disposable = editor.onMouseDown(async (e) => {
      // Check if the click was in the gutter (where breakpoints appear)
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const lineNumber = e.target.position.lineNumber;
        
        // Check if there's already a breakpoint at this line
        const existingBreakpoint = (breakpoints[filePath] || []).find(
          (bp) => bp.line === lineNumber
        );

        if (existingBreakpoint) {
          // Remove the breakpoint
          await removeBreakpoint(filePath, lineNumber);
        } else {
          // Add a new breakpoint
          await addBreakpoint(filePath, lineNumber);
        }
      }
    });

    return () => {
      disposable.dispose();
    };
  }, [editor, filePath, breakpoints, isDebugging, addBreakpoint, removeBreakpoint]);

  // Highlight current execution line when paused
  useEffect(() => {
    if (!editor || !isDebugging || !isPaused || !currentLine) {
      // Clear current line highlight if it exists
      if (currentLineDecorationRef.current) {
        editor?.deltaDecorations([currentLineDecorationRef.current], []);
        currentLineDecorationRef.current = null;
      }
      return;
    }

    const newDecorations = [
      {
        range: new monaco.Range(currentLine, 1, currentLine, 1),
        options: {
          isWholeLine: true,
          className: 'debug-current-line',
          glyphMarginClassName: 'debug-current-line-glyph',
        },
      },
    ];

    // Clear previous decoration if it exists
    const previousDecorations = currentLineDecorationRef.current 
      ? [currentLineDecorationRef.current] 
      : [];
    
    const [decorationId] = editor.deltaDecorations(
      previousDecorations,
      newDecorations
    );
    
    currentLineDecorationRef.current = decorationId;
    
    // Scroll to the current line
    editor.revealLineInCenter(currentLine);
  }, [editor, isDebugging, isPaused, currentLine]);

  // Register hover provider for variable inspection
  useEffect(() => {
    if (!editor || !isDebugging || !isPaused) {
      // Clean up hover provider if it exists
      if (hoverProviderRef.current) {
        hoverProviderRef.current.dispose();
        hoverProviderRef.current = null;
      }
      return;
    }

    // Register hover provider for variable inspection
    const hoverProvider: monaco.languages.HoverProvider = {
      provideHover: async (model, position) => {
        // Only show variable hovers when debugging and paused
        if (!isDebugging || !isPaused) return null;

        const word = model.getWordAtPosition(position);
        if (!word) return null;

        // Check if the word is a variable in the current scope
        const variableName = word.word;
        const variable = Object.values(variables).flat().find(
          (v: any) => v.name === variableName
        );

        if (!variable) return null;

        return {
          contents: [
            { value: '**Variable**', isTrusted: true },
            { value: `**${variable.name}**: ${variable.value}` },
            variable.type && { value: `*Type: ${variable.type}*` },
          ].filter(Boolean) as monaco.IMarkdownString[],
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          },
        };
      },
    };

    // Register the hover provider
    hoverProviderRef.current = monaco.languages.registerHoverProvider(
      editor.getModel()?.getLanguageId() || 'plaintext',
      hoverProvider
    );

    return () => {
      if (hoverProviderRef.current) {
        hoverProviderRef.current.dispose();
        hoverProviderRef.current = null;
      }
    };
  }, [editor, isDebugging, isPaused, variables]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (editor && decorationsRef.current.length > 0) {
        editor.deltaDecorations(decorationsRef.current, []);
        decorationsRef.current = [];
      }
      
      if (hoverProviderRef.current) {
        hoverProviderRef.current.dispose();
        hoverProviderRef.current = null;
      }
      
      if (currentLineDecorationRef.current && editor) {
        editor.deltaDecorations([currentLineDecorationRef.current], []);
        currentLineDecorationRef.current = null;
      }
    };
  }, [editor]);
};
