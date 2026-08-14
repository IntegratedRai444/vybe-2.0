// src/components/Debugger.tsx - Enhanced Debugger Component
import React, { useState, useEffect, useRef } from "react";
import {
  FaPlay,
  FaPause,
  FaStop,
  FaBug,
  FaCodeBranch,
  FaEye,
  FaStepForward,
  FaStepOver,
  FaStepInto,
  FaStepOut,
  FaTerminal,
  FaListUl,
  FaCode,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import * as api from "../../services/api";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  setCurrentLine,
  setBreakpoints,
  setVariables,
  setCallStack,
  setThreads,
  setActiveThread,
  setActiveFrame,
  addToConsole,
  clearConsole,
  setDebugStatus,
} from "../../store/slices/debuggerSlice";
import { debounce } from "lodash";

// Types
type DebugStatus =
  | "inactive"
  | "initializing"
  | "running"
  | "paused"
  | "terminated"
  | "error";

type DebuggerMode =
  | "debug"
  | "console"
  | "breakpoints"
  | "variables"
  | "callstack";

interface DebugToolbarProps {
  status: DebugStatus;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onStepOver: () => void;
  onStepInto: () => void;
  onStepOut: () => void;
  onAddBreakpoint: (line: number) => void;
  onRemoveBreakpoint: (line: number) => void;
  breakpoints: number[];
  currentLine?: number;
}

const DebugToolbar: React.FC<DebugToolbarProps> = ({
  status,
  onStart,
  onPause,
  onResume,
  onStop,
  onStepOver,
  onStepInto,
  onStepOut,
  breakpoints,
  currentLine,
}) => {
  const isPaused = status === "paused";
  const isRunning = status === "running";
  const isInactive = status === "inactive";

  return (
    <div className="flex items-center space-x-2 p-2 bg-gray-800 text-white border-b border-gray-700">
      {isInactive ? (
        <button
          onClick={onStart}
          className="p-2 rounded hover:bg-gray-700 disabled:opacity-50"
          title="Start Debugging"
        >
          <FaPlay className="text-green-500" />
        </button>
      ) : isPaused ? (
        <>
          <button
            onClick={onResume}
            className="p-2 rounded hover:bg-gray-700"
            title="Continue (F5)"
          >
            <FaPlay className="text-green-500" />
          </button>
          <button
            onClick={onStepOver}
            className="p-2 rounded hover:bg-gray-700"
            title="Step Over (F10)"
          >
            <FaStepOver className="text-blue-400" />
          </button>
          <button
            onClick={onStepInto}
            className="p-2 rounded hover:bg-gray-700"
            title="Step Into (F11)"
          >
            <FaStepInto className="text-blue-400" />
          </button>
          <button
            onClick={onStepOut}
            className="p-2 rounded hover:bg-gray-700"
            title="Step Out (Shift+F11)"
          >
            <FaStepOut className="text-blue-400" />
          </button>
        </>
      ) : (
        <button
          onClick={onPause}
          className="p-2 rounded hover:bg-gray-700"
          disabled={!isRunning}
          title="Pause"
        >
          <FaPause className="text-yellow-500" />
        </button>
      )}

      <button
        onClick={onStop}
        className="p-2 rounded hover:bg-gray-700 disabled:opacity-50"
        disabled={isInactive}
        title="Stop Debugging (Shift+F5)"
      >
        <FaStop className="text-red-500" />
      </button>

      <div className="h-6 w-px bg-gray-600 mx-2"></div>

      <div className="text-xs text-gray-400">
        {status === "paused" && currentLine && `Paused on line ${currentLine}`}
        {status === "running" && "Running..."}
        {status === "initializing" && "Initializing debugger..."}
      </div>
    </div>
  );
};

// Breakpoint interface
export interface IBreakpoint {
  id: string;
  file: string;
  line: number;
  enabled: boolean;
  verified: boolean;
  condition?: string;
  hitCount?: number;
  hitCondition?: string;
}

// Variable interface
export interface IVariable {
  name: string;
  value: string;
  type: string;
  variablesReference: number;
  namedVariables?: number;
  indexedVariables?: number;
  evaluateName?: string;
  presentationHint?: string;
}

// Stack frame interface
export interface IStackFrame {
  id: number;
  name: string;
  source: {
    name: string;
    path: string;
    sourceReference?: number;
  };
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  moduleId?: string | number;
  presentationHint?: string;
}

