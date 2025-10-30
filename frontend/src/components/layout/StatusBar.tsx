import React from 'react';

type StatusBarProps = {
  cursorPosition?: { lineNumber: number; column: number } | null;
  language?: string;
  onTogglePanel?: () => void;
  onToggleSidebar?: () => void;
  gitBranch?: string;
  encoding?: string;
  lineEnding?: string;
  problems?: number;
  notifications?: number;
};

export const StatusBar: React.FC<StatusBarProps> = ({
  cursorPosition,
  language = 'plaintext',
  onTogglePanel,
  onToggleSidebar,
  gitBranch = 'main',
  encoding = 'UTF-8',
  lineEnding = 'LF',
  problems = 0,
  notifications = 0
}) => {

  return (
    <div className="h-6 bg-[#007acc] text-white text-xs flex items-center justify-between px-3">
      {/* Left side */}
      <div className="flex items-center space-x-4">
        {/* Problems */}
        <button 
          className="flex items-center hover:bg-[#1a8bd9] px-1 h-full"
          onClick={() => onTogglePanel?.()}
        >
          <span className="mr-1">☉</span>
          {problems > 0 && <span>{problems}</span>}
        </button>
        
        {/* Git Branch */}
        <div className="flex items-center hover:bg-[#1a8bd9] px-1 h-full cursor-pointer">
          <span className="mr-1"></span>
          <span>{gitBranch}</span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center h-full">
        {/* Cursor Position */}
        {cursorPosition && (
          <div className="px-2 h-full flex items-center hover:bg-[#1a8bd9]">
            Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}
          </div>
        )}
        
        {/* Encoding */}
        <div className="px-2 h-full flex items-center hover:bg-[#1a8bd9] cursor-pointer">
          {encoding}
        </div>
        
        {/* Line Ending */}
        <div className="px-2 h-full flex items-center hover:bg-[#1a8bd9] cursor-pointer">
          {lineEnding}
        </div>
        
        {/* Language */}
        <div className="px-2 h-full flex items-center hover:bg-[#1a8bd9] cursor-pointer">
          {language.toUpperCase()}
        </div>
        
        {/* Notifications */}
        {notifications > 0 && (
          <button 
            className="px-2 h-full flex items-center hover:bg-[#1a8bd9]"
            onClick={() => onToggleSidebar?.()}
          >
            <span className="mr-1">🔔</span>
            <span>{notifications}</span>
          </button>
        )}
      </div>
    </div>
  );
};