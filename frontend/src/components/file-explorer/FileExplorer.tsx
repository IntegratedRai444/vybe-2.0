import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FaFile,
  FaFileCode,
  FaFileImage,
  FaFilePdf,
  FaFileAlt,
  FaFileWord,
  FaFileExcel,
  FaFilePowerpoint,
  FaFileArchive,
  FaFileVideo,
  FaFolder,
  FaTrash,
  FaEdit,
  FaSearch,
  FaChevronDown,
  FaChevronRight,
  FaExclamationTriangle,
  FaFolderPlus
} from "react-icons/fa";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";

// Types
export interface FileItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  modified?: string;
  children?: FileItem[];
  isOpen?: boolean;
  isRenaming?: boolean;
  isNew?: boolean;
}

type SortField = 'name' | 'modified' | 'size' | 'type';
type SortDirection = 'asc' | 'desc';

// File icon mapping with more comprehensive type support
const getFileIcon = (fileName: string, isFolder = false): React.ReactNode => {
  if (isFolder) {
    return <FaFolder className="text-yellow-400" />;
  }

  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  const iconMap: Record<string, React.ReactNode> = {
    // Code files
    'js': <FaFileCode className="text-yellow-300" />,
    'jsx': <FaFileCode className="text-blue-300" />,
    'ts': <FaFileCode className="text-blue-400" />,
    'tsx': <FaFileCode className="text-blue-500" />,
    'py': <FaFileCode className="text-blue-200" />,
    'java': <FaFileCode className="text-red-400" />,
    'c': <FaFileCode className="text-purple-400" />,
    'cpp': <FaFileCode className="text-purple-500" />,
    'h': <FaFileCode className="text-purple-300" />,
    'hpp': <FaFileCode className="text-purple-400" />,
    'cs': <FaFileCode className="text-green-400" />,
    'go': <FaFileCode className="text-blue-300" />,
    'rs': <FaFileCode className="text-orange-400" />,
    'php': <FaFileCode className="text-indigo-400" />,
    'rb': <FaFileCode className="text-red-400" />,
    'swift': <FaFileCode className="text-orange-500" />,
    'kt': <FaFileCode className="text-orange-400" />,
    'scala': <FaFileCode className="text-red-500" />,
    'sh': <FaFileCode className="text-green-300" />,
    'bash': <FaFileCode className="text-green-300" />,
    'json': <FaFileCode className="text-yellow-200" />,
    'yaml': <FaFileCode className="text-yellow-100" />,
    'yml': <FaFileCode className="text-yellow-100" />,
    'toml': <FaFileCode className="text-yellow-300" />,
    'ini': <FaFileCode className="text-yellow-200" />,
    'xml': <FaFileCode className="text-orange-400" />,
    'html': <FaFileCode className="text-orange-400" />,
    'css': <FaFileCode className="text-blue-400" />,
    'scss': <FaFileCode className="text-pink-400" />,
    'sass': <FaFileCode className="text-pink-400" />,
    'less': <FaFileCode className="text-blue-500" />,
    'vue': <FaFileCode className="text-green-500" />,
    'svelte': <FaFileCode className="text-orange-500" />,
    'md': <FaFileAlt className="text-blue-100" />,
    'pdf': <FaFilePdf className="text-red-500" />,
    'doc': <FaFileWord className="text-blue-500" />,
    'docx': <FaFileWord className="text-blue-500" />,
    'xls': <FaFileExcel className="text-green-600" />,
    'xlsx': <FaFileExcel className="text-green-600" />,
    'ppt': <FaFilePowerpoint className="text-orange-500" />,
    'pptx': <FaFilePowerpoint className="text-orange-500" />,
    'jpg': <FaFileImage className="text-purple-400" />,
    'jpeg': <FaFileImage className="text-purple-400" />,
    'png': <FaFileImage className="text-blue-400" />,
    'gif': <FaFileImage className="text-pink-400" />,
    'svg': <FaFileImage className="text-yellow-400" />,
    'zip': <FaFileArchive className="text-yellow-500" />,
    'rar': <FaFileArchive className="text-red-500" />,
    '7z': <FaFileArchive className="text-green-500" />,
  };

  return iconMap[extension] || <FaFile className="text-gray-400" />;
};

