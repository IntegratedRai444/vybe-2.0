import { useEffect, useRef } from 'react';

interface FileWatcherOptions {
  enabled: boolean;
  onFileChange: (filePath: string) => void;
  onFileAdd: (filePath: string) => void;
  onFileDelete: (filePath: string) => void;
}

export const useFileWatcher = (projectRoot: string, options: FileWatcherOptions) => {
  const { enabled, onFileChange, onFileAdd, onFileDelete } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !projectRoot) return;

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(`ws://127.0.0.1:8000/ws/file-watcher`);
        
        ws.onopen = () => {
          console.log('File watcher connected');
          // Send project root to start watching
          ws.send(JSON.stringify({ 
            type: 'start_watching', 
            projectRoot 
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
              case 'file_changed':
                onFileChange(data.filePath);
                break;
              case 'file_added':
                onFileAdd(data.filePath);
                break;
              case 'file_deleted':
                onFileDelete(data.filePath);
                break;
            }
          } catch (error) {
            console.error('Error parsing file watcher message:', error);
          }
        };

        ws.onclose = () => {
          console.log('File watcher disconnected, attempting to reconnect...');
          // Reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (error) => {
          console.error('File watcher error:', error);
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('Failed to connect file watcher:', error);
        // Retry connection after 5 seconds
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [enabled, projectRoot, onFileChange, onFileAdd, onFileDelete]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN
  };
};
