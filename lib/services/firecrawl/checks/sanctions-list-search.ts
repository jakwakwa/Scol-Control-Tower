/**
 * Combined Sanctions List Search (Firecrawl Agent)
 *
 * Runs UN, OFAC, and FIC TFS sanctions searches in parallel,
 * merges results, and maps to SanctionsCheckResult.
 */

import type {
	SanctionsCheckInput,
	SanctionsCheckResult,
} from "@/lib/services/agents/sanctions.agent";
import { searchFICTFSSanctionsList } from "./sanctions-list-fic";
import { searchOFACSanctionsList } from "./sanctions-list-ofac";
import { searchUNSanctionsList } from "./sanctions-list-un";

export interface FirecrawlSanctionsSearchInput {
	entityName: string;
	contactName?: string;
	directors?: Array<{ name: string }>;
	workflowId?: number;
	applicantId?: number;
	stage?: 2 | 3 | "async";
}

export interface CombinedSanctionsResult {
	un: { individuals: unknown[]; entities: unknown[] };
	ofac: { matchesFound: boolean; matches: unknown[] };
	fic: { matchesFound: boolean; matches: unknown[] };
	hasBlockingMatch: boolean;
}

/**
 * Build search terms from entity name, contact name, and directors.
 */
function buildSearchTerms(input: FirecrawlSanctionsSearchInput): string[] {
	const terms = new Set<string>();
	if (input.entityName?.trim()) terms.add(input.entityName.trim());
	if (input.contactName?.trim()) terms.add(input.contactName.trim());
	for (const d of input.directors ?? []) {
		if (d.name?.trim()) terms.add(d.name.trim());
	}
	return Array.from(terms);
}

/**
 * Run Firecrawl agent searches across UN, OFAC, and FIC TFS lists.
 * Partial failures are non-blocking; returns what we have.
 */
export async function runFirecrawlSanctionsSearch(
	input: FirecrawlSanctionsSearchInput
): Promise<CombinedSanctionsResult> {
	const searchTerms = buildSearchTerms(input);

	if (searchTerms.length === 0) {
		return {
			un: { individuals: [], entities: [] },
			ofac: { matchesFound: false, matches: [] },
			fic: { matchesFound: false, matches: [] },
			hasBlockingMatch: false,
		};
	}

	const [unResult, ofacResult, ficResult] = await Promise.allSettled([
		searchUNSanctionsList(
			searchTerms,
			input.workflowId && input.applicantId
				? {
						workflowId: input.workflowId,
						applicantId: input.applicantId,
						stage: input.stage ?? 3,
					}
				: undefined
		),
		searchOFACSanctionsList(
			searchTerms,
			input.workflowId && input.applicantId
				? {
						workflowId: input.workflowId,
						applicantId: input.applicantId,
						stage: input.stage ?? 3,
					}
				: undefined
		),
		searchFICTFSSanctionsList(
			searchTerms,
			input.workflowId && input.applicantId
				? {
						workflowId: input.workflowId,
						applicantId: input.applicantId,
						stage: input.stage ?? 3,
					}
				: undefined
		),
	]);

	const un =
		unResult.status === "fulfilled"
			? unResult.value
			: { individuals: [] as unknown[], entities: [] as unknown[] };
	const ofac =
		ofacResult.status === "fulfilled"
			? ofacResult.value
			: { matchesFound: false, matches: [] as unknown[] };
	const fic =
		ficResult.status === "fulfilled"
			? ficResult.value
			: { matchesFound: false, matches: [] as unknown[] };

	if (unResult.status === "rejected") {
		console.warn("[SanctionsListSearch] UN search failed:", unResult.reason);
	}
	if (ofacResult.status === "rejected") {
		console.warn("[SanctionsListSearch] OFAC search failed:", ofacResult.reason);
	}
	if (ficResult.status === "rejected") {
		console.warn("[SanctionsListSearch] FIC search failed:", ficResult.reason);
	}

	const hasUnMatch = (un.individuals?.length ?? 0) > 0 || (un.entities?.length ?? 0) > 0;
	const hasBlockingMatch = hasUnMatch;

	return {
		un: {
			individuals: un.individuals ?? [],
			entities: un.entities ?? [],
		},
		ofac: {
			matchesFound: ofac.matchesFound ?? false,
			matches: ofac.matches ?? [],
		},
		fic: {
			matchesFound: fic.matchesFound ?? false,
			matches: fic.matches ?? [],
		},
		hasBlockingMatch,
	};
}

/**
 * Map combined Firecrawl sanctions result to SanctionsCheckResult.
 */
