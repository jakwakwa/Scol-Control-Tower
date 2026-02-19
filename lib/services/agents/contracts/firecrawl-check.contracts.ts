/**
 * Firecrawl Check Agent Contracts
 *
 * Zod schemas for Firecrawl-backed verification checks.
 * Aligned to docs/agent-contracts/firecrawl-check-contracts.md
 */

import { z } from "zod";

// ============================================
// Base Contracts
// ============================================

/** Outer status compatible with externalChecks convention */
export const CheckStatusSchema = z.enum(["mock", "live"]);
export type CheckStatus = z.infer<typeof CheckStatusSchema>;

/** Inner runtime/fallback state */
export const RuntimeStateSchema = z.enum([
	"success",
	"partial",
	"action_required",
	"blocked",
	"error",
]);
export type RuntimeState = z.infer<typeof RuntimeStateSchema>;

/** Confidence tier for source reliability */
export const ConfidenceTierSchema = z.enum(["high_confidence", "medium_confidence"]);
export type ConfidenceTier = z.infer<typeof ConfidenceTierSchema>;

/** Retry policy recommendation */
export const RetryPolicySchema = z.enum(["immediate", "backoff", "manual"]);
export type RetryPolicy = z.infer<typeof RetryPolicySchema>;

/** Match type for sanctions evidence */
export const MatchTypeSchema = z.enum(["EXACT", "PARTIAL", "FUZZY"]);
export type MatchType = z.infer<typeof MatchTypeSchema>;

/** Applicant data used in check requests */
export const ApplicantDataSchema = z.object({
	companyName: z.string(),
	contactName: z.string().optional(),
	registrationNumber: z.string().optional(),
	industry: z.string().optional(),
	countryCode: z.string().optional(),
	address: z.string().optional(),
	directors: z
		.array(
			z.object({
				name: z.string(),
				idNumber: z.string().optional(),
				nationality: z.string().optional(),
			})
		)
		.optional(),
});
export type ApplicantData = z.infer<typeof ApplicantDataSchema>;

/** Check metadata for audit and traceability */
export const CheckMetadataSchema = z.object({
	checkId: z.string(),
	checkedAt: z.string(),
	expiresAt: z.string().optional(),
	dataSource: z.string(),
	provider: z.string(),
	confidenceTier: ConfidenceTierSchema,
	latencyMs: z.number().optional(),
});
export type CheckMetadata = z.infer<typeof CheckMetadataSchema>;

