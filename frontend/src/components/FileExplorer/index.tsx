import React, { useState } from 'react';
import { FileText, Folder, ChevronRight, ChevronDown, FileCode, FileJs, FileJsx, FileTs, FileTsx, FileCss, FileHtml, FileMarkdown, FileJson } from 'lucide-react';
import { FileNode } from '@/types';

interface FileExplorerProps {
  files: FileNode[];
  onFileSelect: (file: FileNode) => void;
  selectedFile: FileNode | null;
  className?: string;
}

const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  onFileSelect,
  selectedFile,
  className = ''
}) => {
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({});

  const toggleDirectory = (path: string) => {
    setExpandedDirs(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js':
        return <FileJs className="w-4 h-4 text-yellow-500" />;
      case 'jsx':
        return <FileJsx className="w-4 h-4 text-blue-400" />;
      case 'ts':
        return <FileTs className="w-4 h-4 text-blue-600" />;
      case 'tsx':
        return <FileTsx className="w-4 h-4 text-blue-500" />;
      case 'css':
        return <FileCss className="w-4 h-4 text-purple-500" />;
      case 'html':
        return <FileHtml className="w-4 h-4 text-orange-500" />;
      case 'json':
        return <FileJson className="w-4 h-4 text-yellow-600" />;
      case 'md':
      case 'markdown':
        return <FileMarkdown className="w-4 h-4 text-blue-400" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const renderFile = (file: FileNode, depth = 0) => {
    const isDir = file.children && file.children.length > 0;
    const isExpanded = expandedDirs[file.path];
    const isSelected = selectedFile?.path === file.path;

    return (
      <div key={file.path} className="w-full">
        <div 
          className={`flex items-center py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer ${isSelected ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
          style={{ paddingLeft: `${depth * 12}px` }}
          onClick={() => isDir ? toggleDirectory(file.path) : onFileSelect(file)}
        >
          {isDir ? (
            <span className="flex items-center">
              {isExpanded ? 
                <ChevronDown className="w-4 h-4 mr-1" /> : 
                <ChevronRight className="w-4 h-4 mr-1" />
              }
              <Folder className="w-4 h-4 mr-2 text-yellow-500" />
            </span>
          ) : (
            <span className="w-4 h-4 mr-2 flex items-center">
              {getFileIcon(file.name)}
            </span>
          )}
          <span className="text-sm truncate">{file.name}</span>
        </div>
        
        {isDir && isExpanded && file.children && (
          <div className="w-full">
            {file.children.map(child => renderFile(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`file-explorer ${className} overflow-y-auto`}>
      {files.map(file => renderFile(file))}
    </div>
  );
};

export default FileExplorer;
