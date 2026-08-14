import React, { useState, useCallback, useMemo } from "react";
import {
  FiFolder,
  FiFile,
  FiChevronRight,
  FiChevronDown,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { useProject, ProjectFile } from "../../contexts/ProjectContext";

interface FileTreeItem {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileTreeItem[];
  file?: ProjectFile;
}

const ProjectExplorer: React.FC = () => {
  const { currentProject, createFile, deleteFile, getFile, saveFile } =
    useProject();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [newItem, setNewItem] = useState<{
    type: "file" | "folder" | null;
    parentPath: string;
  }>({
    type: null,
    parentPath: "",
  });
  const [newItemName, setNewItemName] = useState("");

  // Convert flat files array to a tree structure
  const fileTree = useMemo(() => {
    if (!currentProject) return [];

    const root: FileTreeItem = {
      id: "root",
      name: currentProject.name,
      path: "",
      type: "folder",
      children: [],
    };

    const addToTree = (path: string, file: ProjectFile) => {
      const parts = path.split("/").filter(Boolean);
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        const currentPath = parts.slice(0, i + 1).join("/");

        if (isFile) {
          current.children = current.children || [];
          current.children.push({
            id: file.id,
            name: part,
            path: currentPath,
            type: "file",
            file,
          });
        } else {
          let folder = current.children?.find((child) => child.name === part);

          if (!folder) {
            folder = {
              id: `folder-${currentPath}`,
              name: part,
              path: currentPath,
              type: "folder",
              children: [],
            };
            current.children = [...(current.children || []), folder];
          }

          current = folder;
        }
      }
    };

    currentProject.files.forEach((file) => {
      addToTree(file.path, file);
    });

    return [root];
  }, [currentProject]);

  const toggleFolder = useCallback((folderPath: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  }, []);

  const handleAddItem = useCallback(
    (type: "file" | "folder", parentPath: string) => {
      setNewItem({ type, parentPath });
      setNewItemName("");
    },
    [],
  );

  const handleCreateItem = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newItemName.trim() || !currentProject || !newItem.type) return;

      try {
        const fullPath = newItem.parentPath
          ? `${newItem.parentPath}/${newItemName}`
          : newItemName;

        if (newItem.type === "file") {
          await createFile(fullPath);
        } else {
          // For folders, we'll create a placeholder file to represent the folder
          // This is a simplification - in a real app, you'd have a proper folder structure
          await createFile(`${fullPath}/.keep`, "");
        }

        // Expand the parent folder
        if (newItem.parentPath) {
          setExpandedFolders((prev) => new Set(prev).add(newItem.parentPath));
        }

        setNewItem({ type: null, parentPath: "" });
      } catch (error) {
        console.error("Failed to create item:", error);
      }
    },
    [newItem, newItemName, currentProject, createFile],
  );

  const handleDeleteFile = useCallback(
    (fileId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm("Are you sure you want to delete this file?")) {
        deleteFile(fileId);
      }
    },
    [deleteFile],
  );

  const renderTree = (items: FileTreeItem[], level = 0) => {
    return items.map((item) => {
      const isFolder = item.type === "folder";
      const isExpanded = isFolder && expandedFolders.has(item.path);
      const hasChildren = isFolder && item.children && item.children.length > 0;
      const showAddButtons = isFolder && isExpanded;

      return (
        <div key={item.path || "root"} className="pl-4">
          <div
            className={`flex items-center py-1 px-2 hover:bg-gray-100 rounded cursor-pointer ${
              !isFolder ? "ml-4" : ""
            }`}
            onClick={() => isFolder && toggleFolder(item.path)}
          >
            {isFolder && (
              <span className="mr-1">
                {isExpanded ? (
                  <FiChevronDown size={16} />
                ) : (
                  <FiChevronRight size={16} />
                )}
              </span>
            )}
            <span className="mr-2">
              {isFolder ? (
                <FiFolder className="text-blue-500" />
              ) : (
                <FiFile className="text-gray-600" />
              )}
            </span>
            <span className="flex-1 truncate">{item.name}</span>

            {!isFolder && (
              <button
                onClick={(e) => handleDeleteFile(item.id, e)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
              >
                <FiTrash2 size={14} />
              </button>
            )}
          </div>

          {showAddButtons && (
            <div className="pl-6 py-1 flex space-x-2 text-xs">
              <button
                onClick={() => handleAddItem("file", item.path)}
                className="text-blue-500 hover:underline flex items-center"
              >
                <FiPlus size={12} className="mr-1" /> File
              </button>
              <button
                onClick={() => handleAddItem("folder", item.path)}
                className="text-blue-500 hover:underline flex items-center"
              >
                <FiPlus size={12} className="mr-1" /> Folder
              </button>
            </div>
          )}

          {newItem.type && newItem.parentPath === item.path && (
            <div className="pl-6 py-1">
              <form onSubmit={handleCreateItem} className="flex">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={`New ${newItem.type} name`}
                  className="flex-1 text-sm px-2 py-1 border rounded-l focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-2 py-1 rounded-r text-sm hover:bg-blue-600"
                >
                  Add
                </button>
              </form>
            </div>
          )}

          {isFolder && isExpanded && item.children && (
            <div>
              {item.children.length > 0 ? (
                renderTree(item.children, level + 1)
              ) : (
                <div className="pl-8 text-gray-400 text-xs py-1">
                  Empty folder
                </div>
              )}
            </div>
          )}
        </div>
      );
    });
  };

  if (!currentProject) {
    return (
      <div className="p-4 text-gray-500 text-center">
        No project is currently open. Create or open a project to get started.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b flex justify-between items-center">
        <h3 className="font-medium">Explorer</h3>
        <div className="flex space-x-1">
          <button
            onClick={() => handleAddItem("file", "")}
            className="p-1 text-gray-500 hover:text-blue-500 hover:bg-gray-100 rounded"
            title="New File"
          >
            <FiFile size={16} />
          </button>
          <button
            onClick={() => handleAddItem("folder", "")}
            className="p-1 text-gray-500 hover:text-blue-500 hover:bg-gray-100 rounded"
            title="New Folder"
          >
            <FiFolder size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto py-2">{renderTree(fileTree)}</div>
    </div>
  );
};

export default ProjectExplorer;
