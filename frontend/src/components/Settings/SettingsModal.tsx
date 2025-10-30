import React, { useState, useEffect } from 'react';
import { X, Moon, Sun, Palette, User, Cpu, Code, GitBranch, GitCommit, GitPullRequest, GitPush, Plus, RefreshCw, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAISettings, useAISettingsActions } from '../../store/aiSettingsStore';
import { useTheme } from '../../contexts/ThemeContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { GitSettings } from '../git/GitSettings';

interface SettingsTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ThemeSettings = () => {
  const { theme, setTheme } = useTheme();
  const themes = [
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
    { id: 'system', label: 'System' },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-gray-200">Appearance</h3>
        <p className="text-sm text-gray-400">
          Customize how Vybe looks on your device.
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Theme
          </label>
          <div className="grid grid-cols-3 gap-3">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as any)}
                className={cn(
                  'flex flex-col items-center justify-center p-4 rounded-lg border transition-colors',
                  theme === t.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 hover:bg-gray-800/50',
                )}
              >
                {t.id === 'light' ? (
                  <Sun className="w-5 h-5 mb-2 text-yellow-500" />
                ) : t.id === 'dark' ? (
                  <Moon className="w-5 h-5 mb-2 text-indigo-400" />
                ) : (
                  <Palette className="w-5 h-5 mb-2 text-gray-400" />
                )}
                <span className="text-sm">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="pt-4 border-t border-gray-800">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Editor</h4>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-300">Font Size</span>
              <input
                type="range"
                min="10"
                max="24"
                defaultValue="14"
                className="w-32 accent-blue-500"
                onChange={(e) => {
                  // Update editor font size
                  document.documentElement.style.setProperty('--editor-font-size', `${e.target.value}px`);
                }}
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-300">Line Height</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                defaultValue="1.5"
                className="w-32 accent-blue-500"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

const UserPreferences = () => {
  const [preferences, setPreferences] = useState({
    autoSave: true,
    formatOnSave: true,
    autoUpdate: true,
    showLineNumbers: true,
    minimap: false,
    wordWrap: true,
  });

  useEffect(() => {
    // Load saved preferences
    const saved = localStorage.getItem('user-preferences');
    if (saved) {
      setPreferences(JSON.parse(saved));
    }
  }, []);

  const handleToggle = (key: keyof typeof preferences) => {
    const newPrefs = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPrefs);
    localStorage.setItem('user-preferences', JSON.stringify(newPrefs));
  };

  const ToggleSetting = ({ 
    label, 
    description, 
    checked, 
    onChange 
  }: { 
    label: string; 
    description: string; 
    checked: boolean; 
    onChange: () => void 
  }) => (
    <div className="flex items-start">
      <div className="flex items-center h-5">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
        />
      </div>
      <div className="ml-3 text-sm">
        <label className="font-medium text-gray-200">{label}</label>
        <p className="text-gray-400">{description}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-gray-200">Preferences</h3>
        <p className="text-sm text-gray-400">
          Customize your Vybe experience.
        </p>
      </div>
      
      <div className="space-y-4">
        <ToggleSetting
          label="Auto Save"
          description="Automatically save changes to files"
          checked={preferences.autoSave}
          onChange={() => handleToggle('autoSave')}
        />
        <ToggleSetting
          label="Format on Save"
          description="Format code when saving files"
          checked={preferences.formatOnSave}
          onChange={() => handleToggle('formatOnSave')}
        />
        <ToggleSetting
          label="Auto Update"
          description="Automatically check for updates"
          checked={preferences.autoUpdate}
          onChange={() => handleToggle('autoUpdate')}
        />
        <ToggleSetting
          label="Show Line Numbers"
          checked={preferences.showLineNumbers}
          description="Display line numbers in the editor"
          onChange={() => handleToggle('showLineNumbers')}
        />
      </div>
    </div>
  );
};

const AISettingsTab = () => {
  const {
    provider,
    model,
    temperature,
    providers,
    providerModels,
  } = useAISettings();
  
  const {
    setProvider,
    setModel,
    setTemperature,
  } = useAISettingsActions();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-gray-200">AI Configuration</h3>
        <p className="text-sm text-gray-400">
          Configure your AI provider and model settings.
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            AI Provider
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-gray-200 focus:border-blue-500 focus:ring-blue-500"
          >
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Model
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-gray-200 focus:border-blue-500 focus:ring-blue-500"
          >
            {providerModels[provider]?.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-300">
              Temperature: {temperature.toFixed(1)}
            </label>
            <span className="text-xs text-gray-400">
              {temperature < 0.3 ? 'Precise' : temperature > 0.7 ? 'Creative' : 'Balanced'}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  
  const settingsTabs: SettingsTab[] = [
    {
      id: 'general',
      label: 'General',
      icon: <User className="w-4 h-4" />,
      content: <UserPreferences />,
    },
    {
      id: 'appearance',
      label: 'Appearance',
      icon: <Palette className="w-4 h-4" />,
      content: <ThemeSettings />,
    },
    {
      id: 'ai',
      label: 'AI',
      icon: <Cpu className="w-4 h-4" />,
      content: <AISettingsTab />,
    },
    {
      id: 'git',
      label: 'Version Control',
      icon: <GitBranch className="w-4 h-4" />,
      content: <GitSettings />,
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="relative w-full max-w-3xl bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="h-[70vh] flex flex-col">
          <Tabs 
            defaultValue={settingsTabs[0].id} 
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="w-full justify-start rounded-none border-b border-gray-800 bg-transparent p-0">
              {settingsTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-4 pt-2 font-medium text-gray-400 transition-colors hover:bg-gray-800/50 hover:text-gray-200 data-[state=active]:border-blue-500 data-[state=active]:text-blue-500 data-[state=active]:shadow-none"
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <div className="flex-1 overflow-y-auto p-6">
              {settingsTabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id} className="m-0">
                  {tab.content}
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </div>
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  disabled={!p.isAvailable}
                  className={cn(
                    'p-3 rounded-lg border transition-colors text-center',
                    p.id === provider
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-gray-700 hover:border-gray-600 text-gray-300',
                    !p.isAvailable && 'opacity-50 cursor-not-allowed',
                    p.isAvailable && 'hover:bg-gray-800/50'
                  )}
                >
                  <div className="text-sm font-medium">{p.name}</div>
                  {!p.isAvailable && (
                    <div className="text-xs text-gray-500 mt-1">Not configured</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Model</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {providerModels.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  className={cn(
                    'p-3 rounded-lg border transition-colors text-left',
                    model === m.id
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-gray-700 hover:border-gray-600 text-gray-300 hover:bg-gray-800/50'
                  )}
                >
                  <div className="text-sm font-medium">{m.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{m.id}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-300">
                Temperature: {temperature.toFixed(1)}
              </label>
              <span className="text-xs text-gray-400">
                {temperature < 0.3 ? 'Precise' : temperature < 0.7 ? 'Balanced' : 'Creative'}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Precise</span>
              <span>Balanced</span>
              <span>Creative</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 bg-gray-900/50 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
