import type { StratcolAgreementFormData } from "@/lib/validations/onboarding";
import { EntityType } from "@/lib/validations/onboarding";

export const agreementPreviewFieldLabels = {
	registeredName: "Registered Name",
	tradingName: "Trading Name",
	registrationNumber: "Registration Number",
	entityType: "Entity Type",
	businessAddress: "Business Address",
	businessPostalCode: "Business Postal Code",
	postalAddress: "Postal Address",
	postalPostalCode: "Postal Postal Code",
	authorisedRepresentative: "Authorised Representative",
	idNumber: "ID Number",
	bankName: "Bank Name",
	accountNumber: "Account Number",
	beneficialOwner1: "Beneficial Owner 1",
	beneficialOwner1Id: "Beneficial Owner 1 ID",
	beneficialOwner2: "Beneficial Owner 2",
	beneficialOwner2Id: "Beneficial Owner 2 ID",
	beneficialOwner3: "Beneficial Owner 3",
	beneficialOwner3Id: "Beneficial Owner 3 ID",
	beneficialOwner4: "Beneficial Owner 4",
	beneficialOwner4Id: "Beneficial Owner 4 ID",
} as const;

export type AgreementPreviewFieldKey = keyof typeof agreementPreviewFieldLabels;
export type AgreementContractOverrides = Partial<
	Record<AgreementPreviewFieldKey, string>
>;

export type AgreementPreviewEntry = {
	key: AgreementPreviewFieldKey;
	label: string;
	value: string;
};

interface ApplicantRecord {
	companyName: string;
	tradingName?: string | null;
	registrationNumber?: string | null;
	contactName: string;
	idNumber?: string | null;
	email?: string | null;
	phone?: string | null;
	businessType?: string | null;
	entityType?: string | null;
	industry?: string | null;
}

interface ApplicantSubmissionRecord {
	formType: string;
	data?: string | null;
}

function mapToStratcolEntityType(
	businessType?: string | null,
	entityType?: string | null
): StratcolAgreementFormData["entityDetails"]["entityType"] {
	const raw = (entityType || businessType || "").toLowerCase();
	if (raw.includes("proprietor")) return EntityType.PROPRIETOR;
	if (raw.includes("company") && !raw.includes("close")) return EntityType.COMPANY;
	if (raw.includes("close") || raw.includes("cc")) return EntityType.CLOSE_CORPORATION;
	if (raw.includes("partnership")) return EntityType.PARTNERSHIP;
	return EntityType.OTHER;
}

function mapEntityTypeOverride(
	value: string
): StratcolAgreementFormData["entityDetails"]["entityType"] {
	const raw = value.trim().toLowerCase();
	if (raw.includes("proprietor")) return EntityType.PROPRIETOR;
	if (raw.includes("close") || raw.includes("cc")) return EntityType.CLOSE_CORPORATION;
	if (raw.includes("company")) return EntityType.COMPANY;
	if (raw.includes("partnership")) return EntityType.PARTNERSHIP;
	return EntityType.OTHER;
}

