/**
 * StratCol Domain Types
 *
 * Core business domain models for the StratCol Risk Management Platform.
 * These types represent the data structures used in PASA-approved
 * debit order mandate processing across Southern African nations.
 */
import { z } from "zod";

// ============================================
// Mandate Types (PASA-Approved Payment Methods)
// ============================================

/**
 * PASA-approved mandate types for debit order processing
 * - EFT: Electronic Funds Transfer (batch processing)
 * - NAEDO: Non-Authenticated Early Debit Order
 * - DEBICHECK: Real-time authenticated debit order
 * - AVSR: All Value Same Day (same-day settlement)
 */
export const MandateTypeSchema = z.enum(["EFT", "NAEDO", "DEBICHECK", "AVSR"]);

export type MandateType = z.infer<typeof MandateTypeSchema>;

export const MANDATE_TYPE_LABELS: Record<MandateType, string> = {
	EFT: "Electronic Funds Transfer",
	NAEDO: "Non-Authenticated Early Debit Order",
	DEBICHECK: "DebiCheck (Authenticated)",
	AVSR: "All Value Same Day",
};

// ============================================
// Form & Document Types
// ============================================

export const FormTypeSchema = z.enum([
	"FACILITY_APPLICATION",
	"SIGNED_QUOTATION",
	"STRATCOL_CONTRACT",
	"ABSA_6995",
	"DOCUMENT_UPLOADS",
	"ACCOUNTANT_LETTER",
	"CALL_CENTRE_APPLICATION",
]);

export type FormType = z.infer<typeof FormTypeSchema>;

export const FormInstanceStatusSchema = z.enum([
	"pending",
	"sent",
	"viewed",
	"submitted",
	"expired",
	"revoked",
]);

export type FormInstanceStatus = z.infer<typeof FormInstanceStatusSchema>;

export const FormDecisionOutcomeSchema = z.enum(["APPROVED", "DECLINED"]);
export type FormDecisionOutcome = z.infer<typeof FormDecisionOutcomeSchema>;

export const DecisionEnabledFormTypeSchema = z.enum([
	"SIGNED_QUOTATION",
	"STRATCOL_CONTRACT",
	"CALL_CENTRE_APPLICATION",
]);
export type DecisionEnabledFormType = z.infer<typeof DecisionEnabledFormTypeSchema>;

export const DocumentCategorySchema = z.enum([
	"standard_application",
	"fica_entity",
	"fica_individual",
	"fica_business",
	"product_specific",
	"industry_specific",
	"risk_based",
	"other",
	// Mandate document categories (from document-requirements.service)
	"IDENTITY",
	"ADDRESS",
	"FINANCIAL",
	"ENTITY",
	"GOVERNANCE",
	"REGULATORY",
]);

export type DocumentCategory = z.infer<typeof DocumentCategorySchema>;

export const DocumentSourceSchema = z.enum(["client", "agent", "internal", "system"]);

export type DocumentSource = z.infer<typeof DocumentSourceSchema>;

export const DocumentTypeSchema = z.enum([
	"BANK_STATEMENT",
	"ACCOUNTANT_LETTER",
	"ID_DOCUMENT",
	"PROOF_OF_ADDRESS",
	"INVOICE",
	"EXISTING_MANDATE",
	"BANK_GUARANTEE",
	"COMPANY_REGISTRATION",
	"TRUST_DEED",
	"NPO_CERTIFICATE",
	"TAX_VAT",
	"SERVICE_DESCRIPTION",
	"WEBSITE_LINK",
	"DIRECTOR_ID",
	"PROOF_OF_RESIDENCE",
	"BUSINESS_PREMISES_PROOF",
	"PROPRIETOR_ID",
	"PROPRIETOR_RESIDENCE",
	"BANK_STATEMENT_3_MONTH",
	"ACCOUNTING_OFFICER_LETTER",
	"THIRD_PARTY_CONFIRMATION_LETTER",
	"INTERMEDIARY_AGREEMENT",
	"COLMS_APPLICATION",
	"SERVICE_AGREEMENT",
	"PRODUCT_DESCRIPTION",
	"SUPPLIER_CONTACT_INFO",
	"CALL_SCRIPT",
	"NPO_CONSTITUTION",
	"NPO_RESOLUTION",
	"NPO_BOARD_LIST",
	"TRUST_LETTER_OF_AUTHORITY",
	"TRUST_BENEFICIARY_IDS",
	"TRUST_BENEFICIARY_ADDRESSES",
	"TRUST_ORGANOGRAM",
	"BODY_CORPORATE_RESOLUTION",
	"BODY_CORPORATE_BOARD_LIST",
	"INSURANCE_FSCA_CERT",
	"SECURITY_PSIRA_CERT",
	"FIC_REGISTRATION",
	"NCR_CERTIFICATE",
	"INSTRUCTION_LETTER_CHANGES",
	"SALES_AGREEMENT",
	"FINANCIAL_STATEMENTS",
	"CONSENT_FORM",
]);

