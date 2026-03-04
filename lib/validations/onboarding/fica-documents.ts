/**
 * FICA & Support Documents Validation Schema
 * Category-driven checklist for required document uploads
 * Note: Using UK spelling throughout (e.g., organisation, authorisation)
 */
import { z } from "zod";

// ============================================
// Document Categories
// ============================================

export const DocumentCategory = {
	STANDARD: "standard",
	INDIVIDUAL: "individual",
	FINANCIAL: "financial",
	PROFESSIONAL: "professional",
	INDUSTRY: "industry",
} as const;

export type DocumentCategoryValue =
	(typeof DocumentCategory)[keyof typeof DocumentCategory];

// ============================================
// Document Types by Category
// ============================================

export const StandardDocumentType = {
	CIPC_REGISTRATION: "cipc_registration",
	TAX_CLEARANCE: "tax_clearance",
	VAT_REGISTRATION: "vat_registration",
	WEBSITE_DESCRIPTION: "website_description",
	SERVICE_DESCRIPTION: "service_description",
} as const;

export const IndividualDocumentType = {
	DIRECTOR_ID: "director_id",
	PROOF_OF_RESIDENCE: "proof_of_residence",
	BENEFICIAL_OWNER_ID: "beneficial_owner_id",
	BENEFICIAL_OWNER_RESIDENCE: "beneficial_owner_residence",
} as const;

export const FinancialDocumentType = {
	BANK_STATEMENT_MONTH_1: "bank_statement_month_1",
	BANK_STATEMENT_MONTH_2: "bank_statement_month_2",
	BANK_STATEMENT_MONTH_3: "bank_statement_month_3",
} as const;

export const ProfessionalDocumentType = {
	ACCOUNTING_OFFICER_LETTER: "accounting_officer_letter",
	AUDITOR_REPORT: "auditor_report",
} as const;

export const IndustryDocumentType = {
	FSCA_LICENCE: "fsca_licence",
	PSIRA_CERTIFICATE: "psira_certificate",
	NCR_REGISTRATION: "ncr_registration",
	NPO_CONSTITUTION: "npo_constitution",
	OTHER_REGULATORY: "other_regulatory",
} as const;

export type DocumentType =
	| (typeof StandardDocumentType)[keyof typeof StandardDocumentType]
	| (typeof IndividualDocumentType)[keyof typeof IndividualDocumentType]
	| (typeof FinancialDocumentType)[keyof typeof FinancialDocumentType]
	| (typeof ProfessionalDocumentType)[keyof typeof ProfessionalDocumentType]
	| (typeof IndustryDocumentType)[keyof typeof IndustryDocumentType];

// ============================================
// Document Upload Schema
// ============================================

export const documentUploadItemSchema = z.object({
	documentType: z.string().min(1, "Document type is required"),
	fileName: z.string().optional(),
	fileSize: z.number().optional(),
	mimeType: z.string().optional(),
	uploadId: z.string().optional(), // Reference to uploaded file
	isUploaded: z.boolean().default(false),
	notes: z.string().optional(),
	// For individual documents linked to specific people
	linkedPersonName: z.string().optional(),
	linkedPersonId: z.string().optional(),
});

export type DocumentUploadItem = z.infer<typeof documentUploadItemSchema>;

// ============================================
// Category Schemas
// ============================================

export const standardDocumentsSchema = z.object({
	cipcRegistration: documentUploadItemSchema.optional(),
	taxClearance: documentUploadItemSchema.optional(),
	vatRegistration: documentUploadItemSchema.optional(),
	websiteDescription: documentUploadItemSchema.optional(),
	serviceDescription: documentUploadItemSchema.optional(),
});

export const individualDocumentsSchema = z.object({
	// Dynamic array - one set per director/beneficial owner
	documents: z.array(
		z.object({
			personName: z.string().min(1, "Person name is required"),
			personRole: z.enum(["director", "beneficial_owner", "authorised_representative"]),
			idDocument: documentUploadItemSchema,
			proofOfResidence: documentUploadItemSchema,
		})
	),
});

