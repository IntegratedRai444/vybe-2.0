import React, { ReactNode } from 'react';
import { FiMenu, FiSearch, FiSettings, FiBell, FiUser } from 'react-icons/fi';

interface TopBarProps {
  rightContent?: ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({ rightContent }) => {
  return (
    <header className="bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-4">
          <button className="text-gray-500 hover:text-gray-700 focus:outline-none">
            <FiMenu className="h-6 w-6" />
          </button>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search files..."
            />
          </div>
        </div>
        {rightContent || (
          <div className="flex items-center space-x-4">
            <button className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none">
              <FiBell className="h-6 w-6" />
            </button>
            <button className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none">
              <FiSettings className="h-6 w-6" />
            </button>
            <div className="ml-3 relative">
              <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                <FiUser className="h-5 w-5" />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
