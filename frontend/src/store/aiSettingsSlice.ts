import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type ProviderType = 'ollama' | 'openai' | 'anthropic' | 'groq';

export interface AISettingsState {
  provider: ProviderType;
  model: string;
  temperature: number;
  isSettingsOpen: boolean;
  availableProviders: {
    id: ProviderType;
    name: string;
    isAvailable: boolean;
  }[];
}

const loadSettings = (): Partial<AISettingsState> => {
  if (typeof window === 'undefined') return {};
  const saved = localStorage.getItem('aiSettings');
  return saved ? JSON.parse(saved) : {};
};

const saveSettings = (state: AISettingsState) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('aiSettings', JSON.stringify({
      provider: state.provider,
      model: state.model,
      temperature: state.temperature,
    }));
  }
};

const initialState: AISettingsState = {
  provider: 'ollama',
  model: 'llama3:latest',
  temperature: 0.7,
  isSettingsOpen: false,
  availableProviders: [
    { id: 'ollama', name: 'Ollama', isAvailable: true },
    { id: 'openai', name: 'OpenAI', isAvailable: false },
    { id: 'anthropic', name: 'Anthropic', isAvailable: false },
    { id: 'groq', name: 'Groq', isAvailable: false },
  ],
  ...loadSettings(),
};

const aiSettingsSlice = createSlice({
  name: 'aiSettings',
  initialState,
  reducers: {
    setProvider: (state, action: PayloadAction<ProviderType>) => {
      state.provider = action.payload;
      // Reset to first available model when changing provider
      const providerModels = PROVIDER_MODELS[action.payload] || [];
      if (providerModels.length > 0) {
        state.model = providerModels[0].id;
      }
      saveSettings(state);
    },
    setModel: (state, action: PayloadAction<string>) => {
      state.model = action.payload;
      saveSettings(state);
    },
    setTemperature: (state, action: PayloadAction<number>) => {
      state.temperature = action.payload;
      saveSettings(state);
    },
    toggleSettings: (state) => {
      state.isSettingsOpen = !state.isSettingsOpen;
    },
    setProviderAvailability: (
      state,
      action: PayloadAction<{ provider: ProviderType; isAvailable: boolean }>
    ) => {
      const provider = state.availableProviders.find(p => p.id === action.payload.provider);
      if (provider) {
        provider.isAvailable = action.payload.isAvailable;
      }
    },
  },
});

// Provider models configuration
const PROVIDER_MODELS: Record<ProviderType, Array<{ id: string; name: string }>> = {
  ollama: [
    { id: 'llama3:latest', name: 'Llama 3 (Latest)' },
    { id: 'codellama:7b-instruct', name: 'CodeLlama 7B' },
    { id: 'deepseek-coder:6.7b', name: 'DeepSeek Coder' },
  ],
  openai: [
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  ],
  anthropic: [
    { id: 'claude-3-opus', name: 'Claude 3 Opus' },
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
    { id: 'claude-3-haiku', name: 'Claude 3 Haiku' },
  ],
  groq: [
    { id: 'llama3-70b-8192', name: 'Llama 3 70B' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
  ],
};

export const {
  setProvider,
  setModel,
  setTemperature,
  toggleSettings,
  setProviderAvailability,
} = aiSettingsSlice.actions;

export const selectAISettings = (state: { aiSettings: AISettingsState }) => state.aiSettings;

export const selectCurrentProviderModels = (state: { aiSettings: AISettingsState }) => 
  PROVIDER_MODELS[state.aiSettings.provider] || [];

export default aiSettingsSlice.reducer;
