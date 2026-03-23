import type { StratcolAgreementFormData } from "@/lib/validations/onboarding";
import { EntityType } from "@/lib/validations/onboarding";

export type AgreementPreviewEntry = { label: string; value: string };

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

export function buildAgreementDefaults(options: {
	applicant: ApplicantRecord;
	facilitySubmission?: ApplicantSubmissionRecord | null;
	absaSubmission?: ApplicantSubmissionRecord | null;
}): Partial<StratcolAgreementFormData> {
	const { applicant, facilitySubmission, absaSubmission } = options;

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

	return {
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
}

export function buildAgreementPreviewEntries(
	applicant: ApplicantRecord,
	applicantSubmissions: ApplicantSubmissionRecord[]
): AgreementPreviewEntry[] {
	const facility = applicantSubmissions.find(s => s.formType === "FACILITY_APPLICATION");
	const absa = applicantSubmissions.find(s => s.formType === "ABSA_6995");

	const defaults = buildAgreementDefaults({
		applicant,
		facilitySubmission: facility ?? null,
		absaSubmission: absa ?? null,
	});

	const entries: AgreementPreviewEntry[] = [];
	const push = (label: string, value: unknown) => {
		if (value != null && value !== "") {
			entries.push({ label, value: String(value) });
		}
	};

	push("Registered Name", defaults.entityDetails?.registeredName);
	push("Trading Name", defaults.entityDetails?.tradingName);
	push("Registration Number", defaults.entityDetails?.registrationNumber);
	push("Entity Type", defaults.entityDetails?.entityType);
	push("Business Address", defaults.entityDetails?.businessAddress?.address);
	push("Business Postal Code", defaults.entityDetails?.businessAddress?.postalCode);
	push("Postal Address", defaults.entityDetails?.postalAddress?.address);
	push("Postal Postal Code", defaults.entityDetails?.postalAddress?.postalCode);
	push(
		"Authorised Representative",
		defaults.signatoryAndOwners?.authorisedRepresentative?.name
	);
	push("ID Number", defaults.signatoryAndOwners?.authorisedRepresentative?.idNumber);
	push(
		"Bank Name",
		defaults.bankingAndMandates?.creditBankAccount?.bankName
	);
	push(
		"Account Number",
		defaults.bankingAndMandates?.creditBankAccount?.accountNumber
	);

	if (defaults.signatoryAndOwners?.beneficialOwners?.length) {
		defaults.signatoryAndOwners.beneficialOwners.forEach((owner, index) => {
			push(`Beneficial Owner ${index + 1}`, owner.name);
			push(`Beneficial Owner ${index + 1} ID`, owner.idNumber);
		});
	}

	return entries;
}
