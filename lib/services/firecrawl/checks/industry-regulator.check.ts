/**
 * Industry Regulator Check (Firecrawl-backed)
 *
 * Scrapes high-confidence regulator registers (NCR, CFDC, SAICA, etc.)
 * and returns a normalized IndustryRegulatorCheckResult.
 */

import type {
	ApplicantData,
	EvidenceItem,
	IndustryRegulatorCheckResult,
	IndustryRegulatorProvider,
} from "@/lib/services/agents/contracts/firecrawl-check.contracts";
import { scrapeWithSchema } from "../firecrawl.client";
import { INDUSTRY_REGULATOR_PROVIDERS, type QueryParams } from "../provider-registry";

/** Provider selection heuristic based on industry string */
const INDUSTRY_TO_PROVIDER: Record<string, IndustryRegulatorProvider> = {
	credit: "NCR",
	lending: "NCR",
	"debt counselling": "CFDC",
	"debt collection": "CFDC",
	accounting: "SAICA",
	auditing: "SAICA",
	"business accounting": "CIBA",
	"financial planning": "FPI",
	"financial advisory": "FPI",
	fiduciary: "FISA",
	"motor retail": "RMI",
	automotive: "RMI",
	security: "PSIRA",
	"private security": "PSIRA",
	education: "SACE",
	teaching: "SACE",
	"early childhood": "DOE",
};

function resolveProvider(
	industry?: string,
	providerOverride?: IndustryRegulatorProvider
): IndustryRegulatorProvider | null {
	if (providerOverride) return providerOverride;

	if (!industry) return null;

	const lower = industry.toLowerCase();
	for (const [keyword, provider] of Object.entries(INDUSTRY_TO_PROVIDER)) {
		if (lower.includes(keyword)) return provider;
	}
	return null;
}

export interface IndustryRegulatorCheckInput {
	applicantId: number;
	workflowId: number;
	applicantData: ApplicantData;
	industry?: string;
	provider?: IndustryRegulatorProvider;
}

export async function runIndustryRegulatorCheck(
	input: IndustryRegulatorCheckInput
): Promise<IndustryRegulatorCheckResult> {
	const now = new Date().toISOString();
	const checkId = `industry-regulator-${input.workflowId}-${Date.now()}`;

	const provider = resolveProvider(input.industry, input.provider);

	if (!provider) {
		return {
			status: "mock",
			result: {
				checked: false,
				passed: true,
				checkedAt: now,
				failureDetail: {
					code: "error",
					message:
						"Could not determine industry regulator provider from industry or override",
					retryPolicy: "manual",
				},
			},
			runtimeState: "error",
			metadata: {
				checkId,
				checkedAt: now,
				dataSource: "Mock Fallback (no provider resolved)",
				provider: "UNKNOWN",
				confidenceTier: "high_confidence",
			},
		};
	}

	const config = INDUSTRY_REGULATOR_PROVIDERS[provider];
	const queryParams: QueryParams = {
		companyName: input.applicantData.companyName,
		registrationNumber: input.applicantData.registrationNumber,
		contactName: input.applicantData.contactName,
		industry: input.industry,
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
				provider,
				confidenceTier: "high_confidence",
				latencyMs: scrapeResult.latencyMs,
			},
		};
	}

	const data = scrapeResult.data as Record<string, unknown> | null;
	const found = data?.found === true;
	const evidence: EvidenceItem[] = found
		? [
				{
					source: provider,
					sourceUrl: url,
					matchedName:
						(data?.entityName as string) ??
						(data?.memberName as string) ??
						input.applicantData.companyName,
					registrationStatus:
						(data?.registrationStatus as string) ??
						(data?.status as string) ??
						(data?.designation as string) ??
						undefined,
					confidence: 90,
					details: data ?? undefined,
				},
			]
		: [];

	const providerPayload: Record<string, unknown> = {};
	if (data) {
		const { found: _found, ...rest } = data;
		Object.assign(providerPayload, rest);
	}

	const runtimeState = scrapeResult.runtimeState === "partial" ? "partial" : "success";

	return {
		status: "live",
		result: {
			checked: true,
			passed: found,
			evidence,
			checkedAt: now,
			providerPayload:
				Object.keys(providerPayload).length > 0 ? providerPayload : undefined,
			failureDetail: scrapeResult.failureDetail,
		},
		runtimeState,
		metadata: {
			checkId,
			checkedAt: now,
			expiresAt,
			dataSource: `Firecrawl + ${provider}`,
			provider,
			confidenceTier: "high_confidence",
			latencyMs: scrapeResult.latencyMs,
		},
	};
}
