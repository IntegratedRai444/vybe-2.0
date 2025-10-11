import React, { useState } from "react";

type Settings = {
  model: string;
  temperature: number;
  theme: "dark" | "light";
  fontSize: number;
  autoSave: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: Settings) => void;
  initial: Settings;
};

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, onSave, initial }) => {
  const [settings, setSettings] = useState<Settings>(initial);

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-96 max-h-96 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
        </div>
        
        <div className="p-4 space-y-4 max-h-64 overflow-y-auto">
          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              AI Model
            </label>
            <select
              value={settings.model}
              onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded"
            >
              <option value="codellama:7b-instruct">CodeLlama 7B</option>
              <option value="llama3:latest">Llama3 Latest</option>
              <option value="deepseek-coder:6.7b">DeepSeek Coder</option>
            </select>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Temperature: {settings.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
              className="w-full"
            />
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Font Size: {settings.fontSize}px
            </label>
            <input
              type="range"
              min="12"
              max="20"
              value={settings.fontSize}
              onChange={(e) => setSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
              className="w-full"
            />
          </div>

          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Theme
            </label>
            <select
              value={settings.theme}
              onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value as "dark" | "light" }))}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>

          {/* Auto Save */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={settings.autoSave}
              onChange={(e) => setSettings(prev => ({ ...prev, autoSave: e.target.checked }))}
              className="mr-2"
            />
            <label className="text-sm text-gray-300">Auto-save files</label>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-700 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};