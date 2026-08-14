import React, { useState, useEffect, useRef, useCallback, FC, memo } from 'react';
import { ITheme } from '@xterm/xterm';
import { FiTerminal, FiPlus, FiX, FiRefreshCw, FiCopy } from 'react-icons/fi';

// Simple TerminalPane component - replace with your actual implementation
const TerminalPane: FC<{ cwd: string; onExit: () => void; onTitleChange: (title: string) => void }> = ({ 
  cwd, 
  onExit, 
  onTitleChange 
}) => {
  return (
    <div className="terminal-pane">
      <div className="terminal-header">
        <span>Terminal - {cwd}</span>
        <button onClick={onExit}>
          <FiX />
        </button>
      </div>
      <div className="terminal-content">
        {/* Terminal content will be rendered here */}
        $ _
      </div>
    </div>
  );
};

// Define the theme interface without the 'selection' property
interface TerminalTheme extends Omit<ITheme, 'selection'> {
  selection?: string; // Make selection optional if needed
}

// Default theme for terminals
const defaultTheme: TerminalTheme = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  cursor: '#ffffff',
  cursorAccent: '#000000',
  black: '#000000',
  red: '#cd3131',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#e5e5e5',
};

// Available themes
const themes: Record<string, TerminalTheme> = {
  'Default Dark': defaultTheme,
  'Solarized Dark': {
    background: '#002b36',
    foreground: '#93a1a1',
    cursor: '#93a1a1',
    cursorAccent: '#002b36',
    black: '#073642',
    red: '#dc322f',
    green: '#859900',
    yellow: "#b58900",
    blue: "#268bd2",
    magenta: "#d33682",
    cyan: "#2aa198",
    white: "#eee8d5",
    brightBlack: "#586e75",
    brightRed: "#cb4b16",
    brightGreen: "#859900",
    brightYellow: "#b58900",
    brightBlue: "#268bd2",
    brightMagenta: "#6c71c4",
    brightCyan: "#2aa198",
    brightWhite: "#fdf6e3",
  },
  "High Contrast": {
    background: "#000000",
    foreground: "#ffffff",
    cursor: "#ffffff",
    cursorAccent: "#000000",
    black: "#000000",
    red: "#ff0000",
    green: "#00ff00",
    yellow: "#ffff00",
    blue: "#0000ff",
    magenta: "#ff00ff",
    cyan: "#00ffff",
    white: "#ffffff",
    brightBlack: "#666666",
    brightRed: "#ff6666",
    brightGreen: "#66ff66",
    brightYellow: '#b58900',
    brightBlue: '#268bd2',
    brightMagenta: '#6c71c4',
    brightCyan: '#2aa198',
    brightWhite: '#fdf6e3',
  },
};

interface TerminalSession {
  id: string;
  title: string;
  cwd: string;
  shell: string;
  theme: string;
  status: 'active' | 'terminated';
  lastActivity: Date;
}

interface TerminalTabsProps {
  initialCwd?: string;
  className?: string;
  onActiveTerminalChange?: (terminalId: string | null) => void;
}

