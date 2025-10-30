import { useState, useEffect, useCallback } from 'react';

type ProviderType = 'ollama' | 'openai' | 'anthropic' | 'groq';
type AIMessageRole = 'user' | 'assistant' | 'system';

interface AIMessage {
  role: AIMessageRole;
  content: string;
  isCode?: boolean;
  language?: string;
}

interface AIResponse {
  content: string;
  isCode?: boolean;
  language?: string;
  error?: string;
}

interface AIState {
  provider: ProviderType;
  model: string;
  apiKey: string;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  models: string[];
}

const DEFAULT_MODELS = {
  ollama: ['llama2', 'codellama', 'mistral'],
  openai: ['gpt-4', 'gpt-3.5-turbo'],
  anthropic: ['claude-2', 'claude-instant'],
  groq: ['llama2-70b', 'mixtral-8x7b'],
};

const API_ENDPOINTS = {
  chat: '/api/ai/chat',
  models: '/api/ai/models',
  validate: '/api/ai/validate',
};

export const useAI = () => {
  const [state, setState] = useState<AIState>({
    provider: 'ollama',
    model: 'llama2',
    apiKey: '',
    isConnected: false,
    isLoading: false,
    error: null,
    models: DEFAULT_MODELS.ollama,
  });

  // Load config from localStorage on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));
        const savedConfig = localStorage.getItem('aiConfig');
        
        if (savedConfig) {
          const { provider, model, apiKey } = JSON.parse(savedConfig);
          setState(prev => ({
            ...prev,
            provider,
            model,
            apiKey,
            models: DEFAULT_MODELS[provider] || [],
          }));
          
          // Validate the saved configuration
          await validateConnection(provider, model, apiKey);
        }
      } catch (error) {
        console.error('Failed to load AI config:', error);
        setState(prev => ({
          ...prev,
          error: 'Failed to load configuration',
        }));
      } finally {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadConfig();
  }, []);

  // Update available models when provider changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      models: DEFAULT_MODELS[state.provider] || [],
      model: DEFAULT_MODELS[state.provider]?.[0] || '',
    }));
  }, [state.provider]);

  const validateConnection = useCallback(
    async (provider: ProviderType, model: string, apiKey: string) => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        
        const response = await fetch(API_ENDPOINTS.validate, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey && { 'X-API-Key': apiKey }),
          },
          body: JSON.stringify({ provider, model }),
        });

        if (!response.ok) {
          throw new Error('Connection validation failed');
        }

        setState(prev => ({
          ...prev,
          isConnected: true,
          error: null,
        }));
        return true;
      } catch (error) {
        console.error('Validation error:', error);
        setState(prev => ({
          ...prev,
          isConnected: false,
          error: 'Failed to connect to AI service',
        }));
        return false;
      } finally {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    },
    []
  );

  const updateConfig = useCallback(
    async (updates: Partial<Omit<AIState, 'isLoading' | 'error' | 'isConnected' | 'models'>>) => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        
        const newState = { ...state, ...updates };
        const isValid = await validateConnection(
          updates.provider || state.provider,
          updates.model || state.model,
          updates.apiKey !== undefined ? updates.apiKey : state.apiKey
        );

        if (isValid) {
          localStorage.setItem(
            'aiConfig',
            JSON.stringify({
              provider: newState.provider,
              model: newState.model,
              apiKey: newState.apiKey,
            })
          );
        }

        return isValid;
      } catch (error) {
        console.error('Failed to update config:', error);
        setState(prev => ({
          ...prev,
          error: 'Failed to update configuration',
        }));
        return false;
      } finally {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    },
    [state, validateConnection]
  );

  const sendMessage = useCallback(
    async (params: {
      messages: AIMessage[];
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }): Promise<AIResponse> => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        const response = await fetch(API_ENDPOINTS.chat, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(state.apiKey && { 'X-API-Key': state.apiKey }),
          },
          body: JSON.stringify({
            ...params,
            provider: state.provider,
            model: params.model || state.model,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || 'Failed to send message');
        }

        return await response.json();
      } catch (error) {
        console.error('Error sending message:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'An unknown error occurred',
        }));
        throw error;
      } finally {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    },
    [state.provider, state.model, state.apiKey]
  );

  return {
    // State
    ...state,
    
    // Actions
    setProvider: (provider: ProviderType) => updateConfig({ provider }),
    setModel: (model: string) => updateConfig({ model }),
    setApiKey: (apiKey: string) => updateConfig({ apiKey }),
    updateConfig,
    sendMessage,
    validateConnection: () =>
      validateConnection(state.provider, state.model, state.apiKey),
  };
};

export default useAI;