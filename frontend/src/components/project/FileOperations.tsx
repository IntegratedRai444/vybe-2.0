import React, { useState, useEffect, useRef } from "react";
import { FiMove, FiEdit2, FiX, FiCheck, FiFolder } from "react-icons/fi";
import { useProject } from "../../contexts/ProjectContext";
import { getFileExtension, validateFilename } from "../../utils/fileUtils";

// Simple toast implementation since we don't have react-toastify installed
const toast = {
  success: (message: string) => console.log(`Success: ${message}`),
  error: (message: string) => console.error(`Error: ${message}`),
};

interface FileOperationsProps {
  fileId: string;
  currentPath: string;
  onComplete: () => void;
}

const FileOperations: React.FC<FileOperationsProps> = ({
  fileId,
  currentPath,
  onComplete,
}) => {
  const { currentProject, renameFile, moveFile, getFile, getFileByPath } =
    useProject();
  const [isRenaming, setIsRenaming] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPath, setNewPath] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const moveInputRef = useRef<HTMLInputElement>(null);

  const file = getFile(fileId);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  useEffect(() => {
    if (isMoving && moveInputRef.current) {
      moveInputRef.current.focus();
      moveInputRef.current.select();
    }
  }, [isMoving]);

  if (!file || !currentProject) return null;

  const startRenaming = () => {
    setNewName(file.name.split(".").slice(0, -1).join("."));
    setIsRenaming(true);
    setIsMoving(false);
    setError("");
  };

  const startMoving = () => {
    const pathParts = file.path.split("/");
    pathParts.pop(); // Remove the filename
    setNewPath(pathParts.join("/"));
    setIsMoving(true);
    setIsRenaming(false);
    setError("");
  };

  const cancelOperation = () => {
    setIsRenaming(false);
    setIsMoving(false);
    setError("");
    onComplete();
  };

  const handleRename = () => {
    if (!newName.trim()) {
      setError("Name cannot be empty");
      return;
    }

    // Validate filename
    const validationError = validateFilename(newName);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    // Get the file extension if it exists
    const fileExt = getFileExtension(file.name);
    const updatedName = fileExt ? `${newName}.${fileExt}` : newName;

    // Check if a file with the new name already exists in the same directory
    const pathParts = file.path.split("/");
    pathParts[pathParts.length - 1] = updatedName;
    const newFilePath = pathParts.join("/");

    if (getFileByPath(newFilePath) && newFilePath !== file.path) {
      setError("A file with this name already exists");
      toast.error("A file with this name already exists");
      return;
    }

    try {
      renameFile(fileId, updatedName);
      toast.success(`Renamed to ${updatedName}`);
      cancelOperation();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to rename file";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleMove = () => {
    if (!newPath.trim()) {
      setError("Please enter a destination path");
      return;
    }

    const fileName = file.name;
    const newFilePath = newPath.endsWith("/")
      ? `${newPath}${fileName}`
      : `${newPath}/${fileName}`;

    // Check if the destination is the same as current path
    if (newFilePath === file.path) {
      cancelOperation();
      return;
    }

    // Check if a file already exists at the destination
    if (getFileByPath(newFilePath)) {
      setError("A file already exists at the destination");
      toast.error("A file already exists at the destination");
      return;
    }

    try {
      moveFile(fileId, newFilePath);
      toast.success(`Moved to ${newFilePath}`);
      cancelOperation();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to move file";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: "rename" | "move") => {
    if (e.key === "Enter") {
      action === "rename" ? handleRename() : handleMove();
    } else if (e.key === "Escape") {
      cancelOperation();
    }
  };

  return (
    <div className="flex flex-col space-y-2 text-sm">
      <div className="flex space-x-2">
        {!isRenaming && !isMoving ? (
          <>
            <button
              onClick={startRenaming}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Rename"
            >
              <FiEdit2 size={16} />
            </button>
            <button
              onClick={startMoving}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Move to folder"
            >
              <FiFolder size={16} />
            </button>
          </>
        ) : isRenaming ? (
          <div className="flex items-center space-x-1 bg-white p-1 rounded border">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "rename")}
                className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter new name"
              />
              <div className="absolute -bottom-6 left-0 text-xs text-red-500">
                {error}
              </div>
            </div>
            <div className="flex space-x-1">
              <button
                onClick={handleRename}
                className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                title="Rename"
              >
                <FiCheck size={18} />
              </button>
              <button
                onClick={cancelOperation}
                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Cancel"
              >
                <FiX size={18} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-1 bg-white p-1 rounded border w-full">
            <div className="flex-1 relative">
              <div className="flex items-center">
                <span className="text-gray-500 text-sm mr-1">Move to:</span>
                <input
                  ref={moveInputRef}
                  type="text"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, "move")}
                  className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="/path/to/destination"
                />
              </div>
              <div className="absolute -bottom-6 left-0 text-xs text-red-500">
                {error}
              </div>
            </div>
            <div className="flex space-x-1">
              <button
                onClick={handleMove}
                className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                title="Move"
              >
                <FiCheck size={18} />
              </button>
              <button
                onClick={cancelOperation}
                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Cancel"
              >
                <FiX size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {!isRenaming && !isMoving && error && (
        <div className="text-xs text-red-500 mt-1">{error}</div>
      )}
    </div>
  );
};

export default FileOperations;
