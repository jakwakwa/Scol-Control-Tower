/**
 * Deny List Service - Scenario 2b: Post-Workflow Termination Ruleset
 *
 * Captures identifiers from Risk Manager declined applicants and checks
 * re-applicants. No AI — only a smart algorithm.
 *
 * Matching rules: ID number, bank account, or cellphone number only.
 * Board member names are captured for audit/display but NOT used for
 * auto-match (high false-positive risk from name variations).
 */

import { desc, eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import {
	applicantSubmissions,
	applicants,
	internalForms,
	internalSubmissions,
	reApplicantAttempts,
	workflowTerminationDenyList,
} from "@/db/schema";
import type { KillSwitchReason } from "./kill-switch.service";

// ============================================
// Types
// ============================================

export interface DenyListIdentifiers {
	idNumbers: string[];
	cellphones: string[];
	bankAccounts: string[];
	boardMemberNames: string[];
}

export interface ReApplicantMatch {
	matchedDenyListId: number;
	matchedOn: "id_number" | "cellphone" | "bank_account";
	matchedValue: string;
}

// ============================================
// Normalization helpers (for consistent matching)
// ============================================

/** Normalize ID number: strip spaces, keep digits only for SA IDs */
function normalizeIdNumber(val: string | null | undefined): string | null {
	if (!val || typeof val !== "string") return null;
	const cleaned = val.replace(/\s/g, "").replace(/\D/g, "");
	return cleaned.length >= 6 ? cleaned : null;
}

/** Normalize phone: strip spaces, keep digits only */
function normalizePhone(val: string | null | undefined): string | null {
	if (!val || typeof val !== "string") return null;
	const cleaned = val.replace(/\s/g, "").replace(/\D/g, "");
	return cleaned.length >= 9 ? cleaned : null;
}

/** Normalize bank account: accountNumber + branchCode for uniqueness */
function normalizeBankAccount(
	accountNumber: string | null | undefined,
	branchCode?: string | null
): string | null {
	if (!accountNumber || typeof accountNumber !== "string") return null;
	const acct = accountNumber.replace(/\s/g, "").replace(/\D/g, "");
	const branch = (branchCode || "").toString().replace(/\s/g, "").replace(/\D/g, "");
	return acct.length >= 6 ? `${acct}:${branch || "0"}` : null;
}

// ============================================
// Capture identifiers on termination
// ============================================

/**
 * Extract identifiers from applicant and form submissions for deny list.
 * Sources: applicants table, applicantSubmissions (FACILITY_APPLICATION, ABSA_6995),
 * internalSubmissions (stratcol_agreement, facility_application, absa_6995).
 */
export async function extractDenyListIdentifiers(
	applicantId: number,
	workflowId: number
): Promise<DenyListIdentifiers> {
	const idNumbers: string[] = [];
	const cellphones: string[] = [];
	const bankAccounts: string[] = [];
	const boardMemberNames: string[] = [];

	const db = getDatabaseClient();
	if (!db) return { idNumbers, cellphones, bankAccounts, boardMemberNames };

	// 1. Applicant record
	const [applicant] = await db
		.select()
		.from(applicants)
		.where(eq(applicants.id, applicantId));

	if (applicant) {
		const nId = normalizeIdNumber(applicant.idNumber);
		if (nId) idNumbers.push(nId);
		const nPhone = normalizePhone(applicant.phone);
		if (nPhone) cellphones.push(nPhone);
		if (applicant.contactName?.trim()) boardMemberNames.push(applicant.contactName.trim());
	}

	// 2. Applicant submissions (magic link forms)
	const subs = await db
		.select({ formType: applicantSubmissions.formType, data: applicantSubmissions.data })
		.from(applicantSubmissions)
		.where(eq(applicantSubmissions.applicantId, applicantId));

	for (const s of subs) {
		try {
			const data = s.data ? (JSON.parse(s.data) as Record<string, unknown>) : null;
			if (!data) continue;

			// FACILITY_APPLICATION - ficaComparisonContext
			const fica = data.ficaComparisonContext as Record<string, unknown> | undefined;
			if (fica) {
				const nId = normalizeIdNumber(fica.idNumber as string);
				if (nId) idNumbers.push(nId);
				const nPhone = normalizePhone(fica.phone as string);
				if (nPhone) cellphones.push(nPhone);
			}

			// ABSA_6995 - sectionA.directors.directors, bankingDetails
			const sectionA = data.sectionA as Record<string, unknown> | undefined;
			if (sectionA) {
				const directors = (sectionA.directors as { directors?: Array<{ fullName?: string; idNumber?: string }> })
					?.directors ?? [];
				for (const d of directors) {
					if (d?.fullName?.trim()) boardMemberNames.push(d.fullName.trim());
					const nId = normalizeIdNumber(d?.idNumber);
					if (nId) idNumbers.push(nId);
				}
				const banking = sectionA.bankingDetails as { accountNumber?: string; branchCode?: string } | undefined;
				if (banking) {
					const nBank = normalizeBankAccount(banking.accountNumber, banking.branchCode);
					if (nBank) bankAccounts.push(nBank);
				}
			}

			// applicantDetails (alternative structure)
			const appDetails = data.applicantDetails as Record<string, unknown> | undefined;
			if (appDetails) {
				const directors = appDetails.directors as
					| { directors?: Array<{ fullName?: string; idNumber?: string }> }
					| undefined;
				if (directors?.directors) {
					for (const d of directors.directors) {
						if (d?.fullName?.trim()) boardMemberNames.push(d.fullName.trim());
						const nId = normalizeIdNumber(d?.idNumber);
						if (nId) idNumbers.push(nId);
					}
				}
				const banking = appDetails.bankingDetails as { accountNumber?: string; branchCode?: string } | undefined;
				if (banking) {
					const nBank = normalizeBankAccount(banking.accountNumber, banking.branchCode);
					if (nBank) bankAccounts.push(nBank);
				}
			}
		} catch {
			// Ignore parse errors
		}
	}

	// 3. Internal submissions (stratcol_agreement, facility_application, absa_6995)
	const internalFormsList = await db
		.select({ id: internalForms.id, formType: internalForms.formType })
		.from(internalForms)
		.where(eq(internalForms.workflowId, workflowId));

	for (const f of internalFormsList) {
		const [sub] = await db
			.select({ formData: internalSubmissions.formData })
			.from(internalSubmissions)
			.where(eq(internalSubmissions.internalFormId, f.id))
			.orderBy(desc(internalSubmissions.createdAt))
			.limit(1);

		if (!sub?.formData) continue;

		try {
			const formData = JSON.parse(sub.formData) as Record<string, unknown>;

			// Stratcol: signatoryAndOwners.beneficialOwners, bankingAndMandates
			const signatory = formData.signatoryAndOwners as Record<string, unknown> | undefined;
			if (signatory) {
				const owners = (signatory.beneficialOwners as Array<{ name?: string; idNumber?: string }>) ?? [];
				for (const o of owners) {
					if (o?.name?.trim()) boardMemberNames.push(o.name.trim());
					const nId = normalizeIdNumber(o?.idNumber);
					if (nId) idNumbers.push(nId);
				}
			}
			const banking = formData.bankingAndMandates as Record<string, unknown> | undefined;
			if (banking) {
				const credit = banking.creditBankAccount as { accountNumber?: string; branchCode?: string } | undefined;
				if (credit) {
					const nBank = normalizeBankAccount(credit.accountNumber, credit.branchCode);
					if (nBank) bankAccounts.push(nBank);
				}
				const debit = banking.debitBankAccount as { accountNumber?: string; branchCode?: string } | undefined;
				if (debit) {
					const nBank = normalizeBankAccount(debit.accountNumber, debit.branchCode);
					if (nBank) bankAccounts.push(nBank);
				}
			}

			// ABSA 6995 internal: sectionA.directors.directors, bankingDetails
			const sectionA = formData.sectionA as Record<string, unknown> | undefined;
			if (sectionA) {
				const directors = (sectionA.directors as { directors?: Array<{ fullName?: string; idNumber?: string }> })
					?.directors ?? [];
				for (const d of directors) {
					if (d?.fullName?.trim()) boardMemberNames.push(d.fullName.trim());
					const nId = normalizeIdNumber(d?.idNumber);
					if (nId) idNumbers.push(nId);
				}
				const banking = sectionA.bankingDetails as { accountNumber?: string; branchCode?: string } | undefined;
				if (banking) {
					const nBank = normalizeBankAccount(banking.accountNumber, banking.branchCode);
					if (nBank) bankAccounts.push(nBank);
				}
			}
		} catch {
			// Ignore parse errors
		}
	}

	// Deduplicate
	return {
		idNumbers: [...new Set(idNumbers)],
		cellphones: [...new Set(cellphones)],
		bankAccounts: [...new Set(bankAccounts)],
		boardMemberNames: [...new Set(boardMemberNames)],
	};
}

/**
 * Add a terminated workflow's identifiers to the deny list.
 * Call this when workflow is terminated due to Risk Manager decline (PROCUREMENT_DENIED)
 * or other sanction-list-related reasons.
 */
export async function addToDenyList(
	workflowId: number,
	applicantId: number,
	terminationReason: KillSwitchReason
): Promise<{ success: boolean; denyListId?: number; error?: string }> {
	const db = getDatabaseClient();
	if (!db) return { success: false, error: "Database connection failed" };

	// Only add for Risk Manager / sanction-related declines
	const addReasons: KillSwitchReason[] = [
		"PROCUREMENT_DENIED",
		"COMPLIANCE_VIOLATION",
		"FRAUD_DETECTED",
		"MANUAL_TERMINATION",
	];
	if (!addReasons.includes(terminationReason)) {
		return { success: true }; // Skip silently for timeouts etc.
	}

	const identifiers = await extractDenyListIdentifiers(applicantId, workflowId);

	// Require at least one identifier to add
	const hasAny =
		identifiers.idNumbers.length > 0 ||
		identifiers.cellphones.length > 0 ||
		identifiers.bankAccounts.length > 0 ||
		identifiers.boardMemberNames.length > 0;

	if (!hasAny) {
		return { success: true }; // Nothing to add
	}

	try {
		const [row] = await db
			.insert(workflowTerminationDenyList)
			.values({
				workflowId,
				applicantId,
				idNumbers: JSON.stringify(identifiers.idNumbers),
				cellphones: JSON.stringify(identifiers.cellphones),
				bankAccounts: JSON.stringify(identifiers.bankAccounts),
				boardMemberNames: JSON.stringify(identifiers.boardMemberNames),
				terminationReason,
			})
			.returning({ id: workflowTerminationDenyList.id });

		return { success: true, denyListId: row?.id };
	} catch (err) {
		console.error("[DenyList] Failed to add to deny list:", err);
		return {
			success: false,
			error: err instanceof Error ? err.message : "Unknown error",
		};
	}
}

// ============================================
// Re-applicant check
// ============================================

/**
 * Check if the applicant matches any entry in the deny list.
 * Returns the first match found (by ID, then cellphone, then bank account).
 * Board member names are stored for audit but not used for matching.
 */
export async function checkReApplicant(
	applicantId: number,
	workflowId: number
): Promise<ReApplicantMatch | null> {
	const db = getDatabaseClient();
	if (!db) return null;

	const identifiers = await extractDenyListIdentifiers(applicantId, workflowId);

	// Need at least one identifier to check
	const hasAny =
		identifiers.idNumbers.length > 0 ||
		identifiers.cellphones.length > 0 ||
		identifiers.bankAccounts.length > 0;
	if (!hasAny) return null;

	const allDenyEntries = await db.select().from(workflowTerminationDenyList);

	for (const entry of allDenyEntries) {
		// Skip if same applicant/workflow (avoid self-match)
		if (entry.applicantId === applicantId || entry.workflowId === workflowId) continue;

		const entryIds = JSON.parse(entry.idNumbers || "[]") as string[];
		const entryPhones = JSON.parse(entry.cellphones || "[]") as string[];
		const entryBanks = JSON.parse(entry.bankAccounts || "[]") as string[];

		for (const id of identifiers.idNumbers) {
			if (entryIds.includes(id)) {
				return {
					matchedDenyListId: entry.id,
					matchedOn: "id_number",
					matchedValue: id,
				};
			}
		}
		for (const phone of identifiers.cellphones) {
			if (entryPhones.includes(phone)) {
				return {
					matchedDenyListId: entry.id,
					matchedOn: "cellphone",
					matchedValue: phone,
				};
			}
		}
		for (const bank of identifiers.bankAccounts) {
			if (entryBanks.includes(bank)) {
				return {
					matchedDenyListId: entry.id,
					matchedOn: "bank_account",
					matchedValue: bank,
				};
			}
		}
	}

	return null;
}

// ============================================
// Log re-applicant attempt
// ============================================

/**
 * Log a re-applicant denial attempt to the database.
 * Call this when a re-applicant is detected and denied.
 */
export async function logReApplicantAttempt(params: {
	applicantId: number;
	workflowId: number;
	matchedDenyListId: number;
	matchedOn: "id_number" | "cellphone" | "bank_account";
	matchedValue: string;
}): Promise<{ success: boolean; error?: string }> {
	const db = getDatabaseClient();
	if (!db) return { success: false, error: "Database connection failed" };

	try {
		await db.insert(reApplicantAttempts).values({
			applicantId: params.applicantId,
			workflowId: params.workflowId,
			matchedDenyListId: params.matchedDenyListId,
			matchedOn: params.matchedOn,
			matchedValue: params.matchedValue,
		});
		return { success: true };
	} catch (err) {
		console.error("[DenyList] Failed to log re-applicant attempt:", err);
		return {
			success: false,
			error: err instanceof Error ? err.message : "Unknown error",
		};
	}
}
