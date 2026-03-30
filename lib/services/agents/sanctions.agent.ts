/**
 * Sanctions Agent
 *
 * This agent performs sanctions and compliance checking including:
 * - UN Sanctions list checking
 * - PEP (Politically Exposed Person) screening
 * - Adverse media scanning
 * - Regulatory watch list verification
 *
 * Primary: OpenSanctions hosted matching API
 * Fallback: Firecrawl sanctions-list crawling (UN, OFAC, FIC TFS)
 */

import { z } from "zod";

import {
	isFirecrawlConfigured,
	mapCombinedToSanctionsCheckResult,
	runFirecrawlSanctionsSearch,
} from "@/lib/services/firecrawl";

// ============================================
// OpenSanctions Configuration
// ============================================

const OPENSANCTIONS_CONFIG = {
	apiUrl: process.env.OPENSANCTIONS_API_URL || "https://api.opensanctions.org",
	apiKey: process.env.OPENSANCTIONS_API_KEY || process.env.OPENSANCTIONS_KEY,
	algorithm: process.env.OPENSANCTIONS_MATCH_ALGORITHM || "best",
	dataset: process.env.OPENSANCTIONS_MATCH_DATASET || "sanctions",
};

function isFirecrawlSanctionsFallbackConfigured(): boolean {
	return isFirecrawlConfigured();
}

// ============================================
// OpenSanctions API Response Types
// ============================================

interface OpenSanctionsMatchResult {
	id: string;
	caption: string;
	schema: string;
	properties: Record<string, string[]>;
	datasets: string[];
	referents: string[];
	target: boolean;
	first_seen: string;
	last_seen: string;
	last_change: string;
	score: number;
	features: Record<string, number>;
	match: boolean;
}

interface OpenSanctionsQueryResponse {
	status: number;
	results: OpenSanctionsMatchResult[];
	total: { value: number; relation: string };
	query: Record<string, unknown>;
}

interface OpenSanctionsMatchResponse {
	responses: Record<string, OpenSanctionsQueryResponse>;
}

const UN_SANCTIONS_DATASETS = ["un_sc_sanctions", "un_sc_consolidated"];

const PEP_DATASETS_PREFIXES = ["pep", "za_fic", "everypolitician", "wd_peps"];

const HIGH_RISK_COUNTRIES = ["KP", "IR", "SY", "CU", "RU"];

const DATASET_FRIENDLY_NAMES: Record<string, string> = {
	us_ofac_sdn: "OFAC SDN List",
	un_sc_sanctions: "UN Security Council Consolidated List",
	eu_fsf: "EU Consolidated List",
	gb_hmt_sanctions: "UK Sanctions List",
	za_fic_sanctions: "FIC Targeted Financial Sanctions",
};

// ============================================
// Types & Schemas
// ============================================

