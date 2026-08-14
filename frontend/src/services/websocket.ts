// Remove React imports as they should be in a separate hook file

type WebSocketEventMap = {
  connected: { data: { timestamp: string } };
  disconnected: { data: { code?: number; reason?: string } };
  error: { data: { message: string; error?: any } };
  reconnecting: {
    data: { attempt: number; maxAttempts: number; nextAttemptIn: number };
  };
  reconnect_failed: { data: { message: string; maxAttempts: number } };
  pong: { data: { timestamp: string } };
  "deployment:started": DeploymentEvent;
  "deployment:progress": DeploymentProgressEvent;
  "deployment:logs": DeploymentLogsEvent;
  "deployment:completed": DeploymentCompletedEvent;
  "deployment:failed": DeploymentFailedEvent;
  "git:status_updated": GitStatusUpdatedEvent;
  "git:branch_changed": GitBranchChangedEvent;
  "git:commit_created": GitCommitCreatedEvent;
  "package:install_started": PackageInstallStartedEvent;
  "package:install_progress": PackageInstallProgressEvent;
  "package:install_completed": PackageInstallCompletedEvent;
  "package:install_failed": PackageInstallFailedEvent;
  "subscription:updated": SubscriptionUpdatedEvent;
  message: { data: any }; // Generic message type
};

type EventType = keyof WebSocketEventMap;

type BaseEvent<T extends EventType, D = unknown> = {
  type: T;
  timestamp: string;
  data: D;
  metadata?: Record<string, unknown>;
};

type DeploymentEvent = BaseEvent<
  "deployment:started",
  {
    deployment_id: string;
    target: any; // Replace with your DeploymentTarget type
    status: "in_progress" | "completed" | "failed";
    start_time: string;
  }
>;

type DeploymentProgressEvent = BaseEvent<
  "deployment:progress",
  {
    deployment_id: string;
    progress: number;
    message: string;
    timestamp: string;
  }
>;

type DeploymentLogsEvent = BaseEvent<
  "deployment:logs",
  {
    deployment_id: string;
    logs: string;
    is_error: boolean;
    timestamp: string;
  }
>;

type DeploymentCompletedEvent = BaseEvent<
  "deployment:completed",
  {
    deployment_id: string;
    status: "completed";
    result: any;
    end_time: string;
  }
>;

type DeploymentFailedEvent = BaseEvent<
  "deployment:failed",
  {
    deployment_id: string;
    status: "failed";
    error: string;
    end_time: string;
  }
>;

type GitStatusUpdatedEvent = BaseEvent<
  "git:status_updated",
  {
    repo_path: string;
    status: any; // Replace with your GitStatus type
    timestamp: string;
  }
>;

type GitBranchChangedEvent = BaseEvent<
  "git:branch_changed",
  {
    repo_path: string;
    branch: string;
    timestamp: string;
  }
>;

type GitCommitCreatedEvent = BaseEvent<
  "git:commit_created",
  {
    repo_path: string;
    commit: any; // Replace with your GitCommit type
    timestamp: string;
  }
>;

type PackageInstallStartedEvent = BaseEvent<
  "package:install_started",
  {
    package: string;
    version: string;
    status: "installing";
    start_time: string;
  }
>;

type PackageInstallProgressEvent = BaseEvent<
  "package:install_progress",
  {
    package: string;
    progress: number;
    message: string;
    timestamp: string;
  }
>;

type PackageInstallCompletedEvent = BaseEvent<
  "package:install_completed",
  {
    package: string;
    status: "installed";
    result: any;
    end_time: string;
  }
>;

type PackageInstallFailedEvent = BaseEvent<
  "package:install_failed",
  {
    package: string;
    status: "failed";
    error: string;
    end_time: string;
  }
>;

type SubscriptionUpdatedEvent = BaseEvent<
  "subscription:updated",
  {
    channel: string;
    status: "subscribed" | "unsubscribed";
  }
>;

// Remove unused types

