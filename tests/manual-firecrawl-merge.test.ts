import { describe, expect, it } from "bun:test";
import { buildReportData } from "@/lib/risk-review/build-report-data";
import { mergeExternalCheckIntoAiAnalysisJson } from "@/lib/risk-review/manual-firecrawl-checks";

describe("mergeExternalCheckIntoAiAnalysisJson", () => {
	it("merges industry regulator without clobbering other external checks", () => {
		const prior = JSON.stringify({
			externalChecks: {
				sarsVatSearch: { status: "live", result: { verified: true } },
			},
			scores: { aggregatedScore: 50 },
		});
		const merged = mergeExternalCheckIntoAiAnalysisJson(prior, "industryRegulator", {
			status: "live",
			result: {
				checked: true,
				passed: true,
				runtimeState: "success",
				metadata: { provider: "NCR" },
			},
		});
		const obj = JSON.parse(merged) as {
			externalChecks: {
				sarsVatSearch?: { status: string };
				industryRegulator?: { status: string; result: Record<string, unknown> };
			};
			scores?: { aggregatedScore: number };
			metadata?: { lastManualExternalCheckAt?: string };
		};
		expect(obj.externalChecks.sarsVatSearch?.status).toBe("live");
		expect(obj.externalChecks.industryRegulator?.status).toBe("live");
		expect(obj.externalChecks.industryRegulator?.result?.passed).toBe(true);
		expect(obj.scores?.aggregatedScore).toBe(50);
		expect(typeof obj.metadata?.lastManualExternalCheckAt).toBe("string");
	});

	it("initializes externalChecks when aiAnalysis was empty", () => {
		const merged = mergeExternalCheckIntoAiAnalysisJson(null, "socialReputation", {
			status: "offline",
			result: { checked: false },
		});
		const obj = JSON.parse(merged) as {
			externalChecks: { socialReputation?: { status: string } };
		};
		expect(obj.externalChecks.socialReputation?.status).toBe("offline");
	});
});

describe("buildReportData external check extractors", () => {
	it("surfaces industry and social slices from aiAnalysis", () => {
		const aiAnalysis = JSON.stringify({
			externalChecks: {
				industryRegulator: {
					status: "live",
					result: {
						checked: true,
						passed: true,
						checkedAt: "2026-01-02T00:00:00.000Z",
						runtimeState: "success",
						metadata: { provider: "NCR" },
						evidence: [
							{
								matchedName: "Acme Ltd",
								registrationStatus: "Registered",
							},
						],
					},
				},
				socialReputation: {
					status: "live",
					result: {
						checked: true,
						passed: true,
						checkedAt: "2026-01-02T01:00:00.000Z",
						summaryRating: 72,
						complaintCount: 1,
						complimentCount: 4,
						evidence: [{ matchedName: "Acme on HelloPeter" }],
					},
				},
			},
		});

		const data = buildReportData(
			{
				id: 1,
				companyName: "Acme",
				tradingName: null,
				registrationNumber: "123",
				contactName: "Bob",
				entityType: "company",
			},
			{ id: 10, applicantId: 1, startedAt: new Date() },
			[],
			null,
			aiAnalysis
		);

		expect(data.industryRegulatorCheck?.status).toBe("live");
		expect(data.industryRegulatorCheck?.provider).toBe("NCR");
		expect(data.industryRegulatorCheck?.registrationStatus).toBe("Registered");
		expect(data.socialReputationCheck?.summaryRating).toBe(72);
		expect(data.socialReputationCheck?.businessName).toBe("Acme on HelloPeter");
	});
});
