/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as eligibility_engine from "../eligibility/engine.js";
import type * as eligibility_filters from "../eligibility/filters.js";
import type * as eligibility_index from "../eligibility/index.js";
import type * as eligibility_keywords from "../eligibility/keywords.js";
import type * as eligibilityRules from "../eligibilityRules.js";
import type * as ingestion_logs from "../ingestion/logs.js";
import type * as ingestion_rfpmart from "../ingestion/rfpmart.js";
import type * as ingestion_rfpmartCsv from "../ingestion/rfpmartCsv.js";
import type * as ingestion_rfpmartEnrich from "../ingestion/rfpmartEnrich.js";
import type * as ingestion_rfpmartEnrichQueries from "../ingestion/rfpmartEnrichQueries.js";
import type * as ingestion_samGov from "../ingestion/samGov.js";
import type * as ingestion_samGovBackfill from "../ingestion/samGovBackfill.js";
import type * as ingestion_scraper from "../ingestion/scraper.js";
import type * as lib_auth from "../lib/auth.js";
import type * as opportunities from "../opportunities.js";
import type * as sourceQueries from "../sourceQueries.js";
import type * as sources from "../sources.js";
import type * as stats from "../stats.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  "eligibility/engine": typeof eligibility_engine;
  "eligibility/filters": typeof eligibility_filters;
  "eligibility/index": typeof eligibility_index;
  "eligibility/keywords": typeof eligibility_keywords;
  eligibilityRules: typeof eligibilityRules;
  "ingestion/logs": typeof ingestion_logs;
  "ingestion/rfpmart": typeof ingestion_rfpmart;
  "ingestion/rfpmartCsv": typeof ingestion_rfpmartCsv;
  "ingestion/rfpmartEnrich": typeof ingestion_rfpmartEnrich;
  "ingestion/rfpmartEnrichQueries": typeof ingestion_rfpmartEnrichQueries;
  "ingestion/samGov": typeof ingestion_samGov;
  "ingestion/samGovBackfill": typeof ingestion_samGovBackfill;
  "ingestion/scraper": typeof ingestion_scraper;
  "lib/auth": typeof lib_auth;
  opportunities: typeof opportunities;
  sourceQueries: typeof sourceQueries;
  sources: typeof sources;
  stats: typeof stats;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
