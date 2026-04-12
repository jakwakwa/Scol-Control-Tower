import type { ZodTypeAny } from "zod";
import type { FormSectionDefinition } from "@/components/forms/types";
import type { FormType } from "@/lib/types";
import {
	callCentreApplicationSchema,
	facilityApplicationSchema,
	signedQuotationSchema,
} from "@/lib/validations/forms";
import { stratcolAgreementSchema } from "@/lib/validations/onboarding";

export const formContent: Record<
	Exclude<FormType, "DOCUMENT_UPLOADS">,
	{
		title: string;
		description: string;
		sections: FormSectionDefinition[];
		schema: ZodTypeAny;
		submitLabel: string;
		defaultValues: Record<string, unknown>;
		testData?: Record<string, unknown>;
		decision?: {
			enabled: boolean;
			approveLabel: string;
			declineLabel: string;
			requiresDeclineReason?: boolean;
		};
	}
> = {
	FACILITY_APPLICATION: {
		title: "Facility Application",
		description:
			"Provide product configuration and volume details so StratCol can prepare your facility.",
		schema: facilityApplicationSchema,
		submitLabel: "Submit facility application",
		defaultValues: {
			applicantDetails: {
				registeredName: "",
				tradingName: "",
				registrationOrIdNumber: "",
				contactPerson: "",
				telephone: "",
				email: "",
				industry: "",
				subIndustry: "",
				businessDescription: "",
				marketingMethod: "",
			},
			insuranceDetails: {
				isInsuranceClient: false,
			},
			serviceTypes: [],
			additionalServices: [],
		},
		sections: [
			{
				title: "Applicant Details",
				description:
					"Capture the legal entity and contact context used across downstream verification checks.",
				fields: [
					{
						name: "applicantDetails.registeredName",
						label: "Registered name / surname",
						type: "text",
						required: true,
					},
					{
						name: "applicantDetails.tradingName",
						label: "Trading name",
						type: "text",
					},
					{
						name: "applicantDetails.registrationOrIdNumber",
						label: "Registration no. / ID no.",
						type: "text",
					},
					{
						name: "applicantDetails.contactPerson",
						label: "Contact person",
						type: "text",
					},
					{
						name: "applicantDetails.telephone",
						label: "Telephone",
						type: "tel",
					},
					{
						name: "applicantDetails.email",
						label: "Email address",
						type: "email",
					},
					{
						name: "applicantDetails.industry",
						label: "Industry",
						type: "text",
					},
					{
						name: "applicantDetails.subIndustry",
						label: "Sub-industry",
						type: "text",
					},
					{
						name: "applicantDetails.businessDescription",
						label: "Description of business",
						type: "textarea",
						colSpan: 2,
					},
					{
						name: "applicantDetails.marketingMethod",
						label: "How will product be marketed",
						type: "textarea",
						colSpan: 2,
					},
				],
			},
			{
				title: "Insurance (Only if Applicable)",
				description: "Complete this section only if you are an insurance client.",
				fields: [
					{
						name: "insuranceDetails.isInsuranceClient",
						label: "This applicant is an insurance client",
						type: "checkbox",
					},
					{
						name: "insuranceDetails.noneFscaRegulatedCollections",
						label: "None FSCA regulated collections",
						type: "select",
						options: [
							{ label: "Yes", value: "yes" },
							{ label: "No", value: "no" },
						],
					},
					{
						name: "insuranceDetails.fscaCollections.shortTermInsurance",
						label: "FSCA: Short term insurance",
						type: "select",
						options: [
							{ label: "Yes", value: "yes" },
							{ label: "No", value: "no" },
						],
					},
					{
						name: "insuranceDetails.fscaCollections.riskOnlyPolicies",
						label: "FSCA: Risk-only policies",
						type: "select",
						options: [
							{ label: "Yes", value: "yes" },
							{ label: "No", value: "no" },
						],
					},
					{
						name: "insuranceDetails.rolePlayers.isInsurer",
						label: "Role player: Insurer",
						type: "select",
						options: [
							{ label: "Yes", value: "yes" },
							{ label: "No", value: "no" },
						],
					},
					{
						name: "insuranceDetails.rolePlayers.insurerNames",
						label: "Insurer names",
						type: "text",
					},
				],
			},
			{
				title: "Facility Selection",
				description: "Select the services required for your collections facility.",
				fields: [
					{
						name: "serviceTypes",
						label: "Service types",
						type: "checkbox-group",
						required: true,
						options: [
							{ label: "EFT", value: "EFT" },
							{ label: "DebiCheck", value: "DebiCheck" },
							{ label: "3rd Party Payments", value: "3rd Party Payments" },
							{ label: "Pay@", value: "Pay@" },
							{ label: "Card Payments", value: "Card Payments" },
						],
					},
					{
						name: "additionalServices",
						label: "Additional services",
						type: "checkbox-group",
						options: [
							{ label: "Integration", value: "Integration" },
							{ label: "E-Mandate", value: "E-Mandate" },
							{ label: "Account Verification", value: "Account Verification" },
							{ label: "ID Verification", value: "ID Verification" },
							{ label: "Bulk SMS", value: "Bulk SMS" },
						],
					},
				],
			},
			{
				title: "Volume & Risk Metrics",
				description: "Provide current processing volumes and risk indicators.",
				fields: [
					{
						name: "currentProvider",
						label: "Current or previous service provider",
						type: "text",
						placeholder: "Provider name",
					},
					{
						name: "amountsOwed",
						label: "Amounts owed (if any)",
						type: "text",
						placeholder: "e.g. R25,000",
					},
					{
						name: "averageTransactionsPerMonth",
						label: "Average transactions per month",
						type: "number",
						placeholder: "0",
					},
					{
						name: "unpaidTransactionsCount",
						label: "Unpaid transactions (count)",
						type: "number",
						placeholder: "0",
					},
					{
						name: "unpaidTransactionsValue",
						label: "Unpaid transactions (value)",
						type: "number",
						placeholder: "0",
					},
					{
						name: "disputedTransactionsCount",
						label: "Disputed transactions (count)",
						type: "number",
						placeholder: "0",
					},
					{
						name: "disputedTransactionsValue",
						label: "Disputed transactions (value)",
						type: "number",
						placeholder: "0",
					},
				],
			},
			{
				title: "Predicted Growth",
				description: "Share your expected transaction growth for the next three months.",
				fields: [
					{
						name: "forecastVolume",
						label: "Expected monthly volume (3-month forecast)",
						type: "number",
						placeholder: "0",
					},
					{
						name: "forecastAverageValue",
						label: "Expected average transaction value",
						type: "number",
						placeholder: "0",
					},
				],
			},
			{
				title: "Limits Applied For",
				description: "Specify the limits you are applying for.",
				fields: [
					{
						name: "maxTransactionsPerMonth",
						label: "Max transactions per month",
						type: "number",
						placeholder: "0",
					},
					{
						name: "maxRandValue",
						label: "Max rand value per month",
						type: "number",
						placeholder: "0",
					},
					{
						name: "highestSingleTransaction",
						label: "Highest single transaction (line limit)",
						type: "number",
						placeholder: "0",
					},
				],
			},
		],
		testData: {
			"applicantDetails.registeredName": "Jacob Kotzee",
			"applicantDetails.tradingName": "Podslice Ai",
			"applicantDetails.registrationOrIdNumber": "8503195187088",
			"applicantDetails.contactPerson": "Jacob Kotzee",
			"applicantDetails.telephone": "0111234567",
			"applicantDetails.email": "jkotzee@icloud.com",
			"applicantDetails.industry": "Information Technology",
			"applicantDetails.subIndustry": "Software Development",
			"applicantDetails.businessDescription": "Provides software development and servicing policy administration.",
			"applicantDetails.marketingMethod": "Google Ads, Facebook,   Call centre and direct agents.",
			"insuranceDetails.isInsuranceClient": false,
			"insuranceDetails.noneFscaRegulatedCollections": "no",
			"insuranceDetails.fscaCollections.shortTermInsurance": "no",
			"insuranceDetails.fscaCollections.riskOnlyPolicies": "no",
			"insuranceDetails.rolePlayers.isInsurer": "no",
			"insuranceDetails.rolePlayers.insurerNames": "",
			serviceTypes: ["EFT", "DebiCheck"],
			additionalServices: ["Integration", "E-Mandate"],
			currentProvider: "",
			amountsOwed: "",
			averageTransactionsPerMonth: 0,
			unpaidTransactionsCount: 0,
			unpaidTransactionsValue: 0,
			disputedTransactionsCount: 0,
			disputedTransactionsValue: 0,
			forecastVolume: 50,
			forecastAverageValue: 12000,
			maxTransactionsPerMonth: 20,
			maxRandValue: 150000,
			highestSingleTransaction: 84000,
		},
	},
	SIGNED_QUOTATION: {
		title: "Signed Quotation",
		description: "Review and accept the quotation provided by StratCol.",
		schema: signedQuotationSchema,
		submitLabel: "Submit quotation details",
		decision: {
			enabled: true,
			approveLabel: "Approve quotation",
			declineLabel: "Decline quotation",
			requiresDeclineReason: true,
		},
		defaultValues: {
			consentAccepted: false,
		},
		sections: [
			{
				title: "Quotation Acceptance",
				description: "Confirm acceptance and provide signature details.",
				fields: [
					{
						name: "acceptedByName",
						label: "Authorised representative name",
						type: "text",
						required: true,
					},
					{
						name: "acceptedByRole",
						label: "Position/role",
						type: "text",
						required: true,
					},
					{
						name: "acceptedByEmail",
						label: "Email address",
						type: "email",
						required: true,
					},
					{
						name: "consentAccepted",
						label: "I accept the quotation terms provided by StratCol.",
						type: "checkbox",
						required: true,
					},
					{
						name: "signatureName",
						label: "Typed signature",
						type: "signature",
						required: true,
					},
					{
						name: "signatureDate",
						label: "Signature date",
						type: "date",
						required: true,
					},
				],
			},
		],
	},
	AGREEMENT_CONTRACT: {
		title: "StratCol Contract",
		description: "Provide entity details and confirm the StratCol agreement.",
		schema: stratcolAgreementSchema,
		submitLabel: "Submit contract details",
		decision: {
			enabled: true,
			approveLabel: "Approve contract",
			declineLabel: "Decline contract",
			requiresDeclineReason: true,
		},
		defaultValues: {
			beneficialOwners: [{}],
			consentAccepted: false,
		},
		sections: [
			{
				title: "Entity Details",
				description: "Core legal and registration details.",
				fields: [
					{
						name: "registeredName",
						label: "Registered name",
						type: "text",
						required: true,
					},
					{
						name: "proprietorName",
						label: "Proprietor name (if applicable)",
						type: "text",
					},
					{
						name: "tradingName",
						label: "Trading name",
						type: "text",
						required: true,
					},
					{
						name: "registrationNumber",
						label: "Registration / ID number",
						type: "text",
						required: true,
					},
					{
						name: "entityType",
						label: "Entity type",
						type: "select",
						required: true,
						options: [
							{ label: "Proprietor", value: "Proprietor" },
							{ label: "Company", value: "Company" },
							{ label: "Close Corporation", value: "Close Corporation" },
							{ label: "Partnership", value: "Partnership" },
							{ label: "Other", value: "Other" },
						],
					},
					{
						name: "businessAddress.address",
						label: "Business address",
						type: "text",
						required: true,
						colSpan: 2,
					},
					{
						name: "businessAddress.postalCode",
						label: "Business postal code",
						type: "text",
						required: true,
					},
					{
						name: "postalAddress.address",
						label: "Postal address",
						type: "text",
						required: true,
						colSpan: 2,
					},
					{
						name: "postalAddress.postalCode",
						label: "Postal code",
						type: "text",
						required: true,
					},
					{
						name: "durationAtAddress",
						label: "Duration at address",
						type: "text",
					},
					{
						name: "industryTenure",
						label: "Industry tenure",
						type: "text",
					},
				],
			},
			{
				title: "Authorised Representative",
				description: "Primary signatory and role details.",
				fields: [
					{
						name: "authorisedRepresentative.name",
						label: "Full name",
						type: "text",
						required: true,
					},
					{
						name: "authorisedRepresentative.idNumber",
						label: "ID number",
						type: "text",
						required: true,
					},
					{
						name: "authorisedRepresentative.position",
						label: "Position",
						type: "text",
						required: true,
					},
				],
			},
			{
				title: "Beneficial Owners",
				description: "List all beneficial owners with 5% or more shareholding.",
				fields: [
					{
						name: "beneficialOwners",
						label: "Beneficial owners",
						type: "repeatable",
						minItems: 1,
						addLabel: "Add beneficial owner",
						fields: [
							{
								name: "name",
								label: "Full name",
								type: "text",
								required: true,
							},
							{
								name: "idNumber",
								label: "ID number",
								type: "text",
								required: true,
							},
							{
								name: "address",
								label: "Address",
								type: "text",
								required: true,
							},
							{
								name: "position",
								label: "Position",
								type: "text",
								required: true,
							},
							{
								name: "shareholdingPercent",
								label: "Shareholding %",
								type: "number",
							},
						],
					},
				],
			},
			{
				title: "Banking & Mandates",
				description: "Provide banking details for credit and debit accounts.",
				fields: [
					{
						name: "creditBankAccount.accountName",
						label: "Credit account name",
						type: "text",
						required: true,
					},
					{
						name: "creditBankAccount.bankName",
						label: "Credit bank",
						type: "text",
						required: true,
					},
					{
						name: "creditBankAccount.branch",
						label: "Credit branch",
						type: "text",
					},
					{
						name: "creditBankAccount.branchCode",
						label: "Credit branch code",
						type: "text",
						required: true,
					},
					{
						name: "creditBankAccount.accountNumber",
						label: "Credit account number",
						type: "text",
						required: true,
					},
					{
						name: "debitBankAccount.accountName",
						label: "Debit account name",
						type: "text",
						required: true,
					},
					{
						name: "debitBankAccount.bankName",
						label: "Debit bank",
						type: "text",
						required: true,
					},
					{
						name: "debitBankAccount.branch",
						label: "Debit branch",
						type: "text",
					},
					{
						name: "debitBankAccount.branchCode",
						label: "Debit branch code",
						type: "text",
						required: true,
					},
					{
						name: "debitBankAccount.accountNumber",
						label: "Debit account number",
						type: "text",
						required: true,
					},
				],
			},
			{
				title: "Agreement & Signature",
				description: "Confirm that the information is accurate and sign the agreement.",
				fields: [
					{
						name: "consentAccepted",
						label: "I accept the StratCol agreement terms.",
						type: "checkbox",
						required: true,
						colSpan: 2,
					},
					{
						name: "signatureName",
						label: "Typed signature",
						type: "signature",
						required: true,
					},
					{
						name: "signatureDate",
						label: "Signature date",
						type: "date",
						required: true,
					},
				],
			},
		],
		testData: {
			registeredName: "Test Company (Pty) Ltd",
			proprietorName: "",
			tradingName: "Test Trading Co",
			registrationNumber: "2024/123456/07",
			entityType: "Company",
			"businessAddress.address": "123 Business Street, Sandton",
			"businessAddress.postalCode": "2196",
			"postalAddress.address": "PO Box 1234, Sandton",
			"postalAddress.postalCode": "2196",
			durationAtAddress: "5 years",
			industryTenure: "10 years",
			"authorisedRepresentative.name": "John Smith",
			"authorisedRepresentative.idNumber": "8001015009087",
			"authorisedRepresentative.position": "Director",
			beneficialOwners: [
				{
					name: "Jane Doe",
					idNumber: "8505050050080",
					address: "456 Owner Lane, Johannesburg, 2000",
					position: "Shareholder",
					shareholdingPercent: 60,
				},
			],
			"creditBankAccount.accountName": "Test Company (Pty) Ltd",
			"creditBankAccount.bankName": "ABSA",
			"creditBankAccount.branch": "Sandton",
			"creditBankAccount.branchCode": "632005",
			"creditBankAccount.accountNumber": "4098765432",
			"debitBankAccount.accountName": "Test Company (Pty) Ltd",
			"debitBankAccount.bankName": "ABSA",
			"debitBankAccount.branch": "Sandton",
			"debitBankAccount.branchCode": "632005",
			"debitBankAccount.accountNumber": "4098765433",
			consentAccepted: true,
			signatureName: "John Smith",
			signatureDate: new Date().toISOString().split("T")[0],
		},
	},

	CALL_CENTRE_APPLICATION: {
		title: "Call Centre Application",
		description:
			"Complete this application if your business will use call centre collections. All sections are required.",
		schema: callCentreApplicationSchema,
		submitLabel: "Submit call centre details",
		decision: {
			enabled: true,
			approveLabel: "Approve call centre application",
			declineLabel: "Decline call centre application",
			requiresDeclineReason: true,
		},
		defaultValues: {
			serviceAgreementAccepted: false,
		},
		sections: [
			{
				title: "Service Agreement",
				description:
					"By accepting this agreement, you confirm that your call centre operations will comply with StratCol's terms of service and all applicable regulations.",
				fields: [
					{
						name: "serviceAgreementAccepted",
						label:
							"I accept the StratCol call centre service agreement and confirm compliance with all applicable regulations.",
						type: "checkbox",
						required: true,
						colSpan: 2,
					},
					{
						name: "serviceAgreementSignature",
						label: "Typed signature",
						type: "signature",
						required: true,
					},
				],
			},
			{
				title: "Product Description",
				description: "Describe the product or service being collected for.",
				fields: [
					{
						name: "productDescription",
						label: "Product / service description",
						type: "textarea",
						required: true,
						colSpan: 2,
					},
				],
			},
			{
				title: "Supplier Contact Information",
				description: "Provide the contact details of the supplier or ultimate creditor.",
				fields: [
					{
						name: "supplierName",
						label: "Contact name",
						type: "text",
						required: true,
					},
					{
						name: "supplierPhone",
						label: "Phone number",
						type: "tel",
						required: true,
					},
					{
						name: "supplierEmail",
						label: "Email address",
						type: "email",
						required: true,
					},
					{
						name: "supplierAddress",
						label: "Business address",
						type: "text",
						required: true,
						colSpan: 2,
					},
				],
			},
			{
				title: "Call Script",
				description:
					"Provide the call script that will be used by the call centre when contacting debtors.",
				fields: [
					{
						name: "callScript",
						label: "Call script",
						type: "textarea",
						required: true,
						colSpan: 2,
					},
				],
			},
			{
				title: "Final Signature",
				description: "Confirm and sign the application.",
				fields: [
					{
						name: "signatureName",
						label: "Typed signature",
						type: "signature",
						required: true,
					},
					{
						name: "signatureDate",
						label: "Signature date",
						type: "date",
						required: true,
					},
				],
			},
		],
		testData: {
			serviceAgreementAccepted: true,
			serviceAgreementSignature: "John Smith",
			productDescription: "Subscription-based software product with monthly billing",
			supplierName: "Jane Supplier",
			supplierPhone: "+27 82 123 4567",
			supplierEmail: "supplier@example.com",
			supplierAddress: "456 Supply Road, Johannesburg, 2001",
			callScript:
				"Good day, this is [Agent Name] calling from [Company Name] regarding your account...",
			signatureName: "John Smith",
			signatureDate: new Date().toISOString().split("T")[0],
		},
	},
};
