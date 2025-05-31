
import { RFPWithEvaluation, ApiRfp } from '../types';

const escapeCsvCell = (cellData: any): string => {
  if (cellData === null || cellData === undefined) {
    return '';
  }
  const stringData = String(cellData);
  // If the string contains a comma, newline, or double quote, enclose it in double quotes.
  // Also, any double quote inside the string must be escaped by another double quote.
  if (stringData.includes(',') || stringData.includes('\n') || stringData.includes('"')) {
    return `"${stringData.replace(/"/g, '""')}"`;
  }
  return stringData;
};

export const exportRfpsToCsv = (rfps: RFPWithEvaluation[]): void => {
  if (!rfps || rfps.length === 0) {
    console.warn('No RFPs to export.');
    // Optionally, show a user notification here
    return;
  }

  const headers = [
    'ID',
    'Title',
    'URL',
    'Deadline',
    'Location',
    'Category',
    'Summary',
    'Score',
    'Is Fit',
    'Technical Relevance Met',
    'Technical Relevance Details',
    'Scope Fit Met',
    'Scope Fit Details',
    'Category Focus Met',
    'Category Focus Details',
    'Client Profile Met',
    'Client Profile Details',
    'Logistics Met',
    'Logistics Details',
    'Overall Reasoning',
  ];

  const csvRows = [headers.join(',')];

  rfps.forEach(rfp => {
    const row = [
      escapeCsvCell(rfp.id),
      escapeCsvCell(rfp.title),
      escapeCsvCell(rfp.url),
      escapeCsvCell(rfp.deadline || 'N/A'),
      escapeCsvCell(rfp.location || 'N/A'),
      escapeCsvCell(rfp.category || 'N/A'),
      escapeCsvCell(rfp.summary),
      escapeCsvCell(rfp.evaluation?.score ?? 'N/A'),
      escapeCsvCell(rfp.evaluation?.isFit ? 'Yes' : 'No'),
      escapeCsvCell(rfp.evaluation?.criteriaResults?.['Technical Relevance']?.met ? 'Yes' : 'No'),
      escapeCsvCell(rfp.evaluation?.criteriaResults?.['Technical Relevance']?.details || ''),
      escapeCsvCell(rfp.evaluation?.criteriaResults?.['Scope Fit']?.met ? 'Yes' : 'No'),
      escapeCsvCell(rfp.evaluation?.criteriaResults?.['Scope Fit']?.details || ''),
      escapeCsvCell(rfp.evaluation?.criteriaResults?.['Category Focus']?.met ? 'Yes' : 'No'),
      escapeCsvCell(rfp.evaluation?.criteriaResults?.['Category Focus']?.details || ''),
      escapeCsvCell(rfp.evaluation?.criteriaResults?.['Client Profile']?.met ? 'Yes' : 'No'),
      escapeCsvCell(rfp.evaluation?.criteriaResults?.['Client Profile']?.details || ''),
      escapeCsvCell(rfp.evaluation?.criteriaResults?.['Logistics']?.met ? 'Yes' : 'No'),
      escapeCsvCell(rfp.evaluation?.criteriaResults?.['Logistics']?.details || ''),
      escapeCsvCell(rfp.evaluation?.reasoning || ''),
    ];
    csvRows.push(row.join(','));
  });

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  const today = new Date();
  const dateString = `${today.getFullYear()}${(today.getMonth()+1).toString().padStart(2,'0')}${today.getDate().toString().padStart(2,'0')}`;
  link.setAttribute('download', `rfp_export_${dateString}.csv`);
  
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportApiRfpsToCsv = (apiRfps: ApiRfp[]): void => {
  if (!apiRfps || apiRfps.length === 0) {
    console.warn('No raw API RFPs to export.');
    return;
  }

  const headers = [
    'ID',
    'Title',
    'Location',
    'Description',
    'Posted Date',
    'Expiry Date',
    'URL',
    'Category',
  ];

  const csvRows = [headers.join(',')];

  apiRfps.forEach(rfp => {
    const row = [
      escapeCsvCell(rfp.id),
      escapeCsvCell(rfp.title),
      escapeCsvCell(rfp.location),
      escapeCsvCell(rfp.description),
      escapeCsvCell(rfp.posted_date),
      escapeCsvCell(rfp.expiry_date),
      escapeCsvCell(rfp.url),
      escapeCsvCell(rfp.category),
    ];
    csvRows.push(row.join(','));
  });

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  const today = new Date();
  const dateString = `${today.getFullYear()}${(today.getMonth()+1).toString().padStart(2,'0')}${today.getDate().toString().padStart(2,'0')}`;
  link.setAttribute('download', `raw_rfp_data_export_${dateString}.csv`);

  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
