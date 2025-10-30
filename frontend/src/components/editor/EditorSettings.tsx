import React, { useState, useEffect } from 'react';
import { FaSave, FaEye, FaFolderOpen, FaCog } from 'react-icons/fa';

interface EditorSettings {
  autoSave: boolean;
  autoSaveInterval: number;
  minimap: boolean;
  fileWatcher: boolean;
  codeFolding: boolean;
  wordWrap: boolean;
  lineNumbers: boolean;
  renderWhitespace: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: EditorSettings;
  onSettingsChange: (settings: EditorSettings) => void;
}

export const EditorSettings: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  settings, 
  onSettingsChange 
}) => {
  const [localSettings, setLocalSettings] = useState<EditorSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSettingChange = (key: keyof EditorSettings, value: boolean | number) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  const handleReset = () => {
    const defaultSettings: EditorSettings = {
      autoSave: true,
      autoSaveInterval: 2000,
      minimap: true,
      fileWatcher: true,
      codeFolding: true,
      wordWrap: true,
      lineNumbers: true,
      renderWhitespace: false
    };
    setLocalSettings(defaultSettings);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FaCog className="w-5 h-5 text-blue-400" />
            Editor Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Auto-save Settings */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <FaSave className="w-4 h-4" />
              Auto-save
            </h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50">
                <span className="text-sm">Enable Auto-save</span>
                <input
                  type="checkbox"
                  checked={localSettings.autoSave}
                  onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
                  className="w-4 h-4"
                />
              </label>
              {localSettings.autoSave && (
                <div className="ml-4">
                  <label className="text-sm text-gray-400 mb-1 block">
                    Auto-save Interval: {localSettings.autoSaveInterval}ms
                  </label>
                  <input
                    type="range"
                    min="500"
                    max="10000"
                    step="500"
                    value={localSettings.autoSaveInterval}
                    onChange={(e) => handleSettingChange('autoSaveInterval', parseInt(e.target.value))}
                    className="w-full"
                    aria-label="Auto-save interval"
                    title="Auto-save interval in milliseconds"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Display Settings */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <FaEye className="w-4 h-4" />
              Display
            </h3>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50">
                <span className="text-sm">Minimap</span>
                <input
                  type="checkbox"
                  checked={localSettings.minimap}
                  onChange={(e) => handleSettingChange('minimap', e.target.checked)}
                  className="w-4 h-4"
                />
              </label>
              <label className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50">
                <span className="text-sm">Line Numbers</span>
                <input
                  type="checkbox"
                  checked={localSettings.lineNumbers}
                  onChange={(e) => handleSettingChange('lineNumbers', e.target.checked)}
                  className="w-4 h-4"
                />
              </label>
              <label className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50">
                <span className="text-sm">Word Wrap</span>
                <input
                  type="checkbox"
                  checked={localSettings.wordWrap}
                  onChange={(e) => handleSettingChange('wordWrap', e.target.checked)}
                  className="w-4 h-4"
                />
              </label>
              <label className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50">
                <span className="text-sm">Code Folding</span>
                <input
                  type="checkbox"
                  checked={localSettings.codeFolding}
                  onChange={(e) => handleSettingChange('codeFolding', e.target.checked)}
                  className="w-4 h-4"
                />
              </label>
              <label className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50">
                <span className="text-sm">Render Whitespace</span>
                <input
                  type="checkbox"
                  checked={localSettings.renderWhitespace}
                  onChange={(e) => handleSettingChange('renderWhitespace', e.target.checked)}
                  className="w-4 h-4"
                />
              </label>
            </div>
          </div>

          {/* File Watcher Settings */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <FaFolderOpen className="w-4 h-4" />
              File System
            </h3>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50">
                <span className="text-sm">File Watcher</span>
                <input
                  type="checkbox"
                  checked={localSettings.fileWatcher}
                  onChange={(e) => handleSettingChange('fileWatcher', e.target.checked)}
                  className="w-4 h-4"
                />
              </label>
              <p className="text-xs text-gray-400 ml-4">
                Automatically refresh when files change outside the editor
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            Reset to Defaults
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
