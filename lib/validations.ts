import { z } from "zod";

// ============================================
// Applicant Schemas
// ============================================

export const applicantStatusEnum = z.enum([
	"new",
	"contacted",
	"qualified",
	"proposal",
	"negotiation",
	"won",
	"lost",
]);

export const entityTypeEnum = z.enum([
	"company",
	"close_corporation",
	"proprietor",
	"partnership",
	"npo",
	"trust",
	"body_corporate",
	"other",
]);

export const productTypeEnum = z.enum([
	"standard",
	"premium_collections",
	"call_centre",
]);

export const createApplicantSchema = z.object({
	companyName: z.string().min(2, "Company name must be at least 2 characters"),
	contactName: z.string().min(2, "Contact name must be at least 2 characters"),
	email: z.string().email("Invalid email address"),
	phone: z.string().optional(),
	vatNumber: z
		.string()
		.regex(/^\d{10}$/, "VAT number must be exactly 10 digits")
		.optional()
		.or(z.literal("")),
	idNumber: z
		.string()
		.regex(/^\d{13}$/, "ID number must be exactly 13 digits")
		.optional()
		.or(z.literal("")),
	entityType: entityTypeEnum.optional(),
	productType: productTypeEnum.optional(),
	industry: z.string().optional(),
	employeeCount: z.number().int().positive().optional(),
	estimatedTransactionsPerMonth: z.coerce.number().int().min(0).optional(),
	notes: z.string().optional(),
});

export const updateApplicantSchema = createApplicantSchema.partial().extend({
	status: applicantStatusEnum.optional(),
});

export type CreateApplicantInput = z.infer<typeof createApplicantSchema>;
export type UpdateApplicantInput = z.infer<typeof updateApplicantSchema>;

// ============================================
// Workflow Schemas
// ============================================

export const workflowStageEnum = z.enum([
	"lead_capture",
	"dynamic_quotation",
	"verification",
	"integration",
]);

export const workflowStatusEnum = z.enum([
	"pending",
	"in_progress",
	"awaiting_human",
	"completed",
	"failed",
	"timeout",
]);

export const createWorkflowSchema = z.object({
	applicantId: z.number().int().positive("Applicant ID is required"),
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;

// ============================================
// external Callback Schemas
// ============================================

export const agentCallbackDecisionSchema = z.object({
	outcome: z.enum(["APPROVED", "REJECTED", "PENDING_INFO"]),
	manualOverrides: z
		.object({
			riskScore: z.number().optional(),
			note: z.string().optional(),
		})
		.optional(),
});

export const agentCallbackAuditSchema = z.object({
	humanActor: z.string().email(),
	timestamp: z.string().datetime(),
});

export const agentCallbackSchema = z.object({
	workflowId: z.string().or(z.number()),
	agentId: z.string().min(1, "Agent ID is required"),
	status: z.enum(["COMPLETED", "FAILED", "PENDING"]),
	decision: agentCallbackDecisionSchema.optional(),
	audit: agentCallbackAuditSchema.optional(),
});

export type agentCallbackInput = z.infer<typeof agentCallbackSchema>;

// ============================================
// Outgoing Webhook Payload Schema
// ============================================

export const dispatchPayloadSchema = z.object({
	eventId: z.string(),
	workflowId: z.string().or(z.number()),
	taskType: z.enum([
		"DOCUMENT_GENERATION",
		"ELECTRONIC_SIGNATURE",
		"RISK_VERIFICATION",
		"DATA_SYNC",
		"NOTIFICATION",
	]),
	payload: z.record(z.string(), z.unknown()),
	callbackUrl: z.string().url(),
});

export type DispatchPayload = z.infer<typeof dispatchPayloadSchema>;

// ============================================
// Agent Schemas
// ============================================

export const agentTaskTypeEnum = z.enum([
	"document_generation",
	"electronic_signature",
	"risk_verification",
	"data_sync",
	"notification",
]);

export const agentStatusEnum = z.enum(["active", "inactive", "error"]);

export const createAgentSchema = z.object({
	agentId: z.string().min(1, "Agent ID is required"),
	name: z.string().min(2, "Name is required"),
	description: z.string().optional(),
	webhookUrl: z.string().url().optional(),
	taskType: agentTaskTypeEnum,
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
