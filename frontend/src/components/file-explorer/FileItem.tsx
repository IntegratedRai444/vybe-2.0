import React from "react";
import { FaFolder, FaFile } from "react-icons/fa";
import type { FileItem as FileItemType } from "./types";

type FileItemProps = {
  file: FileItemType;
  onSelect: (file: FileItemType) => void;
  onDoubleClick: (file: FileItemType) => void;
  onToggleSelect: (file: FileItemType, event?: React.MouseEvent) => void;
  isSelected: boolean;
  getFileIcon?: (fileName: string) => React.ReactNode;
};

export const FileItem: React.FC<FileItemProps> = ({
  file,
  onSelect,
  onDoubleClick,
  onToggleSelect,
  isSelected,
  getFileIcon,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      onToggleSelect(file, e);
    } else {
      onSelect(file);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onToggleSelect(file, e);
  };

  return (
    <div
      className={`flex items-center p-2 hover:bg-gray-700 rounded cursor-pointer ${
        isSelected ? "bg-blue-900 bg-opacity-50" : ""
      }`}
      onClick={handleClick}
      onDoubleClick={() => onDoubleClick(file)}
      onContextMenu={handleContextMenu}
    >
      <div className="w-4 flex-shrink-0">
        {getFileIcon ? (
          getFileIcon(file.name)
        ) : file.type === "folder" ? (
          <FaFolder className="text-yellow-400" />
        ) : (
          <FaFile className="text-blue-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="truncate">{file.name}</div>
      </div>
      <div className="w-4 flex-shrink-0">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect(file);
          }}
          className="h-4 w-4 text-blue-600 rounded"
        />
      </div>
    </div>
  );
};

// Exports
export { FileItem };
