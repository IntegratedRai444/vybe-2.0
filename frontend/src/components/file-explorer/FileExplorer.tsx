import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FaFile, FaFileCode, FaFileImage, FaFilePdf, FaFileAlt,
  FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileArchive,
  FaPlus, FaUpload, FaFolderPlus, FaRedo, FaList, FaFolder
} from 'react-icons/fa';

// Importing types only
import type { FileItem } from './types';

// File icon mapping
const FILE_ICONS: Record<string, React.ReactNode> = {
  // Text files
  'txt': <FaFile className="text-blue-300" />,
  'md': <FaFileAlt className="text-blue-400" />,
  'json': <FaFileCode className="text-yellow-400" />,
  'js': <FaFileCode className="text-yellow-300" />,
  'jsx': <FaFileCode className="text-blue-400" />,
  'ts': <FaFileCode className="text-blue-500" />,
  'tsx': <FaFileCode className="text-blue-500" />,
  'html': <FaFileCode className="text-orange-500" />,
  'css': <FaFileCode className="text-blue-600" />,
  'scss': <FaFileCode className="text-pink-500" />,
  
  // Images
  'jpg': <FaFileImage className="text-purple-400" />,
  'jpeg': <FaFileImage className="text-purple-400" />,
  'png': <FaFileImage className="text-blue-400" />,
  'gif': <FaFileImage className="text-green-400" />,
  'svg': <FaFileImage className="text-yellow-400" />,
  
  // Documents
  'pdf': <FaFilePdf className="text-red-500" />,
  'doc': <FaFileWord className="text-blue-600" />,
  'docx': <FaFileWord className="text-blue-600" />,
  'xls': <FaFileExcel className="text-green-600" />,
  'xlsx': <FaFileExcel className="text-green-600" />,
  'ppt': <FaFilePowerpoint className="text-orange-500" />,
  'pptx': <FaFilePowerpoint className="text-orange-500" />,
  
  // Archives
  'zip': <FaFileArchive className="text-gray-400" />,
  'rar': <FaFileArchive className="text-gray-400" />,
  '7z': <FaFileArchive className="text-gray-400" />,
  'tar': <FaFileArchive className="text-gray-400" />,
  'gz': <FaFileArchive className="text-gray-400" />,
};

// Default file icon
const DefaultFileIcon = <FaFile className="text-gray-400" />;

