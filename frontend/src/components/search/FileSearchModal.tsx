import React, { useState, useEffect } from "react";

type FileItem = {
  name: string;
  path: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  files: FileItem[];
  onSelect: (path: string) => void;
};

export const FileSearchModal: React.FC<Props> = ({ isOpen, onClose, files, onSelect }) => {
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState<FileItem[]>([]);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!query) {
      setFiltered(files.slice(0, 20));
    } else {
      const results = files
        .filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 20);
      setFiltered(results);
    }
    setSelected(0);
  }, [query, files]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSelected(0);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selected]) {
        onSelect(filtered[selected].path);
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-96 max-h-96 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <input
            type="text"
            placeholder="Search files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded outline-none"
            autoFocus
          />
        </div>
        
        <div className="max-h-64 overflow-y-auto">
          {filtered.map((file, index) => (
            <div
              key={file.path}
              className={`px-4 py-2 cursor-pointer ${
                index === selected ? "bg-blue-600" : "hover:bg-gray-700"
              }`}
              onClick={() => {
                onSelect(file.path);
                onClose();
              }}
            >
              <div className="text-sm text-white">{file.name}</div>
              <div className="text-xs text-gray-400 truncate">{file.path}</div>
            </div>
          ))}
          
          {filtered.length === 0 && (
            <div className="p-4 text-gray-500 text-center">No files found</div>
          )}
        </div>
        
        <div className="p-2 border-t border-gray-700 text-xs text-gray-400 text-center">
          ↑↓ Navigate • Enter Select • Esc Close
        </div>
      </div>
    </div>
  );
};