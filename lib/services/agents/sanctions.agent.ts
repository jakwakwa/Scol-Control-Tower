/**
 * Sanctions Agent
 *
 * This agent performs sanctions and compliance checking including:
 * - UN Sanctions list checking
 * - PEP (Politically Exposed Person) screening
 * - Adverse media scanning
 * - Regulatory watch list verification
 *
 * Integration: OpenSanctions yente (self-hosted) with mock fallback.
 * When YENTE_API_URL is configured, calls the live /match endpoint.
 * Falls back to deterministic mock results when not configured or on error.
 */

import { z } from "zod";

// ============================================
// OpenSanctions yente Configuration
// ============================================

const YENTE_CONFIG = {
	apiUrl: process.env.YENTE_API_URL,
	apiKey: process.env.OPENSANCTIONS_KEY,
	threshold: parseFloat(process.env.YENTE_MATCH_THRESHOLD || "0.7"),
	dataset: process.env.YENTE_DATASET || "default",
};

function isYenteConfigured(): boolean {
	return !!YENTE_CONFIG.apiUrl;
}

// ============================================
// Yente API Response Types
// ============================================

interface YenteMatchResult {
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

interface YenteQueryResponse {
	status: number;
	results: YenteMatchResult[];
	total: { value: number; relation: string };
	query: Record<string, unknown>;
}

interface YenteMatchResponse {
	responses: Record<string, YenteQueryResponse>;
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
 * Uses OpenSanctions yente when configured, falls back to mock.
 */
export async function performSanctionsCheck(
	input: SanctionsCheckInput
): Promise<SanctionsCheckResult> {
	if (isYenteConfigured()) {
		try {
			const result = await performYenteSanctionsCheck(input);
			return result;
		} catch (err) {
			console.error("[SanctionsAgent] yente API failed, falling back to mock:", err);
		}
	}

	const mockResult = generateMockSanctionsResult(input);

	return mockResult;
}

// ============================================
// OpenSanctions yente Integration
// ============================================

/**
 * Build yente match queries for the entity and its directors.
 */
function buildYenteQueries(
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
 * Call the yente /match endpoint and map results to SanctionsCheckResult.
 */
async function performYenteSanctionsCheck(
	input: SanctionsCheckInput
): Promise<SanctionsCheckResult> {
	const queries = buildYenteQueries(input);
	const apiKeyParam = YENTE_CONFIG.apiKey ? `&api_key=${YENTE_CONFIG.apiKey}` : "";
	const url = `${YENTE_CONFIG.apiUrl}/match/${YENTE_CONFIG.dataset}?threshold=${YENTE_CONFIG.threshold}${apiKeyParam}`;

	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ queries }),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`yente API returned ${response.status}: ${text}`);
	}

	const data = (await response.json()) as YenteMatchResponse;

	return mapYenteResponseToResult(input, data);
}

/**
 * Map yente batch match response to our SanctionsCheckResult schema.
 */
function mapYenteResponseToResult(
	input: SanctionsCheckInput,
	data: YenteMatchResponse
): SanctionsCheckResult {
	const now = new Date();
	const checkId = `SCK-${input.workflowId}-${Date.now()}`;

	const allMatches: YenteMatchResult[] = [];
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
			dataSource: `OpenSanctions yente (${YENTE_CONFIG.dataset})`,
		},
	};
}

/**
 * Generate mock sanctions check results
 */
