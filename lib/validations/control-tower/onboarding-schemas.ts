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

export const LeadCreatedSchema = z.object({
	applicantId: z.number().int().positive("applicantId must be a positive integer"),
	workflowId: z.number().int().positive("workflowId must be a positive integer"),
});

export type LeadCreatedPayload = z.infer<typeof LeadCreatedSchema>;

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

export const ExternalSanctionsIngressSchema = z.object({
	workflowId: z.number().int().positive("workflowId must be a positive integer"),
	applicantId: z.number().int().positive("applicantId must be a positive integer"),
	provider: z.enum(SANCTIONS_PROVIDERS),
	externalCheckId: z.string().min(1, "externalCheckId is required for idempotency"),
	checkedAt: z.string().datetime("checkedAt must be a valid ISO datetime string"),
	passed: z.boolean(),
	isBlocked: z.boolean().optional().default(false),
	riskLevel: z.enum(["CLEAR", "LOW", "MEDIUM", "HIGH", "BLOCKED"]).optional(),
	isPEP: z.boolean().optional().default(false),
	requiresEDD: z.boolean().optional().default(false),
	adverseMediaCount: z.number().int().nonnegative().optional().default(0),
	matchDetails: z.array(SanctionsMatchDetailSchema).optional().default([]),
	rawPayload: z.record(z.string(), z.unknown()).optional(),
});

export type ExternalSanctionsIngress = z.infer<typeof ExternalSanctionsIngressSchema>;

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
