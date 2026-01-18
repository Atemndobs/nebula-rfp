
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { KeywordAnalysisResult, RfpDetail, RfpFitAnalysis, EvaluationCriterionKey, NebulaLogixCriterion, EvaluationResult, AiSettings, CriterionItem, AiProvider } from '../types';
import { GEMINI_ENV_API_KEY_ERROR_MESSAGE } from '../constants';

// Storage key for API settings (must match ApiKeyManager)
const API_SETTINGS_STORAGE_KEY = "rfp_ai_api_settings";

// Get API key dynamically - checks UI settings first, then env variable
function getGeminiApiKey(): string | undefined {
  try {
    const stored = localStorage.getItem(API_SETTINGS_STORAGE_KEY);
    if (stored) {
      const settings = JSON.parse(stored);
      // Support both old format (settings[provider]) and new format (settings.providers[provider])
      const providerSettings = settings.providers?.[AiProvider.GEMINI] || settings[AiProvider.GEMINI];
      if (providerSettings?.apiKey) {
        return providerSettings.apiKey;
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  // Fallback to env variable
  return import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
}

// Get model dynamically - checks UI settings first, then defaults
function getGeminiModel(): string {
  try {
    const stored = localStorage.getItem(API_SETTINGS_STORAGE_KEY);
    if (stored) {
      const settings = JSON.parse(stored);
      // Support both old format and new format
      const providerSettings = settings.providers?.[AiProvider.GEMINI] || settings[AiProvider.GEMINI];
      if (providerSettings?.model) {
        return providerSettings.model;
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  return "gemini-2.0-flash";
}

// Create AI client dynamically
function getAiClient(): GoogleGenAI | null {
  const apiKey = getGeminiApiKey();
  if (apiKey) {
    return new GoogleGenAI({ apiKey });
  }
  return null;
}

export const isGeminiAvailable = (): boolean => !!getGeminiApiKey();

const getGeminiErrorFeedback = (error: any): string => {
  if (error.message && error.message.toLowerCase().includes("api key not valid")) {
    return "Gemini API Key is invalid. Please configure a valid key in Admin > AI Provider Settings.";
  }
  if (error.error && error.error.details && Array.isArray(error.error.details)) {
    const apiKeyInvalidDetail = error.error.details.find(
      (d: any) => d.reason === "API_KEY_INVALID" || (d['@type'] && d['@type'].includes('ErrorInfo') && d.reason === 'API_KEY_INVALID')
    );
    if (apiKeyInvalidDetail) {
      return "Gemini API Key is invalid. Please configure a valid key in Admin > AI Provider Settings.";
    }
  }
  if (error.message && error.message.toLowerCase().includes("quota")) {
    return "Gemini API request failed due to quota issues. Please check your quota limits.";
  }
  if (error.message && error.message.toLowerCase().includes("not found")) {
    return `Model not found. Please select a valid model in Admin > AI Provider Settings.`;
  }
  return `Gemini API error: ${error.message || 'Unknown error'}. Check console for details.`;
};


export const analyzeTextWithGemini = async (
  text: string,
  targetKeywords: string[],
  corePromptTemplate: string, // The main prompt asking for JSON
  systemInstruction?: string  // Specific behavioral instruction for the criterion
): Promise<KeywordAnalysisResult> => {
  const ai = getAiClient();
  if (!ai) {
    console.error(GEMINI_ENV_API_KEY_ERROR_MESSAGE);
    return { foundKeywords: [], isMatch: false, error: "Gemini API Key not configured. Please set it in Admin > AI Provider Settings." };
  }

  const model = getGeminiModel();
  
  let populatedPrompt = corePromptTemplate.replace("{{TEXT_TO_ANALYZE}}", text);
  populatedPrompt = populatedPrompt.replace("{{TARGET_KEYWORDS_LIST}}", targetKeywords.join(', '));

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: populatedPrompt,
      config: {
        responseMimeType: "application/json",
        ...(systemInstruction && { systemInstruction }),
        // thinkingConfig: { thinkingBudget: 0 } 
      },
    });
    
    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    const parsedResult = JSON.parse(jsonStr) as KeywordAnalysisResult;
    if (typeof parsedResult.isMatch === 'boolean' && Array.isArray(parsedResult.foundKeywords)) {
        return parsedResult; // No error field here means success
    } else {
        const formatError = "Gemini response format unexpected for keyword analysis.";
        console.error(formatError, parsedResult);
        return { foundKeywords: [], isMatch: false, error: formatError };
    }

  } catch (error: any) {
    const errorMessage = getGeminiErrorFeedback(error);
    console.error("Error calling Gemini API for keyword analysis or parsing response:", error); // Log original error
    return { foundKeywords: [], isMatch: false, error: errorMessage };
  }
};


export const generateTextWithGemini = async (
  prompt: string,
  systemInstruction?: string
): Promise<{ text: string | null; error?: string }> => {
  const ai = getAiClient();
  if (!ai) {
    console.error(GEMINI_ENV_API_KEY_ERROR_MESSAGE);
    return { text: null, error: "Gemini API Key not configured. Please set it in Admin > AI Provider Settings." };
  }

  const model = getGeminiModel();

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        ...(systemInstruction && { systemInstruction }),
      },
    });
    
    return { text: response.text.trim() };

  } catch (error: any) {
    const errorMessage = getGeminiErrorFeedback(error);
    console.error("Error calling Gemini API for general text generation:", error); // Log original error
    return { text: null, error: errorMessage };
  }
};

