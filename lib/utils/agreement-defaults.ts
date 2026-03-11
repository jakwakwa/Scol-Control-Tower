import type { StratcolAgreementForm } from "@/lib/validations/forms";

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

const STRATCOL_ENTITY_TYPES = [
	"Proprietor",
	"Company",
	"Close Corporation",
	"Partnership",
	"Other",
] as const;

function mapToStratcolEntityType(
	businessType?: string | null,
	entityType?: string | null
): (typeof STRATCOL_ENTITY_TYPES)[number] {
	const raw = (entityType || businessType || "").toLowerCase();
	if (raw.includes("proprietor")) return "Proprietor";
	if (raw.includes("company") && !raw.includes("close")) return "Company";
	if (raw.includes("close") || raw.includes("cc")) return "Close Corporation";
	if (raw.includes("partnership")) return "Partnership";
	return "Other";
}

function formatAddress(
	addr:
		| { address?: string; suburb?: string; city?: string; postalCode?: string }
		| null
		| undefined
): string {
	if (!addr) return "";
	const parts = [addr.address, addr.suburb, addr.city].filter(Boolean);
	const line = parts.join(", ");
	return addr.postalCode ? `${line} ${addr.postalCode}`.trim() : line.trim();
}

export function buildAgreementDefaults(options: {
	applicant: ApplicantRecord;
	facilitySubmission?: ApplicantSubmissionRecord | null;
	absaSubmission?: ApplicantSubmissionRecord | null;
}): Partial<StratcolAgreementForm> {
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
	// Support both legacy (applicantDetails) and internal (sectionA) ABSA shapes
	const sectionA = absaData?.sectionA as Record<string, unknown> | undefined;
	const legacyApplicantDetails =
		(absaData?.applicantDetails as Record<string, unknown> | undefined) ?? {};
	const absaApplicantDetails = sectionA?.applicantDetails
		? (sectionA.applicantDetails as Record<string, unknown>)
		: legacyApplicantDetails;
	const absaContactDetails = (sectionA?.contactDetails as Record<string, unknown> | undefined) ?? {};
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
	const absaDirectorsRaw =
		(absaApplicantDetails.directors as { directors?: Array<{ fullName?: string; idNumber?: string }> } | undefined)
			?.directors ??
		(absaApplicantDetails.directors as Array<{ fullName?: string; idNumber?: string }> | undefined) ??
		(sectionA?.directors as { directors?: Array<{ fullName?: string; idNumber?: string }> } | undefined)
			?.directors ??
		[];
	const absaDirectors = Array.isArray(absaDirectorsRaw) ? absaDirectorsRaw : [];
	const absaAdditional =
		(absaData?.additionalDirectors as
			| Array<{ fullName?: string; idNumber?: string }>
			| undefined) ?? [];

	const registeredName =
		(String(applicantDetails.registeredName) || applicant.companyName || "").trim() ||
		undefined;
	const tradingName =
		(
			String(applicantDetails.tradingName) ||
			applicant.tradingName ||
			applicant.companyName ||
			""
		).trim() || undefined;
	const registrationNumber =
		(
			String(applicantDetails.registrationOrIdNumber) ||
			applicant.registrationNumber ||
			""
		).trim() || undefined;
	const contactPerson = String(
		applicantDetails.contactPerson || applicant.contactName || ""
	).trim();
	const telephone =
		String(applicantDetails.telephone || applicant.phone || "").trim() || undefined;
	const entityType = mapToStratcolEntityType(
		applicant.businessType,
		applicant.entityType
	);

	const physicalAddr = formatAddress(
		absaPhysical as {
			address?: string;
			suburb?: string;
			city?: string;
			postalCode?: string;
		}
	);
	const registeredAddr = formatAddress(
		absaRegistered as {
			address?: string;
			suburb?: string;
			city?: string;
			postalCode?: string;
		}
	);
	const businessAddressLine = physicalAddr || registeredAddr || "";
	const postalAddressLine = registeredAddr || physicalAddr || businessAddressLine;
	const postalCode =
		(absaPhysical as { postalCode?: string })?.postalCode ||
		(absaRegistered as { postalCode?: string })?.postalCode ||
		"";

	const bankName = String(absaBanking.bankName || "").trim();
	const accountNumber = String(absaBanking.accountNumber || "").trim();
	const branchCode = String(absaBanking.branchCode || "").trim();
	const accountName = String(
		absaApplicantDetails.ultimateCreditorName || applicant.companyName || ""
	).trim();

	const hasBankDetails = bankName && accountNumber && branchCode && accountName;

	const creditBankAccount = hasBankDetails
		? {
				accountName,
				bankName,
				branch: "",
				branchCode,
				accountNumber,
			}
		: undefined;

	const debitBankAccount = hasBankDetails
		? {
				accountName,
				bankName,
				branch: "",
				branchCode,
				accountNumber,
			}
		: undefined;

	const beneficialOwners: Array<{
		name: string;
		idNumber: string;
		address: string;
		position: string;
		shareholdingPercent?: number;
	}> = [];
	for (const d of absaDirectors) {
		if (d?.fullName && d?.idNumber) {
			beneficialOwners.push({
				name: String(d.fullName).trim(),
				idNumber: String(d.idNumber).trim(),
				address: physicalAddr || registeredAddr || "—",
				position: "Director",
			});
		}
	}
	for (const d of absaAdditional) {
		if (d?.fullName && d?.idNumber) {
			beneficialOwners.push({
				name: String(d.fullName).trim(),
				idNumber: String(d.idNumber).trim(),
				address: physicalAddr || registeredAddr || "—",
				position: "Director",
			});
		}
	}

	const repName = contactPerson || applicant.contactName || "";
	const repId = String(applicant.idNumber || "").trim();
	const isCompanyEntity =
		entityType === "Company" ||
		entityType === "Close Corporation" ||
		entityType === "Partnership";

	const companyResolution =
		isCompanyEntity && repName && repId
			? {
					cityTown:
						(absaPhysical as { city?: string })?.city ||
						(absaRegistered as { city?: string })?.city ||
						"",
					date: undefined,
					resolvedName: repName,
					resolvedIdNumber: repId,
				}
			: undefined;

	const result: Partial<StratcolAgreementForm> = {
		registeredName: registeredName || applicant.companyName,
		proprietorName: entityType === "Proprietor" ? applicant.contactName : undefined,
		tradingName: tradingName || applicant.companyName,
		registrationNumber: registrationNumber || applicant.registrationNumber || "",
		entityType,
		telephone,
		businessAddress:
			businessAddressLine && postalCode
				? { address: businessAddressLine, postalCode }
				: businessAddressLine
					? { address: businessAddressLine, postalCode: "—" }
					: undefined,
		postalAddress:
			postalAddressLine && postalCode
				? { address: postalAddressLine, postalCode }
				: postalAddressLine
					? { address: postalAddressLine, postalCode: "—" }
					: undefined,
		authorisedRepresentative:
			repName && repId
				? { name: repName, idNumber: repId, position: "Director" }
				: undefined,
		companyResolution,
		beneficialOwners: beneficialOwners.length > 0 ? beneficialOwners : undefined,
		creditBankAccount,
		debitBankAccount,
		signatureName: applicant.contactName,
		signatureDate: undefined,
	};

	return result;
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
			entries.push({
				label,
				value: String(value),
			});
		}
	};

	push("Registered Name", defaults.registeredName);
	push("Trading Name", defaults.tradingName);
	push("Registration Number", defaults.registrationNumber);
	push("Entity Type", defaults.entityType);
	push("Telephone", defaults.telephone);
	push("Contact / Signatory", defaults.signatureName);
	push("ID Number", defaults.authorisedRepresentative?.idNumber);

	if (defaults.businessAddress) {
		push("Business Address", defaults.businessAddress.address);
		push("Business Postal Code", defaults.businessAddress.postalCode);
	}
	if (defaults.postalAddress) {
		push("Postal Address", defaults.postalAddress.address);
		push("Postal Code", defaults.postalAddress.postalCode);
	}

	push("Authorised Representative", defaults.authorisedRepresentative?.name);
	push("Position", defaults.authorisedRepresentative?.position);

	if (defaults.creditBankAccount) {
		push("Bank Name", defaults.creditBankAccount.bankName);
		push("Account Name", defaults.creditBankAccount.accountName);
		push("Account Number", defaults.creditBankAccount.accountNumber);
		push("Branch Code", defaults.creditBankAccount.branchCode);
	}

	if (defaults.beneficialOwners && defaults.beneficialOwners.length > 0) {
		defaults.beneficialOwners.forEach((owner, i) => {
			push(`Beneficial Owner ${i + 1}`, owner.name);
			push(`Beneficial Owner ${i + 1} ID`, owner.idNumber);
		});
	}

	return entries;
}