type WebSocketMessage = {
  [K in keyof WebSocketEventMap]: {
    type: K;
    data: WebSocketEventMap[K]["data"];
    timestamp: string;
  };
}[keyof WebSocketEventMap];

type EventHandler<T extends EventType> = (event: WebSocketEventMap[T]) => void;

type EventHandlers = {
  [K in EventType]?: EventHandler<K>[];
};

class WebSocketClient {
  private static instance: WebSocketClient;
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10; // Increased max attempts
  private baseReconnectDelay = 1000;
  private maxReconnectDelay = 30000; // 30 seconds max delay
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private _isConnected = false;
  private isConnecting = false;
  private messageQueue: Array<{ type: string; data: any; timestamp: number }> =
    [];
  private readonly MAX_QUEUE_SIZE = 100;
  private pingInterval: NodeJS.Timeout | null = null;
  private readonly PING_INTERVAL = 25000; // 25 seconds (less than server timeout)
  // Ping/pong tracking
  private lastPingTime: number = 0;
  private lastPongTime: number = 0;
  private eventHandlers: EventHandlers = {};
  private clientId: string = "";
  private authToken: string | null = null;
  private connectionPromise: Promise<boolean> | null = null;
  private connectionResolve: ((value: boolean) => void) | null = null;
  private connectionReject: ((reason?: any) => void) | null = null;
  private activeSubscriptions: Set<string> = new Set();
  private isExplicitDisconnect = false;

  private constructor() {
    this.clientId = this.generateClientId();
  }

  public static getInstance(): WebSocketClient {
    if (!WebSocketClient.instance) {
      WebSocketClient.instance = new WebSocketClient();
    }
    return WebSocketClient.instance;
  }

  private generateClientId(): string {
    return `client_${Math.random().toString(36).substr(2, 9)}`;
  }

  public setAuthToken(token: string | null): void {
    this.authToken = token;
    if (this.socket && this.isConnected) {
      // Reconnect with new token if already connected
      this.reconnect();
    }
  }

  public connect(): Promise<boolean> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    if (this.isConnected) {
      return Promise.resolve(true);
    }

    if (this.isConnecting) {
      return new Promise(
        (resolve: (value: boolean) => void, reject: (reason?: any) => void) => {
          // If we're already connecting, wait for the current connection attempt to complete
          const checkConnection = () => {
            if (this.isConnected) {
              resolve(true);
            } else {
              setTimeout(checkConnection, 100);
            }
          };
          checkConnection();
        },
      );
    }

    this.connectionPromise = new Promise<boolean>((resolve, reject) => {
      this.connectionResolve = resolve;
      this.connectionReject = reject;

      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        const url = new URL(`/api/ws/${this.clientId}`, `${protocol}//${host}`);

        if (this.authToken) {
          url.searchParams.append("token", this.authToken);
        }

        this.socket = new WebSocket(url.toString());
        this.socket.binaryType = "arraybuffer";

        this.socket.onopen = () => {
          this.setConnected(true);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.lastPongTime = Date.now();
          this.setupPing();
          this.processMessageQueue();
          this.resubscribeAll();
          console.log("WebSocket connected");
          this.connectionResolve?.(true);
          this.emit("connected", {
            data: { timestamp: new Date().toISOString() },
          });
        };

        this.socket.onmessage = (event: MessageEvent) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            if (message.type === "pong") {
              this.lastPongTime = Date.now();
              this.emit("pong", message);
            } else {
              this.handleMessage(message);
            }
          } catch (error) {
            console.error("Error processing WebSocket message:", error);
            this.emit("error", {
              type: "error",
              timestamp: new Date().toISOString(),
              data: { message: "Failed to process WebSocket message", error },
            });
          }
        };

        this.socket.onclose = (event) => {
          this.setConnected(false);
          this.isConnecting = false;
          this.cleanup();

          if (this.isExplicitDisconnect) {
            this.emit("disconnected", {
              data: { code: event.code, reason: event.reason },
            });
            this.isExplicitDisconnect = false;
            if (this.connectionReject) {
              this.connectionReject(
                new Error(
                  `Connection failed: ${event.reason || "Unknown error"}`,
                ),
              );
            }
          } else {
            console.log("WebSocket connection closed by client");
            this.handleReconnect();
          }

          this.connectionPromise = null;
          this.connectionResolve = null;
          this.connectionReject = null;
        };

