import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

type ProviderType = "ollama" | "openai" | "anthropic" | "groq";

interface AIModel {
  id: string;
  name: string;
}

interface AIProvider {
  id: ProviderType;
  name: string;
  isAvailable: boolean;
  models: AIModel[];
}

interface AISettingsState {
  provider: ProviderType;
  model: string;
  temperature: number;
  isSettingsOpen: boolean;
  providers: AIProvider[];
  setProvider: (provider: ProviderType) => void;
  setModel: (model: string) => void;
  setTemperature: (temperature: number) => void;
  toggleSettings: () => void;
  setProviderAvailability: (
    provider: ProviderType,
    isAvailable: boolean,
  ) => void;
  getCurrentProvider: () => AIProvider | undefined;
  getCurrentModel: () => AIModel | undefined;
}

// Provider models configuration
const PROVIDER_MODELS: Record<ProviderType, AIModel[]> = {
  ollama: [
    { id: "llama3:latest", name: "Llama 3 (Latest)" },
    { id: "codellama:7b-instruct", name: "CodeLlama 7B" },
    { id: "deepseek-coder:6.7b", name: "DeepSeek Coder" },
  ],
  openai: [
    { id: "gpt-4", name: "GPT-4" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
  ],
  anthropic: [
    { id: "claude-3-opus", name: "Claude 3 Opus" },
    { id: "claude-3-sonnet", name: "Claude 3 Sonnet" },
    { id: "claude-3-haiku", name: "Claude 3 Haiku" },
  ],
  groq: [
    { id: "llama3-70b-8192", name: "Llama 3 70B" },
    { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" },
  ],
};

const DEFAULT_PROVIDER: ProviderType = "ollama";
const DEFAULT_MODEL = "llama3:latest";

export const useAISettingsStore = create<AISettingsState>()(
  devtools(
    persist(
      (set, get) => ({
        provider: DEFAULT_PROVIDER,
        model: DEFAULT_MODEL,
        temperature: 0.7,
        isSettingsOpen: false,
        providers: Object.entries({
          ollama: { name: "Ollama", isAvailable: true },
          openai: { name: "OpenAI", isAvailable: false },
          anthropic: { name: "Anthropic", isAvailable: false },
          groq: { name: "Groq", isAvailable: false },
        }).map(([id, { name, isAvailable }]) => ({
          id: id as ProviderType,
          name,
          isAvailable,
          models: PROVIDER_MODELS[id as ProviderType] || [],
        })),

        setProvider: (provider) => {
          const { models } = get().providers.find((p) => p.id === provider) || {
            models: [],
          };
          set({
            provider,
            model: models[0]?.id || "",
          });
        },

        setModel: (model) => set({ model }),

        setTemperature: (temperature) =>
          set({ temperature: Math.max(0, Math.min(1, temperature)) }),

        toggleSettings: () =>
          set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),

        setProviderAvailability: (provider, isAvailable) =>
          set((state) => ({
            providers: state.providers.map((p) =>
              p.id === provider ? { ...p, isAvailable } : p,
            ),
          })),

        getCurrentProvider: () => {
          const { provider, providers } = get();
          return providers.find((p) => p.id === provider);
        },

        getCurrentModel: () => {
          const { model, getCurrentProvider } = get();
          const provider = getCurrentProvider();
          return provider?.models.find((m) => m.id === model);
        },
      }),
      {
        name: "vybe-ai-settings",
        partialize: (state) => ({
          provider: state.provider,
          model: state.model,
          temperature: state.temperature,
        }),
      },
    ),
    { name: "AISettings" },
  ),
);

// Export hooks for convenience
export const useAISettings = () =>
  useAISettingsStore((state) => ({
    provider: state.provider,
    model: state.model,
    temperature: state.temperature,
    isSettingsOpen: state.isSettingsOpen,
    currentProvider: state.getCurrentProvider(),
    currentModel: state.getCurrentModel(),
    providers: state.providers,
    providerModels: state.getCurrentProvider()?.models || [],
  }));

export const useAISettingsActions = () =>
  useAISettingsStore((state) => ({
    setProvider: state.setProvider,
    setModel: state.setModel,
    setTemperature: state.setTemperature,
    toggleSettings: state.toggleSettings,
    setProviderAvailability: state.setProviderAvailability,
  }));