export const SanctionsCheckResultSchema = z.object({
	// UN Sanctions Check
	unSanctions: z.object({
		checked: z.boolean().describe("Whether UN sanctions list was checked"),
		matchFound: z.boolean().describe("Whether a match was found"),
		matchDetails: z
			.array(
				z.object({
					listName: z.string(),
					matchType: z.enum(["EXACT", "PARTIAL", "FUZZY"]),
					matchedName: z.string(),
					confidence: z.number().min(0).max(100),
					sanctionType: z.string().optional(),
					sanctionDate: z.string().optional(),
				})
			)
			.describe("Details of any matches found"),
		lastChecked: z.string().describe("ISO timestamp of last check"),
	}),

	// PEP Screening
	pepScreening: z.object({
		checked: z.boolean().describe("Whether PEP screening was performed"),
		isPEP: z.boolean().describe("Whether person is a PEP"),
		pepDetails: z
			.object({
				category: z
					.enum(["DOMESTIC", "FOREIGN", "INTERNATIONAL_ORG", "FAMILY_CLOSE_ASSOCIATE"])
					.optional(),
				position: z.string().optional(),
				country: z.string().optional(),
				riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
			})
			.optional()
			.describe("PEP details if identified"),
		familyAssociates: z
			.array(
				z.object({
					name: z.string(),
					relationship: z.string(),
					isPEP: z.boolean(),
				})
			)
			.describe("Known family/associates who are PEPs"),
	}),

	// Adverse Media
	adverseMedia: z.object({
		checked: z.boolean().describe("Whether adverse media scan was performed"),
		alertsFound: z.number().describe("Number of adverse media alerts"),
		alerts: z
			.array(
				z.object({
					source: z.string(),
					headline: z.string(),
					date: z.string(),
					severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
					category: z
						.enum([
							"FINANCIAL_CRIME",
							"FRAUD",
							"CORRUPTION",
							"MONEY_LAUNDERING",
							"TAX_EVASION",
							"REGULATORY_VIOLATION",
							"OTHER",
						])
						.optional(),
					url: z.string().optional(),
				})
			)
			.describe("Adverse media alerts found"),
	}),

	// Regulatory Watch Lists
	watchLists: z.object({
		checked: z.boolean().describe("Whether watch lists were checked"),
		listsChecked: z.array(z.string()).describe("Names of watch lists checked"),
		matchesFound: z.number().describe("Number of matches found"),
		matches: z
			.array(
				z.object({
					listName: z.string(),
					matchedEntity: z.string(),
					matchConfidence: z.number().min(0).max(100),
					reason: z.string().optional(),
				})
			)
			.describe("Watch list matches"),
	}),

	// Overall Assessment
	overall: z.object({
		riskLevel: z
			.enum(["CLEAR", "LOW", "MEDIUM", "HIGH", "BLOCKED"])
			.describe("Overall sanctions risk level"),
		passed: z.boolean().describe("Whether screening passed (no blockers)"),
		requiresEDD: z.boolean().describe("Whether Enhanced Due Diligence is required"),
		recommendation: z
			.enum([
				"PROCEED",
				"PROCEED_WITH_MONITORING",
				"EDD_REQUIRED",
				"BLOCK",
				"MANUAL_REVIEW",
			])
			.describe("Recommended action"),
		reasoning: z.string().describe("Detailed reasoning"),
		reviewRequired: z.boolean().describe("Whether human review is required"),
	}),

	// Metadata
	metadata: z.object({
		checkId: z.string().describe("Unique check identifier"),
		checkedAt: z.string().describe("ISO timestamp of check"),
		expiresAt: z.string().describe("ISO timestamp when check expires"),
		dataSource: z.string().describe("Data source version"),
	}),
});

export type SanctionsCheckResult = z.infer<typeof SanctionsCheckResultSchema>;

export interface SanctionsCheckInput {
	applicantId: number;
	workflowId: number;
	entityName: string;
	entityType: "INDIVIDUAL" | "COMPANY" | "TRUST" | "OTHER";
	countryCode: string;
	contactName?: string;
	directors?: Array<{
		name: string;
		idNumber?: string;
		nationality?: string;
	}>;
	registrationNumber?: string;
}

// ============================================
// Sanctions Agent Implementation
// ============================================

/**
 * Perform sanctions and compliance checks.
 * Primary: OpenSanctions matching API.
 * Fallback: Firecrawl sanctions-list crawler.
 */