export const FileExplorer: React.FC<{ projectRoot: string; onFileSelect?: (file: string) => void }> = ({
  projectRoot,
  onFileSelect,
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  
  interface FileTab extends FileItem {
    isDirty: boolean;
  }

  const [openTabs, setOpenTabs] = useState<FileTab[]>([]);
  const [currentTab, setCurrentTab] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileExplorerRef = useRef<HTMLDivElement>(null);

  // Load files from the server
  const loadFiles = useCallback(async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/files/advanced?root=${encodeURIComponent(projectRoot)}`);
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  }, [projectRoot]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadFiles();
  }, [loadFiles]);

  // Initial load
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Handle right-click context menu
  const handleContextMenu = useCallback((event: React.MouseEvent, file: FileItem | null = null) => {
    event.preventDefault();
    event.stopPropagation();
    
    // If right-click is not on a selected file, clear selection and select the clicked file
    if (file && !selectedFiles.has(file.path)) {
      setSelectedFiles(new Set([file.path]));
    }
    
    // Show browser's default context menu for now
    // In a real app, you would show a custom context menu
  }, [selectedFiles]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      // Clear selection on outside click
      if (selectedFiles.size > 0) {
        setSelectedFiles(new Set());
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [selectedFiles]);

  // Toggle file selection
  const toggleFileSelection = useCallback((file: FileItem, event?: React.MouseEvent) => {
    if (event?.ctrlKey || event?.metaKey) {
      // Multi-select with Ctrl/Cmd key
      setSelectedFiles(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(file.path)) {
          newSelection.delete(file.path);
        } else {
          newSelection.add(file.path);
        }
        return newSelection;
      });
    } else {
      // Single select
      setSelectedFiles(new Set([file.path]));
    }
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((file: FileItem) => {
    onFileSelect?.(file.path);
    
    // Add to open tabs if not already there
    setOpenTabs(prev => {
      if (!prev.some(tab => tab.path === file.path)) {
        return [...prev, { ...file, isDirty: false }];
      }
      return prev;
    });
    
    setCurrentTab(file.path);
  }, [onFileSelect]);

  // Handle file double click
  const handleFileDoubleClick = useCallback((file: FileItem) => {
    if (file.type === 'folder') {
      // Navigate into folder
      // You'll need to implement this based on your routing/navigation
      console.log('Navigate to folder:', file.path);
      // For now, just select the folder
      setSelectedFiles(new Set([file.path]));
    } else {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, file: FileItem) => {
    e.dataTransfer.setData('application/vybe-file', JSON.stringify(file));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop
  const handleDrop = useCallback(async (e: React.DragEvent, targetFile: FileItem | null) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const sourceData = e.dataTransfer.getData('application/vybe-file');
      if (!sourceData) return;
      
      const sourceFile = JSON.parse(sourceData) as FileItem;
      const targetPath = targetFile?.path || projectRoot;
      
      if (sourceFile.path === targetPath) return; // Don't drop on self
      
      // In a real app, you would make an API call to move the file
      console.log(`Move ${sourceFile.path} to ${targetPath}`);
      
      // Refresh the file list
      await loadFiles();
    } catch (error) {
      console.error('Error handling file drop:', error);
    }
  }, [projectRoot, loadFiles]);


  
  // Get file icon based on extension
  const getFileIcon = (fileName: string) => {
    if (!fileName) return DefaultFileIcon;
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (!extension) return DefaultFileIcon;
    
    return FILE_ICONS[extension] || DefaultFileIcon;
  };
  
  // Handle tab close
  const handleTabClose = useCallback((path: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setOpenTabs(prev => {
      const newTabs = prev.filter(tab => tab.path !== path);
      if (currentTab === path) {
        setCurrentTab(newTabs.length > 0 ? newTabs[newTabs.length - 1].path : '');
      }
      return newTabs;
    });
  }, [currentTab]);
  
  // Handle tab change
  const handleTabChange = useCallback((path: string) => {
    setCurrentTab(path);
    onFileSelect?.(path);
  }, [onFileSelect]);
  
  // Handle new file/folder creation
  const handleCreateNew = (type: 'file' | 'folder') => {
    const name = prompt(`Enter ${type} name:`);
    if (!name) return;
    
    const newItem: FileItem = {
      id: `new-${Date.now()}`,
      name,
      path: `${projectRoot}/${name}${type === 'file' ? '.txt' : ''}`,
      type
    };
    
    // In a real app, you would create the file/folder on the server
    console.log(`Creating new ${type}:`, newItem.path);
    // await fetch('/api/files', { method: 'POST', body: JSON.stringify(newItem) });
    loadFiles();
  };
  
  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach(async (file) => {
      try {
        // In a real app, you would upload the file to the server
        console.log('Uploading file:', file.name);
        // const formData = new FormData();
        // formData.append('file', file);
        // await fetch('/api/upload', { method: 'POST', body: formData });
        
        // Refresh the file list
        await loadFiles();
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    });
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [loadFiles]);

  useEffect(() => {
    // Set up file system watcher
    const setupFileWatcher = async () => {
      try {
        // Example: Set up WebSocket connection
        // const ws = new WebSocket('ws://localhost:8000/ws/files');
        // 
        // ws.onmessage = (event) => {
        //   const data = JSON.parse(event.data);
        //   if (data.type === 'file_change') {
        //     // Refresh the file list when changes are detected
        //     loadFiles();
        //   }
        // };
        // 
        // return () => ws.close();
      } catch (err) {
        console.error('Error setting up file watcher:', err);
      }
    };

    setupFileWatcher();
    
    // Poll for changes as a fallback
    const pollInterval = setInterval(() => {
      loadFiles();
    }, 30000); // Poll every 30 seconds
    
    return () => clearInterval(pollInterval);
  }, [loadFiles]);

  // Handle file deletion
  const handleDeleteFile = useCallback(async (file: FileItem) => {
    if (!window.confirm(`Are you sure you want to delete ${file.name}?`)) return;
    
    try {
      console.log('Deleting file:', file.path);
      // In a real app, you would make an API call here
      // await fetch('/api/files', { 
      //   method: 'DELETE',
      //   body: JSON.stringify({ path: file.path }) 
      // });
      
      // Refresh the file list
      await loadFiles();
      setSelectedFiles(new Set());
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  }, [loadFiles]);
  
  // Handle file download
  const handleDownloadFile = useCallback(async (file: FileItem) => {
    try {
      console.log('Downloading file:', file.path);
      // In a real app, you would trigger a file download
      // window.open(`/api/files/download?path=${encodeURIComponent(file.path)}`, '_blank');
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-200" ref={fileExplorerRef}>
      {/* Tabs for open files */}
      {openTabs.length > 0 && (
        <div className="border-b border-gray-700 bg-gray-800">
          <div className="flex items-center px-2 py-1">
            {openTabs.map(tab => (
              <div 
                key={tab.path}
                className={`px-3 py-1 mr-1 rounded-t flex items-center ${currentTab === tab.path ? 'bg-gray-900' : 'bg-gray-700 hover:bg-gray-600'}`}
                onClick={() => handleTabChange(tab.path)}
              >
                <span className="mr-2">{tab.name}</span>
                <button 
                  className="text-gray-400 hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTabClose(tab.path, e);
                  }}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Toolbar */}
      <div className="p-2 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {/* New file/folder buttons */}
            <div className="relative group">
              <button
                className="p-2 hover:bg-gray-700 rounded flex items-center text-sm"
                title="New..."
              >
                <FaPlus className="mr-1" size={12} />
                <span>New</span>
              </button>
              <div className="absolute left-0 mt-1 w-40 bg-gray-800 border border-gray-700 rounded shadow-lg z-10 hidden group-hover:block">
                <button
                  onClick={() => handleCreateNew('file')}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 flex items-center"
                >
                  <FaFile className="mr-2" /> New File
                </button>
                <button
                  onClick={() => handleCreateNew('folder')}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 flex items-center"
                >
                  <FaFolderPlus className="mr-2" /> New Folder
                </button>
              </div>
            </div>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-gray-700 rounded flex items-center text-sm"
              title="Upload"
            >
              <FaUpload className="mr-1" size={12} />
              <span>Upload</span>
            </button>
            
            <div className="h-6 w-px bg-gray-600 mx-1" />
            
            <button
              onClick={handleRefresh}
              className="p-2 hover:bg-gray-700 rounded"
              title="Refresh"
            >
              <FaRedo className="text-gray-300" />
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              className={`p-2 rounded hover:bg-gray-700`}
              title="List view"
            >
              <FaList className="text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* File List with drag and drop support */}
        <div 
          className="flex-1 overflow-y-auto p-2"
          onContextMenu={(e) => handleContextMenu(e, null)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, null)}
        >
          {files.map(file => (
            <div 
              key={file.path}
              className={`p-2 hover:bg-gray-800 rounded flex items-center ${selectedFiles.has(file.path) ? 'bg-gray-800' : ''}`}
              onContextMenu={(e) => handleContextMenu(e, file)}
              onDoubleClick={() => handleFileDoubleClick(file)}
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  toggleFileSelection(file, e);
                } else {
                  setSelectedFiles(new Set([file.path]));
                }
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, file)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, file)}
            >
              <span className="mr-2">
                {file.type === 'folder' ? (
                  <FaFolder className="text-yellow-400" />
                ) : (
                  getFileIcon(file.name)
                )}
              </span>
              <span className="truncate">{file.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status Bar */}
      <div className="p-2 border-t border-gray-700 text-xs text-gray-400">
        {selectedFiles.size > 0 ? (
          <span>{selectedFiles.size} item{selectedFiles.size !== 1 ? 's' : ''} selected</span>
        ) : (
          <span>{files.length} item{files.length !== 1 ? 's' : ''}</span>
        )}
      </div>
      
      {/* Hidden file input for uploads */}
      <input 
        type="file" 
        ref={fileInputRef}
        className="hidden" 
        multiple 
        onChange={handleFileUpload} 
      />
    </div>
  );
};

export default FileExplorer;
