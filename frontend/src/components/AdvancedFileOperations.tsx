// src/components/AdvancedFileOperations.tsx
import React, { useState, useEffect } from "react";
import { FaSearch, FaCopy, FaTrash, FaDownload, FaFolder, FaFile, FaSort, FaEye, FaEdit, FaCheck, FaTimes } from "react-icons/fa";

type FileItem = {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size: number;
  modified: string;
  selected: boolean;
};

type SearchOptions = {
  query: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
  fileTypes: string[];
  excludePatterns: string[];
  includePatterns: string[];
};

type BulkOperation = {
  type: 'copy' | 'move' | 'delete' | 'download' | 'rename';
  files: string[];
  destination?: string;
  newName?: string;
};

type Props = {
  projectRoot: string;
  onFileSelect?: (file: string) => void;
};

export const AdvancedFileOperations: React.FC<Props> = ({ projectRoot, onFileSelect }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    query: '',
    caseSensitive: false,
    wholeWord: false,
    regex: false,
    fileTypes: [],
    excludePatterns: [],
    includePatterns: []
  });
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'modified' | 'type'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showBulkOperations, setShowBulkOperations] = useState(false);
  const [bulkOperation, setBulkOperation] = useState<BulkOperation | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [projectRoot]);

  useEffect(() => {
    filterFiles();
  }, [files, searchOptions, sortBy, sortOrder]);

  const loadFiles = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/files/advanced?root=${encodeURIComponent(projectRoot)}`);
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  const filterFiles = () => {
    let filtered = [...files];

    // Apply search filter
    if (searchOptions.query) {
      const query = searchOptions.caseSensitive ? searchOptions.query : searchOptions.query.toLowerCase();
      filtered = filtered.filter(file => {
        const fileName = searchOptions.caseSensitive ? file.name : file.name.toLowerCase();
        if (searchOptions.wholeWord) {
          return fileName === query;
        } else {
          return fileName.includes(query);
        }
      });
    }

    // Apply file type filter
    if (searchOptions.fileTypes.length > 0) {
      filtered = filtered.filter(file => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        return ext && searchOptions.fileTypes.includes(ext);
      });
    }

    // Apply include patterns
    if (searchOptions.includePatterns.length > 0) {
      filtered = filtered.filter(file => {
        return searchOptions.includePatterns.some(pattern => {
          const regex = new RegExp(pattern);
          return regex.test(file.name);
        });
      });
    }

    // Apply exclude patterns
    if (searchOptions.excludePatterns.length > 0) {
      filtered = filtered.filter(file => {
        return !searchOptions.excludePatterns.some(pattern => {
          const regex = new RegExp(pattern);
          return regex.test(file.name);
        });
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'modified':
          comparison = new Date(a.modified).getTime() - new Date(b.modified).getTime();
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredFiles(filtered);
  };

  const performSearch = async () => {
    if (!searchOptions.query.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/search/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          root: projectRoot,
          ...searchOptions
        })
      });
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectFile = (file: FileItem) => {
    setFiles(prev => prev.map(f => 
      f.path === file.path ? { ...f, selected: !f.selected } : f
    ));
  };

  const selectAll = () => {
    setFiles(prev => prev.map(f => ({ ...f, selected: true })));
  };

  const deselectAll = () => {
    setFiles(prev => prev.map(f => ({ ...f, selected: false })));
  };

  const getSelectedFiles = () => {
    return files.filter(f => f.selected);
  };

  const performBulkOperation = async (operation: BulkOperation) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/files/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(operation)
      });
      
      if (response.ok) {
        loadFiles();
        setBulkOperation(null);
        setShowBulkOperations(false);
      }
    } catch (error) {
      console.error('Bulk operation failed:', error);
    }
  };

  const copyFiles = () => {
    const selected = getSelectedFiles();
    if (selected.length === 0) return;
    
    setBulkOperation({
      type: 'copy',
      files: selected.map(f => f.path)
    });
    setShowBulkOperations(true);
  };

  const moveFiles = () => {
    const selected = getSelectedFiles();
    if (selected.length === 0) return;
    
    setBulkOperation({
      type: 'move',
      files: selected.map(f => f.path)
    });
    setShowBulkOperations(true);
  };

  const deleteFiles = () => {
    const selected = getSelectedFiles();
    if (selected.length === 0) return;
    
    if (confirm(`Delete ${selected.length} file(s)?`)) {
      performBulkOperation({
        type: 'delete',
        files: selected.map(f => f.path)
      });
    }
  };

  const downloadFiles = () => {
    const selected = getSelectedFiles();
    if (selected.length === 0) return;
    
    performBulkOperation({
      type: 'download',
      files: selected.map(f => f.path)
    });
  };

  const renameFile = (file: FileItem) => {
    const newName = prompt('Enter new name:', file.name);
    if (newName && newName !== file.name) {
      performBulkOperation({
        type: 'rename',
        files: [file.path],
        newName
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-200">
      {/* Header */}
      <div className="p-2 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <FaFile className="text-blue-400" />
            <span className="font-medium">Advanced File Operations</span>
          </div>
          
          <div className="flex space-x-2">
            <button
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
              onClick={() => setShowSearchPanel(!showSearchPanel)}
            >
              <FaSearch className="w-3 h-3 mr-1" />
              Search
            </button>
            <button
              className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
              onClick={() => setShowBulkOperations(!showBulkOperations)}
            >
              <FaEdit className="w-3 h-3 mr-1" />
              Bulk Ops
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm"
              onClick={selectAll}
            >
              Select All
            </button>
            <button
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm"
              onClick={deselectAll}
            >
              Deselect All
            </button>
            <span className="text-sm text-gray-400">
              {getSelectedFiles().length} selected
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
            >
              <option value="name">Name</option>
              <option value="size">Size</option>
              <option value="modified">Modified</option>
              <option value="type">Type</option>
            </select>
            
            <button
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              <FaSort className="w-3 h-3" />
            </button>
            
            <button
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm"
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            >
              {viewMode === 'list' ? <FaEye className="w-3 h-3" /> : <FaFile className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Search Panel */}
      {showSearchPanel && (
        <div className="p-2 border-b border-gray-700 bg-gray-800">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Search Query</label>
              <input
                type="text"
                value={searchOptions.query}
                onChange={(e) => setSearchOptions(prev => ({ ...prev, query: e.target.value }))}
                className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-sm"
                placeholder="Enter search term..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">File Types</label>
              <input
                type="text"
                value={searchOptions.fileTypes.join(',')}
                onChange={(e) => setSearchOptions(prev => ({ 
                  ...prev, 
                  fileTypes: e.target.value.split(',').filter(t => t.trim()) 
                }))}
                className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-sm"
                placeholder="py,js,ts,html"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Include Patterns</label>
              <input
                type="text"
                value={searchOptions.includePatterns.join(',')}
                onChange={(e) => setSearchOptions(prev => ({ 
                  ...prev, 
                  includePatterns: e.target.value.split(',').filter(p => p.trim()) 
                }))}
                className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-sm"
                placeholder="*.py,*.js"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Exclude Patterns</label>
              <input
                type="text"
                value={searchOptions.excludePatterns.join(',')}
                onChange={(e) => setSearchOptions(prev => ({ 
                  ...prev, 
                  excludePatterns: e.target.value.split(',').filter(p => p.trim()) 
                }))}
                className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-sm"
                placeholder="node_modules,__pycache__"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4 mt-2">
            <label className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={searchOptions.caseSensitive}
                onChange={(e) => setSearchOptions(prev => ({ ...prev, caseSensitive: e.target.checked }))}
              />
              <span className="text-sm">Case Sensitive</span>
            </label>
            
            <label className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={searchOptions.wholeWord}
                onChange={(e) => setSearchOptions(prev => ({ ...prev, wholeWord: e.target.checked }))}
              />
              <span className="text-sm">Whole Word</span>
            </label>
            
            <label className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={searchOptions.regex}
                onChange={(e) => setSearchOptions(prev => ({ ...prev, regex: e.target.checked }))}
              />
              <span className="text-sm">Regex</span>
            </label>
            
            <button
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
              onClick={performSearch}
              disabled={isSearching}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      )}

      {/* Bulk Operations Panel */}
      {showBulkOperations && (
        <div className="p-2 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center space-x-2">
            <button
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
              onClick={copyFiles}
            >
              <FaCopy className="w-3 h-3 mr-1" />
              Copy
            </button>
            <button
              className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm"
              onClick={moveFiles}
            >
              <FaCopy className="w-3 h-3 mr-1" />
              Move
            </button>
            <button
              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
              onClick={deleteFiles}
            >
              <FaTrash className="w-3 h-3 mr-1" />
              Delete
            </button>
            <button
              className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
              onClick={downloadFiles}
            >
              <FaDownload className="w-3 h-3 mr-1" />
              Download
            </button>
          </div>
        </div>
      )}

      {/* Bulk Operation Dialog */}
      {bulkOperation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-4 rounded-lg min-w-96">
            <div className="text-sm font-medium mb-2">
              {bulkOperation.type === 'copy' && 'Copy Files'}
              {bulkOperation.type === 'move' && 'Move Files'}
              {bulkOperation.type === 'rename' && 'Rename File'}
            </div>
            
            {bulkOperation.type === 'copy' || bulkOperation.type === 'move' ? (
              <div>
                <label className="block text-sm font-medium mb-1">Destination</label>
                <input
                  type="text"
                  value={bulkOperation.destination || ''}
                  onChange={(e) => setBulkOperation(prev => prev ? { ...prev, destination: e.target.value } : null)}
                  className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-sm"
                  placeholder="Enter destination path..."
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1">New Name</label>
                <input
                  type="text"
                  value={bulkOperation.newName || ''}
                  onChange={(e) => setBulkOperation(prev => prev ? { ...prev, newName: e.target.value } : null)}
                  className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-sm"
                  placeholder="Enter new name..."
                />
              </div>
            )}
            
            <div className="flex space-x-2 mt-4">
              <button
                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                onClick={() => performBulkOperation(bulkOperation)}
              >
                <FaCheck className="w-3 h-3 mr-1" />
                Confirm
              </button>
              <button
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm"
                onClick={() => setBulkOperation(null)}
              >
                <FaTimes className="w-3 h-3 mr-1" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Files List */}
      <div className="flex-1 overflow-y-auto p-2">
        {viewMode === 'list' ? (
          <div className="space-y-1">
            {filteredFiles.map((file) => (
              <div
                key={file.path}
                className={`flex items-center p-2 rounded hover:bg-gray-800 cursor-pointer ${
                  file.selected ? 'bg-blue-900' : ''
                }`}
                onClick={() => selectFile(file)}
              >
                <input
                  type="checkbox"
                  checked={file.selected}
                  onChange={() => selectFile(file)}
                  className="mr-3"
                />
                
                <div className="w-6 mr-3">
                  {file.type === 'folder' ? <FaFolder className="text-yellow-400" /> : <FaFile className="text-blue-400" />}
                </div>
                
                <div className="flex-1">
                  <div className="text-sm font-medium">{file.name}</div>
                  <div className="text-xs text-gray-400">{file.path}</div>
                </div>
                
                <div className="text-xs text-gray-400 mr-4">
                  {formatFileSize(file.size)}
                </div>
                
                <div className="text-xs text-gray-400 mr-4">
                  {new Date(file.modified).toLocaleDateString()}
                </div>
                
                <div className="flex space-x-1">
                  <button
                    className="p-1 hover:bg-gray-700 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onFileSelect) onFileSelect(file.path);
                    }}
                    title="Open File"
                  >
                    <FaEye className="w-3 h-3" />
                  </button>
                  <button
                    className="p-1 hover:bg-gray-700 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      renameFile(file);
                    }}
                    title="Rename"
                  >
                    <FaEdit className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {filteredFiles.map((file) => (
              <div
                key={file.path}
                className={`p-3 rounded hover:bg-gray-800 cursor-pointer ${
                  file.selected ? 'bg-blue-900' : ''
                }`}
                onClick={() => selectFile(file)}
              >
                <div className="text-center">
                  <div className="w-8 h-8 mx-auto mb-2">
                    {file.type === 'folder' ? <FaFolder className="text-yellow-400" /> : <FaFile className="text-blue-400" />}
                  </div>
                  <div className="text-sm font-medium truncate">{file.name}</div>
                  <div className="text-xs text-gray-400">{formatFileSize(file.size)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="border-t border-gray-700 p-2">
          <div className="text-sm font-medium mb-2">Search Results ({searchResults.length})</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {searchResults.map((result, index) => (
              <div key={index} className="text-xs text-gray-400">
                {result.file}:{result.line} - {result.content}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
