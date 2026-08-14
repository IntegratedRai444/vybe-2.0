import { useState, useEffect, useCallback, useRef } from 'react';

type MessageHandler = (data: any) => void;

export interface WebSocketMessage<T = any> {
  type: string;
  data: T;
}

interface WebSocketOptions {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

const useWebSocket = (
  url: string,
  options: WebSocketOptions = {}
) => {
  const {
    onOpen,
    onClose,
    onError,
    reconnectAttempts = 5,
    reconnectInterval = 5000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Event | null>(null);
  const reconnectCount = useRef(0);
  const ws = useRef<WebSocket | null>(null);
  const messageHandlers = useRef<Map<string, MessageHandler>>(new Map());
  const reconnectTimeout = useRef<number>();

  const connect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
    }

    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = (event) => {
      console.log('WebSocket connected');
      setIsConnected(true);
      reconnectCount.current = 0;
      onOpen?.();
    };

    socket.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        const handler = messageHandlers.current.get(type);
        if (handler) {
          handler(data);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    socket.onclose = (event) => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      onClose?.();

      // Attempt to reconnect
      if (reconnectCount.current < reconnectAttempts) {
        reconnectCount.current += 1;
        console.log(`Reconnecting in ${reconnectInterval}ms... (${reconnectCount.current}/${reconnectAttempts})`);
        
        reconnectTimeout.current = window.setTimeout(() => {
          connect();
        }, reconnectInterval);
      } else {
        console.error('Max reconnection attempts reached');
      }
    };

    socket.onerror = (event) => {
      console.error('WebSocket error:', event);
      setError(event);
      onError?.(event);
    };

    return () => {
      socket.close();
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [url, onOpen, onClose, onError, reconnectAttempts, reconnectInterval]);

  // Connect on mount and clean up on unmount
  useEffect(() => {
    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [connect]);

  const sendMessage = useCallback((type: string, data: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, data }));
      return true;
    }
    console.error('WebSocket is not connected');
    return false;
  }, []);

  const subscribe = useCallback((type: string, handler: MessageHandler) => {
    messageHandlers.current.set(type, handler);
    
    // Return cleanup function
    return () => {
      messageHandlers.current.delete(type);
    };
  }, []);

  const close = useCallback(() => {
    if (ws.current) {
      ws.current.close();
    }
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
  }, []);

  return {
    isConnected,
    error,
    sendMessage,
    subscribe,
    close,
    reconnect: connect,
  };
};

// Export the WebSocketMessage type separately to avoid TypeScript errors
export type { WebSocketMessage };
export default useWebSocket;