const generateRfpCriteriaSummary = (criteriaConfig: Record<EvaluationCriterionKey, NebulaLogixCriterion>): string => {
  let summary = "Nebula Logix's Key Evaluation Criteria (Focus on enabled items only):\n";
  for (const key in criteriaConfig) {
    const criterion = criteriaConfig[key as EvaluationCriterionKey];
    if (criterion.isMasterEnabled) {
      summary += `- ${criterion.key}: ${criterion.description}\n`;
      
      const enabledKeywords = (criterion.keywords || []).filter(kw => kw.enabled).map(kw => kw.value);
      if (enabledKeywords.length > 0) {
        summary += `  Key enabled aspects: ${enabledKeywords.slice(0, 5).join(', ')}\n`;
      } else if (criterion.keywords) { // Check if keywords array exists even if all are disabled
        summary += `  Key aspects: (No specific sub-items currently enabled for this criterion)\n`;
      }

      const enabledCategories = (criterion.preferredCategories || []).filter(cat => cat.enabled).map(cat => cat.value);
      if (enabledCategories.length > 0) {
         summary += `  Preferred enabled categories: ${enabledCategories.join(', ')}\n`;
      } else if (criterion.preferredCategories) {
         summary += `  Preferred categories: (No specific categories currently enabled for this criterion)\n`;
      }
    }
  }
  return summary;
};


