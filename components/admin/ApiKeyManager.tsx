/**
 * API Key Manager Component
 * Allows users to configure AI providers, API keys, and models in the Admin panel.
 */

import { useState, useEffect } from "react";
import { AiProvider } from "../../types";
import { AVAILABLE_AI_PROVIDERS_CONFIG } from "../../constants";

// Storage key for API settings
const API_SETTINGS_STORAGE_KEY = "rfp_ai_api_settings";

interface ProviderSettings {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

interface StoredApiSettings {
  providers: Record<string, ProviderSettings>;
  selectedProvider: AiProvider;
}

// Icons
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
  </svg>
);

const KeyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M8 7a5 5 0 113.61 4.804l-1.903 1.903A1 1 0 019 14H8v1a1 1 0 01-1 1H6v1a1 1 0 01-1 1H3a1 1 0 01-1-1v-2a1 1 0 01.293-.707L8.196 8.39A5.002 5.002 0 018 7zm5-3a.75.75 0 000 1.5A1.5 1.5 0 0114.5 7 .75.75 0 0016 7a3 3 0 00-3-3z" clipRule="evenodd" />
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
    <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
  </svg>
);

const EyeSlashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z" clipRule="evenodd" />
    <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" />
  </svg>
);

// Load settings from localStorage
function loadApiSettings(): StoredApiSettings {
  try {
    const stored = localStorage.getItem(API_SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Handle migration from old format
      if (parsed.providers) {
        return parsed;
      }
      // Migrate old format to new format
      const { selectedProvider, ...providerSettings } = parsed;
      return {
        providers: providerSettings,
        selectedProvider: selectedProvider || AiProvider.GEMINI,
      };
    }
  } catch (e) {
    console.error("Failed to load API settings:", e);
  }
  return { providers: {}, selectedProvider: AiProvider.GEMINI };
}

// Save settings to localStorage
function saveApiSettings(settings: StoredApiSettings): void {
  try {
    localStorage.setItem(API_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save API settings:", e);
  }
}

// Get current API key for a provider (from localStorage or env)
export function getApiKeyForProvider(provider: AiProvider): string | undefined {
  const settings = loadApiSettings();
  const providerSettings = settings.providers[provider];

  if (providerSettings?.apiKey) {
    return providerSettings.apiKey;
  }

  // Fallback to env variable
  const config = AVAILABLE_AI_PROVIDERS_CONFIG[provider];
  if (config?.apiKeyEnvVar) {
    return (import.meta.env as Record<string, string>)[config.apiKeyEnvVar];
  }

  return undefined;
}

// Get current model for a provider
export function getModelForProvider(provider: AiProvider): string {
  const settings = loadApiSettings();
  const providerSettings = settings.providers[provider];

  if (providerSettings?.model) {
    return providerSettings.model;
  }

  return AVAILABLE_AI_PROVIDERS_CONFIG[provider]?.defaultModel || "";
}

// Get selected provider
export function getSelectedProvider(): AiProvider {
  const settings = loadApiSettings();
  return settings.selectedProvider || AiProvider.GEMINI;
}

// Fetch available models dynamically from provider APIs
async function fetchGeminiModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (!response.ok) {
      console.error("Failed to fetch Gemini models:", response.status);
      return [];
    }
    const data = await response.json();
    // Filter for models that support generateContent
    return (data.models || [])
      .filter((m: any) =>
        m.supportedGenerationMethods?.includes("generateContent") &&
        m.name?.startsWith("models/gemini")
      )
      .map((m: any) => m.name.replace("models/", ""))
      .sort((a: string, b: string) => {
        // Sort by version (2.0 > 1.5) and type (pro > flash > lite)
        const getScore = (name: string) => {
          let score = 0;
          if (name.includes("2.0")) score += 100;
          else if (name.includes("1.5")) score += 50;
          if (name.includes("pro")) score += 10;
          else if (name.includes("flash") && !name.includes("lite")) score += 5;
          return score;
        };
        return getScore(b) - getScore(a);
      });
  } catch (error) {
    console.error("Error fetching Gemini models:", error);
    return [];
  }
}

async function fetchOpenAIModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.data || [])
      .filter((m: any) => m.id.startsWith("gpt-"))
      .map((m: any) => m.id)
      .sort();
  } catch (error) {
    console.error("Error fetching OpenAI models:", error);
    return [];
  }
}

