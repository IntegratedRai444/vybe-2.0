import { ProviderType } from '../components/ai/AIProviderSelector';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  id: string;
  timestamp: number;
  isError?: boolean;
  tokenCount?: number;
}

export interface AIResponse {
  content: string;
  isCode?: boolean;
  language?: string;
  model?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  done?: boolean;
}

export interface ModelConfig {
  id: string;
  name: string;
  maxTokens: number;
  description?: string;
  temperature?: {
    min: number;
    max: number;
    step: number;
    default: number;
  };
  topP?: {
    min: number;
    max: number;
    step: number;
    default: number;
  };
  frequencyPenalty?: {
    min: number;
    max: number;
    step: number;
    default: number;
  };
  presencePenalty?: {
    min: number;
    max: number;
    step: number;
    default: number;
  };
}

export interface AIConfig {
  provider: ProviderType;
  model: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  theme: 'light' | 'dark' | 'system';
}

export interface Conversation {
  id: string;
  title: string;
  messages: AIMessage[];
  createdAt: number;
  updatedAt: number;
  model: string;
  provider: ProviderType;
}
