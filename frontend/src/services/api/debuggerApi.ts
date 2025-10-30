import { store } from '../../store/store';
import { 
  setLoading, 
  setError, 
  updateCallStack, 
  updateVariables, 
  appendOutput,
  setCurrentFrame,
  setBreakpoints,
  startDebugSession as startSessionAction,
  stopDebugSession as stopSessionAction,
  pauseExecution as pauseExecutionAction,
  continueExecution as continueExecutionAction,
  stepOver as stepOverAction,
  stepInto as stepIntoAction,
  stepOut as stepOutAction
} from '../../store/slices/debuggerSlice';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';
const WS_URL = API_BASE_URL.replace('http', 'ws') + '/api/debug/ws';

export interface DebugSessionInfo {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  filePath: string;
  startTime: string;
}

export interface Breakpoint {
  id: string;
  line: number;
  column?: number;
  condition?: string;
  hitCount?: number;
  verified: boolean;
  enabled?: boolean;
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

export interface DebugSessionConfig {
  filePath: string;
  stopOnEntry?: boolean;
  env?: Record<string, string>;
  args?: string[];
  cwd?: string;
  name?: string;
  type?: string;
}

type EventHandler = (event: any) => void;

export class DebuggerApi {
  private static instance: DebuggerApi;
  private ws: WebSocket | null = null;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 1 second
  private sessionId: string | null = null;
  private messageQueue: any[] = [];
  

  public static getInstance(): DebuggerApi {
    if (!DebuggerApi.instance) {
      DebuggerApi.instance = new DebuggerApi();
    }
    return DebuggerApi.instance;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      store.dispatch(setLoading(true));
      store.dispatch(setError(null));
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      store.dispatch(setError(error instanceof Error ? error.message : 'An error occurred'));
      throw error;
    } finally {
      store.dispatch(setLoading(false));
    }
  }

  // Session Management
  // Session Management
  public async startSession(config: DebugSessionConfig): Promise<{ sessionId: string }> {
    try {
      const response = await this.request<{ session_id: string }>('/api/debug/sessions', {
        method: 'POST',
        body: JSON.stringify({
          file_path: config.filePath,
          stop_on_entry: config.stopOnEntry || false,
          env: config.env || {},
          args: config.args || [],
          cwd: config.cwd || process.cwd(),
          name: config.name || 'Debug Session',
          type: config.type || 'python',
        }),
      });

      this.sessionId = response.session_id;
      await this.connectWebSocket(this.sessionId);
      
      return { sessionId: response.session_id };
    } catch (error) {
      console.error('Failed to start debug session:', error);
      throw error;
    }
  }

  public async listSessions(): Promise<DebugSessionInfo[]> {
    const response = await this.request<{ sessions: DebugSessionInfo[] }>('/api/debug/sessions');
    return response.sessions;
  }

  public async getSession(sessionId: string): Promise<DebugSessionInfo> {
    return this.request<DebugSessionInfo>(`/api/debug/sessions/${sessionId}`);
  }

  public async terminateSession(sessionId: string): Promise<void> {
    try {
      await this.request(`/api/debug/sessions/${sessionId}/terminate`, {
        method: 'POST',
      });
      
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      this.ws = null;
      this.sessionId = null;
    } catch (error) {
      console.error('Failed to terminate debug session:', error);
      throw error;
    }
  }

  // Breakpoints
  public async setBreakpoint(
    sessionId: string, 
    filePath: string, 
    breakpoint: Omit<Breakpoint, 'id' | 'verified'>
  ): Promise<Breakpoint> {
    const response = await this.request<Breakpoint>(`/api/debug/sessions/${sessionId}/breakpoints`, {
      method: 'POST',
      body: JSON.stringify({
        file_path: filePath,
        line: breakpoint.line,
        column: breakpoint.column,
        condition: breakpoint.condition,
        hit_count: breakpoint.hitCount,
        enabled: breakpoint.enabled !== false, // Default to true if not specified
      }),
    });
    
    return {
      ...breakpoint,
      id: response.id,
      verified: response.verified || false,
    };
  }

