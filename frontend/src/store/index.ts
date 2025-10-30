// Store configuration
export { store } from './store';
export type { RootState, AppDispatch } from './store';
export { useAppDispatch, useAppSelector } from './store';

// Auth slice
export {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  clearError
} from './slices/authSlice';

export type { AuthState } from './slices/authSlice';

// Editor slice
export {
  setActiveFile,
  closeFile,
  setDirty,
  startSaving,
  saveSuccess,
  saveError,
  setViewState,
  setTerminalHeight,
  setSidebarWidth,
  toggleSidebar
} from './slices/editorSlice';

export type { EditorState } from './slices/editorSlice';

// Debugger slice
export {
  startDebugSession,
  stopDebugSession,
  setBreakpoints,
  continueExecution,
  pauseExecution,
  stepOver,
  stepInto,
  stepOut,
  updateCallStack,
  updateVariables,
  appendOutput,
  clearOutput,
  setError,
  setLoading
} from './slices/debuggerSlice';

export type {
  Breakpoint,
  StackFrame,
  Variable,
  DebugSession,
  DebuggerState
} from './slices/debuggerSlice';