export const generateRfpFitAnalysisWithGemini = async (
  rfpDetail: RfpDetail,
  criteriaConfig: Record<EvaluationCriterionKey, NebulaLogixCriterion>,
  aiSettings: AiSettings, // For system instructions or future model choices
  existingEvaluation?: EvaluationResult // Optional existing evaluation for context
): Promise<RfpFitAnalysis> => {
  const ai = getAiClient();
  if (!ai) {
    console.error(GEMINI_ENV_API_KEY_ERROR_MESSAGE);
    return { analysisError: "Gemini API Key not configured. Please set it in Admin > AI Provider Settings.", generatedBy: 'AI' };
  }

  const model = getGeminiModel();
  const criteriaSummary = generateRfpCriteriaSummary(criteriaConfig); // This now only lists enabled items

  const rfpDataString = `
    RFP Details:
    Title: ${rfpDetail.title}
    Description: ${rfpDetail.description}
    Scope of Service: ${rfpDetail.scope_of_service}
    Location: ${rfpDetail.location}
    Budget: ${rfpDetail.budget}
    Key Dates (Posted, Expiry, Question Deadline): Posted: ${rfpDetail.posted_date}, Expiry: ${rfpDetail.expiry_date}, Question: ${rfpDetail.question_deadline}
    Eligibility: ${rfpDetail.eligibility}
    Work Performance: ${rfpDetail.work_performance}
    Category: ${rfpDetail.category}
  `.trim();

  const fitPrompt = `
    You are an AI assistant helping a software development company (Nebula Logix) evaluate RFPs for internal discussion.
    ${rfpDataString}

    ${criteriaSummary}

    Based on all the information above, and strictly adhering to Nebula Logix's preferences *as explicitly defined by the enabled items in the criteria summary*, provide an analysis covering these points:
    1.  **Positive Alignments:** What specific aspects of this RFP (technical, scope, client, logistics) align well with Nebula Logix's strengths and preferences *as outlined in their enabled criteria items from the summary*?
    2.  **Potential Gaps or Areas for Clarification:** What key information seems to be missing from the RFP that is crucial for a full assessment (e.g., budget if not specified, vague technical requirements)? Are there any aspects that are unclear or could be a concern based on Nebula Logix's *enabled criteria items*?
    3.  **What Would Strengthen Fit:** If certain unclear aspects were clarified positively, or if minor misalignments related to *currently enabled criteria items* were adjustable, what changes or clarifications would make this RFP a stronger fit for Nebula Logix?

    Present this as a concise, well-structured summary. Use clear headings for each of the three points. Do not add conversational fluff.
  `.trim();

  let whatMakesItFit = "";
  let recommendation = "";
  let analysisError: string | undefined;

  try {
    const fitResponse = await ai.models.generateContent({
        model: model,
        contents: fitPrompt,
        config: {
           // systemInstruction: aiSettings.systemInstructions?.[EvaluationCriterionKey.CLIENT_PROFILE] // Example general system instruction
        }
    });
    whatMakesItFit = fitResponse.text.trim();

    // Now, generate recommendation
    const recommendationPrompt = `
      Given the RFP details, Nebula Logix's criteria (focusing on *enabled items* from the summary), and the fit analysis summary provided below, what is your recommendation?

      ${rfpDataString}
      ${criteriaSummary}

      Fit Analysis Summary:
      ${whatMakesItFit}

      ${existingEvaluation ? `Previous Score based on enabled criteria: ${existingEvaluation.score}/${existingEvaluation.maxScore}. Initial Fit: ${existingEvaluation.isFit ? 'Yes' : 'No'}.` : ''}

      Recommendation Options:
      - Strongly Pursue: Excellent match with Nebula Logix's *active and enabled* preferences.
      - Consider Pursuing: Good alignment with *active and enabled* preferences, worth exploring further.
      - Proceed with Caution: Some notable concerns or missing information when compared against *active and enabled* preferences, needs careful vetting.
      - Decline: Significant misalignments with *active and enabled* preferences or red flags.

      Provide one recommendation from the options above, followed by a 1-2 sentence justification for your choice, relating it back to the *enabled criteria items*.
      Format exactly like this:
      Recommendation: [Your Chosen Option]
      Justification: [Your concise reasoning]
    `.trim();
    
    const recommendationResponse = await ai.models.generateContent({
        model: model,
        contents: recommendationPrompt,
        config: { /* No specific config for this, simple text output */ }
    });
    recommendation = recommendationResponse.text.trim();

  } catch (error: any) {
    console.error("Error during Gemini RFP Fit Analysis generation:", error);
    analysisError = getGeminiErrorFeedback(error);
  }

  return {
    whatMakesItFit: analysisError ? undefined : whatMakesItFit,
    recommendation: analysisError ? undefined : recommendation,
    analysisError,
    generatedBy: 'AI',
  };
};
