
import { ApiRfp, FetchRfpsResponse, RfpDetail, RfpSourceCategory } from '../types';

// Existing web-focused mock data
const newMockWebரியApiRfps: ApiRfp[] = [
    {
        "id": "SW-99830",
        "title": "SW-99830-USA (Colorado) - Unified Communications Platform- Deadline June 19,2025",
        "location": "Colorado",
        "description": "SW-99830-USA (Colorado) - Unified Communications Platform- Deadline June 19,2025. Key features include VoIP, video conferencing, instant messaging, and mobile integration. We are looking for solutions that are scalable, secure, and compliant with federal regulations. Experience with React and AWS is a plus. Looking for UI/UX experts.",
        "posted_date": "N/A",
        "expiry_date": "N/A",
        "url": "https://www.rfpmart.com/971660-usa-colorado-unified-communications-platform-rfp.html",
        "category": "web-design-and-development"
    },
    {
        "id": "SW-99866",
        "title": "SW-99866-USA (New York) - Cloud-Hosted Building Management Platform- Deadline June 30,2025",
        "location": "New York",
        "description": "SW-99866-USA (New York) - Cloud-Hosted Building Management Platform- Deadline June 30,2025. Seeking a robust cloud-hosted BMS to integrate HVAC, lighting, and security systems for multiple city buildings. Must be mobile-responsive and provide comprehensive analytics. Knowledge of serverless backends and API integration is key. Preferred stack includes Next.js, TypeScript, and PostgreSQL.",
        "posted_date": "N/A",
        "expiry_date": "N/A",
        "url": "https://www.rfpmart.com/971567-usa-new-york-cloud-hosted-building-management-platform-rfp.html",
        "category": "web-design-and-development"
    },
    {
        "id": "MRB-47599",
        "title": "MRB-47599-Ireland - Marketing Services- Deadline June 30,2025",
        "location": "N/A", 
        "description": "MRB-47599-Ireland - Marketing Services- Deadline June 30,2025. Comprehensive digital marketing services required for a tourism board, including SEO, SMM, content creation, and campaign management. International experience preferred. Our agency uses agile methodologies.",
        "posted_date": "N/A",
        "expiry_date": "N/A",
        "url": "https://www.rfpmart.com/971522-ireland-marketing-services-rfp.html",
        "category": "marketing-services"
    },
    {
        "id": "WD-14716",
        "title": "WD-14716-USA (Georgia) - Website Design, Develop, Hosting, Maintenance, Implementation And Update Service Using CMS - INFO ONLY, RFP NOT INCLUDED- Deadline June 19,2025",
        "location": "Georgia",
        "description": "WD-14716-USA (Georgia) - Website Design, Develop, Hosting, Maintenance, Implementation And Update Service Using CMS - INFO ONLY, RFP NOT INCLUDED- Deadline June 19,2025. Project involves a full redesign and requires expertise in responsive design and modern CMS platforms. Technologies: Tailwind CSS, Next.js.",
        "posted_date": "N/A",
        "expiry_date": "N/A",
        "url": "https://www.rfpmart.com/971379-usa-georgia-website-design-develop-hosting-maintenance-implementation-and-update-service-using-cms-info-only-rfp-not-included-rfp.html",
        "category": "web-design-and-development"
    },
    {
        "id": "MRB-47588",
        "title": "MRB-47588-Zambia - Communication Multimedia Production, Media and Press Relations to Promote Consultancy Services - Deadline June 25,2025",
        "location": "N/A",
        "description": "MRB-47588-Zambia - Communication Multimedia Production, Media and Press Relations to Promote Consultancy Services - Deadline June 25,2025. Looking for remote collaboration.",
        "posted_date": "N/A",
        "expiry_date": "N/A",
        "url": "https://www.rfpmart.com/971307-zambia-communication-multimedia-production-media-and-press-relations-to-promote-consultancy-services-rfp.html",
        "category": "media-production"
    },
    {
        "id": "WD-14714",
        "title": "WD-14714-USA (Idaho) - Navigation Support Website and Recruitment Services- Deadline July 7,2025",
        "location": "Idaho",
        "description": "WD-14714-USA (Idaho) - Navigation Support Website and Recruitment Services- Deadline July 7,2025. This project involves creating a user-friendly portal.",
        "posted_date": "N/A",
        "expiry_date": "N/A",
        "url": "https://www.rfpmart.com/970341-usa-idaho-navigation-support-website-and-recruitment-services-rfp.html",
        "category": "web-design-and-development"
    }
];

