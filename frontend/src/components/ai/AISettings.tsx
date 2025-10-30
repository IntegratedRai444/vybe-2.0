import React, { useState, useEffect } from 'react';
import { useAI, ProviderType, PROVIDER_MODELS } from './AIProvider';
import { Dialog, Transition } from '@headlessui/react';
import { FiSettings, FiX, FiCheck, FiAlertCircle } from 'react-icons/fi';

interface AISettingsProps {
  onSave: () => boolean;
  isSaving: boolean;
  onApiKeyChange: (key: string) => void;
  onProviderChange: (provider: ProviderType) => void;
  onModelChange: (model: string) => void;
}

export const AISettings: React.FC<AISettingsProps> = ({
  onSave,
  isSaving,
  onApiKeyChange,
  onProviderChange,
  onModelChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<ProviderType>('ollama');
  const [model, setModel] = useState('llama3');
  const [error, setError] = useState<string | null>(null);

  const { provider: currentProvider, model: currentModel } = useAI();

  // Initialize form with current values
  useEffect(() => {
    setProvider(currentProvider);
    setModel(currentModel);
  }, [currentProvider, currentModel]);

  const handleSave = () => {
    try {
      onProviderChange(provider);
      onModelChange(model);
      if (apiKey) {
        onApiKeyChange(apiKey);
      }
      
      const success = onSave();
      if (success) {
        setIsOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  };

  const availableModels = PROVIDER_MODELS[provider] || [];
  const selectedModel = availableModels.find(m => m.id === model) || availableModels[0];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-1.5 rounded-md hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
        title="AI Settings"
      >
        <FiSettings className="h-5 w-5" />
      </button>

      <Transition.Root show={isOpen} as={React.Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => !isSaving && setIsOpen(false)}>
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={React.Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                  <div className="absolute right-0 top-0 pr-4 pt-4">
                    <button
                      type="button"
                      className="rounded-md bg-gray-800 text-gray-400 hover:text-gray-500 focus:outline-none"
                      onClick={() => !isSaving && setIsOpen(false)}
                      disabled={isSaving}
                    >
                      <span className="sr-only">Close</span>
                      <FiX className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                  
                  <div>
                    <div className="mt-3 text-center sm:mt-0 sm:text-left">
                      <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">
                        AI Settings
                      </Dialog.Title>
                      
                      <div className="mt-4 space-y-4">
                        {/* Provider Selection */}
                        <div>
                          <label htmlFor="provider" className="block text-sm font-medium text-gray-300">
                            AI Provider
                          </label>
                          <select
                            id="provider"
                            name="provider"
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-700 text-white border"
                            value={provider}
                            onChange={(e) => {
                              const newProvider = e.target.value as ProviderType;
                              setProvider(newProvider);
                              // Reset model when provider changes
                              const models = PROVIDER_MODELS[newProvider] || [];
                              if (models.length > 0) {
                                setModel(models[0].id);
                              }
                            }}
                            disabled={isSaving}
                          >
                            <option value="ollama">Ollama (Local)</option>
                            <option value="openai">OpenAI</option>
                            <option value="anthropic">Anthropic</option>
                            <option value="groq">Groq</option>
                          </select>
                        </div>

                        {/* Model Selection */}
                        <div>
                          <label htmlFor="model" className="block text-sm font-medium text-gray-300">
                            Model
                          </label>
                          <select
                            id="model"
                            name="model"
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-700 text-white border"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            disabled={isSaving || availableModels.length === 0}
                          >
                            {availableModels.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.name}
                                {model.description ? ` - ${model.description}` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* API Key */}
                        {provider !== 'ollama' && (
                          <div>
                            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300">
                              API Key
                            </label>
                            <div className="mt-1">
                              <input
                                type="password"
                                id="apiKey"
                                name="apiKey"
                                placeholder={`Enter your ${provider.charAt(0).toUpperCase() + provider.slice(1)} API key`}
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-600 rounded-md bg-gray-700 text-white border p-2"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                disabled={isSaving}
                              />
                            </div>
                            <p className="mt-1 text-xs text-gray-400">
                              Your API key is stored locally and only sent to the selected provider.
                            </p>
                          </div>
                        )}

                        {/* Model Info */}
                        {selectedModel && (
                          <div className="p-3 bg-gray-700/50 rounded-md text-sm text-gray-300">
                            <h4 className="font-medium text-white">{selectedModel.name}</h4>
                            {selectedModel.description && (
                              <p className="mt-1">{selectedModel.description}</p>
                            )}
                            {selectedModel.maxTokens && (
                              <p className="mt-1 text-xs">
                                Max tokens: {selectedModel.maxTokens.toLocaleString()}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Error Message */}
                  {error && (
                    <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-md text-sm text-red-200 flex items-start">
                      <FiAlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleSave}
                      disabled={isSaving || (provider !== 'ollama' && !apiKey.trim())}
                    >
                      {isSaving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        <>
                          <FiCheck className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-600 shadow-sm px-4 py-2 bg-gray-700 text-base font-medium text-gray-200 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                      onClick={() => setIsOpen(false)}
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
};

export default AISettings;