export async function performSanctionsCheck(
	input: SanctionsCheckInput
): Promise<SanctionsCheckResult> {
	let openSanctionsError: Error | unknown;
	let firecrawlError: Error | unknown;

	try {
		const result = await performOpenSanctionsCheck(input);
		return result;
	} catch (err) {
		console.error("[SanctionsAgent] OpenSanctions match API failed:", err);
		openSanctionsError = err;
	}

	if (isFirecrawlSanctionsFallbackConfigured()) {
		try {
			const combined = await runFirecrawlSanctionsSearch({
				workflowId: input.workflowId,
				applicantId: input.applicantId,
				stage: 3,
				entityName: input.entityName,
				contactName: input.contactName,
				directors: input.directors?.map(d => ({ name: d.name })),
			});
			return mapCombinedToSanctionsCheckResult(combined, input);
		} catch (err) {
			console.error("[SanctionsAgent] Firecrawl sanctions crawler failed:", err);
			firecrawlError = err;
		}
	}

	const formatError = (err: Error | unknown): string =>
		err instanceof Error ? err.message : String(err);

	if (openSanctionsError || firecrawlError) {
		const details = [
			`openSanctions=${openSanctionsError ? formatError(openSanctionsError) : "not_attempted"}`,
			`firecrawl=${firecrawlError ? formatError(firecrawlError) : "not_configured"}`,
		].join("; ");

		throw new Error(`Sanctions check failed across providers: ${details}`);
	}

	throw new Error(
		"Sanctions check failed: OpenSanctions unavailable and Firecrawl sanctions fallback not configured."
	);
}

// ============================================
// OpenSanctions Match API Integration
// ============================================

/**
 * Build OpenSanctions match queries for the entity and its directors.
 */
function buildOpenSanctionsQueries(
	input: SanctionsCheckInput
): Record<string, Record<string, unknown>> {
	const queries: Record<string, Record<string, unknown>> = {};

	const entitySchema = input.entityType === "INDIVIDUAL" ? "Person" : "Company";

	const entityProps: Record<string, string[]> = {
		name: [input.entityName],
	};
	if (input.countryCode) {
		entityProps[entitySchema === "Person" ? "nationality" : "jurisdiction"] = [
			input.countryCode,
		];
	}
	if (input.registrationNumber && entitySchema === "Company") {
		entityProps.registrationNumber = [input.registrationNumber];
	}

	queries.primary = {
		schema: entitySchema,
		properties: entityProps,
	};

	if (input.directors) {
		for (let i = 0; i < input.directors.length; i++) {
			const d = input.directors[i];
			const dirProps: Record<string, string[]> = {
				name: [d.name],
			};
			if (d.nationality) {
				dirProps.nationality = [d.nationality];
			}
			if (d.idNumber) {
				dirProps.idNumber = [d.idNumber];
			}
			queries[`director_${i}`] = {
				schema: "Person",
				properties: dirProps,
			};
		}
	}

	return queries;
}

function scoreToMatchType(score: number): "EXACT" | "PARTIAL" | "FUZZY" {
	if (score >= 0.9) return "EXACT";
	if (score >= 0.7) return "PARTIAL";
	return "FUZZY";
}

function datasetToFriendlyName(dataset: string): string {
	return DATASET_FRIENDLY_NAMES[dataset] || dataset;
}

function isUnSanctionsDataset(dataset: string): boolean {
	return UN_SANCTIONS_DATASETS.some(d => dataset.includes(d));
}

function isPepDataset(dataset: string): boolean {
	return PEP_DATASETS_PREFIXES.some(prefix => dataset.startsWith(prefix));
}

/**
 * Call the OpenSanctions /match endpoint and map results to SanctionsCheckResult.
 */
async function performOpenSanctionsCheck(
	input: SanctionsCheckInput
): Promise<SanctionsCheckResult> {
	const queries = buildOpenSanctionsQueries(input);
	const url = `${OPENSANCTIONS_CONFIG.apiUrl}/match/${OPENSANCTIONS_CONFIG.dataset}?algorithm=${OPENSANCTIONS_CONFIG.algorithm}`;

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(OPENSANCTIONS_CONFIG.apiKey
				? { Authorization: `ApiKey ${OPENSANCTIONS_CONFIG.apiKey}` }
				: {}),
		},
		body: JSON.stringify({ queries }),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`OpenSanctions API returned ${response.status}: ${text}`);
	}

	const data = (await response.json()) as OpenSanctionsMatchResponse;

	return mapOpenSanctionsResponseToResult(input, data);
}

/**
 * Map OpenSanctions batch match response to our SanctionsCheckResult schema.
 */
