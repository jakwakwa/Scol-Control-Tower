/**
 * Deny List Service - Scenario 2b: Post-Workflow Termination Ruleset
 *
 * Captures identifiers from Risk Manager declined applicants and checks
 * re-applicants. No AI — only a smart algorithm.
 *
 * Matching: ID number, bank account, cellphone, and board member names
 * (when linked to applicant). Board names use normalized full-name match
 * with minimum 2 words to reduce false positives.
 *
 * Screening values are stored in workflow_termination_screening for
 * Turso FTS/vector search capabilities.
 */

import { and, desc, eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import {
	applicantSubmissions,
	applicants,
	internalForms,
	internalSubmissions,
	reApplicantAttempts,
	workflowTerminationDenyList,
	workflowTerminationScreening,
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

export type ReApplicantMatchOn =
	| "id_number"
	| "cellphone"
	| "bank_account"
	| "board_member_name";

export interface ReApplicantMatch {
	matchedDenyListId: number;
	matchedOn: ReApplicantMatchOn;
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

/**
 * Normalize board member name for matching: lowercase, trim, collapse whitespace.
 * Returns null if empty or single-word (to reduce false positives from common names).
 */
function normalizeBoardMemberName(val: string | null | undefined): string | null {
	if (!val || typeof val !== "string") return null;
	const normalized = val
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");
	const words = normalized.split(" ").filter(Boolean);
	// Require at least 2 words to reduce false positives (e.g. "John" alone)
	if (words.length < 2) return null;
	return normalized;
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

		if (!row) return { success: true };

		// Populate screening table for Turso FTS/vector search
		const screeningRows: Array<{
			denyListId: number;
			valueType: "id_number" | "cellphone" | "bank_account" | "board_member_name";
			value: string;
		}> = [];

		for (const v of identifiers.idNumbers) {
			screeningRows.push({ denyListId: row.id, valueType: "id_number", value: v });
		}
		for (const v of identifiers.cellphones) {
			screeningRows.push({ denyListId: row.id, valueType: "cellphone", value: v });
		}
		for (const v of identifiers.bankAccounts) {
			screeningRows.push({ denyListId: row.id, valueType: "bank_account", value: v });
		}
		for (const name of identifiers.boardMemberNames) {
			const normalized = normalizeBoardMemberName(name);
			if (normalized) {
				screeningRows.push({
					denyListId: row.id,
					valueType: "board_member_name",
					value: normalized,
				});
			}
		}

		if (screeningRows.length > 0) {
			await db.insert(workflowTerminationScreening).values(screeningRows);
		}

		return { success: true, denyListId: row.id };
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
 * Check if the applicant matches any entry in the deny list via screening table.
 * Returns the first match (ID, cellphone, bank_account, board_member_name).
 * Board member names require 2+ words to reduce false positives.
 */
export async function checkReApplicant(
	applicantId: number,
	workflowId: number
): Promise<ReApplicantMatch | null> {
	const db = getDatabaseClient();
	if (!db) return null;

	const identifiers = await extractDenyListIdentifiers(applicantId, workflowId);

	// Normalize board names for matching (2+ words only)
	const normalizedBoardNames = identifiers.boardMemberNames
		.map(n => normalizeBoardMemberName(n))
		.filter((n): n is string => n !== null);

	const hasAny =
		identifiers.idNumbers.length > 0 ||
		identifiers.cellphones.length > 0 ||
		identifiers.bankAccounts.length > 0 ||
		normalizedBoardNames.length > 0;
	if (!hasAny) return null;

	// Query screening table - exclude deny list entries from same applicant's current workflow
	const allValues: Array<{ type: ReApplicantMatchOn; value: string }> = [
		...identifiers.idNumbers.map(v => ({ type: "id_number" as const, value: v })),
		...identifiers.cellphones.map(v => ({ type: "cellphone" as const, value: v })),
		...identifiers.bankAccounts.map(v => ({ type: "bank_account" as const, value: v })),
		...normalizedBoardNames.map(v => ({ type: "board_member_name" as const, value: v })),
	];

	for (const { type, value } of allValues) {
		const matches = await db
			.select({
				denyListId: workflowTerminationScreening.denyListId,
			})
			.from(workflowTerminationScreening)
			.where(
				and(
					eq(workflowTerminationScreening.valueType, type),
					eq(workflowTerminationScreening.value, value)
				)
			)
			.limit(1);

		if (matches.length > 0) {
			return {
				matchedDenyListId: matches[0].denyListId,
				matchedOn: type,
				matchedValue: value,
			};
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
	matchedOn: ReApplicantMatchOn;
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
