import React, { ReactNode, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useTheme } from '../theme/ThemeProvider';
import { FileTab, CursorPosition } from '../types';

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const { theme, isDark } = useTheme();
  const {
    setCursorPosition,
    setConnectionStatus,
    loadWorkspace,
    workspacePath,
  } = useStore();

  // Initialize application
  useEffect(() => {
    // Set up connection status listener
    const handleOnline = () => setConnectionStatus('connected');
    const handleOffline = () => setConnectionStatus('disconnected');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial connection status
    setConnectionStatus(navigator.onLine ? 'connected' : 'disconnected');

    // Load last workspace if available
    const lastWorkspace = localStorage.getItem('lastWorkspace');
    if (lastWorkspace) {
      loadWorkspace(lastWorkspace);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadWorkspace, setConnectionStatus]);

  // Save workspace path when it changes
  useEffect(() => {
    if (workspacePath) {
      localStorage.setItem('lastWorkspace', workspacePath);
    }
  }, [workspacePath]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.setProperty('--radius', '0.5rem');
    
    // Set theme colors as CSS variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--${key}`, value);
    });
  }, [theme, isDark]);

  // Set up keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle command palette with Cmd/Ctrl+P
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        useStore.getState().setCommandPaletteOpen(true);
      }
      
      // Save file with Cmd/Ctrl+S
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        // TODO: Implement save file
      }
      
      // Toggle terminal with Cmd/Ctrl+`
      if ((e.metaKey || e.ctrlKey) && e.key === '`') {
        e.preventDefault();
        useStore.getState().togglePanel('terminal');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return <>{children}</>;
};

export default AppProvider;
