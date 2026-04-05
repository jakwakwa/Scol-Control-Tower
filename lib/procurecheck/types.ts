import { z } from "zod";

// ============================================
// ProcureCheck API Response Schemas
// ============================================

export const AuthResponseSchema = z.union([
	z.string(),
	z
		.object({
			token: z.string().optional(),
			access_token: z.string().optional(),
			message: z.string().optional(),
		})
		.refine(d => Boolean(d.token || d.access_token), {
			message: "Response must contain either 'token' or 'access_token'",
		}),
]);

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const VendorCreateResponseSchema = z
	.object({
		ProcureCheckVendorID: z.string().optional(),
		vendor_Id: z.string().optional(),
		id: z.string().optional(),
		message: z.string().optional(),
	})
	.refine(d => Boolean(d.ProcureCheckVendorID || d.vendor_Id || d.id), {
		message: "Response must contain a vendor identifier",
	});

export type VendorCreateResponse = z.infer<typeof VendorCreateResponseSchema>;

const CheckCategoryStatusSchema = z.enum(["CLEARED", "FLAGGED", "PENDING"]);

const CheckCategorySummarySchema = z.object({
	Category: z.string(),
	Total: z.number(),
	Executed: z.number(),
	Outstanding: z.number(),
	Review: z.number(),
	Status: CheckCategoryStatusSchema,
});

const RiskSummarySchema = z.object({
	TotalChecks: z.number(),
	ExecutedChecks: z.number(),
	OutstandingChecks: z.number(),
	FailedChecks: z.number(),
	ReviewChecks: z.number(),
});

export const VendorSummaryResponseSchema = z.object({
	VendorID: z.string(),
	VendorName: z.string(),
	EntityNumber: z.string().optional().default(""),
	EntityType: z.string().optional().default(""),
	EntityStatus: z.string().optional().default(""),
	StartDate: z.string().optional().default(""),
	RegistrationDate: z.string().optional().default(""),
	TaxNumber: z.string().optional().default(""),
	WithdrawFromPublic: z.string().optional().default(""),
	PostalAddress: z.string().optional().default(""),
	RegisteredAddress: z.string().optional().default(""),
	RiskSummary: RiskSummarySchema,
	CheckCategories: z.array(CheckCategorySummarySchema),
});

export type VendorSummaryResponse = z.infer<typeof VendorSummaryResponseSchema>;

const CheckExecutionStatusSchema = z.enum(["EXECUTED", "REVIEW", "PENDING"]);
const CheckResultSchema = z.enum(["CLEARED", "FLAGGED", "UNKNOWN"]);

const CategoryCheckSchema = z.object({
	Name: z.string(),
	Status: CheckExecutionStatusSchema,
	Result: CheckResultSchema,
});

export const CategoryResultResponseSchema = z.object({
	Category: z.string(),
	Description: z.string().optional().default(""),
	Reviewed: z.boolean(),
	Checks: z.array(CategoryCheckSchema),
});

export type CategoryResultResponse = z.infer<typeof CategoryResultResponseSchema>;

export const VendorListResponseSchema = z.object({
	Data: z.array(z.record(z.string(), z.unknown())).optional(),
	TotalRecords: z.number().optional(),
});

export type VendorListResponse = z.infer<typeof VendorListResponseSchema>;

// ============================================
// API endpoint category keys
// ============================================

export const API_CATEGORY_ENDPOINTS = [
	"cipc",
	"property",
	"nonpreferred",
	"judgement",
	"safps",
	"persal",
] as const;

export type ApiCategoryEndpoint = (typeof API_CATEGORY_ENDPOINTS)[number];

// ============================================
// Internal Persistence Shape
// ============================================

export const PROCURECHECK_CATEGORY_IDS = [
	"cipc",
	"property",
	"restrictedList",
	"legal",
	"safps",
	"persal",
] as const;

export type ProcurementCategoryId = (typeof PROCURECHECK_CATEGORY_IDS)[number];

const ProcurementCheckItemSchema = z.object({
	name: z.string(),
	status: CheckExecutionStatusSchema,
	result: CheckResultSchema,
});

export type ProcurementCheckItem = z.infer<typeof ProcurementCheckItemSchema>;

const ProcurementCategorySchema = z.object({
	id: z.enum(PROCURECHECK_CATEGORY_IDS),
	description: z.string(),
	reviewed: z.boolean(),
	checks: z.array(ProcurementCheckItemSchema),
});

export type ProcurementCategory = z.infer<typeof ProcurementCategorySchema>;

const ProcurementVendorDetailSchema = z.object({
	name: z.string(),
	entityNumber: z.string(),
	entityType: z.string(),
	entityStatus: z.string(),
	startDate: z.string(),
	registrationDate: z.string(),
	taxNumber: z.string(),
	withdrawFromPublic: z.string(),
	postalAddress: z.string(),
	registeredAddress: z.string(),
});

export type ProcurementVendorDetail = z.infer<typeof ProcurementVendorDetailSchema>;

const CategorySummaryItemSchema = z.object({
	category: z.string(),
	outstanding: z.number(),
	total: z.number(),
	executed: z.number(),
	review: z.number(),
	status: CheckCategoryStatusSchema,
});

const ProcurementOverallSummarySchema = z.object({
	categories: z.array(CategorySummaryItemSchema),
});

export type ProcurementOverallSummary = z.infer<typeof ProcurementOverallSummarySchema>;

export const ProcurementDataSchema = z.object({
	vendorId: z.string(),
	vendor: ProcurementVendorDetailSchema,
	summary: ProcurementOverallSummarySchema,
	categories: z.array(ProcurementCategorySchema),
	checkedAt: z.string(),
	provider: z.literal("procurecheck"),
});

export type ProcurementData = z.infer<typeof ProcurementDataSchema>;

// ============================================
// Service-level result type
// ============================================

export interface ProcurementCheckResult {
	vendorId: string;
	payload: ProcurementData;
	rawPayload: Record<string, unknown>;
}

// ============================================
// API endpoint to internal category ID mapping
// ============================================

export const API_TO_INTERNAL_CATEGORY: Record<
	ApiCategoryEndpoint,
	ProcurementCategoryId
> = {
	cipc: "cipc",
	property: "property",
	nonpreferred: "restrictedList",
	judgement: "legal",
	safps: "safps",
	persal: "persal",
};

// ============================================
// Vendor creation params
// ============================================

export interface CreateVendorParams {
	vendorName: string;
	registrationNumber: string | null;
	entityType: string | null;
	idNumber: string | null;
	vatNumber: string | null;
	applicantId: number;
}