interface FileExplorerProps {
  projectRoot: string;
  onFileSelect?: (filePath: string) => void;
  onFileOpen?: (filePath: string) => void;
  onFileCreate?: (filePath: string) => void;
  onFileDelete?: (filePath: string) => void;
  onFileRename?: (oldPath: string, newPath: string) => void;
  onFileUpload?: (file: File, path: string) => void;
  onFolderCreate?: (path: string) => void;
  showToolbar?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const FileExplorer: React.FC<FileExplorerProps> = ({
  projectRoot = '',
  onFileSelect = () => {},
  onFileOpen = () => {},
  onFileCreate = async () => {},
  onFileDelete = async () => {},
  onFileRename = async () => {},
  onFileUpload = async () => {},
  onFolderCreate = async () => {},
  showToolbar = true,
  className = '',
  style = {},
}) => {
  // State for files and filtered files
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [currentTab, setCurrentTab] = useState<string>('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    file: FileItem | null;
  } | null>(null);

  // State for search and sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // State for UI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [openTabs, setOpenTabs] = useState<Array<FileItem & { isDirty: boolean }>>([]);
  const [currentTab, setCurrentTab] = useState<string>('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    file: FileItem | null;
  } | null>(null);
  const [clipboard, setClipboard] = useState<{
    type: 'copy' | 'cut';
    items: FileItem[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Process file list from API response
  const processFileList = (fileList: any[]): FileItem[] => {
    return fileList.map(file => ({
      id: file.path || file.name,
      name: file.name,
      path: file.path || `${projectRoot}/${file.name}`,
      type: file.type === 'directory' ? 'folder' : 'file',
      size: file.size,
      modified: file.modified,
      children: file.children ? processFileList(file.children) : [],
      isOpen: false,
      isRenaming: false,
      isNew: false,
    }));
  }, []);

  // Apply search filter and sorting to files
  const applyFiltersAndSort = useCallback((files: FileItem[], query: string, field: SortField, direction: SortDirection): FileItem[] => {
    let result = [...files];

    // Apply search filter
    if (query) {
      const queryLower = query.toLowerCase();
      result = result.filter(file =>
        file.name.toLowerCase().includes(queryLower) ||
        file.path.toLowerCase().includes(queryLower)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      if (field === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (field === 'modified') {
        comparison = new Date(a.modified).getTime() - new Date(b.modified).getTime();
      } else if (field === 'size') {
        comparison = (a.size || 0) - (b.size || 0);
      } else if (field === 'type') {
        comparison = a.type.localeCompare(b.type);
      }

      return direction === 'asc' ? comparison : -comparison;
    });

    return result;
  }, []);

  // Update file in the tree structure
  const updateFileInTree = useCallback((files: FileItem[], fileId: string, updates: Partial<FileItem>): FileItem[] => {
    return files.map(file => {
      if (file.id === fileId) {
        return { ...file, ...updates };
      }
      if (file.children) {
        return {
          ...file,
          children: updateFileInTree(file.children, fileId, updates)
        };
      }
      return file;
    });
  }, []);

  // Toggle folder open/closed
  const toggleFolder = useCallback((fileId: string) => {
    setFiles(prevFiles =>
      updateFileInTree(prevFiles, fileId, { isOpen: !prevFiles.find(f => f.id === fileId)?.isOpen })
    );
  }, []);

  // Handle file/folder selection
  const handleSelect = useCallback((fileId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    const newSelectedFiles = new Set(selectedFiles);

    if (event.ctrlKey || event.metaKey) {
      // Toggle selection with Ctrl/Cmd key
      if (newSelectedFiles.has(fileId)) {
        newSelectedFiles.delete(fileId);
      } else {
        newSelectedFiles.add(fileId);
      }
    } else if (event.shiftKey && selectedFiles.size > 0) {
      // Range selection with Shift key
      const fileIds = filteredFiles.map(f => f.id);
      const lastSelected = Array.from(selectedFiles).pop();
      const lastIndex = lastSelected ? fileIds.indexOf(lastSelected) : -1;
      const currentIndex = fileIds.indexOf(fileId);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);

        for (let i = start; i <= end; i++) {
          newSelectedFiles.add(fileIds[i]);
        }
      } else {
        newSelectedFiles.add(fileId);
      }
    } else {
      // Single selection
      newSelectedFiles.clear();
      newSelectedFiles.add(fileId);
    }

    setSelectedFiles(newSelectedFiles);

    // Call onFileSelect with all selected files
    if (onFileSelect) {
      const selectedFileItems = filteredFiles.filter(f => newSelectedFiles.has(f.id));
      onFileSelect(selectedFileItems[0]?.path || '');
    }
  }, [selectedFiles, filteredFiles, onFileSelect]);

  // Handle file/folder double click
  const handleDoubleClick = useCallback((file: FileItem) => {
    if (file.type === 'folder') {
      toggleFolder(file.id);
    } else if (onFileOpen) {
      // Add to open tabs if not already open
      setOpenTabs(prev => {
        if (!prev.some(tab => tab.path === file.path)) {
          return [...prev, { ...file, isDirty: false }];
        }
        return prev;
      });

      setCurrentTab(file.path);
      onFileOpen(file.path);
    }
  }, [onFileOpen, toggleFolder]);

  // Handle context menu
  const handleContextMenu = useCallback((event: React.MouseEvent, file: FileItem | null = null) => {
    event.preventDefault();

    // If right-clicking on a file that's not selected, select it
    if (file && !selectedFiles.has(file.id)) {
      const newSelectedFiles = new Set([file.id]);
      setSelectedFiles(newSelectedFiles);

      if (onFileSelect) {
        onFileSelect(file.path);
      }
    }

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      file
    });
  }, [onFileSelect, selectedFiles]);

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Load files on mount and when projectRoot changes
  const loadFiles = useCallback(async () => {
    if (!projectRoot) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/files?path=${encodeURIComponent(projectRoot)}`);

      if (!response.ok) {
        throw new Error(`Failed to load files: ${response.statusText}`);
      }

      const data = await response.json();
      const processedFiles = processFileList(data);

      setFiles(processedFiles);
      setFilteredFiles(applyFiltersAndSort(processedFiles, searchQuery, sortField, sortDirection));
    } catch (err) {
      console.error('Error loading files:', err);
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setIsLoading(false);
    }
  }, [projectRoot, searchQuery, sortField, sortDirection]);

  // Set up file loading effect
  useEffect(() => {
    loadFiles();

    // Set up polling to refresh file list periodically
    const intervalId = setInterval(loadFiles, 30000);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [loadFiles]);

  // Apply filters and sort when they change
  useEffect(() => {
    setFilteredFiles(applyFiltersAndSort(files, searchQuery, sortField, sortDirection));
  }, [files, searchQuery, sortField, sortDirection]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeContextMenu();
        setSelectedFiles(new Set());
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeContextMenu]);

  // Render file/folder item
  const renderFileItem = (file: FileItem, depth = 0) => {
    const isSelected = selectedFiles.has(file.id);
    const isFolder = file.type === 'folder';
    const hasChildren = file.children && file.children.length > 0;

    return (
      <div
        key={file.id}
        className={`file-item ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={(e) => handleSelect(file.id, e)}
        onDoubleClick={() => handleDoubleClick(file)}
        onContextMenu={(e) => handleContextMenu(e, file)}
      >
        <div className="file-item-content">
          <span
            className="folder-toggle"
            onClick={(e) => {
              e.stopPropagation();
              if (isFolder) toggleFolder(file.id);
            }}
          >
            {isFolder ? (
              file.isOpen ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />
            ) : (
              <span style={{ width: '12px', display: 'inline-block' }} />
            )}
          </span>

          <span className="file-icon">
            {getFileIcon(file.name, isFolder)}
          </span>

          {file.isRenaming ? (
            <input
              type="text"
              defaultValue={file.name}
              autoFocus
              onBlur={(e) => handleRename(file.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename(file.id, e.currentTarget.value);
                } else if (e.key === 'Escape') {
                  setFiles(prevFiles =>
                    updateFileInTree(prevFiles, file.id, { isRenaming: false })
                  );
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="file-rename-input"
            />
          ) : (
            <span className="file-name">{file.name}</span>
          )}
        </div>

        {isFolder && file.isOpen && file.children && (
          <div className="file-children">
            {file.children.map(child => renderFileItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Render context menu
  const renderContextMenu = () => {
    if (!contextMenu) return null;

    const { x, y, file } = contextMenu;
    const selectedCount = selectedFiles.size;

    const handleRenameClick = () => {
      if (selectedCount === 1) {
        const fileId = Array.from(selectedFiles)[0];
        setFiles(prevFiles =>
          updateFileInTree(prevFiles, fileId, { isRenaming: true })
        );
      }
      closeContextMenu();
    };

    const handleDeleteClick = async () => {
      await handleDelete();
      closeContextMenu();
    };

    const handleNewFileClick = () => {
      const fileName = prompt('Enter file name:');
      if (!fileName) return;

      // In a real app, you would create the file via API
      const newFile: FileItem = {
        id: `${projectRoot}/${fileName}`,
        name: fileName,
        path: `${projectRoot}/${fileName}`,
        type: 'file',
        isNew: true,
      };

      setFiles(prevFiles => [...prevFiles, newFile]);
      setSelectedFiles(new Set([newFile.id]));
      closeContextMenu();
    };

    const handleNewFolderClick = async () => {
      await handleNewFolder();
      closeContextMenu();
    };

    return (
      <div
        className="context-menu"
        style={{ left: `${x}px`, top: `${y}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        {selectedCount === 0 && (
          <>
            <button onClick={handleNewFileClick}>
              <FaFile /> New File
            </button>
            <button onClick={handleNewFolderClick}>
              <FaFolder /> New Folder
            </button>
            <div className="divider" />
          </>
        )}

        {selectedCount > 0 && (
          <>
            <button onClick={handleRenameClick} disabled={selectedCount !== 1}>
              <FaEdit /> Rename
            </button>
            <button onClick={handleDeleteClick}>
              <FaTrash /> Delete {selectedCount > 1 ? `(${selectedCount})` : ''}
            </button>
          </>
        )}
      </div>
    );
  };

  // Main render
  return (
    <div
      className={`file-explorer ${className}`}
      style={style}
      onClick={closeContextMenu}
    >
      {/* Toolbar */}
      {showToolbar && (
        <div className="toolbar">
          <button
            className="toolbar-button"
            onClick={handleNewFolder}
            title="New Folder"
          >
            <FaFolderPlus />
          </button>

          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              ref={searchInputRef}
            />
          </div>

          <div className="sort-controls">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
            >
              <option value="name">Name</option>
              <option value="modified">Modified</option>
              <option value="size">Size</option>
              <option value="type">Type</option>
            </select>

            <button
              className="sort-direction"
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              title={sortDirection === 'asc' ? 'Sort ascending' : 'Sort descending'}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      )}

      {/* File list */}
      <div className="file-list">
        {isLoading ? (
          <div className="loading">Loading...</div>
        ) : error ? (
          <div className="error">
            <FaExclamationTriangle /> {error}
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="empty-state">
            No files found
          </div>
        ) : (
          filteredFiles.map(file => renderFileItem(file))
        )}
      </div>

      {/* Hidden file input for uploads */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* Context menu */}
      {renderContextMenu()}
    </div>
  );
};

export default FileExplorer;
    field: SortField,
    direction: SortDirection
  ) => {
    // Filter files based on search query
    const filtered = query
      ? files.filter((file) =>
          file.name.toLowerCase().includes(query.toLowerCase()) ||
          (file.children && file.children.some((child) => child.name.toLowerCase().includes(query.toLowerCase())))
        )
      : [...files];

    // Sort files
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (field) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "modified":
          comparison = new Date(a.modified || 0).getTime() - new Date(b.modified || 0).getTime();
          break;
        case "size":
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case "type":
          comparison = a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
          break;
      }

      return direction === "asc" ? comparison : -comparison;
    });

    setFilteredFiles(sorted);
  };

  // Update file in the file tree
  const updateFileInTree = React.useCallback(
    (files: FileItem[], fileId: string, updater: (file: FileItem) => FileItem): FileItem[] => {
      return files.map((file) => {
        if (file.id === fileId) {
          return updater(file);
        }
        if (file.children) {
          return {
            ...file,
            children: updateFileInTree(file.children, fileId, updater),
          };
        }
        return file;
      });
    },
    []
  );

  // Handle file selection
  const handleSelect = React.useCallback((e: React.MouseEvent, file: FileItem) => {
    e.stopPropagation();
    const newSelected = new Set(selectedFiles);

    if (e.ctrlKey || e.metaKey) {
      // Multi-select with Ctrl/Cmd key
      if (newSelected.has(file.id)) {
        newSelected.delete(file.id);
      } else {
        newSelected.add(file.id);
      }
    } else if (e.shiftKey && selectedFiles.size > 0) {
      // Range select with Shift key
      const fileIds = filteredFiles.map((f) => f.id);
      const lastSelected = Array.from(selectedFiles).pop();
      const lastIndex = fileIds.indexOf(lastSelected || "");
      const currentIndex = fileIds.indexOf(file.id);

      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);

      for (let i = start; i <= end; i++) {
        newSelected.add(fileIds[i]);
      }
    } else {
      // Single select
      newSelected.clear();
      newSelected.add(file.id);
    }

    setSelectedFiles(newSelected);
    onFileSelect?.(file.path);
  }, [filteredFiles, onFileSelect, selectedFiles]);

  // Handle double click on file/folder
  const handleDoubleClick = React.useCallback((file: FileItem) => {
    if (file.type === "folder") {
      toggleFolder(file);
    } else {
      onFileOpen?.(file.path);

      // Add to open tabs if not already open
      setOpenTabs((prev) => {
        if (!prev.some((tab) => tab.path === file.path)) {
          return [...prev, { ...file, isDirty: false }];
        }
        return prev;
      });

      setCurrentTab(file.path);
    }
  }, [onFileOpen, toggleFolder]);

  // Handle context menu
  const handleContextMenu = React.useCallback((e: React.MouseEvent, file: FileItem | null = null) => {
    e.preventDefault();
    e.stopPropagation();

    // If right-click is not on a selected file, clear selection and select the clicked file
    if (file && !selectedFiles.has(file.id)) {
      setSelectedFiles(new Set([file.id]));
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      file,
    });
  }, [selectedFiles]);

  // Close context menu
  const closeContextMenu = React.useCallback(() => {
    setContextMenu(null);
  }, []);

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Close context menu on Escape
      if (event.key === "Escape") {
        closeContextMenu();
      }

      // Delete selected files
      if (event.key === "Delete" && selectedFiles.size > 0) {
        handleDelete();
      }

      // Copy (Ctrl+C)
      if ((event.ctrlKey || event.metaKey) && event.key === "c") {
        handleCopy();
      }

      // Cut (Ctrl+X)
      if ((event.ctrlKey || event.metaKey) && event.key === "x") {
        handleCut();
      }

      // Paste (Ctrl+V)
      if ((event.ctrlKey || event.metaKey) && event.key === "v") {
        handlePaste();
      }

      // New file (Ctrl+N)
      if ((event.ctrlKey || event.metaKey) && event.key === "n" && !event.shiftKey) {
        event.preventDefault();
        handleNewFile();
      }

      // New folder (Ctrl+Shift+N)
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === "N") {
        event.preventDefault();
        handleNewFolder();
      }

      // Rename (F2)
      if (event.key === "F2" && selectedFiles.size === 1) {
        event.preventDefault();
        const fileId = Array.from(selectedFiles).pop();
        const file = files.find((f) => f.id === fileId);
        if (file) {
          startRenaming(file);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedFiles, files, closeContextMenu]);

  // File operations
  const handleNewFile = React.useCallback(() => {
    const newFile: FileItem = {
      id: `new-file-${Date.now()}`,
      name: "new_file.txt",
      path: `${projectRoot}/new_file.txt`,
      type: "file",
      isNew: true,
      isRenaming: true,
    };

    setFiles((prev) => [...prev, newFile]);
    setSelectedFiles(new Set([newFile.id]));
    onFileCreate?.(newFile.path);
  }, [projectRoot, onFileCreate]);

  const handleNewFolder = React.useCallback(() => {
    const newFolder: FileItem = {
      id: `new-folder-${Date.now()}`,
      name: "New Folder",
      path: `${projectRoot}/New Folder`,
      type: "folder",
      children: [],
      isNew: true,
      isRenaming: true,
      isOpen: true,
    };

    setFiles((prev) => [...prev, newFolder]);
    setSelectedFiles(new Set([newFolder.id]));
    onFolderCreate?.(newFolder.path);
  }, [projectRoot, onFolderCreate]);

  const startRenaming = React.useCallback((file: FileItem) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, isRenaming: true } : f))
    );
  }, []);

  const handleRename = React.useCallback((fileId: string, newName: string) => {
    setFiles((prev) => {
      return prev.map((file) => {
        if (file.id === fileId) {
          const oldPath = file.path;
          const newPath = `${file.path.substring(0, file.path.lastIndexOf("/") + 1)}${newName}`;

          // Call the rename API
          onFileRename?.(oldPath, newPath);

          return {
            ...file,
            name: newName,
            path: newPath,
            isRenaming: false,
            isNew: false,
          };
        }
        return file;
      });
    });
  }, [onFileRename]);

  const handleDelete = React.useCallback(() => {
    if (selectedFiles.size === 0) return;

    if (window.confirm(`Delete ${selectedFiles.size} selected item(s)?`)) {
      selectedFiles.forEach((fileId) => {
        const file = files.find((f) => f.id === fileId);
        if (file) {
          onFileDelete?.(file.path);
        }
      });

      // Remove from state
      setFiles((prev) => prev.filter((file) => !selectedFiles.has(file.id)));
      setSelectedFiles(new Set());
    }
  }, [selectedFiles, files, onFileDelete]);

  const handleCopy = React.useCallback(() => {
    const selectedItems = files.filter((file) => selectedFiles.has(file.id));
    if (selectedItems.length > 0) {
      setClipboard({
        type: "copy",
        items: selectedItems,
      });
      toast.info(`${selectedItems.length} item(s) copied to clipboard`);
    }
  }, [selectedFiles, files]);

  const handleCut = React.useCallback(() => {
    const selectedItems = files.filter((file) => selectedFiles.has(file.id));
    if (selectedItems.length > 0) {
      setClipboard({
        type: "cut",
        items: selectedItems,
      });
      toast.info(`${selectedItems.length} item(s) cut to clipboard`);
    }
  }, [selectedFiles, files]);

  const handlePaste = React.useCallback(() => {
    if (!clipboard || clipboard.items.length === 0) return;

    const targetDir = projectRoot; // Paste into current directory

    clipboard.items.forEach((item) => {
      const newPath = `${targetDir}/${item.name}`;

      if (clipboard.type === "cut") {
        // Move operation
        onFileRename?.(item.path, newPath);
      } else {
        // Copy operation - this would need server-side implementation
        // For now, we'll just show a toast
        toast.info(`Copied ${item.name} to ${targetDir}`);
      }
    });

    // If it was a cut operation, clear the clipboard
    if (clipboard.type === "cut") {
      setClipboard(null);
    }
  }, [clipboard, projectRoot, onFileRename]);

  // Handle file upload
  const handleFileUpload = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      Array.from(files).forEach((file) => {
        onFileUpload?.(file, projectRoot);
      });

      // Reset the input value to allow uploading the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [projectRoot, onFileUpload]
  );

  // Handle search
  const handleSearch = React.useCallback((query: string) => {
    setSearchQuery(query);
    applyFiltersAndSort(files, query, sortField, sortDirection);
  }, [files, sortField, sortDirection]);

  // Handle sort
  const handleSort = React.useCallback((field: SortField) => {
    const direction = field === sortField && sortDirection === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortDirection(direction);
    applyFiltersAndSort(files, searchQuery, field, direction);
  }, [files, searchQuery, sortField, sortDirection]);

  // Toggle folder open/closed
  const toggleFolder = React.useCallback((file: FileItem) => {
    setFiles((prevFiles) =>
      updateFileInTree(prevFiles, file.id, (f) => ({ ...f, isOpen: !f.isOpen }))
    );
  }, [updateFileInTree]);

  return (
    <div
      className="h-full flex flex-col bg-gray-900 text-gray-200"
      ref={fileExplorerRef}
    >
      {/* Tabs for open files */}
      {openTabs.length > 0 && (
        <div className="border-b border-gray-700 bg-gray-800">
          <div className="flex items-center px-2 py-1">
            {openTabs.map((tab) => (
              <div
                key={tab.path}
                className={`px-3 py-1 mr-1 rounded-t flex items-center ${
                  currentTab === tab.path
                    ? "bg-gray-900"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
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
                  onClick={() => handleCreateNew("file")}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 flex items-center"
                >
                  <FaFile className="mr-2" /> New File
                </button>
                <button
                  onClick={() => handleCreateNew("folder")}
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
          {files.map((file) => (
            <div
              key={file.path}
              className={`p-2 hover:bg-gray-800 rounded flex items-center ${
                selectedFiles.has(file.path) ? "bg-gray-800" : ""
              }`}
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
                {file.type === "folder" ? (
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
          <span>
            {selectedFiles.size} item{selectedFiles.size !== 1 ? "s" : ""}{" "}
            selected
          </span>
        ) : (
          <span>
            {files.length} item{files.length !== 1 ? "s" : ""}
          </span>
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

  // Set up file system watcher
  const setupFileWatcher = useCallback(async () => {
    try {
      // In a real app, you would set up a file system watcher here
      // For now, we'll just log a message
      console.log('Setting up file system watcher...');
    } catch (error) {
      console.error('Failed to set up file system watcher:', error);
    }
  }, []);

  // Load files on mount and when projectRoot changes
  useEffect(() => {
    const loadFiles = async () => {
      if (!projectRoot) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/files/advanced?root=${encodeURIComponent(projectRoot)}`,
          {
            headers: {
              'Content-Type': 'application/json',
              // Add authentication token if needed
              // 'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            credentials: 'include'
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const processedFiles = processFileList(data.files || []);
        setFiles(processedFiles);
        applyFiltersAndSort(processedFiles, searchQuery, sortField, sortDirection);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load files';
        setError(errorMessage);
        toast.error(`Error loading files: ${errorMessage}`);
        console.error("Failed to load files:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();

    // Set up file system watcher
    setupFileWatcher();

    // Poll for changes as a fallback
    const pollInterval = setInterval(() => {
      loadFiles();
    }, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [projectRoot, searchQuery, sortField, sortDirection, setupFileWatcher]);

  // Process file list from API response
  const processFileList = useCallback((fileList: any[]): FileItem[] => {
    return fileList.map((file) => ({
      id: file.id || uuidv4(),
      name: file.name,
      path: file.path,
      type: file.type || (file.children ? "folder" : "file"),
      size: file.size,
      modified: file.modified,
      isOpen: false,
      isRenaming: false,
      isNew: false,
      children: file.children ? processFileList(file.children) : undefined,
    }));
  }, []);

  // Apply search filter and sorting to files
  const applyFiltersAndSort = useCallback((
    files: FileItem[],
    query: string,
    field: SortField,
    direction: SortDirection
  ) => {
    // Filter files based on search query
    const filtered = query
      ? files.filter((file) =>
          file.name.toLowerCase().includes(query.toLowerCase()) ||
          (file.children && file.children.some((child) =>
            child.name.toLowerCase().includes(query.toLowerCase())
          ))
        )
      : [...files];

    // Sort files
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'modified':
          comparison = new Date(a.modified || 0).getTime() - new Date(b.modified || 0).getTime();
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
          break;
      }

      return direction === 'asc' ? comparison : -comparison;
    });

    setFilteredFiles(sorted);
  }, []);

  // Update file in the file tree
  const updateFileInTree = useCallback((files: FileItem[], fileId: string, updater: (file: FileItem) => FileItem): FileItem[] => {
    return files.map((file) => {
      if (file.id === fileId) {
        return updater(file);
      }
      if (file.children) {
        return {
          ...file,
          children: updateFileInTree(file.children, fileId, updater),
        };
      }
      return file;
    });
  }, []);

  // Toggle folder open/closed
  const toggleFolder = useCallback((file: FileItem) => {
    setFiles((prevFiles) =>
      updateFileInTree(prevFiles, file.id, (f) => ({ ...f, isOpen: !f.isOpen }))
    );
  }, [updateFileInTree]);

  // Handle file selection
  const handleSelect = useCallback((e: React.MouseEvent, file: FileItem) => {
    e.stopPropagation();
    const newSelected = new Set(selectedFiles);

    if (e.ctrlKey || e.metaKey) {
      // Multi-select with Ctrl/Cmd key
      if (newSelected.has(file.id)) {
        newSelected.delete(file.id);
      } else {
        newSelected.add(file.id);
      }
    } else if (e.shiftKey && selectedFiles.size > 0) {
      // Range select with Shift key
      const fileIds = filteredFiles.map((f) => f.id);
      const lastSelected = Array.from(selectedFiles).pop();
      const lastIndex = fileIds.indexOf(lastSelected || "");
      const currentIndex = fileIds.indexOf(file.id);

      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);

      for (let i = start; i <= end; i++) {
        newSelected.add(fileIds[i]);
      }
    } else {
      // Single select
      newSelected.clear();
      newSelected.add(file.id);
    }

    setSelectedFiles(newSelected);
    onFileSelect?.(file.path);
  }, [filteredFiles, onFileSelect, selectedFiles]);

  // Handle double click on file/folder
  const handleDoubleClick = useCallback((file: FileItem) => {
    if (file.type === "folder") {
      toggleFolder(file);
    } else {
      onFileOpen?.(file.path);

      // Add to open tabs if not already open
      setOpenTabs((prev) => {
        if (!prev.some((tab) => tab.path === file.path)) {
          return [...prev, { ...file, isDirty: false }];
        }
        return prev;
      });

      setCurrentTab(file.path);
    }
  }, [onFileOpen, toggleFolder]);

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, file: FileItem | null = null) => {
    e.preventDefault();
    e.stopPropagation();

    // If right-click is not on a selected file, clear selection and select the clicked file
    if (file && !selectedFiles.has(file.id)) {
      setSelectedFiles(new Set([file.id]));
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      file,
    });
  }, [selectedFiles]);

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Close context menu on Escape
      if (event.key === "Escape") {
        closeContextMenu();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeContextMenu]);

  // Render file or folder item
  const renderFileItem = useCallback((file: FileItem, depth = 0) => {
    const isSelected = selectedFiles.has(file.id);
    const hasChildren = file.children && file.children.length > 0;
    const isFolder = file.type === 'folder';

    return (
      <div
        key={file.id}
        className={`flex items-center px-2 py-1 rounded ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={(e) => handleSelect(e, file)}
        onDoubleClick={() => handleDoubleClick(file)}
        onContextMenu={(e) => handleContextMenu(e, file)}
      >
        {isFolder ? (
          <button
            className="mr-1 text-gray-400 hover:text-white focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              toggleFolder(file);
            }}
          >
            {file.isOpen ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
          </button>
        ) : (
          <div className="w-4 mr-1"></div>
        )}

        <div className="flex items-center flex-1 min-w-0">
          <span className="mr-2">
            {getFileIcon(file.name, isFolder)}
          </span>
          <span className="truncate">{file.name}</span>
        </div>

        {file.isRenaming ? (
          <input
            type="text"
            className="flex-1 px-1 text-black rounded"
            defaultValue={file.name}
            autoFocus
            onBlur={(e) => handleRename(file.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRename(file.id, e.currentTarget.value);
              } else if (e.key === 'Escape') {
                setFiles(prev =>
                  prev.map(f => f.id === file.id ? { ...f, isRenaming: false } : f)
                );
              }
            }}
          />
        ) : null}
      </div>
    );
  }, [handleSelect, handleDoubleClick, handleContextMenu, selectedFiles, toggleFolder]);

  // Render the file explorer
  return (
    <div
      className={`flex flex-col h-full bg-gray-800 text-gray-200 ${className}`}
      style={style}
      onContextMenu={handleContextMenu}
      onClick={closeContextMenu}
    >
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center p-2 bg-gray-700 border-b border-gray-600">
          <button
            className="p-1 mr-2 text-gray-300 hover:text-white"
            title="New File"
            onClick={handleNewFile}
          >
            <FaFile />
          </button>
          <button
            className="p-1 mr-2 text-gray-300 hover:text-white"
            title="New Folder"
            onClick={handleNewFolder}
          >
            <FaFolderPlus />
          </button>
          <div className="relative flex-1 max-w-xs ml-auto">
            <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="w-full py-1 pl-8 pr-2 text-sm text-white bg-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-red-400">
            <FaExclamationTriangle className="inline mr-2" />
            {error}
          </div>
        ) : (
          <div>
            {filteredFiles.map((file) => (
              <div key={file.id}>
                {renderFileItem(file)}
                {file.isOpen && file.children && (
                  <div>
                    {file.children.map((child) => renderFileItem(child, 1))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between p-1 text-xs text-gray-400 bg-gray-700 border-t border-gray-600">
        <div>
          {selectedFiles.size > 0
            ? `${selectedFiles.size} item${selectedFiles.size !== 1 ? 's' : ''} selected`
            : `${filteredFiles.length} item${filteredFiles.length !== 1 ? 's' : ''}`}
        </div>
        <div>
          {sortField} {sortDirection === 'asc' ? '↑' : '↓'}
        </div>
      </div>

      {/* Hidden file input for uploads */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={handleFileUpload}
      />

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 py-1 bg-gray-700 rounded shadow-lg"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            minWidth: '160px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.file?.type === 'file' && (
            <>
              <button
                className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-600"
                onClick={() => {
                  onFileOpen?.(contextMenu.file!.path);
                  closeContextMenu();
                }}
              >
                <FaFileAlt className="mr-2" /> Open
              </button>
              <button
                className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-600"
                onClick={() => {
                  startRenaming(contextMenu.file!);
                  closeContextMenu();
                }}
              >
                <FaEdit className="mr-2" /> Rename
              </button>
            </>
          )}
          <button
            className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-600"
            onClick={() => {
              handleDelete();
              closeContextMenu();
            }}
          >
            <FaTrash className="mr-2" /> Delete
          </button>
        </div>
      )}
    </div>
  );
};

  // Set up file system watcher
  const setupFileWatcher = useCallback(async () => {
    try {
      // In a real app, you would set up a file system watcher here
      console.log('Setting up file system watcher...');
    } catch (error) {
      console.error('Failed to set up file system watcher:', error);
    }
  }, []);

  // Load files on mount and when projectRoot changes
  useEffect(() => {
    const loadFiles = async () => {
      if (!projectRoot) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/files/advanced?root=${encodeURIComponent(projectRoot)}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include'
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const processedFiles = processFileList(data.files || []);
        setFiles(processedFiles);
        applyFiltersAndSort(processedFiles, searchQuery, sortField, sortDirection);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load files';
        setError(errorMessage);
        toast.error(`Error loading files: ${errorMessage}`);
        console.error("Failed to load files:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();
    setupFileWatcher();

    // Poll for changes as a fallback
    const pollInterval = setInterval(() => {
      loadFiles();
    }, 30000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [projectRoot, searchQuery, sortField, sortDirection, setupFileWatcher]);

  // Process file list from API response
  const processFileList = useCallback((fileList: any[]): FileItem[] => {
    return fileList.map((file) => ({
      id: file.id || uuidv4(),
      name: file.name,
      path: file.path,
      type: file.type || (file.children ? "folder" : "file"),
      size: file.size,
      modified: file.modified,
      isOpen: false,
      isRenaming: false,
      isNew: false,
      children: file.children ? processFileList(file.children) : undefined,
    }));
  }, []);

  // Apply search filter and sorting to files
  const applyFiltersAndSort = useCallback((
    files: FileItem[],
    query: string,
    field: SortField,
    direction: SortDirection
  ) => {
    // Filter files based on search query
    const filtered = query
      ? files.filter((file) =>
          file.name.toLowerCase().includes(query.toLowerCase()) ||
          (file.children && file.children.some((child) =>
            child.name.toLowerCase().includes(query.toLowerCase())
          ))
        )
      : [...files];

    // Sort files
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'modified':
          comparison = new Date(a.modified || 0).getTime() - new Date(b.modified || 0).getTime();
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
          break;
      }

      return direction === 'asc' ? comparison : -comparison;
    });

    setFilteredFiles(sorted);
  }, []);

  // Update file in the file tree
  const updateFileInTree = useCallback((files: FileItem[], fileId: string, updater: (file: FileItem) => FileItem): FileItem[] => {
    return files.map((file) => {
      if (file.id === fileId) {
        return updater(file);
      }
      if (file.children) {
        return {
          ...file,
          children: updateFileInTree(file.children, fileId, updater),
        };
      }
      return file;
    });
  }, []);

  // Toggle folder open/closed
  const toggleFolder = useCallback((file: FileItem) => {
    setFiles((prevFiles) =>
      updateFileInTree(prevFiles, file.id, (f) => ({ ...f, isOpen: !f.isOpen }))
    );
  }, [updateFileInTree]);

  // Handle file selection
  const handleSelect = useCallback((e: React.MouseEvent, file: FileItem) => {
    e.stopPropagation();
    const newSelected = new Set(selectedFiles);

    if (e.ctrlKey || e.metaKey) {
      // Multi-select with Ctrl/Cmd key
      if (newSelected.has(file.id)) {
        newSelected.delete(file.id);
      } else {
        newSelected.add(file.id);
      }
    } else if (e.shiftKey && selectedFiles.size > 0) {
      // Range select with Shift key
      const fileIds = filteredFiles.map((f) => f.id);
      const lastSelected = Array.from(selectedFiles).pop();
      const lastIndex = fileIds.indexOf(lastSelected || "");
      const currentIndex = fileIds.indexOf(file.id);

      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);

      for (let i = start; i <= end; i++) {
        newSelected.add(fileIds[i]);
      }
    } else {
      // Single select
      newSelected.clear();
      newSelected.add(file.id);
    }

    setSelectedFiles(newSelected);
    onFileSelect?.(file.path);
  }, [filteredFiles, onFileSelect, selectedFiles]);

  // Handle double click on file/folder
  const handleDoubleClick = useCallback((file: FileItem) => {
    if (file.type === "folder") {
      toggleFolder(file);
    } else {
      onFileOpen?.(file.path);

      // Add to open tabs if not already open
      setOpenTabs((prev) => {
        if (!prev.some((tab) => tab.path === file.path)) {
          return [...prev, { ...file, isDirty: false }];
        }
        return prev;
      });

      setCurrentTab(file.path);
    }
  }, [onFileOpen, toggleFolder]);

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, file: FileItem | null = null) => {
    e.preventDefault();
    e.stopPropagation();

    // If right-click is not on a selected file, clear selection and select the clicked file
    if (file && !selectedFiles.has(file.id)) {
      setSelectedFiles(new Set([file.id]));
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      file,
    });
  }, [selectedFiles]);

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Close context menu on Escape
      if (event.key === "Escape") {
        closeContextMenu();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeContextMenu]);

  // Render file or folder item
  const renderFileItem = useCallback((file: FileItem, depth = 0) => {
    const isSelected = selectedFiles.has(file.id);
    const hasChildren = file.children && file.children.length > 0;
    const isFolder = file.type === 'folder';

    return (
      <div
        key={file.id}
        className={`flex items-center px-2 py-1 rounded ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={(e) => handleSelect(e, file)}
        onDoubleClick={() => handleDoubleClick(file)}
        onContextMenu={(e) => handleContextMenu(e, file)}
      >
        {isFolder ? (
          <button
            className="mr-1 text-gray-400 hover:text-white focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              toggleFolder(file);
            }}
          >
            {file.isOpen ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
          </button>
        ) : (
          <div className="w-4 mr-1"></div>
        )}

        <div className="flex items-center flex-1 min-w-0">
          <span className="mr-2">
            {getFileIcon(file.name, isFolder)}
          </span>
          <span className="truncate">{file.name}</span>
        </div>
      </div>
    );
  }, [handleSelect, handleDoubleClick, handleContextMenu, selectedFiles, toggleFolder]);

  // Render the file explorer
  return (
    <div
      className={`flex flex-col h-full bg-gray-800 text-gray-200 ${className}`}
      style={style}
      onContextMenu={handleContextMenu}
      onClick={closeContextMenu}
    >
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center p-2 bg-gray-700 border-b border-gray-600">
          <button
            className="p-1 mr-2 text-gray-300 hover:text-white"
            title="New File"
            onClick={() => {
              const newFile: FileItem = {
                id: uuidv4(),
                name: 'new_file.txt',
                path: `${projectRoot}/new_file.txt`,
                type: 'file',
                isNew: true,
                isRenaming: true,
              };
              setFiles(prev => [...prev, newFile]);
              setSelectedFiles(new Set([newFile.id]));
            }}
          >
            <FaFile />
          </button>
          <button
            className="p-1 mr-2 text-gray-300 hover:text-white"
            title="New Folder"
            onClick={() => {
              const newFolder: FileItem = {
                id: uuidv4(),
                name: 'New Folder',
                path: `${projectRoot}/New Folder`,
                type: 'folder',
                isNew: true,
                isRenaming: true,
                children: [],
              };
              setFiles(prev => [...prev, newFolder]);
              setSelectedFiles(new Set([newFolder.id]));
            }}
          >
            <FaFolderPlus />
          </button>
          <div className="relative flex-1 max-w-xs ml-auto">
            <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="w-full py-1 pl-8 pr-2 text-sm text-white bg-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-red-400">
            <FaExclamationTriangle className="inline mr-2" />
            {error}
          </div>
        ) : (
          <div>
            {filteredFiles.map((file) => (
              <div key={file.id}>
                {renderFileItem(file)}
                {file.isOpen && file.children && (
                  <div>
                    {file.children.map((child) => renderFileItem(child, 1))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between p-1 text-xs text-gray-400 bg-gray-700 border-t border-gray-600">
        <div>
          {selectedFiles.size > 0
            ? `${selectedFiles.size} item${selectedFiles.size !== 1 ? 's' : ''} selected`
            : `${filteredFiles.length} item${filteredFiles.length !== 1 ? 's' : ''}`}
        </div>
        <div>
          {sortField} {sortDirection === 'asc' ? '↑' : '↓'}
        </div>
      </div>

      {/* Hidden file input for uploads */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            onFileUpload?.(files[0], projectRoot);
          }
        }}
      />
    </div>
  );
};

// Export the component
export default FileExplorer;
