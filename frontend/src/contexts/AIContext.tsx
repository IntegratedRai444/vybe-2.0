import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

interface AIConfig {
  provider: string;
  model: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
}

interface AIContextType {
  provider: string;
  model: string;
  apiKey: string;
  messages: AIMessage[];
  isLoading: boolean;
  error: Error | null;
  sendMessage: (message: string) => Promise<{ text: string }>;
  saveSettings: (settings: Partial<AIConfig>) => Promise<void>;
  setTheme: (theme: string) => void;
  getAvailableModels: (provider?: string) => string[];
  clearConversation: () => void;
}

const defaultConfig: AIConfig = {
  provider: "openai",
  model: "gpt-4",
  apiKey: "",
  temperature: 0.7,
  maxTokens: 2048,
};

const AIContext = createContext<AIContextType | null>(null);

export const AIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [provider, setProvider] = useState(defaultConfig.provider);
  const [model, setModel] = useState(defaultConfig.model);
  const [apiKey, setApiKey] = useState(defaultConfig.apiKey);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = useCallback(async (message: string) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const newMessage: AIMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Response to: ${message}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, newMessage]);
      return { text: newMessage.content };
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to send message");
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async (settings: Partial<AIConfig>) => {
    if (settings.provider) setProvider(settings.provider);
    if (settings.model) setModel(settings.model);
    if (settings.apiKey !== undefined) setApiKey(settings.apiKey);
    // Simulate async save
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, []);

  const setTheme = useCallback((theme: string) => {
    // Implement theme change logic
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  const getAvailableModels = useCallback((provider = "openai") => {
    // Return mock models based on provider
    if (provider === "openai") {
      return ["gpt-4", "gpt-3.5-turbo", "text-davinci-003"];
    }
    return ["default-model"];
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <AIContext.Provider
      value={{
        provider,
        model,
        apiKey,
        messages,
        isLoading,
        error,
        sendMessage,
        saveSettings,
        setTheme,
        getAvailableModels,
        clearConversation,
      }}
    >
      {children}
    </AIContext.Provider>
  );
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error("useAI must be used within an AIProvider");
  }
  return context;
};
