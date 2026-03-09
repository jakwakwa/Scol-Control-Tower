import { z } from "zod";

const yesNoEnumSchema = z.enum(["yes", "no"]);

const applicantDetailsSchema = z.object({
	registeredName: z.string().optional(),
	tradingName: z.string().optional(),
	registrationOrIdNumber: z.string().optional(),
	contactPerson: z.string().optional(),
	telephone: z.string().optional(),
	email: z.string().email().optional().or(z.literal("")),
	industry: z.string().optional(),
	subIndustry: z.string().optional(),
	fspLicenseNumber: z.string().optional(),
	igfGuaranteeNumber: z.string().optional(),
	regulatingBody: z.string().optional(),
	membershipNumber: z.string().optional(),
	professionalAffiliation: z.string().optional(),
	professionalMembershipNumber: z.string().optional(),
	businessDescription: z.string().optional(),
	marketingMethod: z.string().optional(),
});

const insuranceDetailsSchema = z.object({
	isInsuranceClient: z.boolean().optional(),
	noneFscaRegulatedCollections: yesNoEnumSchema.optional(),
	fscaCollections: z
		.object({
			funeralPoliciesUpTo30000: yesNoEnumSchema.optional(),
			shortTermInsurance: yesNoEnumSchema.optional(),
			riskOnlyPolicies: yesNoEnumSchema.optional(),
			riskAndSavingsGuaranteed: yesNoEnumSchema.optional(),
			savingsAndInvestmentsWithoutGuarantees: yesNoEnumSchema.optional(),
			retirementAnnuitiesAndPreservationFunds: yesNoEnumSchema.optional(),
			pensionsOnGroupBasis: yesNoEnumSchema.optional(),
			unitTrust: yesNoEnumSchema.optional(),
		})
		.optional(),
	rolePlayers: z
		.object({
			isInsurer: yesNoEnumSchema.optional(),
			insurerNames: z.string().optional(),
			isUma: yesNoEnumSchema.optional(),
			umaName: z.string().optional(),
			isCallCaptiveOwner: yesNoEnumSchema.optional(),
			callCaptiveOwnerName: z.string().optional(),
			isVapProductOwner: yesNoEnumSchema.optional(),
			vapProductsOrServices: z.string().optional(),
			isIntermediaryFsp: yesNoEnumSchema.optional(),
			intermediaryInsurerNames: z.string().optional(),
			intermediaryUmaName: z.string().optional(),
			intermediaryCallCaptiveOwnerName: z.string().optional(),
			intermediaryProductOwners: z.string().optional(),
			isJuristicRepresentative: yesNoEnumSchema.optional(),
			juristicOperatingFsp: z.string().optional(),
		})
		.optional(),
});

