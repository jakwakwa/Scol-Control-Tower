/**
 * StratCol Agreement (Core Contract) Validation Schema
 * Establishes the legal relationship and primary entity data
 * Note: Using UK spelling throughout (e.g., organisation, authorisation)
 */
import { z } from "zod";
import {
	addressSchema,
	bankingDetailsSchema,
	registrationNumberSchema,
	saIdNumberSchema,
	signatureSchema,
} from "./common";

// ============================================
// Entity Type Enum
// ============================================

export const EntityType = {
	PROPRIETOR: "proprietor",
	COMPANY: "company",
	CLOSE_CORPORATION: "close_corporation",
	PARTNERSHIP: "partnership",
	OTHER: "other",
} as const;

export type EntityTypeValue = (typeof EntityType)[keyof typeof EntityType];

// ============================================
// Beneficial Owner Schema
// ============================================

export const beneficialOwnerSchema = z.object({
	name: z.string().min(1, "Name is required"),
	idNumber: saIdNumberSchema,
	address: z.string().min(1, "Address is required"),
	position: z.string().min(1, "Position is required"),
	shareholdingPercentage: z
		.string()
		.min(1, "Shareholding percentage is required")
		.refine(
			val => {
				const num = parseFloat(val);
				return !Number.isNaN(num) && num >= 5 && num <= 100;
			},
			{ message: "Shareholding must be between 5% and 100%" }
		),
});

export type BeneficialOwner = z.infer<typeof beneficialOwnerSchema>;

// ============================================
// Authorised Representative Schema
// ============================================

export const authorisedRepresentativeSchema = z.object({
	name: z.string().min(1, "Name is required"),
	idNumber: saIdNumberSchema,
	position: z.string().min(1, "Position is required"),
});

export type AuthorisedRepresentative = z.infer<typeof authorisedRepresentativeSchema>;

// ============================================
// Section 1: Entity Details Schema
// ============================================

export const entityDetailsSchema = z.object({
	registeredName: z.string().min(1, "Registered name is required"),
	proprietorName: z.string().optional(),
	tradingName: z.string().min(1, "Trading name is required"),
	registrationNumber: registrationNumberSchema,
	entityType: z.enum([
		EntityType.PROPRIETOR,
		EntityType.COMPANY,
		EntityType.CLOSE_CORPORATION,
		EntityType.PARTNERSHIP,
		EntityType.OTHER,
	]),
	otherEntityType: z.string().optional(),
	businessAddress: addressSchema,
	postalAddress: addressSchema,
	durationAtAddress: z.string().optional(),
	industryTenure: z.string().optional(),
});

export type EntityDetails = z.infer<typeof entityDetailsSchema>;

// ============================================
// Section 2: Signatory & Beneficial Owners Schema
// ============================================

export const signatoryAndOwnersSchema = z.object({
	authorisedRepresentative: authorisedRepresentativeSchema,
	beneficialOwners: z
		.array(beneficialOwnerSchema)
		.min(1, "At least one beneficial owner is required"),
});

export type SignatoryAndOwners = z.infer<typeof signatoryAndOwnersSchema>;

// ============================================
// Section 3: Banking & Mandates Schema
// ============================================

export const bankingAndMandatesSchema = z.object({
	creditBankAccount: bankingDetailsSchema.extend({
		accountName: z.string().min(1, "Account name is required"),
	}),
	debitBankAccount: bankingDetailsSchema.extend({
		accountName: z.string().min(1, "Account name is required"),
	}),
	useSameAccountForDebit: z.boolean().default(false),
});

export type BankingAndMandates = z.infer<typeof bankingAndMandatesSchema>;

// ============================================
// Complete StratCol Agreement Schema
// ============================================

export const stratcolAgreementSchema = z.object({
	// Section 1: Entity Details
	entityDetails: entityDetailsSchema,

	// Section 2: Signatory & Beneficial Owners
	signatoryAndOwners: signatoryAndOwnersSchema,

	// Section 3: Banking & Mandates
	bankingAndMandates: bankingAndMandatesSchema,

	// Declarations
	declarationsAccepted: z.boolean().refine(val => val === true, {
		message: "You must accept the declarations to proceed",
	}),

	// Signature
	signature: signatureSchema,
});

export type StratcolAgreementFormData = z.infer<typeof stratcolAgreementSchema>;

// ============================================
// Step-wise Schemas for Multi-step Form
// ============================================

export const stratcolAgreementSteps = {
	step1: entityDetailsSchema,
	step2: signatoryAndOwnersSchema,
	step3: bankingAndMandatesSchema,
	step4: z.object({
		declarationsAccepted: z.boolean().refine(val => val === true, {
			message: "You must accept the declarations to proceed",
		}),
		signature: signatureSchema,
	}),
};

export const STRATCOL_AGREEMENT_STEP_TITLES = [
	"Entity Details",
	"Signatory & Beneficial Owners",
	"Banking & Mandates",
	"Declarations & Signature",
] as const;

export const STRATCOL_AGREEMENT_TOTAL_STEPS = STRATCOL_AGREEMENT_STEP_TITLES.length;
