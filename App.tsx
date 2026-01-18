
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from './convex/_generated/api';
import { RFPWithEvaluation, FilterState, SortConfig, EvaluationCriterionKey, RFP, ApiRfp, FetchRfpsResponse, RfpDetail, AppView, RfpSourceCategory, AdminViewProps, NebulaLogixCriterion, CriterionItem, AiSettings, AiProvider, ProviderConfig, KeywordAnalysisResult, RfpFitAnalysis } from './types';
import { fetchRfps, parseDeadlineFromTitleString } from './services/rfpDataService';
import { evaluateRfp, performBatchEvaluation } from './services/evaluationService';
import { isGeminiAvailable as isGeminiConfiguredViaEnvHook, generateTextWithGemini } from './services/geminiService';
import { generateFitAnalysis } from './services/fitAnalysisService';
import { NEBULA_LOGIX_CRITERIA_CONFIG, GEMINI_ENV_API_KEY_ERROR_MESSAGE, DEFAULT_AI_CORE_PROMPT_TEMPLATE, DEFAULT_SYSTEM_INSTRUCTIONS, META_PROMPT_FOR_AI_CORE_PROMPT_IMPROVEMENT, DEFAULT_AUTO_REFRESH_INTERVAL_HOURS, MIN_AUTO_REFRESH_INTERVAL_HOURS, AUTO_REFRESH_INTERVAL_KEY, AVAILABLE_AI_PROVIDERS_CONFIG, API_KEY_ERROR_MESSAGE } from './constants';
import RfpCard from './components/RfpCard';
import FilterControls from './components/FilterControls';
import LoadingSpinner from './components/LoadingSpinner';
import Modal from './components/Modal';
import ThemeSwitcher from './components/ThemeSwitcher';
import ViewSwitcher from './components/ViewSwitcher';
import RawDataView from './components/RawDataView';
import AdminView from './components/AdminView';
import SelectionControls from './components/SelectionControls';
import { exportRfpsToCsv } from './services/csvExportService';
import { ProviderLogo } from './components/AiProviderLogos';
import { AuthButtons } from './components/AuthButtons';
import LandingPage from './components/LandingPage';

type Theme = 'light' | 'dark';

const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const highlightKeywords = (text: string | undefined | null, keywords: string[]): string => {
  if (!text) return '';
  if (keywords.length === 0) return text;
  const regex = new RegExp(`\\b(${keywords.map(escapeRegExp).join('|')})\\b`, 'gi');
  return text.replace(regex, (match) => `<mark>${match}</mark>`);
};

const deepCloneCriteriaConfig = (config: Record<EvaluationCriterionKey, NebulaLogixCriterion>): Record<EvaluationCriterionKey, NebulaLogixCriterion> => {
  const newConfig: Partial<Record<EvaluationCriterionKey, NebulaLogixCriterion>> = {};
  for (const key in config) {
    if (Object.prototype.hasOwnProperty.call(config, key)) {
      const criterionKey = key as EvaluationCriterionKey;
      const originalCriterion = config[criterionKey];
      newConfig[criterionKey] = {
        ...originalCriterion,
        keywords: originalCriterion.keywords ? originalCriterion.keywords.map(kw => ({ ...kw })) : undefined,
        preferredCategories: originalCriterion.preferredCategories ? originalCriterion.preferredCategories.map(cat => ({ ...cat })) : undefined,
      };
    }
  }
  return newConfig as Record<EvaluationCriterionKey, NebulaLogixCriterion>;
};

// Helper to load from localStorage
const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const storedValue = localStorage.getItem(key);
    if (storedValue) {
      return JSON.parse(storedValue);
    }
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
  }
  return defaultValue;
};

// Helper to save to localStorage
const saveToLocalStorage = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

const LAST_SUCCESSFUL_RFP_FETCH_TIMESTAMP_KEY = 'lastSuccessfulRfpFetchTimestamp';

const formatTimestampToReadable = (timestamp: number | null, type: 'full' | 'relative' = 'full'): string => {
  if (timestamp === null) return 'N/A';
  const date = new Date(timestamp);
  const now = new Date();
  const diffSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (type === 'relative') {
    if (Math.abs(diffSeconds) < 60) return `${diffSeconds >= 0 ? 'in a moment' : 'moments ago'}`;
    if (Math.abs(diffMinutes) < 60) return `${diffMinutes >= 0 ? 'in ' : ''}${Math.abs(diffMinutes)} min${Math.abs(diffMinutes) > 1 ? 's' : ''}${diffMinutes < 0 ? ' ago' : ''}`;
    if (Math.abs(diffHours) < 24) return `${diffHours >= 0 ? 'in ' : ''}${Math.abs(diffHours)} hour${Math.abs(diffHours) > 1 ? 's' : ''}${diffHours < 0 ? ' ago' : ''}`;
  }

  // Fallback to full date format if not relative or outside common relative ranges
  return date.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

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

// Recommendation Icons
const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2 flex-shrink-0">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
  </svg>
);

const CrossCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2 flex-shrink-0">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
  </svg>
);

const ExclamationTriangleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2 flex-shrink-0">
    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
  </svg>
);


// Component to format and display text with simple markdown-like features
const FormattedTextDisplay: React.FC<{ text: string | undefined | null }> = ({ text }) => {
  if (!text) return <p className="text-sm text-geist-secondary dark:text-dark-geist-secondary">N/A</p>;

  const lines = text.split('\n');
  const elements: JSX.Element[] = [];
  let currentListType: 'ul' | 'ol' | null = null;
  let listItems: JSX.Element[] = [];

  const processInlineFormatting = (lineContent: string): string => {
    let processed = lineContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/__(.*?)__/g, '<strong>$1</strong>');
    return processed;
  };

  const flushList = () => {
    if (listItems.length > 0 && currentListType) {
      elements.push(
        currentListType === 'ul' ?
          <ul key={`list-${elements.length}`} className="list-disc pl-6 my-2 space-y-1 text-sm">{listItems}</ul> :
          <ol key={`list-${elements.length}`} className="list-decimal pl-6 my-2 space-y-1 text-sm">{listItems}</ol>
      );
      listItems = [];
    }
    currentListType = null;
  };

  lines.forEach((line, index) => {
    let originalLine = line.trim();

    // Handle "Recommendation: ..." lines with special styling
    if (originalLine.toLowerCase().startsWith('recommendation:')) {
      flushList();
      const recommendationValue = originalLine.substring(15).trimStart().toLowerCase();
      let icon = null;
      let styleClasses = "p-3 rounded-md border text-sm flex items-start my-2 "; // Added flex items-start

      if (recommendationValue.includes('decline')) {
        icon = <CrossCircleIcon />;
        styleClasses += 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300';
      } else if (recommendationValue.includes('pursue') || recommendationValue.includes('accept')) {
        icon = <CheckCircleIcon />;
        styleClasses += 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300';
      } else if (recommendationValue.includes('caution')) {
        icon = <ExclamationTriangleIcon />;
        styleClasses += 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300';
      } else {
        styleClasses += 'bg-accents-1 dark:bg-dark-accents-2 border-accents-2 dark:border-dark-accents-2'; // Default style
      }
      elements.push(
        <div key={index} className={styleClasses}>
          {icon}
          <span className="font-semibold" dangerouslySetInnerHTML={{ __html: processInlineFormatting(originalLine) }} />
        </div>
      );
      return;
    }
    // Handle "Justification: ..." lines, ensuring they follow the recommendation closely
    if (originalLine.toLowerCase().startsWith('justification:')) {
      // elements.push(<p key={index} className="text-sm mt-1 ml-7" dangerouslySetInnerHTML={{ __html: processInlineFormatting(originalLine) }} />); // Indent justification if recommendation has icon
      elements.push(<p key={index} className="text-sm mt-1" dangerouslySetInnerHTML={{ __html: processInlineFormatting(originalLine) }} />);
      return;
    }

    if (originalLine.match(/^\s*\*\*(.+?):\*\*\s*$/) || originalLine.match(/^\s*\*\*(.+?)\*\*\s*$/)) {
      flushList();
      elements.push(<h4 key={index} className="text-md font-semibold mt-3 mb-1.5 text-geist-foreground dark:text-dark-geist-foreground" dangerouslySetInnerHTML={{ __html: processInlineFormatting(originalLine.replace(/\*\*/g, '')) }} />);
      return;
    }
    if (originalLine.startsWith('### ')) {
      flushList();
      elements.push(<h5 key={index} className="text-sm font-semibold mt-2.5 mb-1 text-geist-foreground dark:text-dark-geist-foreground" dangerouslySetInnerHTML={{ __html: processInlineFormatting(originalLine.substring(4)) }} />);
      return;
    }
    if (originalLine.startsWith('## ')) {
      flushList();
      elements.push(<h4 key={index} className="text-md font-semibold mt-3 mb-1.5 text-geist-foreground dark:text-dark-geist-foreground" dangerouslySetInnerHTML={{ __html: processInlineFormatting(originalLine.substring(3)) }} />);
      return;
    }
    if (originalLine.startsWith('# ')) {
      flushList();
      elements.push(<h3 key={index} className="text-lg font-semibold mt-3.5 mb-2 text-geist-foreground dark:text-dark-geist-foreground" dangerouslySetInnerHTML={{ __html: processInlineFormatting(originalLine.substring(2)) }} />);
      return;
    }

    const ulMatch = originalLine.match(/^(?:\s*-\s+|\s*\*\s+)(.*)/);
    if (ulMatch) {
      if (currentListType !== 'ul') {
        flushList();
        currentListType = 'ul';
      }
      listItems.push(<li key={`${index}-li`} dangerouslySetInnerHTML={{ __html: processInlineFormatting(ulMatch[1]) }} />);
      return;
    }

    const olMatch = originalLine.match(/^\s*(\d+)\.\s+(.*)/);
    if (olMatch) {
      if (currentListType !== 'ol') {
        flushList();
        currentListType = 'ol';
      }
      listItems.push(<li key={`${index}-li`} dangerouslySetInnerHTML={{ __html: processInlineFormatting(olMatch[2]) }} />);
      return;
    }

    flushList();
    if (originalLine !== '') {
      elements.push(<p key={index} className="text-sm mb-1.5" dangerouslySetInnerHTML={{ __html: processInlineFormatting(originalLine) }} />);
    }
  });

  flushList();

  return <div className="space-y-1">{elements}</div>;
};


