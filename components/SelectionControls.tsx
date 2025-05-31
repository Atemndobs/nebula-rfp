
import React, { useRef } from 'react';
import { SelectionControlsProps, AiProvider } from '../types';
import { ProviderLogo } from './AiProviderLogos'; // Import the new ProviderLogo

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 mr-1 text-accents-5 dark:text-accents-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


const formatTimestampForDisplay = (timestamp: number | null, autoRefreshIntervalHours: number): string => {
  if (timestamp === null) return 'N/A';
  const date = new Date(timestamp);
  const now = new Date();
  
  const diffMs = date.getTime() - now.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  // For "Next Refresh"
  if (diffMs > 0) { 
    if (diffMinutes < 1) return 'in a moment';
    if (diffHours < 1) return `in ${diffMinutes} min${diffMinutes > 1 ? 's' : ''}`;
    if (diffHours < autoRefreshIntervalHours + 1 && diffHours < 48) return `in approx. ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  }
  // For "Last Refresh" or general past/future
  if (diffMs < 0) {
    if (Math.abs(diffMinutes) < 1) return 'moments ago';
    if (Math.abs(diffHours) < 1) return `${Math.abs(diffMinutes)} min${Math.abs(diffMinutes) > 1 ? 's' : ''} ago`;
    if (Math.abs(diffHours) < 24) return `${Math.abs(diffHours)} hour${Math.abs(diffHours) > 1 ? 's' : ''} ago`;
  }

  // Default to full date and time
  return date.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};


const SelectionControls: React.FC<SelectionControlsProps> = ({
  selectedCount,
  displayedCount,
  onToggleSelectAllDisplayed,
  isAllDisplayedSelected,
  isIndeterminate,
  onSelectBestFits,
  onDeselectAll,
  onExportSelectedToCsv,
  hasGoodFitsDisplayed,
  onManualRefresh,
  isRefreshing,
  lastSuccessfulFetchTime,
  nextScheduledRefreshTime,
  autoRefreshIntervalHours,
  useAiForEvaluation, 
  onToggleUseAi,       
  isCurrentAiProviderConfigured, 
  selectedAiProvider, 
}) => {
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const baseButtonClasses = "px-3.5 py-2 text-xs font-medium border rounded-md shadow-vercel-sm transition-colors focus:outline-none focus:ring-2 focus:ring-vercel-blue focus:ring-offset-2 dark:focus:ring-offset-dark-accents-1 flex items-center justify-center gap-1.5";
  const primaryButtonClasses = `${baseButtonClasses} bg-geist-foreground dark:bg-dark-geist-foreground text-geist-background dark:text-dark-geist-background hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`;
  const secondaryButtonClasses = `${baseButtonClasses} bg-white dark:bg-dark-accents-1 text-geist-secondary dark:text-dark-geist-secondary border-accents-2 dark:border-dark-accents-2 hover:border-accents-4 dark:hover:border-accents-5 hover:text-geist-foreground dark:hover:text-dark-geist-foreground disabled:opacity-50 disabled:cursor-not-allowed`;
  
  const aiToggleButtonClasses = `
    ${baseButtonClasses}
    ${!isCurrentAiProviderConfigured
      ? 'bg-accents-1 dark:bg-dark-accents-2 text-accents-4 dark:text-accents-5 border-accents-2 dark:border-dark-accents-2 cursor-not-allowed'
      : useAiForEvaluation
        ? 'bg-vercel-blue text-white border-vercel-blue hover:bg-opacity-90'
        : 'bg-white dark:bg-dark-accents-1 text-geist-secondary dark:text-dark-geist-secondary border-accents-2 dark:border-dark-accents-2 hover:border-accents-4 dark:hover:border-accents-5 hover:text-geist-foreground dark:hover:text-dark-geist-foreground'
    }
  `;

  return (
    <div className="my-6 p-4 bg-white dark:bg-dark-accents-1 border border-accents-2 dark:border-dark-accents-2 rounded-lg shadow-vercel-md">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            ref={selectAllCheckboxRef}
            checked={isAllDisplayedSelected && displayedCount > 0}
            onChange={onToggleSelectAllDisplayed}
            disabled={displayedCount === 0 || isRefreshing}
            id="select-all-displayed"
            className="h-5 w-5 rounded border-accents-3 dark:border-accents-5 text-vercel-blue focus:ring-vercel-blue focus:ring-1 focus:ring-offset-1 dark:focus:ring-offset-dark-accents-1 bg-white dark:bg-dark-accents-2 checked:bg-vercel-blue disabled:opacity-50"
            aria-label="Select all currently displayed RFPs"
          />
          <label htmlFor="select-all-displayed" className="text-sm text-geist-secondary dark:text-dark-geist-secondary">
            {selectedCount > 0 ? `${selectedCount} selected` : `Select All Displayed (${displayedCount})`}
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onManualRefresh}
            disabled={isRefreshing}
            className={secondaryButtonClasses}
            title="Refresh RFP data from the source"
          >
            <RefreshIcon />
            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
          <button
            onClick={onToggleUseAi}
            disabled={!isCurrentAiProviderConfigured || isRefreshing}
            className={aiToggleButtonClasses}
            title={!isCurrentAiProviderConfigured ? `${selectedAiProvider} AI not configured` : (useAiForEvaluation ? `Disable ${selectedAiProvider} AI Analysis` : `Enable ${selectedAiProvider} AI Analysis`)}
            aria-pressed={useAiForEvaluation && isCurrentAiProviderConfigured}
          >
            <ProviderLogo provider={selectedAiProvider} active={useAiForEvaluation && isCurrentAiProviderConfigured} disabled={!isCurrentAiProviderConfigured} />
            <span>
              {selectedAiProvider} Analysis: 
              <strong className="ml-1">
                {isCurrentAiProviderConfigured ? (useAiForEvaluation ? 'ON' : 'OFF') : 'N/A'}
              </strong>
            </span>
          </button>
          <button
            onClick={onSelectBestFits}
            disabled={!hasGoodFitsDisplayed || displayedCount === 0 || isRefreshing}
            className={secondaryButtonClasses}
            title={!hasGoodFitsDisplayed ? "No 'Good Fits' among displayed RFPs" : "Select all 'Good Fits' among displayed RFPs"}
          >
            Select Best Fits
          </button>
          <button
            onClick={onDeselectAll}
            disabled={selectedCount === 0 || isRefreshing}
            className={secondaryButtonClasses}
          >
            Deselect All
          </button>
          <button
            onClick={onExportSelectedToCsv}
            disabled={selectedCount === 0 || isRefreshing}
            className={primaryButtonClasses}
            title="Export selected RFPs to CSV file"
          >
            Export Selected CSV
          </button>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-accents-2 dark:border-dark-accents-2 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-geist-secondary dark:text-dark-geist-secondary">
        <div className="flex items-center">
            <ClockIcon />
            <span>Last refresh: {formatTimestampForDisplay(lastSuccessfulFetchTime, autoRefreshIntervalHours)}</span>
        </div>
        <div className="flex items-center">
            <ClockIcon />
            <span>
                Next scheduled: {nextScheduledRefreshTime ? formatTimestampForDisplay(nextScheduledRefreshTime, autoRefreshIntervalHours) : (autoRefreshIntervalHours > 0 ? 'Calculating...' : 'Auto-refresh off')}
            </span>
        </div>
      </div>
    </div>
  );
};

export default SelectionControls;
