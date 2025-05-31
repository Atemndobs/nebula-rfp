

import { RfpDetail, RfpFitAnalysis, EvaluationCriterionKey, NebulaLogixCriterion, AiSettings, EvaluationResult, AiProvider, CriterionItem } from '../types';
import { generateRfpFitAnalysisWithGemini } from './geminiService';
import { parseDeadlineFromTitleString } from './rfpDataService'; // For deadline checking if needed

// Helper to check if a deadline is sufficient (e.g., >= 5 days out)
const MIN_DEADLINE_DAYS_OUT = 5;
const isDeadlineSufficient = (deadline?: string | null): boolean => {
  if (!deadline) return true; // No deadline means it's not a blocker by this rule alone
  try {
    const deadlineDate = new Date(deadline); // Assuming YYYY-MM-DD
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= MIN_DEADLINE_DAYS_OUT;
  } catch (e) {
    return false; // Invalid date format
  }
};

const getEnabledKeywords = (items?: CriterionItem[]): string[] => {
    if (!items) return [];
    return items.filter(item => item.enabled).map(item => item.value);
};


export const generateFitAnalysisLogically = (
  rfpDetail: RfpDetail,
  criteriaConfig: Record<EvaluationCriterionKey, NebulaLogixCriterion>,
  existingEvaluation?: EvaluationResult
): RfpFitAnalysis => {
  const whatMakesItFitLines: string[] = [];
  const areasForImprovementLines: string[] = [];
  const missingInfoLines: string[] = [];

  // 1. Positive Alignments (leveraging existing evaluation if available)
  if (existingEvaluation) {
    for (const key in existingEvaluation.criteriaResults) {
      const criterionKey = key as EvaluationCriterionKey;
      const result = existingEvaluation.criteriaResults[criterionKey];
      const criterionDetail = criteriaConfig[criterionKey];
      if (criterionDetail?.isMasterEnabled && result?.met) {
        whatMakesItFitLines.push(`- ${criterionKey}: Aligns well. ${result.details || ''}`);
      }
    }
  }
  if (whatMakesItFitLines.length === 0) {
      whatMakesItFitLines.push("- No strong positive alignments automatically detected from initial summary evaluation. Detailed review needed against enabled criteria.");
  }


  // 2. Potential Gaps or Areas for Clarification / What Would Strengthen Fit
  for (const key in criteriaConfig) {
    const criterionKey = key as EvaluationCriterionKey;
    const criterion = criteriaConfig[criterionKey];
    if (!criterion.isMasterEnabled) continue;

    const evalResult = existingEvaluation?.criteriaResults[criterionKey];

    if (!evalResult || !evalResult.met) {
      let improvementSuggestion = "";
      let suggestionDetails = "";

      switch (criterionKey) {
        case EvaluationCriterionKey.TECHNICAL_RELEVANCE:
        case EvaluationCriterionKey.SCOPE_FIT:
        case EvaluationCriterionKey.SKILL_SET_ALIGNMENT:
          const enabledKeywordsList = getEnabledKeywords(criterion.keywords);
          if (enabledKeywordsList.length > 0) {
              suggestionDetails = `relevant items like: ${enabledKeywordsList.slice(0,3).join(', ')}`;
          } else {
              suggestionDetails = `its currently configured preferences (no specific sub-items are active for this criterion)`;
          }
          improvementSuggestion = `Would be a stronger fit if the RFP aligned more closely with ${suggestionDetails}.`;
          break;
        case EvaluationCriterionKey.CATEGORY_FOCUS:
          const enabledPreferredCats = getEnabledKeywords(criterion.preferredCategories);
           if (enabledPreferredCats.length > 0) {
              suggestionDetails = `categories like: ${enabledPreferredCats.join(', ')}`;
          } else {
              suggestionDetails = `its currently configured preferences (no specific categories are active for this criterion)`;
          }
          improvementSuggestion = `RFP category '${rfpDetail.category || 'N/A'}' is not a primary focus. Alignment would improve if it related more to ${suggestionDetails}.`;
          break;
        case EvaluationCriterionKey.CLIENT_PROFILE:
            const enabledClientKeywords = getEnabledKeywords(criterion.keywords);
            if (enabledClientKeywords.length > 0) {
                improvementSuggestion = "Alignment with our ideal client profile (e.g., US-based, tech-forward, specific keywords) is unclear or not met based on active keywords.";
            } else {
                improvementSuggestion = "Alignment with our ideal client profile (e.g. US-based) is unclear or not met. No specific client keywords are active.";
            }
          break;
        case EvaluationCriterionKey.LOGISTICS:
          const logisticsIssues: string[] = [];
          if (!isDeadlineSufficient(rfpDetail.expiry_date)) logisticsIssues.push(`deadline (${rfpDetail.expiry_date || 'N/A'}) may be too soon`);
          
          const enabledLogisticsKeywords = getEnabledKeywords(criterion.keywords);
          if (enabledLogisticsKeywords.length > 0) {
            // Check if any enabled logistics keywords are mentioned (e.g. for remote work, SOW clarity)
            // This part is simplified; assumes presence of any enabled keyword is good.
            // The actual evaluation service handles the "met" logic more precisely.
            // Here we're just flagging potential gaps.
             const textToSearch = `${rfpDetail.description} ${rfpDetail.scope_of_service} ${rfpDetail.work_performance}`.toLowerCase();
             const foundEnabledLogisticsKeywords = enabledLogisticsKeywords.filter(kw => textToSearch.includes(kw.toLowerCase()));
             if(foundEnabledLogisticsKeywords.length === 0) {
                logisticsIssues.push(`does not clearly mention key logistical preferences (e.g., related to remote work, scope details as per active keywords)`);
             }
          } else {
             logisticsIssues.push("no specific logistics keywords are currently active for detailed checking");
          }
          improvementSuggestion = logisticsIssues.length > 0 ? `Logistical concerns or areas for clarification: ${logisticsIssues.join('; ')}.` : "Logistical aspects seem generally acceptable based on active criteria, but detailed review of terms is always needed.";
          break;
      }
      if (improvementSuggestion) {
        areasForImprovementLines.push(`- ${criterionKey}: ${improvementSuggestion} (Current details from summary eval: ${evalResult?.details || 'No specific match/details'})`);
      }
    }
  }


  // 3. Key Missing Information from RFP Detail
  if (!rfpDetail.budget || rfpDetail.budget.toLowerCase() === 'not specified' || rfpDetail.budget.trim() === '') {
    missingInfoLines.push("- Budget: Not specified or unclear. This is crucial for assessing project viability.");
  }
  if (!rfpDetail.scope_of_service || rfpDetail.scope_of_service.toLowerCase() === 'scope of work details not specified.' || rfpDetail.scope_of_service.trim() === '') {
    missingInfoLines.push("- Scope of Service: Lacks detailed breakdown. Important for accurately understanding effort and deliverables.");
  }
  if (!rfpDetail.eligibility || rfpDetail.eligibility.toLowerCase() === 'not specified' || rfpDetail.eligibility.trim() === '') {
    missingInfoLines.push("- Eligibility: Requirements are not clearly stated, which could impact our ability to bid.");
  }
   if (!rfpDetail.question_deadline || rfpDetail.question_deadline.toLowerCase() === 'not specified' || rfpDetail.question_deadline.trim() === '') {
    missingInfoLines.push("- Question Deadline: Not specified. This is important for seeking clarifications.");
  }

  let combinedWhatMakesItFit = "**Positive Alignments (based on active criteria):**\n" + (whatMakesItFitLines.length > 0 ? whatMakesItFitLines.join('\n') : "  - None automatically highlighted based on summary evaluation against active criteria; requires detailed manual review.\n");
  if (areasForImprovementLines.length > 0) {
    combinedWhatMakesItFit += "\n**Potential Gaps & Areas to Strengthen Fit (based on active criteria):**\n" + areasForImprovementLines.join('\n');
  }
  if (missingInfoLines.length > 0) {
    combinedWhatMakesItFit += "\n**Key Missing Information / Clarifications Needed:**\n" + missingInfoLines.join('\n');
  }
  if (whatMakesItFitLines.length === 0 && areasForImprovementLines.length === 0 && missingInfoLines.length === 0) {
    combinedWhatMakesItFit = "Detailed analysis required. No immediate strong alignments or major red flags identified programmatically from the provided details and summary evaluation against active criteria.";
  }


  // Recommendation Logic
  let recommendationText = "Proceed with Caution"; // Default
  let justification = "Requires detailed manual review and clarification on several points, considering currently active evaluation criteria.";

  if (existingEvaluation) {
    const { score, maxScore, isFit, reasoning } = existingEvaluation;
    const percentage = maxScore > 0 ? score / maxScore : 0;

    if (isFit && percentage >= 0.70) recommendationText = "Strongly Pursue";
    else if (isFit && percentage >= 0.50) recommendationText = "Consider Pursuing";
    else if (!isFit && percentage > 0.25 && missingInfoLines.length < 2) recommendationText = "Proceed with Caution";
    else recommendationText = "Decline";
    
    justification = reasoning || "Based on the initial evaluation score against active criteria.";
    if (missingInfoLines.length > 0) {
        justification += ` Key missing info: ${missingInfoLines.slice(0,1).join(', ')}.`;
    }
     if (areasForImprovementLines.length > 0 && recommendationText !== "Decline") {
        justification += ` Concerns regarding: ${areasForImprovementLines.map(l => l.split(':')[0].substring(1).trim()).slice(0,1).join(', ')}.`;
    }

  } else {
    // Basic logic if no prior evaluation
    if (whatMakesItFitLines.length >= 2 && areasForImprovementLines.length <= 1 && missingInfoLines.length <= 1) {
      recommendationText = "Consider Pursuing";
      justification = "Shows some positive alignments with active criteria. Further investigation of details and missing information is warranted.";
    } else if (whatMakesItFitLines.length > 0 || areasForImprovementLines.length < 3) {
      recommendationText = "Proceed with Caution";
      justification = "Some aspects align with active criteria, but several areas need clarification or do not fully meet them. Detailed review essential.";
    } else {
      recommendationText = "Decline";
      justification = "Significant misalignments with active criteria or lack of information makes this RFP a poor fit at this time.";
    }
  }
  const finalRecommendation = `Recommendation: ${recommendationText}\nJustification: ${justification.trim()}`;

  return { 
    whatMakesItFit: combinedWhatMakesItFit.trim(), 
    recommendation: finalRecommendation, 
    generatedBy: 'Logic' 
  };
};