const App: React.FC = () => {
  const [allRfps, setAllRfps] = useState<RFPWithEvaluation[]>([]);
  const [rawApiData, setRawApiData] = useState<ApiRfp[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeminiConfiguredViaEnv, setIsGeminiConfiguredViaEnv] = useState<boolean>(false);
  const [theme, setTheme] = useState<Theme>(() => loadFromLocalStorage<Theme>('theme', 'light'));
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [selectedRfpIds, setSelectedRfpIds] = useState<Set<string>>(new Set());
  const [lastSuccessfulFetchTime, setLastSuccessfulFetchTime] = useState<number | null>(
    () => loadFromLocalStorage<number | null>(LAST_SUCCESSFUL_RFP_FETCH_TIMESTAMP_KEY, null)
  );
  const [nextScheduledRefreshTime, setNextScheduledRefreshTime] = useState<number | null>(null);
  const [autoRefreshIntervalHours, setAutoRefreshIntervalHours] = useState<number>(
    () => {
      const storedInterval = loadFromLocalStorage<number | null>(AUTO_REFRESH_INTERVAL_KEY, null);
      if (storedInterval !== null && storedInterval >= MIN_AUTO_REFRESH_INTERVAL_HOURS) {
        return storedInterval;
      }
      return DEFAULT_AUTO_REFRESH_INTERVAL_HOURS;
    }
  );

  const [currentRfpSourceCategory, setCurrentRfpSourceCategory] = useState<RfpSourceCategory>('web');


  const [apiFetchFailedWarning, setApiFetchFailedWarning] = useState<string | null>(null);

  const initialFilters: FilterState = {
    keyword: '',
    maxDeadline: '',
    showOnlyFit: false,
  };
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const initialSortConfig: SortConfig = { key: 'score', direction: 'descending' };
  const [sortConfig, setSortConfig] = useState<SortConfig>(initialSortConfig);

  // Source filter: 'all', 'sam.gov', 'rfpmart', 'csv'
  type SourceFilterType = 'all' | 'sam.gov' | 'rfpmart' | 'csv';
  const [sourceFilter, setSourceFilter] = useState<SourceFilterType>('all');

  const [modalRfpSummary, setModalRfpSummary] = useState<RFPWithEvaluation | null>(null);
  const [modalRfpDetailData, setModalRfpDetailData] = useState<RfpDetail | null>(null);
  const [modalRfpDetailLoading, setModalRfpDetailLoading] = useState<boolean>(false);
  const [modalRfpDetailError, setModalRfpDetailError] = useState<string | null>(null);
  const [modalFitAnalysisLoading, setModalFitAnalysisLoading] = useState<boolean>(false);

  // Convex action for scraping RFP details directly (no crawler API needed)
  const scrapeRfpDetail = useAction(api.ingestion.scraper.scrapeRfpDetail);

  // Fetch opportunities with evaluations from Convex database (SAM.gov, RFPMart CSV, etc.)
  // Shows all opportunities - use "Good Fits" filter in UI to show only eligible ones
  const convexOpportunities = useQuery(api.opportunities.listWithEvaluations, {
    limit: 100,
  });

  // Mutation to evaluate pending opportunities
  const evaluateAllPending = useMutation(api.eligibilityRules.evaluateAllPending);

  // Transform Convex opportunities to RFPWithEvaluation format (including eligibility evaluation)
  const convexRfps = useMemo((): RFPWithEvaluation[] => {
    if (!convexOpportunities?.items) return [];

    return convexOpportunities.items.map((opp): RFPWithEvaluation => {
      // Format dueDate from timestamp to YYYY-MM-DD string
      const dueDate = opp.dueDate ? new Date(opp.dueDate).toISOString().split('T')[0] : null;

      // Transform eligibility evaluation to frontend format
      const evaluation = opp.evaluation ? {
        isFit: opp.evaluation.isGoodFit,
        score: opp.evaluation.totalScore,
        maxScore: opp.evaluation.maxScore,
        // Empty criteriaResults - eligibility rules don't map to frontend criteria
        criteriaResults: {} as Record<EvaluationCriterionKey, { met: boolean; details: string }>,
        reasoning: `${opp.evaluation.eligibilityStatus}: ${opp.evaluation.isGoodFit ? 'Eligible' :
          opp.evaluation.eligibilityStatus === 'PARTNER_REQUIRED' ? 'May need partner' : 'Not eligible'}`,
        // Pass eligibility data for separate display in RfpCard
        eligibility: {
          status: opp.evaluation.eligibilityStatus as 'ELIGIBLE' | 'PARTNER_REQUIRED' | 'REJECTED',
          reasons: (opp.evaluation.reasons || []).map(r => ({
            ruleId: r.ruleId as any,
            ruleName: r.ruleName,
            outcome: r.outcome as 'pass' | 'fail' | 'flag',
            severity: r.severity as 'hard' | 'soft',
            evidence: r.evidence,
            keywords: r.keywords || [],
          })),
          evidenceSnippets: opp.evaluation.evidenceSnippets || [],
          assessedAt: opp.evaluation.evaluatedAt || Date.now(),
          assessedBy: 'system' as const,
          rulesVersion: opp.evaluation.rulesVersion || '1.0',
        },
      } : undefined;

      return {
        id: opp._id,
        title: opp.title,
        summary: opp.fullDescription || '',
        deadline: dueDate,
        url: opp.sourceUrl,
        source: opp.source,
        location: opp.location?.state || opp.location?.city || undefined,
        category: opp.categories?.[0] || undefined,
        apiPostedDate: opp.postedDate ? new Date(opp.postedDate).toISOString().split('T')[0] : undefined,
        apiExpiryDate: dueDate || undefined,
        evaluation,
      };
    });
  }, [convexOpportunities]);

  // Auto-evaluate unevaluated opportunities when they're loaded
  const [hasTriggeredEvaluation, setHasTriggeredEvaluation] = useState(false);
  useEffect(() => {
    // Only trigger once, and only if there are unevaluated opportunities
    if (
      convexOpportunities &&
      convexOpportunities.unevaluated > 0 &&
      !hasTriggeredEvaluation
    ) {
      console.log(`Auto-evaluating ${convexOpportunities.unevaluated} unevaluated opportunities...`);
      setHasTriggeredEvaluation(true);
      evaluateAllPending({ limit: 50 })
        .then((result) => {
          console.log(`Evaluated ${result.evaluated} opportunities`);
        })
        .catch((err) => {
          console.error('Auto-evaluation failed:', err);
        });
    }
  }, [convexOpportunities, hasTriggeredEvaluation, evaluateAllPending]);

  const [aiSettings, setAiSettings] = useState<AiSettings>(() => {
    const loadedSettings = loadFromLocalStorage<AiSettings>('aiSettings', getDefaultAiSettings());
    // Ensure loaded settings have all provider keys from AVAILABLE_AI_PROVIDERS_CONFIG
    const completeProviderConfigs = { ...getDefaultAiSettings().providerConfigs, ...loadedSettings.providerConfigs };

    return {
      ...loadedSettings,
      providerConfigs: completeProviderConfigs,
      useAiForEvaluation: false, // AI is OFF by default on app start
    };
  });

  // Initialize currentRfpLimit based on the initial AI state (which is OFF)
  const [currentRfpLimit, setCurrentRfpLimit] = useState<number>(aiSettings.useAiForEvaluation ? 1 : 10);


  const [currentCriteriaConfig, setCurrentCriteriaConfig] = useState<Record<EvaluationCriterionKey, NebulaLogixCriterion>>(
    () => {
      const baseConfigWithEvaluators = deepCloneCriteriaConfig(NEBULA_LOGIX_CRITERIA_CONFIG);
      const storedConfigString = localStorage.getItem('criteriaConfig');

      if (storedConfigString) {
        try {
          const storedSerializableParts = JSON.parse(storedConfigString) as Record<EvaluationCriterionKey, Partial<Pick<NebulaLogixCriterion, 'isMasterEnabled' | 'keywords' | 'preferredCategories' | 'geminiSystemInstruction'>>>;

          for (const key in baseConfigWithEvaluators) {
            const criterionKey = key as EvaluationCriterionKey;
            const storedCriterion = storedSerializableParts[criterionKey];

            if (storedCriterion) {
              if (typeof storedCriterion.isMasterEnabled === 'boolean') {
                baseConfigWithEvaluators[criterionKey].isMasterEnabled = storedCriterion.isMasterEnabled;
              }

              if (storedCriterion.keywords && baseConfigWithEvaluators[criterionKey].keywords) {
                baseConfigWithEvaluators[criterionKey].keywords = baseConfigWithEvaluators[criterionKey].keywords!.map(baseKw => {
                  const storedKw = storedCriterion.keywords!.find(skw => skw.value === baseKw.value);
                  return storedKw ? { ...baseKw, enabled: storedKw.enabled } : baseKw;
                });
              }

              if (storedCriterion.preferredCategories && baseConfigWithEvaluators[criterionKey].preferredCategories) {
                baseConfigWithEvaluators[criterionKey].preferredCategories = baseConfigWithEvaluators[criterionKey].preferredCategories!.map(baseCat => {
                  const storedCat = storedCriterion.preferredCategories!.find(scat => scat.value === baseCat.value);
                  return storedCat ? { ...baseCat, enabled: storedCat.enabled } : baseCat;
                });
              }
            }
          }
          return baseConfigWithEvaluators;
        } catch (error) {
          console.error("Error parsing or merging criteriaConfig from localStorage:", error);
          return deepCloneCriteriaConfig(NEBULA_LOGIX_CRITERIA_CONFIG);
        }
      }
      return baseConfigWithEvaluators;
    }
  );

  const [isImprovingPrompt, setIsImprovingPrompt] = useState<boolean>(false);
  const refreshTimeoutRef = useRef<number | null>(null);
  const refreshIntervalRef = useRef<number | null>(null);


  const allHighlightKeywords = useMemo(() => {
    const keywordSet = new Set<string>();
    Object.values(currentCriteriaConfig).forEach(criterion => {
      if (criterion.isMasterEnabled && criterion.keywords) {
        criterion.keywords.forEach(kwItem => {
          if (kwItem.enabled) keywordSet.add(kwItem.value);
        });
      }
    });
    return Array.from(keywordSet);
  }, [currentCriteriaConfig]);


  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    saveToLocalStorage('theme', theme);
  }, [theme]);

  useEffect(() => {
    const serializableConfig: Record<string, Partial<Pick<NebulaLogixCriterion, 'isMasterEnabled' | 'keywords' | 'preferredCategories'>>> = {};
    for (const key in currentCriteriaConfig) {
      const criterionKey = key as EvaluationCriterionKey;
      const criterion = currentCriteriaConfig[criterionKey];
      serializableConfig[criterionKey] = {
        isMasterEnabled: criterion.isMasterEnabled,
        keywords: criterion.keywords?.map(kw => ({ value: kw.value, enabled: kw.enabled, description: kw.description })),
        preferredCategories: criterion.preferredCategories?.map(cat => ({ value: cat.value, enabled: cat.enabled, description: cat.description })),
      };
    }
    saveToLocalStorage('criteriaConfig', serializableConfig);
  }, [currentCriteriaConfig]);

  useEffect(() => {
    saveToLocalStorage('aiSettings', aiSettings);
  }, [aiSettings]);


  // Effect to update currentRfpLimit when AI evaluation state changes
  useEffect(() => {
    const newDefaultLimit = aiSettings.useAiForEvaluation ? 1 : 10;
    setCurrentRfpLimit(newDefaultLimit);
  }, [aiSettings.useAiForEvaluation]);


  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleViewSwitch = (view: AppView) => {
    setCurrentView(view);
  };

  const handleSwitchRfpSourceCategory = (newSource: RfpSourceCategory) => {
    setCurrentRfpSourceCategory(newSource);
  };

  const handleChangeRfpLimit = (newLimit: number) => {
    const cappedLimit = Math.max(1, Math.min(newLimit, 100));
    if (cappedLimit > 0) {
      setCurrentRfpLimit(cappedLimit);
    }
  };

  const handleToggleMasterCriterion = (criterionKey: EvaluationCriterionKey, isEnabled: boolean) => {
    setCurrentCriteriaConfig(prevConfig => {
      const newConfig = deepCloneCriteriaConfig(prevConfig);
      const criterionToUpdate = newConfig[criterionKey];

      criterionToUpdate.isMasterEnabled = isEnabled;

      if (criterionToUpdate.keywords) {
        criterionToUpdate.keywords = criterionToUpdate.keywords.map(kw => ({ ...kw, enabled: isEnabled }));
      }
      if (criterionToUpdate.preferredCategories) {
        criterionToUpdate.preferredCategories = criterionToUpdate.preferredCategories.map(cat => ({ ...cat, enabled: isEnabled }));
      }

      return newConfig;
    });
  };

  const handleToggleCriterionItem = (criterionKey: EvaluationCriterionKey, itemValue: string, isEnabled: boolean) => {
    setCurrentCriteriaConfig(prevConfig => {
      const newConfig = deepCloneCriteriaConfig(prevConfig);
      const criterionToUpdate = newConfig[criterionKey];

      let itemArray: CriterionItem[] | undefined = undefined;
      if (criterionToUpdate.keywords) itemArray = criterionToUpdate.keywords;
      else if (criterionToUpdate.preferredCategories) itemArray = criterionToUpdate.preferredCategories;

      if (itemArray) {
        const itemIndex = itemArray.findIndex(item => item.value === itemValue);
        if (itemIndex > -1) {
          const updatedItems = itemArray.map((item, index) =>
            index === itemIndex ? { ...item, enabled: isEnabled } : item
          );

          if (criterionToUpdate.keywords) criterionToUpdate.keywords = updatedItems;
          else if (criterionToUpdate.preferredCategories) criterionToUpdate.preferredCategories = updatedItems;

          if (isEnabled && !criterionToUpdate.isMasterEnabled) {
            criterionToUpdate.isMasterEnabled = true;
          }
        }
      }
      return newConfig;
    });
  };

  const handleUpdateAiSettings = useCallback((newSettings: Partial<AiSettings> | ((prev: AiSettings) => AiSettings)) => {
    if (typeof newSettings === 'function') {
      setAiSettings(prev => newSettings(prev));
    } else {
      setAiSettings(prev => ({ ...prev, ...newSettings }));
    }
  }, []);


  const handleAutoImproveCorePrompt = async () => {
    let currentProviderIsConfigured = false;
    const selectedProvider = aiSettings.selectedProvider;
    const providerConfig = aiSettings.providerConfigs[selectedProvider];

    if (selectedProvider === AiProvider.GEMINI) {
      currentProviderIsConfigured = isGeminiConfiguredViaEnv;
    } else if (providerConfig) {
      currentProviderIsConfigured = !!(providerConfig.apiKey || providerConfig.baseUrl);
    }

    if (!currentProviderIsConfigured) {
      alert(`${selectedProvider} is not configured. Cannot improve prompt.`);
      return;
    }
    if (selectedProvider !== AiProvider.GEMINI) {
      alert(`Auto-improve prompt feature is currently only implemented for Gemini. Selected: ${selectedProvider}`);
      return;
    }

    setIsImprovingPrompt(true);
    try {
      const metaPrompt = META_PROMPT_FOR_AI_CORE_PROMPT_IMPROVEMENT.replace("{{CURRENT_USER_PROMPT}}", aiSettings.corePromptTemplate);
      const result = await generateTextWithGemini(metaPrompt);
      if (result.text) {
        handleUpdateAiSettings({ corePromptTemplate: result.text });
        alert("Core prompt updated with Gemini's suggestion!");
      } else if (result.error) {
        alert(`Failed to get an improvement suggestion from Gemini: ${result.error}`);
      } else {
        alert("Failed to get an improvement suggestion from Gemini for an unknown reason.");
      }
    } catch (error) {
      console.error("Error auto-improving core prompt:", error);
      alert(`Error improving prompt: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsImprovingPrompt(false);
    }
  };

  const handleUpdateAutoRefreshInterval = (hours: number) => {
    const newInterval = Math.max(MIN_AUTO_REFRESH_INTERVAL_HOURS, hours);
    setAutoRefreshIntervalHours(newInterval);
    saveToLocalStorage(AUTO_REFRESH_INTERVAL_KEY, newInterval);
  };


  const transformApiRfpsToRfps = (apiRfps: ApiRfp[], dataSource: 'live' | 'mock'): RFP[] => {
    return apiRfps.map(apiRfp => ({
      id: apiRfp.id,
      title: apiRfp.title,
      summary: apiRfp.description,
      budget: null,
      deadline: parseDeadlineFromTitleString(apiRfp.title),
      url: apiRfp.url,
      source: dataSource === 'mock' ? `Mock Data (${currentRfpSourceCategory})` : `${new URL(apiRfp.url).hostname} (API - ${currentRfpSourceCategory})`,
      rawData: apiRfp.description,
      location: apiRfp.location,
      category: apiRfp.category,
      apiPostedDate: apiRfp.posted_date,
      apiExpiryDate: apiRfp.expiry_date,
    }));
  };

  const loadAndEvaluateRfps = useCallback(async (isAutoRefresh = false) => {
    if (!isAutoRefresh) setIsLoading(true);
    setError(null);
    setApiFetchFailedWarning(null);

    try {
      console.log(`Fetching RFPs. Source: ${currentRfpSourceCategory}, Limit: ${currentRfpLimit}, AI: ${aiSettings.useAiForEvaluation}, AutoRefresh: ${isAutoRefresh}`);
      const fetchResponse: FetchRfpsResponse = await fetchRfps(currentRfpSourceCategory, currentRfpLimit);

      if (fetchResponse.warningMessage) {
        setApiFetchFailedWarning(fetchResponse.warningMessage);
      }

      setRawApiData(fetchResponse.data);

      const transformedRfps = transformApiRfpsToRfps(fetchResponse.data, fetchResponse.source);
      const evaluatedRfps = await performBatchEvaluation(transformedRfps, currentCriteriaConfig, aiSettings, isGeminiConfiguredViaEnv);
      setAllRfps(evaluatedRfps);
      if (!isAutoRefresh) setSelectedRfpIds(new Set());

      const now = Date.now();
      saveToLocalStorage(LAST_SUCCESSFUL_RFP_FETCH_TIMESTAMP_KEY, now);
      setLastSuccessfulFetchTime(now);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setApiFetchFailedWarning(`Critical error processing RFPs: ${errorMessage}. Displaying previous or mock data if available.`);
    } finally {
      if (!isAutoRefresh) setIsLoading(false);
    }
  }, [currentRfpSourceCategory, currentRfpLimit, currentCriteriaConfig, aiSettings, isGeminiConfiguredViaEnv]);

  const isCurrentAiProviderConfigured = useMemo(() => {
    const provider = aiSettings.selectedProvider;
    const config = aiSettings.providerConfigs[provider];
    if (provider === AiProvider.GEMINI) {
      return isGeminiConfiguredViaEnv;
    }
    if (provider === AiProvider.OLLAMA || provider === AiProvider.LM_STUDIO) {
      // Also check if a model is selected/entered, especially for LM Studio and potentially Ollama
      return !!config?.baseUrl && !!config?.model;
    }
    // For other API key based providers, also ensure a model is selected/available
    return !!config?.apiKey && !!config?.model;
  }, [aiSettings.selectedProvider, aiSettings.providerConfigs, isGeminiConfiguredViaEnv]);

  const handleEvaluateSingleRfpWithAi = useCallback(async (rfpToEvaluate: RFPWithEvaluation, useDetailData: boolean = false) => {
    if (!isCurrentAiProviderConfigured) {
      alert(`${aiSettings.selectedProvider} AI is not configured. Cannot perform AI evaluation.`);
      return;
    }

    setAllRfps(prevRfps => prevRfps.map(r =>
      r.id === rfpToEvaluate.id ? { ...r, isEvaluating: true } : r
    ));
    if (modalRfpSummary?.id === rfpToEvaluate.id) {
      setModalRfpSummary(prev => prev ? { ...prev, isEvaluating: true } : null);
    }

    let textForEvaluation = `${rfpToEvaluate.title} ${rfpToEvaluate.summary}`;
    if (useDetailData && modalRfpDetailData && modalRfpDetailData.url === rfpToEvaluate.url) {
      let detailedSummary = modalRfpDetailData.title || "";
      if (modalRfpDetailData.description) detailedSummary += ` ${modalRfpDetailData.description}`;
      if (modalRfpDetailData.scope_of_service) detailedSummary += ` ${modalRfpDetailData.scope_of_service}`;
      textForEvaluation = detailedSummary.trim() || textForEvaluation;
      console.log(`Using detailed text for AI evaluation of ${rfpToEvaluate.id}`);
    }

    const rfpForEval: RFP = {
      ...rfpToEvaluate,
      summary: textForEvaluation
    };

    try {
      const tempAiSettingsForSingleEval: AiSettings = {
        ...aiSettings,
        useAiForEvaluation: true
      };

      const newEvaluation = await evaluateRfp(
        rfpForEval,
        currentCriteriaConfig,
        tempAiSettingsForSingleEval,
        isGeminiConfiguredViaEnv
      );

      setAllRfps(prevRfps => prevRfps.map(r =>
        r.id === rfpToEvaluate.id ? { ...r, evaluation: newEvaluation, isEvaluating: false } : r
      ));
      if (modalRfpSummary?.id === rfpToEvaluate.id) {
        setModalRfpSummary(prev => prev ? { ...prev, evaluation: newEvaluation, isEvaluating: false } : null);
        // If the modal is open for this RFP, also re-fetch fit analysis
        if (modalRfpDetailData && modalRfpDetailData.id === rfpToEvaluate.id) {
          setModalFitAnalysisLoading(true);
          generateFitAnalysis(modalRfpDetailData, currentCriteriaConfig, aiSettings, isGeminiConfiguredViaEnv, newEvaluation)
            .then(fitAnalysisResult => {
              setModalRfpDetailData(prev => prev ? { ...prev, fitAnalysis: fitAnalysisResult } : null);
            })
            .catch(err => {
              console.error("Error generating fit analysis after re-evaluation:", err);
              setModalRfpDetailData(prev => prev ? { ...prev, fitAnalysis: { analysisError: "Failed to update fit analysis." } } : null);
            })
            .finally(() => setModalFitAnalysisLoading(false));
        }
      }
    } catch (error) {
      console.error(`Error evaluating single RFP ${rfpToEvaluate.id} with AI:`, error);
      alert(`Failed to evaluate RFP ${rfpToEvaluate.id} with AI. Check console for details.`);
      setAllRfps(prevRfps => prevRfps.map(r =>
        r.id === rfpToEvaluate.id ? { ...r, isEvaluating: false } : r
      ));
      if (modalRfpSummary?.id === rfpToEvaluate.id) {
        setModalRfpSummary(prev => prev ? { ...prev, isEvaluating: false } : null);
      }
    }
  }, [isCurrentAiProviderConfigured, currentCriteriaConfig, aiSettings, modalRfpDetailData, modalRfpSummary?.id, isGeminiConfiguredViaEnv]);


  useEffect(() => {
    setIsGeminiConfiguredViaEnv(isGeminiConfiguredViaEnvHook());
    loadAndEvaluateRfps(false);
  }, [loadAndEvaluateRfps]);


  useEffect(() => {
    const clearTimers = () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      refreshTimeoutRef.current = null;
      refreshIntervalRef.current = null;
    };

    if (autoRefreshIntervalHours >= MIN_AUTO_REFRESH_INTERVAL_HOURS) {
      const intervalMs = autoRefreshIntervalHours * 60 * 60 * 1000;
      let initialDelayMs = intervalMs;

      if (lastSuccessfulFetchTime) {
        const expectedNextFetch = lastSuccessfulFetchTime + intervalMs;
        setNextScheduledRefreshTime(expectedNextFetch);
        initialDelayMs = Math.max(0, expectedNextFetch - Date.now());
      } else {
        setNextScheduledRefreshTime(Date.now() + intervalMs);
        initialDelayMs = 0;
      }

      console.log(`Setting up auto-refresh. Interval: ${autoRefreshIntervalHours}h. Initial delay: ${initialDelayMs / 1000}s.`);

      refreshTimeoutRef.current = window.setTimeout(() => {
        console.log("Auto-refresh: Initial timeout triggered, fetching data.");
        loadAndEvaluateRfps(true).then(() => {
          if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = window.setInterval(() => {
            console.log("Auto-refresh: Interval triggered, fetching data.");
            loadAndEvaluateRfps(true);
          }, intervalMs);
        });
      }, initialDelayMs);

    } else {
      setNextScheduledRefreshTime(null);
      console.log("Auto-refresh disabled or interval too short.");
    }

    return clearTimers;

  }, [autoRefreshIntervalHours, lastSuccessfulFetchTime, loadAndEvaluateRfps]);


  useEffect(() => {
    if (lastSuccessfulFetchTime && autoRefreshIntervalHours >= MIN_AUTO_REFRESH_INTERVAL_HOURS) {
      const intervalMs = autoRefreshIntervalHours * 60 * 60 * 1000;
      setNextScheduledRefreshTime(lastSuccessfulFetchTime + intervalMs);
    } else {
      setNextScheduledRefreshTime(null);
    }
  }, [lastSuccessfulFetchTime, autoRefreshIntervalHours]);


  const handleFilterChange = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const handleSort = useCallback((key: SortConfig['key']) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'descending' ? 'ascending' : 'descending',
    }));
  }, []);

  const handleViewDetailsClick = useCallback(async (rfp: RFPWithEvaluation) => {
    setModalRfpSummary(rfp);
    setModalRfpDetailData(null);
    setModalRfpDetailError(null);
    setModalRfpDetailLoading(true);
    setModalFitAnalysisLoading(false); // Reset fit analysis loading

    if (!rfp.url) {
      setModalRfpDetailError("RFP URL is missing, cannot fetch details.");
      setModalRfpDetailLoading(false);
      return;
    }

    try {
      // Use Convex scraper action for direct page scraping (no external API needed)
      const scrapedData = await scrapeRfpDetail({ url: rfp.url });

      // Map scraped data to RfpDetail format
      const detailData: RfpDetail = {
        id: scrapedData.id,
        title: scrapedData.title,
        description: scrapedData.description,
        scope_of_service: scrapedData.scope_of_service || "Not specified",
        posted_date: scrapedData.posted_date || "Not specified",
        expiry_date: scrapedData.expiry_date || "Not specified",
        question_deadline: scrapedData.question_deadline || "Not specified",
        location: scrapedData.location || "Not specified",
        budget: scrapedData.budget || "Not specified",
        eligibility: scrapedData.eligibility || "Not specified",
        work_performance: scrapedData.work_performance || "Not specified",
        category: scrapedData.category || "Not specified",
        country: scrapedData.country || "Not specified",
        state: scrapedData.state || "Not specified",
        url: scrapedData.url,
      };

      setModalRfpDetailData(detailData);
      setModalRfpDetailLoading(false); // Base details loaded

      // Now fetch fit analysis
      setModalFitAnalysisLoading(true);
      try {
        const fitAnalysisResult = await generateFitAnalysis(
          detailData,
          currentCriteriaConfig,
          aiSettings,
          isGeminiConfiguredViaEnv,
          rfp.evaluation // Pass existing evaluation from list view
        );
        setModalRfpDetailData(prevDetails => prevDetails ? { ...prevDetails, fitAnalysis: fitAnalysisResult } : null);
      } catch (fitError) {
        console.error("Error generating fit analysis:", fitError);
        setModalRfpDetailData(prevDetails => prevDetails ? { ...prevDetails, fitAnalysis: { analysisError: `Failed to generate fit analysis: ${fitError instanceof Error ? fitError.message : String(fitError)}` } } : null);
      } finally {
        setModalFitAnalysisLoading(false);
      }

    } catch (e) {
      console.error("Error scraping RFP details:", e);
      setModalRfpDetailError(e instanceof Error ? e.message : "Failed to load RFP details. The page may not be accessible.");
      setModalRfpDetailLoading(false);
      setModalFitAnalysisLoading(false);
    }
  }, [currentCriteriaConfig, aiSettings, isGeminiConfiguredViaEnv, scrapeRfpDetail]);

  const handleViewDetailsByIdInRawView = useCallback((rfpId: string) => {
    const rawRfp = rawApiData.find(r => r.id === rfpId);
    if (rawRfp && rawRfp.url) {
      const summaryRfpForModal: RFPWithEvaluation = {
        id: rawRfp.id,
        title: rawRfp.title,
        summary: rawRfp.description,
        url: rawRfp.url,
        deadline: parseDeadlineFromTitleString(rawRfp.title),
        location: rawRfp.location,
        category: rawRfp.category,
        source: `${new URL(rawRfp.url).hostname} (Raw Data - ${currentRfpSourceCategory})`,
        evaluation: allRfps.find(evaluatedRfp => evaluatedRfp.id === rfpId)?.evaluation
      };
      handleViewDetailsClick(summaryRfpForModal);
    } else {
      setModalRfpSummary({
        id: rfpId,
        title: `Details for RFP ${rfpId}`,
        summary: rawRfp ? rawRfp.description : 'Raw data not found.',
        url: rawRfp?.url || '#',
        source: 'Raw Data'
      });
      setModalRfpDetailError(`Details for RFP ID ${rfpId} could not be fully loaded. URL missing or raw data not found.`);
      setModalRfpDetailLoading(false);
      setModalFitAnalysisLoading(false);
    }
  }, [rawApiData, handleViewDetailsClick, allRfps, currentRfpSourceCategory]);

  const closeModal = () => {
    setModalRfpSummary(null);
    setModalRfpDetailData(null);
    setModalRfpDetailError(null);
    setModalRfpDetailLoading(false);
    setModalFitAnalysisLoading(false);
  };

  const displayedRfps = useMemo(() => {
    // Combine RFPs from external API and Convex database
    const combinedRfps = [...allRfps, ...convexRfps];

    const filtered = combinedRfps
      .filter(rfp => {
        if (filters.showOnlyFit) {
          if (!rfp.evaluation || !rfp.evaluation.isFit) return false;
        }

        // Source filter
        if (sourceFilter !== 'all') {
          const src = (rfp.source || '').toLowerCase();
          if (sourceFilter === 'sam.gov' && !src.includes('sam.gov')) return false;
          if (sourceFilter === 'rfpmart' && !src.includes('rfpmart')) return false;
          if (sourceFilter === 'csv' && !(src.includes('csv') || src.includes('upload'))) return false;
        }

        const keywordMatch = filters.keyword.toLowerCase() === '' ||
          rfp.title.toLowerCase().includes(filters.keyword.toLowerCase()) ||
          rfp.summary.toLowerCase().includes(filters.keyword.toLowerCase());

        const deadlineDate = rfp.deadline ? new Date(rfp.deadline + 'T00:00:00') : null;
        const filterMaxDeadlineDate = filters.maxDeadline ? new Date(filters.maxDeadline + 'T00:00:00') : null;
        const deadlineMatch = !filterMaxDeadlineDate || (deadlineDate && deadlineDate <= filterMaxDeadlineDate);

        return keywordMatch && deadlineMatch;
      });

    const sorted = filtered.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortConfig.key === 'score') {
        valA = a.evaluation?.score ?? -1;
        valB = b.evaluation?.score ?? -1;
      } else if (sortConfig.key === 'deadlineDate') {
        const dateA = a.deadline ? new Date(a.deadline + 'T00:00:00').getTime() : 0;
        const dateB = b.deadline ? new Date(b.deadline + 'T00:00:00').getTime() : 0;
        valA = isNaN(dateA) ? 0 : dateA;
        valB = isNaN(dateB) ? 0 : dateB;

        if (valA === 0 && valB !== 0) return sortConfig.direction === 'ascending' ? 1 : -1;
        if (valB === 0 && valA !== 0) return sortConfig.direction === 'ascending' ? -1 : 1;

      } else {
        valA = a[sortConfig.key as keyof Omit<RFPWithEvaluation, 'budget'>];
        valB = b[sortConfig.key as keyof Omit<RFPWithEvaluation, 'budget'>];
      }

      if (valA === undefined || valA === null) valA = sortConfig.direction === 'ascending' ? Infinity : -Infinity;
      if (valB === undefined || valB === null) valB = sortConfig.direction === 'ascending' ? Infinity : -Infinity;


      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortConfig.direction === 'ascending' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;

      const titleA = a.title || '';
      const titleB = b.title || '';
      return titleA.localeCompare(titleB);
    });
    return sorted;
  }, [allRfps, convexRfps, filters, sortConfig, sourceFilter]);

  const handleRfpSelectionToggle = useCallback((rfpId: string) => {
    setSelectedRfpIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rfpId)) {
        newSet.delete(rfpId);
      } else {
        newSet.add(rfpId);
      }
      return newSet;
    });
  }, []);

  const handleToggleSelectAllDisplayed = useCallback(() => {
    if (displayedRfps.length === 0) return;
    const allDisplayedIds = displayedRfps.map(rfp => rfp.id);
    const allCurrentlySelected = allDisplayedIds.every(id => selectedRfpIds.has(id));

    if (allCurrentlySelected) {
      setSelectedRfpIds(prev => {
        const newSet = new Set(prev);
        allDisplayedIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      setSelectedRfpIds(prev => new Set([...prev, ...allDisplayedIds]));
    }
  }, [displayedRfps, selectedRfpIds]);

  const handleSelectBestFits = useCallback(() => {
    const bestFitIds = displayedRfps
      .filter(rfp => rfp.evaluation?.isFit)
      .map(rfp => rfp.id);
    setSelectedRfpIds(new Set(bestFitIds));
  }, [displayedRfps]);

  const handleDeselectAll = useCallback(() => {
    setSelectedRfpIds(new Set());
  }, []);

  const handleExportSelectedToCsv = useCallback(() => {
    const rfpsToExport = allRfps.filter(rfp => selectedRfpIds.has(rfp.id));
    if (rfpsToExport.length > 0) {
      exportRfpsToCsv(rfpsToExport);
    }
  }, [allRfps, selectedRfpIds]);

  const isAllDisplayedSelected = useMemo(() => {
    if (displayedRfps.length === 0) return false;
    return displayedRfps.every(rfp => selectedRfpIds.has(rfp.id));
  }, [displayedRfps, selectedRfpIds]);

  const isIndeterminate = useMemo(() => {
    if (displayedRfps.length === 0) return false;
    const someSelected = displayedRfps.some(rfp => selectedRfpIds.has(rfp.id));
    return someSelected && !isAllDisplayedSelected;
  }, [displayedRfps, selectedRfpIds, isAllDisplayedSelected]);

  const hasGoodFitsDisplayed = useMemo(() => {
    return displayedRfps.some(rfp => rfp.evaluation?.isFit);
  }, [displayedRfps]);

  const renderSortIcon = (key: SortConfig['key']) => {
    if (sortConfig.key !== key) return <span className="text-accents-4 dark:text-accents-5">↕</span>;
    return sortConfig.direction === 'ascending' ? '↑' : '↓';
  };

  const DetailItem: React.FC<{ label: string, value?: React.ReactNode, htmlValue?: string, preformatted?: boolean }> = ({ label, value, htmlValue, preformatted }) => (
    <div className="mb-3 py-2 border-b border-accents-2 dark:border-dark-accents-2 last:border-b-0">
      <span className="font-medium text-geist-secondary dark:text-dark-geist-secondary block sm:inline sm:mr-2">{label}:</span>
      {htmlValue ? (
        <span className="text-sm text-geist-foreground dark:text-dark-geist-foreground" dangerouslySetInnerHTML={{ __html: htmlValue }} />
      ) : preformatted ? (
        <pre className="text-sm text-geist-foreground dark:text-dark-geist-foreground whitespace-pre-wrap font-sans">{value !== undefined ? value : 'N/A'}</pre>
      ) : (
        <span className="text-sm text-geist-foreground dark:text-dark-geist-foreground">{value !== undefined ? value : 'N/A'}</span>
      )}
    </div>
  );

  // Helper Icon Components from RfpCard.tsx - defined locally to avoid circular dependency or prop drilling issue
  const ModalTickIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  );

  const ModalCrossIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );

  const modalTitle = modalRfpDetailData?.title && modalRfpDetailData.title.trim() !== "" ? modalRfpDetailData.title : modalRfpSummary?.title || "RFP Details";

  const pageSubtitle = useMemo(() => {
    const sourceName = currentRfpSourceCategory === 'web' ? 'Web Development' : 'Mobile Development';
    if (apiFetchFailedWarning) {
      return `Displaying Mock RFPs for ${sourceName} due to API issue.`;
    }
    let subtitle = `Find and analyze ${sourceName} RFPs.`;
    return subtitle;
  }, [currentRfpSourceCategory, apiFetchFailedWarning]);

  const aiWarningMessage = useMemo(() => {
    const provider = aiSettings.selectedProvider;
    const config = aiSettings.providerConfigs[provider];
    let configuredStatus = false;
    let specificConfigMessage = API_KEY_ERROR_MESSAGE; // Default

    if (provider === AiProvider.GEMINI) {
      configuredStatus = isGeminiConfiguredViaEnv;
      if (!configuredStatus) specificConfigMessage = GEMINI_ENV_API_KEY_ERROR_MESSAGE;
    } else if (provider === AiProvider.OLLAMA || provider === AiProvider.LM_STUDIO) {
      configuredStatus = !!config?.baseUrl && !!config?.model; // Both need base URL and a model to be "configured"
      if (!config?.baseUrl && !config?.model) specificConfigMessage = `${provider} Base URL and Model not configured in Admin.`;
      else if (!config?.baseUrl) specificConfigMessage = `${provider} Base URL not configured in Admin.`;
      else if (!config?.model) specificConfigMessage = `${provider} Model not selected/configured in Admin.`;
    } else { // For other API key based providers
      configuredStatus = !!config?.apiKey && !!config?.model;
      if (!config?.apiKey && !config?.model) specificConfigMessage = `${provider} API Key and Model not configured in Admin.`;
      else if (!config?.apiKey) specificConfigMessage = `${provider} API Key not configured in Admin.`;
      else if (!config?.model) specificConfigMessage = `${provider} Model not selected/configured in Admin.`;
    }

    if (!configuredStatus) {
      return `${provider} not fully configured: ${specificConfigMessage} Text analysis will use basic keyword matching.`;
    }
    if (!aiSettings.useAiForEvaluation) {
      return `${provider} AI analysis is currently disabled by user. Text analysis will use basic keyword matching.`;
    }
    return null;
  }, [
    aiSettings.selectedProvider,
    aiSettings.providerConfigs,
    aiSettings.useAiForEvaluation,
    isGeminiConfiguredViaEnv
  ]);

  const modalRfpIsEvaluating = modalRfpSummary?.isEvaluating || false;

  return (
    <>
      {/* Signed Out - Show Login Page */}
      <SignedOut>
        <div className="min-h-screen relative overflow-hidden bg-black">
          {/* Subtle noise texture */}
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

          {/* Gradient orbs - grayscale */}
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-white/[0.03] blur-3xl" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-white/[0.02] blur-3xl" />

          {/* Content */}
          <div className="relative z-10 min-h-screen flex flex-col">
            {/* Nav */}
            <nav className="flex items-center justify-between px-6 py-6 lg:px-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                  <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-lg font-medium text-white tracking-tight">RFP Discovery</span>
              </div>
              <AuthButtons />
            </nav>

            {/* Hero */}
            <main className="flex-1 flex items-center justify-center px-6 lg:px-16">
              <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                {/* Left side - Text */}
                <div className="text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8">
                    <span className="w-1.5 h-1.5 bg-white rounded-full" />
                    <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Powered by AI</span>
                  </div>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6 tracking-tight">
                    Win Government
                    <span className="block text-gray-500">Contracts Faster</span>
                  </h1>
                  <p className="text-base sm:text-lg text-gray-400 mb-10 max-w-md leading-relaxed">
                    Discover and evaluate public-sector RFP opportunities.
                    AI-powered insights from discovery to submission.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <AuthButtons />
                  </div>
                </div>

                {/* Right side - Glass cards */}
                <div className="hidden lg:grid grid-cols-2 gap-3">
                  {/* Card 1 */}
                  <div className="group p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-500">
                    <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center mb-4 group-hover:bg-white/[0.08] transition-colors">
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-white mb-1.5">Discovery</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">Multi-source ingestion from SAM.gov & RFPMart</p>
                  </div>

                  {/* Card 2 */}
                  <div className="group p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-500 mt-6">
                    <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center mb-4 group-hover:bg-white/[0.08] transition-colors">
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-white mb-1.5">Eligibility</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">7 hard filters to qualify opportunities instantly</p>
                  </div>

                  {/* Card 3 */}
                  <div className="group p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-500">
                    <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center mb-4 group-hover:bg-white/[0.08] transition-colors">
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-white mb-1.5">Scoring</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">6-dimension AI scoring for fit analysis</p>
                  </div>

                  {/* Card 4 */}
                  <div className="group p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-500 mt-6">
                    <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center mb-4 group-hover:bg-white/[0.08] transition-colors">
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-white mb-1.5">Briefs</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">Generate go/no-go decision documents</p>
                  </div>
                </div>
              </div>
            </main>

            {/* Footer */}
            <footer className="px-6 py-8 lg:px-16">
              <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-8 text-center">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-semibold text-white">500+</span>
                  <span className="text-xs text-gray-600">RFPs</span>
                </div>
                <div className="w-px h-4 bg-white/10" />
                <div className="flex items-center gap-2">
                  <span className="text-xl font-semibold text-white">7</span>
                  <span className="text-xs text-gray-600">Filters</span>
                </div>
                <div className="w-px h-4 bg-white/10" />
                <div className="flex items-center gap-2">
                  <span className="text-xl font-semibold text-white">6</span>
                  <span className="text-xs text-gray-600">Dimensions</span>
                </div>
                <div className="w-px h-4 bg-white/10" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Real-time sync</span>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </SignedOut>

      {/* Signed In - Show App */}
      <SignedIn>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <header className="mb-10 pb-8 border-b border-accents-2 dark:border-dark-accents-2">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex-1 text-center sm:text-left flex items-center">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-geist-foreground dark:text-dark-geist-foreground">RFP Discovery Platform</h1>
                  <p className="text-md text-geist-secondary dark:text-dark-geist-secondary mt-1">{pageSubtitle}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <ViewSwitcher currentView={currentView} onSwitchView={handleViewSwitch} />
                <ThemeSwitcher currentTheme={theme} toggleTheme={toggleTheme} />
                <AuthButtons />
              </div>
            </div>
            {(apiFetchFailedWarning && currentView !== 'admin') && (
              <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900 dark:bg-opacity-30 border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-200 rounded-md shadow-vercel-sm" role="alert">
                <p className="font-semibold">API Alert</p>
                <p className="text-sm">{apiFetchFailedWarning}</p>
              </div>
            )}
            {aiWarningMessage && currentView !== 'admin' && (
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-30 border border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-200 rounded-md shadow-vercel-sm" role="alert">
                <p className="font-semibold">{aiSettings.selectedProvider} AI Status</p>
                <p className="text-sm">{aiWarningMessage}</p>
              </div>
            )}
          </header>

          {currentView === 'home' && (
            <>
              <FilterControls
                filters={filters}
                onFilterChange={handleFilterChange}
                onResetFilters={handleResetFilters}
                currentRfpSourceCategory={currentRfpSourceCategory}
                onSwitchRfpSourceCategory={handleSwitchRfpSourceCategory}
                currentRfpLimit={currentRfpLimit}
                onChangeRfpLimit={handleChangeRfpLimit}
              />

              <SelectionControls
                selectedCount={selectedRfpIds.size}
                displayedCount={displayedRfps.length}
                onToggleSelectAllDisplayed={handleToggleSelectAllDisplayed}
                isAllDisplayedSelected={isAllDisplayedSelected}
                isIndeterminate={isIndeterminate}
                onSelectBestFits={handleSelectBestFits}
                onDeselectAll={handleDeselectAll}
                onExportSelectedToCsv={handleExportSelectedToCsv}
                hasGoodFitsDisplayed={hasGoodFitsDisplayed}
                onManualRefresh={() => loadAndEvaluateRfps(false)}
                isRefreshing={isLoading}
                lastSuccessfulFetchTime={lastSuccessfulFetchTime}
                nextScheduledRefreshTime={nextScheduledRefreshTime}
                autoRefreshIntervalHours={autoRefreshIntervalHours}
                useAiForEvaluation={aiSettings.useAiForEvaluation}
                onToggleUseAi={() => handleUpdateAiSettings(prev => ({ ...prev, useAiForEvaluation: !prev.useAiForEvaluation }))}
                isCurrentAiProviderConfigured={isCurrentAiProviderConfigured}
                selectedAiProvider={aiSettings.selectedProvider}
              />

              <div className="flex flex-col sm:flex-row justify-between items-center my-6 gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <p className="text-sm text-geist-secondary dark:text-dark-geist-secondary">
                    {isLoading ? 'Loading...' : `Showing ${displayedRfps.length} of ${allRfps.length + convexRfps.length} RFPs`}
                    {selectedRfpIds.size > 0 && ` (${selectedRfpIds.size} selected)`}
                    {allRfps.length > 0 && allRfps[0]?.source.includes('Mock') && !apiFetchFailedWarning && ` (Using Mock Data for ${currentRfpSourceCategory})`}
                  </p>
                  {/* Source Filter Chips */}
                  <div className="flex items-center gap-1 p-0.5 bg-accents-1 dark:bg-dark-accents-1 border border-accents-2 dark:border-dark-accents-2 rounded-md">
                    {(['all', 'sam.gov', 'rfpmart', 'csv'] as const).map((src) => (
                      <button
                        key={src}
                        onClick={() => setSourceFilter(src)}
                        className={`px-2 py-1 text-xs font-medium rounded transition-all ${sourceFilter === src
                            ? 'bg-white dark:bg-dark-accents-2 text-geist-foreground dark:text-dark-geist-foreground shadow-sm'
                            : 'text-accents-5 dark:text-accents-4 hover:bg-accents-2 dark:hover:bg-dark-accents-2'
                          }`}
                        aria-pressed={sourceFilter === src}
                      >
                        {src === 'all' ? 'All' : src === 'sam.gov' ? 'SAM.gov' : src === 'rfpmart' ? 'RFPMart' : 'CSV'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleSort('score')}
                    className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-dark-accents-1 text-geist-secondary dark:text-dark-geist-secondary border border-accents-2 dark:border-dark-accents-2 rounded-md hover:border-accents-4 dark:hover:border-accents-5 hover:text-geist-foreground dark:hover:text-dark-geist-foreground transition-colors"
                    aria-label={`Sort by score, current direction: ${sortConfig.key === 'score' ? sortConfig.direction : 'none'}`}
                  >
                    Score {renderSortIcon('score')}
                  </button>
                  <button
                    onClick={() => handleSort('deadlineDate')}
                    className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-dark-accents-1 text-geist-secondary dark:text-dark-geist-secondary border border-accents-2 dark:border-dark-accents-2 rounded-md hover:border-accents-4 dark:hover:border-accents-5 hover:text-geist-foreground dark:hover:text-dark-geist-foreground transition-colors"
                    aria-label={`Sort by deadline, current direction: ${sortConfig.key === 'deadlineDate' ? sortConfig.direction : 'none'}`}
                  >
                    Deadline {renderSortIcon('deadlineDate')}
                  </button>
                </div>
              </div>

              {isLoading && <div className="py-20"><LoadingSpinner message="Loading and evaluating RFPs..." /></div>}
              {error && !apiFetchFailedWarning && <div className="text-center text-red-600 dark:text-red-400 p-6 bg-red-50 dark:bg-red-900 dark:bg-opacity-30 rounded-md shadow-vercel-sm" role="alert">Critical Error: {error}</div>}

              {!isLoading && displayedRfps.length === 0 && (
                <div className="text-center text-geist-secondary dark:text-dark-geist-secondary p-12 bg-white dark:bg-dark-accents-1 rounded-lg shadow-vercel-md">
                  No RFPs match your current filters {allRfps.length > 0 ? 'from the current data set.' : 'or no data could be loaded.'}
                </div>
              )}

              {!isLoading && displayedRfps.length > 0 && (
                <div className="space-y-6">
                  {displayedRfps.map(rfp => (
                    <RfpCard
                      key={rfp.id}
                      rfp={rfp}
                      onViewDetails={() => handleViewDetailsClick(rfp)}
                      isSelected={selectedRfpIds.has(rfp.id)}
                      onToggleSelection={handleRfpSelectionToggle}
                      onEvaluateSingleWithAi={handleEvaluateSingleRfpWithAi}
                      isCurrentAiProviderConfigured={isCurrentAiProviderConfigured}
                      selectedAiProvider={aiSettings.selectedProvider}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {currentView === 'rawData' && (
            <>
              {isLoading && <div className="py-20"><LoadingSpinner message="Loading raw API data..." /></div>}
              {error && !apiFetchFailedWarning && <div className="text-center text-red-600 dark:text-red-400 p-6 bg-red-50 dark:bg-red-900 dark:bg-opacity-30 rounded-md shadow-vercel-sm" role="alert">Error fetching raw data: {error}</div>}
              {!isLoading && !error && <RawDataView data={rawApiData} onViewDetailsById={handleViewDetailsByIdInRawView} />}
              {!isLoading && error && rawApiData.length > 0 && (
                <RawDataView data={rawApiData} onViewDetailsById={handleViewDetailsByIdInRawView} />
              )}
            </>
          )}

          {currentView === 'admin' && (
            <AdminView
              criteriaConfig={currentCriteriaConfig}
              onToggleMasterCriterion={handleToggleMasterCriterion}
              onToggleCriterionItem={handleToggleCriterionItem}
              aiSettings={aiSettings}
              onUpdateAiSettings={handleUpdateAiSettings}
              onAutoImproveCorePrompt={handleAutoImproveCorePrompt}
              isImprovingPrompt={isImprovingPrompt}
              autoRefreshIntervalHours={autoRefreshIntervalHours}
              onUpdateAutoRefreshInterval={handleUpdateAutoRefreshInterval}
              isGeminiConfiguredViaEnv={isGeminiConfiguredViaEnv}
            />
          )}


          {modalRfpSummary && (
            <Modal isOpen={!!modalRfpSummary} onClose={closeModal} title={modalTitle}>
              <div className="text-sm">
                {modalRfpDetailLoading && <div className="py-10"><LoadingSpinner message="Loading RFP details..." /></div>}
                {modalRfpDetailError && (
                  <div className="text-center text-red-600 dark:text-red-400 p-4 bg-red-50 dark:bg-red-900 dark:bg-opacity-30 rounded-md" role="alert">
                    Error loading details: {modalRfpDetailError}
                  </div>
                )}

                {modalRfpDetailData && !modalRfpDetailLoading && !modalRfpDetailError && (
                  <>
                    <DetailItem label="Full RFP URL" value={<a href={modalRfpDetailData.url} target="_blank" rel="noopener noreferrer" className="text-vercel-blue hover:underline break-all">{modalRfpDetailData.url}</a>} />
                    <DetailItem label="Detailed Description" htmlValue={highlightKeywords(modalRfpDetailData.description, allHighlightKeywords)} />
                    <DetailItem label="Scope of Service" htmlValue={highlightKeywords(modalRfpDetailData.scope_of_service, allHighlightKeywords)} />
                    <DetailItem label="Posted Date" value={modalRfpDetailData.posted_date} />
                    <DetailItem label="Expiry / Key Dates" value={modalRfpDetailData.expiry_date} />
                    <DetailItem label="Question Deadline" value={modalRfpDetailData.question_deadline} />
                    <DetailItem label="RFP Location" value={modalRfpDetailData.location} />
                    <DetailItem label="Budget Info (from detail)" value={modalRfpDetailData.budget} />
                    <DetailItem label="Eligibility" value={modalRfpDetailData.eligibility} />
                    <DetailItem label="Work Performance" value={modalRfpDetailData.work_performance} />
                    <DetailItem label="Category (from detail)" value={modalRfpDetailData.category} />
                    <DetailItem label="Country" value={modalRfpDetailData.country} />
                    <DetailItem label="State" value={modalRfpDetailData.state} />
                    <DetailItem label="Detail Source ID" value={modalRfpDetailData.id} />
                  </>
                )}

                <div className="mt-4 pt-4 border-t border-accents-2 dark:border-dark-accents-2">
                  {modalRfpSummary.evaluation && (
                    <>
                      <h4 className="font-semibold text-md text-geist-foreground dark:text-dark-geist-foreground mb-2">
                        Evaluation Summary {modalRfpIsEvaluating ? "(Updating...)" : ""}
                      </h4>
                      {modalRfpSummary.evaluation.aiProviderError && (
                        <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2 p-2 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 rounded-md border border-red-200 dark:border-red-700" role="alert">
                          <strong>AI Provider Error:</strong> {modalRfpSummary.evaluation.aiProviderError}
                        </p>
                      )}
                      <DetailItem
                        label="Overall Score"
                        value={`${modalRfpSummary.evaluation.score}/${modalRfpSummary.evaluation.maxScore} (${modalRfpSummary.evaluation.isFit ? 'Good Fit' : 'Potential Mismatch'})`}
                      />
                      <p className="text-geist-secondary dark:text-dark-geist-secondary mb-3 text-xs">{modalRfpSummary.evaluation.reasoning}</p>
                      <div className="space-y-2 mt-3">
                        {Object.entries(modalRfpSummary.evaluation.criteriaResults).map(([key, result]) => {
                          const criterionKeyTyped = key as EvaluationCriterionKey;
                          const criterionConfig = currentCriteriaConfig[criterionKeyTyped];
                          if (!criterionConfig || !criterionConfig.isMasterEnabled) return null;
                          return (
                            <div key={key} className={`p-3 rounded-md border text-xs ${result.met ? 'bg-green-50 dark:bg-green-900 dark:bg-opacity-20 border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border-red-200 dark:border-red-700'}`}>
                              <div className="flex items-center">
                                {result.met ? (
                                  <span className="inline-flex items-center justify-center w-4 h-4 mr-2 rounded-full bg-green-500 text-white flex-shrink-0"><ModalTickIcon /></span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-4 h-4 mr-2 rounded-full border border-red-500 text-red-500 flex-shrink-0"><ModalCrossIcon /></span>
                                )}
                                <p className={`font-medium ${result.met ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>{criterionConfig.key}</p>
                              </div>
                              {result.details && <p className="text-xs text-geist-secondary dark:text-dark-geist-secondary mt-1 pl-6">{result.details}</p>}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Fit Analysis Section */}
                  <div className="mt-6 pt-4 border-t border-accents-2 dark:border-dark-accents-2">
                    <h3 className="text-lg font-semibold text-geist-foreground dark:text-dark-geist-foreground mb-2">
                      Fit Analysis & Recommendation
                    </h3>
                    {modalFitAnalysisLoading && (
                      <div className="py-6"><LoadingSpinner message="Generating fit analysis..." /></div>
                    )}
                    {!modalFitAnalysisLoading && modalRfpDetailData?.fitAnalysis?.analysisError && (
                      <div className="text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 rounded-md" role="alert">
                        Error generating fit analysis: {modalRfpDetailData.fitAnalysis.analysisError}
                      </div>
                    )}
                    {!modalFitAnalysisLoading && modalRfpDetailData?.fitAnalysis && !modalRfpDetailData.fitAnalysis.analysisError && (
                      <div className="space-y-1"> {/* Reduced space-y for tighter packing if needed */}
                        {/* Recommendation first */}
                        {modalRfpDetailData.fitAnalysis.recommendation && (
                          <div>
                            <FormattedTextDisplay text={modalRfpDetailData.fitAnalysis.recommendation} />
                          </div>
                        )}

                        {/* Then What Makes It Fit / Areas for Clarification */}
                        {modalRfpDetailData.fitAnalysis.whatMakesItFit && (
                          <div className="mt-3"> {/* Margin to separate from recommendation block */}
                            {/* No explicit heading here, relying on FormattedTextDisplay to render internal headings */}
                            <FormattedTextDisplay text={modalRfpDetailData.fitAnalysis.whatMakesItFit} />
                          </div>
                        )}

                        {modalRfpDetailData.fitAnalysis.generatedBy && (
                          <p className="text-xs text-accents-5 dark:text-accents-4 mt-3 text-right">
                            Analysis generated by: {modalRfpDetailData.fitAnalysis.generatedBy}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => modalRfpSummary && handleEvaluateSingleRfpWithAi(modalRfpSummary, true)}
                      disabled={!isCurrentAiProviderConfigured || modalRfpDetailLoading || !modalRfpDetailData || modalRfpIsEvaluating || modalFitAnalysisLoading}
                      className="w-full px-4 py-2 text-xs font-medium border rounded-md shadow-vercel-sm transition-colors focus:outline-none focus:ring-2 focus:ring-vercel-blue focus:ring-offset-1 dark:focus:ring-offset-dark-accents-1 flex items-center justify-center gap-1.5 bg-white dark:bg-dark-accents-2 text-geist-secondary dark:text-dark-geist-secondary border-accents-2 dark:border-dark-accents-2 hover:border-accents-4 dark:hover:border-accents-5 hover:text-geist-foreground dark:hover:text-dark-geist-foreground disabled:opacity-60 disabled:cursor-not-allowed"
                      title={
                        !isCurrentAiProviderConfigured ? `${aiSettings.selectedProvider} AI not configured` :
                          (modalRfpDetailLoading || !modalRfpDetailData) ? "Waiting for full details to load..." :
                            (modalRfpIsEvaluating || modalFitAnalysisLoading) ? `Evaluating with ${aiSettings.selectedProvider} AI...` : `Re-evaluate with ${aiSettings.selectedProvider} AI using full details`
                      }
                    >
                      <ProviderLogo
                        provider={aiSettings.selectedProvider}
                        active={isCurrentAiProviderConfigured && !modalRfpIsEvaluating && !modalFitAnalysisLoading}
                        disabled={!isCurrentAiProviderConfigured || modalRfpIsEvaluating || modalRfpDetailLoading || !modalRfpDetailData || modalFitAnalysisLoading}
                      />
                      <span>
                        {(modalRfpIsEvaluating || modalFitAnalysisLoading) ? `AI Updating (Details with ${aiSettings.selectedProvider})...` : `Re-evaluate & Update Analysis with ${aiSettings.selectedProvider} AI`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </Modal>
          )}
        </div>
      </SignedIn>
    </>
  );
};

export default App;
