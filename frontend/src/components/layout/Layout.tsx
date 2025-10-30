import React, { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { theme } from '../../theme';
import { ActivityBar } from './ActivityBar';
import { ExplorerPanel } from './panels/ExplorerPanel';
import { MainContent } from './MainContent';
import { ChatPanel } from './panels/ChatPanel';
import { StatusBar } from './StatusBar';

export const Layout: React.FC = () => {
  const [activePanel, setActivePanel] = useState('explorer');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);

  return (
    <div className="flex flex-col h-screen bg-[#1E1E1E] text-[#D4D4D4] overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar 
          activePanel={activePanel}
          onPanelSelect={setActivePanel}
        />

        {/* Main Content with Resizable Panels */}
        <PanelGroup direction="horizontal" className="flex-1 flex">
          {/* Left Sidebar (Explorer) */}
          {isExplorerOpen && (
            <>
              <Panel defaultSize={20} minSize={15} maxSize={30}>
                <ExplorerPanel />
              </Panel>
              <PanelResizeHandle className="w-1 bg-[#252526] hover:bg-[#007ACC] transition-colors" />
            </>
          )}

          {/* Main Editor Area */}
          <Panel>
            <MainContent />
          </Panel>

          {/* Right Sidebar (Chat) */}
          {isChatOpen && (
            <>
              <PanelResizeHandle className="w-1 bg-[#252526] hover:bg-[#007ACC] transition-colors" />
              <Panel defaultSize={25} minSize={20} maxSize={40}>
                <ChatPanel onClose={() => setIsChatOpen(false)} />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      {/* Status Bar */}
      <StatusBar 
        isChatOpen={isChatOpen}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
      />
    </div>
  );
};
