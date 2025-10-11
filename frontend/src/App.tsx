import React, { useState, useEffect, useCallback } from "react";
import { FileTree } from "./components/FileTree";
import { CodeEditor, CodeEditorHandle } from "./components/CodeEditor";
import { ChatPane } from "./components/ChatPane";
import { GitPanel } from "./components/GitPanel";
import { TerminalTabs } from "./components/TerminalTabs";
import { FileOperations } from "./components/FileOperations";
import { SearchReplace } from "./components/SearchReplace";
import { ProblemsPanel } from "./components/ProblemsPanel";
import { DebugButton } from "./components/DebugButton";
import SecurityButton from "./components/SecurityButton";
import { AnalysisButton } from "./components/AnalysisButton";
import { ThemeToggle } from "./components/ThemeToggle";
import { LayoutManager, useLayout } from "./components/LayoutManager";
import { CollaborationPanel } from "./components/CollaborationPanel";
import * as api from "./utils/api";

type FileTab = {
  id: string;
  path: string;
  name: string;
  isDirty: boolean;
  content: string | null;
};

const App: React.FC = () => {
  const [projectRoot, setProjectRoot] = useState("");
  const [openTabs, setOpenTabs] = useState<FileTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [showGradio, setShowGradio] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [searchReplace, setSearchReplace] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allFiles, setAllFiles] = useState<Array<{ name: string; path: string }>>([]);
  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "checking">("checking");
  const [problems, setProblems] = useState<any[]>([]);
  const [showLayoutManager, setShowLayoutManager] = useState(false);
  // Removed unused state
  const { layout, updateLayout } = useLayout();
  const editorRef = React.useRef<CodeEditorHandle>(null);

  const activeTab = openTabs.find((tab) => tab.id === activeTabId);

  const handleSave = useCallback(async () => {
    if (!activeTab || !activeTab.isDirty) return;

    try {
      await api.saveFile(activeTab.path, activeTab.content || "");
      setOpenTabs((tabs) => tabs.map((t) => (t.id === activeTab.id ? { ...t, isDirty: false } : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save file");
    }
  }, [activeTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;

      if (cmd && e.key === "s") { e.preventDefault(); handleSave(); }
      if (cmd && e.key === "p") { e.preventDefault(); setQuickOpen(true); }
      if (cmd && e.key === "n") { e.preventDefault(); createFile(); }
      if (cmd && e.key === "f") { e.preventDefault(); setSearchReplace(true); }
      if (cmd && e.key === "w" && activeTabId) { e.preventDefault(); closeTab(activeTabId); }
      if (cmd && e.shiftKey && e.key === "G") { e.preventDefault(); setShowGradio((prev) => !prev); }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTabId, handleSave]);

  const checkConnection = async () => {
    try {
      await api.checkBackendConnection();
      setConnectionStatus("connected");
      setError("");
    } catch (err) {
      setConnectionStatus("disconnected");
      setError("Backend not running. Please start with: python run.py");
    }
  };

  useEffect(() => { checkConnection(); }, []);

  useEffect(() => {
    if (activeTab && activeTab.content === null) {
      api.getFileContent(activeTab.path)
        .then((data) => {
          setOpenTabs((tabs) => tabs.map((t) => (t.id === activeTab.id ? { ...t, content: data.content } : t)));
        })
        .catch(() => { setError(`Failed to load file: ${activeTab.path}`); });
    }
  }, [activeTab]);

  const loadProject = async () => {
    const path = prompt("Enter project path:");
    if (!path) return;
    setError("");
    try {
      await api.indexProject(path);
      setProjectRoot(path);
      await loadFiles(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    }
  };

  const loadFiles = async (root: string) => {
    try {
      const data = await api.listFiles(root);
      const files = flattenFiles(data.children || []);
      setAllFiles(files);
    } catch (err) {
      console.error("Failed to load files:", err);
    }
  };

  const flattenFiles = (items: (api.File | api.Folder)[]): Array<{ name: string; path: string }> => {
    const result: Array<{ name: string; path: string }> = [];
    const traverse = (nodes: (api.File | api.Folder)[]) => {
      nodes.forEach((item) => {
        if (item.type === "file") {
          result.push({ name: item.name, path: item.path });
        } else if (item.children) {
          traverse(item.children);
        }
      });
    };
    traverse(items);
    return result;
  };

  const openFile = (filePath: string) => {
    const existing = openTabs.find((tab) => tab.path === filePath);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
    const fileName = filePath.split(/[\\/]/).pop() || "";
    const newTab: FileTab = { id: Date.now().toString(), path: filePath, name: fileName, isDirty: false, content: null };
    setOpenTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const closeTab = (tabId: string) => {
    setOpenTabs((prev) => prev.filter((t) => t.id !== tabId));
    if (activeTabId === tabId) {
      const remaining = openTabs.filter((t) => t.id !== tabId);
      setActiveTabId(remaining[0]?.id || null);
    }
  };

  const createFile = async () => {
    const fileName = prompt("Enter file name:");
    if (!fileName || !projectRoot) return;
    const filePath = `${projectRoot}/${fileName}`;
    try {
      await api.createFile(filePath);
      await loadFiles(projectRoot);
      openFile(filePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create file");
    }
  };

  const handleContentChange = (newContent: string) => {
    if (!activeTab) return;
    setOpenTabs((tabs) =>
      tabs.map((t) => (t.id === activeTab.id ? { ...t, content: newContent, isDirty: true } : t))
    );
  };

  const handleSearchReplace = {
    onFind: (query: string, options: any) => { editorRef.current?.findNext(query, options); },
    onReplace: (find: string, replace: string, options: any) => { editorRef.current?.replaceOne(find, replace, options); },
    onReplaceAll: (find: string, replace: string, options: any) => { editorRef.current?.replaceAll(find, replace, options); },
  };

  const handleFormat = async () => {
    if (!activeTab || !activeTab.content) return;
    
    try {
      // Determine language from file extension
      const ext = activeTab.path.split('.').pop()?.toLowerCase();
      let language = 'plaintext';
      
      if (ext === 'py') language = 'python';
      else if (ext === 'js') language = 'javascript';
      else if (ext === 'ts') language = 'typescript';
      else if (ext === 'jsx') language = 'javascript';
      else if (ext === 'tsx') language = 'typescript';
      
      if (language === 'plaintext') {
        console.warn('Formatting not supported for this file type');
        return;
      }
      
      const result = await api.formatCode(language, activeTab.content);
      
      if (result.formatted) {
        setOpenTabs(tabs => 
          tabs.map(tab => 
            tab.id === activeTab.id 
              ? { ...tab, content: result.formatted, isDirty: true }
              : tab
          )
        );
      }
    } catch (err) {
      console.error('Format error:', err);
    }
  };

  const lintFile = async (filePath: string) => {
    if (!projectRoot) return;
    try {
      const data = await api.lintFile(filePath, projectRoot);
      const diags = (data.diagnostics || []).map((d: any) => ({
        file: filePath,
        line: typeof d.line === "number" ? d.line : 0,
        column: typeof d.column === "number" ? d.column : 0,
        message: d.message,
        severity: d.severity || "info",
        source: d.analyzer || d.rule || undefined,
      }));
      setProblems(diags);
    } catch (err) {
      console.error("Lint error:", err);
    }
  };

  const lintProject = async () => {
    if (!projectRoot) return;
    try {
      const data = await api.lintProject(projectRoot);
      const allDiags: any[] = [];
      
      // Flatten all file diagnostics into a single array
      Object.entries(data.file_diagnostics || {}).forEach(([filePath, diagnostics]: [string, any]) => {
        diagnostics.forEach((d: any) => {
          allDiags.push({
            file: filePath,
            line: typeof d.line === "number" ? d.line : 0,
            column: typeof d.column === "number" ? d.column : 0,
            message: d.message,
            severity: d.severity || "info",
            source: d.analyzer || d.rule || undefined,
          });
        });
      });
      
      setProblems(allDiags);
      console.log(`Project lint complete: ${data.summary?.total_issues || 0} issues found`);
    } catch (err) {
      console.error("Project lint error:", err);
    }
  };

  useEffect(() => {
    if (activeTab?.path) { lintFile(activeTab.path); }
  }, [activeTab?.path]);

  // Periodic background lint refresh every 30 seconds
  useEffect(() => {
    if (!projectRoot) return;
    
    const interval = setInterval(() => {
      lintProject();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [projectRoot]);

  const filteredFiles = allFiles.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!projectRoot) {
    return (
      <div className="h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">🖥️ Cursor Clone IDE</h1>
          <p className="text-gray-400 mb-8">AI-Powered Development Environment</p>
          <button onClick={loadProject} className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-medium">Open Project</button>
          {error && <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">{error}</div>}
          <div className="mt-6 text-sm text-gray-500"><p>Cmd+P: Quick Open • Cmd+N: New File • Cmd+F: Find • Cmd+Shift+G: Gradio</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center px-4 text-sm">
        <span className="font-medium">{projectRoot.split(/[\\/]/).pop()}</span>
        <div className="ml-auto flex items-center space-x-2">
          <div className={`px-2 py-0.5 rounded text-xs ${connectionStatus === "connected" ? "bg-green-600" : connectionStatus === "disconnected" ? "bg-red-600" : "bg-yellow-600"}`}>
            {connectionStatus === "connected" ? "🟢" : connectionStatus === "disconnected" ? "🔴" : "🟡"} Backend
          </div>
          <button onClick={() => setShowGradio((prev) => !prev)} className={`px-2 py-0.5 rounded text-xs ${showGradio ? "bg-green-600" : "bg-gray-600"}`}>🎨 Gradio</button>
          <button onClick={() => setSearchReplace(true)} className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs">🔍 Find</button>
          <button onClick={() => setQuickOpen(true)} className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs">📂 Open</button>
          <button onClick={handleFormat} className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs">✨ Format</button>
          <DebugButton {...{ projectRoot, onDebugComplete: (results: any) => { if (results.summary?.top_issues) { setProblems(results.summary.top_issues.map((issue: any) => ({ line: issue.line - 1, column: 0, message: issue.message, severity: issue.severity }))); } } } as any} />
          <SecurityButton {...{} as any} />
          <AnalysisButton {...{ projectRoot, currentFile: activeTab?.path } as any} />
          <button onClick={() => setShowLayoutManager(true)} className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs">⚙️ Layout</button>
          <button onClick={() => console.log('Collaboration feature')} className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs">👥 Collab</button>
          <ThemeToggle />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {layout.showSidebar && (
          <div className="bg-gray-900 border-r border-gray-700" style={{ width: `${layout.sizes.sidebar}px` }}>
            <div className="p-2 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-xs font-medium text-gray-400 uppercase">Explorer</h3>
              <FileOperations projectRoot={projectRoot} onRefresh={() => loadFiles(projectRoot)} onFileCreated={openFile} />
            </div>
            <FileTree root={projectRoot} onSelect={(file) => openFile(file.path)} />
          </div>
        )}

        <div className="flex-1 flex flex-col">
          {openTabs.length > 0 && (
            <div className="h-9 bg-gray-800 border-b border-gray-700 flex overflow-x-auto">
              {openTabs.map((tab) => (
                <div key={tab.id} className={`flex items-center px-3 py-1 border-r border-gray-700 cursor-pointer ${activeTabId === tab.id ? "bg-gray-700" : "hover:bg-gray-750"}`} onClick={() => setActiveTabId(tab.id)}>
                  <span className="text-sm truncate">{tab.name}</span>
                  {tab.isDirty && <span className="text-orange-400 ml-1">●</span>}
                  <button onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }} className="ml-2 text-gray-400 hover:text-white text-xs">✕</button>
                </div>
              ))}
            </div>
          )}

          <div className="flex-1 flex">
            <div className={`${showGradio ? "w-1/2" : "w-full"} bg-gray-800`}>
              {activeTab ? (
                <CodeEditor ref={editorRef} filePath={activeTab.path} content={activeTab.content ?? ""} onContentChange={handleContentChange} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <p className="text-lg mb-2">No file open</p>
                    <p className="text-sm">Press Cmd+P to open a file</p>
                  </div>
                </div>
              )}
            </div>
            {showGradio && <div className="w-1/2 border-l border-gray-700"><iframe src="http://localhost:7860" className="w-full h-full" title="Gradio UI" /></div>}
          </div>
        </div>

        {layout.showRightPanel && (
          <div className="bg-gray-900 border-l border-gray-700 flex flex-col" style={{ width: `${layout.sizes.rightPanel}px` }}>
            {layout.showChat && (
              <div className="border-b border-gray-700 flex flex-col" style={{ height: `${layout.sizes.chatHeight}px` }}>
                <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center px-2"><span className="text-xs font-medium">💬 Chat</span></div>
                <div className="flex-1 overflow-hidden"><ChatPane currentFile={activeTab?.path || ""} /></div>
              </div>
            )}
            {layout.showProblems && (
              <div className="border-b border-gray-700 flex flex-col" style={{ height: `${layout.sizes.problemsHeight}px` }}>
                <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center px-2"><span className="text-xs font-medium">⚠️ Problems</span></div>
                <div className="flex-1 overflow-hidden"><ProblemsPanel problems={problems} onProblemClick={(file) => { openFile(file); }} /></div>
              </div>
            )}
            {layout.showGit && (
              <div className="border-b border-gray-700 flex flex-col" style={{ height: `${layout.sizes.gitHeight}px` }}>
                <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center px-2"><span className="text-xs font-medium">🗂️ Git</span></div>
                <div className="flex-1 overflow-hidden"><GitPanel root={projectRoot} onSelectFile={(file) => console.log('File selected:', file)} /></div>
              </div>
            )}
            {layout.showTerminal && (
              <div className="flex-1 flex flex-col">
                <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center px-2"><span className="text-xs font-medium">🖥️ Terminal</span></div>
                <div className="flex-1 overflow-hidden"><TerminalTabs projectRoot={projectRoot} /></div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded-lg z-50 max-w-md">
          <div className="flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button onClick={() => setError("")} className="ml-2 text-red-400 hover:text-red-200">✕</button>
          </div>
        </div>
      )}

      <SearchReplace isOpen={searchReplace} onClose={() => setSearchReplace(false)} {...handleSearchReplace} />

      {quickOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50">
          <div className="bg-gray-800 rounded-lg w-96 max-h-96 overflow-hidden">
            <div className="p-3 border-b border-gray-700">
              <input type="text" placeholder="Search files..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") { setQuickOpen(false); setSearchQuery(""); } if (e.key === "Enter" && filteredFiles[0]) { openFile(filteredFiles[0].path); setQuickOpen(false); setSearchQuery(""); } }} className="w-full bg-gray-700 text-white px-3 py-2 rounded outline-none" autoFocus />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filteredFiles.slice(0, 10).map((file) => (
                <div key={file.path} className="px-3 py-2 cursor-pointer hover:bg-gray-700" onClick={() => { openFile(file.path); setQuickOpen(false); setSearchQuery(""); }}>
                  <div className="text-sm">{file.name}</div>
                  <div className="text-xs text-gray-400 truncate">{file.path}</div>
                </div>
              ))}
              {filteredFiles.length === 0 && searchQuery && <div className="p-3 text-gray-500 text-center">No files found</div>}
            </div>
          </div>
        </div>
      )}

      <LayoutManager isOpen={showLayoutManager} onClose={() => setShowLayoutManager(false)} currentLayout={layout} onLayoutChange={updateLayout} />
      <CollaborationPanel 
        projectRoot={projectRoot}
        currentOpenFile={activeTab?.path || null} 
        onCollaborationStart={(sessionId: string, userId: string) => { console.log(`Starting collaboration session ${sessionId} as ${userId}`); }} 
        onCollaborationStop={() => { console.log('Stopping collaboration'); }} 
      />
    </div>
  );
};

export default App;
