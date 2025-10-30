import React, { useEffect, useState } from 'react';
import { useWebSocketContext } from '../../contexts/WebSocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

const ConnectionStatus: React.FC = () => {
  const { isConnected, reconnect } = useWebSocketContext();
  const [showStatus, setShowStatus] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Show status temporarily when connection state changes
  useEffect(() => {
    setShowStatus(true);
    const timer = setTimeout(() => setShowStatus(false), 3000);
    return () => clearTimeout(timer);
  }, [isConnected]);

  const handleReconnect = async () => {
    try {
      setIsReconnecting(true);
      await reconnect();
    } catch (error) {
      console.error('Reconnection failed:', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  if (isConnected) {
    return (
      <AnimatePresence>
        {showStatus && (
          <motion.div
            className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-full flex items-center space-x-2 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Wifi className="w-5 h-5" />
            <span>Connected</span>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-full flex items-center space-x-2 shadow-lg">
      <WifiOff className="w-5 h-5" />
      <span>Disconnected</span>
      <button
        onClick={handleReconnect}
        disabled={isReconnecting}
        className="ml-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-1 transition-colors"
        aria-label="Reconnect"
      >
        {isReconnecting ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};

export default ConnectionStatus;
