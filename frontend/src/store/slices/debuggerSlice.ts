// frontend/src/store/slices/debuggerSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Types
export interface Breakpoint {
  id: string;
  line: number;
  column?: number;
  condition?: string;
  hitCount?: number;
  verified: boolean;
  enabled?: boolean;
}

export interface StackFrame {
  id: number;
  name: string;
  source?: {
    name: string;
    path: string;
    sourceReference?: number;
  };
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
}

export interface Variable {
  name: string;
  value: string;
  type?: string;
  variablesReference: number;
  namedVariables?: number;
  indexedVariables?: number;
  evaluateName?: string;
}

export interface DebugSession {
  id: string;
  name: string;
  type: string;
  request: 'launch' | 'attach' | 'attachForSuspendedLaunch';
  program?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  stopOnEntry?: boolean;
  console?: 'internalConsole' | 'integratedTerminal' | 'externalTerminal';
}

export interface DebuggerState {
  // Session state
  isActive: boolean;
  isRunning: boolean;
  isPaused: boolean;
  currentSessionId: string | null;
  sessions: Record<string, DebugSession>;
  
  // Debug data
  breakpoints: Record<string, Breakpoint[]>;
  callStack: StackFrame[];
  variables: Record<number, Variable[]>;
  currentThreadId: number | null;
  currentFrameId: number | null;
  
  // Output and errors
  output: string[];
  error: string | null;
  loading: boolean;
}

const initialState: DebuggerState = {
  isActive: false,
  isRunning: false,
  isPaused: false,
  currentSessionId: null,
  sessions: {},
  breakpoints: {},
  callStack: [],
  variables: {},
  currentThreadId: null,
  currentFrameId: null,
  output: [],
  error: null,
  loading: false,
};

const debuggerSlice = createSlice({
  name: 'debugger',
  initialState,
  reducers: {
    // Session Management
    startDebugSession: (state, action: PayloadAction<DebugSession>) => {
      const session = action.payload;
      state.sessions[session.id] = session;
      state.currentSessionId = session.id;
      state.isActive = true;
      state.isRunning = true;
      state.isPaused = false;
      state.error = null;
    },
    
    stopDebugSession: (state, action: PayloadAction<string>) => {
      const sessionId = action.payload;
      delete state.sessions[sessionId];
      
      if (state.currentSessionId === sessionId) {
        state.currentSessionId = Object.keys(state.sessions)[0] || null;
      }
      
      if (Object.keys(state.sessions).length === 0) {
        state.isActive = false;
        state.isRunning = false;
        state.isPaused = false;
        state.currentSessionId = null;
      }
    },
    
    // Breakpoints
    setBreakpoints: (
      state,
      action: PayloadAction<{ filePath: string; breakpoints: Breakpoint[] }>
    ) => {
      const { filePath, breakpoints } = action.payload;
      state.breakpoints[filePath] = breakpoints;
    },
    
    // Execution Control
    continueExecution: (state) => {
      state.isPaused = false;
      state.isRunning = true;
      // Clear previous state
      state.callStack = [];
      state.variables = {};
    },
    
    pauseExecution: (state) => {
      state.isPaused = true;
      state.isRunning = false;
    },
    
    stepOver: (state) => {
      // The actual step over logic is handled by the debugger service
      state.isRunning = true;
      state.isPaused = false;
    },
    
    stepInto: (state) => {
      // The actual step into logic is handled by the debugger service
      state.isRunning = true;
      state.isPaused = false;
    },
    
    stepOut: (state) => {
      // The actual step out logic is handled by the debugger service
      state.isRunning = true;
      state.isPaused = false;
    },
    
    // Call Stack and Variables
    updateCallStack: (state, action: PayloadAction<StackFrame[]>) => {
      state.callStack = action.payload;
      if (action.payload.length > 0) {
        state.currentFrameId = action.payload[0].id;
      }
    },
    
    setCurrentFrame: (state, action: PayloadAction<number | null>) => {
      state.currentFrameId = action.payload;
    },
    
    updateVariables: (state, action: PayloadAction<{ reference: number; variables: Variable[] }>) => {
      const { reference, variables } = action.payload;
      state.variables[reference] = variables;
    },
    
    // Output and Errors
    appendOutput: (state, action: PayloadAction<string>) => {
      state.output.push(action.payload);
      // Keep only the last 1000 lines of output
      if (state.output.length > 1000) {
        state.output = state.output.slice(-1000);
      }
    },
    
    clearOutput: (state) => {
      state.output = [];
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    
    // Loading State
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

// Export actions
export const {
  startDebugSession,
  stopDebugSession,
  setBreakpoints,
  continueExecution,
  pauseExecution,
  stepOver,
  stepInto,
  stepOut,
  updateCallStack,
  setCurrentFrame,
  updateVariables,
  appendOutput,
  clearOutput,
  setError,
  setLoading,
} = debuggerSlice.actions;

export default debuggerSlice.reducer;