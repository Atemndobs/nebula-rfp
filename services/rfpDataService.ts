
import { ApiRfp, FetchRfpsResponse, RfpDetail, RfpSourceCategory } from '../types';


// Parses "Month Day,YYYY" from a string like "...Deadline June 19,2025"
export const parseDeadlineFromTitleString = (titleStr: string): string | null => {
  if (!titleStr) return null;
  const match = titleStr.match(/Deadline\s+([A-Za-z]+\s+\d{1,2},\s*\d{4})/i);
  if (match && match[1]) {
    try {
      const date = new Date(match[1]);
      if (isNaN(date.getTime())) {
        console.warn(`Could not parse date from title (invalid date object): ${match[1]} in title "${titleStr}"`);
        return null;
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      console.warn(`Error parsing date from title segment: "${match[1]}" in title "${titleStr}"`, e);
      return null;
    }
  }
  return null;
};

const FASTAPI_LIST_BASE_URL = 'https://fastapi.curator.atemkeng.eu/api/v1/rfp/rfps_by_url';
// Note: Detail fetching now uses Convex scraper action (see fetchRfpDetailViaConvex)
// Keeping this for fallback if needed
const FASTAPI_DETAIL_BASE_URL = 'https://fastapi.curator.atemkeng.eu/api/v1/rfp/rfp_id';

const RFP_SOURCE_URLS: Record<RfpSourceCategory, string[]> = {
  web: [
    "https://www.rfpmart.com/web-design-and-development-rfp-government-contract.html",
    "https://www.rfpmart.com/website-design-and-development-rfp-government-contract.html",
    "https://www.rfpmart.com/web-site-design-and-development-rfp-government-contract.html",
  ],
  mobile: [
    "https://www.rfpmart.com/mobile-application-development-rfp-government-contract.html",
  ],
};

// Helper function to check if the response data is the specific category summary object
const isCategorySummaryObject = (responseData: any, categoryUrl: string): boolean => {
  return typeof responseData === 'object' &&
    responseData !== null &&
    !Array.isArray(responseData) &&
    typeof responseData.id === 'string' &&
    responseData.id.toUpperCase().endsWith('.HTML') &&
    responseData.url === categoryUrl;
};

const parseListResponse = (responseData: unknown, categoryUrl: string): ApiRfp[] | null => {
  if (Array.isArray(responseData)) {
    return responseData as ApiRfp[];
  }

  if (isCategorySummaryObject(responseData, categoryUrl)) {
    console.warn(`API for ${categoryUrl} returned a category summary object; treating it as empty results.`);
    return [];
  }

  if (
    typeof responseData === 'object' &&
    responseData !== null &&
    'results' in responseData &&
    Array.isArray((responseData as { results: unknown }).results)
  ) {
    return (responseData as { results: ApiRfp[] }).results;
  }

  return null;
};

export const fetchRfps = async (rfpSourceCategory: RfpSourceCategory = 'web', limit: number = 20): Promise<FetchRfpsResponse> => {
  const categoryUrls = RFP_SOURCE_URLS[rfpSourceCategory];
  const errors: string[] = [];
  const emptyResultsUrls: string[] = [];

  console.log(`Fetching RFPs from ${rfpSourceCategory} source, limit ${limit}: ${FASTAPI_LIST_BASE_URL}`);

  for (const categoryUrl of categoryUrls) {
    const requestBody = {
      url: categoryUrl,
      limit: limit,
      skip: 0
    };

    console.log("Request body:", requestBody);

    try {
      const response = await fetch(FASTAPI_LIST_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        errors.push(`${categoryUrl} -> ${response.status}${errorText ? `: ${errorText}` : ''}`);
        continue;
      }

      const responseData = await response.json();
      const liveData = parseListResponse(responseData, categoryUrl);

      if (liveData === null) {
        errors.push(
          `${categoryUrl} -> unexpected payload type (${typeof responseData})`
        );
        continue;
      }

      if (liveData.length > 0) {
        console.log(`Successfully fetched ${liveData.length} RFPs from live API (${rfpSourceCategory}) using ${categoryUrl}.`);
        return { data: liveData, source: 'live' };
      }

      emptyResultsUrls.push(categoryUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${categoryUrl} -> ${message}`);
    }
  }

  console.warn(`Live API for ${rfpSourceCategory} returned no records across all URL candidates.`);
  const details = [
    emptyResultsUrls.length > 0 ? `empty from: ${emptyResultsUrls.join(", ")}` : "",
    errors.length > 0 ? `errors: ${errors.slice(0, 2).join(" | ")}` : "",
  ].filter(Boolean).join("; ");

  return {
    data: [],
    source: 'live',
    warningMessage: details
      ? `Live API for ${rfpSourceCategory} returned no usable data (${details}).`
      : `Live API for ${rfpSourceCategory} returned no usable data.`,
  };
};

// Type for the expected raw response from the /rfp_id endpoint
interface ApiRfpDetailResponse {
  id: string;
  title: string;
  description: string;
  scope_of_service?: string;
  posted_date?: string;
  expiry_date?: string; // This might be the one parsed from title, or direct from API
  question_deadline?: string;
  location?: string;
  budget?: string;
  eligibility?: string;
  work_performance?: string;
  category?: string;
  country?: string;
  state?: string;
  url: string;
}

export const fetchRfpDetail = async (rfpUrl: string): Promise<RfpDetail> => {
  console.log(`Fetching detail for RFP URL: ${rfpUrl}`);
  const detailApiUrl = `${FASTAPI_DETAIL_BASE_URL}?url=${encodeURIComponent(rfpUrl)}`;

  try {
    const response = await fetch(detailApiUrl, {
      method: 'GET', // Changed from POST
      headers: {
        'Content-Type': 'application/json', // Keep for consistency, though GET typically doesn't send body
        'accept': 'application/json'
      }
      // No body for GET request
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request for RFP detail failed with status ${response.status}: ${errorText}`);
      throw new Error(`API request for RFP detail (URL: ${rfpUrl}) failed with status ${response.status}: ${errorText}`);
    }

    const apiRfpItem = await response.json() as ApiRfpDetailResponse;

    if (!apiRfpItem || typeof apiRfpItem !== 'object') {
      console.error(`RFP detail response for URL ${rfpUrl} was not a valid object. Received:`, apiRfpItem);
      throw new Error(`API returned unexpected data format for RFP detail (URL: ${rfpUrl}).`);
    }

    // Map the API response to RfpDetail structure
    const detail: RfpDetail = {
      id: apiRfpItem.id || rfpUrl, // Fallback to rfpUrl if ID is missing
      title: apiRfpItem.title || "Title not available",
      description: apiRfpItem.description || "No detailed description available.",
      scope_of_service: apiRfpItem.scope_of_service || "Scope of work details not specified.",
      posted_date: (apiRfpItem.posted_date && apiRfpItem.posted_date !== "N/A") ? apiRfpItem.posted_date : "Not specified",
      // Use API's expiry_date if valid, otherwise try parsing from title, then default
      expiry_date: (apiRfpItem.expiry_date && apiRfpItem.expiry_date !== "N/A" && apiRfpItem.expiry_date !== "Not specified")
        ? apiRfpItem.expiry_date
        : parseDeadlineFromTitleString(apiRfpItem.title) || "Not specified",
      question_deadline: apiRfpItem.question_deadline || "Not specified",
      location: apiRfpItem.location || "Not specified",
      budget: apiRfpItem.budget || "Not specified",
      eligibility: apiRfpItem.eligibility || "Not specified",
      work_performance: apiRfpItem.work_performance || "Not specified",
      category: apiRfpItem.category || "Not specified",
      country: apiRfpItem.country || "Information not separately provided.",
      state: apiRfpItem.state || "Information not separately provided.",
      url: apiRfpItem.url || rfpUrl, // Fallback to input URL if API doesn't return one
    };

    console.log(`Successfully fetched and mapped detail for RFP URL: ${rfpUrl}`, detail);
    return detail;

  } catch (error) {
    console.error(`Error fetching RFP detail for URL ${rfpUrl}:`, error);
    // Construct a fallback detail object or re-throw
    throw new Error(`Failed to fetch or process RFP detail for URL ${rfpUrl}. Error: ${error instanceof Error ? error.message : String(error)}`);
  }
};
