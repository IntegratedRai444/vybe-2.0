import { store } from "../../store";
import {
  appendOutput,
  setError,
  updateCallStack,
  updateVariables,
  setLoading,
  pauseExecution,
  continueExecution,
  setBreakpoints,
} from "../../store/slices/debuggerSlice";

interface DebuggerMessage {
  type: string;
  [key: string]: any;
}

export class DebuggerWebSocket {
  private static instance: DebuggerWebSocket;
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 1000; // Start with 1 second
  private sessionId: string | null = null;
  private messageHandlers: Map<string, (message: any) => void> = new Map();

  private constructor() {
    this.setupMessageHandlers();
  }

  public static getInstance(): DebuggerWebSocket {
    if (!DebuggerWebSocket.instance) {
      DebuggerWebSocket.instance = new DebuggerWebSocket();
    }
    return DebuggerWebSocket.instance;
  }

  public connect(sessionId: string): Promise<boolean> {
    this.sessionId = sessionId;

    return new Promise((resolve) => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = import.meta.env.VITE_API_URL
          ? new URL(import.meta.env.VITE_API_URL).host
          : window.location.host;
        const url = `${protocol}//${host}/api/debug/ws/${sessionId}`;

        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
          console.log("Debugger WebSocket connected");
          this.reconnectAttempts = 0;
          store.dispatch(setError(null));
          resolve(true);
        };

        this.socket.onmessage = (event) => this.handleMessage(event);

        this.socket.onclose = () => {
          console.log("Debugger WebSocket disconnected");
          this.attemptReconnect();
        };

        this.socket.onerror = (error) => {
          console.error("Debugger WebSocket error:", error);
          store.dispatch(
            setError("Connection error. Check console for details."),
          );
          this.socket?.close();
        };
      } catch (error) {
        console.error("Failed to connect to debugger:", error);
        store.dispatch(setError("Failed to connect to debugger"));
        resolve(false);
      }
    });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public sendCommand(command: string, args: any = {}): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not connected");
      return;
    }

    const message = {
      type: command,
      ...args,
      requestId: Date.now().toString(),
    };

    this.socket.send(JSON.stringify(message));
  }

  public onMessage(type: string, handler: (message: any) => void): () => void {
    this.messageHandlers.set(type, handler);

    // Return cleanup function
    return () => {
      this.messageHandlers.delete(type);
    };
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: DebuggerMessage = JSON.parse(event.data);
      console.debug("Debugger message:", message);

      // Call specific handler if registered
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(message);
      }

      // Update store based on message type
      switch (message.type) {
        case "output":
          store.dispatch(appendOutput(message.output));
          break;

        case "stopped":
          store.dispatch(pauseExecution());
          // Update call stack and variables
          this.updateDebugState();
          break;

        case "continued":
          store.dispatch(continueExecution());
          break;

        case "breakpoint":
          // Update breakpoints in store
          if (message.breakpoint) {
            store.dispatch(
              setBreakpoints({
                filePath: message.breakpoint.source?.path || "",
                breakpoints: [message.breakpoint],
              }),
            );
          }
          break;

        case "error":
          store.dispatch(setError(message.error || "An error occurred"));
          break;
      }
    } catch (error) {
      console.error("Error processing debugger message:", error);
    }
  }

  private async updateDebugState(): Promise<void> {
    if (!this.sessionId) return;

    try {
      store.dispatch(setLoading(true));

      // Fetch call stack
      const stackResponse = await fetch(
        `/api/debug/sessions/${this.sessionId}/stack`,
      );
      const stackData = await stackResponse.json();
      store.dispatch(updateCallStack(stackData.stack_frames || []));

      // If we have frames, get variables for the top frame
      if (stackData.stack_frames?.length > 0) {
        const frameId = stackData.stack_frames[0].id;
        const varsResponse = await fetch(
          `/api/debug/sessions/${this.sessionId}/variables?frameId=${frameId}`,
        );
        const varsData = await varsResponse.json();
        store.dispatch(
          updateVariables({
            reference: frameId,
            variables: varsData.variables || [],
          }),
        );
      }
    } catch (error) {
      console.error("Error updating debug state:", error);
      store.dispatch(setError("Failed to update debug state"));
    } finally {
      store.dispatch(setLoading(false));
    }
  }

  private attemptReconnect(): void {
    if (
      this.reconnectAttempts >= this.maxReconnectAttempts ||
      !this.sessionId
    ) {
      console.error("Max reconnection attempts reached");
      store.dispatch(setError("Failed to reconnect to debugger"));
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectTimeout * Math.pow(2, this.reconnectAttempts - 1),
      30000,
    );

    console.log(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );

    setTimeout(() => {
      if (this.sessionId) {
        this.connect(this.sessionId);
      }
    }, delay);
  }

  private setupMessageHandlers(): void {
    // Example of setting up a handler for custom message types
    this.onMessage("customEvent", (message) => {
      console.log("Custom event received:", message);
    });
  }
}
