import React, { FC } from 'react';

type MenuItem = {
  label: string;
  items: {
    label: string;
    shortcut?: string;
    onClick: () => void;
  }[];
};

const NavigationBar: FC = () => {
  // Placeholder functions for menu actions
  const menuItems: MenuItem[] = [
    {
      label: 'File',
      items: [
        { label: 'New File', shortcut: 'Ctrl+N', onClick: () => console.log('New File') },
        { label: 'Open File...', shortcut: 'Ctrl+O', onClick: () => console.log('Open File') },
        { label: 'Open Folder...', onClick: () => console.log('Open Folder') },
        { label: 'Save', shortcut: 'Ctrl+S', onClick: () => console.log('Save') },
        { label: 'Save As...', shortcut: 'Ctrl+Shift+S', onClick: () => console.log('Save As') },
        { label: 'Exit', onClick: () => window.close() },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', onClick: () => console.log('Undo') },
        { label: 'Redo', shortcut: 'Ctrl+Y', onClick: () => console.log('Redo') },
        { label: 'Cut', shortcut: 'Ctrl+X', onClick: () => console.log('Cut') },
        { label: 'Copy', shortcut: 'Ctrl+C', onClick: () => console.log('Copy') },
        { label: 'Paste', shortcut: 'Ctrl+V', onClick: () => console.log('Paste') },
      ],
    },
    {
      label: 'Selection',
      items: [
        { label: 'Select All', shortcut: 'Ctrl+A', onClick: () => console.log('Select All') },
        { label: 'Expand Selection', shortcut: 'Ctrl+Shift+Right', onClick: () => console.log('Expand Selection') },
        { label: 'Shrink Selection', shortcut: 'Ctrl+Shift+Left', onClick: () => console.log('Shrink Selection') },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Command Palette...', shortcut: 'Ctrl+Shift+P', onClick: () => console.log('Command Palette') },
        { label: 'Toggle Sidebar', shortcut: 'Ctrl+B', onClick: () => console.log('Toggle Sidebar') },
        { label: 'Toggle Panel', shortcut: 'Ctrl+J', onClick: () => console.log('Toggle Panel') },
      ],
    },
    {
      label: 'Go',
      items: [
        { label: 'Back', shortcut: 'Alt+Left', onClick: () => console.log('Back') },
        { label: 'Forward', shortcut: 'Alt+Right', onClick: () => console.log('Forward') },
        { label: 'Go to File...', shortcut: 'Ctrl+P', onClick: () => console.log('Go to File') },
      ],
    },
    {
      label: 'Run',
      items: [
        { label: 'Start Debugging', shortcut: 'F5', onClick: () => console.log('Start Debugging') },
        { label: 'Run Without Debugging', shortcut: 'Ctrl+F5', onClick: () => console.log('Run Without Debugging') },
      ],
    },
    {
      label: 'Terminal',
      items: [
        { label: 'New Terminal', shortcut: 'Ctrl+`', onClick: () => console.log('New Terminal') },
        { label: 'Split Terminal', shortcut: 'Ctrl+Shift+`', onClick: () => console.log('Split Terminal') },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'Documentation', onClick: () => window.open('https://code.visualstudio.com/docs', '_blank') },
        { label: 'About', onClick: () => console.log('About') },
      ],
    },
  ];

  return (
    <div className="flex items-center h-8 bg-[#3c3c3c] text-[#cccccc] text-sm select-none border-b border-[#252526]">
      {menuItems.map((menuItem, index) => (
        <div key={index} className="relative group px-3 h-full flex items-center hover:bg-[#2a2d2e] cursor-default">
          {menuItem.label}
          
          {/* Dropdown menu */}
          <div className="hidden group-hover:block absolute top-full left-0 bg-[#252526] min-w-48 shadow-lg z-50 border border-[#454545] py-1">
            {menuItem.items.map((item, itemIndex) => (
              <div 
                key={itemIndex}
                className="px-4 py-1 hover:bg-[#094771] flex justify-between items-center"
                onClick={item.onClick}
              >
                <span>{item.label}</span>
                {item.shortcut && (
                  <span className="text-[#7a7a7a] text-xs ml-4">{item.shortcut}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default NavigationBar;
