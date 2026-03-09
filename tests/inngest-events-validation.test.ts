import { describe, it, expect } from "bun:test";
import {
	OnboardingLeadCreatedSchema,
	WorkflowTerminatedSchema,
	DocumentUploadedSchema,
	FormFacilitySubmittedSchema,
	RiskPreApprovalDecidedSchema,
	QuoteApprovedSchema,
	QuoteRespondedSchema,
	UploadFicaReceivedSchema,
	SanctionClearedSchema,
	RiskDecisionReceivedSchema,
	StoredSanctionsPayloadSchema,
	QuoteDetailsSchema,
} from "../lib/validations/inngest-events";

describe("Inngest Event Validation Schemas", () => {
	describe("OnboardingLeadCreatedSchema", () => {
		it("should validate correct data", () => {
			const data = { applicantId: 1, workflowId: 2 };
			expect(() => OnboardingLeadCreatedSchema.parse(data)).not.toThrow();
		});

		it("should reject missing applicantId", () => {
			const data = { workflowId: 2 };
			expect(() => OnboardingLeadCreatedSchema.parse(data)).toThrow();
		});

		it("should reject non-positive numbers", () => {
			const data = { applicantId: 0, workflowId: 2 };
			expect(() => OnboardingLeadCreatedSchema.parse(data)).toThrow();
		});
	});

	describe("WorkflowTerminatedSchema", () => {
		it("should validate correct data", () => {
			const data = {
				workflowId: 1,
				applicantId: 2,
				reason: "MANUAL_TERMINATION" as const,
				decidedBy: "user@example.com",
				terminatedAt: "2026-03-03T10:00:00Z",
			};
			expect(() => WorkflowTerminatedSchema.parse(data)).not.toThrow();
		});

		it("should reject invalid reason", () => {
			const data = {
				workflowId: 1,
				applicantId: 2,
				reason: "INVALID_REASON",
				decidedBy: "user@example.com",
				terminatedAt: "2026-03-03T10:00:00Z",
			};
			expect(() => WorkflowTerminatedSchema.parse(data)).toThrow();
		});

		it("should reject STAGE2_APPROVAL_TIMEOUT (orphan value not in KillSwitchReason)", () => {
			const data = {
				workflowId: 1,
				applicantId: 2,
				reason: "STAGE2_APPROVAL_TIMEOUT",
				decidedBy: "user@example.com",
				terminatedAt: "2026-03-03T10:00:00Z",
			};
			expect(() => WorkflowTerminatedSchema.parse(data)).toThrow();
		});
	});

	describe("DocumentUploadedSchema", () => {
		it("should validate correct data", () => {
			const data = {
				workflowId: 1,
				applicantId: 2,
				documentId: 3,
				documentType: "BANK_STATEMENT",
				uploadedAt: "2026-03-03T10:00:00Z",
			};
			expect(() => DocumentUploadedSchema.parse(data)).not.toThrow();
		});

		it("should accept optional category", () => {
			const data = {
				workflowId: 1,
				applicantId: 2,
				documentId: 3,
				documentType: "BANK_STATEMENT",
				category: "financial",
				uploadedAt: "2026-03-03T10:00:00Z",
			};
			expect(() => DocumentUploadedSchema.parse(data)).not.toThrow();
		});
	});

	describe("FormFacilitySubmittedSchema", () => {
		it("should validate correct data", () => {
			const data = {
				workflowId: 1,
				applicantId: 2,
				submissionId: 3,
				formData: { mandateVolume: 100000 },
				submittedAt: "2026-03-03T10:00:00Z",
			};
			expect(() => FormFacilitySubmittedSchema.parse(data)).not.toThrow();
		});

		it("should accept complex formData", () => {
			const data = {
				workflowId: 1,
				applicantId: 2,
				submissionId: 3,
				formData: {
					mandateVolume: 100000,
					mandateType: "EFT",
					nested: { key: "value" },
				},
				submittedAt: "2026-03-03T10:00:00Z",
			};
			expect(() => FormFacilitySubmittedSchema.parse(data)).not.toThrow();
		});
	});

	describe("RiskPreApprovalDecidedSchema", () => {
		it("should validate APPROVED decision", () => {
			const data = {
				workflowId: 1,
				applicantId: 2,
				decision: {
					outcome: "APPROVED" as const,
					decidedBy: "user@example.com",
					timestamp: "2026-03-03T10:00:00Z",
				},
			};
			expect(() => RiskPreApprovalDecidedSchema.parse(data)).not.toThrow();
		});

		it("should validate REJECTED decision with reason", () => {
			const data = {
				workflowId: 1,
				applicantId: 2,
				decision: {
					outcome: "REJECTED" as const,
					decidedBy: "user@example.com",
					reason: "High risk",
					timestamp: "2026-03-03T10:00:00Z",
				},
			};
			expect(() => RiskPreApprovalDecidedSchema.parse(data)).not.toThrow();
		});
	});

	describe("QuoteApprovedSchema", () => {
		it("should validate correct data", () => {
			const data = {
				workflowId: 1,
				applicantId: 2,
				quoteId: 3,
				approvedAt: "2026-03-03T10:00:00Z",
			};
			expect(() => QuoteApprovedSchema.parse(data)).not.toThrow();
		});
	});

	describe("QuoteRespondedSchema", () => {
		it("should validate APPROVED response", () => {
			const data = {
				workflowId: 1,
				applicantId: 2,
				quoteId: 3,
				decision: "APPROVED" as const,
				respondedAt: "2026-03-03T10:00:00Z",
			};
			expect(() => QuoteRespondedSchema.parse(data)).not.toThrow();
		});

		it("should validate DECLINED response with reason", () => {
			const data = {
				workflowId: 1,
				applicantId: 2,
				quoteId: 3,
				decision: "DECLINED" as const,
				reason: "Too expensive",
				respondedAt: "2026-03-03T10:00:00Z",
			};
			expect(() => QuoteRespondedSchema.parse(data)).not.toThrow();
		});
	});

	describe("UploadFicaReceivedSchema", () => {
		it("should validate with documents array", () => {
			const data = {
				workflowId: 1,
				applicantId: 2,
				documents: [
					{
						type: "BANK_STATEMENT",
						filename: "statement.pdf",
						url: "https://example.com/file.pdf",
						uploadedAt: "2026-03-03T10:00:00Z",
					},
				],
			};
			expect(() => UploadFicaReceivedSchema.parse(data)).not.toThrow();
		});

		it("should validate without documents (synthetic source)", () => {
			const data = {
				workflowId: 1,
				applicantId: 2,
				source: "stage2_documents_already_complete",
			};
			expect(() => UploadFicaReceivedSchema.parse(data)).not.toThrow();
		});
	});

	describe("SanctionClearedSchema", () => {
		it("should validate correct data", () => {
			const data = {
				workflowId: 1,
				applicantId: 2,
				officerId: "officer@example.com",
				reason: "False positive",
				clearedAt: "2026-03-03T10:00:00Z",
			};
			expect(() => SanctionClearedSchema.parse(data)).not.toThrow();
		});

		it("should reject empty reason", () => {
			const data = {
				workflowId: 1,
				applicantId: 2,
				officerId: "officer@example.com",
				reason: "",
				clearedAt: "2026-03-03T10:00:00Z",
			};
			expect(() => SanctionClearedSchema.parse(data)).toThrow();
		});
	});

	describe("RiskDecisionReceivedSchema", () => {
		it("should validate APPROVED decision", () => {
			const data = {
				workflowId: 1,
				applicantId: 2,
				decision: {
					outcome: "APPROVED" as const,
					decidedBy: "risk@example.com",
					timestamp: "2026-03-03T10:00:00Z",
				},
			};
			expect(() => RiskDecisionReceivedSchema.parse(data)).not.toThrow();
		});

		it("should validate REJECTED decision with conditions", () => {
			const data = {
				workflowId: 1,
				applicantId: 2,
				decision: {
					outcome: "REJECTED" as const,
					decidedBy: "risk@example.com",
					reason: "High risk profile",
					conditions: ["Additional documentation required"],
					timestamp: "2026-03-03T10:00:00Z",
				},
			};
			expect(() => RiskDecisionReceivedSchema.parse(data)).not.toThrow();
		});
	});

	describe("StoredSanctionsPayloadSchema", () => {
		it("should validate with reuse information", () => {
			const data = {
				source: "pre_risk" as const,
				reused: true,
				checkedAt: "2026-03-03T10:00:00Z",
				riskLevel: "CLEAR",
				isBlocked: false,
			};
			expect(() => StoredSanctionsPayloadSchema.safeParse(data)).not.toThrow();
		});

		it("should validate with sanctions result", () => {
			const data = {
				source: "itc_main" as const,
				passed: true,
				isPEP: false,
				sanctionsResult: { status: "clear", matches: [] },
			};
			expect(() => StoredSanctionsPayloadSchema.safeParse(data)).not.toThrow();
		});

		it("should handle empty payload gracefully", () => {
			const data = {};
			const result = StoredSanctionsPayloadSchema.safeParse(data);
			expect(result.success).toBe(true);
		});
	});

	describe("QuoteDetailsSchema", () => {
		it("should validate with risk factors and generated date", () => {
			const data = {
				riskFactors: ["High turnover", "Sector risk"],
				generatedAt: "2026-03-03T10:00:00Z",
			};
			expect(() => QuoteDetailsSchema.safeParse(data)).not.toThrow();
		});

		it("should validate with only risk factors", () => {
			const data = {
				riskFactors: ["Market risk"],
			};
			expect(() => QuoteDetailsSchema.safeParse(data)).not.toThrow();
		});

		it("should handle empty object gracefully", () => {
			const data = {};
			const result = QuoteDetailsSchema.safeParse(data);
			expect(result.success).toBe(true);
		});
	});
});
