import { DEFAULT_AI_CORE_PROMPT_TEMPLATE, DEFAULT_SYSTEM_INSTRUCTIONS, AVAILABLE_AI_PROVIDERS_CONFIG } from "../constants";
import { AiProvider, AiSettings, ProviderConfig, EvaluationCriterionKey } from "../types";

export const AI_SETTINGS_STORAGE_KEY = "aiSettings";
export const LEGACY_AI_SETTINGS_STORAGE_KEY = "rfp_ai_api_settings";

type LegacyStoredSettings = {
  providers?: Record<string, { apiKey?: string; model?: string; baseUrl?: string }>;
  selectedProvider?: AiProvider;
};

const safeParseJson = <T>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const buildDefaultAiSettings = (): AiSettings => {
  const defaultConfigs: Partial<Record<AiProvider, ProviderConfig>> = {};
  (Object.keys(AiProvider) as Array<keyof typeof AiProvider>).forEach((key) => {
    const providerKey = AiProvider[key];
    defaultConfigs[providerKey] = {
      apiKey: "",
      model: AVAILABLE_AI_PROVIDERS_CONFIG[providerKey]?.defaultModel || "",
      baseUrl:
        providerKey === AiProvider.OLLAMA
          ? "http://localhost:11434"
          : providerKey === AiProvider.LM_STUDIO
            ? "http://localhost:1234/v1"
            : undefined,
    };
  });

  return {
    selectedProvider: AiProvider.GEMINI,
    providerConfigs: defaultConfigs,
    corePromptTemplate: DEFAULT_AI_CORE_PROMPT_TEMPLATE,
    systemInstructions: { ...DEFAULT_SYSTEM_INSTRUCTIONS },
    useAiForEvaluation: false,
  };
};

const mergeWithDefaults = (settings: Partial<AiSettings>): AiSettings => {
  const defaults = buildDefaultAiSettings();
  const mergedProviders: Partial<Record<AiProvider, ProviderConfig>> = { ...defaults.providerConfigs };

  if (settings.providerConfigs) {
    (Object.keys(defaults.providerConfigs) as AiProvider[]).forEach((provider) => {
      mergedProviders[provider] = {
        ...(defaults.providerConfigs[provider] || {}),
        ...(settings.providerConfigs?.[provider] || {}),
      };
    });
  }

  const mergedInstructions: Partial<Record<EvaluationCriterionKey, string | undefined>> = {
    ...defaults.systemInstructions,
    ...(settings.systemInstructions || {}),
  };

  return {
    ...defaults,
    ...settings,
    providerConfigs: mergedProviders,
    systemInstructions: mergedInstructions,
  };
};

const loadFromLegacyStorage = (): AiSettings | null => {
  const legacy = safeParseJson<LegacyStoredSettings>(
    typeof localStorage !== "undefined" ? localStorage.getItem(LEGACY_AI_SETTINGS_STORAGE_KEY) : null
  );
  if (!legacy) return null;

  const defaults = buildDefaultAiSettings();
  const providerConfigs: Partial<Record<AiProvider, ProviderConfig>> = { ...defaults.providerConfigs };
  const legacyProviders = legacy.providers || {};

  (Object.keys(AiProvider) as Array<keyof typeof AiProvider>).forEach((key) => {
    const provider = AiProvider[key];
    const value = legacyProviders[provider];
    if (value) {
      providerConfigs[provider] = {
        ...(providerConfigs[provider] || {}),
        apiKey: value.apiKey || "",
        model: value.model || providerConfigs[provider]?.model || "",
        baseUrl: value.baseUrl || providerConfigs[provider]?.baseUrl,
      };
    }
  });

  return mergeWithDefaults({
    selectedProvider: legacy.selectedProvider || defaults.selectedProvider,
    providerConfigs,
  });
};

export const loadAiSettingsFromStorage = (): AiSettings => {
  if (typeof localStorage === "undefined") return buildDefaultAiSettings();

  const stored = safeParseJson<Partial<AiSettings>>(localStorage.getItem(AI_SETTINGS_STORAGE_KEY));
  if (stored && stored.providerConfigs) {
    return mergeWithDefaults(stored);
  }

  const migrated = loadFromLegacyStorage();
  if (migrated) {
    saveAiSettingsToStorage(migrated);
    localStorage.removeItem(LEGACY_AI_SETTINGS_STORAGE_KEY);
    return migrated;
  }

  return buildDefaultAiSettings();
};

export const saveAiSettingsToStorage = (settings: AiSettings): void => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  localStorage.removeItem(LEGACY_AI_SETTINGS_STORAGE_KEY);
};

export const getProviderConfigFromStorage = (provider: AiProvider): ProviderConfig | undefined => {
  return loadAiSettingsFromStorage().providerConfigs[provider];
};
