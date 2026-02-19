/**
 * Firecrawl Service Layer - Public API
 *
 * Re-exports the client, check runners, and provider registry
 * for consumption by the aggregated analysis service.
 */

export {
	type IndustryRegulatorCheckInput,
	runIndustryRegulatorCheck,
} from "./checks/industry-regulator.check";
export {
	runSanctionsEnrichmentCheck,
	type SanctionsEnrichmentCheckInput,
} from "./checks/sanctions-enrichment.check";
export {
	runSocialReputationCheck,
	type SocialReputationCheckInput,
} from "./checks/social-reputation.check";
export type { ScrapeOptions, ScrapeResult } from "./firecrawl.client";
export { isFirecrawlConfigured, scrapeWithSchema } from "./firecrawl.client";