export type DocumentType = z.infer<typeof DocumentTypeSchema>;

// ============================================
// Director Information
// ============================================

export const DirectorInfoSchema = z.object({
	/** Director's full legal name */
	fullName: z.string().min(2, "Director name is required"),
	/** South African ID Number (13 digits) */
	idNumber: z
		.string()
		.regex(/^\d{13}$/, "ID number must be 13 digits")
		.optional(),
	/** Passport number (for foreign directors) */
	passportNumber: z.string().optional(),
	/** Country of citizenship (ISO 3166-1 alpha-2) */
	nationality: z.string().length(2).default("ZA"),
	/** Stake/ownership percentage (0-100) */
	stakePercentage: z.number().min(0).max(100).optional(),
	/** Director role */
	role: z
		.enum(["DIRECTOR", "MANAGING_DIRECTOR", "CEO", "CFO", "SHAREHOLDER"])
		.default("DIRECTOR"),
	/** Email address */
	email: z.string().email().optional(),
	/** Mobile phone number */
	phone: z.string().optional(),
});

export type DirectorInfo = z.infer<typeof DirectorInfoSchema>;

// ============================================
// Facility Application
// ============================================

/**
 * Facility Application - The core document for client onboarding
 * Contains all company and mandate details needed for PASA registration
 */
export const FacilityApplicationSchema = z.object({
	/** Unique application ID */
	applicationId: z.string().uuid().optional(),

	// Company Information
	/** Registered company name */
	companyName: z.string().min(2, "Company name is required"),
	/** Trading name (if different from registered name) */
	tradingName: z.string().optional(),
	/** CIPC Registration Number */
	registrationNumber: z
		.string()
		.regex(
			/^\d{4}\/\d{6}\/\d{2}$/,
			"Registration format: YYYY/NNNNNN/07 (e.g., 2020/123456/07)"
		)
		.optional(),
	/** VAT Registration Number */
	vatNumber: z
		.string()
		.regex(/^\d{10}$/, "VAT number must be 10 digits")
		.optional(),
	/** Company Tax Number */
	taxNumber: z.string().optional(),

	// Physical Address
	physicalAddress: z
		.object({
			street: z.string(),
			suburb: z.string().optional(),
			city: z.string(),
			province: z.string(),
			postalCode: z.string(),
			country: z.string().default("South Africa"),
		})
		.optional(),

	// Postal Address
	postalAddress: z
		.object({
			line1: z.string(),
			line2: z.string().optional(),
			city: z.string(),
			postalCode: z.string(),
		})
		.optional(),

	// Contact Information
	/** Primary contact person */
	primaryContact: z.object({
		name: z.string(),
		email: z.string().email(),
		phone: z.string(),
		designation: z.string().optional(),
	}),

	// Directors
	directors: z.array(DirectorInfoSchema).min(1, "At least one director required"),

	// Mandate Details
	/** Selected mandate type */
	mandateType: MandateTypeSchema,
	/** Estimated monthly transaction volume */
	estimatedMonthlyVolume: z.number().int().positive(),
	/** Average transaction value in cents */
	averageTransactionValue: z.number().int().positive().optional(),
	/** Industry classification */
	industry: z.string().optional(),

	// Banking Details (for collections)
	bankingDetails: z
		.object({
			bankName: z.string(),
			branchCode: z.string(),
			accountNumber: z.string(),
			accountType: z.enum(["CURRENT", "SAVINGS", "TRANSMISSION"]),
			accountHolderName: z.string(),
		})
		.optional(),

	// Timestamps
	createdAt: z.date().optional(),
	submittedAt: z.date().optional(),
	approvedAt: z.date().optional(),
});

export type FacilityApplication = z.infer<typeof FacilityApplicationSchema>;

// ============================================
// ITC Credit Check
// ============================================

/**
 * ITC Credit Bureau check result
 */
