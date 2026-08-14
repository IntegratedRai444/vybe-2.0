import React from "react";
import { FileItem } from "./FileItem";
import type {
  FileItem as FileItemType,
  SortField,
  SortOrder,
  ViewMode,
} from "./types";

type FileListProps = {
  files: FileItemType[];
  viewMode: ViewMode;
  sortBy: SortField;
  sortOrder: SortOrder;
  onFileSelect: (file: FileItemType) => void;
  onFileDoubleClick: (file: FileItemType) => void;
  onToggleSelect: (file: FileItemType, event?: React.MouseEvent) => void;
  selectedFiles: Set<string>;
  getFileIcon: (fileName: string) => React.ReactNode;
};

export const FileList: React.FC<FileListProps> = ({
  files,
  viewMode,
  sortBy,
  sortOrder,
  onFileSelect,
  onFileDoubleClick,
  onToggleSelect,
  selectedFiles,
  getFileIcon,
}) => {
  const sortedFiles = React.useMemo(() => {
    return [...files].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "size":
          comparison = a.size - b.size;
          break;
        case "modified":
          comparison =
            new Date(a.modified).getTime() - new Date(b.modified).getTime();
          break;
        case "type":
          comparison =
            a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [files, sortBy, sortOrder]);

  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-2">
        {sortedFiles.map((file) => (
          <FileItem
            key={file.path}
            file={file}
            isSelected={selectedFiles.has(file.path)}
            onSelect={onFileSelect}
            onDoubleClick={onFileDoubleClick}
            onToggleSelect={onToggleSelect}
            getFileIcon={getFileIcon}
          />
        ))}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-1 p-2">
      {sortedFiles.map((file) => (
        <FileItem
          key={file.path}
          file={file}
          isSelected={selectedFiles.has(file.path)}
          onSelect={onFileSelect}
          onDoubleClick={onFileDoubleClick}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
};

// Exports
export { FileList };
