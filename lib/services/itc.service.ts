/**
 * ITC Service
 *
 * Integrates with ProcureCheck Business Credit API for real credit checks.
 * Returns manual-required degraded results when provider is unavailable.
 *
 * Business Logic:
 * - Score >= AUTO_APPROVE: fast-track approval
 * - Score >= MANUAL_REVIEW: manual review required
 * - Score < AUTO_DECLINE: automatic decline
 */

import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { applicants } from "@/db/schema";
import { ITC_THRESHOLDS, type ITCCheckResult } from "@/lib/types";
import {
	mapProcureCheckRiskCategory,
	mapProcureCheckScore,
	type ProcureCheckBusinessCreditResponse,
	type ProcureCheckTokenResponse,
} from "./procure-check.types";
import { performXDSCreditCheck } from "./xds.service";

// ============================================
// Configuration
// ============================================

const PROCURECHECK_CONFIG = {
	clientId: process.env.PROCURECHECK_USERNAME,
	clientSecret: process.env.PROCURECHECK_PASSWORD,
	apiUrl: process.env.PROCURECHECK_BASE_URL || "",
};

// Token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

// ============================================
// Types
// ============================================

export interface ITCCheckOptions {
	/** Applicant ID to check */
	applicantId: number;
	/** Workflow ID for tracking */
	workflowId: number;
	/** Company registration number (optional, fetched from applicant if not provided) */
	registrationNumber?: string;
}

// ============================================
// Main Function
// ============================================

/**
 * Perform ITC credit check for an applicant
 */
export async function performITCCheck(options: ITCCheckOptions): Promise<ITCCheckResult> {
	const { applicantId } = options;
	const useXDS = process.env.ENABLE_XDS_ITC === "true";

	if (useXDS) {
		return performXDSCreditCheck(options);
	}

	// Fetch applicant data
	const db = getDatabaseClient();
	let applicantData = null;

	if (db) {
		try {
			const applicantResults = await db
				.select()
				.from(applicants)
				.where(eq(applicants.id, applicantId));
			if (applicantResults.length > 0) {
				applicantData = applicantResults[0];
			}
		} catch (err) {
			console.error("[ITCService] Failed to fetch applicant:", err);
			throw new Error(
				`Failed to fetch applicant data: ${err instanceof Error ? err.message : String(err)}`
			);
		}
	}

	if (!applicantData) {
		throw new Error(`[ITCService] Applicant ${applicantId} not found`);
	}

	// Check if ProcureCheck is configured
	if (isProcureCheckConfigured()) {
		try {
			const isProprietor = applicantData.entityType === "proprietor";
			const identifier = isProprietor
				? applicantData.idNumber
				: options.registrationNumber || extractRegistrationNumber(applicantData);

			if (identifier) {
				return await performProcureCheckCheck(identifier, applicantId, isProprietor);
			}
			console.warn(
				`[ITCService] Applicant ${applicantId} has no identifier for lookup. Returning manual-required ITC result.`
			);
			return createManualRequiredResult(
				applicantId,
				"No identifier (ID or Reg No) found for ITC lookup",
				"registration_data"
			);
		} catch (err) {
			console.error("[ITCService] ProcureCheck API failed:", err);
			return createManualRequiredResult(
				applicantId,
				`ProcureCheck API failed: ${err instanceof Error ? err.message : String(err)}`,
				"procureCheck"
			);
		}
	}

	console.warn(
		`[ITCService] ProcureCheck is not configured for applicant ${applicantId}. Returning manual-required ITC result.`
	);
	return createManualRequiredResult(
		applicantId,
		"ProcureCheck API is not configured",
		"configuration"
	);
}

function createManualRequiredResult(
	applicantId: number,
	reason: string,
	source: "procureCheck" | "configuration" | "registration_data"
): ITCCheckResult {
	return {
		creditScore: 0,
		riskCategory: "HIGH",
		passed: false,
		recommendation: "MANUAL_REVIEW",
		adverseListings: [],
		checkedAt: new Date(),
		referenceNumber: `ITC-MANUAL-${applicantId}-${Date.now()}`,
		rawResponse: {
			status: "manual_required",
			source,
			reason,
		},
	};
}

// ============================================
// ProcureCheck Integration
// ============================================

/**
 * Check if ProcureCheck API is configured
 */
function isProcureCheckConfigured(): boolean {
	return !!(PROCURECHECK_CONFIG.clientId && PROCURECHECK_CONFIG.clientSecret);
}

/**
 * Get ProcureCheck OAuth2 token
 */
