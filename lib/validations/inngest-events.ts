import { z } from "zod";

// ============================================
// Entry / Trigger Events
// ============================================

export const OnboardingLeadCreatedSchema = z.object({
	applicantId: z.number().int().positive(),
	workflowId: z.number().int().positive(),
});

export type OnboardingLeadCreated = z.infer<typeof OnboardingLeadCreatedSchema>;

export const WorkflowTerminatedSchema = z.object({
	workflowId: z.number().int().positive(),
	applicantId: z.number().int().positive(),
	reason: z.enum([
		"PROCUREMENT_DENIED",
		"COMPLIANCE_VIOLATION",
		"FRAUD_DETECTED",
		"TIMEOUT_TERMINATION",
		"STAGE2_FACILITY_TIMEOUT",
		"STAGE2_APPROVAL_TIMEOUT",
		"STAGE2_PRE_RISK_APPROVAL_TIMEOUT",
		"STAGE2_PRE_RISK_EVAL_TIMEOUT",
		"STAGE2_QUOTE_APPROVAL_TIMEOUT",
		"STAGE2_QUOTE_RESPONSE_TIMEOUT",
		"STAGE3_FICA_UPLOAD_TIMEOUT",
		"STAGE4_FINANCIAL_STATEMENTS_TIMEOUT",
		"STAGE5_CONTRACT_REVIEW_TIMEOUT",
		"STAGE5_ABSA_FORM_TIMEOUT",
		"STAGE6_RISK_MANAGER_TIMEOUT",
		"STAGE6_ACCOUNT_MANAGER_TIMEOUT",
		"STAGE6_CONTRACT_SIGNATURE_TIMEOUT",
		"MANUAL_TERMINATION",
		"VALIDATION_ERROR_INGEST",
	]),
	decidedBy: z.string().min(1),
	terminatedAt: z.string().datetime(),
	notes: z.string().optional(),
});

export type WorkflowTerminated = z.infer<typeof WorkflowTerminatedSchema>;

export const DocumentUploadedSchema = z.object({
	workflowId: z.number().int().positive(),
	applicantId: z.number().int().positive(),
	documentId: z.number().int().positive(),
	documentType: z.string().min(1),
	category: z.string().optional(),
	uploadedAt: z.string().datetime(),
});

export type DocumentUploaded = z.infer<typeof DocumentUploadedSchema>;

// ============================================
// waitForEvent Result Schemas (17 events)
// ============================================

export const FormFacilitySubmittedSchema = z.object({
	workflowId: z.number().int().positive(),
	applicantId: z.number().int().positive(),
	submissionId: z.number().int().positive(),
	formData: z.object({
		mandateVolume: z.number(),
		mandateType: z.enum(["EFT", "DEBIT_ORDER", "CASH", "MIXED"]),
		businessType: z.string(),
		annualTurnover: z.number().optional(),
		facilityApplicationData: z.record(z.string(), z.unknown()).optional(),
		ficaComparisonContext: z
			.object({
				companyName: z.string().optional(),
				tradingName: z.string().optional(),
				registrationNumber: z.string().optional(),
				idNumber: z.string().optional(),
				contactName: z.string().optional(),
				email: z.string().optional(),
				phone: z.string().optional(),
			})
			.optional(),
	}),
	submittedAt: z.string().datetime(),
});

export type FormFacilitySubmitted = z.infer<typeof FormFacilitySubmittedSchema>;

export const RiskPreApprovalDecidedSchema = z.object({
	workflowId: z.number().int().positive(),
	applicantId: z.number().int().positive(),
	decision: z.object({
		outcome: z.enum(["APPROVED", "REJECTED"]),
		decidedBy: z.string().min(1),
		reason: z.string().optional(),
		requiresPreRiskEvaluation: z.boolean().optional(),
		timestamp: z.string().datetime(),
	}),
});

export type RiskPreApprovalDecided = z.infer<typeof RiskPreApprovalDecidedSchema>;

export const RiskPreEvaluationDecidedSchema = z.object({
	workflowId: z.number().int().positive(),
	applicantId: z.number().int().positive(),
	decision: z.object({
		outcome: z.enum(["APPROVED", "REJECTED"]),
		decidedBy: z.string().min(1),
		reason: z.string().optional(),
		timestamp: z.string().datetime(),
	}),
});

export type RiskPreEvaluationDecided = z.infer<typeof RiskPreEvaluationDecidedSchema>;

export const QuoteApprovedSchema = z.object({
	workflowId: z.number().int().positive(),
	applicantId: z.number().int().positive(),
	quoteId: z.number().int().positive(),
	approvedAt: z.string().datetime(),
});

export type QuoteApproved = z.infer<typeof QuoteApprovedSchema>;

export const QuoteRespondedSchema = z.object({
	workflowId: z.number().int().positive(),
	applicantId: z.number().int().positive(),
	quoteId: z.number().int().positive(),
	decision: z.enum(["APPROVED", "DECLINED"]),
	reason: z.string().optional(),
	respondedAt: z.string().datetime(),
});

export type QuoteResponded = z.infer<typeof QuoteRespondedSchema>;

export const UploadFicaReceivedSchema = z.object({
	workflowId: z.number().int().positive(),
	applicantId: z.number().int().positive(),
	documents: z
		.array(
			z.object({
				type: z.string().min(1),
				filename: z.string().min(1),
				url: z.string().url(),
				uploadedAt: z.string().datetime(),
			})
		)
		.optional(),
	uploadedBy: z.string().optional(),
	source: z.string().optional(),
});