/** Normalized evidence record */
export const EvidenceItemSchema = z.object({
	source: z.string(),
	sourceUrl: z.string().optional(),
	matchType: MatchTypeSchema.optional(),
	matchedName: z.string().optional(),
	confidence: z.number().min(0).max(100).optional(),
	listEntryId: z.string().optional(),
	registrationStatus: z.string().optional(),
	details: z.record(z.string(), z.unknown()).optional(),
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

/** Failure detail for fallback states */
export const FailureDetailSchema = z.object({
	code: RuntimeStateSchema,
	message: z.string(),
	retryPolicy: RetryPolicySchema.optional(),
	blockedReason: z.string().optional(),
});
export type FailureDetail = z.infer<typeof FailureDetailSchema>;

/** Base check request envelope */
export const CheckRequestBaseSchema = z.object({
	applicantId: z.number(),
	workflowId: z.number(),
	applicantData: ApplicantDataSchema,
	industry: z.string().optional(),
	provider: z.string().optional(),
});
export type CheckRequestBase = z.infer<typeof CheckRequestBaseSchema>;

// ============================================
// Provider Codes
// ============================================

/** Industry regulator providers (high-confidence) */
export const IndustryRegulatorProviderSchema = z.enum([
	"NCR",
	"CFDC",
	"SAICA",
	"CIBA",
	"FPI",
	"FISA",
	"RMI",
	"PSIRA",
	"SACE",
	"DOE",
]);
export type IndustryRegulatorProvider = z.infer<typeof IndustryRegulatorProviderSchema>;

/** Sanctions evidence providers */
export const SanctionsProviderSchema = z.enum(["OFAC", "UN_1267", "FIC_TFS"]);
export type SanctionsProvider = z.infer<typeof SanctionsProviderSchema>;

/** Social reputation provider */
export const SocialReputationProviderSchema = z.enum(["HELLOPETER"]);
export type SocialReputationProvider = z.infer<typeof SocialReputationProviderSchema>;

/** Medium-confidence regulator providers */
export const MediumConfidenceRegulatorProviderSchema = z.enum([
	"FSCA",
	"HPCSA",
	"SAIPA",
	"LPC",
]);
export type MediumConfidenceRegulatorProvider = z.infer<
	typeof MediumConfidenceRegulatorProviderSchema
>;

// ============================================
// Family Contracts - Industry Regulator
// ============================================

export const RegulatorProviderPayloadSchema = z
	.record(z.string(), z.unknown())
	.describe("Provider-specific slice (NCR, CFDC, SAICA, etc.)");

export const IndustryRegulatorCheckRequestSchema = CheckRequestBaseSchema.extend({
	industry: z.string().optional(),
	provider: IndustryRegulatorProviderSchema.optional(),
});
export type IndustryRegulatorCheckRequest = z.infer<
	typeof IndustryRegulatorCheckRequestSchema
>;

export const IndustryRegulatorCheckResultPayloadSchema = z.object({
	checked: z.boolean(),
	passed: z.boolean(),
	evidence: z.array(EvidenceItemSchema).optional(),
	failureDetail: FailureDetailSchema.optional(),
	checkedAt: z.string(),
	providerPayload: RegulatorProviderPayloadSchema.optional(),
});
export type IndustryRegulatorCheckResultPayload = z.infer<
	typeof IndustryRegulatorCheckResultPayloadSchema
>;

export const IndustryRegulatorCheckResultSchema = z.object({
	status: CheckStatusSchema,
	result: IndustryRegulatorCheckResultPayloadSchema,
	runtimeState: RuntimeStateSchema,
	metadata: CheckMetadataSchema,
});
export type IndustryRegulatorCheckResult = z.infer<
	typeof IndustryRegulatorCheckResultSchema
>;

// ============================================
// Family Contracts - Sanctions Evidence Enrichment
// ============================================

export const DeepLinkSchema = z.object({
	label: z.string(),
	url: z.string(),
	source: z.string(),
});

export const SanctionsEvidenceEnrichmentRequestSchema = CheckRequestBaseSchema.extend({
	entityName: z.string(),
	entityType: z.enum(["INDIVIDUAL", "COMPANY", "TRUST", "OTHER"]),
	countryCode: z.string(),
	registrationNumber: z.string().optional(),
});
export type SanctionsEvidenceEnrichmentRequest = z.infer<
	typeof SanctionsEvidenceEnrichmentRequestSchema
>;

export const SanctionsEvidenceEnrichmentResultPayloadSchema = z.object({
	checked: z.boolean(),
	passed: z.boolean(),
	evidence: z.array(EvidenceItemSchema),
	failureDetail: FailureDetailSchema.optional(),
	checkedAt: z.string(),
	sourcesChecked: z.array(z.string()),
	deepLinks: z.array(DeepLinkSchema),
});
export type SanctionsEvidenceEnrichmentResultPayload = z.infer<
	typeof SanctionsEvidenceEnrichmentResultPayloadSchema
>;

export const SanctionsEvidenceEnrichmentResultSchema = z.object({
	status: CheckStatusSchema,
	result: SanctionsEvidenceEnrichmentResultPayloadSchema,
	runtimeState: RuntimeStateSchema,
	metadata: CheckMetadataSchema,
});
export type SanctionsEvidenceEnrichmentResult = z.infer<
	typeof SanctionsEvidenceEnrichmentResultSchema
>;

// ============================================
// Family Contracts - Social Reputation
// ============================================

export const SocialReputationCheckRequestSchema = CheckRequestBaseSchema;
export type SocialReputationCheckRequest = z.infer<
	typeof SocialReputationCheckRequestSchema
>;

export const SocialReputationCheckResultPayloadSchema = z.object({
	checked: z.boolean(),
	passed: z.boolean(),
	evidence: z.array(EvidenceItemSchema).optional(),
	failureDetail: FailureDetailSchema.optional(),
	checkedAt: z.string(),
	summaryRating: z.number().min(0).max(100).optional(),
	complaintCount: z.number().optional(),
	complimentCount: z.number().optional(),
});
export type SocialReputationCheckResultPayload = z.infer<
	typeof SocialReputationCheckResultPayloadSchema
>;

export const SocialReputationCheckResultSchema = z.object({
	status: CheckStatusSchema,
	result: SocialReputationCheckResultPayloadSchema,
	runtimeState: RuntimeStateSchema,
	metadata: CheckMetadataSchema,
});
export type SocialReputationCheckResult = z.infer<
	typeof SocialReputationCheckResultSchema
>;

// ============================================
// Family Contracts - Medium Confidence Regulator
// ============================================

export const MediumConfidenceRegulatorCheckRequestSchema =
	CheckRequestBaseSchema.extend({
		provider: MediumConfidenceRegulatorProviderSchema,
	});
export type MediumConfidenceRegulatorCheckRequest = z.infer<
	typeof MediumConfidenceRegulatorCheckRequestSchema
>;

/** Same payload shape as industry regulator; runtimeState often action_required */
export const MediumConfidenceRegulatorCheckResultSchema = z.object({
	status: CheckStatusSchema,
	result: IndustryRegulatorCheckResultPayloadSchema,
	runtimeState: RuntimeStateSchema,
	metadata: CheckMetadataSchema.extend({
		confidenceTier: z.literal("medium_confidence"),
	}),
});
export type MediumConfidenceRegulatorCheckResult = z.infer<
	typeof MediumConfidenceRegulatorCheckResultSchema
>;

// ============================================
// externalChecks-Compatible Output
// ============================================

/** Result shape compatible with externalChecks.industryRegulator and related slots */
export const ExternalCheckResultSchema = z.object({
	checked: z.boolean(),
	passed: z.boolean(),
	mockReason: z.string().optional(),
	checkedAt: z.string(),
	runtimeState: RuntimeStateSchema.optional(),
	evidence: z.array(EvidenceItemSchema).optional(),
	failureDetail: FailureDetailSchema.optional(),
	providerPayload: z.record(z.string(), z.unknown()).optional(),
	sourcesChecked: z.array(z.string()).optional(),
	deepLinks: z.array(DeepLinkSchema).optional(),
	summaryRating: z.number().optional(),
	complaintCount: z.number().optional(),
	complimentCount: z.number().optional(),
});
export type ExternalCheckResult = z.infer<typeof ExternalCheckResultSchema>;
