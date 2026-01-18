

import { NebulaLogixCriterion, EvaluationCriterionKey, RFP, KeywordAnalysisResult, CriterionEvaluationResult, CriterionItem, AiProvider } from './types';

const MIN_DEADLINE_DAYS_OUT = 5;

const isDeadlineSufficient = (deadline?: string | null): boolean => {
  if (!deadline) return true; 
  try {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0,0,0,0); 
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= MIN_DEADLINE_DAYS_OUT;
  } catch (e) {
    return false; 
  }
};

// Helper to check for keywords in text, case-insensitive
const checkKeywords = (text: string, keywords?: CriterionItem[]): CriterionItem[] => {
  if (!keywords || keywords.length === 0) return [];
  const lowerText = text.toLowerCase();
  return keywords.filter(kwItem => kwItem.enabled && lowerText.includes(kwItem.value.toLowerCase()));
};

// Helper to get just the string values of enabled keywords
const getEnabledKeywordValues = (items?: CriterionItem[]): string[] => {
  if (!items) return [];
  return items.filter(item => item.enabled).map(item => item.value);
}

export const DEFAULT_AI_CORE_PROMPT_TEMPLATE = `Analyze the following text to determine if it mentions any of these keywords or concepts.
Text: "{{TEXT_TO_ANALYZE}}"
Keywords: {{TARGET_KEYWORDS_LIST}}

Respond ONLY with a JSON object matching this structure: {"foundKeywords": ["keyword1", "keyword2", ...], "isMatch": boolean (true if any keyword is found, false otherwise)}.
Do not include any other text or markdown formatting like \`\`\`json.`;

export const DEFAULT_SYSTEM_INSTRUCTIONS: Record<EvaluationCriterionKey, string | undefined> = {
  [EvaluationCriterionKey.TECHNICAL_RELEVANCE]: "You are an expert assistant evaluating RFPs for technical relevance based on specific technologies, frameworks, and methodologies. Determine if the RFP text aligns with the provided keywords.",
  [EvaluationCriterionKey.SCOPE_FIT]: "You are an expert assistant evaluating RFPs for scope fit. Determine if the project described aligns with common project types like redesigns, portal development, cloud migrations, or API integrations, based on provided keywords.",
  [EvaluationCriterionKey.SKILL_SET_ALIGNMENT]: "You are an expert assistant evaluating RFPs for skill set and team role alignment. Determine if the project requires team roles or skills that match the provided keywords related to common software development and design team structures.",
  [EvaluationCriterionKey.CATEGORY_FOCUS]: undefined,
  [EvaluationCriterionKey.CLIENT_PROFILE]: undefined,
  [EvaluationCriterionKey.LOGISTICS]: undefined,
};


