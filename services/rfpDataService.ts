
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

const GENERIC_SOURCE_CATEGORIES = new Set([
  "web-design-and-development-rfp",
  "website-design-and-development-rfp",
  "web-site-design-and-development-rfp",
  "mobile-application-development-rfp",
]);

const TARGET_ID_PREFIXES = new Set([
  "SW",
  "WD",
  "ITES",
  "NET",
  "TELCOM",
  "DRA",
  "CSE",
  "AI",
  "GIS",
]);

const HARD_EXCLUSION_PHRASES = [
  "toilet paper",
  "paper towel",
  "janitorial",
  "custodial",
  "construction",
  "hvac",
  "plumbing",
  "roofing",
  "bond underwriter",
  "bookstore operations",
  "vending",
  "demolition",
  "asbestos",
  "enterprise based software",
  "enterprise resource planning",
  "erp implementation",
  "info only, rfp not included",
];

const TARGET_SIGNAL_PHRASES = [
  "software",
  "web",
  "website",
  "portal",
  "dashboard",
  "api",
  "cloud",
  "data platform",
  "data analytics",
  "cyber",
  "ai",
  "artificial intelligence",
  "machine learning",
  "application development",
  "systems integration",
  "saas",
];

const CATEGORY_BY_PREFIX: Record<string, string> = {
  SW: "software-development",
  WD: "web-design-and-development",
  ITES: "it-services",
  NET: "networking",
  TELCOM: "telecommunications",
  DRA: "data-and-research",
  CSE: "security-services",
  AI: "ai-solutions",
  GIS: "gis-services",
};

const DETAIL_VERIFY_BATCH_MAX = 40;
const DETAIL_VERIFY_CONCURRENCY = 5;
const DETAIL_REQUEST_TIMEOUT_MS = 6000;

const DETAIL_ALLOW_PHRASES = [
  "software",
  "web",
  "website",
  "application",
  "cloud",
  "portal",
  "dashboard",
  "api",
  "it services",
  "systems integration",
  "artificial intelligence",
  "machine learning",
  "data platform",
  "analytics",
  "cyber",
  "digital",
  "saas",
  "licensing",
];

const DETAIL_BLOCK_PHRASES = [
  "subsistence",
  "training supplies",
  "professional consulting",
  "management support services",
  "toilet paper",
  "paper towels",
  "janitorial",
  "custodial",
  "construction",
  "hvac",
  "plumbing",
  "roofing",
  "bond underwriter",
  "bookstore operations",
  "vending",
  "asbestos",
  "demolition",
  "enterprise resource planning",
  "enterprise based software",
  "info only, rfp not included",
];

interface DetailForFiltering {
  id?: string;
  category?: string;
  title?: string;
  description?: string;
  scope_of_service?: string;
  work_performance?: string;
}

const hasAnyPhrase = (text: string, phrases: string[]): boolean => {
  return phrases.some((phrase) => text.includes(phrase));
};

const isDetailTechAligned = (detail: DetailForFiltering, fallbackRfp: ApiRfp): boolean => {
  const detailText = [
    detail.category || "",
    detail.title || "",
    detail.description || "",
    detail.scope_of_service || "",
    detail.work_performance || "",
  ].join(" ").toLowerCase();

  if (hasAnyPhrase(detailText, DETAIL_BLOCK_PHRASES)) {
    return false;
  }

  if (hasAnyPhrase(detailText, DETAIL_ALLOW_PHRASES)) {
    return true;
  }

  // Fallback to prefix heuristic only if detail text had no strong signals.
  const prefix = getIdPrefix(fallbackRfp);
  return TARGET_ID_PREFIXES.has(prefix);
};

