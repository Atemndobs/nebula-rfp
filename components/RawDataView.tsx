
import React, { useState } from 'react';
import { ApiRfp, RawDataViewProps } from '../types';
import { parseDeadlineFromTitleString } from '../services/rfpDataService';
import { exportApiRfpsToCsv } from '../services/csvExportService'; // Import the new export function

const truncateString = (str: string, num: number): string => {
  if (!str) return '';
  if (str.length <= num) {
    return str;
  }
  return str.slice(0, num) + '...';
};

const RawDataView: React.FC<RawDataViewProps> = ({ data, onViewDetailsById }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!data) { // Simplified check, as empty array is handled below
    return (
      <div className="text-center text-geist-secondary dark:text-dark-geist-secondary p-12 bg-white dark:bg-dark-accents-1 rounded-lg shadow-vercel-md">
        Loading raw data or no data available.
      </div>
    );
  }
  
  if (data.length === 0) {
     return (
      <div className="text-center text-geist-secondary dark:text-dark-geist-secondary p-12 bg-white dark:bg-dark-accents-1 rounded-lg shadow-vercel-md">
        No raw data to display.
      </div>
    );
  }


  const expandedHeaders = Object.keys(data[0]);
  const compactHeaders = ['ID', 'Deadline', 'Title', 'Location', 'Description'];
  const headersToDisplay = isExpanded ? expandedHeaders : compactHeaders;

  const handleExport = () => {
    if (data && data.length > 0) {
      exportApiRfpsToCsv(data);
    }
  };

  const baseButtonClasses = "px-4 py-2 text-xs font-medium border rounded-md shadow-vercel-sm transition-colors focus:outline-none focus:ring-2 focus:ring-vercel-blue focus:ring-offset-2 dark:focus:ring-offset-dark-accents-1";
  const secondaryButtonClasses = `${baseButtonClasses} bg-white dark:bg-dark-accents-1 text-geist-secondary dark:text-dark-geist-secondary border-accents-2 dark:border-dark-accents-2 hover:border-accents-4 dark:hover:border-accents-5 hover:text-geist-foreground dark:hover:text-dark-geist-foreground disabled:opacity-50 disabled:cursor-not-allowed`;


  return (
    <div className="bg-white dark:bg-dark-accents-1 p-4 sm:p-6 rounded-lg shadow-vercel-md border border-accents-2 dark:border-dark-accents-2">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-xl font-semibold text-geist-foreground dark:text-dark-geist-foreground">Raw API Data</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={secondaryButtonClasses}
            aria-live="polite"
          >
            {isExpanded ? 'Compact View' : 'Expanded View'}
          </button>
          <button
            onClick={handleExport}
            disabled={!data || data.length === 0}
            className={secondaryButtonClasses} // Use same styling as view toggle or primary
            title="Export current raw data to CSV"
          >
            Export CSV
          </button>
        </div>
      </div>
      <p className="text-xs text-geist-secondary dark:text-dark-geist-secondary mb-4">
        Displaying {data.length} items in {isExpanded ? 'expanded' : 'compact'} view.
        {!isExpanded && onViewDetailsById && " Click ID for details."}
      </p>
      <div className="overflow-x-auto rounded-md border border-accents-2 dark:border-dark-accents-2">
        <table className="min-w-full divide-y divide-accents-2 dark:divide-dark-accents-2 text-sm">
          <thead className="bg-accents-1 dark:bg-dark-accents-1">
            <tr>
              {headersToDisplay.map((header) => (
                <th
                  key={header}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-geist-secondary dark:text-dark-geist-secondary uppercase tracking-wider"
                >
                  {header.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-geist-background dark:bg-dark-geist-background divide-y divide-accents-2 dark:divide-dark-accents-2">
            {data.map((item, index) => (
              <tr key={item.id || index} className="hover:bg-accents-1 dark:hover:bg-dark-accents-1 transition-colors">
                {headersToDisplay.map((header) => {
                  let cellValue: any;
                  let rawValueForTitle: string | undefined = undefined;

                  if (!isExpanded) {
                    switch (header) {
                      case 'ID':
                        cellValue = onViewDetailsById ? (
                          <button 
                            onClick={() => onViewDetailsById(item.id)}
                            className="text-vercel-blue hover:underline font-medium"
                            title={`View details for ${item.id}`}
                          >
                            {item.id}
                          </button>
                        ) : item.id;
                        rawValueForTitle = item.id;
                        break;
                      case 'Deadline':
                        cellValue = parseDeadlineFromTitleString(item.title) || 'N/A';
                        rawValueForTitle = cellValue as string;
                        break;
                      case 'Title':
                        cellValue = truncateString(item.title, 26);
                        rawValueForTitle = item.title;
                        break;
                      case 'Location':
                        cellValue = item.location || 'N/A';
                         rawValueForTitle = item.location;
                        break;
                      case 'Description':
                        cellValue = truncateString(item.description, 26);
                        rawValueForTitle = item.description;
                        break;
                      default:
                        cellValue = 'N/A';
                    }
                  } else {
                    cellValue = item[header as keyof ApiRfp];
                    rawValueForTitle = String(cellValue);
                     if (typeof cellValue === 'string' && (cellValue.startsWith('http://') || cellValue.startsWith('https://'))) {
                        cellValue = (
                          <a
                            href={cellValue}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-vercel-blue hover:underline"
                            title={cellValue}
                          >
                            {truncateString(cellValue, 40)}
                          </a>
                        );
                      } else {
                         cellValue = truncateString(String(cellValue ?? 'N/A'), 70); // Handle null/undefined before String()
                      }
                  }
                  
                  return (
                    <td
                      key={header}
                      className="px-4 py-3 whitespace-nowrap text-geist-secondary dark:text-dark-geist-secondary"
                      title={rawValueForTitle}
                    >
                      {cellValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RawDataView;
