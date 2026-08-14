import React, { useCallback, useEffect, useRef, useState } from "react";
import { Command } from "cmdk";
import {
  FiSearch,
  FiX,
  FiTerminal,
  FiSettings,
  FiFile,
  FiFolder,
  FiGitBranch,
} from "react-icons/fi";
import { useStore } from "../../store/useStore";
import { Command as CommandType } from "../../types";

const CommandPalette: React.FC = () => {
  const { isCommandPaletteOpen, setCommandPaletteOpen } = useStore();
  const [search, setSearch] = useState("");
  const commandRef = useRef<HTMLDivElement>(null);

  // Close command palette on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setCommandPaletteOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        commandRef.current &&
        !commandRef.current.contains(e.target as Node)
      ) {
        setCommandPaletteOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setCommandPaletteOpen]);

  // Commands list
  const commands: CommandType[] = [
    {
      id: "new-file",
      name: "New File",
      description: "Create a new file",
      icon: <FiFile className="w-4 h-4" />,
      category: "File",
      shortcut: ["⌘", "N"],
      action: () => console.log("New file"),
    },
    {
      id: "open-folder",
      name: "Open Folder",
      description: "Open a folder in the workspace",
      icon: <FiFolder className="w-4 h-4" />,
      category: "File",
      shortcut: ["⌘", "O"],
      action: () => console.log("Open folder"),
    },
    {
      id: "open-terminal",
      name: "Toggle Terminal",
      description: "Show/hide the integrated terminal",
      icon: <FiTerminal className="w-4 h-4" />,
      category: "View",
      shortcut: ["⌘", "`"],
      action: () => useStore.getState().togglePanel("terminal"),
    },
    {
      id: "open-settings",
      name: "Open Settings",
      description: "Open settings",
      icon: <FiSettings className="w-4 h-4" />,
      category: "Preferences",
      shortcut: ["⌘", ","],
      action: () => console.log("Open settings"),
    },
    {
      id: "git-commit",
      name: "Git: Commit",
      description: "Commit changes to git",
      icon: <FiGitBranch className="w-4 h-4" />,
      category: "Git",
      action: () => console.log("Git commit"),
    },
  ];

  // Filter commands based on search
  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description.toLowerCase().includes(search.toLowerCase()) ||
      cmd.category?.toLowerCase().includes(search.toLowerCase()),
  );

  // Group commands by category
  const commandsByCategory = filteredCommands.reduce<
    Record<string, CommandType[]>
  >((acc, cmd) => {
    const category = cmd.category || "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(cmd);
    return acc;
  }, {});

  if (!isCommandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50">
      <div
        ref={commandRef}
        className="w-full max-w-2xl bg-gray-900 rounded-lg shadow-2xl overflow-hidden border border-gray-700"
      >
        <Command
          label="Command Palette"
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-400 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5 [&_[cmdk-item]_svg]:text-gray-400"
        >
          <div className="flex items-center px-4 border-b border-gray-800">
            <FiSearch className="h-5 w-5 text-gray-500 mr-2" />
            <Command.Input
              autoFocus
              placeholder="Type a command or search..."
              value={search}
              onValueChange={setSearch}
              className="w-full bg-transparent h-12 outline-none text-gray-200 placeholder-gray-500"
            />
            <button
              onClick={() => setCommandPaletteOpen(false)}
              className="p-1 rounded-md hover:bg-gray-800 text-gray-400 hover:text-gray-200"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            {Object.entries(commandsByCategory).map(([category, cmds]) => (
              <Command.Group key={category} heading={category}>
                {cmds.map((cmd) => (
                  <Command.Item
                    key={cmd.id}
                    onSelect={() => {
                      cmd.action();
                      setCommandPaletteOpen(false);
                    }}
                    className="flex items-center px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-800 cursor-pointer"
                  >
                    <div className="flex items-center flex-1">
                      <span className="mr-2 text-gray-400">{cmd.icon}</span>
                      <span>{cmd.name}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        {cmd.description}
                      </span>
                    </div>
                    {cmd.shortcut && (
                      <div className="flex space-x-1">
                        {cmd.shortcut.map((key, i) => (
                          <kbd
                            key={i}
                            className="px-2 py-1 text-xs bg-gray-800 rounded-md text-gray-300"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}

            {filteredCommands.length === 0 && (
              <div className="py-6 text-center text-sm text-gray-500">
                No commands found
              </div>
            )}
          </Command.List>

          <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-500 border-t border-gray-800">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-gray-800 rounded">↑↓</span>
              <span>Navigate</span>
              <span className="px-2 py-1 bg-gray-800 rounded">Enter</span>
              <span>Select</span>
            </div>
            <div>
              <span className="px-2 py-1 bg-gray-800 rounded">Esc</span>
              <span> to close</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
};

export default CommandPalette;
