import { useState, useEffect, useCallback } from "react";

type ProviderType = "openai" | "ollama" | "huggingface" | "custom";

interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface AIConfig {
  provider: ProviderType;
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

const useAI = (initialConfig: Partial<AIConfig> = {}) => {
  const [config, setConfig] = useState<AIConfig>({
    provider: "ollama",
    model: "llama2",
    temperature: 0.7,
    maxTokens: 1000,
    ...initialConfig,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [conversation, setConversation] = useState<AIMessage[]>([]);

  const updateConfig = useCallback(
    (newConfig: Partial<AIConfig>) => {
      setConfig((prev) => ({
        ...prev,
        ...newConfig,
      }));

      // Save to localStorage or your preferred storage
      localStorage.setItem(
        "aiConfig",
        JSON.stringify({
          ...config,
          ...newConfig,
        }),
      );
    },
    [config],
  );

  const sendMessage = useCallback(
    async (message: string) => {
      setIsLoading(true);
      setError(null);

      const userMessage: AIMessage = {
        id: Date.now().toString(),
        role: "user",
        content: message,
        timestamp: new Date(),
      };

      setConversation((prev) => [...prev, userMessage]);

      try {
        // TODO: Implement actual API call based on the provider
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            messages: [...conversation, userMessage],
            model: config.model,
            temperature: config.temperature,
            max_tokens: config.maxTokens,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get AI response");
        }

        const data = await response.json();

        const aiMessage: AIMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: data.choices[0].message.content,
          timestamp: new Date(),
        };

        setConversation((prev) => [...prev, aiMessage]);
        return aiMessage;
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error("Failed to process AI request");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [config, conversation],
  );

  const clearConversation = useCallback(() => {
    setConversation([]);
  }, []);

  // Load saved config on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem("aiConfig");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig((prev) => ({
          ...prev,
          ...parsed,
        }));
      } catch (err) {
        console.error("Failed to parse saved AI config", err);
      }
    }
  }, []);

  return {
    // State
    config,
    isLoading,
    error,
    conversation,

    // Actions
    updateConfig,
    sendMessage,
    clearConversation,
  };
};

export default useAI;