export const financialDocumentsSchema = z.object({
	bankStatementMonth1: documentUploadItemSchema.refine(doc => doc.isUploaded, {
		message: "Bank statement (month 1) is required",
	}),
	bankStatementMonth2: documentUploadItemSchema.refine(doc => doc.isUploaded, {
		message: "Bank statement (month 2) is required",
	}),
	bankStatementMonth3: documentUploadItemSchema.refine(doc => doc.isUploaded, {
		message: "Bank statement (month 3) is required",
	}),
});

export const professionalDocumentsSchema = z.object({
	accountingOfficerLetter: documentUploadItemSchema.refine(doc => doc.isUploaded, {
		message: "Confirmation of Accounting Officer letter is required",
	}),
	auditorReport: documentUploadItemSchema.optional(),
});

export const industryDocumentsSchema = z.object({
	// These are conditional based on industry type
	applicableRegulations: z
		.array(
			z.enum([
				IndustryDocumentType.FSCA_LICENCE,
				IndustryDocumentType.PSIRA_CERTIFICATE,
				IndustryDocumentType.NCR_REGISTRATION,
				IndustryDocumentType.NPO_CONSTITUTION,
				IndustryDocumentType.OTHER_REGULATORY,
			])
		)
		.default([]),
	fscaLicence: documentUploadItemSchema.optional(),
	psiraCertificate: documentUploadItemSchema.optional(),
	ncrRegistration: documentUploadItemSchema.optional(),
	npoConstitution: documentUploadItemSchema.optional(),
	otherRegulatory: documentUploadItemSchema.optional(),
});

// ============================================
// Complete FICA Documents Schema
// ============================================

export const ficaDocumentsSchema = z.object({
	standard: standardDocumentsSchema,
	individual: individualDocumentsSchema,
	financial: financialDocumentsSchema,
	professional: professionalDocumentsSchema,
	industry: industryDocumentsSchema,
	acknowledgement: z.boolean().refine(val => val === true, {
		message: "You must acknowledge that all documents are authentic",
	}),
});

export type FicaDocumentsFormData = z.infer<typeof ficaDocumentsSchema>;

// ============================================
// Step-wise Schemas for Multi-step Form
// ============================================

export const ficaDocumentsSteps = {
	step1: standardDocumentsSchema,
	step2: individualDocumentsSchema,
	step3: financialDocumentsSchema,
	step4: professionalDocumentsSchema,
	step5: industryDocumentsSchema,
	step6: z.object({
		acknowledgement: z.boolean().refine(val => val === true, {
			message: "You must acknowledge that all documents are authentic",
		}),
	}),
};

export const FICA_DOCUMENTS_STEP_TITLES = [
	"Standard Documents",
	"Individual Documents",
	"Financial Documents",
	"Professional Documents",
	"Industry Documents",
	"Review & Acknowledgement",
] as const;

export const FICA_DOCUMENTS_TOTAL_STEPS = FICA_DOCUMENTS_STEP_TITLES.length;

// ============================================
// Document Requirement Configuration
// ============================================

export interface DocumentRequirement {
	type: DocumentType;
	label: string;
	description: string;
	category: DocumentCategoryValue;
	required: boolean;
	acceptedFormats: string[];
	maxSizeMb: number;
}

// ============================================
// FICA Comparison Output Schemas (AI Verification)
// ============================================

export const ficaComparisonFieldStatusSchema = z.enum([
	"match",
	"mismatch",
	"not_provided",
	"not_found",
	"uncertain",
]);

export const ficaComparisonFieldSchema = z.object({
	status: ficaComparisonFieldStatusSchema,
	expectedValue: z.string().optional(),
	foundValue: z.string().optional(),
	notes: z.string().optional(),
	confidence: z.number().min(0).max(100).optional(),
});

