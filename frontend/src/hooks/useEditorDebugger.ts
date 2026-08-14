import { useEffect, useRef } from "react";
import * as monaco from "monaco-editor";

interface UseEditorDebuggerProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  filePath: string;
}

export const useEditorDebugger = ({
  editor,
  filePath,
}: UseEditorDebuggerProps) => {
  const breakpoints = useRef<Set<number>>(new Set());
  const isDebugging = useRef(false);

  // Initialize debugger when editor is available
  useEffect(() => {
    if (!editor) return;

    // Add breakpoint glyph click handler
    const disposable = editor.onMouseDown((e) => {
      if (e.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        return;
      }

      const lineNumber = e.target.position?.lineNumber;
      if (!lineNumber) return;

      // Toggle breakpoint
      if (breakpoints.current.has(lineNumber)) {
        breakpoints.current.delete(lineNumber);
        editor.deltaDecorations(
          [],
          [
            {
              range: new monaco.Range(lineNumber, 1, lineNumber, 1),
              options: { isWholeLine: false },
            },
          ],
        );
      } else {
        breakpoints.current.add(lineNumber);
        editor.deltaDecorations(
          [],
          [
            {
              range: new monaco.Range(lineNumber, 1, lineNumber, 1),
              options: {
                isWholeLine: true,
                className: "debug-breakpoint",
                glyphMarginClassName: "debug-breakpoint-glyph",
              },
            },
          ],
        );
      }
    });

    // Cleanup
    return () => {
      disposable.dispose();
    };
  }, [editor]);

  // Handle debugger commands
  const startDebugging = () => {
    if (!editor || isDebugging.current) return;
    isDebugging.current = true;
    console.log("Debugging started for file:", filePath);
    // Add your debugger logic here
  };

  const stopDebugging = () => {
    if (!isDebugging.current) return;
    isDebugging.current = false;
    console.log("Debugging stopped");
    // Cleanup debugger resources
  };

  const stepOver = () => {
    if (!isDebugging.current || !editor) return;
    console.log("Step over");
    // Implement step over logic
  };

  const stepInto = () => {
    if (!isDebugging.current || !editor) return;
    console.log("Step into");
    // Implement step into logic
  };

  const stepOut = () => {
    if (!isDebugging.current || !editor) return;
    console.log("Step out");
    // Implement step out logic
  };

  return {
    startDebugging,
    stopDebugging,
    stepOver,
    stepInto,
    stepOut,
    isDebugging: isDebugging.current,
  };
};

export default useEditorDebugger;