export const ITCCheckResultSchema = z.object({
	/** Credit score (0-999) */
	creditScore: z.number().int().min(0).max(999),
	/** Risk classification */
	riskCategory: z.enum(["LOW", "MEDIUM", "HIGH", "VERY_HIGH"]),
	/** Whether the check passed automatic thresholds */
	passed: z.boolean(),
	/** Recommended action based on score */
	recommendation: z.enum([
		"AUTO_APPROVE",
		"MANUAL_REVIEW",
		"AUTO_DECLINE",
		"ENHANCED_DUE_DILIGENCE",
	]),
	/** Negative listings found */
	adverseListings: z
		.array(
			z.object({
				type: z.string(),
				amount: z.number().optional(),
				date: z.string().optional(),
				creditor: z.string().optional(),
			})
		)
		.optional(),
	/** Check timestamp */
	checkedAt: z.date(),
	/** Bureau reference number */
	referenceNumber: z.string().optional(),
	/** Raw response for audit */
	rawResponse: z.unknown().optional(),
});

export type ITCCheckResult = z.infer<typeof ITCCheckResultSchema>;

// ITC Score thresholds (adjusted for Mockaroo 0-400 range)
export const ITC_THRESHOLDS = {
	AUTO_APPROVE: 350, // Score >= 350: Fast-track approval
	MANUAL_REVIEW: 200, // Score 200-349: Manual review required
	AUTO_DECLINE: 100, // Score < 100: Automatic decline
} as const;

// ============================================
// FICA Document Analysis (AI Output)
// ============================================

/**
 * Risk flags identified in FICA documents
 */
export const FicaRiskFlagSchema = z.object({
	/** Flag type identifier */
	type: z.enum([
		"BOUNCED_DEBIT",
		"INSUFFICIENT_FUNDS",
		"IRREGULAR_DEPOSITS",
		"CASH_INTENSIVE",
		"HIGH_VALUE_TRANSFER",
		"GAMBLING_TRANSACTIONS",
		"LOAN_SHARK_INDICATORS",
		"ACCOUNT_DORMANCY",
		"NAME_MISMATCH",
		"ADDRESS_DISCREPANCY",
		"SUSPICIOUS_PATTERN",
	]),
	/** Severity level */
	severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
	/** Human-readable description */
	description: z.string(),
	/** Specific evidence or example */
	evidence: z.string().optional(),
	/** Date range affected */
	dateRange: z
		.object({
			from: z.string(),
			to: z.string(),
		})
		.optional(),
	/** Monetary value if applicable (in cents) */
	amount: z.number().optional(),
});

export type FicaRiskFlag = z.infer<typeof FicaRiskFlagSchema>;

/**
 * FICA Document Analysis - Structured AI output for bank statement analysis
 * Used with Vercel AI SDK generateObject() to extract structured data
 */
export const FicaDocumentAnalysisSchema = z.object({
	// Account Information (extracted from bank statement)
	/** Account holder name as shown on statement */
	accountHolderName: z.string(),
	/** Bank account number */
	accountNumber: z.string(),
	/** Bank name */
	bankName: z.string().optional(),
	/** Branch code */
	branchCode: z.string().optional(),
	/** Account type */
	accountType: z.string().optional(),

	// Statement Period
	/** Statement start date */
	periodStart: z.string(),
	/** Statement end date */
	periodEnd: z.string(),

	// Financial Metrics
	/** Opening balance in cents */
	openingBalance: z.number(),
	/** Closing balance in cents */
	closingBalance: z.number(),
	/** Average daily balance in cents */
	averageDailyBalance: z.number(),
	/** Total credits (deposits) in cents */
	totalCredits: z.number(),
	/** Total debits (withdrawals) in cents */
	totalDebits: z.number(),
	/** Number of dishonoured/bounced transactions */
	dishonours: z.number().int().min(0),

	// Cash Flow Analysis
	/** Monthly income regularity assessment */
	incomeRegularity: z.enum(["REGULAR", "IRREGULAR", "HIGHLY_VARIABLE"]),
	/** Primary income source identified */
	primaryIncomeSource: z.string().optional(),
	/** Cash flow consistency score (0-100) */
	cashFlowScore: z.number().min(0).max(100),

	// Risk Assessment
	/** Identified risk flags */
	riskFlags: z.array(FicaRiskFlagSchema),
	/** Overall AI trust score (0-100) */
	aiTrustScore: z.number().min(0).max(100),
	/** AI confidence in analysis (0-100) */
	analysisConfidence: z.number().min(0).max(100),

	// Verification Status
	/** Does account holder match facility application? */
	nameMatchVerified: z.boolean(),
	/** Does account number match provided details? */
	accountMatchVerified: z.boolean(),

	// AI Commentary
	/** AI-generated summary of findings */
	summary: z.string(),
	/** Recommended action */
	recommendation: z.enum([
		"APPROVE",
		"APPROVE_WITH_CONDITIONS",
		"MANUAL_REVIEW",
		"REQUEST_ADDITIONAL_DOCS",
		"DECLINE",
	]),
	/** Detailed reasoning for recommendation */
	reasoning: z.string(),
});