export const ficaFieldGroupSchema = z.object({
	accountHolderName: ficaComparisonFieldSchema.optional(),
	accountNumber: ficaComparisonFieldSchema.optional(),
	bankName: ficaComparisonFieldSchema.optional(),
	branchCode: ficaComparisonFieldSchema.optional(),
	idNumber: ficaComparisonFieldSchema.optional(),
	personName: ficaComparisonFieldSchema.optional(),
	companyName: ficaComparisonFieldSchema.optional(),
	tradingName: ficaComparisonFieldSchema.optional(),
	registrationNumber: ficaComparisonFieldSchema.optional(),
	address: ficaComparisonFieldSchema.optional(),
});

export const ficaComparisonSummarySchema = z.object({
	overallStatus: z.enum(["MATCHED", "PARTIAL_MATCH", "MISMATCHED", "INSUFFICIENT_DATA"]),
	mismatchCount: z.number().int().min(0),
	criticalMismatchCount: z.number().int().min(0),
	keyDiscrepancies: z.array(z.string()).default([]),
});

export const ficaComparisonResultSchema = z.object({
	documentType: z.string(),
	fields: ficaFieldGroupSchema.default({}),
	summary: ficaComparisonSummarySchema,
});

export type FicaComparisonResult = z.infer<typeof ficaComparisonResultSchema>;

export const DOCUMENT_REQUIREMENTS: DocumentRequirement[] = [
	// Standard
	{
		type: StandardDocumentType.CIPC_REGISTRATION,
		label: "CIPC Registration",
		description: "Company registration documents from CIPC",
		category: DocumentCategory.STANDARD,
		required: true,
		acceptedFormats: ["pdf", "jpg", "png"],
		maxSizeMb: 10,
	},
	{
		type: StandardDocumentType.TAX_CLEARANCE,
		label: "Tax Clearance Certificate",
		description: "Valid SARS tax clearance certificate",
		category: DocumentCategory.STANDARD,
		required: false,
		acceptedFormats: ["pdf"],
		maxSizeMb: 5,
	},
	{
		type: StandardDocumentType.VAT_REGISTRATION,
		label: "VAT Registration",
		description: "VAT registration certificate if applicable",
		category: DocumentCategory.STANDARD,
		required: false,
		acceptedFormats: ["pdf"],
		maxSizeMb: 5,
	},
	{
		type: StandardDocumentType.WEBSITE_DESCRIPTION,
		label: "Website/Service Description",
		description: "Description of your website and services offered",
		category: DocumentCategory.STANDARD,
		required: true,
		acceptedFormats: ["pdf", "doc", "docx"],
		maxSizeMb: 10,
	},
	// Individual
	{
		type: IndividualDocumentType.DIRECTOR_ID,
		label: "Director ID Copy",
		description: "Certified copy of director's ID document",
		category: DocumentCategory.INDIVIDUAL,
		required: true,
		acceptedFormats: ["pdf", "jpg", "png"],
		maxSizeMb: 5,
	},
	{
		type: IndividualDocumentType.PROOF_OF_RESIDENCE,
		label: "Proof of Residence",
		description: "Proof of residence not older than 3 months",
		category: DocumentCategory.INDIVIDUAL,
		required: true,
		acceptedFormats: ["pdf", "jpg", "png"],
		maxSizeMb: 5,
	},
	// Financial
	{
		type: FinancialDocumentType.BANK_STATEMENT_MONTH_1,
		label: "Bank Statement (Month 1)",
		description: "Most recent bank statement",
		category: DocumentCategory.FINANCIAL,
		required: true,
		acceptedFormats: ["pdf"],
		maxSizeMb: 10,
	},
	{
		type: FinancialDocumentType.BANK_STATEMENT_MONTH_2,
		label: "Bank Statement (Month 2)",
		description: "Second most recent bank statement",
		category: DocumentCategory.FINANCIAL,
		required: true,
		acceptedFormats: ["pdf"],
		maxSizeMb: 10,
	},
	{
		type: FinancialDocumentType.BANK_STATEMENT_MONTH_3,
		label: "Bank Statement (Month 3)",
		description: "Third most recent bank statement",
		category: DocumentCategory.FINANCIAL,
		required: true,
		acceptedFormats: ["pdf"],
		maxSizeMb: 10,
	},
	// Professional
	{
		type: ProfessionalDocumentType.ACCOUNTING_OFFICER_LETTER,
		label: "Confirmation of Accounting Officer Letter",
		description: "Letter on Auditor letterhead confirming accounting officer",
		category: DocumentCategory.PROFESSIONAL,
		required: true,
		acceptedFormats: ["pdf"],
		maxSizeMb: 5,
	},
	// Industry
	{
		type: IndustryDocumentType.FSCA_LICENCE,
		label: "FSCA Licence",
		description: "Financial Sector Conduct Authority licence (for insurance)",
		category: DocumentCategory.INDUSTRY,
		required: false,
		acceptedFormats: ["pdf"],
		maxSizeMb: 5,
	},
	{
		type: IndustryDocumentType.PSIRA_CERTIFICATE,
		label: "PSIRA Certificate",
		description: "Private Security Industry Regulatory Authority certificate",
		category: DocumentCategory.INDUSTRY,
		required: false,
		acceptedFormats: ["pdf"],
		maxSizeMb: 5,
	},
	{
		type: IndustryDocumentType.NCR_REGISTRATION,
		label: "NCR Registration",
		description: "National Credit Regulator registration (for loans)",
		category: DocumentCategory.INDUSTRY,
		required: false,
		acceptedFormats: ["pdf"],
		maxSizeMb: 5,
	},
	{
		type: IndustryDocumentType.NPO_CONSTITUTION,
		label: "NPO Constitution",
		description: "Non-Profit Organisation constitution document",
		category: DocumentCategory.INDUSTRY,
		required: false,
		acceptedFormats: ["pdf"],
		maxSizeMb: 10,
	},
];

