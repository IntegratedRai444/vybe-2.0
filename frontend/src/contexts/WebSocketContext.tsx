import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { webSocketClient } from "../services/websocket";

type WebSocketContextType = {
  isConnected: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  subscribe: (channel: string) => Promise<void>;
  unsubscribe: (channel: string) => void;
  on: <T extends string>(
    eventType: T,
    handler: (event: any) => void,
  ) => () => void;
};

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined,
);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isConnected, setIsConnected] = useState(webSocketClient.isConnectedMethod());
  const [error, setError] = useState<Error | null>(null);

  // Handle connection status changes
  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
    };
    
    const handleDisconnect = () => {
      setIsConnected(false);
    };

    // Initial connection
    const init = async () => {
      try {
        await webSocketClient.connect();
        setIsConnected(true);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to connect to WebSocket"),
        );
      }
    };

    init();

    // Set up event listeners
    const unsubscribeConnect = webSocketClient.on("connected", handleConnect);
    const unsubscribeDisconnect = webSocketClient.on("disconnected", handleDisconnect);

    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
    };
  }, []);

  // Handle errors
  useEffect(() => {
    const unsubscribeError = webSocketClient.on("error", (event) => {
      setError(new Error(event.data.message || "WebSocket error occurred"));
    });

    return () => {
      if (unsubscribeError) {
        unsubscribeError();
      }
    };
  }, []);

  const connect = useCallback(async () => {
    try {
      const connected = await webSocketClient.connect();
      setIsConnected(connected);
      return connected;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to connect to WebSocket");
      setError(error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    webSocketClient.disconnect();
    setIsConnected(false);
  }, []);

  const subscribe = useCallback(async (channel: string) => {
    try {
      await webSocketClient.subscribe(channel);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to subscribe to ${channel}`);
      setError(error);
      throw error;
    }
  }, []);

  const unsubscribe = useCallback((channel: string) => {
    webSocketClient.unsubscribe(channel).catch((err) => {
      const error = err instanceof Error ? err : new Error(`Failed to unsubscribe from ${channel}`);
      setError(error);
      console.error(error);
    });
  }, []);

  const on = useCallback(<T extends string>(
    eventType: T,
    handler: (event: any) => void,
  ) => {
    // @ts-ignore - We're using a simplified type here
    return webSocketClient.on(eventType, handler);
  }, []);

  const value: WebSocketContextType = {
    isConnected,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    on,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg">
          WebSocket Error: {error.message}
          <button 
            onClick={() => setError(null)}
            className="ml-4 px-2 py-1 bg-red-600 rounded hover:bg-red-700"
          >
            Dismiss
          </button>
        </div>
      )}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error(
      "useWebSocketContext must be used within a WebSocketProvider",
    );
  }
  return context;
};

// Helper hook for subscribing to specific event types
export const useWebSocketEvent = <
  T extends keyof import("../services/websocket").WebSocketEventMap,
>(
  eventType: T,
  handler: (
    event: import("../services/websocket").WebSocketEventMap[T],
  ) => void,
  deps: any[] = [],
) => {
  const { on } = useWebSocketContext();

  useEffect(() => {
    const unsubscribe = on(eventType, handler);
    return () => unsubscribe();
  }, [eventType, ...deps]);
};

// Example usage in a component:
/*
function MyComponent() {
  const { isConnected, subscribe } = useWebSocketContext();

  useWebSocketEvent('deployment:progress', (event) => {
    console.log('Deployment progress:', event.data.progress);
  }, []);

  useEffect(() => {
    if (isConnected) {
      subscribe('deployments:123');
    }
  }, [isConnected, subscribe]);

  return <div>Connection status: {isConnected ? 'Connected' : 'Disconnected'}</div>;
}
*/
