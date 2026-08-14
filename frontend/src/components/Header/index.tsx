import React from "react";
import { FiMenu, FiSave, FiPlay, FiCommand } from "react-icons/fi";

type HeaderProps = {
  onToggleSidebar: () => void;
  onToggleCommandPalette: () => void;
  onSave: () => void;
  onRun: () => void;
};

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onToggleCommandPalette,
  onSave,
  onRun,
}) => {
  return (
    <header className="flex items-center justify-between p-4 bg-gray-800 text-white">
      <div className="flex items-center space-x-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded hover:bg-gray-700"
          aria-label="Toggle sidebar"
        >
          <FiMenu size={20} />
        </button>
        <h1 className="text-xl font-semibold">Vybe 2.0</h1>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={onSave}
          className="flex items-center px-3 py-1.5 text-sm rounded bg-blue-600 hover:bg-blue-700"
        >
          <FiSave className="mr-2" />
          Save
        </button>
        <button
          onClick={onRun}
          className="flex items-center px-3 py-1.5 text-sm rounded bg-green-600 hover:bg-green-700"
        >
          <FiPlay className="mr-2" />
          Run
        </button>
        <button
          onClick={onToggleCommandPalette}
          className="flex items-center p-2 rounded hover:bg-gray-700"
          aria-label="Command palette"
        >
          <FiCommand size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;
