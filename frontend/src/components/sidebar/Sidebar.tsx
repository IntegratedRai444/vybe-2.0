import React from 'react';
import { FiFile, FiFolder, FiSettings, FiGitBranch, FiSearch, FiCode } from 'react-icons/fi';

type SidebarItem = {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
};

export const Sidebar: React.FC = () => {
  const items: SidebarItem[] = [
    { icon: <FiFile className="h-5 w-5" />, label: 'Explorer', active: true },
    { icon: <FiSearch className="h-5 w-5" />, label: 'Search' },
    { icon: <FiGitBranch className="h-5 w-5" />, label: 'Source Control' },
    { icon: <FiCode className="h-5 w-5" />, label: 'AI Assistant' },
    { icon: <FiSettings className="h-5 w-5" />, label: 'Settings' },
  ];

  return (
    <div className="w-16 bg-gray-900 text-gray-400 flex flex-col items-center py-4 space-y-6">
      {items.map((item, index) => (
        <button
          key={index}
          className={`p-2 rounded-md ${item.active ? 'text-white bg-gray-800' : 'hover:bg-gray-800 hover:text-gray-200'}`}
          title={item.label}
        >
          {item.icon}
        </button>
      ))}
    </div>
  );
};

export default Sidebar;
