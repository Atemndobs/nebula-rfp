
import React, { useState, useEffect } from 'react';
import { FilterState, FilterControlsProps, RfpSourceCategory } from '../types';

const DesktopIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.375 1.465c-.162.346-.396.652-.668.925a3 3 0 01-1.465.375H3.75M9 17.25v1.007a3 3 0 00.375 1.465c.162.346.396.652.668.925a3 3 0 001.465.375h5.25M9 17.25v1.007a3 3 0 01.375 1.465c.162.346.396.652.668.925a3 3 0 011.465.375h.433m-10.433 0S3 18.75 3 17.25V9A2.25 2.25 0 015.25 6.75h9.5A2.25 2.25 0 0117.25 9v8.25c0 1.5-2.25 1.5-2.25 1.5m-10.433 0c0 1.62.433 2.938.867 3.938m9.566-3.938c.434-1 .867-2.318.867-3.938m0-5.25h.008v.008h-.008V9m-5.25 0h.008v.008h-.008V9m-5.25 0h.008v.008h-.008V9M3 17.25v-2.25C3 13.5 4.5 12 6.75 12h6.75c2.25 0 3.75 1.5 3.75 3v2.25" />
  </svg>
);

const MobileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75A2.25 2.25 0 0015.75 1.5h-2.25m-3 0V3m3 0V3m0 18v-1.5m0 0h-3m3 0h.008v.008H12v-.008zm0 0H9m3 0h.008v.008H12v-.008zM5.25 9h.008v.008H5.25V9z" />
  </svg>
);

const UpArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    </svg>
);

const DownArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
);

const PlugSocketIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 mr-2">
    {/* Plug Body */}
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10H16V13C16 14.1046 15.1046 15 14 15H10C8.89543 15 8 14.1046 8 13V10Z" />
    {/* Prongs */}
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 10V6" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 10V6" />
    {/* Cable outlet */}
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V18" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.0} stroke="currentColor" className="w-4 h-4"> {/* Increased strokeWidth for visibility */}
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const FunnelIcon = () => ( // Plain funnel icon
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3L4 10H20L12 3Z" /> 
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 10H14V20H10V10Z" /> 
  </svg>
);


