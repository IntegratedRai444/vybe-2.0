import React, { useState, useEffect } from 'react';
import { AISettings } from '@/components/ai/AISettings';
import { AIProviderSelector } from '@/components/ai/AIProviderSelector';
import { useAI, ProviderType } from '@/components/ai/AIProvider';
import { ConnectionStatus } from '@/components/common/ConnectionStatus';
import { SecurityButton } from '@/components/common/SecurityButton';
import { AnalysisButton } from '@/components/common/AnalysisButton';
import { PanelContainer } from '@/components/common/PanelContainer';
import { Panel } from '@/components/common/Panel';
import { Button } from '@/components/ui/Button';
import { FiSave, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

interface SettingsProps {
  // Add any props if needed
}

const Settings: React.FC<SettingsProps> = () => {
  // AI Settings
  const { provider, model, setProvider, setModel, setApiKey } = useAI();
  const [localProvider, setLocalProvider] = useState<ProviderType>(provider);
  const [localModel, setLocalModel] = useState(model);
  const [apiKey, setLocalApiKey] = useState('');
  
  // UI State
  const [theme, setTheme] = useState('dark');
  const [fontSize, setFontSize] = useState(14);
  const [autoSave, setAutoSave] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'error'; 
    message: string 
  } | null>(null);

  // Save settings handler
  const handleSaveSettings = async (): Promise<boolean> => {
    try {
      setIsSaving(true);
      
      // Save AI settings if they exist
      if (apiKey) {
        setApiKey(apiKey);
      }
      setProvider(localProvider);
      setModel(localModel);
      
      // Simulate API call or any async operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaveStatus({ 
        type: 'success', 
        message: 'Settings saved successfully!' 
      });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings';
      setSaveStatus({ 
        type: 'error', 
        message: errorMessage 
      });
      console.error('Error saving settings:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Clear status message after 3 seconds
  useEffect(() => {
    if (saveStatus) {
      const timer = setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  // Status message component
  const StatusMessage = () => {
    if (!saveStatus) return null;
    
    const Icon = saveStatus.type === 'success' ? FiCheckCircle : FiAlertCircle;
    const bgColor = saveStatus.type === 'success' ? 'bg-green-100' : 'bg-red-100';
    const textColor = saveStatus.type === 'success' ? 'text-green-800' : 'text-red-800';
    
    return (
      <div className={`p-3 rounded-md ${bgColor} ${textColor} flex items-center mb-4`}>
        <Icon className="mr-2" />
        {saveStatus.message}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Settings</h1>
        <div className="flex items-center space-x-4">
          <AnalysisButton 
            projectRoot="/" 
            currentFile="" 
          />
          <ConnectionStatus />
          <SecurityButton />
        </div>
      </div>
      
      <StatusMessage />
      
      <div className="space-y-6">
        <Panel title="Application Settings" collapsible defaultExpanded>
          <div className="space-y-6 p-4">
            <Panel title="Appearance" variant="borderless">
              <h2 className="text-lg font-semibold mb-4">Appearance</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Theme</label>
                  <select 
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded p-2"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="system">System</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Font Size: {fontSize}px</label>
                  <input
                    type="range"
                    min="10"
                    max="24"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoSave"
                    checked={autoSave}
                    onChange={(e) => setAutoSave(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="autoSave" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Enable Auto Save
                  </label>
                </div>
              </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Font Size: {fontSize}px</label>
              <input
                type="range"
                min="10"
                max="24"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Editor</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Auto Save</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* AI Settings Section */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">AI Configuration</h2>
            {saveStatus && (
              <div className={`px-3 py-1 text-sm rounded ${
                saveStatus.type === 'success' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
              }`}>
                {saveStatus.message}
              </div>
            )}
          </div>
          
          <div className="space-y-6">
            <AIProviderSelector
              value={localProvider}
              model={localModel}
              apiKey={apiKey}
              onProviderChange={setLocalProvider}
              onModelChange={setLocalModel}
              onApiKeyChange={setLocalApiKey}
              onSave={handleSaveSettings}
              isSaving={isSaving}
            />
            
            <Panel title="AI Configuration" className="mt-6">
              <AISettings
                onSave={handleSaveSettings}
                isSaving={isSaving}
                onApiKeyChange={setLocalApiKey}
                onProviderChange={setLocalProvider}
                onModelChange={setLocalModel}
              />
            </Panel>
          </div>
        </div>
        </div>
      </PanelContainer>
      <div className="mt-6 flex justify-end space-x-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
        <Button 
          variant="outline" 
          onClick={() => window.history.back()}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="flex items-center"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
          {!isSaving && <FiSave className="ml-2" />}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
