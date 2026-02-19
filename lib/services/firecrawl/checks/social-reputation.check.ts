/**
 * Social Reputation Check (Firecrawl-backed)
 *
 * Scrapes HelloPeter to extract business trust index, review counts,
 * and complaint/compliment data.
 */

import type {
	ApplicantData,
	EvidenceItem,
	SocialReputationCheckResult,
} from "@/lib/services/agents/contracts/firecrawl-check.contracts";
import { scrapeWithSchema } from "../firecrawl.client";
import { type QueryParams, SOCIAL_REPUTATION_PROVIDERS } from "../provider-registry";

export interface SocialReputationCheckInput {
	applicantId: number;
	workflowId: number;
	applicantData: ApplicantData;
}

export async function runSocialReputationCheck(
	input: SocialReputationCheckInput
): Promise<SocialReputationCheckResult> {
	const now = new Date().toISOString();
	const checkId = `social-reputation-${input.workflowId}-${Date.now()}`;

	const config = SOCIAL_REPUTATION_PROVIDERS.HELLOPETER;
	const queryParams: QueryParams = {
		companyName: input.applicantData.companyName,
		contactName: input.applicantData.contactName,
	};

	const url = config.buildUrl(queryParams);

	const scrapeResult = await scrapeWithSchema({
		url,
		schema: config.extractionSchema,
		prompt: config.prompt,
		timeoutMs: 30_000,
	});

	const expiresAt = new Date(
		Date.now() + config.ttlDays * 24 * 60 * 60 * 1000
	).toISOString();

	if (scrapeResult.runtimeState === "error" || scrapeResult.runtimeState === "blocked") {
		return {
			status: "mock",
			result: {
				checked: true,
				passed: true,
				checkedAt: now,
				failureDetail: scrapeResult.failureDetail,
			},
			runtimeState: scrapeResult.runtimeState,
			metadata: {
				checkId,
				checkedAt: now,
				expiresAt,
				dataSource: `Mock Fallback (Firecrawl ${scrapeResult.runtimeState})`,
				provider: "HELLOPETER",
				confidenceTier: "high_confidence",
				latencyMs: scrapeResult.latencyMs,
			},
		};
	}

	const data = scrapeResult.data as Record<string, unknown> | null;
	const found = data?.found === true;

	const trustIndex = data?.trustIndex as number | undefined;
	const starRating = data?.starRating as number | undefined;
	const complaintCount = data?.complaintCount as number | undefined;
	const complimentCount = data?.complimentCount as number | undefined;
	const totalReviews = data?.totalReviews as number | undefined;

	const summaryRating =
		trustIndex != null
			? Math.round(trustIndex * 10)
			: starRating != null
				? Math.round(starRating * 20)
				: undefined;

	const passed = summaryRating == null || summaryRating >= 30;

	const evidence: EvidenceItem[] = found
		? [
				{
					source: "HELLOPETER",
					sourceUrl: url,
					matchedName: (data?.businessName as string) ?? input.applicantData.companyName,
					confidence: summaryRating ?? undefined,
					details: {
						trustIndex,
						starRating,
						totalReviews,
						complaintCount,
						complimentCount,
						recentComplaints: data?.recentComplaints,
					},
				},
			]
		: [];

	return {
		status: "live",
		result: {
			checked: true,
			passed,
			evidence,
			checkedAt: now,
			summaryRating,
			complaintCount,
			complimentCount,
			failureDetail: scrapeResult.failureDetail,
		},
		runtimeState: scrapeResult.runtimeState === "partial" ? "partial" : "success",
		metadata: {
			checkId,
			checkedAt: now,
			expiresAt,
			dataSource: "Firecrawl + HelloPeter",
			provider: "HELLOPETER",
			confidenceTier: "high_confidence",
			latencyMs: scrapeResult.latencyMs,
		},
	};
}
