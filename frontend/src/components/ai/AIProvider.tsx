import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { v4 as uuidv4 } from "uuid";

// Types
export type ProviderType = "ollama" | "openai" | "anthropic" | "groq";

export interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  model?: string;
  provider?: ProviderType;
}

export interface AIModel {
  id: string;
  name: string;
  maxTokens?: number;
  description?: string;
}

export type ProviderModels = {
  ollama: AIModel[];
  openai: AIModel[];
  anthropic: AIModel[];
  groq: AIModel[];
};

export const PROVIDER_MODELS: ProviderModels = {
  ollama: [
    { id: "llama3", name: "Llama 3", description: "Latest Llama model" },
    {
      id: "llama2",
      name: "Llama 2",
      description: "Meta's open source large language model",
    },
    {
      id: "codellama",
      name: "CodeLlama",
      description: "Code generation specialized model",
    },
    {
      id: "mistral",
      name: "Mistral",
      description: "Efficient small language model",
    },
  ],
  openai: [
    {
      id: "gpt-4",
      name: "GPT-4",
      maxTokens: 8192,
      description: "Most capable model, great for complex tasks",
    },
    {
      id: "gpt-3.5-turbo",
      name: "GPT-3.5 Turbo",
      maxTokens: 4096,
      description: "Fast and cost-effective for most tasks",
    },
  ],
  anthropic: [
    {
      id: "claude-2",
      name: "Claude 2",
      maxTokens: 100000,
      description: "Large context window, great for documents",
    },
    {
      id: "claude-instant",
      name: "Claude Instant",
      maxTokens: 100000,
      description: "Faster, lighter version of Claude 2",
    },
  ],
  groq: [
    {
      id: "llama2-70b",
      name: "Llama 2 70B",
      maxTokens: 4096,
      description: "Large 70B parameter model",
    },
    {
      id: "mixtral-8x7b",
      name: "Mixtral 8x7B",
      maxTokens: 32768,
      description: "High quality mixture of experts model",
    },
  ],
};

export interface AIProviderState {
  // State
  provider: ProviderType;
  model: string;
  messages: AIMessage[];
  isLoading: boolean;
  error: string | null;
  apiKey: string;
  suggestions: Array<{
    id: string;
    text: string;
    range: any;
    timestamp: number;
  }>;
  isAIConfigured: boolean;

  // Actions
  setProvider: (provider: ProviderType) => void;
  setModel: (model: string) => void;
  setApiKey: (key: string) => void;
  sendMessage: (message: string) => Promise<void>;
  clearConversation: () => void;
  retryLastMessage: () => Promise<void>;
  getAvailableModels: () => AIModel[];
  saveSettings: () => void;
  isSaving: boolean;
  
  // Suggestion handling
  addSuggestion: (text: string, range: any) => void;
  acceptSuggestion: (text: string, range: any) => void;
  rejectSuggestion: () => void;
  clearSuggestions: () => void;
}

// Context
const AIProviderContext = createContext<AIProviderState | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  MESSAGES: "ai_messages",
  PROVIDER: "ai_provider",
  MODEL: "ai_model",
  API_KEY: "ai_api_key",
};

// Helper to get from localStorage with error handling
const safeGetItem = (key: string, defaultValue: any) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

const AIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State
  const [provider, setProviderState] = useState<ProviderType>(
    safeGetItem(STORAGE_KEYS.PROVIDER, "ollama"),
  );
  const [model, setModelState] = useState<string>(
    safeGetItem(STORAGE_KEYS.MODEL, "llama3"),
  );
  const [messages, setMessages] = useState<AIMessage[]>(
    safeGetItem(STORAGE_KEYS.MESSAGES, []),
  );
  const [apiKey, setApiKeyState] = useState<string>(
    safeGetItem(STORAGE_KEYS.API_KEY, ""),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{
    id: string;
    text: string;
    range: any;
    timestamp: number;
  }>>([]);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  }, [messages]);

  // Check if AI is configured
  const isAIConfigured = Boolean(provider && model && (provider === 'ollama' || apiKey));

  // Handle suggestion from AI
  const addSuggestion = useCallback((text: string, range: any) => {
    const newSuggestion = {
      id: uuidv4(),
      text,
      range,
      timestamp: Date.now(),
    };
    setSuggestions(prev => [...prev, newSuggestion]);
    
    // Dispatch event for the CompletionBubble to pick up
    window.dispatchEvent(new CustomEvent('ai-suggestion', {
      detail: {
        suggestion: newSuggestion,
        rect: range.getBoundingClientRect(),
      },
    }));
  }, []);

  // Accept a suggestion
  const acceptSuggestion = useCallback((text: string, range: any) => {
    // Here you would typically replace the text in the editor
    // For now, we'll just log it
    console.log('Accepted suggestion:', { text, range });
    
    // Clear the suggestion
    setSuggestions(prev => prev.filter(s => s.text !== text));
  }, []);

  // Reject a suggestion
  const rejectSuggestion = useCallback(() => {
    // Just clear the most recent suggestion
    setSuggestions(prev => prev.slice(0, -1));
  }, []);

  // Clear all suggestions
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  // Update model if provider changes and current model is not available
  useEffect(() => {
    const availableModels = PROVIDER_MODELS[provider] || [];
    const modelExists = availableModels.some((m) => m.id === model);
    if (!modelExists && availableModels.length > 0) {
      setModel(availableModels[0].id);
    }
  }, [provider, model]);

  // State setters with persistence
  const setProvider = useCallback((newProvider: ProviderType) => {
    setProviderState(newProvider);
    localStorage.setItem(STORAGE_KEYS.PROVIDER, JSON.stringify(newProvider));
  }, []);

  const setModel = useCallback((newModel: string) => {
    setModelState(newModel);
    localStorage.setItem(STORAGE_KEYS.MODEL, JSON.stringify(newModel));
  }, []);

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    // Don't store the full API key in localStorage for security
    localStorage.setItem(
      STORAGE_KEYS.API_KEY,
      JSON.stringify(key ? "••••••••" + key.slice(-4) : ""),
    );
  }, []);

  // Save all settings
  const saveSettings = useCallback(() => {
    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEYS.PROVIDER, JSON.stringify(provider));
      localStorage.setItem(STORAGE_KEYS.MODEL, JSON.stringify(model));
      // Don't save the masked API key
      if (!apiKey.startsWith("••••••••")) {
        localStorage.setItem(STORAGE_KEYS.API_KEY, JSON.stringify(apiKey));
      }
      return true;
    } catch (error) {
      console.error("Error saving settings:", error);
      setError("Failed to save settings");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [provider, model, apiKey]);

  // Get available models for current provider
  const getAvailableModels = useCallback((): AIModel[] => {
    return PROVIDER_MODELS[provider] || [];
  }, [provider]);

  // Send message to AI service
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      const userMessage: AIMessage = {
        id: uuidv4(),
        role: "user",
        content: content.trim(),
        timestamp: Date.now(),
        provider,
        model,
      };

      // Add user message to chat
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      try {
        // Call your API endpoint
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: apiKey ? `Bearer ${apiKey}` : "",
          },
          body: JSON.stringify({
            provider,
            model,
            messages: [...messages, userMessage].map(({ role, content }) => ({
              role,
              content,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();

        const assistantMessage: AIMessage = {
          id: uuidv4(),
          role: "assistant",
          content: data.choices?.[0]?.message?.content || "No response from AI",
          timestamp: Date.now(),
          provider,
          model,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send message";
        setError(errorMessage);
        console.error("Error sending message:", err);

        // Add error message to chat
        const errorMessageObj: AIMessage = {
          id: uuidv4(),
          role: "system",
          content: `Error: ${errorMessage}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMessageObj]);
      } finally {
        setIsLoading(false);
      }
    },
    [provider, model, messages, apiKey],
  );

  // Retry the last user message
  const retryLastMessage = useCallback(async () => {
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");
    if (lastUserMessage) {
      // Remove all messages after the last user message
      const lastUserMessageIndex = messages.findIndex(
        (m) => m.id === lastUserMessage.id,
      );
      const newMessages = messages.slice(0, lastUserMessageIndex + 1);
      setMessages(newMessages);

      // Resend the message
      await sendMessage(lastUserMessage.content);
    }
  }, [messages, sendMessage]);

  // Clear conversation
  const clearConversation = useCallback(() => {
    if (confirm("Are you sure you want to clear the conversation?")) {
      setMessages([]);
      setError(null);
    }
  }, []);

  // Context value
  const contextValue: AIProviderState = {
    // State
    provider,
    model,
    messages,
    isLoading,
    error,
    apiKey,
    isSaving,
    suggestions,
    isAIConfigured,

    // Actions
    setProvider,
    setModel,
    setApiKey,
    sendMessage,
    clearConversation,
    retryLastMessage,
    getAvailableModels,
    saveSettings,
    
    // Suggestion handling
    addSuggestion,
    acceptSuggestion,
    rejectSuggestion,
    clearSuggestions,
  };

  return (
    <AIProviderContext.Provider value={contextValue}>
      {children}
    </AIProviderContext.Provider>
  );
};

export { AIProvider };
export default AIProvider;

export const useAI = (): AIProviderState => {
  const context = useContext(AIProviderContext);
  if (context === undefined) {
    throw new Error("useAI must be used within an AIProvider");
  }
  return context;
};
