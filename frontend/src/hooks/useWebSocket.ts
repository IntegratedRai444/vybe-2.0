import { useState, useEffect, useCallback, useRef } from 'react';

type MessageHandler = (data: any) => void;

interface WebSocketHandlers {
  [key: string]: Set<MessageHandler>;
}

export const useWebSocket = (endpoint: string) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const handlers = useRef<WebSocketHandlers>({});
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    try {
      // Use wss:// if the current protocol is https://, otherwise use ws://
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}${endpoint}`;
      
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const messageHandlers = handlers.current[message.type];
          
          if (messageHandlers) {
            messageHandlers.forEach(handler => handler(message.data));
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        
        // Attempt to reconnect with exponential backoff
        const maxReconnectAttempts = 5;
        const baseDelay = 1000; // 1 second
        
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(
            baseDelay * Math.pow(2, reconnectAttempts.current),
            30000 // Max 30 seconds
          );
          
          reconnectTimer.current = setTimeout(() => {
            reconnectAttempts.current += 1;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      setSocket(ws);
      return ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      return null;
    }
  }, [endpoint]);

  useEffect(() => {
    const ws = connect();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
    };
  }, [connect]);

  const send = useCallback((type: string, data: any = {}) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        const message = JSON.stringify({ type, data });
        socket.send(message);
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
      }
    } else {
      console.warn('WebSocket is not connected');
      return false;
    }
  }, [socket]);

  const subscribe = useCallback((eventType: string, handler: MessageHandler) => {
    if (!handlers.current[eventType]) {
      handlers.current[eventType] = new Set();
    }
    
    handlers.current[eventType].add(handler);
    
    // Return unsubscribe function
    return () => {
      if (handlers.current[eventType]) {
        handlers.current[eventType].delete(handler);
      }
    };
  }, []);

  return {
    socket,
    isConnected,
    send,
    subscribe,
  };
};

export default useWebSocket;