// Main Component
export function ApiKeyManager() {
  const [settings, setSettings] = useState<StoredApiSettings>(loadApiSettings);
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>(settings.selectedProvider || AiProvider.GEMINI);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [dynamicModels, setDynamicModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const providerConfig = AVAILABLE_AI_PROVIDERS_CONFIG[selectedProvider];

  // Load settings when provider changes
  useEffect(() => {
    const providerSettings = settings.providers[selectedProvider];
    setApiKey(providerSettings?.apiKey || "");
    setModel(providerSettings?.model || providerConfig?.defaultModel || "");
    setBaseUrl(providerSettings?.baseUrl || "");
    setTestStatus("idle");
    setTestMessage("");
    setDynamicModels([]);
  }, [selectedProvider, settings, providerConfig]);

  // Fetch models dynamically when API key is entered
  const handleFetchModels = async () => {
    if (!apiKey) {
      setTestMessage("Please enter an API key first to fetch available models");
      setTestStatus("error");
      return;
    }

    setLoadingModels(true);
    let models: string[] = [];

    if (selectedProvider === AiProvider.GEMINI) {
      models = await fetchGeminiModels(apiKey);
    } else if (selectedProvider === AiProvider.OPENAI) {
      models = await fetchOpenAIModels(apiKey);
    }

    setDynamicModels(models);
    setLoadingModels(false);

    if (models.length > 0) {
      setTestMessage(`Found ${models.length} available models`);
      setTestStatus("success");
      // Auto-select first model if current model isn't in the list
      if (!models.includes(model)) {
        setModel(models[0]);
      }
    } else {
      setTestMessage("Could not fetch models. Check your API key.");
      setTestStatus("error");
    }
  };

  const handleProviderChange = (provider: AiProvider) => {
    setSelectedProvider(provider);
    const newSettings = { ...settings, selectedProvider: provider };
    setSettings(newSettings);
    saveApiSettings(newSettings);
  };

  const handleSave = () => {
    const newSettings: StoredApiSettings = {
      selectedProvider,
      providers: {
        ...settings.providers,
        [selectedProvider]: {
          apiKey,
          model,
          ...(baseUrl && { baseUrl }),
        },
      },
    };
    setSettings(newSettings);
    saveApiSettings(newSettings);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);

    // Dispatch event so other components can react
    window.dispatchEvent(new CustomEvent("api-settings-changed", { detail: newSettings }));
  };

  const handleTest = async () => {
    if (!apiKey && providerConfig?.requiresApiKeyInUI) {
      setTestStatus("error");
      setTestMessage("Please enter an API key first");
      return;
    }

    setTestStatus("testing");
    setTestMessage("Testing connection...");

    try {
      if (selectedProvider === AiProvider.GEMINI) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "Say 'API key is valid' in 3 words" }] }],
            }),
          }
        );

        if (response.ok) {
          setTestStatus("success");
          setTestMessage("Connection successful! API key is valid.");
        } else {
          const error = await response.json();
          setTestStatus("error");
          setTestMessage(error.error?.message || "Connection failed");
        }
      } else if (selectedProvider === AiProvider.OPENAI) {
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });

        if (response.ok) {
          setTestStatus("success");
          setTestMessage("Connection successful! API key is valid.");
        } else {
          setTestStatus("error");
          setTestMessage("Invalid API key");
        }
      } else {
        // For other providers, just save and assume it works
        setTestStatus("success");
        setTestMessage("Settings saved. Test the connection by running an evaluation.");
      }
    } catch (error) {
      setTestStatus("error");
      setTestMessage(error instanceof Error ? error.message : "Connection test failed");
    }
  };

  const providers = Object.entries(AVAILABLE_AI_PROVIDERS_CONFIG).map(([key, config]) => ({
    id: key as AiProvider,
    name: config.name,
    models: config.models,
    requiresKey: config.requiresApiKeyInUI,
    requiresBaseUrl: config.requiresBaseUrl,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <KeyIcon />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            AI Provider Settings
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure your AI provider, API key, and model
          </p>
        </div>
      </div>

      {/* Provider Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          AI Provider
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {providers.map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleProviderChange(provider.id)}
              className={`px-4 py-3 text-sm rounded-lg border-2 transition-all ${
                selectedProvider === provider.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300"
              }`}
            >
              {provider.name}
            </button>
          ))}
        </div>
      </div>

      {/* API Key Input */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          API Key {!providerConfig?.requiresApiKeyInUI && "(Optional - uses env variable)"}
        </label>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={`Enter your ${providerConfig?.name || "API"} key`}
            className="w-full px-4 py-2.5 pr-20 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showKey ? <EyeSlashIcon /> : <EyeIcon />}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          {selectedProvider === AiProvider.GEMINI && (
            <>Get your API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google AI Studio</a></>
          )}
          {selectedProvider === AiProvider.OPENAI && (
            <>Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">OpenAI Platform</a></>
          )}
          {selectedProvider === AiProvider.ANTHROPIC && (
            <>Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Anthropic Console</a></>
          )}
        </p>
      </div>

      {/* Model Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Model
          </label>
          {(selectedProvider === AiProvider.GEMINI || selectedProvider === AiProvider.OPENAI) && (
            <button
              onClick={handleFetchModels}
              disabled={loadingModels || !apiKey}
              className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loadingModels ? "Fetching..." : "Fetch Available Models"}
            </button>
          )}
        </div>
        {/* Show dynamic models if available, otherwise show static list or input */}
        {dynamicModels.length > 0 ? (
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {dynamicModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        ) : providerConfig?.models && providerConfig.models.length > 0 ? (
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {providerConfig.models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Enter model name"
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        )}
        {(selectedProvider === AiProvider.GEMINI || selectedProvider === AiProvider.OPENAI) && dynamicModels.length === 0 && (
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            Enter your API key and click "Fetch Available Models" to see all available models
          </p>
        )}
      </div>

      {/* Base URL (for Ollama/LM Studio) */}
      {providerConfig?.requiresBaseUrl && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Base URL
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://localhost:11434"
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      {/* Test Result */}
      {testStatus !== "idle" && (
        <div
          className={`p-4 rounded-lg ${
            testStatus === "testing"
              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
              : testStatus === "success"
              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
              : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {testStatus === "testing" && (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {testStatus === "success" && <CheckIcon />}
            <span>{testMessage}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleTest}
          disabled={testStatus === "testing"}
          className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {testStatus === "testing" ? "Testing..." : "Test Connection"}
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          {saveStatus === "saved" ? (
            <>
              <CheckIcon /> Saved!
            </>
          ) : (
            "Save Settings"
          )}
        </button>
      </div>

      {/* Current Status */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Configuration</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Provider:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-100">{providerConfig?.name}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Model:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-100">{model || "Not set"}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">API Key:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-100">
              {apiKey ? "***" + apiKey.slice(-4) : "Not set"}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Source:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-100">
              {apiKey ? "UI Configuration" : "Environment Variable"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApiKeyManager;
