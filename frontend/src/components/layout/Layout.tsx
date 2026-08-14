import React, { useState, useRef, Suspense, lazy } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ActivityBar } from './ActivityBar';
import { ExplorerPanel } from './panels/ExplorerPanel';
import { StatusBar } from './StatusBar';
import { useAI } from '../ai/AIProvider';
import { Button } from '../ui/Button';
import { FiMessageSquare, FiX, FiGrid, FiGitBranch, FiSettings, FiZap, FiTerminal } from 'react-icons/fi';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { LoadingSpinner } from '../LoadingSpinner';

// Lazy load heavy components with proper default exports
const ChatPanel = lazy(() => import('./panels/ChatPanel').then(module => ({ default: module.ChatPanel })));
const CollaborationPanel = lazy(() => import('../common/CollaborationPanel').then(module => ({ default: module.CollaborationPanel })));
const ShortcutsPanel = lazy(() => import('../common/ShortcutsPanel').then(module => ({ default: module.ShortcutsPanel })));
const SnippetLibrary = lazy(() => import('../common/SnippetLibrary').then(module => ({ default: module.SnippetLibrary })));
const AIDashboard = lazy(() => import('../ai/AIDashboard').then(module => ({ default: module.AIDashboard })));
const AILayout = lazy(() => import('../ai/AILayout').then(module => ({ default: module.AILayout })));
const CompletionBubble = lazy(() => import('../ai/CompletionBubble').then(module => ({ default: module.CompletionBubble })));
const AICodeEditor = lazy(() => import('../ai/AICodeEditor').then(module => ({ default: module.AICodeEditor })));
const ModelSelector = lazy(() => import('../ai/ModelSelector').then(module => ({ default: module.ModelSelector })));

interface LayoutProps {
  children?: React.ReactNode;
}

type PanelType = 'explorer' | 'search' | 'git' | 'debug' | 'extensions' | 'ai' | 'collaboration' | 'snippets' | 'shortcuts' | 'terminal';

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [activePanel, setActivePanel] = useState<PanelType>('explorer');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [rightPanelContent, setRightPanelContent] = useState<PanelType>('terminal');
  const chatPanelRef = useRef<HTMLDivElement>(null);
  const { provider, model, apiKey, setModel } = useAI();
  const isAIConfigured = Boolean(provider && model && (provider === 'ollama' || apiKey));
  
  const handleModelChange = (newModel: string | null) => {
    if (newModel) {
      setModel(newModel);
    } else {
      // Set a default model if null is provided
      setModel('llama3');
    }
  };

  const renderRightPanelContent = () => {
    switch (rightPanelContent) {
      case 'terminal':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <TerminalTabs />
          </Suspense>
        );
      case 'ai':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <div className="h-full flex flex-col">
              <div className="p-2 border-b border-gray-700">
                <ModelSelector 
                  value={model || 'llama3'} 
                  onChange={handleModelChange}
                />
              </div>
              <AIDashboard />
            </div>
          </Suspense>
        );
      case 'collaboration':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <CollaborationPanel />
          </Suspense>
        );
      case 'snippets':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <SnippetLibrary />
          </Suspense>
        );
      case 'shortcuts':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ShortcutsPanel />
          </Suspense>
        );
      default:
        return null;
    }
  };

  return (
    <AILayout>
      <div className="flex flex-col h-screen bg-[#1E1E1E] text-[#D4D4D4] overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar activePanel={activePanel} onPanelSelect={setActivePanel} />

        {/* Main Content with Resizable Panels */}
        <PanelGroup direction="horizontal" className="flex-1 flex">
          {/* Left Sidebar (Explorer) */}
          <Panel defaultSize={20} minSize={15} maxSize={30} className="flex flex-col">
            <ErrorBoundary>
              <ExplorerPanel />
            </ErrorBoundary>
          </Panel>
          <PanelResizeHandle className="w-1 bg-[#252526] hover:bg-[#007ACC] transition-colors" />

          {/* Main Content */}
          <Panel defaultSize={60} minSize={40}>
            <div className="h-full flex flex-col relative">
              <div className="flex-1 overflow-auto">
                <ErrorBoundary>
                  <Suspense fallback={<LoadingSpinner />}>
                    <AILayout>
                      {children}
                      {isAIConfigured && <CompletionBubble />}
                    </AILayout>
                  </Suspense>
                </ErrorBoundary>
              </div>
              
              {/* Panel Control Buttons */}
              <div className="absolute bottom-4 right-4 z-10 flex space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-[#252526] hover:bg-[#2D2D2D] text-gray-300 hover:text-white"
                  onClick={() => {
                    setRightPanelContent('ai');
                    setIsRightPanelOpen(!isRightPanelOpen);
                  }}
                  title="AI Dashboard"
                >
                  <FiZap />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-[#252526] hover:bg-[#2D2D2D] text-gray-300 hover:text-white"
                  onClick={() => {
                    setRightPanelContent('terminal');
                    setIsRightPanelOpen(!isRightPanelOpen);
                  }}
                  title="Terminal"
                >
                  <FiTerminal />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-[#252526] hover:bg-[#2D2D2D] text-gray-300 hover:text-white"
                  onClick={() => {
                    setRightPanelContent('collaboration');
                    setIsRightPanelOpen(!isRightPanelOpen);
                  }}
                  title="Collaboration"
                >
                  <FiGitBranch />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-[#252526] hover:bg-[#2D2D2D] text-gray-300 hover:text-white"
                  onClick={() => {
                    setRightPanelContent('snippets');
                    setIsRightPanelOpen(!isRightPanelOpen);
                  }}
                  title="Snippets"
                >
                  <FiGrid />
                </Button>
              </div>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-12 h-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  title={isChatOpen ? 'Close Chat' : 'Open AI Chat'}
                >
                  {isChatOpen ? <FiX size={20} /> : <FiMessageSquare size={20} />}
                </Button>
              </div>
              
              {/* Right Side Panel */}
              {isRightPanelOpen && (
                <>
                  <PanelResizeHandle className="w-1 bg-[#252526] hover:bg-[#007ACC] transition-colors" />
                  <Panel defaultSize={20} minSize={15} maxSize={30} className="bg-[#252526] flex flex-col">
                    <div className="flex justify-between items-center p-2 border-b border-[#454545]">
                      <h3 className="text-sm font-medium capitalize">{rightPanelContent}</h3>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => setIsRightPanelOpen(false)}
                      >
                        <FiX className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex-1 overflow-auto">
                      <ErrorBoundary>
                        <Suspense fallback={<LoadingSpinner />}>
                          {renderRightPanelContent()}
                        </Suspense>
                      </ErrorBoundary>
                    </div>
                  </Panel>
                </>
              )}
              {/* AI Chat Panel */}
              {isAIConfigured && isChatOpen && (
                <div 
                  ref={chatPanelRef}
                  className="fixed bottom-4 right-4 w-96 max-w-full h-[600px] max-h-[80vh] bg-gray-800 rounded-lg shadow-2xl border border-gray-700 flex flex-col z-50"
                  style={{
                    transition: 'opacity 0.3s ease, transform 0.3s ease',
                    opacity: isChatOpen ? 1 : 0,
                    transform: isChatOpen ? 'translateY(0)' : 'translateY(20px)',
                    pointerEvents: isChatOpen ? 'all' : 'none'
                  }}
                >
                  <ChatPanel onClose={() => setIsChatOpen(false)} />
                </div>
              )}
            </div>
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
      <StatusBar />
    </AILayout>
  );
};

// Exports
export { Layout };
