// =================================
// 1. React & Core Dependencies
// =================================
import React, { 
  useState, 
  useEffect, 
  createContext, 
  useContext, 
  useRef, 
  ReactNode 
} from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';

// =================================
// 2. Context Providers
// =================================
import { AIProvider } from './contexts/AIContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { DebuggerProvider } from './contexts/DebuggerContext';
import { GitProvider } from './contexts/GitContext';
import { MCPProvider } from './contexts/MCPContext';

// =================================
// 3. Types and Interfaces
// =================================
type PanelType = 'explorer' | 'search' | 'git' | 'debug' | 'extensions' | 'ai';

interface FileTab {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  isDirty: boolean;
  language: string;
  path: string;
}

interface LayoutState {
  isPanelVisible: boolean;
  isSidebarVisible: boolean;
  activePanel: PanelType;
}

interface StoreState {
  activeFile: string | null;
  files: Record<string, FileTab>;
  layout: LayoutState;
  isCommandPaletteOpen: boolean;
  setActiveFile: (id: string) => void;
  getActiveFile: () => FileTab | undefined;
  togglePanel: (panel?: PanelType) => void;
  setCommandPaletteOpen: (isOpen: boolean) => void;
}

// =================================
// 4. Layout & UI Components
// =================================
// Layout Components
const LayoutManager: React.FC<{ children: ReactNode }> = ({ children }) => <>{children}</>;
const MainLayout: React.FC<{ children: ReactNode }> = ({ children }) => <div className="main-layout">{children}</div>;
const NavigationBar: React.FC = () => <div className="navigation-bar">Navigation</div>;
const EditorTabs: React.FC = () => <div className="editor-tabs">Tabs</div>;
const StatusBar: React.FC = () => <div className="status-bar">Status</div>;

// Stub components for missing imports
const AIChatPanel: React.FC = () => <div>AI Chat Panel</div>;
const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen }) => 
  isOpen ? <div className="settings-modal">Settings</div> : null;

const PanelContainer = React.forwardRef<HTMLDivElement, { 
  children: ReactNode; 
  isVisible: boolean; 
  position: 'left' | 'right' | 'top' | 'bottom';
}>(({ children, isVisible, position }, ref) => (
  <div ref={ref} className={`panel-container ${position} ${isVisible ? 'visible' : 'hidden'}`}>
    {children}
  </div>
));

const PanelSwitcher: React.FC<{ 
  activePanel: PanelType; 
  onPanelChange: (panel: PanelType) => void 
}> = ({ activePanel, onPanelChange }) => (
  <div className="panel-switcher">
    <button 
      onClick={() => onPanelChange('ai')} 
      className={activePanel === 'ai' ? 'active' : ''}
    >
// AI Components
import { AICodeEditor, ModelSelector } from './components/ai';
import AIDashboard from './components/ai/AIDashboard';

// Common Components
import { 
  AnalysisButton,
  CollaborationPanel,
  ConnectionStatus,
  DeployPanel,
  MCPPanel,
  OutlineView,
  ProblemsPanel,
  SecurityButton,
  ShortcutsPanel,
  SnippetLibrary,
  FileExplorer,
  FileIcon,
  FileTabs,
  FolderPicker
} from './components/common';

// =================================
// 5. Lazy Loaded Components
// =================================
const LazyOutlineView = lazy(() => import('./components/common/OutlineView'));
const LazySnippetLibrary = lazy(() => import('./components/common/SnippetLibrary'));
const LazyProblemsPanel = lazy(() => import('./components/common/ProblemsPanel'));
const LazyShortcutsPanel = lazy(() => import('./components/common/ShortcutsPanel'));
const LazyDeployPanel = lazy(() => import('./components/common/DeployPanel'));
const LazyCollaborationPanel = lazy(() => import('./components/common/CollaborationPanel'));

// =================================
// 6. Store Implementation
// =================================
const StoreContext = createContext<StoreState | null>(null);

const useStore = (): StoreState => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, FileTab>>({});
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [layout, setLayout] = useState<LayoutState>({
    isPanelVisible: true,
    isSidebarVisible: true,
    activePanel: 'explorer',
  });

  const togglePanel = (panel?: PanelType) => {
    setLayout(prev => ({
      ...prev,
      isPanelVisible: panel ? true : !prev.isPanelVisible,
      activePanel: panel || prev.activePanel,
    }));
  };

  const getActiveFile = () => {
    return activeFile ? files[activeFile] : undefined;
  };

  const value: StoreState = {
    activeFile,
    files,
    layout,
    isCommandPaletteOpen,
    setActiveFile: (id: string) => setActiveFile(id),
    getActiveFile,
    togglePanel,
    setCommandPaletteOpen,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
};

// =================================
// 8. Main App Component
// =================================
const AppContent: React.FC = () => {
  const store = useStore();
  const location = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close command palette on route change
  useEffect(() => {
    store.setCommandPaletteOpen(false);
  }, [location, store]);

  return (
    <div className="app-container">
      <NavigationBar />
      <MainLayout>
        <div className="editor-container">
          <EditorTabs />
          <div className="editor-content">
            <div className="editor-placeholder">
              {store.activeFile ? (
                <div>Editing: {store.files[store.activeFile]?.name}</div>
              ) : (
                <div>Open a file to start editing</div>
              )}
            </div>
          </div>
          <StatusBar />
        </div>

        {/* Side Panels */}
        <PanelContainer
          ref={panelRef}
          isVisible={store.layout.isPanelVisible}
          position="right"
        >
          <PanelSwitcher
            activePanel={store.layout.activePanel}
            onPanelChange={(panel) => store.togglePanel(panel as PanelType)}
          />
          <div className="panel-content">
            {store.layout.activePanel === 'ai' && <AIChatPanel />}
          </div>
        </PanelContainer>
      </MainLayout>

      {/* Modals */}
      <SettingsModal 
        isOpen={store.isCommandPaletteOpen} 
        onClose={() => store.setCommandPaletteOpen(false)} 
      />
      <Toaster position="bottom-right" />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <ThemeProvider>
        <AIProvider>
          <WebSocketProvider>
            <ProjectProvider>
              <DebuggerProvider>
                <GitProvider>
                  <MCPProvider>
                    <StoreProvider>
                      <LayoutManager>
                        <AppContent />
                      </LayoutManager>
                    </StoreProvider>
                  </MCPProvider>
                </GitProvider>
              </DebuggerProvider>
            </ProjectProvider>
          </WebSocketProvider>
        </AIProvider>
      </ThemeProvider>
    </Router>
  );
};

// =================================
// 8. App Component
// =================================
const App: React.FC = () => {
  return (
    <Router>
      <ThemeProvider>
        <AIProvider>
          <WebSocketProvider>
            <ProjectProvider>
              <DebuggerProvider>
                <GitProvider>
                  <MCPProvider>
                    <StoreProvider>
                      <LayoutManager>
                        <AppContent />
                      </LayoutManager>
                    </StoreProvider>
                  </MCPProvider>
                </GitProvider>
              </DebuggerProvider>
            </ProjectProvider>
          </WebSocketProvider>
        </AIProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
};

export default App;
