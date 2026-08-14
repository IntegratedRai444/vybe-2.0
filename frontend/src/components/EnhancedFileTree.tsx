import React, { useState, useEffect } from "react";
import { FileIcon } from "./FileIcon";

interface FileItem {
  name: string;
  type: "file" | "folder";
  path: string;
  children?: FileItem[];
}

interface Props {
  root: string;
  onSelect: (filePath: string) => void;
  onContextMenu?: (filePath: string, x: number, y: number) => void;
}

export const EnhancedFileTree: React.FC<Props> = ({ root, onSelect, onContextMenu }) => {
  const [tree, setTree] = useState<FileItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (root) {
      fetchFiles();
    }
  }, [root]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/files?root=${encodeURIComponent(root)}`);
      const data = await response.json();
      setTree(data.children || []);
    } catch (error) {
      console.error("Failed to fetch files:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const handleItemClick = (item: FileItem) => {
    if (item.type === "folder") {
      toggleFolder(item.path);
    } else {
      setSelectedFile(item.path);
      onSelect(item.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    onContextMenu?.(item.path, e.clientX, e.clientY);
  };

  const handleDragStart = (e: React.DragEvent, item: FileItem) => {
    setDraggedItem(item.path);
    e.dataTransfer.setData("text/plain", item.path);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetItem: FileItem) => {
    e.preventDefault();
    if (draggedItem && targetItem.type === "folder" && draggedItem !== targetItem.path) {
      // TODO: Implement file move operation
      console.log("Move", draggedItem, "to", targetItem.path);
    }
    setDraggedItem(null);
  };

  const renderItem = (item: FileItem, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(item.path);
    const isSelected = selectedFile === item.path;
    const paddingLeft = depth * 16 + 8;

    return (
      <div key={item.path}>
        <div
          className={`flex items-center py-1 px-2 cursor-pointer text-sm hover:bg-gray-700 ${
            isSelected ? "bg-blue-600" : ""
          } ${draggedItem === item.path ? "opacity-50" : ""}`}
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => handleItemClick(item)}
          onContextMenu={(e) => handleContextMenu(e, item)}
          draggable
          onDragStart={(e) => handleDragStart(e, item)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, item)}
        >
          {item.type === "folder" && (
            <span className="mr-1 text-gray-400 text-xs">
              {isExpanded ? "▼" : "▶"}
            </span>
          )}
          
          <FileIcon 
            fileName={item.name} 
            isFolder={item.type === "folder"}
            isOpen={isExpanded}
            size="sm"
          />
          
          <span className={`truncate ${
            item.type === "folder" ? "text-blue-300" : "text-gray-200"
          }`}>
            {item.name}
          </span>
        </div>
        
        {item.type === "folder" && isExpanded && item.children && (
          <div>
            {item.children
              .sort((a, b) => {
                // Folders first, then files
                if (a.type !== b.type) {
                  return a.type === "folder" ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
              })
              .map((child) => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        Loading files...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {tree.length === 0 ? (
        <div className="p-4 text-center text-gray-500 text-sm">
          No files found
        </div>
      ) : (
        tree
          .sort((a, b) => {
            if (a.type !== b.type) {
              return a.type === "folder" ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
          })
          .map((item) => renderItem(item))
      )}
    </div>
  );
};

// Exports
export { EnhancedFileTree };
