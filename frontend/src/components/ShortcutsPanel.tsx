// src/components/ShortcutsPanel.tsx
import React, { useState, useEffect } from "react";
import { FaKeyboard, FaSave, FaUndo, FaRedo, FaSearch, FaFile, FaFolder, FaTerminal, FaGitAlt, FaBug, FaCog } from "react-icons/fa";

type Shortcut = {
  id: string;
  name: string;
  description: string;
  key: string;
  category: string;
  editable: boolean;
  icon?: React.ReactNode;
};

type ShortcutCategory = {
  id: string;
  name: string;
  icon: React.ReactNode;
};

type Props = {
  onShortcutChange?: (shortcuts: Shortcut[]) => void;
};

export const ShortcutsPanel: React.FC<Props> = ({ onShortcutChange }) => {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [filteredShortcuts, setFilteredShortcuts] = useState<Shortcut[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [newKey, setNewKey] = useState('');

  const categories: ShortcutCategory[] = [
    { id: 'all', name: 'All', icon: <FaKeyboard /> },
    { id: 'file', name: 'File', icon: <FaFile /> },
    { id: 'edit', name: 'Edit', icon: <FaUndo /> },
    { id: 'search', name: 'Search', icon: <FaSearch /> },
    { id: 'navigation', name: 'Navigation', icon: <FaFolder /> },
    { id: 'git', name: 'Git', icon: <FaGitAlt /> },
    { id: 'debug', name: 'Debug', icon: <FaBug /> },
    { id: 'terminal', name: 'Terminal', icon: <FaTerminal /> },
    { id: 'system', name: 'System', icon: <FaCog /> }
  ];

  const defaultShortcuts: Shortcut[] = [
    // File operations
    { id: 'file.new', name: 'New File', description: 'Create a new file', key: 'Ctrl+N', category: 'file', editable: true, icon: <FaFile /> },
    { id: 'file.open', name: 'Open File', description: 'Open a file', key: 'Ctrl+O', category: 'file', editable: true, icon: <FaFile /> },
    { id: 'file.save', name: 'Save File', description: 'Save current file', key: 'Ctrl+S', category: 'file', editable: true, icon: <FaSave /> },
    { id: 'file.close', name: 'Close File', description: 'Close current file', key: 'Ctrl+W', category: 'file', editable: true, icon: <FaFile /> },
    
    // Edit operations
    { id: 'edit.undo', name: 'Undo', description: 'Undo last action', key: 'Ctrl+Z', category: 'edit', editable: true, icon: <FaUndo /> },
    { id: 'edit.redo', name: 'Redo', description: 'Redo last undone action', key: 'Ctrl+Y', category: 'edit', editable: true, icon: <FaRedo /> },
    { id: 'edit.cut', name: 'Cut', description: 'Cut selected text', key: 'Ctrl+X', category: 'edit', editable: true },
    { id: 'edit.copy', name: 'Copy', description: 'Copy selected text', key: 'Ctrl+C', category: 'edit', editable: true },
    { id: 'edit.paste', name: 'Paste', description: 'Paste from clipboard', key: 'Ctrl+V', category: 'edit', editable: true },
    
    // Search operations
    { id: 'search.find', name: 'Find', description: 'Find text in file', key: 'Ctrl+F', category: 'search', editable: true, icon: <FaSearch /> },
    { id: 'search.replace', name: 'Replace', description: 'Find and replace text', key: 'Ctrl+H', category: 'search', editable: true, icon: <FaSearch /> },
    { id: 'search.findInFiles', name: 'Find in Files', description: 'Search across all files', key: 'Ctrl+Shift+F', category: 'search', editable: true, icon: <FaSearch /> },
    
    // Navigation
    { id: 'nav.quickOpen', name: 'Quick Open', description: 'Quickly open files', key: 'Ctrl+P', category: 'navigation', editable: true, icon: <FaFolder /> },
    { id: 'nav.goToLine', name: 'Go to Line', description: 'Jump to specific line', key: 'Ctrl+G', category: 'navigation', editable: true },
    { id: 'nav.toggleSidebar', name: 'Toggle Sidebar', description: 'Show/hide file tree', key: 'Ctrl+B', category: 'navigation', editable: true },
    
    // Git operations
    { id: 'git.status', name: 'Git Status', description: 'Show git status', key: 'Ctrl+Shift+G', category: 'git', editable: true, icon: <FaGitAlt /> },
    { id: 'git.commit', name: 'Git Commit', description: 'Commit changes', key: 'Ctrl+Shift+C', category: 'git', editable: true, icon: <FaGitAlt /> },
    { id: 'git.push', name: 'Git Push', description: 'Push to remote', key: 'Ctrl+Shift+P', category: 'git', editable: true, icon: <FaGitAlt /> },
    
    // Debug operations
    { id: 'debug.start', name: 'Start Debugging', description: 'Start debug session', key: 'F5', category: 'debug', editable: true, icon: <FaBug /> },
    { id: 'debug.stepOver', name: 'Step Over', description: 'Step over current line', key: 'F10', category: 'debug', editable: true, icon: <FaBug /> },
    { id: 'debug.stepInto', name: 'Step Into', description: 'Step into function', key: 'F11', category: 'debug', editable: true, icon: <FaBug /> },
    { id: 'debug.stepOut', name: 'Step Out', description: 'Step out of function', key: 'Shift+F11', category: 'debug', editable: true, icon: <FaBug /> },
    
    // Terminal operations
    { id: 'terminal.new', name: 'New Terminal', description: 'Open new terminal', key: 'Ctrl+Shift+`', category: 'terminal', editable: true, icon: <FaTerminal /> },
    { id: 'terminal.toggle', name: 'Toggle Terminal', description: 'Show/hide terminal', key: 'Ctrl+`', category: 'terminal', editable: true, icon: <FaTerminal /> },
    
    // System operations
    { id: 'system.settings', name: 'Settings', description: 'Open settings', key: 'Ctrl+,', category: 'system', editable: true, icon: <FaCog /> },
    { id: 'system.commandPalette', name: 'Command Palette', description: 'Open command palette', key: 'Ctrl+Shift+P', category: 'system', editable: true },
  ];

  useEffect(() => {
    // Load shortcuts from localStorage or use defaults
    const savedShortcuts = localStorage.getItem('vybe-shortcuts');
    if (savedShortcuts) {
      setShortcuts(JSON.parse(savedShortcuts));
    } else {
      setShortcuts(defaultShortcuts);
    }
  }, []);

  useEffect(() => {
    // Filter shortcuts based on category and search term
    let filtered = shortcuts;
    
    if (activeCategory !== 'all') {
      filtered = filtered.filter(s => s.category === activeCategory);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.key.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredShortcuts(filtered);
  }, [shortcuts, activeCategory, searchTerm]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingShortcut) {
      e.preventDefault();
      const key = e.key;
      const modifiers = [];
      
      if (e.ctrlKey) modifiers.push('Ctrl');
      if (e.shiftKey) modifiers.push('Shift');
      if (e.altKey) modifiers.push('Alt');
      if (e.metaKey) modifiers.push('Meta');
      
      let keyString = '';
      if (modifiers.length > 0) {
        keyString = modifiers.join('+') + '+';
      }
      keyString += key;
      
      setNewKey(keyString);
    }
  };

  const saveShortcut = (shortcutId: string) => {
    if (!newKey.trim()) return;
    
    const updatedShortcuts = shortcuts.map(s => 
      s.id === shortcutId ? { ...s, key: newKey } : s
    );
    
    setShortcuts(updatedShortcuts);
    localStorage.setItem('vybe-shortcuts', JSON.stringify(updatedShortcuts));
    setEditingShortcut(null);
    setNewKey('');
    
    if (onShortcutChange) {
      onShortcutChange(updatedShortcuts);
    }
  };

  const resetToDefaults = () => {
    setShortcuts(defaultShortcuts);
    localStorage.setItem('vybe-shortcuts', JSON.stringify(defaultShortcuts));
    
    if (onShortcutChange) {
      onShortcutChange(defaultShortcuts);
    }
  };

  const exportShortcuts = () => {
    const dataStr = JSON.stringify(shortcuts, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vybe-shortcuts.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importShortcuts = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        setShortcuts(imported);
        localStorage.setItem('vybe-shortcuts', JSON.stringify(imported));
        
        if (onShortcutChange) {
          onShortcutChange(imported);
        }
      } catch (error) {
        console.error('Failed to import shortcuts:', error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-200">
      {/* Header */}
      <div className="p-2 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <FaKeyboard className="text-blue-400" />
            <span className="font-medium">Keyboard Shortcuts</span>
          </div>
          
          <div className="flex space-x-2">
            <button
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
              onClick={exportShortcuts}
            >
              Export
            </button>
            <label className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm cursor-pointer">
              Import
              <input
                type="file"
                accept=".json"
                onChange={importShortcuts}
                className="hidden"
              />
            </label>
            <button
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm"
              onClick={resetToDefaults}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-2">
          <input
            type="text"
            placeholder="Search shortcuts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-sm"
          />
        </div>

        {/* Category tabs */}
        <div className="flex space-x-1 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`px-3 py-1 rounded text-sm flex items-center space-x-1 whitespace-nowrap ${
                activeCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              }`}
              onClick={() => setActiveCategory(category.id)}
            >
              {category.icon}
              <span>{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Shortcuts list */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredShortcuts.length === 0 ? (
          <div className="p-4 text-gray-500 text-center">No shortcuts found</div>
        ) : (
          <div className="space-y-1">
            {filteredShortcuts.map((shortcut) => (
              <div
                key={shortcut.id}
                className="flex items-center p-2 hover:bg-gray-800 rounded group"
              >
                <div className="w-6 mr-3">
                  {shortcut.icon}
                </div>
                
                <div className="flex-1">
                  <div className="text-sm font-medium">{shortcut.name}</div>
                  <div className="text-xs text-gray-400">{shortcut.description}</div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {editingShortcut === shortcut.id ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
                        placeholder="Press keys..."
                        autoFocus
                      />
                      <button
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                        onClick={() => saveShortcut(shortcut.id)}
                      >
                        Save
                      </button>
                      <button
                        className="px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm"
                        onClick={() => {
                          setEditingShortcut(null);
                          setNewKey('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-mono bg-gray-800 px-2 py-1 rounded">
                        {shortcut.key}
                      </span>
                      {shortcut.editable && (
                        <button
                          className="p-1 hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100"
                          onClick={() => {
                            setEditingShortcut(shortcut.id);
                            setNewKey(shortcut.key);
                          }}
                        >
                          <FaCog className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="border-t border-gray-700 p-2">
        <div className="text-xs text-gray-400 text-center">
          Click the gear icon to edit shortcuts. Press keys to set new shortcuts.
        </div>
      </div>
    </div>
  );
};