export const NEBULA_LOGIX_CRITERIA_CONFIG: Record<EvaluationCriterionKey, NebulaLogixCriterion> = {
  [EvaluationCriterionKey.TECHNICAL_RELEVANCE]: {
    key: EvaluationCriterionKey.TECHNICAL_RELEVANCE,
    description: "Core Stack Alignment: Frontend (React, Next.js, Tailwind CSS, TypeScript, UI/UX, responsive design), Backend (Serverless, Serverless Compose, AWS Lambda, API Gateway, Node.js, microservices), Database (PostgreSQL, Aurora Serverless), Hosting/DevOps (AWS, GitLab CI/CD, S3, CloudFront), Testing & Docs (Playwright, end-to-end testing, automated QA, documentation systems e.g., Mintlify). Also considers general software development terms.",
    keywords: [
      "Next.js", "reactjs", "React", "TypeScript", "Serverless Compose", "serverless", "AWS Lambda", "AWS", "Postgres", "PostgreSQL", "Aurora Serverless",
      "api gateway", "node.js", "microservices", 
      "tailwind css", "ui/ux", "responsive design", 
      "gitlab ci/cd", "s3", "cloudfront",
      "playwright", "end-to-end testing", "automated qa", "documentation systems", "mintlify",
      "software", "API", "APIs", "Website", "systems", "UX", "UI", "Architecture"
    ].map(kw => ({ value: kw, enabled: true })),
    isMasterEnabled: true,
    geminiSystemInstruction: DEFAULT_SYSTEM_INSTRUCTIONS[EvaluationCriterionKey.TECHNICAL_RELEVANCE], // This will be part of AiSettings.systemInstructions
    evaluator: (rfp: RFP, criterion: NebulaLogixCriterion, aiAnalysisResult?: KeywordAnalysisResult): CriterionEvaluationResult => {
      if (aiAnalysisResult) {
        return { met: aiAnalysisResult.isMatch, details: aiAnalysisResult.foundKeywords.length > 0 ? `AI found: ${aiAnalysisResult.foundKeywords.join(', ')}` : "AI found no relevant keywords." };
      }
      const textToSearch = `${rfp.title} ${rfp.summary}`;
      const foundItems = checkKeywords(textToSearch, criterion.keywords);
      return { met: foundItems.length > 0, details: foundItems.length > 0 ? `Keywords matched: ${foundItems.map(item => item.value).join(', ')}` : "No keywords matched via fallback." };
    }
  },
  [EvaluationCriterionKey.SCOPE_FIT]: {
    key: EvaluationCriterionKey.SCOPE_FIT,
    description: "Ideal Scopes: Website or web app redesigns with modern frontend stacks, Custom portals/dashboards for government or enterprise, Cloud migration or serverless backend development, API integration projects (REST/GraphQL), Mobile-responsive web platforms (B2B/B2C).",
    keywords: [
      "website redesign", "web app redesign", "modern frontend", 
      "custom portal", "dashboard", "government portal", "enterprise portal",
      "cloud migration", "serverless backend development",
      "api integration", "rest api", "graphql api",
      "mobile-responsive", "b2b platform", "b2c platform"
    ].map(kw => ({ value: kw, enabled: true })),
    isMasterEnabled: true,
    geminiSystemInstruction: DEFAULT_SYSTEM_INSTRUCTIONS[EvaluationCriterionKey.SCOPE_FIT],
    evaluator: (rfp: RFP, criterion: NebulaLogixCriterion, aiAnalysisResult?: KeywordAnalysisResult): CriterionEvaluationResult => {
       if (aiAnalysisResult) {
        return { met: aiAnalysisResult.isMatch, details: aiAnalysisResult.foundKeywords.length > 0 ? `AI found: ${aiAnalysisResult.foundKeywords.join(', ')}` : "AI found no relevant keywords." };
      }
      const textToSearch = `${rfp.title} ${rfp.summary}`;
      const foundItems = checkKeywords(textToSearch, criterion.keywords);
      return { met: foundItems.length > 0, details: foundItems.length > 0 ? `Keywords matched: ${foundItems.map(item => item.value).join(', ')}` : "No keywords matched via fallback." };
    }
  },
  [EvaluationCriterionKey.CATEGORY_FOCUS]: {
    key: EvaluationCriterionKey.CATEGORY_FOCUS,
    description: "Preferred project categories: Focuses on web/software development and design.",
    preferredCategories: ["web-design-and-development", "software-development", "it-services", "mobile-app-development"]
      .map(cat => ({ value: cat, enabled: true })),
    isMasterEnabled: true,
    evaluator: (rfp: RFP, criterion: NebulaLogixCriterion): CriterionEvaluationResult => {
      const rfpCategory = rfp.category?.toLowerCase().trim();
      const enabledPreferredCategories = criterion.preferredCategories?.filter(pc => pc.enabled).map(pc => pc.value.toLowerCase()) || [];
      const met = !!rfpCategory && (enabledPreferredCategories.some(pcValue => rfpCategory.includes(pcValue)));
      return { met, details: `RFP Category: ${rfp.category || 'N/A'}. Matched: ${met}. Preferred (enabled): ${enabledPreferredCategories.join(', ') || 'None'}` };
    }
  },
  [EvaluationCriterionKey.CLIENT_PROFILE]: {
    key: EvaluationCriterionKey.CLIENT_PROFILE,
    description: "Preferred Clients: U.S.-based agencies or local governments, Tech-forward organizations or agencies with digital maturity, RFPs referencing agile methods or collaborative approaches.",
    keywords: [
      "u.s. agency", "us agency", "u.s. government", "us government", "local government", "state government", "federal government",
      "tech-forward", "digital maturity",
      "agile", "collaborative approach", "scrum", "iterative development"
    ].map(kw => ({ value: kw, enabled: true })),
    isMasterEnabled: true,
    evaluator: (rfp: RFP, criterion: NebulaLogixCriterion): CriterionEvaluationResult => {
      const textToSearch = `${rfp.title} ${rfp.summary} ${rfp.location || ''}`; 
      const foundItems = checkKeywords(textToSearch, criterion.keywords); // checkKeywords respects .enabled
      const isUSBased = rfp.location?.toLowerCase().includes('usa') || rfp.location?.toLowerCase().includes('u.s.');
      
      // Check if there are any enabled keywords for this criterion
      const hasEnabledKeywords = criterion.keywords?.some(kw => kw.enabled) ?? false;
      
      let met: boolean;
      if (hasEnabledKeywords) {
        // If keywords are enabled, match requires either a keyword match OR US-based location
        met = foundItems.length > 0 || isUSBased;
      } else {
        // If no keywords are enabled, match only requires US-based location
        met = isUSBased;
      }
      
      let details = "";
      if (hasEnabledKeywords) {
        details += `Keywords matched: ${foundItems.map(item => item.value).join(', ') || 'None of the active keywords'}. `;
      } else {
        details += `No specific client profile keywords actively checked. `;
      }
      details += `U.S. based location detected: ${isUSBased}.`;

      return { met, details: met ? details.trim() : `Does not meet active client profile criteria. ${details.trim()}` };
    }
  },
  [EvaluationCriterionKey.LOGISTICS]: {
    key: EvaluationCriterionKey.LOGISTICS,
    description: "Logistics Requirements: Must allow remote participation (full or hybrid OK), Deadlines for submission must be at least 5 days out, RFP should include a clear scope or statement of work (SOW).",
    keywords: [ 
        // Keywords related to remote work
        { value: "remote", enabled: true, description: "Allows remote work" }, 
        { value: "hybrid work", enabled: true, description: "Allows hybrid work" }, 
        { value: "distributed team", enabled: true, description: "Supports distributed teams" }, 
        { value: "telecommute", enabled: true, description: "Allows telecommuting" }, 
        { value: "work from home", enabled: true, description: "Allows work from home" },
        // Keywords related to scope clarity
        { value: "clear scope", enabled: true, description: "Indicates a clear scope" }, 
        { value: "statement of work", enabled: true, description: "Includes SOW" }, 
        { value: "sow", enabled: true, description: "Includes SOW (abbrev.)" },
        { value: "detailed requirements", enabled: true, description: "Provides detailed requirements" }
    ],
    isMasterEnabled: true,
    detailsSummary: "Checks for: Sufficient deadline (>= 5 days), Mentions of enabled remote/hybrid work keywords, Mentions of enabled scope/SOW keywords.",
    evaluator: (rfp: RFP, criterion: NebulaLogixCriterion): CriterionEvaluationResult => {
      const deadlineOk = isDeadlineSufficient(rfp.deadline);
      const textToSearch = `${rfp.title} ${rfp.summary}`.toLowerCase();

      const enabledKeywords = (criterion.keywords || []).filter(kw => kw.enabled);
      
      // Separate enabled keywords by concept if needed, or treat all as general logistics keywords
      // For simplicity here, we'll check if *any* enabled logistics keyword is found.
      // A more nuanced approach could categorize keywords (e.g., "remote", "scope") if complex logic is desired.
      // For this fix, we assume any enabled keyword from the list contributes.

      let keywordsMet = true; // Assume true if no logistics keywords are specifically enabled for checking
      let foundKeywordsDetails: string[] = [];

      if (enabledKeywords.length > 0) {
        const matchedEnabledKeywords = enabledKeywords.filter(kw => textToSearch.includes(kw.value.toLowerCase()));
        if (matchedEnabledKeywords.length > 0) {
          keywordsMet = true;
          foundKeywordsDetails = matchedEnabledKeywords.map(kw => kw.value);
        } else {
          keywordsMet = false;
        }
      }

      const met = deadlineOk && keywordsMet;
      
      let details = `Deadline sufficient: ${deadlineOk}. `;
      if (enabledKeywords.length > 0) {
        details += `Active logistics keywords matched: ${keywordsMet ? foundKeywordsDetails.join(', ') : 'None'}. `;
      } else {
        details += `No specific logistics keywords actively checked. `;
      }
      details += `(RFP Deadline: ${rfp.deadline || 'N/A'}).`;
      
      return { met, details };
    }
  },
  [EvaluationCriterionKey.SKILL_SET_ALIGNMENT]: {
    key: EvaluationCriterionKey.SKILL_SET_ALIGNMENT,
    description: "Skill Set Alignment: Evaluates if the RFP requires roles or skills matching Nebula Logix's team composition.",
    keywords: [
      "Solution Architect", "Product Owner", "Fullstack Engineer", "Consulting Partner", 
      "Frontend Engineer", "Backend Engineer", "Mobile Engineer", 
      "QA Engineer", "Automation Engineer", "Software Developer", 
      "UI/UX Designer", "DevOps Engineer", "Infrastructure Architect",
      "Project Manager", "Business Analyst" 
    ].map(kw => ({ value: kw, enabled: true })),
    isMasterEnabled: true,
    geminiSystemInstruction: DEFAULT_SYSTEM_INSTRUCTIONS[EvaluationCriterionKey.SKILL_SET_ALIGNMENT],
    evaluator: (rfp: RFP, criterion: NebulaLogixCriterion, aiAnalysisResult?: KeywordAnalysisResult): CriterionEvaluationResult => {
      if (aiAnalysisResult) {
        return { met: aiAnalysisResult.isMatch, details: aiAnalysisResult.foundKeywords.length > 0 ? `AI found: ${aiAnalysisResult.foundKeywords.join(', ')}` : "AI found no relevant skill/role keywords." };
      }
      const textToSearch = `${rfp.title} ${rfp.summary}`;
      const foundItems = checkKeywords(textToSearch, criterion.keywords);
      return { met: foundItems.length > 0, details: foundItems.length > 0 ? `Skill/Role keywords matched: ${foundItems.map(item => item.value).join(', ')}` : "No specific skill/role keywords matched via fallback." };
    }
  }
};

