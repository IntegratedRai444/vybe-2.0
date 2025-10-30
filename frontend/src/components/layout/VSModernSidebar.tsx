import { useState, useEffect, useRef, FC, ReactNode } from 'react';
import {
  FiFolder,
  FiChevronDown,
  FiChevronRight,
  FiChevronLeft,
  FiFile,
  FiRefreshCw,
  FiFilePlus,
  FiFolderPlus,
  FiTrash2,
  FiEdit2,
  FiExternalLink,
  FiFileText,
  FiMessageSquare
} from 'react-icons/fi';
import { listFiles, createFile, createFolder, deleteFileOrFolder, uploadFile } from '../utils/api';
// No need to import ProgressEvent as it's available globally in TypeScript

interface FileItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder' | 'directory';
  children?: FileItem[];
  isOpen?: boolean;
  extension?: string;
}

interface SearchResult {
  file: string;
  line: number;
  content: string;
  matches: { line: number; content: string }[];
}

interface VSModernSidebarProps {
  onFileSelect: (file: FileItem) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  item: FileItem | null;
  type: 'file' | 'folder' | 'root';
}

interface Folder {
  name: string;
  path: string;
  type: 'folder' | 'directory';
  children?: Array<FileItem | Folder>;
}

const updateFileTree = (files: FileItem[], path: string, updates: Partial<FileItem>): FileItem[] => {
  return files.map(file => {
    if (file.path === path) {
      return { ...file, ...updates };
    }
    if (file.children) {
      return {
        ...file,
        children: updateFileTree(file.children, path, updates)
      };
    }
    return file;
  });
};