export const facilityApplicationSchema = z
	.object({
		applicantDetails: applicantDetailsSchema.optional(),
		insuranceDetails: insuranceDetailsSchema.optional(),
		facilitySelection: z
			.object({
				serviceTypes: z
					.array(
						z.enum(["EFT", "DebiCheck", "3rd Party Payments", "Pay@", "Card Payments"])
					)
					.min(1, "Select at least one service type"),
				additionalServices: z
					.array(
						z.enum([
							"Integration",
							"E-Mandate",
							"Account Verification",
							"ID Verification",
							"Bulk SMS",
						])
					)
					.optional()
					.default([]),
			})
			.optional(),
		volumeMetrics: z
			.object({
				history: z
					.object({
						currentProvider: z.string().optional(),
						previousProvider: z.string().optional(),
						amountsOwed: z.string().optional(),
					})
					.optional(),
				statistics: z
					.object({
						averageTransactionsPerMonth: z.coerce.number().min(0).optional(),
						unpaidTransactionsCount: z.coerce.number().min(0).optional(),
						unpaidTransactionsValue: z.coerce.number().min(0).optional(),
						disputedTransactionsCount: z.coerce.number().min(0).optional(),
						disputedTransactionsValue: z.coerce.number().min(0).optional(),
					})
					.optional(),
				predictedGrowth: z
					.object({
						forecastVolume: z.coerce.number().min(0).optional(),
						forecastAverageValue: z.coerce.number().min(0).optional(),
					})
					.optional(),
				limitsAppliedFor: z
					.object({
						maxTransactionsPerMonth: z.coerce.number().min(0).optional(),
						maxRandValue: z.coerce.number().min(0).optional(),
						highestSingleTransaction: z.coerce.number().min(0).optional(),
					})
					.optional(),
			})
			.optional(),
		serviceTypes: z
			.array(z.enum(["EFT", "DebiCheck", "3rd Party Payments", "Pay@", "Card Payments"]))
			.optional()
			.default([]),
		additionalServices: z
			.array(
				z.enum([
					"Integration",
					"E-Mandate",
					"Account Verification",
					"ID Verification",
					"Bulk SMS",
				])
			)
			.optional()
			.default([]),
		currentProvider: z.string().optional(),
		amountsOwed: z.string().optional(),
		averageTransactionsPerMonth: z.coerce.number().min(0).optional(),
		unpaidTransactionsCount: z.coerce.number().min(0).optional(),
		unpaidTransactionsValue: z.coerce.number().min(0).optional(),
		disputedTransactionsCount: z.coerce.number().min(0).optional(),
		disputedTransactionsValue: z.coerce.number().min(0).optional(),
		forecastVolume: z.coerce.number().min(0).optional(),
		forecastAverageValue: z.coerce.number().min(0).optional(),
		maxTransactionsPerMonth: z.coerce.number().min(0).optional(),
		maxRandValue: z.coerce.number().min(0).optional(),
		highestSingleTransaction: z.coerce.number().min(0).optional(),
	})
	.superRefine((value, ctx) => {
		const hasLegacyServiceTypes =
			Array.isArray(value.serviceTypes) && value.serviceTypes.length > 0;
		const hasNestedServiceTypes =
			Array.isArray(value.facilitySelection?.serviceTypes) &&
			value.facilitySelection.serviceTypes.length > 0;

		if (!(hasLegacyServiceTypes || hasNestedServiceTypes)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["serviceTypes"],
				message: "Select at least one service type",
			});
		}
	});

export type FacilityApplicationForm = z.infer<typeof facilityApplicationSchema>;

export const stratcolAgreementSchema = z.object({
	registeredName: z.string().min(2),
	proprietorName: z.string().optional(),
	tradingName: z.string().min(2),
	registrationNumber: z.string().min(2),
	entityType: z.enum([
		"Proprietor",
		"Company",
		"Close Corporation",
		"Partnership",
		"Other",
	]),
	telephone: z.string().optional(),
	businessAddress: z.object({
		address: z.string().min(2),
		postalCode: z.string().min(2),
	}),
	postalAddress: z.object({
		address: z.string().min(2),
		postalCode: z.string().min(2),
	}),
	durationAtAddress: z.string().optional(),
	industryTenure: z.string().optional(),
	companyResolution: z
		.object({
			cityTown: z.string().min(1, "City/Town is required"),
			date: z
				.string()
				.min(1, "Resolution date is required")
				.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
			resolvedName: z.string().min(2, "Resolved name is required"),
			resolvedIdNumber: z.string().min(6, "ID number is required"),
		})
		.optional(),
	authorisedRepresentative: z.object({
		name: z.string().min(2),
		idNumber: z.string().min(6),
		position: z.string().min(2),
	}),
	beneficialOwners: z
		.array(
			z.object({
				name: z.string().min(2),
				idNumber: z.string().min(6),
				address: z.string().min(2),
				position: z.string().min(2),
				shareholdingPercent: z.coerce.number().min(0).max(100).optional(),
			})
		)
		.min(1, "Add at least one beneficial owner"),
	creditBankAccount: z.object({
		accountName: z.string().min(2),
		bankName: z.string().min(2),
		branch: z.string().optional(),
		branchCode: z.string().min(2),
		accountNumber: z.string().min(2),
	}),
	debitBankAccount: z.object({
		accountName: z.string().min(2),
		bankName: z.string().min(2),
		branch: z.string().optional(),
		branchCode: z.string().min(2),
		accountNumber: z.string().min(2),
	}),
	consentAccepted: z.literal(true, {
		message: "You must accept the agreement",
	}),
	signatureName: z.string().min(2, "Signature name is required"),
	signatureDate: z
		.string()
		.min(1, "Signature date is required")
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
});