export const API_KEY_ERROR_MESSAGE = "AI Provider API Key not configured. Please set it in the Admin panel or via the appropriate environment variable.";
export const GEMINI_ENV_API_KEY_ERROR_MESSAGE = "Gemini API Key not configured. Please set the process.env.API_KEY environment variable.";


export const getEnabledKeywordValuesFromConfig = (criterionKey: EvaluationCriterionKey): string[] => {
  const criterion = NEBULA_LOGIX_CRITERIA_CONFIG[criterionKey];
  if (criterion?.keywords) {
    return criterion.keywords.filter(item => item.enabled).map(item => item.value);
  }
  return [];
};

export const META_PROMPT_FOR_AI_CORE_PROMPT_IMPROVEMENT = `You are an AI assistant that helps refine prompts for other AI models.
The user has provided the following prompt template, which is used to analyze RFP text for keywords.
The template uses placeholders '{{TEXT_TO_ANALYZE}}' for the RFP text and '{{TARGET_KEYWORDS_LIST}}' for a comma-separated list of keywords.
The AI model is expected to return ONLY a valid JSON object of the format: {"foundKeywords": ["keyword1", "keyword2", ...], "isMatch": boolean}.

Current prompt template:
---
{{CURRENT_USER_PROMPT}}
---

Your task is to review and improve this prompt template. Make it clearer, more concise, and more effective at guiding the AI to:
1. Accurately identify if any of the provided keywords (or very close semantic equivalents) are present in the RFP text.
2. Correctly list the keywords that were found.
3. Reliably return ONLY the specified JSON structure without any extra explanations, conversation, or markdown.

Constraints for your output:
- Your output MUST be the revised prompt template itself, and nothing else.
- The revised prompt MUST retain the exact placeholders '{{TEXT_TO_ANALYZE}}' and '{{TARGET_KEYWORDS_LIST}}'.
- The revised prompt MUST instruct the AI to return only the JSON object: {"foundKeywords": ["keyword1", "keyword2", ...], "isMatch": boolean}.

Provide the improved prompt template:`;