// New mobile-specific mock data
const newMockMobileApiRfps: ApiRfp[] = [
    {
        "id": "MOB-001",
        "title": "MOB-001-USA (California) - Fitness Tracker Mobile App - Deadline July 15,2025",
        "location": "California, USA",
        "description": "Native mobile application for iOS and Android to track user workouts, calories, and sleep patterns. Requires integration with HealthKit and Google Fit. Experience with Swift, Kotlin, and React Native is a plus.",
        "posted_date": "2025-05-01",
        "expiry_date": "2025-07-15",
        "url": "https://www.rfpmart.com/sample-mobile-fitness-app-rfp.html",
        "category": "mobile-app-development"
    },
    {
        "id": "MOB-002",
        "title": "MOB-002-USA (Texas) - E-commerce Mobile App for Local Retailer - Deadline Aug 1,2025",
        "location": "Texas, USA",
        "description": "Develop a cross-platform mobile shopping app for a local boutique. Key features: product browsing, secure checkout, order tracking, push notifications. Must support both iOS and Android devices. Familiarity with Shopify API or similar e-commerce platforms desired.",
        "posted_date": "2025-05-10",
        "expiry_date": "2025-08-01",
        "url": "https://www.rfpmart.com/sample-mobile-ecommerce-rfp.html",
        "category": "mobile-app-development"
    },
    {
        "id": "MOB-003",
        "title": "MOB-003-Canada - Educational Game Mobile App - Deadline Sep 10,2025",
        "location": "Ontario, Canada",
        "description": "Interactive educational game for children aged 6-10, for iOS and Android tablets. Focus on gamification, engaging UI/UX, and offline capabilities. Experience with Unity or Godot preferred.",
        "posted_date": "2025-06-01",
        "expiry_date": "2025-09-10",
        "url": "https://www.rfpmart.com/sample-mobile-game-rfp.html",
        "category": "mobile-app-development"
    },
    {
        "id": "MOB-004",
        "title": "MOB-004-UK - Healthcare Companion Mobile App - Deadline Oct 5,2025",
        "location": "London, UK",
        "description": "Mobile app to assist patients in managing medication schedules, appointments, and health records. HIPAA/GDPR compliance is crucial. Seeking team experienced in secure mobile app development.",
        "posted_date": "2025-07-01",
        "expiry_date": "2025-10-05",
        "url": "https://www.rfpmart.com/sample-mobile-healthcare-rfp.html",
        "category": "mobile-app-development"
    }
];

const getFallbackMockData = (category: RfpSourceCategory): ApiRfp[] => {
    if (category === 'mobile') {
        return [...newMockMobileApiRfps];
    }
    return [...newMockWebரியApiRfps]; // Default to web mock data
};


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
const FASTAPI_DETAIL_BASE_URL = 'https://fastapi.curator.atemkeng.eu/api/v1/rfp/rfp_id';

const RFP_SOURCE_URLS: Record<RfpSourceCategory, string> = {
  web: "https://www.rfpmart.com/web-design-and-development-rfp-government-contract.html",
  mobile: "https://www.rfpmart.com/mobile-application-development-rfp-government-contract.html",
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

export const fetchRfps = async (rfpSourceCategory: RfpSourceCategory = 'web', limit: number = 20): Promise<FetchRfpsResponse> => {
  const categoryUrl = RFP_SOURCE_URLS[rfpSourceCategory];
  const requestBody = {
    url: categoryUrl,
    limit: limit,
    skip: 0
  };
  const fallbackData = getFallbackMockData(rfpSourceCategory);

  console.log(`Fetching RFPs from ${rfpSourceCategory} source, limit ${limit}: ${FASTAPI_LIST_BASE_URL}`);
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
      console.error(`API request failed for ${rfpSourceCategory} with status ${response.status}: ${errorText}`);
      return { 
        data: fallbackData, 
        source: 'mock', 
        warningMessage: `API request for ${rfpSourceCategory} failed (${response.status}: ${errorText || 'No error text'}). Using mock data.` 
      };
    }

    const responseData = await response.json();
    let liveData: ApiRfp[] = [];

    if (Array.isArray(responseData)) {
        liveData = responseData;
    } else if (isCategorySummaryObject(responseData, categoryUrl)) {
        console.warn(`API for ${rfpSourceCategory} (URL: ${categoryUrl}) returned a category summary object. Interpreting as an empty list of RFPs from the API.`);
        liveData = []; 
    } else {
        console.error(
            `Live API response for ${rfpSourceCategory} was not an array or recognized category summary object. Status: ${response.status}. Received type: ${typeof responseData}. Payload:`, 
            JSON.stringify(responseData, null, 2)
        );
        return {
            data: fallbackData,
            source: 'mock',
            warningMessage: `Live API for ${rfpSourceCategory} returned data in an unexpected format (expected array, received ${typeof responseData}). Using mock data.`
        };
    }
    
    if (liveData.length === 0) {
      console.warn(`Live API for ${rfpSourceCategory} effectively returned no RFP items. Falling back to mock data for ${rfpSourceCategory}.`);
      return { 
        data: fallbackData, 
        source: 'mock', 
        warningMessage: `Live API for ${rfpSourceCategory} returned no RFP items. Using mock data instead.` 
      };
    }
    
    console.log(`Successfully fetched ${liveData.length} RFPs from live API (${rfpSourceCategory}).`);
    return { data: liveData, source: 'live' };

  } catch (error) {
    console.error(`Error fetching RFPs from live API (${rfpSourceCategory}):`, error);
    console.warn(`Falling back to mock data for ${rfpSourceCategory}.`);
    return { 
      data: fallbackData, 
      source: 'mock', 
      warningMessage: `Failed to fetch live RFPs for ${rfpSourceCategory} (Error: ${error instanceof Error ? error.message : String(error)}). Using mock data.` 
    };
  }
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