function mapOpenSanctionsResponseToResult(
	input: SanctionsCheckInput,
	data: OpenSanctionsMatchResponse
): SanctionsCheckResult {
	const now = new Date();
	const checkId = `SCK-${input.workflowId}-${Date.now()}`;

	const allMatches: OpenSanctionsMatchResult[] = [];
	for (const queryResponse of Object.values(data.responses)) {
		if (queryResponse.results) {
			allMatches.push(...queryResponse.results.filter(r => r.match));
		}
	}

	const allDatasets = new Set<string>();
	for (const m of allMatches) {
		for (const ds of m.datasets) {
			allDatasets.add(ds);
		}
	}

	// UN Sanctions
	const unMatches = allMatches.filter(m => m.datasets.some(isUnSanctionsDataset));
	const unSanctionsMatchFound = unMatches.length > 0;

	// PEP Screening
	const pepMatches = allMatches.filter(m => m.datasets.some(isPepDataset));
	const isPEP = pepMatches.length > 0;

	// Watchlist (all non-UN, non-PEP matches)
	const watchListMatches = allMatches.filter(
		m => !(m.datasets.some(isUnSanctionsDataset) || m.datasets.some(isPepDataset))
	);

	const isHighRiskCountry = HIGH_RISK_COUNTRIES.includes(input.countryCode);

	// Overall risk assessment
	let riskLevel: "CLEAR" | "LOW" | "MEDIUM" | "HIGH" | "BLOCKED";
	let passed = true;
	let requiresEDD = false;
	let recommendation:
		| "PROCEED"
		| "PROCEED_WITH_MONITORING"
		| "EDD_REQUIRED"
		| "BLOCK"
		| "MANUAL_REVIEW";

	if (unSanctionsMatchFound) {
		riskLevel = "BLOCKED";
		passed = false;
		recommendation = "BLOCK";
	} else if (isHighRiskCountry && allMatches.length > 0) {
		riskLevel = "HIGH";
		requiresEDD = true;
		recommendation = "EDD_REQUIRED";
	} else if (isPEP) {
		riskLevel = "MEDIUM";
		requiresEDD = true;
		recommendation = "PROCEED_WITH_MONITORING";
	} else if (watchListMatches.length > 0) {
		riskLevel = "LOW";
		recommendation = "MANUAL_REVIEW";
	} else {
		riskLevel = "CLEAR";
		recommendation = "PROCEED";
	}

	const hasAnyMatch = allMatches.length > 0;

	return {
		unSanctions: {
			checked: true,
			matchFound: unSanctionsMatchFound,
			matchDetails: unMatches.map(m => ({
				listName: m.datasets.map(datasetToFriendlyName).join(", "),
				matchType: scoreToMatchType(m.score),
				matchedName: m.caption,
				confidence: Math.round(m.score * 100),
				sanctionType: m.properties.topics?.[0],
				sanctionDate: m.last_change?.split("T")[0],
			})),
			lastChecked: now.toISOString(),
		},

		pepScreening: {
			checked: true,
			isPEP,
			pepDetails:
				isPEP && pepMatches[0]
					? {
							category: "DOMESTIC" as const,
							position: pepMatches[0].properties.position?.[0] || pepMatches[0].caption,
							country: pepMatches[0].properties.country?.[0] || input.countryCode,
							riskLevel:
								pepMatches[0].score >= 0.9 ? ("HIGH" as const) : ("MEDIUM" as const),
						}
					: undefined,
			familyAssociates: [],
		},

		adverseMedia: {
			checked: false,
			alertsFound: 0,
			alerts: [],
		},

		watchLists: {
			checked: true,
			listsChecked: Array.from(allDatasets).map(datasetToFriendlyName),
			matchesFound: watchListMatches.length,
			matches: watchListMatches.map(m => ({
				listName: m.datasets.map(datasetToFriendlyName).join(", "),
				matchedEntity: m.caption,
				matchConfidence: Math.round(m.score * 100),
				reason: m.match ? "Confirmed match" : "Possible match - review recommended",
			})),
		},

		overall: {
			riskLevel,
			passed,
			requiresEDD,
			recommendation,
			reasoning: generateSanctionsReasoning(
				riskLevel,
				unSanctionsMatchFound,
				isPEP,
				false,
				watchListMatches.length > 0,
				isHighRiskCountry
			),
			reviewRequired: hasAnyMatch,
		},

		metadata: {
			checkId,
			checkedAt: now.toISOString(),
			expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
			dataSource: `OpenSanctions (${OPENSANCTIONS_CONFIG.dataset})`,
		},
	};
}