const TerminalTabs: FC<TerminalTabsProps> = ({
  initialCwd = process.cwd(),
  className = "",
  onActiveTerminalChange,
}) => {
  // State for terminal sessions and active session
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [themeName, setThemeName] = useState<string>('Default Dark');
  const [showThemeSelector, setShowThemeSelector] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false);
  
  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const themeSelectorRef = useRef<HTMLDivElement>(null);

  // Initialize with one terminal
  useEffect(() => {
    if (sessions.length === 0) {
      const initialSession: TerminalSession = {
        id: `terminal-${Date.now()}`,
        title: 'Terminal',
        cwd: initialCwd,
        shell: process.env.SHELL || (process.platform === 'win32' ? 'powershell.exe' : 'bash'),
        theme: 'Default Dark',
        status: 'active',
        lastActivity: new Date(),
      };
      
      setSessions([initialSession]);
      setActiveSessionId(initialSession.id);
    }
  }, [initialCwd, sessions.length]);

  // Notify parent when active terminal changes
  useEffect(() => {
    if (onActiveTerminalChange) {
      onActiveTerminalChange(activeSessionId);
    }
  }, [activeSessionId, onActiveTerminalChange]);

  // Close theme selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeSelectorRef.current && !themeSelectorRef.current.contains(event.target as Node)) {
        setShowThemeSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const createNewTerminal = useCallback(() => {
    const newSession: TerminalSession = {
      id: `terminal-${Date.now()}`,
      title: `Terminal ${sessions.length + 1}`,
      cwd: activeSessionId 
        ? sessions.find(s => s.id === activeSessionId)?.cwd || initialCwd
        : initialCwd,
      shell: process.env.SHELL || (process.platform === 'win32' ? 'powershell.exe' : 'bash'),
      theme: themeName,
      status: 'active',
      lastActivity: new Date(),
    };

    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
  }, [sessions, activeSessionId, initialCwd, themeName]);

  const closeTerminal = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => {
      const newSessions = prev.filter(session => session.id !== id);
      if (newSessions.length === 0) {
        createNewTerminal();
      } else if (activeSessionId === id) {
        const currentIndex = prev.findIndex(s => s.id === id);
        const newActiveIndex = Math.min(currentIndex, newSessions.length - 1);
        setActiveSessionId(newSessions[newActiveIndex]?.id || null);
      }
      return newSessions;
    });
  }, [activeSessionId, createNewTerminal]);

  const refreshTerminal = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement terminal refresh logic
    console.log('Refreshing terminal:', id);
  }, []);

  const copyTerminal = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const session = sessions.find(s => s.id === id);
    if (session) {
      const newSession: TerminalSession = {
        ...session,
        id: `terminal-${Date.now()}`,
        title: `${session.title} (Copy)`,
        lastActivity: new Date(),
      };
      setSessions(prev => [...prev, newSession]);
      setActiveSessionId(newSession.id);
    }
  }, [sessions]);

  const toggleSearch = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSearch(prev => !prev);
    if (!showSearch && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [showSearch]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // TODO: Implement search functionality in terminal
  }, []);

  const changeTheme = useCallback((theme: string) => {
    setThemeName(theme);
    setShowThemeSelector(false);
  }, []);

  // Get active session and theme (moved to the end of the component)
  const generateSessionId = useCallback(() => `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, []);

  // Add a new terminal
  const addTerminal = useCallback((cwd: string = initialCwd, shell: string = '') => {
    const newSession: TerminalSession = {
      id: `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: `Terminal ${sessions.length + 1}`,
      cwd,
      shell,
      theme: themeName,
      status: 'active',
      lastActivity: new Date(),
    };

    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
  }, [initialCwd, sessions.length, themeName]);

  // Close a terminal
  const closeTerminal = useCallback((id: string) => {
    setSessions(prev => {
      const newSessions = prev.filter(session => session.id !== id);
      
      // If we're closing the active session, select another one
      if (id === activeSessionId) {
        const remainingSessions = newSessions.filter(s => s.id !== id);
        setActiveSessionId(remainingSessions[0]?.id || null);
      }
      
      return newSessions;
    });
  }, [activeSessionId]);

  // Restart a terminal
  const restartTerminal = useCallback((id: string) => {
    setSessions(prev => 
      prev.map(session => 
        session.id === id 
          ? { 
              ...session, 
              lastActivity: new Date(),
              status: 'active' as const 
            } 
          : session
      )
    );
  }, []);

  // Handle terminal exit
  const handleTerminalExit = useCallback((id: string) => {
    setSessions(prev => 
      prev.map(session => 
        session.id === id 
          ? { 
              ...session, 
              status: 'terminated' as const,
              lastActivity: new Date() 
            } 
          : session
      )
    );
  }, []);

  // Handle title change
  const handleTitleChange = useCallback((id: string, title: string) => {
    setSessions(prev => 
      prev.map(session => 
        session.id === id 
          ? { ...session, title } 
          : session
      )
    );
  }, []);

  // Handle theme change
  const handleThemeChange = useCallback((theme: string) => {
    setThemeName(theme);
    setShowThemeSelector(false);
  }, []);

  // Initialize with one terminal
  useEffect(() => {
    if (sessions.length === 0) {
      addTerminal();
    }
  }, [addTerminal, sessions.length]);

  // Get active session and theme
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const currentTheme = themes[themeName] || defaultTheme;

  return (
    <div className={`terminal-tabs-container ${className}`}>
      <div className="terminal-tabs-header">
        <div className="tabs-container">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`tab ${session.id === activeSessionId ? 'active' : ''}`}
              onClick={() => setActiveSessionId(session.id)}
            >
              <FiTerminal className="tab-icon" />
              <span className="tab-title">{session.title}</span>
              <button
                className="tab-close"
                onClick={(e) => closeTerminal(session.id, e)}
                title="Close terminal"
              >
                <FiX size={14} />
              </button>
            </div>
          ))}
          <button
            className="new-terminal-btn"
            onClick={createNewTerminal}
            title="New Terminal"
          >
            <FiPlus size={16} />
          </button>
        </div>
        
        <div className="terminal-actions">
          <button
            className="action-btn"
            onClick={(e) => refreshTerminal(activeSessionId!, e)}
            title="Restart Terminal"
          >
            <FiRefreshCw size={14} />
          </button>
          <button
            className="action-btn"
            onClick={(e) => copyTerminal(activeSessionId!, e)}
            title="Duplicate Terminal"
          >
            <FiCopy size={14} />
          </button>
          <div className="theme-selector" ref={themeSelectorRef}>
            <button
              className="action-btn"
              onClick={() => setShowThemeSelector(!showThemeSelector)}
              title="Change Theme"
            >
              <span className="theme-indicator" style={{ backgroundColor: currentTheme.foreground }} />
            </button>
            {showThemeSelector && (
              <div className="theme-dropdown">
                {Object.keys(themes).map((theme) => (
                  <div
                    key={theme}
                    className={`theme-option ${theme === themeName ? 'active' : ''}`}
                    onClick={() => changeTheme(theme)}
                  >
                    <span className="theme-preview" style={{ backgroundColor: themes[theme].background }} />
                    <span>{theme}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="terminal-content">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`terminal-pane ${session.id === activeSessionId ? 'active' : ''}`}
          >
            <TerminalPane
              sessionId={session.id}
              cwd={session.cwd}
              theme={themes[session.theme] || defaultTheme}
              onExit={() => {
                setSessions((prev: TerminalSession[]) => prev.filter(s => s.id !== session.id));
              }}
            />
          </div>
        ))}
      </div>

      {showSearch && (
        <div className="terminal-search">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search in terminal..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
          <button
            className="close-search"
            onClick={() => setShowSearch(false)}
          >
            <FiX size={14} />
          </button>
        </div>
      )}
    </div>
  );
    const handleClickOutside = (event: MouseEvent) => {
      if (
        themeSelectorRef.current &&
        !themeSelectorRef.current.contains(event.target as Node)
      ) {
        setShowThemeSelector(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const addTerminal = (cwd = initialCwd, shell = "") => {
    const newSession: TerminalSession = {
      id: `term-${Date.now()}-${nextSessionId.current++}`,
      title: "Terminal",
      cwd,
      shell:
        shell ||
        (navigator.platform.startsWith("Win") ? "powershell.exe" : "/bin/bash"),
      theme: themeName,
      status: "active",
      lastActivity: new Date(),
    };

    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(newSession.id);
    return newSession.id;
  };

  const closeTerminal = (id: string) => {
    setSessions((prev) => {
      const newSessions = prev.filter((session) => session.id !== id);
      if (activeSessionId === id) {
        setActiveSessionId(newSessions.length > 0 ? newSessions[0].id : null);
      }
      return newSessions;
    });
  };

  const restartTerminal = (id: string) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === id
          ? {
              ...session,
              status: "active",
              lastActivity: new Date(),
            }
          : session,
      ),
    );
  };

  const duplicateTerminal = (session: TerminalSession) => {
    const newId = addTerminal(session.cwd, session.shell);
    // Update the new session with the same theme
    setSessions((prev) =>
      prev.map((s) => (s.id === newId ? { ...s, theme: session.theme } : s)),
    );
  };

  const handleTerminalExit = (id: string) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === id
          ? {
              ...session,
              status: "terminated",
              lastActivity: new Date(),
            }
          : session,
      ),
    );
  };

  const handleTitleChange = (id: string, title: string) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === id ? { ...session, title } : session,
      ),
    );
  };

  const handleThemeChange = (theme: string) => {
    setThemeName(theme);
    setShowThemeSelector(false);

    // Update all active terminals with the new theme
    setSessions((prev) =>
      prev.map((session) =>
        session.status === "active" ? { ...session, theme } : session,
      ),
    );
  };

  const renderTabLabel = (session: TerminalSession) => {
    return (
      <div className="flex items-center space-x-1">
        <FiTerminal className="flex-shrink-0" size={12} />
        <span className="truncate max-w-[120px]" title={session.title}>
          {session.title}
        </span>
        {session.status === "terminated" && (
          <span className="text-xs text-red-400">(exited)</span>
        )}
      </div>
    );
  };

  // Get active session and theme for rendering
  const activeSession = sessions.length > 0 
    ? sessions.find((s) => s.id === activeSessionId) || sessions[0]
    : null;
  const currentTheme = themes[themeName] || defaultTheme;
  
  // Toggle search visibility
  const toggleSearch = useCallback(() => {
    setIsSearchVisible(prev => !prev);
    if (!isSearchVisible) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isSearchVisible]);
  
  // Handle terminal actions
  const closeTerminal = useCallback((id: string) => {
    setSessions(prev => {
      const newSessions = prev.filter(s => s.id !== id);
      if (activeSessionId === id) {
        setActiveSessionId(newSessions[0]?.id || null);
      }
      return newSessions;
    });
  }, [activeSessionId]);
  
  const restartTerminal = useCallback((id: string) => {
    setSessions(prev => 
      prev.map(session => 
        session.id === id 
          ? { ...session, status: 'active', lastActivity: new Date() }
          : session
      )
    );
  }, []);
  
  const duplicateTerminal = useCallback((session: TerminalSession) => {
    const newSession = {
      ...session,
      id: `terminal-${Date.now()}`,
      title: `${session.title} (Copy)`,
      lastActivity: new Date()
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
  }, []);
  
  const handleTerminalExit = useCallback((id: string) => {
    setSessions(prev => 
      prev.map(session => 
        session.id === id 
          ? { ...session, status: 'terminated' }
          : session
      )
    );
  }, []);
  
  const handleTitleChange = useCallback((id: string, title: string) => {
    setSessions(prev => 
      prev.map(session => 
        session.id === id 
          ? { ...session, title }
          : session
      )
    );
  }, []);
  
  const handleThemeChange = useCallback((theme: string) => {
    setThemeName(theme);
    setShowThemeSelector(false);
  }, []);
  
  const renderTabLabel = useCallback((session: TerminalSession) => (
    <div className="flex items-center">
      <FiTerminal className="mr-2" />
      <span className="truncate">{session.title}</span>
    </div>
  ), []);

  return (
    <div className={`flex flex-col h-full bg-gray-900 ${className}`}>
      {/* Tab Bar */}
      <div className="flex items-center bg-gray-800 border-b border-gray-700">
        <div className="flex-1 flex overflow-x-auto hide-scrollbar">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group flex items-center px-3 py-2 text-sm cursor-pointer border-b-2 transition-colors ${
                activeSessionId === session.id
                  ? "border-blue-500 bg-gray-900 text-white"
                  : "border-transparent text-gray-400 hover:bg-gray-750 hover:text-white"
              } ${session.status === "terminated" ? "opacity-70" : ""}`}
              onClick={() => setActiveSessionId(session.id)}
            >
              {renderTabLabel(session)}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTerminal(session.id);
                }}
                className="ml-2 opacity-0 group-hover:opacity-70 hover:opacity-100 text-gray-300 hover:text-white"
                title="Close Terminal"
              >
                <FiX size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Tab Actions */}
        <div className="flex items-center px-2 space-x-1 border-l border-gray-700">
          <button
            onClick={() => addTerminal()}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            title="New Terminal"
          >
            <FiPlus size={16} />
          </button>

          <div className="relative" ref={themeSelectorRef}>
            <button
              onClick={() => setShowThemeSelector(!showThemeSelector)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
              title="Change Theme"
            >
              <div
                className="w-4 h-4 rounded border"
                style={{ backgroundColor: currentTheme.background }}
              />
            </button>

            {showThemeSelector && (
              <div className="absolute right-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded shadow-lg z-50 py-1">
                <div className="px-3 py-1 text-xs text-gray-400 uppercase tracking-wider">
                  Themes
                </div>
                {Object.keys(themes).map((theme) => (
                  <button
                    key={theme}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center ${
                      theme === themeName
                        ? "bg-blue-600 text-white"
                        : "text-gray-300 hover:bg-gray-700"
                    }`}
                    onClick={() => handleThemeChange(theme)}
                  >
                    <div
                      className="w-3 h-3 rounded-full mr-2 border border-gray-600"
                      style={{ backgroundColor: themes[theme].background }}
                    />
                    {theme}
                  </button>
                ))}
              </div>
            )}
          </div>

          {activeSession && (
            <>
              <button
                onClick={() => duplicateTerminal(activeSession)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                title="Duplicate Terminal"
              >
                <FiCopy size={14} />
              </button>

              <button
                onClick={() => restartTerminal(activeSession.id)}
                className={`p-1.5 rounded ${
                  activeSession.status === "terminated"
                    ? "text-green-400 hover:text-green-300 hover:bg-gray-700"
                    : "text-gray-500 cursor-not-allowed"
                }`}
                title="Restart Terminal"
                disabled={activeSession.status !== "terminated"}
              >
                <FiRefreshCw size={14} />
              </button>

              <div className="relative mx-2">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-700 text-sm text-white px-2 py-1 rounded w-32 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <FiSearch
                  className="absolute right-2 top-1.5 text-gray-400"
                  size={14}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Terminal Container */}
      <div className="flex-1 overflow-hidden relative">
        {activeSession ? (
          <div className="h-full">
            <TerminalPane
              cwd={activeSession.cwd}
              onExit={() => closeTerminal(activeSession.id, new MouseEvent('click') as any)}
              onTitleChange={(title) => handleTitleChange(activeSession.id, title)}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            No active terminals
          </div>
        )}
      </div>
    </div>
  );
};

// Hide scrollbar but keep functionality
const style = document.createElement("style");
style.textContent = `
  .hide-scrollbar::-webkit-scrollbar {
    height: 4px;
  }
  .hide-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
  .hide-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
`;
document.head.appendChild(style);
