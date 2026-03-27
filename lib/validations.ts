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

/** Mandate type values from dashboard applicant form Select */
export const dashboardApplicantMandateTypeEnum = z.enum([
	"debit_order",
	"eft_collection",
	"realtime_clearing",
	"managed_collection",
]);

const createApplicantBaseSchema = z.object({
	companyName: z.string().min(2, "Company name must be at least 2 characters"),
	registrationNumber: z.string().trim().optional().or(z.literal("")),
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
	mandateType: dashboardApplicantMandateTypeEnum.optional(),
	notes: z.string().optional(),
});

export const createApplicantSchema = createApplicantBaseSchema.superRefine((data, ctx) => {
	if (data.entityType === "proprietor") {
		const id = data.idNumber?.trim();
		if (!id) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "ID number is required for Proprietors",
				path: ["idNumber"],
			});
		} else if (!/^\d{13}$/.test(id)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "ID number must be exactly 13 digits",
				path: ["idNumber"],
			});
		}
	} else {
		const reg = data.registrationNumber?.trim();
		if (!reg) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Registration number is required for Companies",
				path: ["registrationNumber"],
			});
		}
		const id = data.idNumber?.trim();
		if (id && !/^\d{13}$/.test(id)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "ID number must be exactly 13 digits",
				path: ["idNumber"],
			});
		}
	}
});

export const updateApplicantSchema = createApplicantBaseSchema.partial().extend({
	status: applicantStatusEnum.optional(),
});

export type CreateApplicantInput = z.infer<typeof createApplicantBaseSchema>;
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