const fetchDetailForFiltering = async (url: string): Promise<DetailForFiltering | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DETAIL_REQUEST_TIMEOUT_MS);

  try {
    const detailApiUrl = `${FASTAPI_DETAIL_BASE_URL}?url=${encodeURIComponent(url)}`;
    const response = await fetch(detailApiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as DetailForFiltering;
    if (!payload || typeof payload !== "object") {
      return null;
    }

    return payload;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const verifyCandidatesWithDetails = async (candidates: ApiRfp[]): Promise<ApiRfp[]> => {
  if (candidates.length === 0) return [];

  const keepByIndex = new Array<boolean>(candidates.length).fill(false);
  let cursor = 0;

  const worker = async () => {
    while (cursor < candidates.length) {
      const index = cursor++;
      const candidate = candidates[index];
      if (!candidate?.url) continue;

      const detail = await fetchDetailForFiltering(candidate.url);
      if (detail && isDetailTechAligned(detail, candidate)) {
        keepByIndex[index] = true;
      }
    }
  };

  const workers = Array.from({ length: Math.min(DETAIL_VERIFY_CONCURRENCY, candidates.length) }, () => worker());
  await Promise.all(workers);

  return candidates.filter((_, index) => keepByIndex[index]);
};

const getIdPrefix = (rfp: ApiRfp): string => {
  const fromId = (rfp.id || "").split("-")[0]?.toUpperCase();
  if (fromId) return fromId;

  const fromTitle = (rfp.title || "").match(/^([A-Za-z]+)-\d+/)?.[1]?.toUpperCase();
  return fromTitle || "";
};

const isLikelyTargetRfp = (rfp: ApiRfp): boolean => {
  const text = `${rfp.id || ""} ${rfp.title || ""} ${rfp.description || ""}`.toLowerCase();

  if (HARD_EXCLUSION_PHRASES.some((phrase) => text.includes(phrase))) {
    return false;
  }

  const prefix = getIdPrefix(rfp);
  if (TARGET_ID_PREFIXES.has(prefix)) {
    return true;
  }

  return TARGET_SIGNAL_PHRASES.some((phrase) => text.includes(phrase));
};

export const normalizeApiCategory = (rfp: ApiRfp): string => {
  const rawCategory = (rfp.category || "").toLowerCase().trim();
  if (rawCategory && !GENERIC_SOURCE_CATEGORIES.has(rawCategory)) {
    return rawCategory;
  }

  const prefix = getIdPrefix(rfp);
  return CATEGORY_BY_PREFIX[prefix] || rawCategory || "not-specified";
};

const getRfpMartRecencyScore = (rfp: ApiRfp): number => {
  const fromUrl = rfp.url?.match(/\/(\d+)-/);
  if (fromUrl && fromUrl[1]) {
    const numeric = Number(fromUrl[1]);
    if (Number.isFinite(numeric)) return numeric;
  }

  const fromId = rfp.id?.match(/(\d+)/);
  if (fromId && fromId[1]) {
    const numeric = Number(fromId[1]);
    if (Number.isFinite(numeric)) return numeric;
  }

  return 0;
};

const dedupeAndRankRfps = (items: ApiRfp[], limit: number): ApiRfp[] => {
  const byKey = new Map<string, ApiRfp>();

  for (const item of items) {
    const key = item.id || item.url || item.title;
    if (!key) continue;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, item);
      continue;
    }

    const existingScore = getRfpMartRecencyScore(existing);
    const incomingScore = getRfpMartRecencyScore(item);
    if (incomingScore > existingScore) {
      byKey.set(key, item);
    }
  }

  return Array.from(byKey.values())
    .sort((a, b) => {
      const scoreDiff = getRfpMartRecencyScore(b) - getRfpMartRecencyScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return (a.title || "").localeCompare(b.title || "");
    })
    .slice(0, limit);
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
  const aggregate: ApiRfp[] = [];
  const fetchLimitPerUrl = Math.min(150, Math.max(limit * 4, 40));
  const rankWindow = Math.min(300, Math.max(limit * 8, 80));

  console.log(`Fetching RFPs from ${rfpSourceCategory} source, limit ${limit}: ${FASTAPI_LIST_BASE_URL}`);

  for (const categoryUrl of categoryUrls) {
    const requestBody = {
      url: categoryUrl,
      limit: fetchLimitPerUrl,
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
        aggregate.push(...liveData);
      } else {
        emptyResultsUrls.push(categoryUrl);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${categoryUrl} -> ${message}`);
    }
  }

  if (aggregate.length > 0) {
    const ranked = dedupeAndRankRfps(aggregate, rankWindow);
    const filtered = ranked.filter(isLikelyTargetRfp);
    const baseCandidates = filtered.length > 0 ? filtered : ranked;
    const detailCandidates = baseCandidates.slice(0, DETAIL_VERIFY_BATCH_MAX);
    const verifiedByDetail = await verifyCandidatesWithDetails(detailCandidates);
    const selectedBase = verifiedByDetail.length > 0 ? verifiedByDetail : baseCandidates;
    const selected = selectedBase.slice(0, limit);
    const filteredOutCount = Math.max(0, ranked.length - selectedBase.length);
    const warningMessage = verifiedByDetail.length === 0
      ? "Could not verify tech-aligned categories from detail pages for this batch. Showing heuristic-filtered recency results."
      : filteredOutCount > 0
        ? `Filtered out ${filteredOutCount} likely out-of-scope RFPMart items after detail-page verification.`
        : undefined;

    console.log(
      `Successfully fetched ${selected.length} RFPs from live API (${rfpSourceCategory}) across ${categoryUrls.length} URL candidate(s).`
    );
    return { data: selected, source: 'live', warningMessage };
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
