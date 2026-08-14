export interface DebuggerState {
  isDebugging: boolean;
  isPaused: boolean;
  currentFile?: string;
  currentLine?: number;
  breakpoints: Set<string>;
  callStack: CallFrame[];
  variables: Record<string, Variable>;
  watchExpressions: WatchExpression[];
  consoleOutput: ConsoleMessage[];
}

export interface CallFrame {
  functionName?: string;
  filePath: string;
  lineNumber: number;
  columnNumber: number;
  scopeChain: Scope[];
}

export interface Scope {
  name: string;
  type: 'local' | 'closure' | 'script' | 'global' | 'with' | 'catch' | 'block' | 'script';
  object: any;
}

export interface Variable {
  name: string;
  type: string;
  value: any;
  properties?: Variable[];
  getter?: () => any;
  setter?: (value: any) => void;
}

export interface WatchExpression {
  id: string;
  expression: string;
  value?: any;
  error?: string;
}

export interface ConsoleMessage {
  type: 'log' | 'info' | 'warn' | 'error' | 'debug' | 'clear';
  message: string;
  timestamp: number;
  data?: any[];
  stackTrace?: string;
}

export interface Breakpoint {
  id: string;
  filePath: string;
  lineNumber: number;
  enabled: boolean;
  condition?: string;
  hitCount: number;
}

export interface DebuggerActions {
  startDebugging: () => void;
  stopDebugging: () => void;
  pauseExecution: () => void;
  continueExecution: () => void;
  stepOver: () => void;
  stepInto: () => void;
  stepOut: () => void;
  toggleBreakpoint: (filePath: string, lineNumber: number, condition?: string) => void;
  evaluateExpression: (expression: string) => Promise<any>;
  setVariableValue: (name: string, value: any) => void;
  addWatchExpression: (expression: string) => void;
  removeWatchExpression: (id: string) => void;
  updateWatchExpression: (id: string, expression: string) => void;
  clearConsole: () => void;
}

export type DebuggerEvent =
  | { type: 'breakpointHit'; breakpointId: string; callFrames: CallFrame[] }
  | { type: 'paused'; callFrames: CallFrame[]; reason: 'step' | 'breakpoint' | 'exception' | 'pause' }
  | { type: 'resumed' }
  | { type: 'stopped' }
  | { type: 'console'; message: ConsoleMessage }
  | { type: 'exception'; error: Error; stackTrace?: string };

export interface DebuggerProviderProps {
  children: React.ReactNode;
  onEvent?: (event: DebuggerEvent) => void;
}

// Exports
export { types };