// ============================================
// Default Values Helper
// ============================================

export const getFicaDocumentsDefaultValues = (): Partial<FicaDocumentsFormData> => ({
	standard: {
		cipcRegistration: {
			documentType: StandardDocumentType.CIPC_REGISTRATION,
			isUploaded: false,
		},
		taxClearance: {
			documentType: StandardDocumentType.TAX_CLEARANCE,
			isUploaded: false,
		},
		vatRegistration: {
			documentType: StandardDocumentType.VAT_REGISTRATION,
			isUploaded: false,
		},
		websiteDescription: {
			documentType: StandardDocumentType.WEBSITE_DESCRIPTION,
			isUploaded: false,
		},
		serviceDescription: {
			documentType: StandardDocumentType.SERVICE_DESCRIPTION,
			isUploaded: false,
		},
	},
	individual: {
		documents: [],
	},
	financial: {
		bankStatementMonth1: {
			documentType: FinancialDocumentType.BANK_STATEMENT_MONTH_1,
			isUploaded: false,
		},
		bankStatementMonth2: {
			documentType: FinancialDocumentType.BANK_STATEMENT_MONTH_2,
			isUploaded: false,
		},
		bankStatementMonth3: {
			documentType: FinancialDocumentType.BANK_STATEMENT_MONTH_3,
			isUploaded: false,
		},
	},
	professional: {
		accountingOfficerLetter: {
			documentType: ProfessionalDocumentType.ACCOUNTING_OFFICER_LETTER,
			isUploaded: false,
		},
		auditorReport: {
			documentType: ProfessionalDocumentType.AUDITOR_REPORT,
			isUploaded: false,
		},
	},
	industry: {
		applicableRegulations: [],
		fscaLicence: {
			documentType: IndustryDocumentType.FSCA_LICENCE,
			isUploaded: false,
		},
		psiraCertificate: {
			documentType: IndustryDocumentType.PSIRA_CERTIFICATE,
			isUploaded: false,
		},
		ncrRegistration: {
			documentType: IndustryDocumentType.NCR_REGISTRATION,
			isUploaded: false,
		},
		npoConstitution: {
			documentType: IndustryDocumentType.NPO_CONSTITUTION,
			isUploaded: false,
		},
		otherRegulatory: {
			documentType: IndustryDocumentType.OTHER_REGULATORY,
			isUploaded: false,
		},
	},
	acknowledgement: false,
});
