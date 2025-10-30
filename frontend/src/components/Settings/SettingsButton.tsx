import React from 'react';
import { Settings } from 'lucide-react';
import { useAISettingsActions } from '../../store/aiSettingsStore';

export const SettingsButton: React.FC = () => {
  const { toggleSettings } = useAISettingsActions();
  
  return (
    <button
      onClick={() => toggleSettings()}
      className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
      aria-label="Open settings"
    >
      <Settings className="w-5 h-5" />
    </button>
  );
};

export default SettingsButton;
