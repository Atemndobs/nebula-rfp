

import { RFP, EvaluationResult, EvaluationCriterionKey, NebulaLogixCriterion, CriterionEvaluationResult, RFPWithEvaluation, CriterionItem, AiSettings, KeywordAnalysisResult, AiProvider, ProviderConfig } from '../types';
import { analyzeTextWithGemini, isGeminiAvailable as isGeminiConfiguredViaEnv } from './geminiService'; 
import { analyzeTextWithOllama, isOllamaAvailable } from './ollamaService';
import { analyzeTextWithOpenAI, isOpenAiAvailable } from './openaiService';
import { analyzeTextWithLmStudio, isLmStudioAvailable } from './lmStudioService';
import { analyzeTextWithDeepSeek, isDeepSeekAvailable } from './deepseekService'; // Import DeepSeek services
import { DEFAULT_AI_CORE_PROMPT_TEMPLATE } from '../constants';

// Helper to get string values of enabled keywords from CriterionItem[]
const getEnabledKeywordValues = (items?: CriterionItem[]): string[] => {
  if (!items) return [];
  return items.filter(item => item.enabled).map(item => item.value);
};

const isProviderConfigured = (provider: AiProvider, providerConfig?: ProviderConfig, isGeminiEnvConfigured?: boolean): boolean => {
    if (provider === AiProvider.GEMINI) {
        return !!isGeminiEnvConfigured;
    }
    if (provider === AiProvider.OLLAMA) {
        // Ollama needs base URL and model for full configuration
        return isOllamaAvailable(providerConfig) && !!providerConfig?.model;
    }
    if (provider === AiProvider.OPENAI) {
        return isOpenAiAvailable(providerConfig) && !!providerConfig?.model;
    }
    if (provider === AiProvider.LM_STUDIO) {
        // LM Studio needs base URL and model
        return isLmStudioAvailable(providerConfig) && !!providerConfig?.model;
    }
    if (provider === AiProvider.DEEPSEEK) {
        return isDeepSeekAvailable(providerConfig) && !!providerConfig?.model;
    }
    // Default for other potential API key based providers (Anthropic, Groq)
    // Ensure model is also considered part of "configured"
    return !!providerConfig?.apiKey && !!providerConfig?.model; 
};


