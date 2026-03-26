import { z } from "zod";

/**
 * Canonical perimeter validation schemas for Control Tower events.
 *
 * This is the single source of truth for ingest-boundary schemas.
 * Other modules (inngest-events.ts, tests) should re-export from here
 * rather than defining their own copies.
 */

// ============================================
// Onboarding Lead Created (canonical)
// ============================================

// Strict schema for enhanced validation rollout
export const LeadCreatedSchema = z.object({
	applicantId: z.number().int().positive("applicantId must be a positive integer"),
	workflowId: z.number().int().positive("workflowId must be a positive integer"),
	companyName: z.string().min(1, "companyName is required"),
	contactName: z.string().min(1, "contactName is required"),
	email: z.string().email("email must be a valid email address"),
	source: z.enum(["dashboard", "webhook", "api"]).default("api"),
	createdAt: z.string().datetime().optional(),
});

// Compatibility schema for warn-mode fallback during rollout
export const LeadCreatedCompatSchema = z.object({
	applicantId: z.number().int().positive("applicantId must be a positive integer"),
	workflowId: z.number().int().positive("workflowId must be a positive integer"),
	// All other fields optional for backward compatibility
	companyName: z.string().optional(),
	contactName: z.string().optional(),
	email: z.string().optional(),
	source: z.string().optional(),
	createdAt: z.string().optional(),
});

export type LeadCreatedPayload = z.infer<typeof LeadCreatedSchema>;
export type LeadCreatedCompatPayload = z.infer<typeof LeadCreatedCompatSchema>;

// ============================================
// Sanctions Providers
// ============================================

export const SANCTIONS_PROVIDERS = [
	"opensanctions",
	"firecrawl_un",
	"firecrawl_ofac",
	"firecrawl_fic",
	"manual",
] as const;

export type SanctionsProvider = (typeof SANCTIONS_PROVIDERS)[number];

// ============================================
// External Sanctions Ingress (provider-agnostic)
// ============================================

export const SanctionsMatchDetailSchema = z.object({
	listName: z.string(),
	matchedEntity: z.string(),
	matchConfidence: z.number().min(0).max(100),
	matchType: z.enum(["EXACT", "PARTIAL", "FUZZY"]).optional(),
	sanctionType: z.string().optional(),
	sanctionDate: z.string().optional(),
});

export type SanctionsMatchDetail = z.infer<typeof SanctionsMatchDetailSchema>;

// V2 strict schema for enhanced validation rollout
export const ExternalSanctionsIngressSchema = z.object({
	version: z.literal("v2").default("v2"),
	workflowId: z.number().int().positive("workflowId must be a positive integer"),
	applicantId: z.number().int().positive("applicantId must be a positive integer"),
	provider: z.enum(SANCTIONS_PROVIDERS),
	externalCheckId: z.string().min(1, "externalCheckId is required for idempotency"),
	checkedAt: z.string().datetime("checkedAt must be a valid ISO datetime string"),
	passed: z.boolean(),
	isBlocked: z.boolean().optional().default(false),
	riskLevel: z.enum(["CLEAR", "LOW", "MEDIUM", "HIGH", "BLOCKED"]),
	isPEP: z.boolean().optional().default(false),
	requiresEDD: z.boolean().optional().default(false),
	adverseMediaCount: z.number().int().nonnegative().optional().default(0),
	matchDetails: z.array(SanctionsMatchDetailSchema).optional().default([]),
	rawPayload: z.record(z.string(), z.unknown()).optional(),
});

// V1 compatibility schema for legacy payloads during rollout
export const ExternalSanctionsIngressCompatSchema = z.object({
	version: z.union([z.literal("v1"), z.undefined()]).optional(),
	workflowId: z.number().int().positive("workflowId must be a positive integer"),
	applicantId: z.number().int().positive("applicantId must be a positive integer"),
	provider: z.enum(SANCTIONS_PROVIDERS),
	externalCheckId: z.string().min(1, "externalCheckId is required for idempotency"),
	checkedAt: z.string().datetime("checkedAt must be a valid ISO datetime string"),
	passed: z.boolean(),
	// All other fields optional for backward compatibility
	isBlocked: z.boolean().optional().default(false),
	riskLevel: z.enum(["CLEAR", "LOW", "MEDIUM", "HIGH", "BLOCKED"]).optional(),
	isPEP: z.boolean().optional().default(false),
	requiresEDD: z.boolean().optional().default(false),
	adverseMediaCount: z.number().int().nonnegative().optional().default(0),
	matchDetails: z.array(SanctionsMatchDetailSchema).optional().default([]),
	rawPayload: z.record(z.string(), z.unknown()).optional(),
});

export type ExternalSanctionsIngress = z.infer<typeof ExternalSanctionsIngressSchema>;
export type ExternalSanctionsIngressCompat = z.infer<typeof ExternalSanctionsIngressCompatSchema>;

// ============================================
// Legacy Sanctions Event (kept for backward compat)
// ============================================

export const SanctionsEventSchema = z.object({
	applicantId: z.number().int().positive("applicantId must be a positive integer"),
	workflowId: z.number().int().positive("workflowId must be a positive integer"),
	source: z.enum(["pre_risk", "itc_main", "external_api"]),
	checkedAt: z.string().datetime("checkedAt must be a valid ISO datetime string"),
	riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
	isBlocked: z.boolean().optional(),
	passed: z.boolean(),
	isPEP: z.boolean().optional(),
	requiresEDD: z.boolean().optional(),
	adverseMediaCount: z.number().int().nonnegative().optional(),
	sanctionsResult: z.record(z.string(), z.unknown()).optional(),
});

export type SanctionsEventPayload = z.infer<typeof SanctionsEventSchema>;
