import { useState, useCallback } from 'react';

interface DebugState {
  isDebugging: boolean;
  breakpoints: Set<string>;
  currentLine?: number;
  stackTrace: any[];
  variables: Record<string, any>;
}

export const useDebugger = () => {
  const [state, setState] = useState<DebugState>({
    isDebugging: false,
    breakpoints: new Set(),
    stackTrace: [],
    variables: {},
  });

  const toggleBreakpoint = useCallback((filePath: string, lineNumber: number) => {
    const breakpointKey = `${filePath}:${lineNumber}`;
    setState(prev => {
      const newBreakpoints = new Set(prev.breakpoints);
      if (newBreakpoints.has(breakpointKey)) {
        newBreakpoints.delete(breakpointKey);
      } else {
        newBreakpoints.add(breakpointKey);
      }
      return { ...prev, breakpoints: newBreakpoints };
    });
  }, []);

  const startDebugging = useCallback(() => {
    setState(prev => ({ ...prev, isDebugging: true }));
  }, []);

  const stopDebugging = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDebugging: false,
      currentLine: undefined,
      stackTrace: [],
    }));
  }, []);

  const stepOver = useCallback(() => {
    // Implementation for step over
    console.log('Step over');
  }, []);

  const stepInto = useCallback(() => {
    // Implementation for step into
    console.log('Step into');
  }, []);

  const stepOut = useCallback(() => {
    // Implementation for step out
    console.log('Step out');
  }, []);

  return {
    ...state,
    toggleBreakpoint,
    startDebugging,
    stopDebugging,
    stepOver,
    stepInto,
    stepOut,
  };
};

// Default export for backward compatibility
export const useDebugger = useDebugger;

// Named exports
export { useDebugger };
export default useDebugger;