export const evaluateRfp = async (
  rfp: RFP, 
  config: Record<EvaluationCriterionKey, NebulaLogixCriterion>,
  aiSettings: AiSettings,
  isGeminiEnvConfiguredForApp?: boolean // Pass Gemini's specific env var status
): Promise<EvaluationResult> => {
  const criteriaResults: Record<EvaluationCriterionKey, CriterionEvaluationResult> = {} as Record<EvaluationCriterionKey, CriterionEvaluationResult>;
  let score = 0;
  const aiAnalysisStore: Record<string, any> = {};
  let overallAiProviderError: string | undefined;
  
  const selectedProvider = aiSettings.selectedProvider;
  const providerSettings = aiSettings.providerConfigs[selectedProvider];
  const currentProviderIsConfigured = isProviderConfigured(selectedProvider, providerSettings, isGeminiEnvConfiguredForApp);
  const aiCanBeUsed = aiSettings.useAiForEvaluation && currentProviderIsConfigured;

  let effectivelyEnabledCriteriaCount = 0;

  for (const key of Object.keys(config)) {
    const criterionKey = key as EvaluationCriterionKey;
    const criterionConfig = config[criterionKey];

    if (!criterionConfig) {
      console.warn(`Configuration for criterion ${criterionKey} is missing from provided config.`);
      criteriaResults[criterionKey] = { met: false, details: "Configuration missing for this criterion." };
      continue;
    }

    if (!criterionConfig.isMasterEnabled) {
      criteriaResults[criterionKey] = { met: false, details: "Criterion disabled by admin." };
      continue; 
    }
    
    effectivelyEnabledCriteriaCount++;

    let analysisResultForCriterion: KeywordAnalysisResult | undefined;
    const enabledKeywordsForAi = getEnabledKeywordValues(criterionConfig.keywords);
    
    const systemInstructionForCriterion = aiSettings.systemInstructions[criterionKey] || criterionConfig.geminiSystemInstruction; 

    if (aiCanBeUsed && 
        enabledKeywordsForAi.length > 0 &&
        (criterionKey === EvaluationCriterionKey.TECHNICAL_RELEVANCE || 
         criterionKey === EvaluationCriterionKey.SCOPE_FIT ||
         criterionKey === EvaluationCriterionKey.SKILL_SET_ALIGNMENT
        )) {
      
      let aiResult: KeywordAnalysisResult | undefined;

      if (selectedProvider === AiProvider.GEMINI) {
        aiResult = await analyzeTextWithGemini(
          `${rfp.title} ${rfp.summary}`,
          enabledKeywordsForAi,
          aiSettings.corePromptTemplate || DEFAULT_AI_CORE_PROMPT_TEMPLATE,
          systemInstructionForCriterion
        );
      } else if (selectedProvider === AiProvider.OLLAMA && providerSettings?.baseUrl && providerSettings?.model) {
        aiResult = await analyzeTextWithOllama(
            `${rfp.title} ${rfp.summary}`, enabledKeywordsForAi,
            aiSettings.corePromptTemplate || DEFAULT_AI_CORE_PROMPT_TEMPLATE,
            systemInstructionForCriterion, providerSettings
        );
      } else if (selectedProvider === AiProvider.OPENAI && providerSettings?.apiKey && providerSettings?.model) {
        aiResult = await analyzeTextWithOpenAI(
            `${rfp.title} ${rfp.summary}`, enabledKeywordsForAi,
            aiSettings.corePromptTemplate || DEFAULT_AI_CORE_PROMPT_TEMPLATE,
            systemInstructionForCriterion, providerSettings
        );
      } else if (selectedProvider === AiProvider.LM_STUDIO && providerSettings?.baseUrl && providerSettings?.model) {
        aiResult = await analyzeTextWithLmStudio(
            `${rfp.title} ${rfp.summary}`, enabledKeywordsForAi,
            aiSettings.corePromptTemplate || DEFAULT_AI_CORE_PROMPT_TEMPLATE,
            systemInstructionForCriterion, providerSettings
        );
      } else if (selectedProvider === AiProvider.DEEPSEEK && providerSettings?.apiKey && providerSettings?.model) {
        aiResult = await analyzeTextWithDeepSeek(
            `${rfp.title} ${rfp.summary}`, enabledKeywordsForAi,
            aiSettings.corePromptTemplate || DEFAULT_AI_CORE_PROMPT_TEMPLATE,
            systemInstructionForCriterion, providerSettings
        );
      } else {
        console.warn(`AI Provider ${selectedProvider} selected for criterion ${criterionKey}, but its analysis logic is not yet implemented or config is missing. Falling back.`);
      }

      if (aiResult) {
        analysisResultForCriterion = aiResult;
        if (aiResult.error && !overallAiProviderError) { // Capture the first provider error encountered
            overallAiProviderError = aiResult.error;
        }
        if (!aiResult.error) { // Only store successful AI analysis
            aiAnalysisStore[criterionKey] = aiResult;
        }
      }
    }
    
    criteriaResults[criterionKey] = criterionConfig.evaluator(rfp, criterionConfig, analysisResultForCriterion);
    if (criteriaResults[criterionKey].met) {
      score++;
    }
  }
  
  const maxScore = effectivelyEnabledCriteriaCount;
  const defaultPolicyThreshold = 4; // eval-rulea.md default (4/6)
  const scaledThreshold = maxScore > 0
    ? Math.max(1, Math.ceil((defaultPolicyThreshold / 6) * maxScore))
    : 0;
  const isFit = maxScore > 0 && score >= scaledThreshold;

  let reasoning = `Overall score ${score}/${maxScore}. `;
  if (maxScore === 0) {
    reasoning += "No criteria effectively enabled for evaluation. ";
  } else {
     reasoning += `${isFit ? 'Good potential fit.' : 'Likely not a fit.'} (threshold ${scaledThreshold}) `;
  }
  
  if (overallAiProviderError) {
    // If there was a provider error, AI was attempted but failed at provider level.
    // Reasoning doesn't need to state AI was disabled or not configured if an attempt was made.
  } else if (!currentProviderIsConfigured) {
    reasoning += `(${selectedProvider} AI not configured). `;
  } else if (!aiSettings.useAiForEvaluation) {
    reasoning += `(User disabled ${selectedProvider} AI analysis for evaluations). `;
  }


  return {
    isFit,
    score,
    maxScore,
    criteriaResults,
    reasoning: reasoning.trim(),
    aiAnalysis: aiAnalysisStore,
    aiProviderUsed: (aiSettings.useAiForEvaluation && currentProviderIsConfigured && Object.keys(aiAnalysisStore).length > 0 && !overallAiProviderError) ? selectedProvider : undefined,
    aiProviderError: overallAiProviderError,
  };
};

export const performBatchEvaluation = async (
  rfps: RFP[],
  config: Record<EvaluationCriterionKey, NebulaLogixCriterion>,
  aiSettings: AiSettings,
  isGeminiEnvConfiguredForApp?: boolean
): Promise<RFPWithEvaluation[]> => {
    const rfpsWithEvaluation: RFPWithEvaluation[] = rfps.map(rfp => ({ ...rfp, isEvaluating: true }));
    
    const geminiEnvConfigStatus = isGeminiEnvConfiguredForApp ?? isGeminiConfiguredViaEnv();

    for (let i = 0; i < rfpsWithEvaluation.length; i++) {
        try {
            const evaluation = await evaluateRfp(rfpsWithEvaluation[i], config, aiSettings, geminiEnvConfigStatus);
            rfpsWithEvaluation[i].evaluation = evaluation;
        } catch (error) {
            console.error(`Error evaluating RFP ${rfpsWithEvaluation[i].id}:`, error);
            
            let currentMaxScore = 0;
            Object.values(config).forEach(criterionConfig => {
                if (criterionConfig.isMasterEnabled) {
                    currentMaxScore++;
                }
            });

            const generalEvalError = error instanceof Error ? error.message : "Unknown evaluation error";
            rfpsWithEvaluation[i].evaluation = { 
                isFit: false,
                score: 0,
                maxScore: currentMaxScore,
                criteriaResults: {} as Record<EvaluationCriterionKey, CriterionEvaluationResult>, 
                reasoning: `Evaluation failed for this RFP: ${generalEvalError}`,
                aiProviderError: `Evaluation failed: ${generalEvalError}` // Propagate error here too
            };
             Object.keys(config).forEach(keyStr => {
                 const key = keyStr as EvaluationCriterionKey;
                 if (!rfpsWithEvaluation[i].evaluation!.criteriaResults[key] && config[key].isMasterEnabled) {
                    rfpsWithEvaluation[i].evaluation!.criteriaResults[key] = { met: false, details: "Evaluation process encountered an error." };
                 }
            });
        } finally {
            rfpsWithEvaluation[i].isEvaluating = false;
        }
    }
    return rfpsWithEvaluation;
};
