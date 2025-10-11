import React, { useState } from "react";
import { TerminalPane } from "./TerminalPane";
import { FaTerminal, FaPlus, FaTimes, FaCopy, FaPaste, FaDownload, FaUpload, FaCog, FaPlay, FaStop } from "react-icons/fa";

type Terminal = {
  id: string;
  name: string;
  cwd: string;
  shell: string;
  status: 'running' | 'stopped' | 'error';
  splitDirection?: 'horizontal' | 'vertical';
  parentId?: string;
  children?: string[];
};

// Removed unused type

type Props = {
  projectRoot: string;
};

export const TerminalTabs: React.FC<Props> = ({ projectRoot }) => {
  const [terminals, setTerminals] = useState<Terminal[]>([
    { id: "1", name: "Terminal 1", cwd: projectRoot, shell: "cmd.exe", status: 'running' }
  ]);
  const [activeTerminal, setActiveTerminal] = useState("1");
  const [showShellSelector, setShowShellSelector] = useState(false);
  const [availableShells] = useState<string[]>(['cmd.exe', 'powershell.exe', 'bash', 'zsh']);
  const [terminalBookmarks, setTerminalBookmarks] = useState<Record<string, string>>({});

  const addTerminal = (shell: string = 'cmd.exe') => {
    const newId = Date.now().toString();
    const newTerminal = {
      id: newId,
      name: `Terminal ${terminals.length + 1}`,
      cwd: projectRoot,
      shell,
      status: 'running' as const
    };
    setTerminals(prev => [...prev, newTerminal]);
    setActiveTerminal(newId);
    setShowShellSelector(false);
  };

  const closeTerminal = (id: string) => {
    if (terminals.length === 1) return; // Keep at least one terminal
    
    setTerminals(prev => prev.filter(t => t.id !== id));
    
    if (activeTerminal === id) {
      const remaining = terminals.filter(t => t.id !== id);
      setActiveTerminal(remaining[0]?.id || "");
    }
  };

  const splitTerminal = (id: string, direction: 'horizontal' | 'vertical') => {
    const newId = Date.now().toString();
    const terminal = terminals.find(t => t.id === id);
    if (!terminal) return;

    const newTerminal = {
      id: newId,
      name: `Terminal ${terminals.length + 1}`,
      cwd: terminal.cwd,
      shell: terminal.shell,
      status: 'running' as const,
      splitDirection: direction,
      parentId: id
    };

    setTerminals(prev => [...prev, newTerminal]);
    setActiveTerminal(newId);
  };

  const restartTerminal = (id: string) => {
    setTerminals(prev => prev.map(t => 
      t.id === id ? { ...t, status: 'running' } : t
    ));
  };

  const stopTerminal = (id: string) => {
    setTerminals(prev => prev.map(t => 
      t.id === id ? { ...t, status: 'stopped' } : t
    ));
  };

  const copyTerminalOutput = async (id: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/terminal/copy/${id}`);
      const data = await response.json();
      await navigator.clipboard.writeText(data.output);
    } catch (error) {
      console.error('Failed to copy terminal output:', error);
    }
  };

  const pasteToTerminal = async (id: string) => {
    try {
      const text = await navigator.clipboard.readText();
      await fetch(`http://127.0.0.1:8000/terminal/paste/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
    } catch (error) {
      console.error('Failed to paste to terminal:', error);
    }
  };

  const downloadTerminalOutput = async (id: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/terminal/download/${id}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `terminal-${id}-output.txt`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download terminal output:', error);
    }
  };

  const uploadToTerminal = (id: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        await fetch(`http://127.0.0.1:8000/terminal/upload/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        });
      } catch (error) {
        console.error('Failed to upload to terminal:', error);
      }
    };
    reader.readAsText(file);
  };

  const addBookmark = (id: string, name: string) => {
    const terminal = terminals.find(t => t.id === id);
    if (terminal) {
      setTerminalBookmarks(prev => ({ ...prev, [id]: name }));
    }
  };

  // Removed unused function

  const activeTab = terminals.find(t => t.id === activeTerminal);

  return (
    <div className="h-full flex flex-col">
      {/* Terminal Tabs */}
      <div className="flex bg-gray-800 border-b border-gray-700">
        {terminals.map((terminal) => (
          <div
            key={terminal.id}
            className={`flex items-center px-3 py-1 cursor-pointer text-sm ${
              activeTerminal === terminal.id
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
            onClick={() => setActiveTerminal(terminal.id)}
          >
            <FaTerminal className="w-3 h-3 mr-2" />
            <span className="mr-2">{terminal.name}</span>
            <span className={`w-2 h-2 rounded-full mr-2 ${
              terminal.status === 'running' ? 'bg-green-400' :
              terminal.status === 'stopped' ? 'bg-red-400' :
              'bg-yellow-400'
            }`} />
            
            {/* Terminal actions */}
            <div className="flex space-x-1 opacity-0 group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  splitTerminal(terminal.id, 'horizontal');
                }}
                className="p-1 hover:bg-gray-600 rounded"
                title="Split Horizontal"
              >
                <FaPlus className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  copyTerminalOutput(terminal.id);
                }}
                className="p-1 hover:bg-gray-600 rounded"
                title="Copy Output"
              >
                <FaCopy className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadTerminalOutput(terminal.id);
                }}
                className="p-1 hover:bg-gray-600 rounded"
                title="Download Output"
              >
                <FaDownload className="w-3 h-3" />
              </button>
              {terminal.status === 'running' ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    stopTerminal(terminal.id);
                  }}
                  className="p-1 hover:bg-gray-600 rounded"
                  title="Stop Terminal"
                >
                  <FaStop className="w-3 h-3" />
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    restartTerminal(terminal.id);
                  }}
                  className="p-1 hover:bg-gray-600 rounded"
                  title="Restart Terminal"
                >
                  <FaPlay className="w-3 h-3" />
                </button>
              )}
            </div>
            
            {terminals.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTerminal(terminal.id);
                }}
                className="text-gray-500 hover:text-white text-xs ml-2"
              >
                <FaTimes className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        
        <div className="flex items-center">
          <button
            onClick={() => setShowShellSelector(!showShellSelector)}
            className="px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-700 text-sm"
            title="Add Terminal"
          >
            <FaPlus className="w-3 h-3" />
          </button>
          
          {showShellSelector && (
            <div className="absolute top-8 right-2 bg-gray-800 border border-gray-600 rounded shadow-lg z-10">
              <div className="p-2">
                <div className="text-xs text-gray-400 mb-2">Select Shell:</div>
                {availableShells.map((shell) => (
                  <button
                    key={shell}
                    onClick={() => addTerminal(shell)}
                    className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-700 rounded"
                  >
                    {shell}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Terminal Toolbar */}
      {activeTab && (
        <div className="flex items-center justify-between bg-gray-700 px-2 py-1 text-xs">
          <div className="flex items-center space-x-4">
            <span>Shell: {activeTab.shell}</span>
            <span>CWD: {activeTab.cwd}</span>
            <span>Status: {activeTab.status}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => pasteToTerminal(activeTab.id)}
              className="p-1 hover:bg-gray-600 rounded"
              title="Paste"
            >
              <FaPaste className="w-3 h-3" />
            </button>
            
            <label className="p-1 hover:bg-gray-600 rounded cursor-pointer" title="Upload File">
              <FaUpload className="w-3 h-3" />
              <input
                type="file"
                onChange={(e) => uploadToTerminal(activeTab.id, e)}
                className="hidden"
              />
            </label>
            
            <button
              onClick={() => addBookmark(activeTab.id, prompt('Bookmark name:') || '')}
              className="p-1 hover:bg-gray-600 rounded"
              title="Add Bookmark"
            >
              <FaCog className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Active Terminal */}
      <div className="flex-1">
        {activeTab && (
          <TerminalPane 
            cwd={activeTab.cwd} 
            command={activeTab.shell}
          />
        )}
      </div>

      {/* Terminal Bookmarks */}
      {Object.keys(terminalBookmarks).length > 0 && (
        <div className="border-t border-gray-700 p-2">
          <div className="text-xs text-gray-400 mb-1">Bookmarks:</div>
          <div className="flex space-x-2">
            {Object.entries(terminalBookmarks).map(([id, name]) => (
              <button
                key={id}
                onClick={() => setActiveTerminal(id)}
                className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
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