async function getProcureCheckToken(): Promise<string> {
	// Return cached token if valid
	if (cachedToken && cachedToken.expiresAt > Date.now()) {
		return cachedToken.token;
	}

	const response = await fetch(`${PROCURECHECK_CONFIG.apiUrl}/oauth2/v1/token`, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			grant_type: "client_credentials",
			client_id: PROCURECHECK_CONFIG.clientId!,
			client_secret: PROCURECHECK_CONFIG.clientSecret!,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`ProcureCheck auth failed: ${response.status} - ${error}`);
	}

	const data = (await response.json()) as ProcureCheckTokenResponse;

	// Cache token (with 5 minute buffer)
	cachedToken = {
		token: data.access_token,
		expiresAt: Date.now() + (data.expires_in - 300) * 1000,
	};

	return data.access_token;
}

/**
 * Perform real ProcureCheck credit check
 */
async function performProcureCheckCheck(
	identifier: string,
	applicantId: number,
	isProprietor: boolean = false
): Promise<ITCCheckResult> {
	const token = await getProcureCheckToken();

	const endpoint = isProprietor ? "individual/v1/credit" : "business/v1/credit";
	const payload = isProprietor
		? { idNumber: identifier, country: "ZA" }
		: { registrationNumber: identifier, country: "ZA" };

	const response = await fetch(`${PROCURECHECK_CONFIG.apiUrl}/${endpoint}`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`ProcureCheck credit check failed: ${response.status} - ${error}`);
	}

	const data = (await response.json()) as ProcureCheckBusinessCreditResponse;

	// Map ProcureCheck response to our ITCCheckResult
	const creditScore = mapProcureCheckScore(data.creditProfile.score);
	const riskCategory = mapProcureCheckRiskCategory(data.creditProfile.riskCategory);

	const result: ITCCheckResult = {
		creditScore,
		riskCategory,
		passed: creditScore >= ITC_THRESHOLDS.AUTO_DECLINE,
		recommendation: getRecommendation(creditScore),
		adverseListings: data.adverseListings.map(listing => ({
			type: listing.type,
			amount: listing.amount,
			date: listing.date,
			creditor: listing.creditor || "Unknown",
		})),
		checkedAt: new Date(),
		referenceNumber: `EXP-${data.requestId}-${applicantId}`,
		rawResponse: data,
	};

	return result;
}

/**
 * Extract registration number from applicant data
 */
function extractRegistrationNumber(applicantData: {
	registrationNumber?: string | null;
	notes?: string | null;
}): string | null {
	// First check the dedicated registrationNumber field
	if (applicantData.registrationNumber) {
		return applicantData.registrationNumber;
	}
	// Fallback: check notes field for registration number pattern
	if (applicantData.notes) {
		const regMatch = applicantData.notes.match(/\d{4}\/\d+\/\d{2}/);
		if (regMatch) {
			return regMatch[0];
		}
	}
	return null;
}

// ============================================
// Utility Functions
// ============================================

function _categorizeRisk(score: number): "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH" {
	if (score >= 750) return "LOW";
	if (score >= 650) return "MEDIUM";
	if (score >= 550) return "HIGH";
	return "VERY_HIGH";
}

function getRecommendation(
	score: number
): "AUTO_APPROVE" | "MANUAL_REVIEW" | "AUTO_DECLINE" | "ENHANCED_DUE_DILIGENCE" {
	if (score >= ITC_THRESHOLDS.AUTO_APPROVE) return "AUTO_APPROVE";
	if (score >= ITC_THRESHOLDS.MANUAL_REVIEW) return "MANUAL_REVIEW";
	if (score >= ITC_THRESHOLDS.AUTO_DECLINE) return "ENHANCED_DUE_DILIGENCE";
	return "AUTO_DECLINE";
}

// ============================================
// Result Helpers (for Inngest serialization)
// ============================================

type SerializedITCResult = {
	creditScore: number;
	recommendation:
		| "AUTO_APPROVE"
		| "MANUAL_REVIEW"
		| "AUTO_DECLINE"
		| "ENHANCED_DUE_DILIGENCE";
};

export function canAutoApprove(result: SerializedITCResult): boolean {
	return (
		result.recommendation === "AUTO_APPROVE" &&
		result.creditScore >= ITC_THRESHOLDS.AUTO_APPROVE
	);
}

export function requiresManualReview(result: SerializedITCResult): boolean {
	return (
		result.recommendation === "MANUAL_REVIEW" ||
		result.recommendation === "ENHANCED_DUE_DILIGENCE"
	);
}

export function shouldAutoDecline(result: SerializedITCResult): boolean {
	return (
		result.recommendation === "AUTO_DECLINE" ||
		result.creditScore < ITC_THRESHOLDS.AUTO_DECLINE
	);
}