  public async updateBreakpoint(
    sessionId: string,
    breakpointId: string,
    updates: Partial<Omit<Breakpoint, 'id' | 'verified'>>
  ): Promise<Breakpoint> {
    return this.request<Breakpoint>(`/api/debug/sessions/${sessionId}/breakpoints/${breakpointId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  public async getBreakpoints(sessionId: string, filePath?: string): Promise<Breakpoint[]> {
    const params = filePath ? `?file_path=${encodeURIComponent(filePath)}` : '';
    const response = await this.request<{ breakpoints: Breakpoint[] }>(
      `/api/debug/sessions/${sessionId}/breakpoints${params}`
    );
    return response.breakpoints;
  }

  public async removeBreakpoint(sessionId: string, breakpointId: string): Promise<void> {
    await this.request(`/api/debug/sessions/${sessionId}/breakpoints/${breakpointId}`, {
      method: 'DELETE',
    });
  }

  // WebSocket Connection
  private async connectWebSocket(sessionId: string): Promise<void> {
    if (this.ws) {
      this.ws.close();
    }

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${WS_URL}/${sessionId}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        this.ws = ws;
        this.reconnectAttempts = 0;
        this.processMessageQueue();
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        if (this.sessionId) {
          this.attemptReconnect();
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.sessionId) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connectWebSocket(this.sessionId!);
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('error', new Error('Disconnected from debug session'));
    }
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      this.ws.send(JSON.stringify(message));
    }
  }

  private sendWebSocketMessage(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  private handleWebSocketMessage(message: any) {
    const { type, ...data } = message;
    
    switch (type) {
      case 'debug_started':
        store.dispatch(startSessionAction(data));
        break;
      case 'stopped':
        store.dispatch(pauseExecutionAction());
        break;
      case 'continued':
        store.dispatch(continueExecutionAction());
        break;
      case 'breakpoint':
        store.dispatch(setBreakpoints({
          filePath: data.file,
          breakpoints: [data.breakpoint]
        }));
        break;
      case 'output':
        store.dispatch(appendOutput(data.output));
        break;
      case 'stack':
        store.dispatch(updateCallStack(data.stackFrames));
        break;
      case 'variables':
        store.dispatch(updateVariables({
          reference: data.variablesReference,
          variables: data.variables
        }));
        break;
      case 'error':
        store.dispatch(setError(data.message));
        break;
      default:
        console.log('Unhandled message type:', type, data);
    }
    
    this.emit(type, data);
  }

  // Event Handling
  public on(event: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    
    const handlers = this.eventHandlers.get(event)!;
    handlers.add(handler);
    
    return () => {
      handlers.delete(handler);
    };
  }

  public off(event: string, handler: EventHandler): void {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event)!.delete(handler);
    }
  }

  private emit(event: string, data: any): void {
    if (this.eventHandlers.has(event)) {
      for (const handler of this.eventHandlers.get(event)!) {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      }
    }
  }

  // Execution Control
  public async continueExecution(sessionId: string): Promise<void> {
    this.sendWebSocketMessage({ type: 'continue' });
  }

  public async pauseExecution(sessionId: string): Promise<void> {
    this.sendWebSocketMessage({ type: 'pause' });
  }

  public async stepOver(sessionId: string): Promise<void> {
    this.sendWebSocketMessage({ type: 'stepOver' });
  }

  public async stepInto(sessionId: string): Promise<void> {
    this.sendWebSocketMessage({ type: 'stepInto' });
  }

  public async stepOut(sessionId: string): Promise<void> {
    this.sendWebSocketMessage({ type: 'stepOut' });
  }

  // Debug Information
  public async getCallStack(sessionId: string): Promise<StackFrame[]> {
    const response = await this.request<{ stack_frames: StackFrame[] }>(
      `/api/debug/sessions/${sessionId}/stack`
    );
    return response.stack_frames;
  }

  public async getVariables(
    sessionId: string, 
    frameId?: number, 
    scope: 'local' | 'global' = 'local',
    start = 0,
    count?: number
  ): Promise<{ variables: Variable[]; total?: number }> {
    const params = new URLSearchParams({ scope });
    
    if (frameId !== undefined) {
      params.append('frame_id', frameId.toString());
    }
    
    params.append('start', start.toString());
    
    if (count !== undefined) {
      params.append('count', count.toString());
    }
    
    return this.request(`/api/debug/sessions/${sessionId}/variables?${params}`);
  }

  public async evaluateExpression(
    sessionId: string, 
    expression: string, 
    frameId?: number,
    context: 'watch' | 'repl' | 'hover' = 'repl'
  ): Promise<{ result: any; type?: string; variablesReference?: number }> {
    return this.request(`/api/debug/sessions/${sessionId}/evaluate`, {
      method: 'POST',
      body: JSON.stringify({
        expression,
        frame_id: frameId,
        context,
      }),
    });
  }

  // Thread Management
  public async getThreads(sessionId: string): Promise<{ id: number; name: string }[]> {
    const response = await this.request<{ threads: { id: number; name: string }[] }>(
      `/api/debug/sessions/${sessionId}/threads`
    );
    return response.threads;
  }

  public async switchThread(sessionId: string, threadId: number): Promise<void> {
    await this.request(`/api/debug/sessions/${sessionId}/threads/${threadId}`, {
      method: 'POST',
    });
  }

  // Source Management
  public async getSource(sessionId: string, sourceReference: number): Promise<{ content: string }> {
    return this.request(`/api/debug/sessions/${sessionId}/source/${sourceReference}`);
  }

  // Disconnect and clean up
  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.sessionId = null;
    this.messageQueue = [];
    this.eventHandlers.clear();
  }
}

export const debuggerApi = DebuggerApi.getInstance();
