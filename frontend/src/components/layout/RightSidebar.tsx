import React, { useState } from "react";

const RightSidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState("outline");

  const tabs = [
    { id: "outline", title: "Outline", icon: "📋" },
    { id: "timeline", title: "Timeline", icon: "🕒" },
    { id: "npx", title: "NPX", icon: "📦" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "outline":
        return (
          <div className="p-4">
            <div className="text-sm text-gray-400 mb-2">
              No symbols found in document
            </div>
          </div>
        );
      case "timeline":
        return (
          <div className="p-4">
            <div className="text-sm text-gray-400 mb-2">No recent changes</div>
          </div>
        );
      case "npx":
        return (
          <div className="p-4">
            <div className="text-sm text-gray-400 mb-2">
              No NPX scripts available
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full w-full bg-[#252526] border-l border-[#1e1e1e] flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-[#1e1e1e]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-2 text-xs font-medium ${
              activeTab === tab.id
                ? "text-white border-b-2 border-[#007fd4] bg-[#1e1e1e]"
                : "text-gray-400 hover:text-white hover:bg-[#2a2d2e]"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.title}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">{renderContent()}</div>

      {/* Footer */}
      <div className="border-t border-[#1e1e1e] p-1 text-xs text-gray-500">
        <div className="px-2 py-1 hover:bg-[#2a2d2e] rounded cursor-pointer">
          {activeTab === "outline" && "No symbols found"}
          {activeTab === "timeline" && "No recent changes"}
          {activeTab === "npx" && "No scripts available"}
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;