// Constants for Automatic Refresh
export const DEFAULT_AUTO_REFRESH_INTERVAL_HOURS = 24; // Default to checking once a day
export const MIN_AUTO_REFRESH_INTERVAL_HOURS = 1;    // Minimum refresh interval
export const AUTO_REFRESH_INTERVAL_KEY = 'autoRefreshIntervalHours'; // localStorage key


// AI Provider configurations
interface AiProviderConstantConfig {
  name: string;
  defaultModel: string;
  models: string[]; // List of models appropriate for the app's text analysis tasks
  requiresApiKeyInUI: boolean;
  apiKeyEnvVar?: string; 
  requiresBaseUrl?: boolean; 
}

export const AVAILABLE_AI_PROVIDERS_CONFIG: Record<AiProvider, AiProviderConstantConfig> = {
  [AiProvider.GEMINI]: {
    name: "Google Gemini",
    defaultModel: "gemini-2.0-flash",
    models: [
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
      "gemini-1.5-flash-8b",
    ],
    requiresApiKeyInUI: true,
    apiKeyEnvVar: "VITE_GEMINI_API_KEY",
  },
  [AiProvider.OPENAI]: {
    name: "OpenAI",
    defaultModel: "gpt-4o",
    models: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
    requiresApiKeyInUI: true,
    apiKeyEnvVar: "OPENAI_API_KEY", 
  },
  [AiProvider.ANTHROPIC]: {
    name: "Anthropic",
    defaultModel: "claude-3-opus-20240229",
    models: ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"],
    requiresApiKeyInUI: true,
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
  },
  [AiProvider.GROQ]: {
    name: "Groq",
    defaultModel: "llama3-70b-8192", 
    models: ["llama3-70b-8192", "mixtral-8x7b-32768", "gemma-7b-it"],
    requiresApiKeyInUI: true, 
    apiKeyEnvVar: "GROQ_API_KEY",
  },
  [AiProvider.DEEPSEEK]: {
    name: "DeepSeek",
    defaultModel: "deepseek-coder", 
    models: ["deepseek-coder", "deepseek-chat"],
    requiresApiKeyInUI: true,
    apiKeyEnvVar: "DEEPSEEK_API_KEY",
  },
  [AiProvider.OLLAMA]: {
    name: "Ollama (Local)",
    defaultModel: "llama3:latest", 
    models: [], // Models are fetched dynamically via API
    requiresApiKeyInUI: false, 
    requiresBaseUrl: true,
  },
  [AiProvider.LM_STUDIO]: {
    name: "LM Studio (Local)",
    defaultModel: "loaded-model-name", // User should verify this or fetch
    models: [], // Models can be fetched dynamically if server supports /v1/models
    requiresApiKeyInUI: false,
    requiresBaseUrl: true, 
  },
};
