import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
// Remove or replace with actual utility functions you need
const cn = (...classes: string[]) => classes.filter(Boolean).join(' ');

export type ProviderType = 'ollama' | 'openai' | 'anthropic' | 'groq';

interface ModelConfig {
  id: string;
  name: string;
  maxTokens?: number;
  description?: string;
}

type ProviderModels = {
  [key in ProviderType]: ModelConfig[];
};

const PROVIDER_MODELS: ProviderModels = {
  ollama: [
    { id: 'llama2', name: 'Llama 2', description: 'Meta\'s open source large language model' },
    { id: 'codellama', name: 'CodeLlama', description: 'Code generation specialized model' },
    { id: 'mistral', name: 'Mistral', description: 'Efficient small language model' },
  ],
  openai: [
    { id: 'gpt-4', name: 'GPT-4', maxTokens: 8192, description: 'Most capable model, great for complex tasks' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', maxTokens: 4096, description: 'Fast and cost-effective for most tasks' },
  ],
  anthropic: [
    { id: 'claude-2', name: 'Claude 2', maxTokens: 100000, description: 'Large context window, great for documents' },
    { id: 'claude-instant', name: 'Claude Instant', maxTokens: 100000, description: 'Faster, lighter version of Claude 2' },
  ],
  groq: [
    { id: 'llama2-70b', name: 'Llama 2 70B', maxTokens: 4096, description: 'Large 70B parameter model' },
    { id: 'mixtral-8x7b', name: 'Mixtral 8x7B', maxTokens: 32768, description: 'High quality mixture of experts model' },
  ],
};

const PROVIDER_MODELS = {
  ollama: [
    { id: 'llama2', name: 'Llama 2' },
    { id: 'codellama', name: 'CodeLlama' },
    { id: 'mistral', name: 'Mistral' },
  ],
  openai: [
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  ],
  anthropic: [
    { id: 'claude-2', name: 'Claude 2' },
    { id: 'claude-instant', name: 'Claude Instant' },
  ],
  groq: [
    { id: 'llama2-70b', name: 'Llama 2 70B' },
    { id: 'mixtral-8x7b', name: 'Mixtral 8x7B' },
  ],
};

interface AIProviderSelectorProps {
  value: ProviderType;
  model: string;
  apiKey: string;
  onProviderChange: (provider: ProviderType) => void;
  onModelChange: (model: string) => void;
  onApiKeyChange: (key: string) => void;
  onSave: () => Promise<boolean>;
  className?: string;
  isSaving?: boolean;
  error?: string | null;
  isLoading?: boolean;
}

export const getDefaultModel = (provider: ProviderType): string => {
  return PROVIDER_MODELS[provider]?.[0]?.id || '';
};

export const AIProviderSelector: React.FC<AIProviderSelectorProps> = ({
  value: provider,
  model,
  apiKey,
  onProviderChange,
  onModelChange,
  onApiKeyChange,
  onSave,
  className = '',
  isSaving = false,
  error = null,
  isLoading = false,
}) => {
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [isSaved, setIsSaved] = useState(false);
  const models = PROVIDER_MODELS[provider] || [];
  const needsApiKey = provider !== 'ollama';
  const selectedModel = models.find(m => m.id === model) || models[0];

  useEffect(() => {
    setLocalApiKey(apiKey);
  }, [apiKey]);

  useEffect(() => {
    if (models.length > 0 && !models.some(m => m.id === model)) {
      onModelChange(getDefaultModel(provider));
    }
  }, [provider, models, model, onModelChange]);

  const handleSave = async () => {
    onApiKeyChange(localApiKey);
    const success = await onSave();
    if (success) {
      setIsSaved(true);
      const timer = setTimeout(() => setIsSaved(false), 3000);
      return () => clearTimeout(timer);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <div className={cn('space-y-6 p-6 border rounded-lg bg-background shadow-sm', className)}>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">AI Settings</h3>
        <p className="text-sm text-muted-foreground">Configure your AI provider and model preferences</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">AI Provider</label>
          <Select 
            value={provider} 
            onValueChange={onProviderChange}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ollama">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Ollama (Local)</span>
                </div>
              </SelectItem>
              <SelectItem value="openai">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>OpenAI</span>
                </div>
              </SelectItem>
              <SelectItem value="anthropic">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Anthropic</span>
                </div>
              </SelectItem>
              <SelectItem value="groq">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span>Groq</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Model</label>
          <Select value={model} onValueChange={onModelChange} disabled={isLoading}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{m.name}</span>
                    {m.description && (
                      <span className="text-xs text-muted-foreground">{m.description}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedModel?.maxTokens && (
            <p className="text-xs text-muted-foreground mt-1">
              Max tokens: {selectedModel.maxTokens.toLocaleString()}
            </p>
          )}
        </div>

        {needsApiKey && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">
                API Key
              </label>
              <span className="text-xs text-muted-foreground">
                {provider === 'openai' 
                  ? 'Get your OpenAI API key from platform.openai.com/account/api-keys'
                  : provider === 'anthropic' 
                    ? 'Get your Anthropic API key from console.anthropic.com/settings/keys'
                    : 'Get your Groq API key from console.groq.com/keys'}
              </span>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type="password"
                  value={localApiKey}
                  onChange={(e) => setLocalApiKey(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Enter your ${provider} API key`}
                  className={cn('pr-10', error && 'border-red-500')}
                  disabled={isLoading || isSaving}
                />
                {error && (
                  <AlertCircle className="h-4 w-4 text-red-500 absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>
              <Button 
                onClick={handleSave} 
                disabled={isSaving || isLoading || !localApiKey}
                className="min-w-[100px]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isSaved ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                    Saved
                  </>
                ) : (
                  'Save API Key'
                )}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIProviderSelector;
