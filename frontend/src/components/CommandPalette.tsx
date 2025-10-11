import React, { useState, useEffect } from "react";

type Command = {
  id: string;
  label: string;
  description?: string;
  category: string;
  keybinding?: string;
  action: () => void;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
};

export const CommandPalette: React.FC<Props> = ({ isOpen, onClose, commands }) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.description?.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-[600px] max-h-96 overflow-hidden">
        {/* Search Input */}
        <div className="p-4 border-b border-gray-700">
          <input
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded outline-none text-sm"
            autoFocus
          />
        </div>

        {/* Commands List */}
        <div className="max-h-64 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No commands found
            </div>
          ) : (
            filteredCommands.map((command, index) => (
              <div
                key={command.id}
                className={`px-4 py-3 cursor-pointer border-b border-gray-700 last:border-b-0 ${
                  index === selectedIndex ? "bg-blue-600" : "hover:bg-gray-700"
                }`}
                onClick={() => {
                  command.action();
                  onClose();
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-white">
                        {command.label}
                      </span>
                      <span className="text-xs bg-gray-600 px-2 py-0.5 rounded text-gray-300">
                        {command.category}
                      </span>
                    </div>
                    {command.description && (
                      <div className="text-xs text-gray-400 mt-1">
                        {command.description}
                      </div>
                    )}
                  </div>
                  {command.keybinding && (
                    <div className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                      {command.keybinding}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-gray-700 text-xs text-gray-400 text-center">
          ↑↓ Navigate • Enter Execute • Esc Close
        </div>
      </div>
    </div>
  );
};