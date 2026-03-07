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
	type CombinedSanctionsResult,
	type FirecrawlSanctionsSearchInput,
	mapCombinedToSanctionsCheckResult,
	runFirecrawlSanctionsSearch,
} from "./checks/sanctions-list-search";
export {
	runSocialReputationCheck,
	type SocialReputationCheckInput,
} from "./checks/social-reputation.check";
export type { AgentOptions, ScrapeOptions, ScrapeResult } from "./firecrawl.client";
export {
	agentWithSchema,
	isFirecrawlConfigured,
	scrapeWithSchema,
} from "./firecrawl.client";
