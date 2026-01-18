

import React from 'react';
import { RFPWithEvaluation, EvaluationCriterionKey, CriterionEvaluationResult, RfpCardProps, AiProvider, EligibilityReason } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { NEBULA_LOGIX_CRITERIA_CONFIG } from '../constants';
import { ProviderLogo } from './AiProviderLogos';

const TickIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
  </svg>
);

const CrossIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
    <path fillRule="evenodd" d="M4.28 3.22a.75.75 0 0 0-1.06 1.06L6.94 8l-3.72 3.72a.75.75 0 1 0 1.06 1.06L8 9.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L9.06 8l3.72-3.72a.75.75 0 0 0-1.06-1.06L8 6.94 4.28 3.22Z" clipRule="evenodd" />
  </svg>
);

// AiIconMini is removed as ProviderLogo replaces it.

const CriterionDisplay: React.FC<{ criterionKey: EvaluationCriterionKey, result?: CriterionEvaluationResult }> = ({ criterionKey, result }) => {
  if (!result) return null;
  const config = NEBULA_LOGIX_CRITERIA_CONFIG[criterionKey];
  if (!config) {
    console.warn(`RfpCard: Missing config for criterion key: ${criterionKey}`);
    return null;
  }
  return (
    <div
      className={`p-2 rounded-md text-xs flex items-center border ${result.met ? 'bg-green-50 dark:bg-green-900 dark:bg-opacity-20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300'}`}
      title={result.details || config.description}
      role="listitem"
    >
      {result.met ? (
        <span className="inline-flex items-center justify-center w-4 h-4 mr-1.5 rounded-full bg-green-500 text-white flex-shrink-0" aria-label="Met">
          <TickIcon />
        </span>
      ) : (
        <span className="inline-flex items-center justify-center w-4 h-4 mr-1.5 rounded-full border border-red-500 text-red-500 flex-shrink-0" aria-label="Not Met">
          <CrossIcon />
        </span>
      )}
      <span className="font-medium truncate" title={config.key}>{config.key}</span>
    </div>
  );
};

// Display component for eligibility rules (from Convex evaluations)
const EligibilityRuleDisplay: React.FC<{ reason: EligibilityReason }> = ({ reason }) => {
  const isPassed = reason.outcome === 'pass';
  const isFlagged = reason.outcome === 'flag';

  // Human-readable rule names
  const ruleNames: Record<string, string> = {
    'us_entity_required': 'US Entity',
    'us_persons_only': 'US Persons',
    'us_organization': 'US Organization', // Legacy
    'security_clearance': 'Security Clearance',
    'set_aside': 'Set-Aside',
    'onsite_constraints': 'Onsite/Remote',
    'minimum_time': 'Response Time',
    'out_of_scope': 'Scope Match',
    'category_check': 'Category',
  };

  const displayName = ruleNames[reason.ruleId] || reason.ruleName;

  return (
    <div
      className={`p-2 rounded-md text-xs flex items-center border ${
        isPassed
          ? 'bg-green-50 dark:bg-green-900 dark:bg-opacity-20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300'
          : isFlagged
            ? 'bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300'
            : 'bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300'
      }`}
      title={reason.evidence || reason.ruleName}
      role="listitem"
    >
      {isPassed ? (
        <span className="inline-flex items-center justify-center w-4 h-4 mr-1.5 rounded-full bg-green-500 text-white flex-shrink-0" aria-label="Passed">
          <TickIcon />
        </span>
      ) : isFlagged ? (
        <span className="inline-flex items-center justify-center w-4 h-4 mr-1.5 rounded-full bg-yellow-500 text-white flex-shrink-0" aria-label="Flagged">
          !
        </span>
      ) : (
        <span className="inline-flex items-center justify-center w-4 h-4 mr-1.5 rounded-full border border-red-500 text-red-500 flex-shrink-0" aria-label="Failed">
          <CrossIcon />
        </span>
      )}
      <span className="font-medium truncate" title={displayName}>{displayName}</span>
      {reason.severity === 'hard' && !isPassed && (
        <span className="ml-1 text-[10px] opacity-75">(hard)</span>
      )}
    </div>
  );
};