export function mapCombinedToSanctionsCheckResult(
	combined: CombinedSanctionsResult,
	input: SanctionsCheckInput
): SanctionsCheckResult {
	const now = new Date();
	const checkId = `SCK-${input.workflowId}-${Date.now()}`;

	const unIndividuals = combined.un.individuals as Array<{
		DATAID?: string;
		REFERENCE_NUMBER?: string;
		FIRST_NAME?: string;
		SECOND_NAME?: string;
		NATIONALITY?: string;
	}>;
	const unEntities = combined.un.entities as Array<{
		DATAID?: string;
		REFERENCE_NUMBER?: string;
		FIRST_NAME?: string;
	}>;

	const unMatchDetails = [
		...unIndividuals.map(ind => ({
			listName: "UN Security Council Consolidated List",
			matchType: "EXACT" as const,
			matchedName:
				[ind.FIRST_NAME, ind.SECOND_NAME].filter(Boolean).join(" ") ||
				ind.FIRST_NAME ||
				"Unknown",
			confidence: 90,
			sanctionType: ind.REFERENCE_NUMBER,
			sanctionDate: undefined as string | undefined,
		})),
		...unEntities.map(ent => ({
			listName: "UN Security Council Consolidated List",
			matchType: "EXACT" as const,
			matchedName: ent.FIRST_NAME ?? "Unknown",
			confidence: 90,
			sanctionType: ent.REFERENCE_NUMBER,
			sanctionDate: undefined as string | undefined,
		})),
	];

	const ofacMatches = (combined.ofac.matches ?? []) as Array<{
		name?: string;
		firstId?: string;
		program?: string;
		score?: number;
	}>;
	const ficMatches = (combined.fic.matches ?? []) as Array<{
		name?: string;
		noticeId?: string;
		noticeNumber?: string;
	}>;

	const watchListMatches = [
		...ofacMatches.map(m => ({
			listName: "OFAC SDN List",
			matchedEntity: m.name ?? "Unknown",
			matchConfidence: Math.round((m.score ?? 0.8) * 100),
			reason: "Firecrawl agent match",
		})),
		...ficMatches.map(m => ({
			listName: "FIC Targeted Financial Sanctions",
			matchedEntity: m.name ?? "Unknown",
			matchConfidence: 85,
			reason: "Firecrawl agent match",
		})),
	];

	const unSanctionsMatchFound = combined.hasBlockingMatch;
	const hasWatchListMatch = watchListMatches.length > 0;
	const HIGH_RISK_COUNTRIES = ["KP", "IR", "SY", "CU", "RU"];
	const isHighRiskCountry = HIGH_RISK_COUNTRIES.includes(input.countryCode);

	let riskLevel: "CLEAR" | "LOW" | "MEDIUM" | "HIGH" | "BLOCKED";
	let passed: boolean;
	let requiresEDD: boolean;
	let recommendation:
		| "PROCEED"
		| "PROCEED_WITH_MONITORING"
		| "EDD_REQUIRED"
		| "BLOCK"
		| "MANUAL_REVIEW";

	if (unSanctionsMatchFound) {
		riskLevel = "BLOCKED";
		passed = false;
		requiresEDD = false;
		recommendation = "BLOCK";
	} else if (isHighRiskCountry && hasWatchListMatch) {
		riskLevel = "HIGH";
		passed = true;
		requiresEDD = true;
		recommendation = "EDD_REQUIRED";
	} else if (hasWatchListMatch) {
		riskLevel = "LOW";
		passed = true;
		requiresEDD = false;
		recommendation = "MANUAL_REVIEW";
	} else {
		riskLevel = "CLEAR";
		passed = true;
		requiresEDD = false;
		recommendation = "PROCEED";
	}

	const reasoning = [
		`Sanctions screening completed with ${riskLevel} risk level.`,
		unSanctionsMatchFound
			? "CRITICAL: Match found on UN Sanctions list. Immediate review required."
			: null,
		hasWatchListMatch
			? "Match found on OFAC or FIC TFS list. Verification recommended."
			: null,
		riskLevel === "CLEAR"
			? "No significant sanctions concerns identified. Standard onboarding may proceed."
			: null,
	]
		.filter(Boolean)
		.join(" ");

	return {
		unSanctions: {
			checked: true,
			matchFound: unSanctionsMatchFound,
			matchDetails: unMatchDetails,
			lastChecked: now.toISOString(),
		},
		pepScreening: {
			checked: false,
			isPEP: false,
			familyAssociates: [],
		},
		adverseMedia: {
			checked: false,
			alertsFound: 0,
			alerts: [],
		},
		watchLists: {
			checked: true,
			listsChecked: ["UN Consolidated", "OFAC SDN", "FIC TFS"],
			matchesFound: watchListMatches.length,
			matches: watchListMatches,
		},
		overall: {
			riskLevel,
			passed,
			requiresEDD,
			recommendation,
			reasoning,
			reviewRequired: unSanctionsMatchFound || hasWatchListMatch,
		},
		metadata: {
			checkId,
			checkedAt: now.toISOString(),
			expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
			dataSource: "Firecrawl (UN, OFAC, FIC TFS)",
		},
	};
}
