import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { webSocketClient, useWebSocket } from '../services/websocket';

type WebSocketContextType = {
  isConnected: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  subscribe: (channel: string) => Promise<void>;
  unsubscribe: (channel: string) => void;
  on: <T extends keyof import('../services/websocket').WebSocketEventMap>(
    eventType: T,
    handler: (event: import('../services/websocket').WebSocketEventMap[T]) => void
  ) => () => void;
};

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(webSocketClient.isConnected());
  const [error, setError] = useState<Error | null>(null);

  // Handle connection status changes
  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    // Initial connection
    const init = async () => {
      try {
        await webSocketClient.connect();
        setIsConnected(true);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to connect to WebSocket'));
      }
    };

    init();

    // Subscribe to connection events
    const unsubscribeConnected = webSocketClient.on('pong', () => {
      if (!isConnected) setIsConnected(true);
    });

    // Cleanup on unmount
    return () => {
      unsubscribeConnected();
      // Don't disconnect here as other components might be using the same connection
      // webSocketClient.disconnect();
    };
  }, []);

  // Handle errors
  useEffect(() => {
    const unsubscribeError = webSocketClient.on('error', (event) => {
      setError(new Error(event.data.message || 'WebSocket error occurred'));
    });

    return () => {
      unsubscribeError();
    };
  }, []);

  const connect = async (): Promise<boolean> => {
    try {
      const connected = await webSocketClient.connect();
      setIsConnected(connected);
      return connected;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to connect to WebSocket');
      setError(error);
      throw error;
    }
  };

  const disconnect = (): void => {
    webSocketClient.disconnect();
    setIsConnected(false);
  };

  const subscribe = async (channel: string): Promise<void> => {
    try {
      await webSocketClient.subscribe(channel);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to subscribe to channel');
      setError(error);
      throw error;
    }
  };

  const unsubscribe = (channel: string): void => {
    webSocketClient.unsubscribe(channel);
  };

  const on = webSocketClient.on.bind(webSocketClient);

  const value = {
    isConnected,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    on,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded shadow-lg">
          WebSocket Error: {error.message}
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-white hover:text-gray-200"
          >
            ×
          </button>
        </div>
      )}
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};

// Helper hook for subscribing to specific event types
export const useWebSocketEvent = <T extends keyof import('../services/websocket').WebSocketEventMap>(
  eventType: T,
  handler: (event: import('../services/websocket').WebSocketEventMap[T]) => void,
  deps: any[] = []
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