        this.socket.onerror = (error) => {
          console.error("WebSocket error:", error);
          this.emit("error", {
            type: "error",
            timestamp: new Date().toISOString(),
            data: { message: "WebSocket error", error },
          });

          if (this.connectionReject && !this.isConnected) {
            this.connectionReject(error);
          }

          this.isConnecting = false;
          this.connectionPromise = null;
          this.connectionReject = null;
        };
      } catch (error) {
        console.error("Error setting up WebSocket:", error);
        this.isConnecting = false;
        this.connectionPromise = null;
        this.connectionReject?.(error);
        this.connectionReject = null;
      }
    });

    return this.connectionPromise;
  }

  private handleReconnect(): void {
    if (this.isExplicitDisconnect) {
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;

      // Exponential backoff with jitter
      const baseDelay = Math.min(
        this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
        this.maxReconnectDelay,
      );
      const jitter = Math.random() * 0.3 * baseDelay; // Add up to 30% jitter
      const delay = Math.min(baseDelay + jitter, this.maxReconnectDelay);

      console.log(
        `Reconnecting in ${Math.round(delay)}ms... (attempt ${
          this.reconnectAttempts
        }/${this.maxReconnectAttempts})`,
      );

      // Clear any existing reconnect timeout to prevent multiple reconnection attempts
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }

      this.reconnectTimeout = setTimeout(() => {
        this.connect().catch((error) => {
          console.error("Reconnection attempt failed:", error);
          this.handleReconnect(); // Continue reconnection attempts
        });
      }, delay);

      // Emit reconnecting event with attempt info
      this.emit("reconnecting", {
        type: "reconnecting",
        timestamp: new Date().toISOString(),
        data: {
          attempt: this.reconnectAttempts,
          maxAttempts: this.maxReconnectAttempts,
          nextAttemptIn: delay,
        },
      });
    } else {
      console.error("Max reconnection attempts reached");
      this.emit("reconnect_failed", {
        type: "reconnect_failed",
        timestamp: new Date().toISOString(),
        data: {
          message:
            "Max reconnection attempts reached. Please refresh the page.",
          maxAttempts: this.maxReconnectAttempts,
        },
      });
    }
  }

  private cleanupPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private cleanup(): void {
    this.setConnected(false);
    this.isConnecting = false;

    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;

      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close(1000, "Connection closed by client");
      }

      this.socket = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private queueMessage(message: { type: string; data: any }): void {
    if (this.messageQueue.length >= this.MAX_QUEUE_SIZE) {
      this.messageQueue.shift();
    }
    this.messageQueue.push({
      ...message,
      timestamp: Date.now(),
    });
  }

  private setupPing(): void {
    this.cleanupPing();

    // Send initial ping immediately
    this.sendPing();

    // Set up interval for periodic pings
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, this.PING_INTERVAL);
  }

  private sendPing(): void {
    if (!this.isConnected || !this.socket) {
      return;
    }

    this.lastPingTime = Date.now();
    try {
      this.socket.send(
        JSON.stringify({
          type: "ping",
          timestamp: new Date().toISOString(),
          data: {},
        }),
      );
    } catch (error) {
      console.error("Error sending ping:", error);
      this.reconnect();
      this.socket.onclose = null;
      this.socket.onerror = null;

      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close(1000, "Connection closed by client");
      }

      this.socket = null;
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected && this.socket) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  private resubscribeAll(): void {
    const subscriptions = Array.from(this.activeSubscriptions);
    this.activeSubscriptions.clear();

    subscriptions.forEach((channel) => {
      this.subscribe(channel).catch(console.error);
    });
  }

  private handleMessage(message: WebSocketMessage): void {
    const eventType = message.type as EventType;
    const handlers = this.eventHandlers[eventType];
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          // Create a properly typed event object
          const event = {
            ...message,
            type: eventType,
            timestamp: message.timestamp || new Date().toISOString(),
          } as WebSocketEventMap[EventType];
          handler(event);
        } catch (error) {
          console.error(`Error in handler for ${eventType}:`, error);
        }
      });
    }
  }

  private emit<T extends EventType>(
    eventType: T,
    event: Omit<WebSocketEventMap[T], "type" | "timestamp"> & {
      [key: string]: unknown;
    },
  ): void {
    const handlers = this.eventHandlers[eventType];
    if (handlers) {
      // Create a new event object with the required type and timestamp
      const fullEvent = {
        ...event,
        type: eventType,
        timestamp: new Date().toISOString(),
      } as unknown as WebSocketEventMap[T];

      handlers.forEach((handler) => {
        try {
          handler(fullEvent);
        } catch (error) {
          console.error(`Error in ${eventType} handler:`, error);
        }
      });
    }
  }

  private on<T extends EventType>(
    eventType: T,
    handler: (event: WebSocketEventMap[T]) => void,
  ): () => void {
    if (!this.eventHandlers[eventType]) {
      this.eventHandlers[eventType] = [];
    }

    this.eventHandlers[eventType]?.push(handler as EventHandler<EventType>);

    return () => {
      this.off(eventType, handler as EventHandler<T>);
    };
  }

  public off<T extends EventType>(
    eventType: T,
    handler: (event: WebSocketEventMap[T]) => void,
  ): void {
    const handlers = this.eventHandlers[eventType];
    if (handlers) {
      const index = handlers.findIndex((h) => h === handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  public async subscribe(channel: string): Promise<void> {
    await this.ensureConnected();
    this.activeSubscriptions.add(channel);
    this.send({
      type: "subscribe",
      data: { channel },
    });
  }

  public async unsubscribe(channel: string): Promise<void> {
    await this.ensureConnected();
    this.activeSubscriptions.delete(channel);
    this.send({
      type: "unsubscribe",
      data: { channel },
    });
  }

  private async ensureConnected(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  public send(message: { type: string; data: any }): void {
    if (this.isConnected && this.socket) {
      try {
        const messageToSend = {
          ...message,
          timestamp: new Date().toISOString(),
        };
        this.socket.send(JSON.stringify(messageToSend));
      } catch (error) {
        console.error("Error sending WebSocket message:", error);
        this.queueMessage(message);
        this.reconnect();
      }
    } else {
      this.queueMessage(message);
      if (!this.isConnecting) {
        this.connect().catch(console.error);
      }
    }
  }

  public reconnect(): void {
    this.cleanup();
    this.connect().catch(console.error);
  }

  public disconnect(): void {
    this.isExplicitDisconnect = true;
    this.cleanup();
    this.messageQueue = [];
    this.activeSubscriptions.clear();

    this.emit("disconnected", {
      data: { reason: "Disconnected by client" },
    });
  }

  public get isConnected(): boolean {
    return this._isConnected && this.socket?.readyState === WebSocket.OPEN;
  }

  private setConnected(value: boolean): void {
    this._isConnected = value;
  }

  // For backward compatibility
  public isConnectedMethod(): boolean {
    return this.isConnected;
  }

  // Helper methods for specific event types
  public onDeploymentProgress(
    handler: (event: DeploymentProgressEvent) => void,
  ): () => void {
    return this.on("deployment:progress", handler);
  }

  public onPackageInstallProgress(
    handler: (event: PackageInstallProgressEvent) => void,
  ): () => void {
    return this.on("package:install_progress", handler);
  }

  public onGitStatusUpdated(
    handler: (event: GitStatusUpdatedEvent) => void,
  ): () => void {
    return this.on("git:status_updated", handler);
  }

  // Add more typed event helpers as needed...
}

// Create a singleton instance
export const webSocketClient = WebSocketClient.getInstance();
// WebSocket service implementation
