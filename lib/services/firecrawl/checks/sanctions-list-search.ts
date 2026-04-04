/**
 * Combined Sanctions List Search (Firecrawl Agent)
 *
 * Runs UN sanctions search and maps the result to SanctionsCheckResult.
 */

import type {
	SanctionsCheckInput,
	SanctionsCheckResult,
} from "@/lib/services/agents/sanctions.agent";
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
 * Run Firecrawl agent search across the UN list.
 * Partial failures are non-blocking; returns what we have.
 */
export async function runFirecrawlSanctionsSearch(
	input: FirecrawlSanctionsSearchInput
): Promise<CombinedSanctionsResult> {
	const searchTerms = buildSearchTerms(input);

	if (searchTerms.length === 0) {
		return {
			un: { individuals: [], entities: [] },
			hasBlockingMatch: false,
		};
	}

	const unResult = await searchUNSanctionsList(
		searchTerms,
		input.workflowId && input.applicantId
			? {
					workflowId: input.workflowId,
					applicantId: input.applicantId,
					stage: input.stage ?? 3,
				}
			: undefined
	).catch(error => {
		console.warn("[SanctionsListSearch] UN search failed:", error);
		return { individuals: [] as unknown[], entities: [] as unknown[] };
	});

	const hasUnMatch =
		(unResult.individuals?.length ?? 0) > 0 || (unResult.entities?.length ?? 0) > 0;
	return {
		un: {
			individuals: unResult.individuals ?? [],
			entities: unResult.entities ?? [],
		},
		hasBlockingMatch: hasUnMatch,
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

	const unSanctionsMatchFound = combined.hasBlockingMatch;
	const riskLevel: "CLEAR" | "LOW" | "MEDIUM" | "HIGH" | "BLOCKED" = unSanctionsMatchFound
		? "BLOCKED"
		: "CLEAR";
	const passed = !unSanctionsMatchFound;
	const recommendation: "PROCEED" | "BLOCK" = unSanctionsMatchFound ? "BLOCK" : "PROCEED";

	const reasoning = [
		`Sanctions screening completed with ${riskLevel} risk level.`,
		unSanctionsMatchFound
			? "CRITICAL: Match found on UN Sanctions list. Immediate review required."
			: "No significant sanctions concerns identified. Standard onboarding may proceed.",
	].join(" ");

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
			listsChecked: ["UN Consolidated"],
			matchesFound: 0,
			matches: [],
		},
		overall: {
			riskLevel,
			passed,
			requiresEDD: false,
			recommendation,
			reasoning,
			reviewRequired: unSanctionsMatchFound,
		},
		metadata: {
			checkId,
			checkedAt: now.toISOString(),
			expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
			dataSource: "Firecrawl (UN)",
		},
	};
}
