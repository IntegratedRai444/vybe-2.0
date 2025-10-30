import React from 'react';
import { X } from 'lucide-react';

type EditorTabsProps = {
  files: Array<{ id: string; name: string; isDirty?: boolean }>;
  activeFile: string | null;
  onTabSelect: (fileId: string) => void;
  onTabClose: (fileId: string) => void;
};

export const EditorTabs: React.FC<EditorTabsProps> = ({
  files,
  activeFile,
  onTabSelect,
  onTabClose
}) => {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center bg-[#252526] border-b border-[#1e1e1e] overflow-x-auto">
      {files.map((file) => (
        <div
          key={file.id}
          className={`flex items-center px-3 py-2 text-sm border-r border-[#1e1e1e] cursor-pointer transition-colors ${
            activeFile === file.id
              ? 'bg-[#1e1e1e] text-white'
              : 'bg-[#2d2d2d] text-[#cccccc] hover:bg-[#2a2d2e]'
          }`}
          onClick={() => onTabSelect(file.id)}
        >
          <span className="mr-2">
            {getFileIcon(file.name)}
          </span>
          <span className="max-w-[200px] truncate">
            {file.name}
            {file.isDirty && ' •'}
          </span>
          <button
            className="ml-2 p-1 rounded-full hover:bg-[#3c3c3c] text-gray-400 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              onTabClose(file.id);
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

function getFileIcon(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  const iconMap: Record<string, string> = {
    // Code files
    'js': '',
    'jsx': '',
    'ts': '',
    'tsx': '',
    'py': '',
    'java': '',
    'c': '',
    'cpp': '',
    'cs': '',
    'go': '',
    'php': '',
    'rb': '',
    'rs': '',
    'swift': '',
    'kt': '',
    'dart': '',
    
    // Web
    'html': '',
    'css': '',
    'scss': '',
    'sass': '',
    'less': '',
    'json': '',
    
    // Config
    'yaml': '',
    'yml': '',
    'toml': '',
    'ini': '',
    'env': '',
    
    // Documents
    'md': '',
    'txt': '',
    
    // Default
    'default': ''
  };

  return iconMap[extension] || iconMap['default'];
}

export default EditorTabs;
