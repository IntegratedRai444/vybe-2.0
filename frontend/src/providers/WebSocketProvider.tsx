import React from 'react';
import { WebSocketProvider as WSProvider } from '../contexts/WebSocketContext';
import ConnectionStatus from '../components/common/ConnectionStatus';
import { useAuth } from '../hooks/useAuth';

type WebSocketProviderProps = {
  children: React.ReactNode;
};

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { token } = useAuth();
  
  // The WebSocket client is already a singleton, so we don't need to create a new instance
  // Just make sure to set the auth token when it changes
  React.useEffect(() => {
    if (token) {
      // The WebSocket client will automatically reconnect with the new token
      // when the connection is established or re-established
    }
  }, [token]);

  return (
    <WSProvider>
      {children}
      <ConnectionStatus />
    </WSProvider>
  );
};

export default WebSocketProvider;
