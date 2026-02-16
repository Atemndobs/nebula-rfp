import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Fetch from SAM.gov every 6 hours
crons.interval(
  "ingest-sam-gov",
  { hours: 6 },
  internal.ingestion.samGov.fetchOpportunities,
  {
    // Default parameters - fetch IT-related opportunities
    naicsCodes: [
      "541511", // Custom Computer Programming Services
      "541512", // Computer Systems Design Services
      "541519", // Other Computer Related Services
    ],
    limit: 100,
  }
);

// Reset daily fetch counts at midnight UTC
crons.daily(
  "reset-daily-counts",
  { hourUTC: 0, minuteUTC: 0 },
  internal.sources.resetDailyCounts
);

// Enrich RFPMart CSV records with full descriptions (every 30 minutes)
crons.interval(
  "enrich-rfpmart-csv",
  { minutes: 30 },
  internal.ingestion.rfpmartEnrich.enrichPending,
  { batchSize: 10 }
);

export default crons;
