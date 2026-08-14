import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  debuggerApi,
  type DebugSessionConfig,
  type Breakpoint,
  type StackFrame,
  type Variable,
} from "../services/api/debuggerApi";
import { RootState } from "../store/store";
import {
  startDebugSession as startSessionAction,
  stopDebugSession as stopSessionAction,
  setBreakpoints,
  setError,
  setLoading,
  updateCallStack,
  updateVariables,
  pauseExecution,
  continueExecution,
  stepOver,
  stepInto,
  stepOut,
  appendOutput,
  clearOutput,
  DebugSession,
} from "../store/slices/debuggerSlice";

interface DebuggerContextType {
  // Session management
  startDebugging: (
    config: Omit<
      DebugSessionConfig,
      "stopOnEntry" | "env" | "args" | "cwd" | "type"
    > & {
      stopOnEntry?: boolean;
      env?: Record<string, string>;
      args?: string[];
      cwd?: string;
      type?: string;
    },
  ) => Promise<void>;
  stopDebugging: () => Promise<void>;
  listSessions: () => Promise<void>;

  // Breakpoints
  addBreakpoint: (
    filePath: string,
    line: number,
    condition?: string,
  ) => Promise<Breakpoint>;
  updateBreakpoint: (
    filePath: string,
    breakpointId: string,
    updates: Partial<Omit<Breakpoint, "id" | "verified">>,
  ) => Promise<Breakpoint>;
  removeBreakpoint: (filePath: string, breakpointId: string) => Promise<void>;
  getBreakpoints: (filePath?: string) => Promise<Breakpoint[]>;
  toggleBreakpoint: (
    filePath: string,
    breakpointId: string,
    enabled: boolean,
  ) => Promise<void>;

  // Execution control
  continueExecution: () => Promise<void>;
  pauseExecution: () => Promise<void>;
  stepOver: () => Promise<void>;
  stepInto: () => Promise<void>;
  stepOut: () => Promise<void>;

  // Variables and evaluation
  evaluateExpression: (
    expression: string,
    frameId?: number,
    context?: "watch" | "repl" | "hover",
  ) => Promise<any>;
  getVariables: (
    reference: number,
    frameId?: number,
    scope?: "local" | "global",
  ) => Promise<Variable[]>;

  // Source code
  getSource: (sourceReference: number) => Promise<string>;

  // State
  isDebugging: boolean;
  isPaused: boolean;
  currentFrame?: StackFrame | null;
  breakpoints: Record<string, Breakpoint[]>;
  variables: Record<number, Variable[]>;
  callStack: StackFrame[];
  output: string[];
  error?: string | null;
  loading: boolean;

  // Events
  on: (event: string, handler: (data: any) => void) => () => void;
  clearOutput: () => void;
}

const DebuggerContext = createContext<DebuggerContextType | null>(null);