const VSModernSidebar: FC<VSModernSidebarProps> = ({
  onFileSelect
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Load initial file structure
  useEffect(() => {
    loadFileStructure();
  }, []);

  const processFileStructure = (folder: Folder, parentPath = ''): FileItem => {
    const path = parentPath ? `${parentPath}/${folder.name}` : folder.name;
    const item: FileItem = {
      id: path,
      name: folder.name,
      path: path,
      type: folder.type === 'directory' ? 'directory' : 'folder',
      isOpen: false,
      extension: folder.type === 'file' ? folder.name.split('.').pop()?.toLowerCase() : undefined,
    };

    if (folder.children && folder.children.length > 0) {
      item.children = folder.children.map((child) => 
        processFileStructure(child as Folder, path)
      );
    }

    return item;
  };

  const loadFileStructure = async (path = '') => {
    try {
      setLoading(true);
      setError(null);
      const rootFolder = await listFiles(path);
      const processedFiles = [processFileStructure(rootFolder as Folder)];
      setFiles(processedFiles);
    } catch (err) {
      console.error('Error loading file structure:', err);
      setError('Failed to load file structure. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    try {
      const uploadPromises = Array.from(fileList).map(file => {
        const formData = new FormData();
        formData.append('file', file);

        return uploadFile(formData, (progressEvent: ProgressEvent<EventTarget>) => {
          const progress = progressEvent.loaded / progressEvent.total * 100;
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: progress
          }));
        });
      });

      await Promise.all(uploadPromises);
      await loadFileStructure();
      setUploadProgress({});
    } catch (error) {
      console.error('Error uploading files:', error);
      setError('Failed to upload files. Please try again.');
    }
  };

  const handleCreateFile = async (parentPath: string) => {
    const fileName = prompt('Enter file name:');
    if (!fileName) return;
    
    try {
      const filePath = `${parentPath}/${fileName}`;
      await createFile(filePath);
      await loadFileStructure();
    } catch (error) {
      console.error('Error creating file:', error);
      setError('Failed to create file');
    }
  };

  const handleCreateFolder = async (parentPath: string) => {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;
    
    try {
      const folderPath = `${parentPath}/${folderName}`;
      await createFolder(folderPath);
      await loadFileStructure();
    } catch (error) {
      console.error('Error creating folder:', error);
      setError('Failed to create folder');
    }
  };

  const handleDeleteItem = async (item: FileItem) => {
    if (!confirm(`Are you sure you want to delete ${item.name}?`)) return;
    
    try {
      await deleteFileOrFolder(item.path);
      await loadFileStructure();
    } catch (error) {
      console.error('Error deleting item:', error);
      setError('Failed to delete item');
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    try {
      setIsSearching(true);
      // Implement search functionality here
      // const results = await searchFiles(searchQuery);
      // setSearchResults(results);
    } catch (error) {
      console.error('Error searching:', error);
      setError('Failed to perform search');
    } finally {
      setIsSearching(false);
    }
  };

  const renderFileIcon = (item: FileItem) => {
    if (item.type === 'folder' || item.type === 'directory') {
      return item.isOpen ? (
        <FiFolder className="text-[#4B9BFF]" size={16} />
      ) : (
        <FiFolder className="text-[#4B9BFF]" size={16} />
      );
    }

    const extension = item.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return <FiFileText className="text-[#4B9BFF]" size={16} />;
      case 'css':
      case 'scss':
        return <FiFileText className="text-[#563D7C]" size={16} />;
      case 'json':
        return <FiFileText className="text-[#F5DE19]" size={16} />;
      case 'html':
        return <FiFileText className="text-[#E44D26]" size={16} />;
      case 'md':
        return <FiFileText className="text-blue-400" size={16} />;
      default:
        return <FiFile className="text-gray-400" size={16} />;
    }
  };

  const renderFileTree = (items: FileItem[], depth = 0): ReactNode => {
    return items.map(item => {
      const isSelected = selectedFile?.id === item.id;
      const isFolder = item.type === 'folder' || item.type === 'directory';
      
      return (
        <div key={item.id} className="w-full">
          <div 
            className={`flex items-center py-1 px-2 cursor-pointer transition-colors ${
              isSelected ? 'bg-[#37373D]' : 'hover:bg-[#2A2D2E]'
            }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => {
              if (isFolder) {
                setFiles(prev => 
                  updateFileTree(prev, item.path, { isOpen: !item.isOpen })
                );
              } else {
                setSelectedFile(item);
                onFileSelect(item);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({
                x: e.clientX,
                y: e.clientY,
                item,
                type: isFolder ? 'folder' : 'file'
              });
            }}
            onMouseEnter={() => setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            {isFolder ? (
              item.isOpen ? (
                <FiChevronDown className="mr-1 text-gray-400" size={16} />
              ) : (
                <FiChevronRight className="mr-1 text-gray-400" size={16} />
              )
            ) : (
              <div className="w-4 mr-1" />
            )}
            {renderFileIcon(item)}
            <span className="ml-2 text-sm truncate">{item.name}</span>
          </div>
          
          {isFolder && item.isOpen && item.children && (
            <div className="overflow-hidden">
              {renderFileTree(item.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const renderContextMenu = () => {
    if (!contextMenu) return null;

    const menuItems = [
      ...(contextMenu.type === 'file' ? [
        { label: 'Open', icon: <FiExternalLink size={14} />, onClick: () => {} },
        { label: 'Rename', icon: <FiEdit2 size={14} />, onClick: () => {} },
        { label: 'Delete', icon: <FiTrash2 size={14} />, onClick: () => contextMenu.item && handleDeleteItem(contextMenu.item) },
      ] : [
        { label: 'New File', icon: <FiFilePlus size={14} />, onClick: () => contextMenu.item && handleCreateFile(contextMenu.item.path) },
        { label: 'New Folder', icon: <FiFolderPlus size={14} />, onClick: () => contextMenu.item && handleCreateFolder(contextMenu.item.path) },
        { label: 'Refresh', icon: <FiRefreshCw size={14} />, onClick: () => loadFileStructure() },
      ])
    ];

    return (
      <div 
        className="fixed bg-[#252526] border border-[#454545] shadow-lg rounded text-sm z-50 py-1"
        style={{
          left: contextMenu.x,
          top: contextMenu.y,
          minWidth: '160px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {menuItems.map((item, index) => (
          <div
            key={index}
            className="flex items-center px-4 py-2 text-gray-200 hover:bg-[#2A2D2E] cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              item.onClick();
              setContextMenu(null);
            }}
          >
            <span className="mr-3">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div 
      className={`h-full flex flex-col bg-[#252526] text-[#E8E8E8] ${
        sidebarCollapsed ? 'w-12' : 'w-64'
      } select-none transition-all duration-200 ease-in-out`}
      onClick={() => setContextMenu(null)}
    >
      {/* Hidden file input for uploads */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={handleFileUpload}
      />

      {/* Sidebar header */}
      <div className="flex items-center justify-between p-3 border-b border-[#454545]">
        {!sidebarCollapsed && (
          <div className="flex items-center">
            <span className="font-medium">EXPLORER</span>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <button
            className="p-1 rounded hover:bg-[#2A2D2E]"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" />
          </div>
        ) : error ? (
          <div className="p-4 text-red-400 text-sm">{error}</div>
        ) : (
          <div className="py-1">
            {files.length > 0 ? (
              renderFileTree(files)
            ) : (
              <div className="p-4 text-center text-gray-400 text-sm">
                No files found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload progress indicators */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="p-2 border-t border-[#454545]">
          <div className="text-xs text-gray-400 mb-1">Uploading files...</div>
          {Object.entries(uploadProgress).map(([filename, progress]) => (
            <div key={filename} className="mb-1">
              <div className="flex justify-between text-xs mb-0.5">
                <span className="truncate">{filename}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-[#2A2D2E] rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && renderContextMenu()}
    </div>
  );
};

export default VSModernSidebar;