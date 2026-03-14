import type { ITCCheckResult } from "@/lib/types";

type MockProfile = "atlas" | "springvale" | "meridian" | "redline" | "default";

interface MockProfileInput {
	applicantId?: number;
	identifier?: string | null;
	companyName?: string | null;
	vendorId?: string | number | null;
	documentType?: string | null;
	fileName?: string | null;
}

function normalize(value?: string | number | null): string {
	return String(value ?? "")
		.trim()
		.toLowerCase();
}

function selectMockProfile(input: MockProfileInput): MockProfile {
	const applicantId = input.applicantId ?? 0;
	const candidate = [
		normalize(input.identifier),
		normalize(input.companyName),
		normalize(input.vendorId),
		normalize(input.documentType),
		normalize(input.fileName),
	].join(" ");

	if (
		applicantId === 1 ||
		candidate.includes("atlas") ||
		candidate.includes("184512")
	) {
		return "atlas";
	}

	if (
		applicantId === 2 ||
		candidate.includes("springvale") ||
		candidate.includes("442211")
	) {
		return "springvale";
	}

	if (
		applicantId === 3 ||
		candidate.includes("meridian") ||
		candidate.includes("101010")
	) {
		return "meridian";
	}

	if (
		applicantId === 4 ||
		candidate.includes("redline") ||
		candidate.includes("331144")
	) {
		return "redline";
	}

	if (applicantId > 0) {
		const profileOrder: MockProfile[] = ["atlas", "springvale", "meridian", "redline"];
		return profileOrder[(applicantId - 1) % profileOrder.length] ?? "default";
	}

	return "default";
}

function buildVendorId(profile: MockProfile, applicantId?: number): string {
	const profileId = profile.toUpperCase();
	return `MOCK-${profileId}-${String(applicantId ?? 0).padStart(3, "0")}`;
}

export function getMockProcureCheckVendorCreation(input: {
	applicantId: number;
	vendorName: string;
	registrationNumber?: string | null;
	idNumber?: string | null;
}) {
	const profile = selectMockProfile({
		applicantId: input.applicantId,
		identifier: input.registrationNumber ?? input.idNumber,
		companyName: input.vendorName,
	});
	const vendorId = buildVendorId(profile, input.applicantId);

	return {
		id: vendorId,
		ProcureCheckVendorID: vendorId,
		vendorExternalID: `STC-${input.applicantId}`,
		status: "mock_created",
		profile,
	};
}

export function getMockProcureCheckVendorResults(vendorId: string | number) {
	const profile = selectMockProfile({ vendorId });

	const resultMap: Record<MockProfile, Record<string, unknown>> = {
		atlas: {
			RiskSummary: { FailedChecks: 1, Status: "manual_review" },
			JudgementCheck: { Failed: false },
			Flags: ["Moderate concentration risk"],
			Source: "procurecheck-mock",
		},
		springvale: {
			RiskSummary: { FailedChecks: 0, Status: "clear" },
			JudgementCheck: { Failed: false },
			Flags: [],
			Source: "procurecheck-mock",
		},
		meridian: {
			RiskSummary: { FailedChecks: 0, Status: "clear" },
			JudgementCheck: { Failed: false },
			Flags: [],
			Source: "procurecheck-mock",
		},
		redline: {
			RiskSummary: { FailedChecks: 3, Status: "blocked" },
			JudgementCheck: { Failed: true },
			Flags: ["Sanctions evidence", "Procurement watchlist", "Adverse media"],
			Source: "procurecheck-mock",
		},
		default: {
			RiskSummary: { FailedChecks: 0, Status: "clear" },
			JudgementCheck: { Failed: false },
			Flags: [],
			Source: "procurecheck-mock",
		},
	};

	return {
		vendorId,
		...(resultMap[profile] ?? resultMap.default),
	};
}

export function getMockITCResult(input: {
	applicantId: number;
	identifier?: string | null;
	companyName?: string | null;
}): ITCCheckResult {
	const profile = selectMockProfile(input);
	const checkedAt = new Date();

	const resultMap: Record<MockProfile, ITCCheckResult> = {
		atlas: {
			creditScore: 642,
			riskCategory: "MEDIUM",
			passed: true,
			recommendation: "MANUAL_REVIEW",
			adverseListings: [
				{
					type: "Slow payer notice",
					amount: 95000,
					date: checkedAt.toISOString(),
					creditor: "Mock Trade Bureau",
				},
			],
			checkedAt,
			referenceNumber: `ITC-MOCK-ATLAS-${input.applicantId}`,
			rawResponse: { source: "itc-mock", profile },
		},
		springvale: {
			creditScore: 701,
			riskCategory: "LOW",
			passed: true,
			recommendation: "AUTO_APPROVE",
			adverseListings: [],
			checkedAt,
			referenceNumber: `ITC-MOCK-SPRING-${input.applicantId}`,
			rawResponse: { source: "itc-mock", profile },
		},
		meridian: {
			creditScore: 744,
			riskCategory: "LOW",
			passed: true,
			recommendation: "AUTO_APPROVE",
			adverseListings: [],
			checkedAt,
			referenceNumber: `ITC-MOCK-MERIDIAN-${input.applicantId}`,
			rawResponse: { source: "itc-mock", profile },
		},
		redline: {
			creditScore: 402,
			riskCategory: "VERY_HIGH",
			passed: false,
			recommendation: "AUTO_DECLINE",
			adverseListings: [
				{
					type: "Judgment",
					amount: 420000,
					date: checkedAt.toISOString(),
					creditor: "Mock Bureau Collections",
				},
			],
			checkedAt,
			referenceNumber: `ITC-MOCK-REDLINE-${input.applicantId}`,
			rawResponse: { source: "itc-mock", profile },
		},
		default: {
			creditScore: 690,
			riskCategory: "LOW",
			passed: true,
			recommendation: "AUTO_APPROVE",
			adverseListings: [],
			checkedAt,
			referenceNumber: `ITC-MOCK-DEFAULT-${input.applicantId}`,
			rawResponse: { source: "itc-mock", profile },
		},
	};

	return resultMap[profile] ?? resultMap.default;
}

export function getMockFicaVerificationResult(input: {
	workflowId: number;
	documentType: string;
	fileName: string;
}) {
	const profile = selectMockProfile({
		applicantId: input.workflowId,
		documentType: input.documentType,
		fileName: input.fileName,
	});

	if (profile === "springvale") {
		return {
			verificationStatus: "pending" as const,
			verificationNotes: "Mock verification pending: proof of address still required.",
			verifiedBy: "fica_mock_service",
			verifiedAt: null,
		};
	}

	if (profile === "redline") {
		return {
			verificationStatus: "rejected" as const,
			verificationNotes: "Mock verification flagged for enhanced manual review.",
			verifiedBy: "fica_mock_service",
			verifiedAt: new Date(),
		};
	}

	return {
		verificationStatus: "verified" as const,
		verificationNotes: "Mock verification completed successfully.",
		verifiedBy: "fica_mock_service",
		verifiedAt: new Date(),
	};
}