const RfpCard: React.FC<RfpCardProps> = ({ rfp, onViewDetails, isSelected, onToggleSelection, onEvaluateSingleWithAi, isCurrentAiProviderConfigured, selectedAiProvider }) => {
  const { id, title, summary, deadline, url, evaluation, isEvaluating, location, category, source } = rfp;

  // Map source to display-friendly name and color
  const getSourceBadge = (src?: string) => {
    if (!src) return null;

    const lower = src.toLowerCase();

    // Pattern matching for flexible source detection
    if (lower.includes('sam.gov') || lower === 'sam.gov') {
      return { label: 'SAM.gov', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700' };
    }
    if (lower.includes('rfpmart') && (lower.includes('csv') || lower.includes('upload'))) {
      return { label: 'CSV', color: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 dark:border-indigo-700' };
    }
    if (lower.includes('rfpmart')) {
      return { label: 'RFPMart', color: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:border-purple-700' };
    }
    if (lower.includes('emma') || lower.includes('emma')) {
      return { label: 'eMMA', color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-700' };
    }
    if (lower.includes('csv') || lower.includes('upload')) {
      return { label: 'CSV', color: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 dark:border-indigo-700' };
    }

    // Fallback: use raw source but truncate if too long
    const displayLabel = src.length > 12 ? src.substring(0, 10) + '...' : src;
    return { label: displayLabel, color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600' };
  };

  const sourceBadge = getSourceBadge(source);

  const getScoreClasses = (score: number, maxScore: number): string => {
    if (maxScore === 0) return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'; // Neutral if no criteria
    const percentage = score / maxScore;
    if (percentage >= 0.6) return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700';
    if (percentage >= 0.4) return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700';
    return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700';
  };
  
  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString; 
    }
  };

  const evaluatedCriterionKeys = evaluation ? Object.keys(evaluation.criteriaResults) as EvaluationCriterionKey[] : [];

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation(); 
    onToggleSelection(id);
  };
  
  const baseButtonClasses = "px-3 py-1.5 text-xs font-medium border rounded-md shadow-vercel-sm transition-colors focus:outline-none focus:ring-2 focus:ring-vercel-blue focus:ring-offset-1 dark:focus:ring-offset-dark-accents-1 flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed";
  const primaryButtonClasses = `${baseButtonClasses} bg-geist-foreground dark:bg-dark-geist-foreground text-geist-background dark:text-dark-geist-background hover:opacity-80`;
  const secondaryButtonClasses = `${baseButtonClasses} bg-white dark:bg-dark-accents-2 text-geist-secondary dark:text-dark-geist-secondary border-accents-2 dark:border-dark-accents-2 hover:border-accents-4 dark:hover:border-accents-5 hover:text-geist-foreground dark:hover:text-dark-geist-foreground`;


  return (
    <article 
        className={`relative bg-white dark:bg-dark-accents-1 border ${isSelected ? 'border-vercel-blue shadow-vercel-lg' : 'border-accents-2 dark:border-dark-accents-2 shadow-vercel-md'} rounded-lg p-6 transition-all duration-150 hover:shadow-vercel-lg`}
        aria-labelledby={`rfp-title-${id}`}
    >
      <div className="absolute top-4 left-4 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()} 
          aria-labelledby={`rfp-title-${id}`}
          className="h-5 w-5 rounded border-accents-3 dark:border-accents-5 text-vercel-blue focus:ring-vercel-blue focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-dark-accents-1 bg-white dark:bg-dark-accents-2 checked:bg-vercel-blue"
        />
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start mb-4 pl-8">
        <h3 id={`rfp-title-${id}`} className="text-lg font-semibold text-geist-foreground dark:text-dark-geist-foreground hover:text-vercel-blue dark:hover:text-vercel-blue mb-2 sm:mb-0">
          <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline" onClick={(e) => e.stopPropagation()}>{title}</a>
        </h3>
        {evaluation && !isEvaluating && (
          evaluation.eligibility ? (
            // Show eligibility status badge for Convex evaluations
            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
              evaluation.eligibility.status === 'ELIGIBLE'
                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
                : evaluation.eligibility.status === 'PARTNER_REQUIRED'
                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
                  : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
            }`} aria-label={`Eligibility: ${evaluation.eligibility.status}`}>
              {evaluation.eligibility.status === 'ELIGIBLE' ? 'Eligible' :
               evaluation.eligibility.status === 'PARTNER_REQUIRED' ? 'Partner Needed' : 'Not Eligible'}
            </div>
          ) : (
            // Show score badge for AI/manual evaluations
            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getScoreClasses(evaluation.score, evaluation.maxScore)}`} aria-label={`Score: ${evaluation.score} out of ${evaluation.maxScore}`}>
              Score: {evaluation.score}/{evaluation.maxScore > 0 ? evaluation.maxScore : '-'}
              {evaluation.aiProviderUsed && <span className="ml-1 text-xs opacity-75">({evaluation.aiProviderUsed})</span>}
            </div>
          )
        )}
         {isEvaluating && (
          <div className="px-2.5 py-1">
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>

      <p className="text-sm text-geist-secondary dark:text-dark-geist-secondary mb-5 line-clamp-3 pl-8" title={summary}>{summary}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 text-xs text-geist-secondary dark:text-dark-geist-secondary pl-8">
        <div>
          <span className="font-medium">Deadline:</span>
          <span className="ml-1">{formatDate(deadline)}</span>
        </div>
        <div>
          <span className="font-medium">Location:</span>
          <span className="ml-1 truncate" title={location || 'N/A'}>{location || 'N/A'}</span>
        </div>
         {category && (
            <div>
                <span className="font-medium">Category:</span>
                <span className="ml-1 truncate" title={category}>{category}</span>
            </div>
        )}
      </div>
      
      {evaluation && !isEvaluating && (
        <>
          <div className="mb-3 pl-8">
            {evaluation.aiProviderError && (
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1 p-2 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 rounded-md border border-red-200 dark:border-red-700" role="alert">
                <strong>AI Provider Error:</strong> {evaluation.aiProviderError}
              </p>
            )}
            <p className={`text-xs font-medium ${evaluation.isFit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {evaluation.reasoning}
            </p>
          </div>

          {/* Display eligibility rules from Convex evaluations */}
          {evaluation.eligibility && evaluation.eligibility.reasons.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-4 pl-8" role="list" aria-label="Eligibility Rules">
              {evaluation.eligibility.reasons.map((reason, idx) => (
                <EligibilityRuleDisplay key={`${reason.ruleId}-${idx}`} reason={reason} />
              ))}
            </div>
          ) : evaluatedCriterionKeys.length > 0 ? (
            /* Display traditional criteria for non-Convex evaluations */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-4 pl-8" role="list" aria-label="Evaluation Criteria">
              {evaluatedCriterionKeys.map(key => {
                const result = evaluation.criteriaResults[key];
                if (NEBULA_LOGIX_CRITERIA_CONFIG[key]?.isMasterEnabled) {
                   return <CriterionDisplay key={key} criterionKey={key} result={result} />;
                }
                return null;
              })}
            </div>
          ) : (
             !isEvaluating && !evaluation.eligibility && <p className="text-xs text-geist-secondary dark:text-dark-geist-secondary mb-4 pl-8">No criteria effectively enabled for this evaluation.</p>
          )}
        </>
      )}
      {evaluation && !evaluation.eligibility && Object.keys(evaluation.criteriaResults).length === 0 && !isEvaluating && (
           <p className="text-xs text-geist-secondary dark:text-dark-geist-secondary mb-4 pl-8">Evaluation data available, but no criteria were effectively enabled or met.</p>
      )}


      <div className="mt-6 flex justify-between items-center">
        {/* Source Badge */}
        <div className="flex items-center gap-2">
          {sourceBadge && (
            <span
              className={`px-2.5 py-1 text-xs font-medium rounded-full border ${sourceBadge.color}`}
              title={`Source: ${sourceBadge.label}`}
            >
              {sourceBadge.label}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onEvaluateSingleWithAi(rfp);}}
            className={secondaryButtonClasses}
            disabled={!isCurrentAiProviderConfigured || isEvaluating}
            title={!isCurrentAiProviderConfigured ? `${selectedAiProvider} not configured` : (isEvaluating ? "Evaluating..." : `Re-evaluate with ${selectedAiProvider}`)}
            aria-label={`Re-evaluate with ${selectedAiProvider} for RFP: ${title}`}
          >
            <ProviderLogo provider={selectedAiProvider} active={isCurrentAiProviderConfigured && !isEvaluating} disabled={!isCurrentAiProviderConfigured || isEvaluating} />
            <span>{isEvaluating ? `${selectedAiProvider} ...` : `${selectedAiProvider} Eval`}</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onViewDetails(rfp);}}
            className={primaryButtonClasses}
            aria-label={`View details for RFP: ${title}`}
            disabled={isEvaluating}
          >
            View Details
          </button>
        </div>
      </div>
    </article>
  );
};

export default RfpCard;