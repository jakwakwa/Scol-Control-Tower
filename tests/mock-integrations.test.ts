import { describe, expect, it } from "bun:test";
import {
	getMockFicaVerificationResult,
	getMockITCResult,
	getMockProcureCheckVendorCreation,
	getMockProcureCheckVendorResults,
} from "@/lib/mock-integrations";

describe("mock integrations", () => {
	it("returns deterministic procurecheck vendor ids and results", () => {
		const vendor = getMockProcureCheckVendorCreation({
			applicantId: 1,
			vendorName: "Atlas Facilities Group",
			registrationNumber: "2021/184512/07",
		});

		expect(vendor.ProcureCheckVendorID).toBe("MOCK-ATLAS-001");
		expect(getMockProcureCheckVendorResults(vendor.ProcureCheckVendorID)).toMatchObject({
			RiskSummary: { FailedChecks: 1, Status: "manual_review" },
		});
	});

	it("returns stable ITC outcomes for seeded profiles", () => {
		expect(
			getMockITCResult({
				applicantId: 2,
				identifier: "2019/442211/08",
				companyName: "Springvale Care NPC",
			}).recommendation
		).toBe("AUTO_APPROVE");

		expect(
			getMockITCResult({
				applicantId: 4,
				identifier: "2020/331144/07",
				companyName: "Redline Logistics Pty Ltd",
			}).recommendation
		).toBe("AUTO_DECLINE");
	});

	it("returns deterministic FICA verification statuses", () => {
		expect(
			getMockFicaVerificationResult({
				workflowId: 2,
				documentType: "PROOF_OF_ADDRESS",
				fileName: "springvale-proof-of-address.pdf",
			}).verificationStatus
		).toBe("pending");

		expect(
			getMockFicaVerificationResult({
				workflowId: 3,
				documentType: "BANK_STATEMENT",
				fileName: "meridian-bank-statement.pdf",
			}).verificationStatus
		).toBe("verified");
	});
});