// Thread interface
export interface IThread {
  id: number;
  name: string;
  running: boolean;
}

// Debug session state
export interface IDebuggerState {
  status: DebugStatus;
  currentFile: string | null;
  currentLine: number | null;
  breakpoints: IBreakpoint[];
  variables: Record<string, IVariable[]>;
  callStack: IStackFrame[];
  threads: IThread[];
  activeThread: number | null;
  activeFrame: number | null;
  consoleOutput: string[];
  exception: string | null;
  debugConsoleInput: string;
}

// Debug event types
type DebugEvent =
  | { type: "breakpoint"; breakpoint: IBreakpoint }
  | {
      type: "stopped";
      reason: string;
      description?: string;
      threadId?: number;
      allThreadsStopped?: boolean;
    }
  | { type: "continued"; threadId: number; allThreadsContinued?: boolean }
  | { type: "exited"; exitCode: number }
  | { type: "terminated"; restart?: any }
  | { type: "initialized" }
  | {
      type: "output";
      category: "console" | "stdout" | "stderr" | "telemetry";
      output: string;
    }
  | { type: "breakpointConditionalError"; breakpointId: string; error: string }
  | { type: "breakpointLogMessage"; breakpointId: string; message: string };

export const Debugger: React.FC<Props> = ({
  filePath,
  onBreakpointToggle,
  onDebugStart,
  onDebugStop,
}) => {
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);
  const [_debugSession, setDebugSession] = useState<DebugSession | null>(null);
  const [_threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<number | null>(null);
  const [stackFrames, setStackFrames] = useState<StackFrame[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [activeTab, setActiveTab] = useState<
    "breakpoints" | "variables" | "callstack" | "watch"
  >("breakpoints");
  const [watchExpressions, setWatchExpressions] = useState<
    { expression: string; value?: string; error?: string }[]
  >([{ expression: "" }]);
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugOutput, setDebugOutput] = useState<string[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadDebugSessions();
  }, []);

  const loadDebugSessions = async () => {
    try {
      const data = await api.listDAPSessions();
      const sessions = data.sessions || [];

      if (sessions.length > 0) {
        const activeSession =
          sessions.find((s: DebugSession) => s.is_running) || sessions[0];
        setDebugSession(activeSession);
        setCurrentSessionId(activeSession.session_id);
        setIsDebugging(activeSession.is_running);

        if (activeSession.is_running) {
          loadThreads(activeSession.session_id);
        }
      }
    } catch (error) {
      console.error("Failed to load debug sessions:", error);
    }
  };

  const loadThreads = async (sessionId: string) => {
    try {
      const data = await api.getDAPThreads(sessionId);
      const threadList = data.threads || [];
      setThreads(threadList);

      if (threadList.length > 0 && !activeThread) {
        setActiveThread(threadList[0].id);
        loadStackTrace(sessionId, threadList[0].id);
      }
    } catch (error) {
      console.error("Failed to load threads:", error);
    }
  };

  const loadStackTrace = async (sessionId: string, threadId: number) => {
    try {
      const data = await api.getDAPStackTrace(sessionId, threadId);
      const frames = data.stack_frames || [];
      setStackFrames(frames);

      if (frames.length > 0) {
        loadVariables(sessionId, frames[0].id);
      }
    } catch (error) {
      console.error("Failed to load stack trace:", error);
    }
  };

  const loadVariables = async (
    sessionId: string,
    variablesReference: number,
  ) => {
    try {
      const data = await api.getDAPVariables(sessionId, variablesReference);
      setVariables(data.variables || []);
    } catch (error) {
      console.error("Failed to load variables:", error);
    }
  };

  const updateBreakpoints = async (file: string, breakpointLines: number[]) => {
    if (!currentSessionId) return;

    try {
      const breakpointData = breakpointLines.map((line) => ({
        line,
        enabled: true,
      }));

      const data = await api.setDAPBreakpoints(
        currentSessionId,
        file,
        breakpointData,
      );
      if (data.success) {
        setBreakpoints(data.breakpoints || []);
      }
    } catch (error) {
      console.error("Failed to set breakpoints:", error);
    }
  };

  const toggleBreakpoint = (file: string, line: number) => {
    const existingBp = breakpoints.find(
      (bp) => bp.file === file && bp.line === line,
    );
    let newLines: number[];

    if (existingBp) {
      // Remove breakpoint
      newLines = breakpoints
        .filter((bp) => !(bp.file === file && bp.line === line))
        .filter((bp) => bp.file === file)
        .map((bp) => bp.line);
    } else {
      // Add breakpoint
      newLines = [
        ...breakpoints.filter((bp) => bp.file === file).map((bp) => bp.line),
        line,
      ];
    }

    updateBreakpoints(file, newLines);
    onBreakpointToggle(file, line);
  };

  const startDebugging = async () => {
    try {
      setIsLoading(true);

      // Detect language from file extension
      const ext = filePath.split(".").pop()?.toLowerCase();
      const language =
        ext === "py"
          ? "python"
          : ext === "js"
            ? "javascript"
            : ext === "ts"
              ? "typescript"
              : "python";

      // Create debug session
      const createData = await api.createDAPSession(language, filePath, []);

      if (!createData.success) {
        throw new Error(createData.error || "Failed to create debug session");
      }

      const sessionId = createData.session_id;
      setCurrentSessionId(sessionId);

      // Launch the session
      const launchData = await api.launchDAPSession(sessionId);

      if (launchData.success) {
        setIsDebugging(true);
        onDebugStart();

        // Load session data
        setTimeout(() => {
          loadThreads(sessionId);
        }, 1000); // Give debugger time to start

        setDebugOutput((prev) => [...prev, `Started debugging ${filePath}`]);
      } else {
        throw new Error("Failed to launch debug session");
      }
    } catch (error) {
      console.error("Failed to start debugging:", error);
      setDebugOutput((prev) => [...prev, `Error: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const stopDebugging = async () => {
    if (!currentSessionId) return;

    try {
      setIsLoading(true);
      const data = await api.terminateDAPSession(currentSessionId);

      if (data.success) {
        setIsDebugging(false);
        onDebugStop();
        setDebugSession(null);
        setCurrentSessionId(null);
        setThreads([]);
        setStackFrames([]);
        setVariables([]);
        setDebugOutput((prev) => [...prev, "Debug session terminated"]);
      }
    } catch (error) {
      console.error("Failed to stop debugging:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const pauseDebugging = async () => {
    if (!currentSessionId || !activeThread) return;

    try {
      await api.pauseDAPExecution(currentSessionId, activeThread);
      setDebugOutput((prev) => [...prev, "Execution paused"]);
    } catch (error) {
      console.error("Failed to pause debugging:", error);
    }
  };

  const resumeDebugging = async () => {
    if (!currentSessionId) return;

    try {
      await api.continueDAPExecution(
        currentSessionId,
        activeThread || undefined,
      );
      setDebugOutput((prev) => [...prev, "Execution resumed"]);
    } catch (error) {
      console.error("Failed to resume debugging:", error);
    }
  };

  const stepOver = async () => {
    if (!currentSessionId || !activeThread) return;

    try {
      await api.stepOverDAP(currentSessionId, activeThread);

      // Refresh stack trace and variables
      setTimeout(() => {
        loadStackTrace(currentSessionId, activeThread);
      }, 500);

      setDebugOutput((prev) => [...prev, "Stepped over"]);
    } catch (error) {
      console.error("Failed to step over:", error);
    }
  };

  const stepInto = async () => {
    if (!currentSessionId || !activeThread) return;

    try {
      await api.stepIntoDAP(currentSessionId, activeThread);

      // Refresh stack trace and variables
      setTimeout(() => {
        loadStackTrace(currentSessionId, activeThread);
      }, 500);

      setDebugOutput((prev) => [...prev, "Stepped into"]);
    } catch (error) {
      console.error("Failed to step into:", error);
    }
  };

  const stepOut = async () => {
    if (!currentSessionId || !activeThread) return;

    try {
      await api.stepOutDAP(currentSessionId, activeThread);

      // Refresh stack trace and variables
      setTimeout(() => {
        loadStackTrace(currentSessionId, activeThread);
      }, 500);

      setDebugOutput((prev) => [...prev, "Stepped out"]);
    } catch (error) {
      console.error("Failed to step out:", error);
    }
  };

  const addWatchExpression = () => {
    setWatchExpressions([...watchExpressions, { expression: "" }]);
  };

  const updateWatchExpression = (index: number, value: string) => {
    const newExpressions = [...watchExpressions];
    newExpressions[index] = { expression: value };
    setWatchExpressions(newExpressions);
  };

  const evaluateWatchExpression = async (index: number) => {
    if (!currentSessionId || !watchExpressions[index].expression.trim()) return;

    try {
      const result = await api.evaluateDAPExpression(
        currentSessionId,
        watchExpressions[index].expression,
      );
      const newExpressions = [...watchExpressions];
      if (result.success && result.result) {
        newExpressions[index] = {
          ...newExpressions[index],
          value: result.result.result,
          error: undefined,
        };
      } else {
        newExpressions[index] = {
          ...newExpressions[index],
          value: undefined,
          error: result.error || "Evaluation failed",
        };
      }
      setWatchExpressions(newExpressions);
    } catch (error) {
      const newExpressions = [...watchExpressions];
      newExpressions[index] = {
        ...newExpressions[index],
        value: undefined,
        error: String(error),
      };
      setWatchExpressions(newExpressions);
    }
  };

  const removeWatchExpression = (index: number) => {
    const newExpressions = watchExpressions.filter((_, i) => i !== index);
    setWatchExpressions(newExpressions);
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-200">
      {/* Header */}
      <div className="p-2 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <FaBug className="text-red-400" />
            <span className="font-medium">Debugger</span>
            {isDebugging && (
              <span className="text-xs px-2 py-1 rounded bg-green-600">
                Running
              </span>
            )}
            {isLoading && (
              <span className="text-xs px-2 py-1 rounded bg-yellow-600">
                Loading...
              </span>
            )}
          </div>

          {/* Debug controls */}
          <div className="flex space-x-1">
            {!isDebugging ? (
              <button
                className="p-1 bg-green-600 hover:bg-green-700 rounded disabled:bg-gray-600"
                onClick={startDebugging}
                disabled={isLoading}
                title="Start Debugging"
              >
                <FaPlay className="w-3 h-3" />
              </button>
            ) : (
              <>
                <button
                  className="p-1 bg-yellow-600 hover:bg-yellow-700 rounded disabled:bg-gray-600"
                  onClick={resumeDebugging}
                  disabled={isLoading}
                  title="Resume"
                >
                  <FaPlay className="w-3 h-3" />
                </button>
                <button
                  className="p-1 bg-yellow-600 hover:bg-yellow-700 rounded disabled:bg-gray-600"
                  onClick={pauseDebugging}
                  disabled={isLoading}
                  title="Pause"
                >
                  <FaPause className="w-3 h-3" />
                </button>
                <button
                  className="p-1 bg-blue-600 hover:bg-blue-700 rounded disabled:bg-gray-600"
                  onClick={stepOver}
                  disabled={isLoading}
                  title="Step Over"
                >
                  <FaStepForward className="w-3 h-3" />
                </button>
                <button
                  className="p-1 bg-blue-600 hover:bg-blue-700 rounded disabled:bg-gray-600"
                  onClick={stepInto}
                  disabled={isLoading}
                  title="Step Into"
                >
                  <FaStepForward className="w-3 h-3" />
                </button>
                <button
                  className="p-1 bg-blue-600 hover:bg-blue-700 rounded disabled:bg-gray-600"
                  onClick={stepOut}
                  disabled={isLoading}
                  title="Step Out"
                >
                  <FaStepForward className="w-3 h-3" />
                </button>
                <button
                  className="p-1 bg-red-600 hover:bg-red-700 rounded disabled:bg-gray-600"
                  onClick={stopDebugging}
                  disabled={isLoading}
                  title="Stop Debugging"
                >
                  <FaStop className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex space-x-1">
          {[
            { id: "breakpoints", label: "Breakpoints", icon: FaCodeBranch },
            { id: "variables", label: "Variables", icon: FaEye },
            { id: "callstack", label: "Call Stack", icon: FaCodeBranch },
            { id: "watch", label: "Watch", icon: FaEye },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`px-3 py-1 rounded text-sm flex items-center space-x-1 ${
                activeTab === id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 hover:bg-gray-700 text-gray-300"
              }`}
              onClick={() => setActiveTab(id as any)}
            >
              <Icon className="w-3 h-3" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {/* Breakpoints Tab */}
        {activeTab === "breakpoints" && (
          <div className="p-2">
            <div className="space-y-1">
              {breakpoints.length === 0 ? (
                <div className="p-4 text-gray-500 text-center">
                  <FaCodeBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No breakpoints set</p>
                  <p className="text-xs mt-1">
                    Click in the editor gutter to add breakpoints
                  </p>
                </div>
              ) : (
                breakpoints.map((bp) => (
                  <div
                    key={bp.id}
                    className="flex items-center p-2 hover:bg-gray-800 rounded group"
                  >
                    <div
                      className={`w-3 h-3 rounded-full mr-2 ${
                        bp.verified ? "bg-red-500" : "bg-gray-500"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{bp.file}</div>
                      <div className="text-xs text-gray-400">
                        Line {bp.line}
                      </div>
                      {bp.condition && (
                        <div className="text-xs text-blue-400">
                          Condition: {bp.condition}
                        </div>
                      )}
                    </div>
                    <button
                      className="p-1 hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100"
                      onClick={() => toggleBreakpoint(bp.file, bp.line)}
                      title="Remove breakpoint"
                    >
                      <FaStop className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Variables Tab */}
        {activeTab === "variables" && (
          <div className="p-2">
            {variables.length === 0 ? (
              <div className="p-4 text-gray-500 text-center">
                <FaEye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No variables available</p>
                <p className="text-xs mt-1">Start debugging to see variables</p>
              </div>
            ) : (
              <div className="space-y-1">
                {variables.map((variable, index) => (
                  <div key={index} className="p-2 bg-gray-800 rounded">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-blue-300">
                        {variable.name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {variable.type}
                      </span>
                    </div>
                    <div className="text-sm text-gray-300 mt-1 font-mono">
                      {variable.value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Call Stack Tab */}
        {activeTab === "callstack" && (
          <div className="p-2">
            {stackFrames.length === 0 ? (
              <div className="p-4 text-gray-500 text-center">
                <FaCodeBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No call stack available</p>
                <p className="text-xs mt-1">
                  Start debugging to see call stack
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {stackFrames.map((frame, index) => (
                  <div
                    key={frame.id}
                    className={`p-2 rounded cursor-pointer hover:bg-gray-700 ${
                      index === 0 ? "bg-blue-900" : "bg-gray-800"
                    }`}
                  >
                    <div className="text-sm font-medium">{frame.name}</div>
                    <div className="text-xs text-gray-400">
                      {frame.source}:{frame.line}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Watch Tab */}
        {activeTab === "watch" && (
          <div className="p-2">
            <div className="space-y-2">
              {watchExpressions.map((watch, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={watch.expression}
                      onChange={(e) =>
                        updateWatchExpression(index, e.target.value)
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" && evaluateWatchExpression(index)
                      }
                      placeholder="Enter expression to watch..."
                      className="flex-1 p-2 bg-gray-800 border border-gray-600 rounded text-sm"
                    />
                    <button
                      className="p-2 bg-blue-600 hover:bg-blue-700 rounded"
                      onClick={() => evaluateWatchExpression(index)}
                      title="Evaluate"
                    >
                      <FaPlay className="w-3 h-3" />
                    </button>
                    <button
                      className="p-2 bg-red-600 hover:bg-red-700 rounded"
                      onClick={() => removeWatchExpression(index)}
                      title="Remove"
                    >
                      <FaStop className="w-3 h-3" />
                    </button>
                  </div>
                  {watch.value && (
                    <div className="pl-2 text-sm text-green-300 font-mono">
                      = {watch.value}
                    </div>
                  )}
                  {watch.error && (
                    <div className="pl-2 text-sm text-red-300">
                      Error: {watch.error}
                    </div>
                  )}
                </div>
              ))}
              <button
                className="w-full p-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                onClick={addWatchExpression}
              >
                Add Watch Expression
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Debug Output */}
      {debugOutput.length > 0 && (
        <div className="border-t border-gray-700 p-2">
          <div className="text-xs text-gray-400 mb-1">Debug Output:</div>
          <div className="text-xs font-mono max-h-20 overflow-y-auto bg-gray-800 p-2 rounded">
            {debugOutput.map((line, index) => (
              <div key={index} className="text-gray-300">
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Exports
export { Debugger };