function clean(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function fallbackAddressLine(value: string, fallback = "Unknown"): string {
	return value || fallback;
}

function parseAddressParts(
	value: unknown
): { address: string; suburb: string; townCity: string } | null {
	const line = clean(value);
	if (!line) return null;
	const parts = line.split(",").map(part => part.trim()).filter(Boolean);
	return {
		address: fallbackAddressLine(parts[0] || line),
		suburb: fallbackAddressLine(parts[1] || parts[0] || line),
		townCity: fallbackAddressLine(parts[2] || parts[1] || parts[0] || line),
	};
}

function applyContractOverrides(
	defaults: Partial<StratcolAgreementFormData>,
	contractOverrides?: AgreementContractOverrides | null
): Partial<StratcolAgreementFormData> {
	if (!contractOverrides) return defaults;

	const entityDetails: Partial<
		NonNullable<StratcolAgreementFormData["entityDetails"]>
	> = {
		...(defaults.entityDetails ?? {}),
	};
	if (contractOverrides.registeredName) {
		entityDetails.registeredName = contractOverrides.registeredName;
	}
	if (contractOverrides.tradingName) {
		entityDetails.tradingName = contractOverrides.tradingName;
	}
	if (contractOverrides.registrationNumber) {
		entityDetails.registrationNumber = contractOverrides.registrationNumber;
	}
	if (contractOverrides.entityType) {
		entityDetails.entityType = mapEntityTypeOverride(contractOverrides.entityType);
	}
	if (contractOverrides.businessAddress) {
		entityDetails.businessAddress = {
			...(entityDetails.businessAddress ?? {
				address: "",
				suburb: "",
				townCity: "",
				postalCode: "0000",
			}),
			address: contractOverrides.businessAddress,
		};
	}
	if (contractOverrides.businessPostalCode) {
		entityDetails.businessAddress = {
			...(entityDetails.businessAddress ?? {
				address: "",
				suburb: "",
				townCity: "",
				postalCode: "0000",
			}),
			postalCode: contractOverrides.businessPostalCode,
		};
	}
	if (contractOverrides.postalAddress) {
		entityDetails.postalAddress = {
			...(entityDetails.postalAddress ?? {
				address: "",
				suburb: "",
				townCity: "",
				postalCode: "0000",
			}),
			address: contractOverrides.postalAddress,
		};
	}
	if (contractOverrides.postalPostalCode) {
		entityDetails.postalAddress = {
			...(entityDetails.postalAddress ?? {
				address: "",
				suburb: "",
				townCity: "",
				postalCode: "0000",
			}),
			postalCode: contractOverrides.postalPostalCode,
		};
	}
	defaults.entityDetails =
		entityDetails as StratcolAgreementFormData["entityDetails"];

	const signatoryAndOwners: Partial<
		NonNullable<StratcolAgreementFormData["signatoryAndOwners"]>
	> = {
		...(defaults.signatoryAndOwners ?? {}),
	};
	if (contractOverrides.authorisedRepresentative || contractOverrides.idNumber) {
		signatoryAndOwners.authorisedRepresentative = {
			name:
				contractOverrides.authorisedRepresentative ||
				signatoryAndOwners.authorisedRepresentative?.name ||
				"",
			idNumber:
				contractOverrides.idNumber ||
				signatoryAndOwners.authorisedRepresentative?.idNumber ||
				"",
			position: signatoryAndOwners.authorisedRepresentative?.position || "Director",
		};
	}

	const ownerPairs: Array<[AgreementPreviewFieldKey, AgreementPreviewFieldKey]> = [
		["beneficialOwner1", "beneficialOwner1Id"],
		["beneficialOwner2", "beneficialOwner2Id"],
		["beneficialOwner3", "beneficialOwner3Id"],
		["beneficialOwner4", "beneficialOwner4Id"],
	];
	const owners = [...(signatoryAndOwners.beneficialOwners ?? [])];
	ownerPairs.forEach(([nameKey, idKey], index) => {
		const overrideName = contractOverrides[nameKey];
		const overrideId = contractOverrides[idKey];
		if (!overrideName && !overrideId) return;

		const existing = owners[index] ?? {
			name: "",
			idNumber: "",
			address:
				defaults.entityDetails?.businessAddress?.address ||
				defaults.entityDetails?.postalAddress?.address ||
				"Unknown",
			position: "Director",
			shareholdingPercentage: "5",
		};
		owners[index] = {
			...existing,
			name: overrideName || existing.name,
			idNumber: overrideId || existing.idNumber,
		};
	});
	if (owners.length > 0) {
		signatoryAndOwners.beneficialOwners = owners;
	}
	defaults.signatoryAndOwners =
		signatoryAndOwners as StratcolAgreementFormData["signatoryAndOwners"];

	if (defaults.bankingAndMandates) {
		if (contractOverrides.bankName) {
			defaults.bankingAndMandates.creditBankAccount.bankName =
				contractOverrides.bankName;
			defaults.bankingAndMandates.debitBankAccount.bankName =
				contractOverrides.bankName;
		}
		if (contractOverrides.accountNumber) {
			defaults.bankingAndMandates.creditBankAccount.accountNumber =
				contractOverrides.accountNumber;
			defaults.bankingAndMandates.debitBankAccount.accountNumber =
				contractOverrides.accountNumber;
		}
	}

	return defaults;
}

export function buildAgreementDefaults(options: {
	applicant: ApplicantRecord;
	facilitySubmission?: ApplicantSubmissionRecord | null;
	absaSubmission?: ApplicantSubmissionRecord | null;
	contractOverrides?: AgreementContractOverrides | null;
}): Partial<StratcolAgreementFormData> {
	const { applicant, facilitySubmission, absaSubmission, contractOverrides } = options;

	let facilityData: Record<string, unknown> | null = null;
	if (facilitySubmission?.data) {
		try {
			facilityData = JSON.parse(facilitySubmission.data) as Record<string, unknown>;
		} catch {
			facilityData = null;
		}
	}

	let absaData: Record<string, unknown> | null = null;
	if (absaSubmission?.data) {
		try {
			absaData = JSON.parse(absaSubmission.data) as Record<string, unknown>;
		} catch {
			absaData = null;
		}
	}

	const applicantDetails =
		(facilityData?.applicantDetails as Record<string, unknown> | undefined) ?? {};
	const sectionA = absaData?.sectionA as Record<string, unknown> | undefined;
	const legacyApplicantDetails =
		(absaData?.applicantDetails as Record<string, unknown> | undefined) ?? {};
	const absaApplicantDetails = sectionA?.applicantDetails
		? (sectionA.applicantDetails as Record<string, unknown>)
		: legacyApplicantDetails;
	const absaContactDetails =
		(sectionA?.contactDetails as Record<string, unknown> | undefined) ?? {};
	const absaBanking =
		(absaApplicantDetails.bankingDetails as Record<string, unknown> | undefined) ??
		(sectionA?.bankingDetails as Record<string, unknown> | undefined) ??
		{};
	const absaPhysical =
		(absaApplicantDetails.physicalAddress as Record<string, unknown> | undefined) ??
		(absaContactDetails.physicalAddress as Record<string, unknown> | undefined) ??
		{};
	const absaRegistered =
		(absaApplicantDetails.registeredAddress as Record<string, unknown> | undefined) ??
		(absaContactDetails.cipcRegisteredAddress as Record<string, unknown> | undefined) ??
		{};

	const physicalAddressLine = [
		clean(absaPhysical.address),
		clean(absaPhysical.suburb),
		clean(absaPhysical.city),
	]
		.filter(Boolean)
		.join(", ");
	const registeredAddressLine = [
		clean(absaRegistered.address),
		clean(absaRegistered.suburb),
		clean(absaRegistered.city),
	]
		.filter(Boolean)
		.join(", ");
	const fallbackPhysicalAddress = parseAddressParts(physicalAddressLine);
	const fallbackRegisteredAddress = parseAddressParts(registeredAddressLine);
	const defaultBusinessAddress = fallbackPhysicalAddress ?? fallbackRegisteredAddress;
	const defaultPostalAddress = fallbackRegisteredAddress ?? fallbackPhysicalAddress;

	const physicalPostalCode = clean(absaPhysical.postalCode);
	const registeredPostalCode = clean(absaRegistered.postalCode);
	const resolvedPostalCode = physicalPostalCode || registeredPostalCode || "0000";

	const registeredName =
		clean(applicantDetails.registeredName) || clean(applicant.companyName) || undefined;
	const tradingName =
		clean(applicantDetails.tradingName) ||
		clean(applicant.tradingName) ||
		clean(applicant.companyName) ||
		undefined;
	const registrationNumber =
		clean(applicantDetails.registrationOrIdNumber) ||
		clean(applicant.registrationNumber) ||
		undefined;
	const contactPerson = clean(applicantDetails.contactPerson) || clean(applicant.contactName);
	const entityType = mapToStratcolEntityType(applicant.businessType, applicant.entityType);
	const idNumber = clean(applicant.idNumber);

	const absaDirectorsRaw =
		(absaApplicantDetails.directors as
			| { directors?: Array<{ fullName?: string; idNumber?: string }> }
			| undefined)?.directors ??
		(absaApplicantDetails.directors as
			| Array<{ fullName?: string; idNumber?: string }>
			| undefined) ??
		(sectionA?.directors as
			| { directors?: Array<{ fullName?: string; idNumber?: string }> }
			| undefined)?.directors ??
		[];
	const absaDirectors = Array.isArray(absaDirectorsRaw) ? absaDirectorsRaw : [];
	const absaAdditional =
		(absaData?.additionalDirectors as
			| Array<{ fullName?: string; idNumber?: string }>
			| undefined) ?? [];

	const beneficialOwners = [...absaDirectors, ...absaAdditional]
		.filter(owner => clean(owner?.fullName) && clean(owner?.idNumber))
		.map(owner => ({
			name: clean(owner.fullName),
			idNumber: clean(owner.idNumber),
			address: defaultBusinessAddress?.address || "Unknown",
			position: "Director",
			shareholdingPercentage: "5",
		}));

	const bankName = clean(absaBanking.bankName);
	const accountNumber = clean(absaBanking.accountNumber);
	const branchCode = clean(absaBanking.branchCode);
	const accountName =
		clean(absaApplicantDetails.ultimateCreditorName) || clean(applicant.companyName);
	const accountType = clean(absaBanking.accountType) || "Current";
	const hasBankDetails = bankName && accountNumber && branchCode && accountName;

	const defaults: Partial<StratcolAgreementFormData> = {
		entityDetails: {
			registeredName,
			proprietorName: entityType === EntityType.PROPRIETOR ? contactPerson : undefined,
			tradingName,
			registrationNumber,
			entityType,
			businessAddress: defaultBusinessAddress
				? {
						...defaultBusinessAddress,
						postalCode: resolvedPostalCode,
					}
				: undefined,
			postalAddress: defaultPostalAddress
				? {
						...defaultPostalAddress,
						postalCode: resolvedPostalCode,
					}
				: undefined,
			durationAtAddress: undefined,
			industryTenure: clean(applicant.industry) || undefined,
		},
		signatoryAndOwners: {
			authorisedRepresentative:
				contactPerson && idNumber
					? {
							name: contactPerson,
							idNumber,
							position: "Director",
						}
					: undefined,
			beneficialOwners: beneficialOwners.length > 0 ? beneficialOwners : undefined,
		},
		bankingAndMandates: hasBankDetails
			? {
					creditBankAccount: {
						accountName,
						bankName,
						accountType,
						branchCode,
						accountNumber,
					},
					debitBankAccount: {
						accountName,
						bankName,
						accountType,
						branchCode,
						accountNumber,
					},
					useSameAccountForDebit: true,
				}
			: undefined,
		signature: {
			name: clean(applicant.contactName) || undefined,
			signature: undefined,
			date: undefined,
		},
	};

	return applyContractOverrides(defaults, contractOverrides);
}

export function buildAgreementPreviewEntries(
	applicant: ApplicantRecord,
	applicantSubmissions: ApplicantSubmissionRecord[],
	contractOverrides?: AgreementContractOverrides | null
): AgreementPreviewEntry[] {
	const facility = applicantSubmissions.find(s => s.formType === "FACILITY_APPLICATION");
	const absa = applicantSubmissions.find(s => s.formType === "ABSA_6995");

	const defaults = buildAgreementDefaults({
		applicant,
		facilitySubmission: facility ?? null,
		absaSubmission: absa ?? null,
		contractOverrides,
	});

	const entries: AgreementPreviewEntry[] = [];
	const push = (key: AgreementPreviewFieldKey, value: unknown) => {
		if (value != null && value !== "") {
			entries.push({
				key,
				label: agreementPreviewFieldLabels[key],
				value: String(value),
			});
		}
	};

	push("registeredName", defaults.entityDetails?.registeredName);
	push("tradingName", defaults.entityDetails?.tradingName);
	push("registrationNumber", defaults.entityDetails?.registrationNumber);
	push("entityType", defaults.entityDetails?.entityType);
	push("businessAddress", defaults.entityDetails?.businessAddress?.address);
	push("businessPostalCode", defaults.entityDetails?.businessAddress?.postalCode);
	push("postalAddress", defaults.entityDetails?.postalAddress?.address);
	push("postalPostalCode", defaults.entityDetails?.postalAddress?.postalCode);
	push(
		"authorisedRepresentative",
		defaults.signatoryAndOwners?.authorisedRepresentative?.name
	);
	push("idNumber", defaults.signatoryAndOwners?.authorisedRepresentative?.idNumber);
	push("bankName", defaults.bankingAndMandates?.creditBankAccount?.bankName);
	push("accountNumber", defaults.bankingAndMandates?.creditBankAccount?.accountNumber);

	if (defaults.signatoryAndOwners?.beneficialOwners?.length) {
		const nameKeys: AgreementPreviewFieldKey[] = [
			"beneficialOwner1",
			"beneficialOwner2",
			"beneficialOwner3",
			"beneficialOwner4",
		];
		const idKeys: AgreementPreviewFieldKey[] = [
			"beneficialOwner1Id",
			"beneficialOwner2Id",
			"beneficialOwner3Id",
			"beneficialOwner4Id",
		];
		defaults.signatoryAndOwners.beneficialOwners.forEach((owner, index) => {
			const nameKey = nameKeys[index];
			const idKey = idKeys[index];
			if (nameKey) push(nameKey, owner.name);
			if (idKey) push(idKey, owner.idNumber);
		});
	}

	return entries;
}
