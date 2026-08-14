import { ReactNode } from "react";

export type ProviderType = "openai" | "anthropic" | "local";

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
}

export interface AIModel {
  id: string;
  name: string;
  provider: ProviderType;
  maxTokens: number;
  description?: string;
}

export interface ProviderModels {
  [key: string]: AIModel[];
}

export interface AIProviderState {
  provider: ProviderType;
  model: string;
  apiKey: string;
  messages: AIMessage[];
  isLoading: boolean;
  error: string | null;
  availableModels: AIModel[];
}

export interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children?: ReactNode;
}

export interface AIChatPanelProps {
  messages: AIMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export interface AICodeEditorProps {
  code: string;
  language: string;
  onCodeChange: (code: string) => void;
  suggestions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
}

export interface ModelSelectorProps {
  models: AIModel[];
  selectedModel: string;
  onModelSelect: (modelId: string) => void;
  disabled?: boolean;
}

export interface AIProviderProps {
  children: ReactNode;
  defaultProvider?: ProviderType;
  defaultModel?: string;
  onError?: (error: Error) => void;
}

// Exports
export { types };
