import React from 'react';

const Editor: React.FC = () => {
  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-gray-700">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="text-gray-400">
          {/* Placeholder for the editor content */}
          <p>// Start coding here...</p>
        </div>
      </div>
    </div>
  );
};

export default Editor;
