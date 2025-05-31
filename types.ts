

export interface ApiRfp { // Raw structure from new API
  id: string;
  title: string;
  location: string;
  description: string;
  posted_date: string;
  expiry_date: string;
  url: string;
  category: string;
}

export interface RFP {
  id: string;
  title: string;         // From apiRfp.title
  summary: string;       // From apiRfp.description
  budget?: string | null; // Kept for potential future use but not actively used from new API
  deadline?: string | null; // Parsed from apiRfp.title (e.g., "YYYY-MM-DD")
  url: string;           // From apiRfp.url
  source: string;        // e.g., "rfpmart.com (API)" or "Mock Data"
  rawData?: string;       // From apiRfp.description
  location?: string;      // From apiRfp.location
  category?: string;      // From apiRfp.category
  apiPostedDate?: string; // Store raw posted_date from API
  apiExpiryDate?: string; // Store raw expiry_date from API
}

// New interface for the detailed RFP data structure
export interface RfpDetail {
  id: string; 
  title: string; 
  description: string;
  scope_of_service: string;
  posted_date: string;
  expiry_date: string; 
  question_deadline: string;
  location: string; 
  budget: string; 
  eligibility: string;
  work_performance: string;
  category: string; 
  country: string;
  state: string; 
  url: string;
  fitAnalysis?: RfpFitAnalysis; // Added for "What Makes It Fit" and "Recommendation"
}

export interface RfpFitAnalysis {
  whatMakesItFit?: string;
  recommendation?: string;
  analysisError?: string;
  generatedBy?: 'AI' | 'Logic';
}


export enum EvaluationCriterionKey {
  TECHNICAL_RELEVANCE = "Technical Relevance", 
  SCOPE_FIT = "Scope Fit",                     
  CATEGORY_FOCUS = "Category Focus",           
  CLIENT_PROFILE = "Client Profile",           
  LOGISTICS = "Logistics",                     
  SKILL_SET_ALIGNMENT = "Skill Set Alignment", 
}

export interface CriterionEvaluationResult {
  met: boolean;
  details?: string; 
}

export interface EvaluationResult {
  isFit: boolean; 
  score: number; 
  maxScore: number; 
  criteriaResults: Record<EvaluationCriterionKey, CriterionEvaluationResult>;
  reasoning?: string; 
  aiAnalysis?: Record<string, any>; // Generalized from geminiAnalysis
  aiProviderUsed?: AiProvider; // Track which provider was used
  aiProviderError?: string; // To store errors from AI provider during evaluation
}

export interface RFPWithEvaluation extends RFP {
  evaluation?: EvaluationResult;
  isEvaluating?: boolean; 
}

export interface CriterionItem {
  value: string; // The keyword or item value
  enabled: boolean;
  description?: string; // Optional description for the item
}

export interface NebulaLogixCriterion {
  key: EvaluationCriterionKey;
  description: string;
  keywords?: CriterionItem[]; // Now an array of CriterionItem
  preferredCategories?: CriterionItem[]; // For CATEGORY_FOCUS, now CriterionItem[]
  evaluator: (rfp: RFP, criterion: NebulaLogixCriterion, aiAnalysisResult?: KeywordAnalysisResult) => CriterionEvaluationResult; // Changed from GeminiKeywordAnalysisResult
  detailsSummary?: string; 
  isMasterEnabled: boolean; // Tracks if the overall criterion is active
  geminiSystemInstruction?: string; // System instruction specific to this criterion for Gemini - will be part of generalized AI System Instructions
}


export type RfpSourceCategory = 'web' | 'mobile';

export interface FilterState {
  keyword: string;
  maxDeadline: string; 
  showOnlyFit: boolean;
}

export interface FilterControlsProps {
  filters: FilterState;
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onResetFilters: () => void;
  currentRfpSourceCategory: RfpSourceCategory;
  onSwitchRfpSourceCategory: (source: RfpSourceCategory) => void;
  currentRfpLimit: number;
  onChangeRfpLimit: (limit: number) => void;
}


export interface SortConfig {
  key: keyof Omit<RFPWithEvaluation, 'budget'> | 'score' | 'deadlineDate'; 
  direction: 'ascending' | 'descending';
}

// Generalized from GeminiKeywordAnalysisResult
export interface KeywordAnalysisResult {
  foundKeywords: string[];
  isMatch: boolean;
  error?: string; // To capture errors from AI analysis, e.g., invalid API key
}

export interface FetchRfpsResponse {
  data: ApiRfp[];
  source: 'live' | 'mock';
  warningMessage?: string; 
}

export interface RawDataViewProps {
  data: ApiRfp[];
  onViewDetailsById?: (rfpId: string) => void;
}

export interface RfpCardProps {
  rfp: RFPWithEvaluation;
  onViewDetails: (rfp: RFPWithEvaluation) => void;
  isSelected: boolean;
  onToggleSelection: (rfpId: string) => void;
  onEvaluateSingleWithAi: (rfp: RFPWithEvaluation) => void;
  isCurrentAiProviderConfigured: boolean; // Generalized
  selectedAiProvider: AiProvider; // Added for provider-specific logo
}

export interface SelectionControlsProps {
  selectedCount: number;
  displayedCount: number;
  onToggleSelectAllDisplayed: () => void;
  isAllDisplayedSelected: boolean;
  isIndeterminate: boolean;
  onSelectBestFits: () => void;
  onDeselectAll: () => void;
  onExportSelectedToCsv: () => void;
  hasGoodFitsDisplayed: boolean;
  onManualRefresh: () => void;
  isRefreshing: boolean;
  lastSuccessfulFetchTime: number | null;
  nextScheduledRefreshTime: number | null;
  autoRefreshIntervalHours: number;
  useAiForEvaluation: boolean; // Generalized
  onToggleUseAi: () => void; // Generalized
  isCurrentAiProviderConfigured: boolean; // Generalized
  selectedAiProvider: AiProvider; // To show which AI is active
}

export type AppView = 'home' | 'rawData' | 'admin';

export interface ViewSwitcherProps {
  currentView: AppView;
  onSwitchView: (view: AppView) => void;
}

export enum AiProvider {
  GEMINI = "Gemini",
  OPENAI = "OpenAI",
  ANTHROPIC = "Anthropic",
  GROQ = "Groq",
  DEEPSEEK = "DeepSeek",
  OLLAMA = "Ollama",
  LM_STUDIO = "LM Studio",
}

export interface ProviderConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string; // For Ollama
  isConfigured?: boolean; // Derived status
}

export interface AiSettings {
  selectedProvider: AiProvider;
  providerConfigs: Partial<Record<AiProvider, ProviderConfig>>;
  corePromptTemplate: string;
  systemInstructions: Partial<Record<EvaluationCriterionKey, string>>;
  useAiForEvaluation: boolean;
}


export interface AdminViewProps {
  criteriaConfig: Record<EvaluationCriterionKey, NebulaLogixCriterion>;
  onToggleMasterCriterion: (criterionKey: EvaluationCriterionKey, isEnabled: boolean) => void;
  onToggleCriterionItem: (criterionKey: EvaluationCriterionKey, itemValue: string, isEnabled: boolean) => void;
  
  aiSettings: AiSettings;
  onUpdateAiSettings: (newSettings: Partial<AiSettings> | ((prev: AiSettings) => AiSettings)) => void;
  
  onAutoImproveCorePrompt: () => Promise<void>;
  isImprovingPrompt: boolean;

  autoRefreshIntervalHours: number;
  onUpdateAutoRefreshInterval: (hours: number) => void;
  isGeminiConfiguredViaEnv: boolean; // Specifically for the initial Gemini env var check
}