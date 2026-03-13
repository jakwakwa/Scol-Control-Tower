/**
 * Facility Application (Product Configuration) Validation Schema
 * Used to calculate quotes based on specific service needs and risk
 * Note: Using UK spelling throughout (e.g., organisation, authorisation)
 */
import { z } from "zod";
import { currencySchema, optionalString, saIdNumberSchema } from "./common";

// ============================================
// Service Type Enums
// ============================================

export const ServiceType = {
	EFT: "eft",
	DEBICHECK: "debicheck",
	THIRD_PARTY_PAYMENTS: "third_party_payments",
	PAY_AT: "pay_at",
	CARD_PAYMENTS: "card_payments",
} as const;

export type ServiceTypeValue = (typeof ServiceType)[keyof typeof ServiceType];

export const AdditionalService = {
	INTEGRATION: "integration",
	E_MANDATE: "e_mandate",
	ACCOUNT_VERIFICATION: "account_verification",
	ID_VERIFICATION: "id_verification",
	BULK_SMS: "bulk_sms",
} as const;

export type AdditionalServiceValue =
	(typeof AdditionalService)[keyof typeof AdditionalService];

// ============================================
// Facility Selection Schema
// ============================================

export const facilitySelectionSchema = z.object({
	serviceTypes: z
		.array(
			z.enum([
				ServiceType.EFT,
				ServiceType.DEBICHECK,
				ServiceType.THIRD_PARTY_PAYMENTS,
				ServiceType.PAY_AT,
				ServiceType.CARD_PAYMENTS,
			])
		)
		.min(1, "Please select at least one service type"),

	additionalServices: z
		.array(
			z.enum([
				AdditionalService.INTEGRATION,
				AdditionalService.E_MANDATE,
				AdditionalService.ACCOUNT_VERIFICATION,
				AdditionalService.ID_VERIFICATION,
				AdditionalService.BULK_SMS,
			])
		)
		.default([]),
});

export type FacilitySelection = z.infer<typeof facilitySelectionSchema>;

// ============================================
// Volume & Risk Metrics Schema
// ============================================

export const historySchema = z.object({
	currentProvider: optionalString(),
	previousProvider: optionalString(),
	amountsOwed: currencySchema("Amounts owed"),
	hasOutstandingAmounts: z.boolean().default(false),
});

export const statisticsSchema = z.object({
	averageTransactionsPerMonth: z
		.string()
		.min(1, "Average transactions per month is required")
		.refine(
			val => {
				const num = parseInt(val, 10);
				return !Number.isNaN(num) && num >= 0;
			},
			{ message: "Must be a valid number" }
		),
	averageTransactionValue: currencySchema("Average transaction value"),
	unpaidTransactionsValue: currencySchema("Unpaid transactions value"),
	unpaidTransactionsQuantity: optionalString(),
	disputedTransactionsValue: currencySchema("Disputed transactions value"),
	disputedTransactionsQuantity: optionalString(),
});

export const predictedGrowthSchema = z.object({
	month1Volume: z.string().optional(),
	month1Value: currencySchema("Month 1 value"),
	month2Volume: z.string().optional(),
	month2Value: currencySchema("Month 2 value"),
	month3Volume: z.string().optional(),
	month3Value: currencySchema("Month 3 value"),
});

export const limitsAppliedForSchema = z.object({
	maxTransactionsPerMonth: z
		.string()
		.min(1, "Maximum transactions per month is required")
		.refine(
			val => {
				const num = parseInt(val, 10);
				return !Number.isNaN(num) && num > 0;
			},
			{ message: "Must be a positive number" }
		),
	maxRandValue: z
		.string()
		.min(1, "Maximum Rand value is required")
		.refine(
			val => {
				const num = parseFloat(val.replace(/[R,\s]/g, ""));
				return !Number.isNaN(num) && num > 0;
			},
			{ message: "Must be a valid amount" }
		),
	lineLimit: z
		.string()
		.min(1, "Line limit (highest single transaction) is required")
		.refine(
			val => {
				const num = parseFloat(val.replace(/[R,\s]/g, ""));
				return !Number.isNaN(num) && num > 0;
			},
			{ message: "Must be a valid amount" }
		),
});

