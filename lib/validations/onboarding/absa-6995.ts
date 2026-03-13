/**
 * Absa 6995 User Pre-screening Assessment Validation Schema
 * Mandatory assessment for collection facilities
 * Note: Using UK spelling throughout (e.g., authorisation, organisation, centre)
 *
 * Based on the SOP:
 * - Directors merged from Section A and Section C into single dynamic array
 * - References as fixed array of 5 objects
 * - Booleans for Yes/No fields
 * - Enums for Application Type
 */
import { z } from "zod";
import {
	addressSchema,
	directorSchema,
	referenceSchema,
	phoneNumberSchema,
	emailSchema,
	websiteSchema,
	registrationNumberSchema,
	percentageSchema,
	signatureSchema,
	optionalString,
} from "./common";

// ============================================
// Application Type Enum
// ============================================

export const ApplicationType = {
	EFT: "eft",
	DEBICHECK: "debicheck",
	ABSAPAY: "absapay",
	PAYMENTS: "payments",
	NEW_TPPP: "new_tppp",
	PAYSHAP: "payshap",
	RM: "rm",
} as const;

export type ApplicationTypeValue = (typeof ApplicationType)[keyof typeof ApplicationType];

// ============================================
// Sales Distribution Enum
// ============================================

export const SalesDistribution = {
	DIRECT_SALES: "direct_sales",
	CALL_CENTRE: "call_centre",
	NETWORK_MARKETING: "network_marketing",
	FACE_TO_FACE: "face_to_face",
} as const;

export type SalesDistributionValue =
	(typeof SalesDistribution)[keyof typeof SalesDistribution];

// ============================================
// Exit Reason Enum
// ============================================

export const ExitReason = {
	DEBITING_WITHOUT_MANDATE: "debiting_without_mandate",
	DEBITING_WITHOUT_CONSENT: "debiting_without_consent",
	OTHER: "other",
} as const;

export type ExitReasonValue = (typeof ExitReason)[keyof typeof ExitReason];

// ============================================
// Section A: Applicant Details Schema
// ============================================

// 1. Applicant's Details
export const applicantDetailsSchema = z.object({
	ultimateCreditorName: z.string().min(1, "Name of the Ultimate Creditor is required"),
	preferredShortName: z.string().min(1, "Preferred abbreviated short name is required"),
	alternativeShortNames: z.object({
		alternative1: z.string().min(1, "Alternative short name 1 is required"),
		alternative2: z.string().min(1, "Alternative short name 2 is required"),
		alternative3: z.string().min(1, "Alternative short name 3 is required"),
		alternative4: z.string().min(1, "Alternative short name 4 is required"),
	}),
	natureOfBusiness: optionalString(),
	companyRegistrationNumber: registrationNumberSchema,
});

// 2. Application Type
export const applicationTypeSchema = z.object({
	applicationTypes: z
		.array(
			z.enum([
				ApplicationType.EFT,
				ApplicationType.DEBICHECK,
				ApplicationType.ABSAPAY,
				ApplicationType.PAYMENTS,
				ApplicationType.NEW_TPPP,
				ApplicationType.PAYSHAP,
				ApplicationType.RM,
			])
		)
		.min(1, "Please select at least one application type"),
});

// 3. Directors Details (merged from Section A and Section C)
export const directorsSchema = z.object({
	directors: z
		.array(directorSchema)
		.min(3, "At least 3 directors are required")
		.max(10, "Maximum 10 directors allowed"),
});

// 4. Contact Details
export const contactDetailsSchema = z.object({
	physicalAddress: addressSchema,
	cipcRegisteredAddress: addressSchema,
	telephoneNumber: phoneNumberSchema,
	emailAddress: emailSchema,
	websiteAddress: websiteSchema,
});

// 5. Banking Details
export const bankingDetailsAbsaSchema = z.object({
	bankName: optionalString(),
	accountType: optionalString(),
	branchCode: z
		.string()
		.optional()
		.refine(val => !val || /^\d{6}$/.test(val), {
			message: "Branch code must be 6 digits",
		}),
	accountNumber: z
		.string()
		.optional()
		.refine(val => !val || /^\d{6,16}$/.test(val), {
			message: "Account number must be between 6 and 16 digits",
		}),
	sourceOfIncome: optionalString(),
});

// 6. Collection History & Sales
export const collectionHistorySchema = z.object({
	salesDistribution: z
		.array(
			z.enum([
				SalesDistribution.DIRECT_SALES,
				SalesDistribution.CALL_CENTRE,
				SalesDistribution.NETWORK_MARKETING,
				SalesDistribution.FACE_TO_FACE,
			])
		)
		.default([]),
	isNewToCollections: z.boolean().default(false),
	hasPastCollections: z.boolean(),
	pastCollectionProduct: optionalString(),
	previousShortName: optionalString(),
	collectingBureau: optionalString(),
});

