import type { ZodTypeAny } from "zod";
import type { FormSectionDefinition } from "@/components/forms/types";
import type { FormType } from "@/lib/types";
import {
	absa6995Schema,
	accountantLetterSchema,
	callCentreApplicationSchema,
	facilityApplicationSchema,
	signedQuotationSchema,
	stratcolContractSchema,
} from "@/lib/validations/forms";

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
			serviceTypes: [],
			additionalServices: [],
		},
		sections: [
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
			serviceTypes: ["EFT", "DebiCheck"],
			additionalServices: ["Integration", "E-Mandate"],
			currentProvider: "Previous Provider Ltd",
			amountsOwed: "R0",
			averageTransactionsPerMonth: 500,
			unpaidTransactionsCount: 5,
			unpaidTransactionsValue: 2500,
			disputedTransactionsCount: 2,
			disputedTransactionsValue: 1000,
			forecastVolume: 750,
			forecastAverageValue: 350,
			maxTransactionsPerMonth: 1000,
			maxRandValue: 500000,
			highestSingleTransaction: 5000,
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
	STRATCOL_CONTRACT: {
		title: "StratCol Contract",
		description: "Provide entity details and confirm the StratCol agreement.",
		schema: stratcolContractSchema,
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
	ABSA_6995: {
		title: "Absa 6995 User Pre-screening Assessment",
		description: "Complete the Absa 6995 assessment. Fields marked with * are mandatory.",
		schema: absa6995Schema,
		submitLabel: "Submit Absa 6995 form",
		defaultValues: {
			applicantDetails: {
				alternativeShortNames: ["", "", ""],
				applicationTypes: [],
				directors: [{}, {}, {}],
				salesDistribution: [],
				collectionHistory: {
					isNewToCollections: "no",
					previousCollections: "no",
				},
			},
			previousHistory: {
				wasExited: "no",
			},
			references: [{}, {}, {}, {}, {}],
			businessMetrics: {
				sponsoredByAnotherBank: "no",
				litigationPending: "no",
				directorsUnderAdministration: "no",
				formalComplaints: "no",
				complianceConcerns: "no",
			},
			additionalDirectors: [],
			documentChecklist: {},
			declarations: {},
			signatures: {},
		},
		sections: [
			{
				title: "Applicant Details",
				description:
					"This section must be completed by all applicants applying for collections facilities.",
				fields: [
					{
						name: "applicantDetails.ultimateCreditorName",
						label: "Name of the ultimate creditor",
						type: "text",
						required: true,
						colSpan: 2,
					},
					{
						name: "applicantDetails.preferredShortName",
						label: "Preferred abbreviated short name",
						type: "text",
						required: true,
					},
					{
						name: "applicantDetails.alternativeShortNames.0",
						label: "Alternative short name 1",
						type: "text",
						required: true,
					},
					{
						name: "applicantDetails.alternativeShortNames.1",
						label: "Alternative short name 2",
						type: "text",
						required: true,
					},
					{
						name: "applicantDetails.alternativeShortNames.2",
						label: "Alternative short name 3",
						type: "text",
						required: true,
					},
					{
						name: "applicantDetails.natureOfBusiness",
						label: "Nature of business",
						type: "text",
						colSpan: 2,
					},
					{
						name: "applicantDetails.companyRegistrationNumber",
						label: "Company registration number",
						type: "text",
						required: true,
					},
					{
						name: "applicantDetails.applicationTypes",
						label: "Application type",
						type: "checkbox-group",
						required: true,
						options: [
							{ label: "EFT", value: "EFT" },
							{ label: "DebiCheck", value: "DebiCheck" },
							{ label: "AbsaPay", value: "AbsaPay" },
							{ label: "Payments", value: "Payments" },
							{ label: "New TPPP", value: "New TPPP" },
							{ label: "PayShap", value: "PayShap" },
							{ label: "RM", value: "RM" },
						],
						colSpan: 2,
					},
					{
						name: "applicantDetails.directors",
						label: "Directors (full name and ID number)",
						type: "repeatable",
						minItems: 1,
						addLabel: "Add director",
						fields: [
							{
								name: "fullName",
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
						],
					},
				],
			},
			{
				title: "Contact Details",
				description: "Provide the operating and registered addresses.",
				fields: [
					{
						name: "applicantDetails.physicalAddress.address",
						label: "Physical operating address",
						type: "text",
						required: true,
						colSpan: 2,
					},
					{
						name: "applicantDetails.physicalAddress.suburb",
						label: "Suburb",
						type: "text",
						required: true,
					},
					{
						name: "applicantDetails.physicalAddress.city",
						label: "Town/City",
						type: "text",
						required: true,
					},
					{
						name: "applicantDetails.physicalAddress.postalCode",
						label: "Postal code",
						type: "text",
						required: true,
					},
					{
						name: "applicantDetails.registeredAddress.address",
						label: "CIPC registered address",
						type: "text",
						required: true,
						colSpan: 2,
					},
					{
						name: "applicantDetails.registeredAddress.suburb",
						label: "Suburb",
						type: "text",
						required: true,
					},
					{
						name: "applicantDetails.registeredAddress.city",
						label: "Town/City",
						type: "text",
						required: true,
					},
					{
						name: "applicantDetails.registeredAddress.postalCode",
						label: "Postal code",
						type: "text",
						required: true,
					},
					{
						name: "applicantDetails.contactInfo.telephone",
						label: "Telephone number",
						type: "tel",
						required: true,
					},
					{
						name: "applicantDetails.contactInfo.email",
						label: "Email address",
						type: "email",
						required: true,
					},
					{
						name: "applicantDetails.contactInfo.website",
						label: "Website address",
						type: "text",
						required: true,
					},
				],
			},
			{
				title: "Banking Details",
				description: "Bank account details for collected funds.",
				fields: [
					{
						name: "applicantDetails.bankingDetails.bankName",
						label: "Bank name",
						type: "text",
					},
					{
						name: "applicantDetails.bankingDetails.accountType",
						label: "Account type",
						type: "text",
					},
					{
						name: "applicantDetails.bankingDetails.branchCode",
						label: "Branch code",
						type: "text",
					},
					{
						name: "applicantDetails.bankingDetails.accountNumber",
						label: "Account number",
						type: "text",
					},
					{
						name: "applicantDetails.bankingDetails.sourceOfIncome",
						label: "Source of income",
						type: "text",
					},
				],
			},
			{
				title: "Collection History & Sales",
				description: "Provide sales distribution and history details.",
				fields: [
					{
						name: "applicantDetails.salesDistribution",
						label: "Sales distribution",
						type: "checkbox-group",
						options: [
							{ label: "Direct Sales", value: "Direct Sales" },
							{ label: "Call Centre", value: "Call Centre" },
							{ label: "Network Marketing", value: "Network Marketing" },
							{ label: "Face-to-Face", value: "Face-to-Face" },
						],
						colSpan: 2,
					},
					{
						name: "applicantDetails.collectionHistory.isNewToCollections",
						label: "Is the ultimate creditor new to collections?",
						type: "select",
						options: [
							{ label: "Yes", value: "yes" },
							{ label: "No", value: "no" },
						],
					},
					{
						name: "applicantDetails.collectionHistory.previousCollections",
						label: "Previously collected for other products/services?",
						type: "select",
						required: true,
						options: [
							{ label: "Yes", value: "yes" },
							{ label: "No", value: "no" },
						],
					},
					{
						name: "applicantDetails.collectionHistory.previousProductOrService",
						label: "If yes, product or service",
						type: "text",
					},
					{
						name: "applicantDetails.collectionHistory.previousShortName",
						label: "Previous abbreviated short name",
						type: "text",
					},
					{
						name: "applicantDetails.collectionHistory.collectingBureau",
						label: "Collecting bureau",
						type: "text",
					},
				],
			},
			{
				title: "Previous History",
				description: "Include any previous sponsoring bank history.",
				fields: [
					{
						name: "previousHistory.previousSponsoringBank",
						label: "Previous sponsoring bank",
						type: "text",
					},
					{
						name: "previousHistory.wasExited",
						label: "Has your business been exited from a sponsoring bank or bureau?",
						type: "select",
						required: true,
						options: [
							{ label: "Yes", value: "yes" },
							{ label: "No", value: "no" },
						],
					},
					{
						name: "previousHistory.exitReason",
						label: "If yes, select reason",
						type: "select",
						options: [
							{
								label: "Debiting without mandate",
								value: "Debiting without mandate",
							},
							{
								label: "Debiting without consent",
								value: "Debiting without consent",
							},
							{ label: "Other", value: "Other" },
						],
					},
					{
						name: "previousHistory.exitReasonOther",
						label: "Other reason",
						type: "text",
					},
				],
			},
			{
				title: "References",
				description: "Provide five reference numbers of Absa banked clients.",
				fields: [
					{
						name: "references",
						label: "Reference list",
						type: "repeatable",
						minItems: 5,
						addLabel: "Add reference",
						fields: [
							{ name: "name", label: "Name", type: "text", required: true },
							{
								name: "accountNumber",
								label: "Account number",
								type: "text",
								required: true,
							},
							{
								name: "reference",
								label: "Reference",
								type: "text",
								required: true,
							},
						],
					},
				],
			},
			{
				title: "Ratios & Metrics",
				fields: [
					{
						name: "ratiosAndMetrics.averageDisputeRatio",
						label: "Average dispute ratio (%)",
						type: "number",
					},
					{
						name: "ratiosAndMetrics.averageUnpaidRatio",
						label: "Average unpaid ratio (%)",
						type: "number",
					},
				],
			},
			{
				title: "Business Metrics",
				fields: [
					{
						name: "businessMetrics.salesEmployees",
						label: "Number of sales employees",
						type: "number",
					},
					{
						name: "businessMetrics.averageDebitOrderValue",
						label: "Average value per debit order",
						type: "number",
					},
					{
						name: "businessMetrics.presentBookSize",
						label: "Present book size (volume and value)",
						type: "text",
					},
					{
						name: "businessMetrics.yearsInOperation",
						label: "Years in operation",
						type: "text",
					},
					{
						name: "businessMetrics.sponsoredByAnotherBank",
						label: "Sponsored by another bank?",
						type: "select",
						required: true,
						options: [
							{ label: "Yes", value: "yes" },
							{ label: "No", value: "no" },
						],
					},
					{
						name: "businessMetrics.sponsoringBankName",
						label: "If yes, name of bank",
						type: "text",
					},
					{
						name: "businessMetrics.sponsoringPeriodYears",
						label: "Period (years)",
						type: "number",
					},
					{
						name: "businessMetrics.sponsoringPeriodMonths",
						label: "Period (months)",
						type: "number",
					},
					{
						name: "businessMetrics.litigationPending",
						label: "Litigation pending?",
						type: "select",
						required: true,
						options: [
							{ label: "Yes", value: "yes" },
							{ label: "No", value: "no" },
						],
					},
					{
						name: "businessMetrics.directorsUnderAdministration",
						label: "Directors under administration order?",
						type: "select",
						required: true,
						options: [
							{ label: "Yes", value: "yes" },
							{ label: "No", value: "no" },
						],
					},
					{
						name: "businessMetrics.formalComplaints",
						label: "Formal complaints lodged?",
						type: "select",
						required: true,
						options: [
							{ label: "Yes", value: "yes" },
							{ label: "No", value: "no" },
						],
					},
					{
						name: "businessMetrics.complianceConcerns",
						label: "Compliance concerns about client base?",
						type: "select",
						required: true,
						options: [
							{ label: "Yes", value: "yes" },
							{ label: "No", value: "no" },
						],
					},
				],
			},
			{
				title: "Bureau Details (if applicable)",
				fields: [
					{
						name: "bureauDetails.bureauName",
						label: "Bureau name",
						type: "text",
					},
					{ name: "bureauDetails.ldCode", label: "LD code", type: "text" },
					{
						name: "bureauDetails.bureauCif",
						label: "Bureau CIF",
						type: "text",
					},
				],
			},
			{
				title: "Additional Directors",
				fields: [
					{
						name: "additionalDirectors",
						label: "Additional directors",
						type: "repeatable",
						addLabel: "Add director",
						fields: [
							{
								name: "fullName",
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
						],
					},
				],
			},
			{
				title: "Document Checklist",
				fields: [
					{
						name: "documentChecklist.directorsIds",
						label: "Copy of directors IDs",
						type: "checkbox",
					},
					{
						name: "documentChecklist.businessAddressProof",
						label: "Proof of business address",
						type: "checkbox",
					},
					{
						name: "documentChecklist.bankStatements",
						label: "3 months bank statements",
						type: "checkbox",
					},
					{
						name: "documentChecklist.cipcDocuments",
						label: "Latest CIPC and registration documents",
						type: "checkbox",
					},
					{
						name: "documentChecklist.regulatedIndustryCertificates",
						label: "Certified copies of regulated industries (NCR, FSCA)",
						type: "checkbox",
					},
					{
						name: "documentChecklist.existingMandates",
						label: "Five mandates of existing clients",
						type: "checkbox",
					},
					{
						name: "documentChecklist.marketingMaterial",
						label: "Brochure or marketing material",
						type: "checkbox",
					},
				],
			},
			{
				title: "Declarations & Warranties",
				description: "Please confirm each statement to proceed with the assessment.",
				fields: [
					{
						name: "declarations.informationCorrect",
						label: "The information supplied is true and correct.",
						type: "checkbox",
						required: true,
					},
					{
						name: "declarations.misrepresentationAcknowledged",
						label: "Misrepresentation may result in legal action.",
						type: "checkbox",
						required: true,
					},
					{
						name: "declarations.debitingWithoutConsentAcknowledged",
						label: "Debiting without consent is a criminal offence.",
						type: "checkbox",
						required: true,
					},
					{
						name: "declarations.consentForProcessing",
						label: "Consent to Absa processing personal information.",
						type: "checkbox",
						required: true,
					},
					{
						name: "declarations.infoSharingAcknowledged",
						label: "Absa may share information with credit bureaus and regulators.",
						type: "checkbox",
						required: true,
					},
					{
						name: "declarations.tpppConsentConfirmed",
						label: "TPPP has obtained consent from the ultimate creditor.",
						type: "checkbox",
						required: true,
					},
					{
						name: "declarations.ultimateCreditorInformed",
						label: "The ultimate creditor is informed about data sharing.",
						type: "checkbox",
						required: true,
					},
				],
			},
			{
				title: "Signatures",
				fields: [
					{
						name: "signatures.clientName",
						label: "Client's name",
						type: "text",
						required: true,
					},
					{
						name: "signatures.clientSignature",
						label: "Client signature (typed)",
						type: "signature",
						required: true,
					},
					{
						name: "signatures.clientSignatureDate",
						label: "Date",
						type: "date",
						required: true,
					},
					{
						name: "signatures.mandatedOfficialName",
						label: "TPPP/SO mandated official",
						type: "text",
					},
					{
						name: "signatures.mandatedOfficialSignature",
						label: "Mandated official signature (typed)",
						type: "signature",
					},
					{
						name: "signatures.mandatedOfficialDate",
						label: "Mandated official date",
						type: "date",
					},
				],
			},
		],
		testData: {
			"applicantDetails.ultimateCreditorName": "Test Company (Pty) Ltd",
			"applicantDetails.preferredShortName": "TESTCO",
			"applicantDetails.alternativeShortNames.0": "TEST",
			"applicantDetails.alternativeShortNames.1": "TCO",
			"applicantDetails.alternativeShortNames.2": "TC",
			"applicantDetails.natureOfBusiness": "Software Development",
			"applicantDetails.companyRegistrationNumber": "2024/123456/07",
			"applicantDetails.applicationTypes": ["EFT", "DebiCheck"],
			"applicantDetails.directors": [
				{ fullName: "John Doe", idNumber: "8001015009087" },
				{ fullName: "Jane Smith", idNumber: "8505050050080" },
				{ fullName: "Bob Jones", idNumber: "9009095009081" },
			],
			"applicantDetails.physicalAddress.address": "123 Test Street",
			"applicantDetails.physicalAddress.suburb": "Testville",
			"applicantDetails.physicalAddress.city": "Test City",
			"applicantDetails.physicalAddress.postalCode": "1234",
			"applicantDetails.registeredAddress.address": "456 Reg Road",
			"applicantDetails.registeredAddress.suburb": "Regville",
			"applicantDetails.registeredAddress.city": "Reg City",
			"applicantDetails.registeredAddress.postalCode": "5678",
			"applicantDetails.contactInfo.telephone": "0111234567",
			"applicantDetails.contactInfo.email": "test@example.com",
			"applicantDetails.contactInfo.website": "https://example.com",
			"applicantDetails.bankingDetails.bankName": "Test Bank",
			"applicantDetails.bankingDetails.accountType": "Current",
			"applicantDetails.bankingDetails.branchCode": "123456",
			"applicantDetails.bankingDetails.accountNumber": "123456789",
			"applicantDetails.bankingDetails.sourceOfIncome": "Sales",
			"applicantDetails.salesDistribution": ["Direct Sales"],
			"applicantDetails.collectionHistory.isNewToCollections": "yes",
			"applicantDetails.collectionHistory.previousCollections": "no",
			"previousHistory.wasExited": "no",
			references: [
				{ name: "Ref 1", accountNumber: "111", reference: "Good" },
				{ name: "Ref 2", accountNumber: "222", reference: "Good" },
				{ name: "Ref 3", accountNumber: "333", reference: "Good" },
				{ name: "Ref 4", accountNumber: "444", reference: "Good" },
				{ name: "Ref 5", accountNumber: "555", reference: "Good" },
			],
			"businessMetrics.averageDisputeRatio": "1.5",
			"businessMetrics.averageUnpaidRatio": "2.0",
			"businessMetrics.salesEmployeesCount": "10",
			"businessMetrics.averageDebitOrderValue": "500",
			"businessMetrics.presentBookSize": "1000",
			"businessMetrics.businessOperationLength": "5 years",
			"businessMetrics.sponsoredByAnotherBank": "no",
			"businessMetrics.litigationPending": "no",
			"businessMetrics.directorsUnderAdministration": "no",
			"businessMetrics.formalComplaints": "no",
			"businessMetrics.complianceConcerns": "no",
		},
	},
	ACCOUNTANT_LETTER: {
		title: "Confirmation of Accounting Officer Letter",
		description:
			"This letter confirms the legitimacy of the business and the accounting officer's professional standing. Please complete all fields below.",
		schema: accountantLetterSchema,
		submitLabel: "Submit accountant letter",
		defaultValues: {
			confirmLegitimate: false,
		},
		sections: [
			{
				title: "Business Information",
				description:
					"The accounting officer confirms the following details for the business applying for a StratCol collections facility.",
				fields: [
					{
						name: "businessName",
						label: "Business name",
						type: "text",
						required: true,
						colSpan: 2,
					},
					{
						name: "physicalAddress",
						label: "Physical business address",
						type: "textarea",
						required: true,
						colSpan: 2,
					},
				],
			},
			{
				title: "Accounting Officer Details",
				description: "Provide the details of the accounting officer or auditor.",
				fields: [
					{
						name: "accountantName",
						label: "Full name of accounting officer / auditor",
						type: "text",
						required: true,
					},
					{
						name: "practiceNumber",
						label: "Practice registration number",
						type: "text",
						required: true,
					},
				],
			},
			{
				title: "Confirmation & Signature",
				description:
					"By signing below, you confirm that the above business is legitimate, operating as a going concern, and you are not aware of any investigation or pending legal action against the business.",
				fields: [
					{
						name: "confirmLegitimate",
						label:
							"I confirm the business is legitimate and I am not aware of any investigation or pending legal action against the business.",
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
			businessName: "Test Company (Pty) Ltd",
			physicalAddress: "123 Test Street, Sandton, 2196",
			accountantName: "John Accountant",
			practiceNumber: "PR-12345",
			confirmLegitimate: true,
			signatureName: "John Accountant",
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
