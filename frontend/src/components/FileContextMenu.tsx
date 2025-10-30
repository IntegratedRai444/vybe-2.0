import React, { forwardRef, useImperativeHandle, useState } from 'react';

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  action: () => void;
  disabled?: boolean;
  divider?: boolean;
}

interface FileContextMenuProps {
  onRename: (path: string) => void;
  onDelete: (path: string) => void;
  onNewFile: (parentPath: string) => void;
  onNewFolder: (parentPath: string) => void;
  onRefresh: () => void;
}

export interface FileContextMenuRef {
  show: (x: number, y: number, path: string, isFolder: boolean) => void;
  hide: () => void;
}

export const FileContextMenu = forwardRef<FileContextMenuRef, FileContextMenuProps>((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [currentPath, setCurrentPath] = useState('');
  const [isFolder, setIsFolder] = useState(false);

  useImperativeHandle(ref, () => ({
    show: (x, y, path, isFolder) => {
      setPosition({ x, y });
      setCurrentPath(path);
      setIsFolder(isFolder);
      setVisible(true);
    },
    hide: () => {
      setVisible(false);
    },
  }));

  const handleAction = (action: () => void) => {
    action();
    setVisible(false);
  };

  const menuItems: MenuItem[] = [
    {
      label: 'New File',
      icon: (
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      action: () => props.onNewFile(currentPath),
      disabled: !isFolder,
    },
    {
      label: 'New Folder',
      icon: (
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      action: () => props.onNewFolder(currentPath),
      disabled: !isFolder,
    },
    { label: '', action: () => {}, divider: true },
    {
      label: 'Rename',
      icon: (
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      action: () => props.onRename(currentPath),
    },
    {
      label: 'Delete',
      icon: (
        <svg className="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      action: () => props.onDelete(currentPath),
    },
    { label: '', action: () => {}, divider: true },
    {
      label: 'Refresh',
      icon: (
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      action: () => props.onRefresh(),
    },
  ];

  if (!visible) return null;

  return (
    <div
      className="fixed z-50 py-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg min-w-[200px]"
      style={{
        top: position.y,
        left: position.x,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {menuItems.map((item, index) =>
        item.divider ? (
          <div key={`divider-${index}`} className="border-t border-gray-700 my-1" />
        ) : (
          <button
            key={item.label}
            className={`w-full flex items-center px-4 py-2 text-sm text-left hover:bg-gray-700 ${
              item.disabled ? 'text-gray-500 cursor-not-allowed' : 'text-gray-200'
            }`}
            onClick={() => !item.disabled && handleAction(item.action)}
            disabled={item.disabled}
          >
            {item.icon}
            {item.label}
          </button>
        ),
      )}
    </div>
  );
});

FileContextMenu.displayName = 'FileContextMenu';