// Combined Section A Schema
export const sectionASchema = z.object({
	applicantDetails: applicantDetailsSchema,
	applicationTypes: applicationTypeSchema,
	directors: directorsSchema,
	contactDetails: contactDetailsSchema,
	bankingDetails: bankingDetailsAbsaSchema,
	collectionHistory: collectionHistorySchema,
});

export type SectionA = z.infer<typeof sectionASchema>;

// ============================================
// Page 2: Compliance & History Schema
// ============================================

// Previous History
export const previousHistorySchema = z.object({
	previousSponsoringBank: optionalString(),
	hasBeenExited: z.boolean(),
	exitReasons: z
		.array(
			z.enum([
				ExitReason.DEBITING_WITHOUT_MANDATE,
				ExitReason.DEBITING_WITHOUT_CONSENT,
				ExitReason.OTHER,
			])
		)
		.default([]),
	exitReasonOther: optionalString(),
});

// References (fixed array of 5)
export const referencesSchema = z.object({
	references: z.tuple([
		referenceSchema,
		referenceSchema,
		referenceSchema,
		referenceSchema,
		referenceSchema,
	]),
});

// Ratios & Metrics
export const ratiosAndMetricsSchema = z.object({
	averageDisputeRatio: percentageSchema("Average Dispute Ratio"),
	averageUnpaidRatio: percentageSchema("Average Unpaid Ratio"),
});

// Business Metrics
export const businessMetricsSchema = z.object({
	salesEmployeesCount: optionalString(),
	averageDebitOrderValue: optionalString(),
	presentBookSize: optionalString(),
	businessOperationLength: optionalString(),
	isPresentlySponsored: z.boolean().default(false),
	sponsoringBankName: optionalString(),
	sponsorshipPeriodYears: optionalString(),
	sponsorshipPeriodMonths: optionalString(),
	hasLitigationPending: z.boolean().default(false),
	hasDirectorsUnderAdministration: z.boolean().default(false),
	hasFormalComplaints: z.boolean().default(false),
	hasComplianceConcerns: z.boolean().default(false),
});

// Combined Compliance Schema
export const complianceHistorySchema = z.object({
	previousHistory: previousHistorySchema,
	references: referencesSchema,
	ratiosAndMetrics: ratiosAndMetricsSchema,
	businessMetrics: businessMetricsSchema,
});

export type ComplianceHistory = z.infer<typeof complianceHistorySchema>;

// ============================================
// Section B: Bureau Details Schema
// ============================================

export const bureauDetailsSchema = z.object({
	isApplicable: z.boolean().default(false),
	bureauName: optionalString(),
	ldCode: optionalString(),
	bureauCif: optionalString(),
});

export type BureauDetails = z.infer<typeof bureauDetailsSchema>;

// ============================================
// Section C: Declarations & Warranties Schema
// ============================================

// Document Checklist
export const documentChecklistSchema = z.object({
	directorsIds: z.boolean().default(false),
	proofOfBusinessAddress: z.boolean().default(false),
	bankStatements: z.boolean().default(false),
	cipcDocuments: z.boolean().default(false),
	regulatedIndustryCertificates: z.boolean().default(false),
	clientMandates: z.boolean().default(false),
	marketingMaterial: z.boolean().default(false),
});

// Declarations
export const declarationsSchema = z.object({
	informationTrueAndCorrect: z.boolean().refine(val => val === true, {
		message: "You must confirm the information is true and correct",
	}),
	misrepresentationAcknowledgement: z.boolean().refine(val => val === true, {
		message: "You must acknowledge the misrepresentation clause",
	}),
	debitingConsentAcknowledgement: z.boolean().refine(val => val === true, {
		message: "You must acknowledge the debiting consent clause",
	}),
	personalInfoProcessingConsent: z.boolean().refine(val => val === true, {
		message: "You must consent to personal information processing",
	}),
	infoSharingUnderstanding: z.boolean().refine(val => val === true, {
		message: "You must acknowledge the information sharing clause",
	}),
	tpppConsentWarranty: z.boolean().default(false),
	ultimateCreditorInfoWarranty: z.boolean().default(false),
});

// Signatures
export const signaturesAbsaSchema = z.object({
	clientSignature: signatureSchema,
	tpppOfficialName: optionalString(),
	tpppOfficialSignature: z.object({
		name: z.string().optional(),
		signature: z.string().optional(),
		date: z.string().optional(),
	}),
});

// Combined Section C Schema
export const sectionCSchema = z.object({
	documentChecklist: documentChecklistSchema,
	declarations: declarationsSchema,
	signatures: signaturesAbsaSchema,
});

export type SectionC = z.infer<typeof sectionCSchema>;

// ============================================
// Complete Absa 6995 Schema
// ============================================

