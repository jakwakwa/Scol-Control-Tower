/**
 * Sanctions Evidence Enrichment Check (Firecrawl-backed)
 *
 * Scrapes OFAC, UN 1267, and FIC TFS lists to enrich sanctions
 * screening evidence with deep links and structured match data.
 */

import type {
	ApplicantData,
	EvidenceItem,
	SanctionsEvidenceEnrichmentResult,
	SanctionsProvider,
} from "@/lib/services/agents/contracts/firecrawl-check.contracts";
import { scrapeWithSchema } from "../firecrawl.client";
import { type QueryParams, SANCTIONS_PROVIDERS } from "../provider-registry";

type DeepLink = { label: string; url: string; source: string };

const DEEP_LINK_TEMPLATES: Record<SanctionsProvider, (id?: string) => DeepLink> = {
	OFAC: id => ({
		label: id ? `OFAC SDN Entry ${id}` : "OFAC Sanctions Search",
		url: id
			? `https://sanctionssearch.ofac.treas.gov/Details.aspx?id=${id}`
			: "https://sanctionssearch.ofac.treas.gov/",
		source: "OFAC",
	}),
	UN_1267: id => ({
		label: id ? `UN 1267 Entry ${id}` : "UN Security Council 1267 Sanctions List",
		url: id
			? `https://www.un.org/securitycouncil/sanctions/1267/aq_sanctions_list/summaries?q=${id}`
			: "https://www.un.org/securitycouncil/sanctions/1267/aq_sanctions_list",
		source: "UN_1267",
	}),
	FIC_TFS: id => ({
		label: id ? `FIC TFS Notice ${id}` : "FIC Targeted Financial Sanctions",
		url: id
			? `https://www.fic.gov.za/targeted-financial-sanctions/?notice=${id}`
			: "https://www.fic.gov.za/targeted-financial-sanctions/",
		source: "FIC_TFS",
	}),
};

export interface SanctionsEnrichmentCheckInput {
	applicantId: number;
	workflowId: number;
	applicantData: ApplicantData;
	entityName: string;
	entityType: "INDIVIDUAL" | "COMPANY" | "TRUST" | "OTHER";
	countryCode: string;
	registrationNumber?: string;
}

export async function runSanctionsEnrichmentCheck(
	input: SanctionsEnrichmentCheckInput
): Promise<SanctionsEvidenceEnrichmentResult> {
	const now = new Date().toISOString();
	const checkId = `sanctions-enrichment-${input.workflowId}-${Date.now()}`;
	const providers: SanctionsProvider[] = ["OFAC", "UN_1267", "FIC_TFS"];

	const queryParams: QueryParams = {
		companyName: input.entityName,
		registrationNumber: input.registrationNumber,
		contactName: input.applicantData.contactName,
	};

	const results = await Promise.allSettled(
		providers.map(async provider => {
			const config = SANCTIONS_PROVIDERS[provider];
			const url = config.buildUrl(queryParams);

			const scrapeResult = await scrapeWithSchema({
				url,
				schema: config.extractionSchema,
				prompt: config.prompt.replace("{companyName}", input.entityName),
				timeoutMs: 30_000,
			});

			return { provider, scrapeResult, url };
		})
	);

	const allEvidence: EvidenceItem[] = [];
	const deepLinks: DeepLink[] = [];
	const sourcesChecked: string[] = [];
	let hasAnyMatch = false;
	let worstState: "success" | "partial" | "error" | "blocked" = "success";
	let latencyMs = 0;

	for (const settled of results) {
		if (settled.status === "rejected") {
			worstState = "error";
			continue;
		}

		const { provider, scrapeResult, url } = settled.value;
		sourcesChecked.push(provider);
		latencyMs = Math.max(latencyMs, scrapeResult.latencyMs);

		if (
			scrapeResult.runtimeState === "error" ||
			scrapeResult.runtimeState === "blocked"
		) {
			worstState = scrapeResult.runtimeState === "blocked" ? "blocked" : "error";
			deepLinks.push(DEEP_LINK_TEMPLATES[provider]());
			continue;
		}

		const data = scrapeResult.data as Record<string, unknown> | null;
		const matchesFound = data?.matchesFound === true;
		const matches = (data?.matches ?? []) as Array<Record<string, unknown>>;

		deepLinks.push(DEEP_LINK_TEMPLATES[provider]());

		if (matchesFound && matches.length > 0) {
			hasAnyMatch = true;

			for (const match of matches) {
				const entryId =
					(match.listEntryId as string) ??
					(match.permanentRefNum as string) ??
					(match.noticeId as string);

				allEvidence.push({
					source: provider,
					sourceUrl: url,
					matchType: "FUZZY",
					matchedName: match.name as string,
					confidence: (match.score as number) ?? 70,
					listEntryId: entryId,
					details: match,
				});

				if (entryId) {
					deepLinks.push(DEEP_LINK_TEMPLATES[provider](entryId));
				}
			}
		}

		if (scrapeResult.runtimeState === "partial" && worstState === "success") {
			worstState = "partial";
		}
	}

	const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

	return {
		status: worstState === "error" || worstState === "blocked" ? "mock" : "live",
		result: {
			checked: true,
			passed: !hasAnyMatch,
			evidence: allEvidence,
			checkedAt: now,
			sourcesChecked,
			deepLinks,
			failureDetail:
				worstState !== "success"
					? {
							code: worstState,
							message: `One or more sanctions sources returned ${worstState}`,
							retryPolicy: "backoff",
						}
					: undefined,
		},
		runtimeState: worstState,
		metadata: {
			checkId,
			checkedAt: now,
			expiresAt,
			dataSource: `Firecrawl + ${sourcesChecked.join(", ")}`,
			provider: sourcesChecked.join(","),
			confidenceTier: "high_confidence",
			latencyMs,
		},
	};
}