export const generateFitAnalysis = async (
  rfpDetail: RfpDetail,
  criteriaConfig: Record<EvaluationCriterionKey, NebulaLogixCriterion>,
  aiSettings: AiSettings,
  isGeminiEnvConfigured: boolean,
  existingEvaluation?: EvaluationResult
): Promise<RfpFitAnalysis> => {
  // Only Gemini is considered for AI analysis in this function as per current plan
  const useAi = aiSettings.useAiForEvaluation && 
                aiSettings.selectedProvider === AiProvider.GEMINI && 
                isGeminiEnvConfigured;

  if (useAi) {
    try {
      const aiFitAnalysis = await generateRfpFitAnalysisWithGemini(rfpDetail, criteriaConfig, aiSettings, existingEvaluation);
      // Ensure AI doesn't return empty strings, fallback to a message
      if (!aiFitAnalysis.whatMakesItFit && !aiFitAnalysis.analysisError) {
        aiFitAnalysis.whatMakesItFit = "AI analysis for 'What Makes It Fit' did not yield specific points based on active criteria.";
      }
      if (!aiFitAnalysis.recommendation && !aiFitAnalysis.analysisError) {
        aiFitAnalysis.recommendation = "AI analysis for 'Recommendation' did not yield a specific recommendation based on active criteria.";
      }
      return { ...aiFitAnalysis, generatedBy: 'AI' };
    } catch (error) {
      console.error("AI Fit Analysis Error in orchestrator:", error);
      const logicalResult = generateFitAnalysisLogically(rfpDetail, criteriaConfig, existingEvaluation);
      return {
        ...logicalResult, // Fallback to logical
        analysisError: `AI analysis failed: ${error instanceof Error ? error.message : String(error)}. Displaying logically derived analysis.`,
        generatedBy: 'Logic', // Explicitly set to Logic on AI failure
      };
    }
  } else {
    return generateFitAnalysisLogically(rfpDetail, criteriaConfig, existingEvaluation);
  }
};