export const absa6995Schema = z.object({
	sectionA: sectionASchema,
	complianceHistory: complianceHistorySchema,
	bureauDetails: bureauDetailsSchema,
	sectionC: sectionCSchema,
});

export type Absa6995FormData = z.infer<typeof absa6995Schema>;

// ============================================
// Step-wise Schemas for Multi-step Form
// ============================================

export const absa6995Steps = {
	// Group 1: Entity Details
	step1: z.object({
		applicantDetails: applicantDetailsSchema,
		applicationTypes: applicationTypeSchema,
	}),
	// Group 1 continued: Directors & Contact
	step2: z.object({
		directors: directorsSchema,
		contactDetails: contactDetailsSchema,
	}),
	// Group 2: Banking & Collection
	step3: z.object({
		bankingDetails: bankingDetailsAbsaSchema,
		collectionHistory: collectionHistorySchema,
	}),
	// Group 3: Compliance (Page 2)
	step4: complianceHistorySchema,
	// Bureau Details (conditional)
	step5: bureauDetailsSchema,
	// Group 4: Legal (Section C)
	step6: sectionCSchema,
};

export const ABSA_6995_STEP_TITLES = [
	"Applicant Details",
	"Directors & Contact",
	"Banking & Collection History",
	"Compliance & Metrics",
	"Bureau Details",
	"Declarations & Signatures",
] as const;

export const ABSA_6995_TOTAL_STEPS = ABSA_6995_STEP_TITLES.length;

// ============================================
// Default Values Helper
// ============================================

export const getAbsa6995DefaultValues = (): Partial<Absa6995FormData> => ({
	sectionA: {
		applicantDetails: {
			ultimateCreditorName: "",
			preferredShortName: "",
			alternativeShortNames: {
				alternative1: "",
				alternative2: "",
				alternative3: "",
				alternative4: "",
			},
			natureOfBusiness: "",
			companyRegistrationNumber: "",
		},
		applicationTypes: {
			applicationTypes: [],
		},
		directors: {
			directors: [
				{ fullName: "", idNumber: "" },
				{ fullName: "", idNumber: "" },
				{ fullName: "", idNumber: "" },
			],
		},
		contactDetails: {
			physicalAddress: {
				address: "",
				suburb: "",
				townCity: "",
				postalCode: "",
			},
			cipcRegisteredAddress: {
				address: "",
				suburb: "",
				townCity: "",
				postalCode: "",
			},
			telephoneNumber: "",
			emailAddress: "",
			websiteAddress: "",
		},
		bankingDetails: {
			bankName: "",
			accountType: "",
			branchCode: "",
			accountNumber: "",
			sourceOfIncome: "",
		},
		collectionHistory: {
			salesDistribution: [],
			isNewToCollections: false,
			hasPastCollections: false,
			pastCollectionProduct: "",
			previousShortName: "",
			collectingBureau: "",
		},
	},
	complianceHistory: {
		previousHistory: {
			previousSponsoringBank: "",
			hasBeenExited: false,
			exitReasons: [],
			exitReasonOther: "",
		},
		references: {
			references: [
				{ name: "", accountNumber: "", reference: "" },
				{ name: "", accountNumber: "", reference: "" },
				{ name: "", accountNumber: "", reference: "" },
				{ name: "", accountNumber: "", reference: "" },
				{ name: "", accountNumber: "", reference: "" },
			],
		},
		ratiosAndMetrics: {
			averageDisputeRatio: "",
			averageUnpaidRatio: "",
		},
		businessMetrics: {
			salesEmployeesCount: "",
			averageDebitOrderValue: "",
			presentBookSize: "",
			businessOperationLength: "",
			isPresentlySponsored: false,
			sponsoringBankName: "",
			sponsorshipPeriodYears: "",
			sponsorshipPeriodMonths: "",
			hasLitigationPending: false,
			hasDirectorsUnderAdministration: false,
			hasFormalComplaints: false,
			hasComplianceConcerns: false,
		},
	},
	bureauDetails: {
		isApplicable: false,
		bureauName: "",
		ldCode: "",
		bureauCif: "",
	},
	sectionC: {
		documentChecklist: {
			directorsIds: false,
			proofOfBusinessAddress: false,
			bankStatements: false,
			cipcDocuments: false,
			regulatedIndustryCertificates: false,
			clientMandates: false,
			marketingMaterial: false,
		},
		declarations: {
			informationTrueAndCorrect: false,
			misrepresentationAcknowledgement: false,
			debitingConsentAcknowledgement: false,
			personalInfoProcessingConsent: false,
			infoSharingUnderstanding: false,
			tpppConsentWarranty: false,
			ultimateCreditorInfoWarranty: false,
		},
		signatures: {
			clientSignature: { name: "", signature: "", date: "" },
			tpppOfficialName: "",
			tpppOfficialSignature: { name: "", signature: "", date: "" },
		},
	},
});
