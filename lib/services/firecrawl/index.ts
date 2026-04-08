/**
 * Firecrawl Service Layer - Public API
 *
 * Only the working sanctions-list search and VAT verification helpers
 * are exported, along with the shared client primitives they depend on.
 *
 * Industry regulator, social reputation, and sanctions enrichment
 * Firecrawl checks have been deprecated and removed.
 */

export {
	type CombinedSanctionsResult,
	type FirecrawlSanctionsSearchInput,
	mapCombinedToSanctionsCheckResult,
	runFirecrawlSanctionsSearch,
} from "./checks/sanctions-list-search";
export {
	runVatVerificationCheck,
	type VatVerificationInput,
} from "./checks/vat-verification.check";
export type { AgentOptions, ScrapeOptions, ScrapeResult } from "./firecrawl.client";
export {
	agentWithSchema,
	isFirecrawlConfigured,
	scrapeWithSchema,
} from "./firecrawl.client";