export const DebuggerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const dispatch = useDispatch();
  const debuggerState = useSelector((state: RootState) => state.debugger);
  const {
    currentSessionId,
    isActive,
    isPaused,
    breakpoints = {},
    variables = {},
    callStack = [],
    output = [],
    error,
    loading,
  } = debuggerState;
  const eventHandlers = useRef<Record<string, ((data: any) => void)[]>>({});

  const startDebugging = useCallback(
    async (
      config: Omit<
        DebugSessionConfig,
        "stopOnEntry" | "env" | "args" | "cwd" | "type"
      > & {
        stopOnEntry?: boolean;
        env?: Record<string, string>;
        args?: string[];
        cwd?: string;
        type?: string;
      },
    ): Promise<void> => {
      try {
        dispatch(setLoading(true));
        const sessionInfo = await debuggerApi.startSession({
          ...config,
          stopOnEntry: config.stopOnEntry || false,
          env: config.env || {},
          args: config.args || [],
          cwd: config.cwd || process.cwd(),
          name: config.name || "Debug Session",
          type: config.type || "python",
        });

        // Set up WebSocket listeners
        const onBreakpointHit = (data: any) => {
          dispatch(pauseExecution());
          dispatch(updateCallStack(data.stackFrames || []));
          // Store current frame in local state since we don't have setCurrentFrame
          if (data.stackFrames?.[0]) {
            // We'll need to handle this differently since setCurrentFrame isn't available
            // For now, we'll just log it
            console.log("Current frame:", data.stackFrames[0]);
          }
        };

        const onOutput = (data: { output: string }) => {
          dispatch(appendOutput(data.output));
        };

        // Subscribe to debugger events
        debuggerApi.on("stopped", onBreakpointHit);
        debuggerApi.on("output", onOutput);

        // Create a debug session object
        const session: DebugSession = {
          id: sessionInfo.sessionId,
          name: config.name || "Debug Session",
          type: config.type || "python",
          request: "launch",
          program: config.program,
          args: config.args,
          cwd: config.cwd,
          env: config.env,
          stopOnEntry: config.stopOnEntry,
        };

        // Start the debug session in the store
        dispatch(startSessionAction(session));

        // Cleanup function to remove event listeners
        const cleanup = () => {
          debuggerApi.off("stopped", onBreakpointHit);
          debuggerApi.off("output", onOutput);
        };

        // Return the cleanup function
        return cleanup;
      } catch (error) {
        dispatch(
          setError(
            error instanceof Error
              ? error.message
              : "Failed to start debug session",
          ),
        );
        throw error;
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch],
  );

  const stopDebugging = useCallback(async () => {
    if (!currentSessionId) return;

    try {
      dispatch(setLoading(true));
      await debuggerApi.stopSession(currentSessionId);
      // Stop the debug session in the store
      dispatch(stopSessionAction(currentSessionId));
    } catch (error) {
      console.error("Failed to stop debugging:", error);
      dispatch(
        setError(
          error instanceof Error
            ? error.message
            : "Failed to stop debug session",
        ),
      );
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }, [currentSessionId, dispatch]);

  const listSessions = useCallback(async () => {
    try {
      const sessions = await debuggerApi.listSessions();
      // Since we don't have setSessions, we'll just return the sessions
      // The caller will need to handle the sessions
      return sessions;
    } catch (error) {
      console.error("Failed to list debug sessions:", error);
      dispatch(
        setError(
          error instanceof Error
            ? error.message
            : "Failed to list debug sessions",
        ),
      );
      throw error;
    }
  }, [dispatch]);

  // ... rest of the code remains the same ...
  const addBreakpoint = useCallback(
    async (filePath: string, line: number, condition?: string) => {
      if (!currentSessionId) throw new Error("No active debug session");

      try {
        const breakpoint = await debuggerApi.setBreakpoint(
          currentSessionId,
          filePath,
          {
            line,
            column: 0,
            condition,
            enabled: true,
          },
        );

        dispatch(
          setBreakpoints({
            filePath,
            breakpoints: [breakpoint],
          }),
        );

        return breakpoint;
      } catch (error) {
        console.error("Failed to add breakpoint:", error);
        dispatch(setError("Failed to add breakpoint"));
        throw error;
      }
    },
    [dispatch, currentSessionId],
  );

  const updateBreakpoint = useCallback(
    async (
      filePath: string,
      breakpointId: string,
      updates: Partial<Omit<Breakpoint, "id" | "verified">>,
    ) => {
      if (!currentSessionId) throw new Error("No active debug session");

      try {
        const updatedBreakpoint = await debuggerApi.updateBreakpoint(
          currentSessionId,
          breakpointId,
          updates,
        );

        // Update the breakpoint in the Redux store
        const fileBreakpoints = breakpoints[filePath] || [];
        const updatedBreakpoints = fileBreakpoints.map((bp) =>
          bp.id === breakpointId ? { ...bp, ...updatedBreakpoint } : bp,
        );

        dispatch(
          setBreakpoints({
            filePath,
            breakpoints: updatedBreakpoints,
          }),
        );

        return updatedBreakpoint;
      } catch (error) {
        console.error("Failed to update breakpoint:", error);
        dispatch(setError("Failed to update breakpoint"));
        throw error;
      }
    },
    [dispatch, currentSessionId, breakpoints],
  );

  // Remove a breakpoint
  const removeBreakpoint = useCallback(
    async (filePath: string, breakpointId: string) => {
      if (!currentSessionId) throw new Error("No active debug session");

      try {
        await debuggerApi.removeBreakpoint(currentSessionId, breakpointId);

        // Update Redux state
        const fileBreakpoints = breakpoints[filePath] || [];
        const updatedBreakpoints = fileBreakpoints.filter(
          (bp) => bp.id !== breakpointId,
        );

        dispatch(
          setBreakpoints({
            filePath,
            breakpoints: updatedBreakpoints,
          }),
        );
      } catch (error) {
        console.error("Failed to remove breakpoint:", error);
        dispatch(setError("Failed to remove breakpoint"));
        throw error;
      }
    },
    [dispatch, currentSessionId, breakpoints],
  );

  // Toggle breakpoint enabled/disabled
  const toggleBreakpoint = useCallback(
    async (
      filePath: string,
      breakpointId: string,
      enabled: boolean,
    ): Promise<void> => {
      if (!currentSessionId) {
        const error = new Error("No active debug session");
        dispatch(setError(error.message));
        throw error;
      }

      try {
        await debuggerApi.updateBreakpoint(currentSessionId, breakpointId, {
          enabled,
        });

        // Update the breakpoint in the Redux store
        const fileBreakpoints = breakpoints[filePath] || [];
        const updatedBreakpoints = fileBreakpoints.map((bp) =>
          bp.id === breakpointId ? { ...bp, enabled } : bp,
        );

        dispatch(
          setBreakpoints({
            filePath,
            breakpoints: updatedBreakpoints,
          }),
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to toggle breakpoint";
        dispatch(setError(errorMessage));
        throw error;
      }
    },
    [currentSessionId, dispatch, breakpoints],
  );

  // Get breakpoints
  const getBreakpoints = useCallback(
    async (filePath?: string) => {
      if (!currentSessionId) throw new Error("No active debug session");

      try {
        return await debuggerApi.getBreakpoints(currentSessionId, filePath);
      } catch (error) {
        console.error("Failed to get breakpoints:", error);
        dispatch(setError("Failed to get breakpoints"));
        throw error;
      }
    },
    [dispatch, currentSessionId],
  );

  // Execution control
  const continueExecution = useCallback(async () => {
    if (!currentSessionId) throw new Error("No active debug session");

    try {
      await debuggerApi.continueExecution(currentSessionId);
      dispatch(continueExecution());
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to continue execution";
      dispatch(setError(errorMessage));
      throw error;
    }
  }, [dispatch, currentSessionId]);

  // Pause execution
  const pauseExecution = useCallback(async () => {
    if (!currentSessionId) throw new Error("No active debug session");

    try {
      await debuggerApi.pauseExecution(currentSessionId);
      dispatch(pauseExecution());
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to pause execution";
      dispatch(setError(errorMessage));
      throw error;
    }
  }, [dispatch, currentSessionId]);

  // Step over
  const stepOver = useCallback(async () => {
    if (!currentSessionId) throw new Error("No active debug session");

    try {
      await debuggerApi.stepOver(currentSessionId);
      dispatch(stepOver());
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Step over failed";
      dispatch(setError(errorMessage));
      throw error;
    }
  }, [dispatch, currentSessionId]);

  // Step into
  const stepInto = useCallback(async () => {
    if (!currentSessionId) throw new Error("No active debug session");

    try {
      await debuggerApi.stepInto(currentSessionId);
      dispatch(stepInto());
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Step into failed";
      dispatch(setError(errorMessage));
      throw error;
    }
  }, [dispatch, currentSessionId]);

  // Step out
  const stepOut = useCallback(async () => {
    if (!currentSessionId) throw new Error("No active debug session");

    try {
      await debuggerApi.stepOut(currentSessionId);
      dispatch(stepOut());
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Step out failed";
      dispatch(setError(errorMessage));
      throw error;
    }
  }, [dispatch, currentSessionId]);

  const evaluateExpression = useCallback(
    async (
      expression: string,
      frameId?: number,
      context: "watch" | "repl" | "hover" = "repl",
    ) => {
      if (!currentSessionId) throw new Error("No active debug session");
      try {
        const result = await debuggerApi.evaluateExpression(
          currentSessionId,
          expression,
          frameId,
          context,
        );
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Evaluation failed";
        console.error("Evaluation failed:", error);
        dispatch(setError(errorMessage));
        throw error;
      }
    },
    [dispatch, currentSessionId],
  );

  const getVariables = useCallback(
    async (
      reference: number,
      frameId?: number,
      scope: "local" | "global" = "local",
    ) => {
      if (!currentSessionId) {
        const error = new Error("No active debug session");
        dispatch(setError(error.message));
        throw error;
      }

      try {
        dispatch(setLoading(true));
        const { variables } = await debuggerApi.getVariables(
          currentSessionId,
          frameId,
          scope,
          reference,
        );

        // Update variables in the Redux store
        if (frameId !== undefined) {
          dispatch(updateVariables({ frameId, variables }));
        }

        return variables;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to get variables";
        console.error("Failed to get variables:", error);
        dispatch(setError(errorMessage));
        throw error;
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch, currentSessionId],
  );

  const getSource = useCallback(
    async (sourceReference: number) => {
      if (!currentSessionId) {
        const error = new Error("No active debug session");
        dispatch(setError(error.message));
        throw error;
      }

      try {
        dispatch(setLoading(true));
        const { content } = await debuggerApi.getSource(
          currentSessionId,
          sourceReference,
        );
        return content;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to get source";
        console.error("Failed to get source:", error);
        dispatch(setError(errorMessage));
        throw error;
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch, currentSessionId],
  );

  const on = useCallback((event: string, handler: (data: any) => void) => {
    if (!eventHandlers.current[event]) {
      eventHandlers.current[event] = [];
    }
    eventHandlers.current[event].push(handler);
    return () => {
      eventHandlers.current[event] = eventHandlers.current[event].filter(
        (h) => h !== handler,
      );
    };
  }, []);

  const handleClearOutput = useCallback(() => {
    dispatch(clearOutput());
  }, [dispatch]);

  const currentFrame = callStack.length > 0 ? callStack[0] : null;

  return (
    <DebuggerContext.Provider
      value={{
        startDebugging,
        stopDebugging,
        listSessions,
        addBreakpoint,
        updateBreakpoint,
        removeBreakpoint,
        toggleBreakpoint,
        getBreakpoints,
        continueExecution,
        pauseExecution,
        stepOver,
        stepInto,
        stepOut,
        evaluateExpression,
        getVariables,
        getSource,
        isDebugging: isActive,
        isPaused,
        currentFrame,
        breakpoints,
        variables,
        callStack,
        output,
        error,
        loading,
        on,
        clearOutput: handleClearOutput,
      }}
    >
      {children}
    </DebuggerContext.Provider>
  );
};

export const useDebugger = (): DebuggerContextType => {
  const context = useContext(DebuggerContext);
  if (context === null) {
    throw new Error("useDebugger must be used within a DebuggerProvider");
  }
  return context;
};

// Hook for subscribing to debugger events
export const useDebuggerEvent = (
  event: string,
  handler: (data: any) => void,
) => {
  const { on } = useDebugger();

  useEffect(() => {
    const unsubscribe = on(event, handler);
    return () => {
      unsubscribe();
    };
  }, [event, handler, on]);
};

// Hook for managing debugger state
export const useDebuggerState = () => {
  const {
    isDebugging,
    isPaused,
    currentFrame,
    breakpoints,
    callStack,
    variables,
    output,
    error,
    loading,
  } = useDebugger();

  return {
    isDebugging,
    isPaused,
    currentFrame,
    breakpoints,
    callStack,
    variables,
    output,
    error,
    loading,
  };
};

export { DebuggerContext };
