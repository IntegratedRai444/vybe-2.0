import React, { useState } from "react";
import { createFile as apiCreateFile, createFolder as apiCreateFolder, deleteFileOrFolder, renameFileOrFolder } from "../utils/api";

type Props = {
  projectRoot: string;
  selectedPath?: string;
  onRefresh: () => void;
  onFileCreated: (path: string) => void;
};

export const FileOperations: React.FC<Props> = ({ 
  projectRoot, 
  selectedPath, 
  onRefresh, 
  onFileCreated 
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const createFile = async () => {
    const fileName = prompt("Enter file name:");
    if (!fileName) return;
    
    const basePath = selectedPath && !selectedPath.endsWith('/') && selectedPath.includes('.')
      ? selectedPath.substring(0, selectedPath.lastIndexOf('/'))
      : selectedPath || projectRoot;
    
    const filePath = `${basePath}/${fileName}`;
    
    setLoading(true);
    setError("");
    
    try {
      await apiCreateFile(filePath);
      onRefresh();
      onFileCreated(filePath);
      setShowMenu(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create file");
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async () => {
    const folderName = prompt("Enter folder name:");
    if (!folderName) return;
    
    const basePath = selectedPath && !selectedPath.endsWith('/') && selectedPath.includes('.')
      ? selectedPath.substring(0, selectedPath.lastIndexOf('/'))
      : selectedPath || projectRoot;
    
    const folderPath = `${basePath}/${folderName}`;
    
    setLoading(true);
    setError("");
    
    try {
      await apiCreateFolder(folderPath);
      onRefresh();
      setShowMenu(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async () => {
    if (!selectedPath) return;
    
    const confirmed = confirm(`Delete ${selectedPath.split('/').pop()}?`);
    if (!confirmed) return;
    
    setLoading(true);
    setError("");
    
    try {
      await deleteFileOrFolder(selectedPath);
      onRefresh();
      setShowMenu(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setLoading(false);
    }
  };

  const renameItem = async () => {
    if (!selectedPath) return;
    
    const currentName = selectedPath.split('/').pop() || "";
    const newName = prompt("Enter new name:", currentName);
    if (!newName || newName === currentName) return;
    
    const newPath = selectedPath.substring(0, selectedPath.lastIndexOf('/')) + '/' + newName;
    
    setLoading(true);
    setError("");
    
    try {
      await renameFileOrFolder(selectedPath, newPath);
      onRefresh();
      setShowMenu(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
        title="File Operations"
      >
        ⋮
      </button>
      
      {showMenu && (
        <div className="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-600 rounded shadow-lg z-50 min-w-32">
          <button
            onClick={createFile}
            disabled={loading}
            className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm"
          >
            📄 New File
          </button>
          <button
            onClick={createFolder}
            disabled={loading}
            className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm"
          >
            📁 New Folder
          </button>
          
          {selectedPath && (
            <>
              <hr className="border-gray-600" />
              <button
                onClick={renameItem}
                disabled={loading}
                className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm"
              >
                ✏️ Rename
              </button>
              <button
                onClick={deleteItem}
                disabled={loading}
                className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm text-red-400"
              >
                🗑️ Delete
              </button>
            </>
          )}
        </div>
      )}
      
      {error && (
        <div className="absolute top-full right-0 mt-1 p-2 bg-red-900 border border-red-700 rounded text-red-200 text-xs max-w-48">
          {error}
        </div>
      )}
    </div>
  );
};