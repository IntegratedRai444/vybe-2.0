import React from "react";
import {
  FiChevronRight,
  FiChevronDown,
  FiFolder,
  FiFile,
} from "react-icons/fi";

interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: FileItem[];
}

const sampleFiles: FileItem[] = [
  {
    id: "ai-projects",
    name: "AI PROJECTS",
    type: "folder",
    children: [
      { id: "project-1", name: "project-1", type: "folder" },
      { id: "project-2", name: "project-2", type: "folder" },
    ],
  },
  {
    id: "open-editors",
    name: "OPEN EDITORS",
    type: "folder",
    children: [
      { id: "app-tsx", name: "App.tsx", type: "file" },
      { id: "index-tsx", name: "index.tsx", type: "file" },
    ],
  },
];

export const ExplorerPanel: React.FC = () => {
  const [expandedFolders, setExpandedFolders] = React.useState<
    Record<string, boolean>
  >({
    "ai-projects": true,
    "open-editors": true,
  });

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const renderFileItem = (item: FileItem, depth = 0) => {
    const isExpanded = expandedFolders[item.id] ?? false;

    return (
      <div key={item.id} className="w-full">
        <div
          className={`flex items-center py-1 px-2 hover:bg-[#2A2D2E] cursor-pointer ${
            depth > 0 ? "pl-4" : ""
          }`}
          onClick={() => item.type === "folder" && toggleFolder(item.id)}
        >
          {item.type === "folder" ? (
            <span className="mr-1 text-[#858585]">
              {isExpanded ? (
                <FiChevronDown size={16} />
              ) : (
                <FiChevronRight size={16} />
              )}
            </span>
          ) : (
            <span className="w-4 mr-1"></span>
          )}
          <span className="mr-2 text-[#858585]">
            {item.type === "folder" ? (
              <FiFolder size={16} />
            ) : (
              <FiFile size={16} />
            )}
          </span>
          <span className="text-sm">{item.name}</span>
        </div>

        {item.children && isExpanded && (
          <div className="ml-2">
            {item.children.map((child) => renderFileItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full bg-[#252526] text-[#D4D4D4] text-sm select-none overflow-y-auto">
      <div className="py-2">
        <div className="px-4 py-1 text-xs font-semibold text-[#858585] uppercase tracking-wider">
          Explorer
        </div>
        <div className="mt-2">
          {sampleFiles.map((item) => renderFileItem(item))}
        </div>
      </div>
    </div>
  );
};

// Exports
export { ExplorerPanel };
