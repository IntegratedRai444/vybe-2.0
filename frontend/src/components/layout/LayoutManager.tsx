import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FaSave,
  FaDownload,
  FaUpload,
  FaTrash,
  FaPlus,
  FaEye,
} from "react-icons/fa";

// Layout preset types
export type LayoutPreset =
  | "default"
  | "coding"
  | "debugging"
  | "reviewing"
  | "minimal";

export interface PanelSizes {
  sidebar: number;
  rightPanel: number;
  chatHeight: number;
  problemsHeight: number;
  gitHeight: number;
}

export interface LayoutConfig {
  preset: LayoutPreset;
  sizes: PanelSizes;
  showSidebar: boolean;
  showRightPanel: boolean;
  showChat: boolean;
  showProblems: boolean;
  showGit: boolean;
  showTerminal: boolean;
  customArrangements?: CustomArrangement[];
  activeArrangement?: string;
}

export interface CustomArrangement {
  id: string;
  name: string;
  description: string;
  config: LayoutConfig;
  createdAt: string;
  isDefault?: boolean;
}

// Default layout configurations
const LAYOUT_PRESETS: Record<LayoutPreset, LayoutConfig> = {
  default: {
    preset: "default",
    sizes: {
      sidebar: 256,
      rightPanel: 384,
      chatHeight: 256,
      problemsHeight: 192,
      gitHeight: 192,
    },
    showSidebar: true,
    showRightPanel: true,
    showChat: true,
    showProblems: true,
    showGit: true,
    showTerminal: true,
  },
  coding: {
    preset: "coding",
    sizes: {
      sidebar: 200,
      rightPanel: 320,
      chatHeight: 400,
      problemsHeight: 150,
      gitHeight: 0,
    },
    showSidebar: true,
    showRightPanel: true,
    showChat: true,
    showProblems: true,
    showGit: false,
    showTerminal: true,
  },
  debugging: {
    preset: "debugging",
    sizes: {
      sidebar: 200,
      rightPanel: 450,
      chatHeight: 200,
      problemsHeight: 300,
      gitHeight: 0,
    },
    showSidebar: true,
    showRightPanel: true,
    showChat: true,
    showProblems: true,
    showGit: false,
    showTerminal: true,
  },
  reviewing: {
    preset: "reviewing",
    sizes: {
      sidebar: 300,
      rightPanel: 400,
      chatHeight: 200,
      problemsHeight: 150,
      gitHeight: 250,
    },
    showSidebar: true,
    showRightPanel: true,
    showChat: true,
    showProblems: true,
    showGit: true,
    showTerminal: true,
  },
  minimal: {
    preset: "minimal",
    sizes: {
      sidebar: 0,
      rightPanel: 0,
      chatHeight: 0,
      problemsHeight: 0,
      gitHeight: 0,
    },
    showSidebar: false,
    showRightPanel: false,
    showChat: false,
    showProblems: false,
    showGit: false,
    showTerminal: false,
  },
};

const STORAGE_KEY = "vybe-layout-config";

interface LayoutManagerProps {
  isOpen: boolean;
  onClose: () => void;
  currentLayout: LayoutConfig;
  onLayoutChange: (layout: LayoutConfig) => void;
}

