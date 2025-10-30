import React, { useState, useCallback } from "react";
import { TerminalPane } from "./TerminalPane";
import { FiTerminal } from 'react-icons/fi';

type TerminalStatus = 'running' | 'stopped' | 'terminated' | 'error';

interface TerminalSession {
  id: string;
  name: string;
  title: string;
  cwd: string;
  shell: string;
  status: TerminalStatus;
  splitDirection?: 'horizontal' | 'vertical';
  parentId?: string;
  children?: string[];
  lastActivity?: string;
}

interface Theme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selection: string;
  black?: string;
  red?: string;
  green?: string;
  yellow?: string;
  blue?: string;
  magenta?: string;
  cyan?: string;
  white?: string;
  brightBlack?: string;
  brightRed?: string;
  brightGreen?: string;
  brightYellow?: string;
  brightBlue?: string;
  brightMagenta?: string;
  brightCyan?: string;
  brightWhite?: string;
}

interface TerminalTabsProps {
  projectRoot: string;
  className?: string;
}

const defaultTheme: Theme = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  cursor: '#ffffff',
  cursorAccent: '#000000',
  selection: '#264f78',
};

export const TerminalTabs: React.FC<TerminalTabsProps> = ({ projectRoot, className = '' }) => {
  const [sessions, setSessions] = useState<TerminalSession[]>([
    { 
      id: "1", 
      name: "Terminal 1", 
      title: "Terminal 1",
      cwd: projectRoot, 
      shell: "cmd.exe", 
      status: 'running',
      lastActivity: new Date().toISOString()
    }
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>("1");
  const [showShellSelector, setShowShellSelector] = useState(false);
  const [availableShells] = useState<string[]>(['cmd.exe', 'powershell.exe', 'bash', 'zsh']);
  const [terminalBookmarks, setTerminalBookmarks] = useState<Record<string, string>>({});
  
  // Theme state
  const [themeName, setThemeName] = useState<string>('default-dark');
  const [themes] = useState<Record<string, Theme>>({
    'default-dark': defaultTheme,
    'solarized-dark': {
      background: '#002b36',
      foreground: '#839496',
      cursor: '#93a1a1',
      cursorAccent: '#000000',
      selection: '#073642',
      black: '#073642',
      red: '#dc322f',
      green: '#859900',
      yellow: '#b58900',
      blue: '#268bd2',
      magenta: '#d33682',
      cyan: '#2aa198',
      white: '#eee8d5',
      brightBlack: '#002b36',
      brightRed: '#cb4b16',
      brightGreen: '#586e75',
      brightYellow: '#657b83',
      brightBlue: '#839496',
      brightMagenta: '#6c71c4',
      brightCyan: '#93a1a1',
      brightWhite: '#fdf6e3'
    },
    'one-dark': {
      background: '#282c34',
      foreground: '#abb2bf',
      cursor: '#528bff',
      cursorAccent: '#000000',
      selection: '#3e4451',
      black: '#282c34',
      red: '#e06c75',
      green: '#98c379',
      yellow: '#e5c07b',
      blue: '#61afef',
      magenta: '#c678dd',
      cyan: '#56b6c2',
      white: '#abb2bf',
      brightBlack: '#5c6370',
      brightRed: '#e06c75',
      brightGreen: '#98c379',
      brightYellow: '#e5c07b',
      brightBlue: '#61afef',
      brightMagenta: '#c678dd',
      brightCyan: '#56b6c2',
      brightWhite: '#ffffff'
    }
  });

  const addTerminal = useCallback((shell: string = 'cmd.exe') => {
    const newId = Date.now().toString();
    const newTerminal: TerminalSession = {
      id: newId,
      name: `Terminal ${sessions.length + 1}`,
      title: `Terminal ${sessions.length + 1}`,
      cwd: projectRoot,
      shell,
      status: 'running',
      lastActivity: new Date().toISOString()
    };
    setSessions(prev => [...prev, newTerminal]);
    setActiveSessionId(newId);
    setShowShellSelector(false);
  }, [projectRoot, sessions.length]);

  const closeTerminal = useCallback((id: string) => {
    if (sessions.length === 1) return; // Keep at least one terminal
    
    setSessions(prev => {
      const newSessions = prev.filter(t => t.id !== id);
      if (activeSessionId === id && newSessions.length > 0) {
        setActiveSessionId(newSessions[0].id);
      }
      return newSessions;
    });
  }, [activeSessionId, sessions.length]);

  const splitTerminal = useCallback((id: string, direction: 'horizontal' | 'vertical') => {
    const terminal = sessions.find(t => t.id === id);
    if (!terminal) return;

    const newId = Date.now().toString();
    const newTerminal: TerminalSession = {
      id: newId,
      name: `Terminal ${sessions.length + 1}`,
      title: `Terminal ${sessions.length + 1}`,
      cwd: terminal.cwd,
      shell: terminal.shell,
      status: 'running',
      splitDirection: direction,
      parentId: id,
      lastActivity: new Date().toISOString()
    };

    setSessions(prev => [...prev, newTerminal]);
    setActiveSessionId(newId);
  }, [sessions]);

  const restartTerminal = useCallback((id: string) => {
    setSessions(prev => prev.map(t => 
      t.id === id ? { 
        ...t, 
        status: 'running',
        lastActivity: new Date().toISOString() 
      } : t
    ));
  }, []);

  const stopTerminal = useCallback((id: string) => {
    setSessions(prev => prev.map(t => 
      t.id === id ? { 
        ...t, 
        status: 'stopped',
        lastActivity: new Date().toISOString() 
      } : t
    ));
  }, []);

  const copyTerminalOutput = useCallback(async (id: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/terminal/copy/${id}`);
      if (!response.ok) throw new Error('Failed to fetch terminal output');
      const data = await response.json();
      await navigator.clipboard.writeText(data.output || '');
    } catch (error) {
      console.error('Failed to copy terminal output:', error);
    }
  }, []);

  const pasteToTerminal = useCallback(async (id: string) => {
    try {
      const text = await navigator.clipboard.readText();
      const response = await fetch(`http://127.0.0.1:8000/terminal/paste/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (!response.ok) throw new Error('Failed to paste to terminal');
    } catch (error) {
      console.error('Failed to paste to terminal:', error);
    }
  }, []);

  const downloadTerminalOutput = useCallback(async (id: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/terminal/download/${id}`);
      if (!response.ok) throw new Error('Failed to download terminal output');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `terminal-output-${id}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Failed to download terminal output:', error);
    }
  }, []);

  const addBookmark = useCallback((id: string, name: string) => {
    setTerminalBookmarks(prev => ({
      ...prev,
      [id]: name
    }));
  }, []);

  const uploadToTerminal = useCallback(async (id: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`http://127.0.0.1:8000/terminal/upload/${id}`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Failed to upload file');
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  }, []);

  const renderTabLabel = (session: TerminalSession) => {
    return (
      <div className="flex items-center space-x-1">
        <FiTerminal className="flex-shrink-0" size={12} />
        <span className="truncate max-w-[120px]" title={session.title}>
          {session.title}
        </span>
        {session.status === 'terminated' && (
          <span className="text-xs text-red-400">(exited)</span>
        )}
      </div>
    );
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const currentTheme = themes[themeName] || defaultTheme;
  
  // Fallback to first session if active session doesn't exist
  const activeTab = activeSession || sessions[0];

  return (
    <div className={`flex flex-col h-full bg-gray-900 ${className}`}>
      {/* Tab Bar */}
      <div className="flex items-center bg-gray-800 border-b border-gray-700">
        <div className="flex-1 flex overflow-x-auto hide-scrollbar">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center">
              <div
                className={`group flex items-center px-3 py-2 text-sm cursor-pointer border-b-2 transition-colors ${
                  activeSessionId === session.id
                    ? 'border-blue-500 bg-gray-900 text-white'
                    : 'border-transparent text-gray-400 hover:bg-gray-750 hover:text-white'
                } ${session.status === 'terminated' ? 'opacity-70' : ''}`}
                onClick={() => setActiveSessionId(session.id)}
              >
                {renderTabLabel(session)}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    splitTerminal(session.id, 'horizontal');
                  }}
                  className="p-1 hover:bg-slate-700/50 rounded text-slate-500 hover:text-slate-300 transition-colors duration-150"
                  title="Split Terminal"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyTerminalOutput(session.id);
                  }}
                  className="p-1 hover:bg-slate-700/50 rounded text-slate-500 hover:text-slate-300 transition-colors duration-150"
                  title="Copy Output"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>

                {session.status === 'running' ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      stopTerminal(session.id);
                    }}
                    className="p-1 hover:bg-slate-700/50 rounded text-slate-500 hover:text-red-400 transition-colors duration-150"
                    title="Stop Terminal"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      restartTerminal(session.id);
                    }}
                    className="p-1 hover:bg-slate-700/50 rounded text-slate-500 hover:text-green-400 transition-colors duration-150"
                    title="Restart Terminal"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Close Button */}
              {sessions.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTerminal(session.id);
                  }}
                  className="p-1 hover:bg-slate-700/50 rounded text-slate-500 hover:text-slate-300 transition-colors duration-150 ml-1"
                  title="Close Terminal"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add Terminal Button */}
        <div className="relative flex items-center">
          {/* ... */}
            onClick={() => setShowShellSelector(!showShellSelector)}
            className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-all duration-150 rounded-lg mx-2"
            title="Add Terminal"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          
          {/* Shell Selector Dropdown */}
          {showShellSelector && (
            <div className="absolute top-full left-2 mt-1 bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-2xl z-20 min-w-48">
              <div className="p-3">
                <div className="text-xs font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3" />
                  </svg>
                  Select Shell
                </div>
                <div className="space-y-1">
                  {availableShells.map((shell) => (
                    <button
                      key={shell}
                      onClick={() => addTerminal(shell)}
                      className="flex items-center gap-3 w-full text-left px-3 py-2 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-700/50 rounded-lg transition-all duration-150"
                    >
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      {shell}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modern Terminal Toolbar */}
      {activeTab && (
        <div className="flex items-center justify-between bg-slate-800/30 backdrop-blur-sm px-4 py-2 border-b border-slate-800/60">
          <div className="flex items-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3" />
              </svg>
              <span className="font-medium">{activeTab.shell}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              </svg>
              <span className="font-mono text-xs truncate max-w-48" title={activeTab.cwd}>
                {activeTab.cwd.split(/[\\/]/).pop() || activeTab.cwd}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                activeTab.status === 'running' ? 'bg-green-400' :
                activeTab.status === 'stopped' ? 'bg-red-400' :
                'bg-yellow-400'
              }`} />
              <span className="capitalize">{activeTab.status}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => pasteToTerminal(activeTab.id)}
              className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-500 hover:text-slate-300 transition-all duration-150"
              title="Paste from Clipboard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </button>
            
            <button
              onClick={() => downloadTerminalOutput(activeTab.id)}
              className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-500 hover:text-slate-300 transition-all duration-150"
              title="Download Output"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            
            <label className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-500 hover:text-slate-300 transition-all duration-150 cursor-pointer" title="Upload File">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <input
                type="file"
                onChange={(e) => uploadToTerminal(activeTab.id, e)}
                className="hidden"
              />
            </label>
            
            <div className="h-4 w-px bg-slate-700 mx-1"></div>
            
            <button
              onClick={() => {
                const name = prompt('Bookmark name:');
                if (name) addBookmark(activeTab.id, name);
              }}
              className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-500 hover:text-slate-300 transition-all duration-150"
              title="Add Bookmark"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Active Terminal */}
      <div className="flex-1 overflow-hidden">
        {activeTab && (
          <TerminalPane 
            sessionId={activeTab.id}
            cwd={activeTab.cwd}
            shell={activeTab.shell}
            theme={currentTheme}
            onTitleChange={(title) => {
              setSessions(prev => prev.map(t => 
                t.id === activeTab.id ? { ...t, title, lastActivity: new Date().toISOString() } : t
              ));
            }}
            onExit={(exitCode) => {
              setSessions(prev => prev.map(t => 
                t.id === activeTab.id 
                  ? { ...t, status: 'terminated', lastActivity: new Date().toISOString() }
                  : t
              ));
            }}
            onData={(data) => {
              // Update last activity on data
              setSessions(prev => prev.map(t => 
                t.id === activeTab.id 
                  ? { ...t, lastActivity: new Date().toISOString() }
                  : t
              ));
            }}
            className="h-full w-full"
          />
        )}
      </div>

      {/* Modern Terminal Bookmarks */}
      {Object.keys(terminalBookmarks).length > 0 && (
        <div className="border-t border-slate-800/60 p-3 bg-slate-900/30">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-300 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            Bookmarks
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(terminalBookmarks).map(([id, name]) => (
              <button
                key={id}
                onClick={() => setActiveSessionId(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  activeSessionId === id
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-slate-200'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};