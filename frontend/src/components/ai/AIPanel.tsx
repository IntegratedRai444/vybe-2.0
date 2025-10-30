import React, { useState, useEffect, useCallback } from 'react';
import { useAI, type AIMessage, type ProviderType } from './AIProvider';
import { AIChatPanel } from './AIChatPanel';
import { AICodeEditor } from './AICodeEditor';
import { AISettings } from './AISettings';
import { AIProviderSelector } from './AIProviderSelector';
import { ModelSelector } from './ModelSelector';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { FiMessageSquare, FiCode, FiSettings, FiX, FiZap } from 'react-icons/fi';
import { cn } from '../../utils/cn';

type PanelView = 'chat' | 'code' | 'settings';

interface AIPanelProps {
  visible?: boolean;
  id?: string;
  className?: string;
  onClose?: () => void;
  initialView?: PanelView;
  onError?: (error: Error) => void;
}

export const AIPanel: React.FC<AIPanelProps> = ({
  visible = true,
  id = 'ai-panel',
  className = '',
  onClose,
  initialView = 'chat',
  onError,
}) => {
  const [activeView, setActiveView] = useState<PanelView>(initialView);
  const [code, setCode] = useState<string>('// Start coding here...');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const {
    provider,
    model,
    apiKey,
    models,
    isConnected,
    setProvider,
    setModel,
    setApiKey,
    saveSettings: saveAISettings,
    isSaving,
  } = useAI();

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      const userMessage: AIMessage = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      try {
        // Simulate AI response (replace with actual API call)
        setTimeout(() => {
          const aiMessage: AIMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `I received your message: "${content}"`,
            timestamp: Date.now(),
            model,
            provider,
          };
          setMessages((prev) => [...prev, aiMessage]);
          setIsLoading(false);
        }, 1000);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        onError?.(new Error(errorMessage));
        setIsLoading(false);
      }
    },
    [model, provider, onError]
  );

  const handleSaveSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      await saveAISettings();
      setError(null);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
      setError(errorMessage);
      onError?.(new Error(errorMessage));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [saveAISettings, onError]);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('ai-messages', JSON.stringify(messages));
    }
  }, [messages]);

  // Load saved messages when component mounts
  useEffect(() => {
    if (visible) {
      const savedMessages = localStorage.getItem('ai-messages');
      if (savedMessages) {
        try {
          setMessages(JSON.parse(savedMessages));
        } catch (e) {
          console.error('Failed to load messages', e);
        }
      }
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <ErrorBoundary onError={onError}>
      <div
        id={id}
        className={cn(
          'flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveView('chat')}
              className={cn(
                'p-2 rounded-md',
                activeView === 'chat'
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              )}
              title="Chat"
            >
              <FiMessageSquare className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveView('code')}
              className={cn(
                'p-2 rounded-md',
                activeView === 'code'
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              )}
              title="Code Editor"
            >
              <FiCode className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveView('settings')}
              className={cn(
                'p-2 rounded-md',
                activeView === 'settings'
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              )}
              title="Settings"
            >
              <FiSettings className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
              <FiZap className="w-3 h-3 mr-1" />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Close panel"
              >
                <FiX className="w-5 h-5" />
              </button>
            )}
          </div>
      data-testid={panelId}
      aria-labelledby={`${panelId}-header`}
            </svg>
          </button>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-900/50 text-red-100 text-sm p-3 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
      
      {/* Main content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <AIPage />
      </div>
    </div>
  );
};

export default AIPanel;