export type StratcolAgreementForm = z.infer<typeof stratcolAgreementSchema>;

export const signedQuotationSchema = z.object({
	quoteReference: z.string().optional(),
	acceptedByName: z.string().min(2),
	acceptedByRole: z.string().min(2),
	acceptedByEmail: z.string().email(),
	consentAccepted: z.literal(true, {
		message: "You must accept the quotation terms",
	}),
	signatureName: z.string().min(2, "Signature name is required"),
	signatureDate: z
		.string()
		.min(1, "Signature date is required")
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
});

export type SignedQuotationForm = z.infer<typeof signedQuotationSchema>;

// Absa 6995 form - UK spelling in field names and labels
export const absa6995Schema = z.object({
	applicantDetails: z.object({
		ultimateCreditorName: z.string().min(2),
		preferredShortName: z.string().min(2),
		alternativeShortNames: z
			.array(z.string().min(1))
			.length(3, "Provide three alternative short names"),
		natureOfBusiness: z.string().optional(),
		companyRegistrationNumber: z.string().min(2),
		applicationTypes: z
			.array(
				z.enum(["EFT", "DebiCheck", "AbsaPay", "Payments", "New TPPP", "PayShap", "RM"])
			)
			.min(1, "Select at least one application type"),
		directors: z
			.array(
				z.object({
					fullName: z.string().min(2),
					idNumber: z.string().min(6),
				})
			)
			.min(1, "Provide at least one director"),
		physicalAddress: z.object({
			address: z.string().min(2),
			suburb: z.string().min(1),
			city: z.string().min(2),
			postalCode: z.string().min(2),
		}),
		registeredAddress: z.object({
			address: z.string().min(2),
			suburb: z.string().min(1),
			city: z.string().min(2),
			postalCode: z.string().min(2),
		}),
		contactInfo: z.object({
			telephone: z.string().min(5),
			email: z.string().email(),
			website: z.string().min(2),
		}),
		bankingDetails: z.object({
			bankName: z.string().optional(),
			accountType: z.string().optional(),
			branchCode: z.string().optional(),
			accountNumber: z.string().optional(),
			sourceOfIncome: z.string().optional(),
		}),
		salesDistribution: z
			.array(z.enum(["Direct Sales", "Call Centre", "Network Marketing", "Face-to-Face"]))
			.optional()
			.default([]),
		collectionHistory: z.object({
			isNewToCollections: z.enum(["yes", "no"]),
			previousCollections: z.enum(["yes", "no"]),
			previousProductOrService: z.string().optional(),
			previousShortName: z.string().optional(),
			collectingBureau: z.string().optional(),
		}),
	}),
	previousHistory: z.object({
		previousSponsoringBank: z.string().optional(),
		wasExited: z.enum(["yes", "no"]),
		exitReason: z
			.enum(["Debiting without mandate", "Debiting without consent", "Other"])
			.optional(),
		exitReasonOther: z.string().optional(),
	}),
	references: z
		.array(
			z.object({
				name: z.string().min(2),
				accountNumber: z.string().min(2),
				reference: z.string().min(1),
			})
		)
		.length(5, "Provide five reference entries"),
	ratiosAndMetrics: z.object({
		averageDisputeRatio: z.coerce.number().min(0).optional(),
		averageUnpaidRatio: z.coerce.number().min(0).optional(),
	}),
	businessMetrics: z.object({
		salesEmployees: z.coerce.number().min(0).optional(),
		averageDebitOrderValue: z.coerce.number().min(0).optional(),
		presentBookSize: z.string().optional(),
		yearsInOperation: z.string().optional(),
		sponsoredByAnotherBank: z.enum(["yes", "no"]),
		sponsoringBankName: z.string().optional(),
		sponsoringPeriodYears: z.coerce.number().min(0).optional(),
		sponsoringPeriodMonths: z.coerce.number().min(0).optional(),
		litigationPending: z.enum(["yes", "no"]),
		directorsUnderAdministration: z.enum(["yes", "no"]),
		formalComplaints: z.enum(["yes", "no"]),
		complianceConcerns: z.enum(["yes", "no"]),
	}),
	bureauDetails: z.object({
		bureauName: z.string().optional(),
		ldCode: z.string().optional(),
		bureauCif: z.string().optional(),
	}),
	additionalDirectors: z
		.array(
			z.object({
				fullName: z.string().min(2),
				idNumber: z.string().min(6),
			})
		)
		.optional(),
	documentChecklist: z.object({
		directorsIds: z.boolean().optional(),
		businessAddressProof: z.boolean().optional(),
		bankStatements: z.boolean().optional(),
		cipcDocuments: z.boolean().optional(),
		regulatedIndustryCertificates: z.boolean().optional(),
		existingMandates: z.boolean().optional(),
		marketingMaterial: z.boolean().optional(),
	}),
	declarations: z.object({
		informationCorrect: z.literal(true, { message: "Required" }),
		misrepresentationAcknowledged: z.literal(true, { message: "Required" }),
		debitingWithoutConsentAcknowledged: z.literal(true, {
			message: "Required",
		}),
		consentForProcessing: z.literal(true, { message: "Required" }),
		infoSharingAcknowledged: z.literal(true, { message: "Required" }),
		tpppConsentConfirmed: z.literal(true, { message: "Required" }),
		ultimateCreditorInformed: z.literal(true, { message: "Required" }),
	}),
	signatures: z.object({
		clientName: z.string().min(2, "Client name is required"),
		clientSignature: z.string().min(2, "Client signature is required"),
		clientSignatureDate: z
			.string()
			.min(1, "Signature date is required")
			.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
		mandatedOfficialName: z.string().optional(),
		mandatedOfficialSignature: z.string().optional(),
		mandatedOfficialDate: z
			.string()
			.optional()
			.refine(
				val => !val || /^\d{4}-\d{2}-\d{2}$/.test(val),
				"Date must be in YYYY-MM-DD format"
			),
	}),
});

export type Absa6995Form = z.infer<typeof absa6995Schema>;

// ============================================
// Call Centre Application Form
// ============================================

export const callCentreApplicationSchema = z.object({
	// Service Agreement
	serviceAgreementAccepted: z.literal(true, {
		message: "You must accept the service agreement",
	}),
	serviceAgreementSignature: z.string().min(2, "Signature is required"),

	// Product Description
	productDescription: z.string().min(10, "Product description is required"),

	// Supplier Contact Information
	supplierName: z.string().min(2, "Supplier name is required"),
	supplierPhone: z.string().min(5, "Supplier phone is required"),
	supplierEmail: z.string().email("Valid email is required"),
	supplierAddress: z.string().min(5, "Supplier address is required"),

	// Call Script
	callScript: z.string().min(10, "Call script is required"),

	// Final Signature
	signatureName: z.string().min(2, "Signature is required"),
	signatureDate: z
		.string()
		.min(1, "Signature date is required")
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
});

export type CallCentreApplicationForm = z.infer<typeof callCentreApplicationSchema>;
