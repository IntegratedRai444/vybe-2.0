import React, { useState } from "react";

interface WorkspaceConfigProps {
  isOpen: boolean;
  onClose: () => void;
  projectRoot: string;
}

export const WorkspaceConfig: React.FC<WorkspaceConfigProps> = ({
  isOpen,
  onClose,
  projectRoot,
}) => {
  const [settings, setSettings] = useState({
    autoSave: true,
    formatOnSave: true,
    lintOnSave: true,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: true,
    minimap: false,
    lineNumbers: true,
    folding: true,
  });

  const handleSettingChange = (
    key: keyof typeof settings,
    value: boolean | number,
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    // TODO: Save workspace settings to a config file
    console.log("Saving workspace settings:", settings);
    localStorage.setItem(
      `workspace-config-${projectRoot}`,
      JSON.stringify(settings),
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl w-[32rem] max-w-[90vw] shadow-2xl border border-slate-700/50">
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-100">
                Workspace Settings
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Configure settings for: {projectRoot.split(/[\\/]/).pop()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-slate-200 transition-all duration-150"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
          {/* Editor Settings */}
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-4">Editor</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-400">Auto Save</label>
                <button
                  onClick={() =>
                    handleSettingChange("autoSave", !settings.autoSave)
                  }
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    settings.autoSave ? "bg-blue-600" : "bg-slate-600"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      settings.autoSave ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-400">Format on Save</label>
                <button
                  onClick={() =>
                    handleSettingChange("formatOnSave", !settings.formatOnSave)
                  }
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    settings.formatOnSave ? "bg-blue-600" : "bg-slate-600"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      settings.formatOnSave ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-400">Lint on Save</label>
                <button
                  onClick={() =>
                    handleSettingChange("lintOnSave", !settings.lintOnSave)
                  }
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    settings.lintOnSave ? "bg-blue-600" : "bg-slate-600"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      settings.lintOnSave ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-400">Tab Size</label>
                <select
                  value={settings.tabSize}
                  onChange={(e) =>
                    handleSettingChange("tabSize", parseInt(e.target.value))
                  }
                  className="bg-slate-700/50 text-slate-100 rounded px-2 py-1 text-sm border border-slate-600/50 focus:border-blue-500/50 outline-none"
                >
                  <option value={2}>2</option>
                  <option value={4}>4</option>
                  <option value={8}>8</option>
                </select>
              </div>
            </div>
          </div>

          {/* Display Settings */}
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-4">Display</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-400">Word Wrap</label>
                <button
                  onClick={() =>
                    handleSettingChange("wordWrap", !settings.wordWrap)
                  }
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    settings.wordWrap ? "bg-blue-600" : "bg-slate-600"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      settings.wordWrap ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-400">Minimap</label>
                <button
                  onClick={() =>
                    handleSettingChange("minimap", !settings.minimap)
                  }
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    settings.minimap ? "bg-blue-600" : "bg-slate-600"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      settings.minimap ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-400">Line Numbers</label>
                <button
                  onClick={() =>
                    handleSettingChange("lineNumbers", !settings.lineNumbers)
                  }
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    settings.lineNumbers ? "bg-blue-600" : "bg-slate-600"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      settings.lineNumbers ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-400">Code Folding</label>
                <button
                  onClick={() =>
                    handleSettingChange("folding", !settings.folding)
                  }
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    settings.folding ? "bg-blue-600" : "bg-slate-600"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      settings.folding ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700/50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-all duration-150"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-150 font-medium"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

// Exports
export { WorkspaceConfig };