export const LayoutManager: React.FC<LayoutManagerProps> = ({
  isOpen,
  onClose,
  currentLayout,
  onLayoutChange,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<LayoutPreset>(
    currentLayout.preset,
  );
  const [customLayout, setCustomLayout] = useState<LayoutConfig>(currentLayout);
  const [customArrangements, setCustomArrangements] = useState<
    CustomArrangement[]
  >(currentLayout.customArrangements || []);
  const [activeTab, setActiveTab] = useState<
    "presets" | "custom" | "arrangements"
  >("presets");
  const [newArrangementName, setNewArrangementName] = useState("");
  const [newArrangementDesc, setNewArrangementDesc] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCustomLayout(currentLayout);
    setSelectedPreset(currentLayout.preset);
  }, [currentLayout]);

  const applyPreset = (preset: LayoutPreset) => {
    const newLayout = { ...LAYOUT_PRESETS[preset] };
    setSelectedPreset(preset);
    setCustomLayout(newLayout);
    onLayoutChange(newLayout);
  };

  const togglePanel = (panel: keyof Omit<LayoutConfig, "preset" | "sizes">) => {
    const newLayout = {
      ...customLayout,
      [panel]: !customLayout[panel],
      preset: "default" as LayoutPreset, // Mark as custom
    };
    setCustomLayout(newLayout);
    onLayoutChange(newLayout);
  };

  const updateSize = (key: keyof PanelSizes, value: number) => {
    const newLayout = {
      ...customLayout,
      sizes: {
        ...customLayout.sizes,
        [key]: value,
      },
      preset: "default" as LayoutPreset,
    };
    setCustomLayout(newLayout);
    onLayoutChange(newLayout);
  };

  const resetToDefault = () => {
    applyPreset("default");
  };

  const saveCustomArrangement = () => {
    if (!newArrangementName.trim()) return;

    const newArrangement: CustomArrangement = {
      id: Date.now().toString(),
      name: newArrangementName,
      description: newArrangementDesc,
      config: { ...customLayout },
      createdAt: new Date().toISOString(),
    };

    const updatedArrangements = [...customArrangements, newArrangement];
    setCustomArrangements(updatedArrangements);

    const updatedLayout = {
      ...customLayout,
      customArrangements: updatedArrangements,
      activeArrangement: newArrangement.id,
    };

    setCustomLayout(updatedLayout);
    onLayoutChange(updatedLayout);
    setShowSaveDialog(false);
    setNewArrangementName("");
    setNewArrangementDesc("");
  };

  const loadCustomArrangement = (arrangement: CustomArrangement) => {
    setCustomLayout(arrangement.config);
    onLayoutChange(arrangement.config);
    setActiveTab("custom");
  };

  const deleteCustomArrangement = (id: string) => {
    const updatedArrangements = customArrangements.filter((a) => a.id !== id);
    setCustomArrangements(updatedArrangements);

    const updatedLayout = {
      ...customLayout,
      customArrangements: updatedArrangements,
      activeArrangement: undefined,
    };

    setCustomLayout(updatedLayout);
    onLayoutChange(updatedLayout);
  };

  const exportLayout = () => {
    const dataStr = JSON.stringify(customLayout, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vybe-layout-${customLayout.preset}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importLayout = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedLayout: LayoutConfig = JSON.parse(
          e.target?.result as string,
        );
        setCustomLayout(importedLayout);
        onLayoutChange(importedLayout);
      } catch (error) {
        console.error("Failed to import layout:", error);
      }
    };
    reader.readAsText(file);
  };

  const previewLayout = () => {
    // Apply layout temporarily for preview
    onLayoutChange(customLayout);
    setTimeout(() => {
      // Could add preview mode logic here
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">⚙️ Layout Manager</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={exportLayout}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
              title="Export Layout"
            >
              <FaDownload className="w-4 h-4" />
            </button>
            <label
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded cursor-pointer"
              title="Import Layout"
            >
              <FaUpload className="w-4 h-4" />
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={importLayout}
                className="hidden"
              />
            </label>
            <button
              onClick={previewLayout}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
              title="Preview Layout"
            >
              <FaEye className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700">
          {[
            { id: "presets", label: "Presets" },
            { id: "custom", label: "Custom" },
            { id: "arrangements", label: "My Layouts" },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === id
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Presets Tab */}
          {activeTab === "presets" && (
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-3">
                Layout Presets
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(LAYOUT_PRESETS) as LayoutPreset[]).map(
                  (preset) => (
                    <button
                      key={preset}
                      onClick={() => applyPreset(preset)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedPreset === preset
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-gray-600 hover:border-gray-500"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium capitalize">{preset}</span>
                        {selectedPreset === preset && (
                          <span className="text-blue-400">✓</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 text-left">
                        {preset === "default" &&
                          "Balanced layout for general use"}
                        {preset === "coding" && "Focus on editor and AI chat"}
                        {preset === "debugging" &&
                          "Emphasize problems and terminal"}
                        {preset === "reviewing" &&
                          "Git and file comparison focus"}
                        {preset === "minimal" && "Distraction-free editor only"}
                      </p>
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Custom Tab */}
          {activeTab === "custom" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-300">
                  Custom Layout
                </h3>
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center space-x-1"
                >
                  <FaSave className="w-3 h-3" />
                  <span>Save Layout</span>
                </button>
              </div>

              {/* Panel Visibility */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">
                  Panel Visibility
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50">
                    <span className="text-sm">📁 Sidebar (File Tree)</span>
                    <input
                      type="checkbox"
                      checked={customLayout.showSidebar}
                      onChange={() => togglePanel("showSidebar")}
                      className="w-4 h-4"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50">
                    <span className="text-sm">📊 Right Panel</span>
                    <input
                      type="checkbox"
                      checked={customLayout.showRightPanel}
                      onChange={() => togglePanel("showRightPanel")}
                      className="w-4 h-4"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50">
                    <span className="text-sm">💬 Chat</span>
                    <input
                      type="checkbox"
                      checked={customLayout.showChat}
                      onChange={() => togglePanel("showChat")}
                      className="w-4 h-4"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50">
                    <span className="text-sm">⚠️ Problems</span>
                    <input
                      type="checkbox"
                      checked={customLayout.showProblems}
                      onChange={() => togglePanel("showProblems")}
                      className="w-4 h-4"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50">
                    <span className="text-sm">🗂️ Git</span>
                    <input
                      type="checkbox"
                      checked={customLayout.showGit}
                      onChange={() => togglePanel("showGit")}
                      className="w-4 h-4"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50">
                    <span className="text-sm">🖥️ Terminal</span>
                    <input
                      type="checkbox"
                      checked={customLayout.showTerminal}
                      onChange={() => togglePanel("showTerminal")}
                      className="w-4 h-4"
                    />
                  </label>
                </div>
              </div>

              {/* Panel Sizes */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">
                  Panel Sizes (px)
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">
                      Sidebar Width: {customLayout.sizes.sidebar}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="400"
                      step="10"
                      value={customLayout.sizes.sidebar}
                      onChange={(e) =>
                        updateSize("sidebar", parseInt(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">
                      Right Panel Width: {customLayout.sizes.rightPanel}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="600"
                      step="10"
                      value={customLayout.sizes.rightPanel}
                      onChange={(e) =>
                        updateSize("rightPanel", parseInt(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">
                      Chat Height: {customLayout.sizes.chatHeight}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="600"
                      step="10"
                      value={customLayout.sizes.chatHeight}
                      onChange={(e) =>
                        updateSize("chatHeight", parseInt(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">
                      Problems Height: {customLayout.sizes.problemsHeight}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="400"
                      step="10"
                      value={customLayout.sizes.problemsHeight}
                      onChange={(e) =>
                        updateSize("problemsHeight", parseInt(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">
                      Git Height: {customLayout.sizes.gitHeight}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="400"
                      step="10"
                      value={customLayout.sizes.gitHeight}
                      onChange={(e) =>
                        updateSize("gitHeight", parseInt(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Custom Arrangements Tab */}
          {activeTab === "arrangements" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-300">
                  My Custom Layouts
                </h3>
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center space-x-1"
                >
                  <FaPlus className="w-3 h-3" />
                  <span>Create New</span>
                </button>
              </div>

              {customArrangements.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>No custom layouts saved yet.</p>
                  <p className="text-sm mt-1">
                    Create your first custom layout by adjusting settings and
                    saving it.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customArrangements.map((arrangement) => (
                    <div
                      key={arrangement.id}
                      className="p-3 border border-gray-600 rounded-lg hover:border-gray-500 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-white">
                            {arrangement.name}
                          </h4>
                          <p className="text-sm text-gray-400">
                            {arrangement.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Created:{" "}
                            {new Date(
                              arrangement.createdAt,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => loadCustomArrangement(arrangement)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                          >
                            Load
                          </button>
                          <button
                            onClick={() =>
                              deleteCustomArrangement(arrangement.id)
                            }
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                          >
                            <FaTrash className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700">
          <button
            onClick={resetToDefault}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            Reset to Default
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >
            Done
          </button>
        </div>
      </div>

      {/* Save Layout Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
          <div className="bg-gray-800 rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Save Custom Layout</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Layout Name
                </label>
                <input
                  type="text"
                  value={newArrangementName}
                  onChange={(e) => setNewArrangementName(e.target.value)}
                  placeholder="Enter layout name..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newArrangementDesc}
                  onChange={(e) => setNewArrangementDesc(e.target.value)}
                  placeholder="Describe this layout..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveCustomArrangement}
                disabled={!newArrangementName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm"
              >
                Save Layout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Hook for managing layout
export const useLayout = () => {
  const [layout, setLayout] = useState<LayoutConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return LAYOUT_PRESETS.default;
      }
    }
    return LAYOUT_PRESETS.default;
  });

  const updateLayout = useCallback((newLayout: LayoutConfig) => {
    setLayout(newLayout);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout));
  }, []);

  const resetLayout = useCallback(() => {
    const defaultLayout = LAYOUT_PRESETS.default;
    setLayout(defaultLayout);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultLayout));
  }, []);

  return { layout, updateLayout, resetLayout };
};

// Resizable divider component
interface ResizableDividerProps {
  direction: "horizontal" | "vertical";
  onResize: (delta: number) => void;
}

export const ResizableDivider: React.FC<ResizableDividerProps> = ({
  direction,
  onResize,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = direction === "horizontal" ? e.movementX : e.movementY;
      onResize(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, direction, onResize]);

  return (
    <div
      onMouseDown={() => setIsDragging(true)}
      className={`${
        direction === "horizontal"
          ? "w-1 cursor-col-resize hover:bg-blue-500"
          : "h-1 cursor-row-resize hover:bg-blue-500"
      } ${isDragging ? "bg-blue-500" : "bg-gray-700"} transition-colors`}
    />
  );
};

// Exports
export { LayoutManager };