export const volumeMetricsSchema = z.object({
	history: historySchema,
	statistics: statisticsSchema,
	predictedGrowth: predictedGrowthSchema,
	limitsAppliedFor: limitsAppliedForSchema,
});

export type VolumeMetrics = z.infer<typeof volumeMetricsSchema>;

// ============================================
// Applicant & Insurance Context (PDF-aligned)
// ============================================

const yesNoBooleanSchema = z
	.enum(["yes", "no"])
	.transform(value => value === "yes")
	.optional();

export const facilityApplicantDetailsSchema = z.object({
	registeredName: optionalString(),
	tradingName: optionalString(),
	registrationOrIdNumber: optionalString(),
	contactPerson: optionalString(),
	telephone: optionalString(),
	email: z.string().email("Must be a valid email address").optional().or(z.literal("")),
	industry: optionalString(),
	subIndustry: optionalString(),
	fspLicenseNumber: optionalString(),
	igfGuaranteeNumber: optionalString(),
	regulatingBody: optionalString(),
	membershipNumber: optionalString(),
	professionalAffiliation: optionalString(),
	professionalMembershipNumber: optionalString(),
	businessDescription: optionalString(),
	marketingMethod: optionalString(),
});

export const facilityInsuranceDetailsSchema = z.object({
	isInsuranceClient: z.boolean().default(false),
	noneFscaRegulatedCollections: yesNoBooleanSchema,
	fscaCollections: z
		.object({
			funeralPoliciesUpTo30000: yesNoBooleanSchema,
			shortTermInsurance: yesNoBooleanSchema,
			riskOnlyPolicies: yesNoBooleanSchema,
			riskAndSavingsGuaranteed: yesNoBooleanSchema,
			savingsAndInvestmentsWithoutGuarantees: yesNoBooleanSchema,
			retirementAnnuitiesAndPreservationFunds: yesNoBooleanSchema,
			pensionsOnGroupBasis: yesNoBooleanSchema,
			unitTrust: yesNoBooleanSchema,
		})
		.default({}),
	rolePlayers: z
		.object({
			isInsurer: yesNoBooleanSchema,
			insurerNames: optionalString(),
			isUma: yesNoBooleanSchema,
			umaName: optionalString(),
			isCallCaptiveOwner: yesNoBooleanSchema,
			callCaptiveOwnerName: optionalString(),
			isVapProductOwner: yesNoBooleanSchema,
			vapProductsOrServices: optionalString(),
			isIntermediaryFsp: yesNoBooleanSchema,
			intermediaryInsurerNames: optionalString(),
			intermediaryUmaName: optionalString(),
			intermediaryCallCaptiveOwnerName: optionalString(),
			intermediaryProductOwners: optionalString(),
			isJuristicRepresentative: yesNoBooleanSchema,
			juristicOperatingFsp: optionalString(),
		})
		.default({}),
})
.superRefine((value, ctx) => {
	if (!value.isInsuranceClient) {
		return;
	}

	if (value.noneFscaRegulatedCollections === undefined) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["noneFscaRegulatedCollections"],
			message: "Required for insurance clients",
		});
	}
});

// ============================================
// Complete Facility Application Schema
// ============================================

export const facilityApplicationSchema = z.object({
	idNumber: saIdNumberSchema,
	applicantDetails: facilityApplicantDetailsSchema.optional(),
	insuranceDetails: facilityInsuranceDetailsSchema.optional(),
	facilitySelection: facilitySelectionSchema,
	volumeMetrics: volumeMetricsSchema,
});

export type FacilityApplicationFormData = z.infer<typeof facilityApplicationSchema>;

// ============================================
// Step-wise Schemas for Multi-step Form
// ============================================

export const facilityApplicationSteps = {
	step1: facilitySelectionSchema,
	step2: volumeMetricsSchema,
};

export const FACILITY_APPLICATION_STEP_TITLES = [
	"Facility Selection",
	"Volume & Risk Metrics",
] as const;

export const FACILITY_APPLICATION_TOTAL_STEPS = FACILITY_APPLICATION_STEP_TITLES.length;
