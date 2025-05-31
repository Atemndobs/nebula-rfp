

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminViewProps, EvaluationCriterionKey, NebulaLogixCriterion, CriterionItem, AiProvider, ProviderConfig, AiSettings } from '../types'; 
import { GEMINI_ENV_API_KEY_ERROR_MESSAGE, API_KEY_ERROR_MESSAGE, DEFAULT_AI_CORE_PROMPT_TEMPLATE, DEFAULT_SYSTEM_INSTRUCTIONS, NEBULA_LOGIX_CRITERIA_CONFIG, MIN_AUTO_REFRESH_INTERVAL_HOURS, AVAILABLE_AI_PROVIDERS_CONFIG } from '../constants';
import LoadingSpinner from './LoadingSpinner';
import { fetchOllamaModels } from '../services/ollamaService';
import { fetchLmStudioModels } from '../services/lmStudioService';


const AiIconSvg = ({ active, className }: { active: boolean, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`${className || 'w-5 h-5'} ${active ? 'text-vercel-blue' : 'text-accents-5 dark:text-accents-4'}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 21v-1.5M15.75 3v1.5m3.75 3.75H21m-3.75 0H21m-3.75 0H21m0 0v1.5m0 0v1.5m0 0v1.5m0 0v1.5M12 5.25c-3.443 0-6.201 2.644-6.682 6H3.75a.75.75 0 000 1.5h1.568c.48 3.356 3.24 6 6.682 6s6.201-2.644 6.682-6h1.568a.75.75 0 000-1.5h-1.568c-.48-3.356-3.24-6-6.682-6zM12 8.25a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z" clipRule="evenodd" />
  </svg>
);

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.25 12L17 13.75M17 8.25L18.25 12M12 17l1.75-1M8.25 17L12 17M12 18.25L10.25 20M13.75 20L12 18.25M12 5.25L10.25 4M13.75 4L12 5.25" />
    </svg>
);


const AdminView: React.FC<AdminViewProps> = ({
  criteriaConfig,
  onToggleMasterCriterion,
  onToggleCriterionItem,
  aiSettings,
  onUpdateAiSettings,
  onAutoImproveCorePrompt,
  isImprovingPrompt,
  autoRefreshIntervalHours,
  onUpdateAutoRefreshInterval,
  isGeminiConfiguredViaEnv,
}) => {
  const allCriterionKeys = Object.keys(criteriaConfig) as EvaluationCriterionKey[];
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});
  
  const [editableCorePrompt, setEditableCorePrompt] = useState(aiSettings.corePromptTemplate);
  const [editableSystemInstructions, setEditableSystemInstructions] = useState<Partial<Record<EvaluationCriterionKey, string>>>({...aiSettings.systemInstructions});
  const [localRefreshInterval, setLocalRefreshInterval] = useState<string>(String(autoRefreshIntervalHours));

  const [localProviderConfigs, setLocalProviderConfigs] = useState<Partial<Record<AiProvider, ProviderConfig>>>(
    JSON.parse(JSON.stringify(aiSettings.providerConfigs)) 
  );

  const [ollamaModelsList, setOllamaModelsList] = useState<string[]>([]);
  const [isFetchingOllamaModels, setIsFetchingOllamaModels] = useState<boolean>(false);
  const [ollamaModelsError, setOllamaModelsError] = useState<string | null>(null);

  const [lmStudioModelsList, setLmStudioModelsList] = useState<string[]>([]);
  const [isFetchingLmStudioModels, setIsFetchingLmStudioModels] = useState<boolean>(false);
  const [lmStudioModelsError, setLmStudioModelsError] = useState<string | null>(null);


  useEffect(() => {
    setEditableCorePrompt(aiSettings.corePromptTemplate);
  }, [aiSettings.corePromptTemplate]);

  useEffect(() => {
    setEditableSystemInstructions({...aiSettings.systemInstructions});
  }, [aiSettings.systemInstructions]);

  useEffect(() => {
    setLocalRefreshInterval(String(autoRefreshIntervalHours));
  }, [autoRefreshIntervalHours]);

  useEffect(() => {
    // Deep copy to avoid direct state mutation issues, especially with nested objects.
    const currentConfigs = JSON.parse(JSON.stringify(aiSettings.providerConfigs));
    
    // Ensure all provider keys exist in localProviderConfigs, initializing with defaults if necessary.
    const defaultSettings = getDefaultAiSettings().providerConfigs;
    for (const providerKey in defaultSettings) {
        const pKey = providerKey as AiProvider;
        if (!currentConfigs[pKey]) {
            currentConfigs[pKey] = defaultSettings[pKey];
        } else {
            // Ensure model and baseUrl have fallbacks from defaults if missing in saved settings.
            currentConfigs[pKey] = {
                ...defaultSettings[pKey], // provides default model/baseUrl
                ...currentConfigs[pKey], // saved apiKey overrides default
            };
        }
    }
    setLocalProviderConfigs(currentConfigs);
  }, [aiSettings.providerConfigs]);


  useEffect(() => {
    if (aiSettings.selectedProvider !== AiProvider.OLLAMA) {
      setOllamaModelsList([]);
      setOllamaModelsError(null);
      setIsFetchingOllamaModels(false);
    }
    if (aiSettings.selectedProvider !== AiProvider.LM_STUDIO) {
      setLmStudioModelsList([]);
      setLmStudioModelsError(null);
      setIsFetchingLmStudioModels(false);
    }
  }, [aiSettings.selectedProvider]);

  const currentOllamaBaseUrl = localProviderConfigs[AiProvider.OLLAMA]?.baseUrl;
  useEffect(() => {
    setOllamaModelsList([]);
    setOllamaModelsError(null);
    setIsFetchingOllamaModels(false);
  }, [currentOllamaBaseUrl]);

  const currentLmStudioBaseUrl = localProviderConfigs[AiProvider.LM_STUDIO]?.baseUrl;
  useEffect(() => {
    setLmStudioModelsList([]);
    setLmStudioModelsError(null);
    setIsFetchingLmStudioModels(false);
  }, [currentLmStudioBaseUrl]);


  const toggleCriterionDetail = (key: EvaluationCriterionKey) => {
    setExpandedDetails(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleApplyRefreshInterval = () => {
    const newIntervalNum = parseInt(localRefreshInterval, 10);
    if (!isNaN(newIntervalNum) && newIntervalNum >= MIN_AUTO_REFRESH_INTERVAL_HOURS) {
      onUpdateAutoRefreshInterval(newIntervalNum);
    } else {
      setLocalRefreshInterval(String(autoRefreshIntervalHours)); 
      alert(`Minimum refresh interval is ${MIN_AUTO_REFRESH_INTERVAL_HOURS} hour(s).`);
    }
  };
  
  const handleSelectedProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as AiProvider;
    onUpdateAiSettings(prev => ({...prev, selectedProvider: newProvider}));
  };

  const handleProviderConfigChange = (
    provider: AiProvider,
    field: 'apiKey' | 'model' | 'baseUrl', 
    value: string
  ) => {
    setLocalProviderConfigs(prev => {
      const newConfigs = { ...prev };
      const currentProviderSpecificConfig = newConfigs[provider] || {};
      
      newConfigs[provider] = {
        ...currentProviderSpecificConfig,
        [field]: value,
      };
      return newConfigs;
    });
  };
  
  const handleSaveProviderConfig = (provider: AiProvider) => {
      onUpdateAiSettings(prev => ({
          ...prev,
          providerConfigs: {
              ...prev.providerConfigs,
              [provider]: {
                  ...(prev.providerConfigs[provider] || {}), 
                  ...(localProviderConfigs[provider] || {}), 
              }
          }
      }));
      alert(`${AVAILABLE_AI_PROVIDERS_CONFIG[provider]?.name || provider} configuration saved locally.`);
  };

  const handleFetchOllamaModels = async () => {
    const ollamaBaseUrl = localProviderConfigs[AiProvider.OLLAMA]?.baseUrl;
    if (!ollamaBaseUrl) {
      setOllamaModelsError("Ollama Base URL is not configured.");
      setOllamaModelsList([]);
      return;
    }
    setIsFetchingOllamaModels(true);
    setOllamaModelsError(null);
    try {
      const models = await fetchOllamaModels(ollamaBaseUrl);
      if (models.length > 0) {
        setOllamaModelsList(models);
        // Auto-select first model if none is selected
        if (models.length > 0 && !localProviderConfigs[AiProvider.OLLAMA]?.model) {
          handleProviderConfigChange(AiProvider.OLLAMA, 'model', models[0]);
        }
      } else {
        setOllamaModelsError("No models found at the specified Ollama instance, or an error occurred during fetch. Check console.");
        setOllamaModelsList([]);
      }
    } catch (error) {
      setOllamaModelsError(error instanceof Error ? error.message : "Failed to fetch Ollama models. Check console for details.");
      setOllamaModelsList([]);
    } finally {
      setIsFetchingOllamaModels(false);
    }
  };

  const handleFetchLmStudioModels = async () => {
    const lmStudioBaseUrl = localProviderConfigs[AiProvider.LM_STUDIO]?.baseUrl;
    if (!lmStudioBaseUrl) {
      setLmStudioModelsError("LM Studio Base URL is not configured. Example: http://localhost:1234/v1");
      setLmStudioModelsList([]);
      return;
    }
    setIsFetchingLmStudioModels(true);
    setLmStudioModelsError(null);
    try {
      const models = await fetchLmStudioModels(lmStudioBaseUrl);
      if (models.length > 0) {
        setLmStudioModelsList(models);
         if (models.length > 0 && !localProviderConfigs[AiProvider.LM_STUDIO]?.model) {
          // If no model is currently set for LM Studio, auto-select the first one from the fetched list.
          handleProviderConfigChange(AiProvider.LM_STUDIO, 'model', models[0]);
        }
      } else {
        setLmStudioModelsError("No models found at the specified LM Studio instance, or endpoint doesn't list models. Ensure a model is loaded and the server is running. Check console.");
        setLmStudioModelsList([]);
      }
    } catch (error) {
      setLmStudioModelsError(error instanceof Error ? error.message : "Failed to fetch LM Studio models. Check server logs and console for details.");
      setLmStudioModelsList([]);
    } finally {
      setIsFetchingLmStudioModels(false);
    }
  };

  // Helper function to ensure all AI Provider config objects exist
  const getDefaultAiSettings = (): AiSettings => {
      const defaultConfigs: Partial<Record<AiProvider, ProviderConfig>> = {};
      (Object.keys(AiProvider) as Array<keyof typeof AiProvider>).forEach(key => {
          const providerKey = AiProvider[key];
          defaultConfigs[providerKey] = {
              apiKey: '',
              model: AVAILABLE_AI_PROVIDERS_CONFIG[providerKey]?.defaultModel || '',
              baseUrl: providerKey === AiProvider.OLLAMA ? 'http://localhost:11434' : (providerKey === AiProvider.LM_STUDIO ? 'http://localhost:1234/v1' : undefined),
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

  const currentSelectedProviderConfig = AVAILABLE_AI_PROVIDERS_CONFIG[aiSettings.selectedProvider];
  const isCurrentProviderConfigured = useMemo(() => {
    const provider = aiSettings.selectedProvider;
    const config = aiSettings.providerConfigs[provider]; // Use app-level config for this check
    if (provider === AiProvider.GEMINI) {
        return isGeminiConfiguredViaEnv;
    }
    if (provider === AiProvider.OLLAMA || provider === AiProvider.LM_STUDIO) {
        return !!config?.baseUrl && !!config?.model; // Both require a base URL and a model to be considered configured
    }
    // For other API key based providers, also require a model to be configured
    return !!config?.apiKey && !!config?.model;
  }, [aiSettings.selectedProvider, aiSettings.providerConfigs, isGeminiConfiguredViaEnv]);


  const buttonBaseClasses = "px-3 py-1.5 text-xs font-medium border rounded-md shadow-vercel-sm transition-colors focus:outline-none focus:ring-2 focus:ring-vercel-blue focus:ring-offset-1 dark:focus:ring-offset-dark-accents-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center";
  const primaryButtonClasses = `${buttonBaseClasses} bg-geist-foreground dark:bg-dark-geist-foreground text-white dark:text-dark-geist-background hover:opacity-90`;
  const activeToggleButtonClasses = `${buttonBaseClasses} bg-vercel-blue text-white border-vercel-blue hover:bg-opacity-90`;
  const inactiveToggleButtonClasses = `${buttonBaseClasses} bg-white dark:bg-dark-accents-1 text-geist-secondary dark:text-dark-geist-secondary border-accents-2 dark:border-dark-accents-2 hover:border-accents-4 dark:hover:border-accents-5 hover:text-geist-foreground dark:hover:text-dark-geist-foreground`;
  const inputBaseClasses = "p-2 border border-accents-2 dark:border-dark-accents-2 rounded-md shadow-vercel-sm text-sm bg-geist-background dark:bg-dark-accents-1 text-geist-foreground dark:text-dark-geist-foreground placeholder-accents-4 dark:placeholder-accents-5 focus:ring-2 focus:ring-vercel-blue focus:border-vercel-blue";
  const selectBaseClasses = `${inputBaseClasses} pr-8`;

  const renderCriterionSubItems = (criterion: NebulaLogixCriterion) => {
    const itemsToRender: CriterionItem[] = criterion.keywords || criterion.preferredCategories || [];
    const useTwoColumns = itemsToRender.length > 8; // Threshold for using two columns

    if (itemsToRender.length === 0 && criterion.detailsSummary) {
        return <p className="text-xs text-geist-secondary dark:text-dark-geist-secondary">{criterion.detailsSummary}</p>;
    }
    if (itemsToRender.length === 0) {
        return <p className="text-xs text-geist-secondary dark:text-dark-geist-secondary">No configurable sub-items for this criterion.</p>;
    }

    return (
      <div className={`pl-2 max-h-60 overflow-y-auto ${useTwoColumns ? 'grid grid-cols-1 sm:grid-cols-2 gap-x-4' : 'space-y-1.5'}`}>
        {itemsToRender.map(item => (
          <label 
            key={item.value} 
            htmlFor={`criterion-${criterion.key}-${item.value}`} 
            className={`flex items-center cursor-pointer p-1 hover:bg-accents-2 dark:hover:bg-dark-accents-8/30 rounded ${useTwoColumns ? '' : ''}`} /* No specific class needed for item in grid */
          >
            <input
              type="checkbox"
              id={`criterion-${criterion.key}-${item.value}`}
              checked={item.enabled}
              onChange={(e) => onToggleCriterionItem(criterion.key, item.value, e.target.checked)}
              disabled={!criterion.isMasterEnabled} 
              className="h-3.5 w-3.5 rounded border-accents-3 dark:border-accents-5 text-vercel-blue focus:ring-vercel-blue focus:ring-1 focus:ring-offset-0 bg-white dark:bg-dark-accents-1"
            />
            <span className={`ml-2 text-xs ${!criterion.isMasterEnabled ? 'text-accents-4 dark:text-accents-5' : 'text-geist-secondary dark:text-dark-geist-secondary'}`}>{item.value}</span>
          </label>
        ))}
      </div>
    );
  };
  
  const noMasterCriteriaEnabled = !allCriterionKeys.some(key => criteriaConfig[key].isMasterEnabled);

  const systemInstructionRelevantCriteria = [
      EvaluationCriterionKey.TECHNICAL_RELEVANCE,
      EvaluationCriterionKey.SCOPE_FIT,
      EvaluationCriterionKey.SKILL_SET_ALIGNMENT
  ];

  return (
    <div className="bg-white dark:bg-dark-accents-1 p-6 sm:p-8 rounded-lg shadow-vercel-md border border-accents-2 dark:border-dark-accents-2">
      <h2 className="text-2xl font-semibold text-geist-foreground dark:text-dark-geist-foreground mb-6 pb-4 border-b border-accents-2 dark:border-dark-accents-2">
        Admin & Configuration
      </h2>
      
       <section className="mb-8">
        <h3 className="text-lg font-medium text-geist-foreground dark:text-dark-geist-foreground mb-1">
          Automatic RFP Refresh Settings
        </h3>
        <p className="text-sm text-geist-secondary dark:text-dark-geist-secondary mb-3">
          Configure how often the application automatically checks for new RFPs. Minimum interval is {MIN_AUTO_REFRESH_INTERVAL_HOURS} hour.
        </p>
        <div className="p-4 bg-accents-1 dark:bg-dark-accents-2 border border-accents-2 dark:border-dark-accents-2 rounded-md">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <label htmlFor="refreshInterval" className="text-sm text-geist-foreground dark:text-dark-geist-foreground whitespace-nowrap">
              Refresh RFPs every (hours):
            </label>
            <input
              type="number"
              id="refreshInterval"
              value={localRefreshInterval}
              onChange={(e) => setLocalRefreshInterval(e.target.value)}
              min={MIN_AUTO_REFRESH_INTERVAL_HOURS}
              className={`${inputBaseClasses} w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
              aria-label="Auto refresh interval in hours"
            />
            <button onClick={handleApplyRefreshInterval} className={primaryButtonClasses}>
              Apply Interval
            </button>
          </div>
          <p className="text-xs text-geist-secondary dark:text-dark-geist-secondary mt-2">
            Current auto-refresh interval: <strong>{autoRefreshIntervalHours} hour(s)</strong>.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-medium text-geist-foreground dark:text-dark-geist-foreground mb-1">
          Global AI Analysis Settings
        </h3>
        <p className="text-sm text-geist-secondary dark:text-dark-geist-secondary mb-4">
          Select an AI provider and configure its settings. Enable or disable AI for enhanced analysis of keyword-based criteria. If disabled or not configured, basic keyword matching will be used.
        </p>
        
        <div className="p-4 bg-accents-1 dark:bg-dark-accents-2 border border-accents-2 dark:border-dark-accents-2 rounded-md">
            <div className="mb-4">
                <label htmlFor="aiProviderSelect" className="block text-sm font-medium text-geist-foreground dark:text-dark-geist-foreground mb-1">Select AI Provider:</label>
                <select
                    id="aiProviderSelect"
                    value={aiSettings.selectedProvider}
                    onChange={handleSelectedProviderChange}
                    className={selectBaseClasses + " w-full sm:w-auto"}
                    aria-label="Select AI Provider"
                >
                    {(Object.keys(AiProvider) as Array<keyof typeof AiProvider>).map(key => (
                        <option key={AiProvider[key]} value={AiProvider[key]}>
                            {AVAILABLE_AI_PROVIDERS_CONFIG[AiProvider[key]]?.name || AiProvider[key]}
                        </option>
                    ))}
                </select>
            </div>

            {currentSelectedProviderConfig && (
                <div className="mb-4 p-3 border border-accents-3 dark:border-dark-accents-8/50 rounded-md bg-white dark:bg-dark-accents-1">
                    <h4 className="text-sm font-medium text-geist-foreground dark:text-dark-geist-foreground mb-2">
                        Configure {currentSelectedProviderConfig.name}
                    </h4>
                    {currentSelectedProviderConfig.requiresApiKeyInUI && (
                        <div className="mb-3">
                            <label htmlFor={`${aiSettings.selectedProvider}-apiKey`} className="block text-xs font-medium text-geist-secondary dark:text-dark-geist-secondary mb-1">API Key:</label>
                            <input
                                type="password"
                                id={`${aiSettings.selectedProvider}-apiKey`}
                                placeholder={`Enter ${currentSelectedProviderConfig.name} API Key`}
                                value={localProviderConfigs[aiSettings.selectedProvider]?.apiKey || ''}
                                onChange={(e) => handleProviderConfigChange(aiSettings.selectedProvider, 'apiKey', e.target.value)}
                                className={`${inputBaseClasses} w-full text-xs`}
                                aria-label={`${currentSelectedProviderConfig.name} API Key`}
                            />
                        </div>
                    )}
                    {/* Specific explanatory text for Gemini API Key */}
                    {aiSettings.selectedProvider === AiProvider.GEMINI && !currentSelectedProviderConfig.requiresApiKeyInUI && (
                        <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border border-blue-200 dark:border-blue-700 rounded-md">
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                <strong>Important for Gemini:</strong> The API key for Google Gemini is configured **exclusively** via the <code>API_KEY</code> environment variable (<code>process.env.API_KEY</code>) due to project guidelines.
                                There is no UI input field for the Gemini API key.
                            </p>
                        </div>
                    )}

                    {(currentSelectedProviderConfig?.requiresBaseUrl) && (
                         <div className="mb-3">
                            <label htmlFor={`${aiSettings.selectedProvider}-baseUrl`} className="block text-xs font-medium text-geist-secondary dark:text-dark-geist-secondary mb-1">Base URL:</label>
                            <input
                                type="text"
                                id={`${aiSettings.selectedProvider}-baseUrl`}
                                placeholder={aiSettings.selectedProvider === AiProvider.OLLAMA ? "http://localhost:11434" : (aiSettings.selectedProvider === AiProvider.LM_STUDIO ? "http://localhost:1234/v1" : "Enter Base URL")}
                                value={localProviderConfigs[aiSettings.selectedProvider]?.baseUrl || ''}
                                onChange={(e) => handleProviderConfigChange(aiSettings.selectedProvider, 'baseUrl', e.target.value)}
                                className={`${inputBaseClasses} w-full text-xs`}
                                aria-label={`${currentSelectedProviderConfig.name} Base URL`}
                            />
                             {aiSettings.selectedProvider === AiProvider.LM_STUDIO && <p className="text-xs text-geist-secondary dark:text-dark-geist-secondary mt-1">Ensure your LM Studio local server is running and the URL includes the <code>/v1</code> path for OpenAI compatibility.</p>}
                        </div>
                    )}
                    <div className="mb-3">
                      {/* Model Input */}
                      {aiSettings.selectedProvider === AiProvider.OLLAMA && (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <label htmlFor={`${AiProvider.OLLAMA}-model`} className="block text-xs font-medium text-geist-secondary dark:text-dark-geist-secondary">Model:</label>
                            <button
                              onClick={handleFetchOllamaModels}
                              disabled={isFetchingOllamaModels || !localProviderConfigs[AiProvider.OLLAMA]?.baseUrl}
                              className={`${primaryButtonClasses} text-xs px-2 py-0.5`}
                              title={!localProviderConfigs[AiProvider.OLLAMA]?.baseUrl ? "Configure Base URL first" : "Fetch available models from Ollama"}
                            >
                              {isFetchingOllamaModels ? <LoadingSpinner size="sm" /> : "Fetch Models"}
                            </button>
                          </div>
                          {isFetchingOllamaModels && <p className="text-xs text-geist-secondary dark:text-dark-geist-secondary">Fetching...</p>}
                          {ollamaModelsError && <p className="text-xs text-red-500 dark:text-red-400">{ollamaModelsError}</p>}
                          
                          {!isFetchingOllamaModels && ollamaModelsList.length > 0 ? (
                            <select
                              id={`${AiProvider.OLLAMA}-model`}
                              value={localProviderConfigs[AiProvider.OLLAMA]?.model || ''}
                              onChange={(e) => handleProviderConfigChange(AiProvider.OLLAMA, 'model', e.target.value)}
                              className={selectBaseClasses + " w-full text-xs"}
                              aria-label="Ollama model"
                            >
                              <option value="" disabled>Select a model</option>
                              {ollamaModelsList.map(modelName => (
                                <option key={modelName} value={modelName}>{modelName}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              id={`${AiProvider.OLLAMA}-model-fallback`}
                              placeholder={currentSelectedProviderConfig?.defaultModel || "Enter model name/tag"}
                              value={localProviderConfigs[AiProvider.OLLAMA]?.model || currentSelectedProviderConfig?.defaultModel || ""}
                              onChange={(e) => handleProviderConfigChange(AiProvider.OLLAMA, 'model', e.target.value)}
                              className={`${inputBaseClasses} w-full text-xs`}
                              aria-label={`${currentSelectedProviderConfig?.name || 'Ollama'} model name`}
                            />
                          )}
                           <p className="text-xs text-geist-secondary dark:text-dark-geist-secondary mt-1">
                            If models are fetched, select from the list. Otherwise, manually enter the model name (e.g., llama3:latest).
                          </p>
                        </>
                      )}
                      {aiSettings.selectedProvider === AiProvider.LM_STUDIO && (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <label htmlFor={`${AiProvider.LM_STUDIO}-model`} className="block text-xs font-medium text-geist-secondary dark:text-dark-geist-secondary">Model:</label>
                            <button
                              onClick={handleFetchLmStudioModels}
                              disabled={isFetchingLmStudioModels || !localProviderConfigs[AiProvider.LM_STUDIO]?.baseUrl}
                              className={`${primaryButtonClasses} text-xs px-2 py-0.5`}
                              title={!localProviderConfigs[AiProvider.LM_STUDIO]?.baseUrl ? "Configure Base URL first (incl. /v1)" : "Fetch available models from LM Studio"}
                            >
                              {isFetchingLmStudioModels ? <LoadingSpinner size="sm" /> : "Fetch Models"}
                            </button>
                          </div>
                          {isFetchingLmStudioModels && <p className="text-xs text-geist-secondary dark:text-dark-geist-secondary">Fetching...</p>}
                          {lmStudioModelsError && <p className="text-xs text-red-500 dark:text-red-400">{lmStudioModelsError}</p>}
                          
                          {!isFetchingLmStudioModels && lmStudioModelsList.length > 0 ? (
                            <select
                              id={`${AiProvider.LM_STUDIO}-model`}
                              value={localProviderConfigs[AiProvider.LM_STUDIO]?.model || ''}
                              onChange={(e) => handleProviderConfigChange(AiProvider.LM_STUDIO, 'model', e.target.value)}
                              className={selectBaseClasses + " w-full text-xs"}
                              aria-label="LM Studio model"
                            >
                              <option value="" disabled>Select a loaded model</option>
                              {lmStudioModelsList.map(modelName => (
                                <option key={modelName} value={modelName}>{modelName}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              id={`${AiProvider.LM_STUDIO}-model-fallback`}
                              placeholder={currentSelectedProviderConfig?.defaultModel || "Manually enter model identifier"}
                              value={localProviderConfigs[AiProvider.LM_STUDIO]?.model || currentSelectedProviderConfig?.defaultModel || ""}
                              onChange={(e) => handleProviderConfigChange(AiProvider.LM_STUDIO, 'model', e.target.value)}
                              className={`${inputBaseClasses} w-full text-xs`}
                              aria-label={`${currentSelectedProviderConfig?.name || 'LM Studio'} model name`}
                            />
                          )}
                           <p className="text-xs text-geist-secondary dark:text-dark-geist-secondary mt-1">
                            Fetch lists models available via the API. Ensure the desired model is loaded in LM Studio. The "model" field should be the identifier (e.g., path) that LM Studio's API expects.
                          </p>
                        </>
                      )}
                      {aiSettings.selectedProvider !== AiProvider.OLLAMA && aiSettings.selectedProvider !== AiProvider.LM_STUDIO && (
                        <>
                          <label htmlFor={`${aiSettings.selectedProvider}-model`} className="block text-xs font-medium text-geist-secondary dark:text-dark-geist-secondary mb-1">Model:</label>
                          {currentSelectedProviderConfig?.models.length > 1 ? ( // Show dropdown if multiple models defined
                               <select
                                  id={`${aiSettings.selectedProvider}-model`}
                                  value={localProviderConfigs[aiSettings.selectedProvider]?.model || currentSelectedProviderConfig.defaultModel}
                                  onChange={(e) => handleProviderConfigChange(aiSettings.selectedProvider, 'model', e.target.value)}
                                  className={selectBaseClasses + " w-full text-xs"}
                                  aria-label={`${currentSelectedProviderConfig.name} model selection`}
                              >
                                  {currentSelectedProviderConfig.models.map(modelName => (
                                      <option key={modelName} value={modelName}>{modelName}</option>
                                  ))}
                              </select>
                          ) : ( // Show disabled input if only one model (like for Gemini) or text input if models array is empty
                               <input
                                  type="text"
                                  id={`${aiSettings.selectedProvider}-model`}
                                  placeholder={currentSelectedProviderConfig?.defaultModel || "Enter model name/tag"}
                                  value={localProviderConfigs[aiSettings.selectedProvider]?.model || currentSelectedProviderConfig?.defaultModel || ""}
                                  onChange={(e) => handleProviderConfigChange(aiSettings.selectedProvider, 'model', e.target.value)}
                                  className={`${inputBaseClasses} w-full text-xs`}
                                  aria-label={`${currentSelectedProviderConfig?.name} model name`}
                                  disabled={currentSelectedProviderConfig?.models.length === 1 && aiSettings.selectedProvider === AiProvider.GEMINI}
                              />
                          )}
                        </>
                      )}
                    </div>

                    {/* Explanatory text for Gemini Model selection and costs */}
                    {aiSettings.selectedProvider === AiProvider.GEMINI && (
                        <div className="mt-2 mb-3 p-2 text-xs bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border border-blue-200 dark:border-blue-700 rounded-md text-blue-700 dark:text-blue-300">
                            <p><strong>Model Availability & Costs for Gemini:</strong></p>
                            <ul className="list-disc list-inside ml-2">
                                <li>This application uses <code>{AVAILABLE_AI_PROVIDERS_CONFIG[AiProvider.GEMINI].defaultModel}</code>, the model designated for text analysis tasks by project guidelines.</li>
                                <li>Other Gemini models (e.g., for image generation) are not applicable to this app's function and are not listed.</li>
                                <li>Dynamic listing of all available Gemini models is not implemented.</li>
                                <li>Model cost information is not available through the Gemini SDK. Please refer to the official Google Cloud AI Platform or Google AI Studio pricing pages for current cost details.</li>
                            </ul>
                        </div>
                    )}

                    <button onClick={() => handleSaveProviderConfig(aiSettings.selectedProvider)} className={`${primaryButtonClasses} text-xs px-2.5 py-1`}>Save {currentSelectedProviderConfig.name} Config</button>
                </div>
            )}

            <div className="flex items-center space-x-3">
                <button
                    onClick={() => onUpdateAiSettings(prev => ({...prev, useAiForEvaluation: !prev.useAiForEvaluation}))}
                    disabled={!isCurrentProviderConfigured}
                    className={aiSettings.useAiForEvaluation && isCurrentProviderConfigured ? activeToggleButtonClasses : inactiveToggleButtonClasses}
                    aria-pressed={aiSettings.useAiForEvaluation && isCurrentProviderConfigured}
                    title={!isCurrentProviderConfigured ? `${aiSettings.selectedProvider} not configured` : (aiSettings.useAiForEvaluation ? `Disable ${aiSettings.selectedProvider} AI Analysis` : `Enable ${aiSettings.selectedProvider} AI Analysis`)}
                >
                    <AiIconSvg active={aiSettings.useAiForEvaluation && isCurrentProviderConfigured} className="w-4 h-4" />
                    <span className="ml-1.5">{aiSettings.selectedProvider} AI Analysis</span>
                </button>
                <span className={`text-xs font-medium ${aiSettings.useAiForEvaluation && isCurrentProviderConfigured ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isCurrentProviderConfigured ? (aiSettings.useAiForEvaluation ? 'ENABLED' : 'DISABLED') : 'NOT AVAILABLE'}
                </span>
            </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-medium text-geist-foreground dark:text-dark-geist-foreground mb-1">
          AI Core Prompt for Keyword Analysis
        </h3>
        <p className="text-sm text-geist-secondary dark:text-dark-geist-secondary mb-2">
          This is the main prompt sent to the selected AI to analyze RFP text for keywords and return a structured JSON response.
          You can customize it, but ensure it retains the placeholders <code>{"{{TEXT_TO_ANALYZE}}"}</code> and <code>{"{{TARGET_KEYWORDS_LIST}}"}</code>,
          and continues to request a JSON output like: <code>{`{"foundKeywords": [], "isMatch": boolean}`}</code>.
        </p>
        <textarea
          value={editableCorePrompt}
          onChange={(e) => setEditableCorePrompt(e.target.value)}
          rows={10}
          className="w-full p-2 border border-accents-2 dark:border-dark-accents-2 rounded-md shadow-vercel-sm text-xs font-mono bg-geist-background dark:bg-dark-accents-1 text-geist-foreground dark:text-dark-geist-foreground placeholder-accents-4 dark:placeholder-accents-5 focus:ring-2 focus:ring-vercel-blue focus:border-vercel-blue"
          aria-label="AI Core Prompt Template"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => onUpdateAiSettings({ corePromptTemplate: editableCorePrompt })} className={primaryButtonClasses}>Save Core Prompt</button>
          <button onClick={() => { 
              onUpdateAiSettings({ corePromptTemplate: DEFAULT_AI_CORE_PROMPT_TEMPLATE }); 
              setEditableCorePrompt(DEFAULT_AI_CORE_PROMPT_TEMPLATE); 
            }} className={inactiveToggleButtonClasses}>Reset to Default</button>
          <button 
            onClick={onAutoImproveCorePrompt} 
            className={`${inactiveToggleButtonClasses} ${isImprovingPrompt ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!isCurrentProviderConfigured || isImprovingPrompt || aiSettings.selectedProvider !== AiProvider.GEMINI}
            title={!isCurrentProviderConfigured ? `${aiSettings.selectedProvider} not configured` : (aiSettings.selectedProvider !== AiProvider.GEMINI ? "Improve prompt feature only available for Gemini currently" : "Ask Gemini to improve this prompt")}
          >
            {isImprovingPrompt ? <LoadingSpinner size="sm" /> : <SparklesIcon />}
            Improve with AI {aiSettings.selectedProvider !== AiProvider.GEMINI ? "(Gemini only)" : ""}
          </button>
        </div>
         <div className="mt-3 text-xs text-geist-secondary dark:text-dark-geist-secondary p-2 bg-accents-1 dark:bg-dark-accents-2 rounded-md border border-accents-2 dark:border-dark-accents-2">
            <strong>Prompting Tips:</strong>
            <ul className="list-disc list-inside ml-2">
                <li>Be explicit about the desired JSON output structure.</li>
                <li>Clearly define what <code>{"{{TEXT_TO_ANALYZE}}"}</code> and <code>{"{{TARGET_KEYWORDS_LIST}}"}</code> represent.</li>
                <li>Instruct the model not to include any conversational text or markdown formatting around the JSON.</li>
                <li>If the AI struggles, try simplifying the request or being more prescriptive. Different AIs may need different phrasing.</li>
            </ul>
        </div>
      </section>
      
      <section className="mb-8">
        <h3 className="text-lg font-medium text-geist-foreground dark:text-dark-geist-foreground mb-1">
          AI System Instructions per Criterion
        </h3>
        <p className="text-sm text-geist-secondary dark:text-dark-geist-secondary mb-4">
          For criteria that use AI, you can provide specific "system instructions" to guide the AI's behavior or persona for that particular analysis. These are optional.
        </p>
        <div className="space-y-3">
          {systemInstructionRelevantCriteria.map(criterionKey => {
            const currentInstruction = editableSystemInstructions[criterionKey] || DEFAULT_SYSTEM_INSTRUCTIONS[criterionKey] || '';
            return (
              <div key={criterionKey} className="p-3 bg-accents-1 dark:bg-dark-accents-2 border border-accents-2 dark:border-dark-accents-2 rounded-md">
                <label htmlFor={`sys-instr-${criterionKey}`} className="block text-sm font-medium text-geist-foreground dark:text-dark-geist-foreground mb-1">{criterionKey}</label>
                <textarea
                  id={`sys-instr-${criterionKey}`}
                  value={currentInstruction}
                  onChange={(e) => setEditableSystemInstructions(prev => ({...prev, [criterionKey]: e.target.value}))}
                  rows={3}
                  placeholder="Optional: e.g., You are an expert in..."
                  className="w-full p-2 border border-accents-2 dark:border-dark-accents-2 rounded-md shadow-vercel-sm text-xs bg-geist-background dark:bg-dark-accents-1 text-geist-foreground dark:text-dark-geist-foreground placeholder-accents-4 dark:placeholder-accents-5 focus:ring-2 focus:ring-vercel-blue focus:border-vercel-blue"
                  aria-label={`System instruction for ${criterionKey}`}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={() => onUpdateAiSettings(prev => ({...prev, systemInstructions: {...prev.systemInstructions, [criterionKey]: editableSystemInstructions[criterionKey] || ''}}))} className={primaryButtonClasses}>Save Instruction</button>
                  <button onClick={() => {
                      const defaultInstruction = NEBULA_LOGIX_CRITERIA_CONFIG[criterionKey]?.geminiSystemInstruction || DEFAULT_SYSTEM_INSTRUCTIONS[criterionKey] || '';
                      onUpdateAiSettings(prev => ({...prev, systemInstructions: {...prev.systemInstructions, [criterionKey]: defaultInstruction }}));
                      setEditableSystemInstructions(prev => ({...prev, [criterionKey]: defaultInstruction }));
                  }} className={inactiveToggleButtonClasses}>Reset Instruction</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>


      <section className="mb-8">
        <h3 className="text-lg font-medium text-geist-foreground dark:text-dark-geist-foreground mb-3">
          AI Provider API Key Notes
        </h3>
        <div className="p-4 bg-accents-1 dark:bg-dark-accents-2 border border-accents-2 dark:border-dark-accents-2 rounded-md text-sm text-geist-secondary dark:text-dark-geist-secondary">
            {aiSettings.selectedProvider === AiProvider.GEMINI && (
                <>
                    <p className="font-semibold mb-1">Google Gemini Configuration:</p>
                    <p>The Google Gemini API Key for this application <strong className="text-geist-foreground dark:text-dark-geist-foreground">must be configured exclusively via an environment variable</strong> named: <code>process.env.API_KEY</code>.
                    This is a security requirement defined by the project guidelines.</p>
                    <p className="mt-1"><strong className="text-geist-foreground dark:text-dark-geist-foreground">There is no UI input field for the Gemini API key.</strong> This setting cannot be changed through this user interface.</p>
                    <p className="mt-2">Current Gemini (via env) status: <strong className={isGeminiConfiguredViaEnv ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>{isGeminiConfiguredViaEnv ? "CONFIGURED (API_KEY env var found)" : GEMINI_ENV_API_KEY_ERROR_MESSAGE}</strong>.</p>
                </>
            )}
            {aiSettings.selectedProvider !== AiProvider.GEMINI && currentSelectedProviderConfig?.requiresApiKeyInUI && (
                <>
                    <p className="font-semibold mb-1">{currentSelectedProviderConfig.name} Configuration:</p>
                    <p>Enter your API key for {currentSelectedProviderConfig.name} in the designated field above. Keys are stored in your browser's local storage.</p>
                    <p className="mt-1">Alternatively, some setups might allow configuration via environment variables (e.g., <code>{currentSelectedProviderConfig?.apiKeyEnvVar || `${aiSettings.selectedProvider.toUpperCase()}_API_KEY`}</code>), but this application primarily uses the UI input for non-Gemini providers.</p>
                     <p className="mt-2">Current {currentSelectedProviderConfig.name} status (based on UI input): <strong className={isCurrentProviderConfigured ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>{isCurrentProviderConfigured ? "CONFIGURED" : "NOT CONFIGURED (API Key or Model missing in UI)"}</strong>.</p>
                </>
            )}
             {(aiSettings.selectedProvider === AiProvider.OLLAMA || aiSettings.selectedProvider === AiProvider.LM_STUDIO) && currentSelectedProviderConfig?.requiresBaseUrl && (
                <>
                    <p className="font-semibold mb-1">{currentSelectedProviderConfig.name} Configuration:</p>
                    <p>Enter the Base URL for your local {currentSelectedProviderConfig.name} instance (e.g., <code>{aiSettings.selectedProvider === AiProvider.OLLAMA ? "http://localhost:11434" : "http://localhost:1234/v1"}</code>). For LM Studio, ensure it includes the <code>/v1</code> path if targeting its OpenAI-compatible API.</p>
                    <p className="mt-2">Current {currentSelectedProviderConfig.name} status (based on UI input): <strong className={isCurrentProviderConfigured ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>{isCurrentProviderConfigured ? "CONFIGURED (Base URL & Model set)" : "NOT CONFIGURED (Base URL or Model missing)"}</strong>.</p>
                </>
            )}
            <p className="mt-3 text-xs italic">If the selected AI provider is not configured correctly, features relying on AI will use a basic keyword matching fallback, or may not work, even if "AI Analysis" is enabled.</p>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-medium text-geist-foreground dark:text-dark-geist-foreground mb-1">
          Evaluation Criteria Settings
        </h3>
        <p className="text-sm text-geist-secondary dark:text-dark-geist-secondary mb-4">
          Select which criteria to include in the RFP evaluation process. Enable/disable master criteria or individual sub-items. An RFP is considered a "Good Fit" if it meets the configured threshold of effectively enabled criteria.
        </p>
        <div className="space-y-2">
          {allCriterionKeys.map(criterionKey => {
            const criterion = criteriaConfig[criterionKey];
            return (
              <div key={criterion.key} className="bg-accents-1 dark:bg-dark-accents-2 border border-accents-2 dark:border-dark-accents-2 rounded-md">
                <div className="flex items-center justify-between p-3 hover:bg-accents-2 dark:hover:bg-dark-accents-8/50 transition-colors">
                  <label htmlFor={`criterion-master-${criterion.key}`} className="flex items-center flex-grow cursor-pointer">
                    <input
                      type="checkbox"
                      id={`criterion-master-${criterion.key}`}
                      checked={criterion.isMasterEnabled}
                      onChange={(e) => onToggleMasterCriterion(criterion.key, e.target.checked)}
                      className="h-4 w-4 rounded border-accents-3 dark:border-accents-5 text-vercel-blue focus:ring-vercel-blue focus:ring-1 focus:ring-offset-1 dark:focus:ring-offset-dark-accents-2 bg-white dark:bg-dark-accents-1"
                    />
                    <span className="ml-3 text-sm font-medium text-geist-foreground dark:text-dark-geist-foreground">{criterion.key}</span>
                    <span className="ml-2 text-xs text-geist-secondary dark:text-dark-geist-secondary truncate hidden sm:inline" title={criterion.description}> - {criterion.description.split(':')[0]}</span>
                  </label>
                  <button
                    onClick={() => toggleCriterionDetail(criterion.key)}
                    className="p-1 text-accents-5 dark:text-accents-4 hover:text-geist-foreground dark:hover:text-dark-geist-foreground rounded-md"
                    aria-expanded={!!expandedDetails[criterion.key]}
                    aria-controls={`criterion-details-${criterion.key}`}
                    title={expandedDetails[criterion.key] ? "Hide details" : "Show details"}
                  >
                    {expandedDetails[criterion.key] ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  </button>
                </div>
                {expandedDetails[criterion.key] && (
                  <div id={`criterion-details-${criterion.key}`} className="p-3 border-t border-accents-2 dark:border-dark-accents-2 text-xs text-geist-secondary dark:text-dark-geist-secondary bg-white dark:bg-dark-accents-1">
                    <p className="font-medium mb-1 text-sm text-geist-foreground dark:text-dark-geist-foreground">Sub-items / Keywords:</p>
                    {renderCriterionSubItems(criterion)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
         {noMasterCriteriaEnabled && (
            <p className="mt-3 text-xs text-red-600 dark:text-red-400">Warning: No master criteria are enabled. All RFPs will score 0 and not be considered a fit.</p>
        )}
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-medium text-geist-foreground dark:text-dark-geist-foreground mb-1">
          Add Custom Evaluation Criterion
        </h3>
        <div className="p-4 bg-accents-1 dark:bg-dark-accents-2 border border-accents-2 dark:border-dark-accents-2 rounded-md text-sm text-geist-secondary dark:text-dark-geist-secondary">
           <p>This feature (manually adding new evaluation criteria) is planned for a future update.</p>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-medium text-geist-foreground dark:text-dark-geist-foreground mb-3">
          Other Application Settings
        </h3>
        <div className="p-6 bg-accents-1 dark:bg-dark-accents-2 border border-accents-2 dark:border-dark-accents-2 rounded-md text-center">
          <p className="text-geist-secondary dark:text-dark-geist-secondary">
            This area is reserved for future application configurations.
          </p>
        </div>
      </section>
    </div>
  );
};

export default AdminView;
