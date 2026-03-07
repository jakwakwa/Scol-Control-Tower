import { z } from "zod";

/**
 * Perimeter validation schemas for Control Tower Inngest events
 * Ensures strict schema parsing and prevents malformed payloads from
 * entering the workflow and causing downstream issues or AI hallucinations.
 */

// ============================================
// Onboarding Lead Created
// ============================================

export const LeadCreatedSchema = z.object({
	applicantId: z.number().int().positive("applicantId must be a positive integer"),
	workflowId: z.number().int().positive("workflowId must be a positive integer"),
	// Extend with other potential fields that might be passed in the onset of lead.created
	// Example: applicant email, name, etc. For now, strict as per existing base, but
	// can be expanded if additional properties are expected.
});

export type LeadCreatedPayload = z.infer<typeof LeadCreatedSchema>;

// ============================================
// External Sanctions Events
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
