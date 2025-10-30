import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ProviderType, AIMessage, AIResponse, AIConfig, Conversation } from '@/types/ai';

const STORAGE_KEYS = {
  CONFIG: 'aiConfig',
  CONVERSATIONS: 'aiConversations',
  ACTIVE_CONVERSATION: 'aiActiveConversationId',
  THEME: 'aiTheme',
} as const;

const DEFAULT_CONFIG: Omit<AIConfig, 'apiKey'> = {
  provider: 'ollama',
  model: 'llama2',
  temperature: 0.7,
  maxTokens: 2000,
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
  theme: 'system',
};

interface UseAIOptions {
  onStreamingStart?: () => void;
  onStreamingEnd?: () => void;
  onError?: (error: Error) => void;
}

export const useAI = (options: UseAIOptions = {}) => {
  const [config, setConfig] = useState<AIConfig>({ ...DEFAULT_CONFIG, apiKey: '' });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const abortController = useRef<AbortController | null>(null);

  // Initialize from localStorage
  useEffect(() => {
    const initialize = async () => {
      try {
        // Load config
        const savedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
        if (savedConfig) {
          setConfig(prev => ({
            ...prev,
            ...JSON.parse(savedConfig),
            ...DEFAULT_CONFIG,
          }));
        }

        // Load conversations
        const savedConversations = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
        if (savedConversations) {
          setConversations(JSON.parse(savedConversations));
        }

        // Load active conversation
        const savedActiveId = localStorage.getItem(STORAGE_KEYS.ACTIVE_CONVERSATION);
        if (savedActiveId) {
          setActiveConversationId(savedActiveId);
        } else if (savedConversations) {
          const parsed = JSON.parse(savedConversations);
          if (parsed.length > 0) {
            setActiveConversationId(parsed[0].id);
          }
        }

        // Apply theme
        const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as AIConfig['theme'] | null;
        if (savedTheme) {
          applyTheme(savedTheme);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          applyTheme('dark');
        }
      } catch (e) {
        console.error('Failed to initialize AI context', e);
        setError('Failed to load settings. Using default configuration.');
      } finally {
        setIsInitialized(true);
      }
    };

    initialize();
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    if (!isInitialized) return;
    
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
      if (activeConversationId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_CONVERSATION, activeConversationId);
      }
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
  }, [config, conversations, activeConversationId, isInitialized]);

  const applyTheme = (theme: AIConfig['theme']) => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && 
      window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    root.classList.remove(isDark ? 'light' : 'dark');
    root.classList.add(isDark ? 'dark' : 'light');
  };

  const updateConfig = useCallback(async (updates: Partial<AIConfig>) => {
    setIsSaving(true);
    setError(null);
    
    try {
      const newConfig = { ...config, ...updates };
      
      if (updates.theme !== undefined) {
        applyTheme(updates.theme);
        localStorage.setItem(STORAGE_KEYS.THEME, updates.theme);
      }
      
      setConfig(newConfig);
      return true;
    } catch (e) {
      console.error('Failed to update config', e);
      setError('Failed to update settings. Please try again.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [config]);

  const createConversation = useCallback((title: string): Conversation => {
    const newConversation: Conversation = {
      id: uuidv4(),
      title: title || 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: config.model,
      provider: config.provider,
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
    return newConversation;
  }, [config.model, config.provider]);

  const updateConversation = useCallback((id: string, updates: Partial<Conversation>) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === id 
          ? { ...conv, ...updates, updatedAt: Date.now() } 
          : conv
      )
    );
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => {
      const newConversations = prev.filter(conv => conv.id !== id);
      
      if (activeConversationId === id) {
        const nextActive = newConversations[0]?.id || null;
        setActiveConversationId(nextActive);
      }
      
      return newConversations;
    });
  }, [activeConversationId]);

  const addMessage = useCallback((conversationId: string, message: Omit<AIMessage, 'id' | 'timestamp'>) => {
    const newMessage: AIMessage = {
      ...message,
      id: uuidv4(),
      timestamp: Date.now(),
    };
    
    setConversations(prev => 
      prev.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            messages: [...conv.messages, newMessage],
            updatedAt: Date.now(),
          };
        }
        return conv;
      })
    );
    
    return newMessage;
  }, []);

  const updateMessage = useCallback((conversationId: string, messageId: string, updates: Partial<AIMessage>) => {
    setConversations(prev => 
      prev.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            messages: conv.messages.map(msg => 
              msg.id === messageId 
                ? { ...msg, ...updates } 
                : msg
            ),
            updatedAt: Date.now(),
          };
        }
        return conv;
      })
    );
  }, []);

  const sendMessage = useCallback(async (
    content: string, 
    conversationId?: string,
    options: {
      stream?: boolean;
      onChunk?: (chunk: string | null) => void;
    } = {}
  ) => {
    if (!content.trim()) return null;
    
    const conversation = conversationId 
      ? conversations.find(c => c.id === conversationId)
      : null;
    
    const conversationToUse = conversation || 
      createConversation(content.slice(0, 50) + (content.length > 50 ? '...' : ''));
    
    const userMessage = addMessage(conversationToUse.id, {
      role: 'user',
      content,
    });
    
    const assistantMessage = addMessage(conversationToUse.id, {
      role: 'assistant',
      content: '',
    });
    
    setIsLoading(true);
    setError(null);
    
    if (abortController.current) {
      abortController.current.abort();
    }
    
    abortController.current = new AbortController();
    
    try {
      const messages = [
        ...conversationToUse.messages
          .filter(m => m.role !== 'assistant' || !m.isError)
          .map(({ role, content }) => ({ role, content })),
        { role: 'user' as const, content }
      ];
      
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Provider': config.provider,
          'X-Model': config.model,
          ...(config.apiKey && { 'X-API-Key': config.apiKey }),
          ...(options.stream && { 'X-Stream': 'true' }),
        },
        body: JSON.stringify({
          messages,
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          top_p: config.topP,
          frequency_penalty: config.frequencyPenalty,
          presence_penalty: config.presencePenalty,
          stream: options.stream,
        }),
        signal: abortController.current.signal,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 
          `API request failed with status ${response.status}`
        );
      }
      
      if (options.stream && response.body) {
        setIsStreaming(true);
        options.onChunk?.('');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.done) {
                  updateMessage(conversationToUse.id, assistantMessage.id, {
                    content: fullResponse,
                    tokenCount: data.usage?.total_tokens,
                  });
                  break;
                }
                
                const content = data.choices?.[0]?.delta?.content || '';
                if (content) {
                  fullResponse += content;
                  options.onChunk?.(content);
                }
              } catch (e) {
                console.error('Error parsing stream chunk:', e);
              }
            }
          }
        } finally {
          setIsStreaming(false);
          options.onChunk?.(null);
        }
        
        return fullResponse;
      } else {
        const data: AIResponse = await response.json();
        
        updateMessage(conversationToUse.id, assistantMessage.id, {
          content: data.content,
          tokenCount: data.usage?.total_tokens,
        });
        
        return data.content;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
      
      updateMessage(conversationToUse.id, assistantMessage.id, {
        content: `Error: ${errorMessage}`,
        isError: true,
      });
      
      throw error;
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortController.current = null;
    }
  }, [
    config, 
    conversations, 
    addMessage, 
    updateMessage, 
    createConversation
  ]);

  const cancelRequest = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
      setIsLoading(false);
      setIsStreaming(false);
      return true;
    }
    return false;
  }, []);

  const activeConversation = activeConversationId
    ? conversations.find(c => c.id === activeConversationId)
    : null;

  return {
    // State
    config,
    isInitialized,
    isSaving,
    isLoading,
    isStreaming,
    error,
    conversations,
    activeConversationId,
    activeConversation,
    
    // Actions
    updateConfig,
    setActiveConversationId,
    createConversation,
    updateConversation,
    deleteConversation,
    addMessage,
    updateMessage,
    sendMessage,
    cancelRequest,
    
    // Convenience methods
    setProvider: (provider: ProviderType) => updateConfig({ provider }),
    setModel: (model: string) => updateConfig({ model }),
    setApiKey: (apiKey: string) => updateConfig({ apiKey }),
    setTemperature: (temperature: number) => updateConfig({ temperature }),
    setMaxTokens: (maxTokens: number) => updateConfig({ maxTokens }),
    setTheme: (theme: AIConfig['theme']) => updateConfig({ theme }),
  };
};

export default useAI;