export type FicaDocumentAnalysis = z.infer<typeof FicaDocumentAnalysisSchema>;

// AI Trust Score thresholds
export const AI_TRUST_THRESHOLDS = {
	AUTO_APPROVE: 80, // Score >= 80: Auto-approve
	MANUAL_REVIEW: 50, // Score 50-79: Risk Manager review
	AUTO_DECLINE: 50, // Score < 50: Likely decline (still human reviewed)
} as const;

// ============================================
// Accountant Letter Analysis
// ============================================

export const AccountantLetterAnalysisSchema = z.object({
	/** Accounting firm/practitioner name */
	practitionerName: z.string(),
	/** Practice registration number */
	practiceNumber: z.string().optional(),
	/** Letter date */
	letterDate: z.string(),
	/** Client name mentioned */
	clientName: z.string(),
	/** Is letterhead authentic-looking? */
	letterheadAuthentic: z.boolean(),
	/** Business standing assessment */
	businessStanding: z.enum(["GOOD", "FAIR", "POOR", "UNKNOWN"]),
	/** Annual turnover mentioned (in cents) */
	annualTurnover: z.number().optional(),
	/** Years in business */
	yearsInBusiness: z.number().optional(),
	/** Any concerns noted */
	concerns: z.array(z.string()),
	/** Verification status */
	verified: z.boolean(),
	/** AI confidence score */
	confidence: z.number().min(0).max(100),
});

export type AccountantLetterAnalysis = z.infer<typeof AccountantLetterAnalysisSchema>;

// ============================================
// V24 Integration Types
// ============================================

/**
 * V24 Client Profile - Data structure for V24 core system injection
 */
export const V24ClientProfileSchema = z.object({
	/** Client reference (internal ID) */
	clientRef: z.string(),
	/** Company name */
	companyName: z.string(),
	/** Registration number */
	registrationNumber: z.string().optional(),
	/** VAT number */
	vatNumber: z.string().optional(),
	/** Primary contact */
	contact: z.object({
		name: z.string(),
		email: z.string().email(),
		phone: z.string(),
	}),
	/** Approved mandate type */
	mandateType: MandateTypeSchema,
	/** Approved monthly volume limit */
	volumeLimit: z.number(),
	/** Fee structure */
	feeStructure: z.object({
		baseFeePercent: z.number(), // Basis points
		transactionFee: z.number().optional(), // Cents per transaction
		minimumMonthlyFee: z.number().optional(), // Cents
	}),
	/** Banking details for collections */
	bankingDetails: z.object({
		bankName: z.string(),
		branchCode: z.string(),
		accountNumber: z.string(),
		accountType: z.string(),
	}),
	/** Activation date */
	activationDate: z.date(),
	/** Assigned account manager */
	accountManager: z.string().optional(),
});

export type V24ClientProfile = z.infer<typeof V24ClientProfileSchema>;

/**
 * V24 API Response
 */
export const V24ResponseSchema = z.object({
	success: z.boolean(),
	clientId: z.string().optional(),
	v24Reference: z.string().optional(),
	message: z.string().optional(),
	error: z.string().optional(),
});

export type V24Response = z.infer<typeof V24ResponseSchema>;

// ============================================
// Training Session
// ============================================

export const TrainingSessionSchema = z.object({
	sessionId: z.string().uuid(),
	clientEmail: z.string().email(),
	scheduledDate: z.date(),
	duration: z.number().default(60), // minutes
	type: z.enum(["ONBOARDING", "ADVANCED", "REFRESHER"]).default("ONBOARDING"),
	meetingLink: z.string().url().optional(),
	status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
});

export type TrainingSession = z.infer<typeof TrainingSessionSchema>;

// ============================================
// Workflow Context Types
// ============================================

/**
 * Combined workflow context passed through the saga
 */
export interface OnboardingWorkflowContext {
	applicantId: number;
	workflowId: number;
	facilityApplication?: FacilityApplication;
	itcResult?: ITCCheckResult;
	ficaAnalysis?: FicaDocumentAnalysis;
	accountantAnalysis?: AccountantLetterAnalysis;
	riskDecision?: {
		outcome: "APPROVED" | "REJECTED";
		decidedBy: string;
		decidedAt: Date;
		reason?: string;
	};
	v24Result?: V24Response;
}
