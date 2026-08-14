import React from "react";

type FileTab = {
  path: string;
  name: string;
  isDirty: boolean;
};

type Props = {
  tabs: FileTab[];
  activeTab: string;
  onTabClick: (path: string) => void;
  onTabClose: (path: string) => void;
};

export const FileTabs: React.FC<Props> = ({
  tabs,
  activeTab,
  onTabClick,
  onTabClose,
}) => {
  if (tabs.length === 0) return null;

  return (
    <div className="flex bg-gray-800 border-b border-gray-700 overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.path}
          className={`flex items-center px-3 py-2 border-r border-gray-700 cursor-pointer min-w-0 ${
            activeTab === tab.path
              ? "bg-gray-700 text-white"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
          onClick={() => onTabClick(tab.path)}
        >
          <span className="truncate text-sm mr-2">
            {tab.name}
            {tab.isDirty && <span className="text-orange-400 ml-1">●</span>}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTabClose(tab.path);
            }}
            className="text-gray-400 hover:text-white text-xs ml-1"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

// Exports
export { FileTabs };