/**
 * Generate reasoning text for sanctions check
 */
function generateSanctionsReasoning(
	riskLevel: string,
	unSanctionsMatch: boolean,
	isPEP: boolean,
	hasAdverseMedia: boolean,
	hasWatchListMatch: boolean,
	isHighRiskCountry: boolean
): string {
	const parts: string[] = [];

	parts.push(`Sanctions screening completed with ${riskLevel} risk level.`);

	if (unSanctionsMatch) {
		parts.push(
			"CRITICAL: Potential match found on UN Sanctions list. Immediate review required."
		);
	}

	if (isPEP) {
		parts.push(
			"Entity or associated individual identified as Politically Exposed Person. Enhanced Due Diligence recommended."
		);
	}

	if (hasAdverseMedia) {
		parts.push(
			"Adverse media alerts found. Review articles to assess relevance and severity."
		);
	}

	if (hasWatchListMatch) {
		parts.push(
			"Partial match found on regulatory watchlist. May be false positive - verification recommended."
		);
	}

	if (isHighRiskCountry) {
		parts.push(
			"Entity associated with high-risk jurisdiction. Enhanced monitoring required per FICA regulations."
		);
	}

	if (riskLevel === "CLEAR") {
		parts.push(
			"No significant sanctions or compliance concerns identified. Standard onboarding may proceed."
		);
	}

	return parts.join(" ");
}

// ============================================
// Batch Screening
// ============================================

export interface BatchSanctionsInput {
	workflowId: number;
	entities: Array<{
		name: string;
		type: "INDIVIDUAL" | "COMPANY" | "TRUST" | "OTHER";
		idNumber?: string;
	}>;
	countryCode: string;
}

export interface BatchSanctionsResult {
	results: Array<{
		entityName: string;
		result: SanctionsCheckResult;
	}>;
	summary: {
		totalChecked: number;
		cleared: number;
		flagged: number;
		blocked: number;
		overallPassed: boolean;
	};
}

/**
 * Screen multiple entities (useful for checking all directors)
 */
export async function performBatchSanctionsCheck(
	input: BatchSanctionsInput
): Promise<BatchSanctionsResult> {
	const results = await Promise.all(
		input.entities.map(async (entity, index) => ({
			entityName: entity.name,
			result: await performSanctionsCheck({
				applicantId: input.workflowId * 100 + index,
				workflowId: input.workflowId,
				entityName: entity.name,
				entityType: entity.type,
				countryCode: input.countryCode,
			}),
		}))
	);

	const cleared = results.filter(r => r.result.overall.riskLevel === "CLEAR").length;
	const blocked = results.filter(r => r.result.overall.riskLevel === "BLOCKED").length;
	const flagged = results.length - cleared - blocked;

	return {
		results,
		summary: {
			totalChecked: results.length,
			cleared,
			flagged,
			blocked,
			overallPassed: blocked === 0,
		},
	};
}

// ============================================
// Risk Level Utilities
// ============================================

/**
 * Check if sanctions result allows auto-approval
 */
export function canAutoApprove(result: SanctionsCheckResult): boolean {
	return (
		result.overall.riskLevel === "CLEAR" &&
		!result.pepScreening.isPEP &&
		result.adverseMedia.alertsFound === 0
	);
}

/**
 * Check if sanctions result blocks proceeding
 */
export function isBlocked(result: SanctionsCheckResult): boolean {
	return result.overall.riskLevel === "BLOCKED" || result.unSanctions.matchFound;
}