const FilterControls: React.FC<FilterControlsProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  currentRfpSourceCategory,
  onSwitchRfpSourceCategory,
  currentRfpLimit,
  onChangeRfpLimit,
}) => {
  const [localLimit, setLocalLimit] = useState<string | number>(currentRfpLimit);

  useEffect(() => {
    setLocalLimit(currentRfpLimit);
  }, [currentRfpLimit]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      onFilterChange(name as keyof FilterState, (e.target as HTMLInputElement).checked);
    } else {
      onFilterChange(name as keyof FilterState, value);
    }
  };
  
  const handleLocalLimitInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalLimit(e.target.value); // Keep as string while typing for better UX
  };

  const handleApplyLimit = () => {
    let newNumericLimit: number;
    const currentLocalValueStr = String(localLimit).trim();

    if (currentLocalValueStr === "") {
      newNumericLimit = 1; // Default for empty
    } else {
      const parsedNum = parseInt(currentLocalValueStr, 10);
      if (isNaN(parsedNum)) {
        // If parsing fails (e.g. "abc"), revert to the prop value rather than a fixed default
        newNumericLimit = currentRfpLimit; 
      } else {
        newNumericLimit = parsedNum;
      }
    }
    const validatedNum = Math.max(1, Math.min(newNumericLimit, 100));
    setLocalLimit(validatedNum); // Update UI to reflect the validated or reverted number
    
    // Call prop function only if the validated number is different from what App.tsx currently holds
    if (validatedNum !== currentRfpLimit) {
      onChangeRfpLimit(validatedNum);
    }
  };
  
  const handleIncrementLocalLimit = () => {
    const numLimit = Number(String(localLimit).trim()); // Ensure it's a string first, then number
    setLocalLimit(Math.min(isNaN(numLimit) ? 1 : numLimit + 1, 100));
  };

  const handleDecrementLocalLimit = () => {
    const numLimit = Number(String(localLimit).trim());
    setLocalLimit(Math.max(1, isNaN(numLimit) ? 1 : numLimit - 1));
  };

  const inputBaseClasses = "p-2.5 border border-accents-2 dark:border-dark-accents-2 rounded-md shadow-vercel-sm focus:ring-2 focus:ring-vercel-blue focus:border-vercel-blue text-sm bg-geist-background dark:bg-dark-accents-1 text-geist-foreground dark:text-dark-geist-foreground placeholder-accents-4 dark:placeholder-accents-5";
  const actionButtonBaseClasses = "px-2.5 py-2.5 border rounded-md text-sm font-medium transition-colors shadow-vercel-sm flex items-center justify-center";
  
  const sourceSwitcherButtonClass = (isActive: boolean) =>
    `px-2 py-1.5 rounded-sm text-sm font-medium transition-all duration-150 flex items-center space-x-1.5 justify-center ${ // Added justify-center, removed flex-1
      isActive
        ? 'bg-white dark:bg-dark-accents-2 text-geist-foreground dark:text-dark-geist-foreground shadow-sm'
        : 'text-accents-5 dark:text-accents-4 hover:bg-accents-2 dark:hover:bg-dark-accents-2'
    }`;
  
  const stepperButtonClass = "px-2 py-[0.275rem] bg-white dark:bg-dark-accents-1 text-geist-secondary dark:text-dark-geist-secondary hover:bg-accents-1 dark:hover:bg-dark-accents-2 transition-colors focus:outline-none";


  return (
    <div className="bg-white dark:bg-dark-accents-1 p-4 rounded-lg shadow-vercel-md mb-8 border border-accents-2 dark:border-dark-accents-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-10 gap-4 items-end">
        
        <div className="lg:col-span-2 md:col-span-1 sm:col-span-2">
          <input
            type="text"
            id="keyword"
            name="keyword"
            value={filters.keyword}
            onChange={handleInputChange}
            placeholder="Keyword search..."
            className={`${inputBaseClasses} w-full`}
            aria-label="Keyword Search"
          />
        </div>

        <div className="lg:col-span-2 md:col-span-1 sm:col-span-1">
          <div className="flex p-0.5 bg-accents-1 dark:bg-dark-accents-1 border border-accents-2 dark:border-dark-accents-2 rounded-md shadow-vercel-sm">
            <button
              onClick={() => onSwitchRfpSourceCategory('web')}
              aria-pressed={currentRfpSourceCategory === 'web'}
              title="Switch to Web Development RFPs"
              className={`${sourceSwitcherButtonClass(currentRfpSourceCategory === 'web')}`}
            >
              <DesktopIcon />
              <span className="sr-only sm:not-sr-only">Web</span>
            </button>
            <button
              onClick={() => onSwitchRfpSourceCategory('mobile')}
              aria-pressed={currentRfpSourceCategory === 'mobile'}
              title="Switch to Mobile Development RFPs"
              className={`${sourceSwitcherButtonClass(currentRfpSourceCategory === 'mobile')}`}
            >
              <MobileIcon />
              <span className="sr-only sm:not-sr-only">Mobile</span>
            </button>
          </div>
        </div>
        
        <div className="lg:col-span-2 md:col-span-1 sm:col-span-1">
           <div className="flex items-stretch rounded-md border border-accents-2 dark:border-dark-accents-2 shadow-vercel-sm h-[42px]"> {/* Ensure parent has fixed height or items-stretch works */}
            <input
              type="number"
              id="rfpLimit"
              name="rfpLimit"
              value={localLimit}
              onChange={handleLocalLimitInputChange}
              min="1"
              max="100" 
              placeholder="Limit"
              className="p-2.5 text-sm bg-geist-background dark:bg-dark-accents-1 text-geist-foreground dark:text-dark-geist-foreground placeholder-accents-4 dark:placeholder-accents-5 w-16 text-center focus:z-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none rounded-l-md border-none focus:ring-0"
              aria-label="RFP fetch limit"
            />
            <button
                onClick={handleApplyLimit}
                className="p-2.5 border-l border-r border-accents-2 dark:border-dark-accents-2 bg-white dark:bg-dark-accents-1 text-geist-secondary dark:text-dark-geist-secondary hover:bg-accents-1 dark:hover:bg-dark-accents-2 transition-colors focus:outline-none focus:z-10"
                aria-label="Apply limit"
                title="Apply new limit"
            >
                <CheckIcon />
            </button>
            <div className="flex flex-col border-none"> {/* Stepper container is borderless, individual buttons handle visual separation if needed */}
                <button 
                    onClick={handleIncrementLocalLimit} 
                    className={`${stepperButtonClass} rounded-tr-md border-b border-accents-2 dark:border-dark-accents-2`} 
                    aria-label="Increment limit"
                >
                    <UpArrowIcon />
                </button>
                <button 
                    onClick={handleDecrementLocalLimit} 
                    className={`${stepperButtonClass} rounded-br-md`}
                    aria-label="Decrement limit"
                >
                    <DownArrowIcon />
                </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 md:col-span-1 sm:col-span-1">
          <input
            type="date"
            id="maxDeadline"
            name="maxDeadline"
            value={filters.maxDeadline}
            onChange={handleInputChange}
            className={`${inputBaseClasses} w-full dark:[color-scheme:dark]`}
            aria-label="Maximum Deadline"
            title="Maximum Deadline"
          />
        </div>
        
        <div className="lg:col-span-2 md:col-span-3 sm:col-span-2 flex items-end space-x-2 h-full"> 
          <button
            type="button"
            onClick={() => onFilterChange('showOnlyFit', !filters.showOnlyFit)}
            className={`${actionButtonBaseClasses} {/* Removed w-full */}
              ${filters.showOnlyFit 
                ? 'bg-vercel-blue text-white border-vercel-blue hover:bg-opacity-90' 
                : 'bg-white dark:bg-dark-accents-1 text-geist-secondary dark:text-dark-geist-secondary border-accents-2 dark:border-dark-accents-2 hover:border-accents-4 dark:hover:border-accents-5 hover:text-geist-foreground dark:hover:text-dark-geist-foreground'
              }`}
            title="Toggle 'Good Fits' Only"
            aria-pressed={filters.showOnlyFit}
          >
            <PlugSocketIcon />
            <span className="hidden sm:inline">Good Fits</span>
             <span className="sm:hidden">Fits</span>
            <input
              type="checkbox"
              id="showOnlyFit"
              name="showOnlyFit"
              checked={filters.showOnlyFit}
              onChange={handleInputChange} 
              className="sr-only"
            />
          </button>
        
          <button
            onClick={onResetFilters}
            className={`${actionButtonBaseClasses} bg-white dark:bg-dark-accents-1 text-geist-secondary dark:text-dark-geist-secondary border-accents-2 dark:border-dark-accents-2 hover:border-accents-4 dark:hover:border-accents-5 hover:text-geist-foreground dark:hover:text-dark-geist-foreground`}
            aria-label="Reset Filters"
            title="Reset Filters"
          >
            <FunnelIcon /> {/* Changed from FilterXIcon */}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterControls;
