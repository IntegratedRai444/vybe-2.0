import React from 'react';

type ActivityBarProps = {
  activePanel: string;
  onPanelSelect: (panel: string) => void;
};

const activityItems = [
  { id: 'explorer', icon: '📁', title: 'Explorer', shortcut: 'Ctrl+Shift+E' },
  { id: 'search', icon: '🔍', title: 'Search', shortcut: 'Ctrl+Shift+F' },
  { id: 'git', icon: '', title: 'Source Control', shortcut: 'Ctrl+Shift+G' },
  { id: 'debug', icon: '', title: 'Run and Debug', shortcut: 'Ctrl+Shift+D' },
  { id: 'extensions', icon: '', title: 'Extensions', shortcut: 'Ctrl+Shift+X' },
  { id: 'ai-assistant', icon: '', title: 'AI Assistant', shortcut: 'Ctrl+Shift+A' }
];

export const ActivityBar: React.FC<ActivityBarProps> = ({ activePanel, onPanelSelect }) => {
  return (
    <div className="w-12 h-full bg-[#333333] flex flex-col items-center py-2">
      <div className="flex-1 flex flex-col items-center space-y-4">
        {activityItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onPanelSelect(item.id)}
            className={`w-12 h-12 flex items-center justify-center text-xl transition-colors ${
              activePanel === item.id 
                ? 'text-white bg-[#0e639c]' 
                : 'text-[#858585] hover:bg-[#2a2d2e] hover:text-white'
            }`}
            title={`${item.title} (${item.shortcut})`}
          >
            {item.icon}
          </button>
        ))}
      </div>
      
      <div className="mt-auto">
        <button 
          className="w-12 h-12 flex items-center justify-center text-xl text-[#858585] hover:bg-[#2a2d2e] hover:text-white"
          title="Settings"
        >
          ⚙️
        </button>
      </div>
    </div>
  );
};

export default ActivityBar;