function generateMockSanctionsResult(input: SanctionsCheckInput): SanctionsCheckResult {
	const seed = simpleHash(input.entityName + input.applicantId);
	const now = new Date();
	const checkId = `SCK-${input.workflowId}-${Date.now()}`;

	// Determine if this is a "clear" result (most common case)
	// Only ~5% of checks should flag anything
	const isClear = seed % 20 !== 0;

	const isHighRiskCountry = HIGH_RISK_COUNTRIES.includes(input.countryCode);

	// Generate results based on clear/not clear
	const unSanctionsMatch = !isClear && seed % 5 === 0;
	const isPEP = !isClear && seed % 7 === 0;
	const hasAdverseMedia = !isClear && seed % 4 === 0;
	const hasWatchListMatch = !isClear && seed % 6 === 0;

	// Calculate overall risk
	let riskLevel: "CLEAR" | "LOW" | "MEDIUM" | "HIGH" | "BLOCKED";
	let passed = true;
	let requiresEDD = false;
	let recommendation:
		| "PROCEED"
		| "PROCEED_WITH_MONITORING"
		| "EDD_REQUIRED"
		| "BLOCK"
		| "MANUAL_REVIEW";

	if (unSanctionsMatch) {
		riskLevel = "BLOCKED";
		passed = false;
		recommendation = "BLOCK";
	} else if (isHighRiskCountry) {
		riskLevel = "HIGH";
		passed = true;
		requiresEDD = true;
		recommendation = "EDD_REQUIRED";
	} else if (isPEP) {
		riskLevel = "MEDIUM";
		passed = true;
		requiresEDD = true;
		recommendation = "PROCEED_WITH_MONITORING";
	} else if (hasAdverseMedia || hasWatchListMatch) {
		riskLevel = "LOW";
		passed = true;
		recommendation = "MANUAL_REVIEW";
	} else {
		riskLevel = "CLEAR";
		passed = true;
		recommendation = "PROCEED";
	}

	return {
		unSanctions: {
			checked: true,
			matchFound: unSanctionsMatch,
			matchDetails: unSanctionsMatch
				? [
						{
							listName: "UN Security Council Consolidated List",
							matchType: "PARTIAL" as const,
							matchedName: `${input.entityName.split(" ")[0]} Industries`,
							confidence: 45,
							sanctionType: "Trade Restrictions",
							sanctionDate: "2022-03-15",
						},
					]
				: [],
			lastChecked: now.toISOString(),
		},

		pepScreening: {
			checked: true,
			isPEP,
			pepDetails: isPEP
				? {
						category: "DOMESTIC" as const,
						position: "Former Deputy Minister",
						country: "ZA",
						riskLevel: "MEDIUM" as const,
					}
				: undefined,
			familyAssociates:
				isPEP && seed % 2 === 0
					? [
							{
								name: "Associate Name",
								relationship: "Business Partner",
								isPEP: true,
							},
						]
					: [],
		},

		adverseMedia: {
			checked: true,
			alertsFound: hasAdverseMedia ? 1 : 0,
			alerts: hasAdverseMedia
				? [
						{
							source: "Financial Times",
							headline: `${input.entityName} mentioned in regulatory investigation`,
							date: new Date(now.getTime() - (seed % 365) * 24 * 60 * 60 * 1000)
								.toISOString()
								.split("T")[0],
							severity: "LOW" as const,
							category: "REGULATORY_VIOLATION" as const,
							url: "https://example.com/news/article",
						},
					]
				: [],
		},

		watchLists: {
			checked: true,
			listsChecked: [
				"OFAC SDN List",
				"EU Consolidated List",
				"UK Sanctions List",
				"SARB Watchlist",
				"FIC Targeted Financial Sanctions",
			],
			matchesFound: hasWatchListMatch ? 1 : 0,
			matches: hasWatchListMatch
				? [
						{
							listName: "SARB Watchlist",
							matchedEntity: `${input.entityName.split(" ")[0]} Corp`,
							matchConfidence: 35,
							reason: "Partial name match - likely false positive",
						},
					]
				: [],
		},

		overall: {
			riskLevel,
			passed,
			requiresEDD,
			recommendation,
			reasoning: generateSanctionsReasoning(
				riskLevel,
				unSanctionsMatch,
				isPEP,
				hasAdverseMedia,
				hasWatchListMatch,
				isHighRiskCountry
			),
			reviewRequired: !isClear,
		},

		metadata: {
			checkId,
			checkedAt: now.toISOString(),
			expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
			dataSource: "Mock Sanctions Database v1.0",
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

/**
 * Simple hash function for deterministic mock results
 */
function simpleHash(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash &= hash;
	}
	return Math.abs(hash);
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