export type UploadFicaReceived = z.infer<typeof UploadFicaReceivedSchema>;

export const RiskProcurementCompletedSchema = z.object({
	workflowId: z.number().int().positive(),
	applicantId: z.number().int().positive(),
	procureCheckResult: z
		.object({
			riskScore: z.number(),
			anomalies: z.array(z.string()).optional(),
			recommendedAction: z.enum(["APPROVE", "MANUAL_REVIEW", "DECLINE"]),
			rawData: z.record(z.string(), z.unknown()).optional(),
		})
		.optional(),
	decision: z.object({
		outcome: z.enum(["CLEARED", "DENIED"]),
		decidedBy: z.string().min(1),
		reason: z.string().optional(),
		timestamp: z.string().datetime(),
	}),
});

export type RiskProcurementCompleted = z.infer<typeof RiskProcurementCompletedSchema>;

export const SanctionClearedSchema = z.object({
	workflowId: z.number().int().positive(),
	applicantId: z.number().int().positive(),
	officerId: z.string().min(1),
	reason: z.string().min(1),
	clearedAt: z.string().datetime(),
});

export type SanctionCleared = z.infer<typeof SanctionClearedSchema>;

export const RiskDecisionReceivedSchema = z.object({
	workflowId: z.number().int().positive(),
	applicantId: z.number().int().positive(),
	decision: z.object({
		outcome: z.enum(["APPROVED", "REJECTED", "REQUEST_MORE_INFO"]),
		decidedBy: z.string().min(1),
		reason: z.string().optional(),
		conditions: z.array(z.string()).optional(),
		timestamp: z.string().datetime(),
	}),
});

export type RiskDecisionReceived = z.infer<typeof RiskDecisionReceivedSchema>;

export const RiskFinancialStatementsConfirmedSchema = z.object({
	workflowId: z.number().int().positive(),
	applicantId: z.number().int().positive(),
	confirmedBy: z.string().min(1),
	confirmedAt: z.string().datetime(),
});

export type RiskFinancialStatementsConfirmed = z.infer<
	typeof RiskFinancialStatementsConfirmedSchema
>;

export const ContractDraftReviewedSchema = z.object({
	workflowId: z.number().int().positive(),
	applicantId: z.number().int().positive(),
	reviewedBy: z.string().min(1),
	reviewedAt: z.string().datetime(),
	changes: z.record(z.string(), z.unknown()).optional(),
});

export type ContractDraftReviewed = z.infer<typeof ContractDraftReviewedSchema>;

export const FormAbsa6995CompletedSchema = z.object({
	workflowId: z.number().int().positive(),
	applicantId: z.number().int().positive(),
	completedAt: z.string().datetime(),
});

export type FormAbsa6995Completed = z.infer<typeof FormAbsa6995CompletedSchema>;

export const FormDecisionRespondedSchema = z.object({
	workflowId: z.number().int().positive(),
	applicantId: z.number().int().positive(),
	formType: z.enum(["SIGNED_QUOTATION", "AGREEMENT_CONTRACT", "CALL_CENTRE_APPLICATION"]),
	decision: z.enum(["APPROVED", "DECLINED"]),
	reason: z.string().optional(),
	respondedAt: z.string().datetime(),
});

export type FormDecisionResponded = z.infer<typeof FormDecisionRespondedSchema>;

export const ApprovalRiskManagerReceivedSchema = z.object({
	workflowId: z.number().int().positive(),
	applicantId: z.number().int().positive(),
	approvedBy: z.string().min(1),
	decision: z.enum(["APPROVED", "REJECTED"]),
	reason: z.string().optional(),
	timestamp: z.string().datetime(),
});

export type ApprovalRiskManagerReceived = z.infer<
	typeof ApprovalRiskManagerReceivedSchema
>;

export const ApprovalAccountManagerReceivedSchema = z.object({
	workflowId: z.number().int().positive(),
	applicantId: z.number().int().positive(),
	approvedBy: z.string().min(1),
	decision: z.enum(["APPROVED", "REJECTED"]),
	reason: z.string().optional(),
	timestamp: z.string().datetime(),
});

export type ApprovalAccountManagerReceived = z.infer<
	typeof ApprovalAccountManagerReceivedSchema
>;

// ============================================
// JSON.parse Payload Schemas
// ============================================

export const StoredSanctionsPayloadSchema = z.object({
	source: z.enum(["pre_risk", "itc_main"]).optional(),
	reused: z.boolean().optional(),
	reusedFrom: z.string().optional(),
	checkedAt: z.string().optional(),
	riskLevel: z.string().optional(),
	isBlocked: z.boolean().optional(),
	passed: z.boolean().optional(),
	isPEP: z.boolean().optional(),
	requiresEDD: z.boolean().optional(),
	adverseMediaCount: z.number().optional(),
	sanctionsResult: z.record(z.string(), z.unknown()).optional(),
});

export type StoredSanctionsPayload = z.infer<typeof StoredSanctionsPayloadSchema>;

export const QuoteDetailsSchema = z.object({
	riskFactors: z.array(z.string()).optional(),
	generatedAt: z.string().optional(),
});

export type QuoteDetails = z.infer<typeof QuoteDetailsSchema>;
