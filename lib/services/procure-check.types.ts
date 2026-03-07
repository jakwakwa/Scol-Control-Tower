/**
 * ProcureCheck API Type Definitions
 *
 * Types for ProcureCheck Business Credit Check API responses.
 * Based on ProcureCheck Developer Portal documentation.
 */

// ============================================
// Authentication
// ============================================

export interface ProcureCheckTokenResponse {
	access_token: string;
	token_type: "Bearer";
	expires_in: number;
	scope: string;
}

// ============================================
// Business Credit Request
// ============================================

export interface ProcureCheckBusinessCreditRequest {
	/** South African company registration number */
	registrationNumber: string;
	/** Country code (ZA for South Africa) */
	country: "ZA";
	/** Optional: Company name for validation */
	companyName?: string;
}

// ============================================
// Business Credit Response
// ============================================

export interface ProcureCheckBusinessCreditResponse {
	/** Request reference ID */
	requestId: string;
	/** Company information */
	business: ProcureCheckBusinessInfo;
	/** Credit score and risk assessment */
	creditProfile: ProcureCheckCreditProfile;
	/** Adverse listings (judgments, defaults) */
	adverseListings: ProcureCheckAdverseListing[];
	/** Trade payment history */
	tradePayments?: ProcureCheckTradePayment[];
	/** Response timestamp */
	generatedAt: string;
}

export interface ProcureCheckBusinessInfo {
	/** Company registration number */
	registrationNumber: string;
	/** Company name */
	name: string;
	/** Trading name (if different) */
	tradingName?: string;
	/** Registration date */
	registrationDate?: string;
	/** Company status (Active, Deregistered, etc.) */
	status: "Active" | "Deregistered" | "In Liquidation" | "Unknown";
	/** Industry classification */
	industryCode?: string;
	/** VAT registration number */
	vatNumber?: string;
}

export interface ProcureCheckCreditProfile {
	/** ProcureCheck commercial credit score (0-100) */
	score: number;
	/** Score band description */
	scoreBand: "Very Low" | "Low" | "Medium" | "Good" | "Excellent";
	/** Risk category */
	riskCategory: "Very High" | "High" | "Medium" | "Low" | "Very Low";
	/** Probability of default (percentage) */
	probabilityOfDefault: number;
	/** Credit limit recommendation (ZAR cents) */
	recommendedCreditLimit?: number;
	/** Days beyond terms average */
	avgDaysBeyondTerms?: number;
	/** Score factors */
	scoreFactors?: ProcureCheckScoreFactor[];
}

export interface ProcureCheckScoreFactor {
	/** Factor code */
	code: string;
	/** Factor description */
	description: string;
	/** Impact on score (positive/negative) */
	impact: "positive" | "negative" | "neutral";
}

export interface ProcureCheckAdverseListing {
	/** Type of adverse listing */
	type: "Judgment" | "Default" | "Administration" | "Sequestration" | "Deregistration";
	/** Amount in ZAR cents */
	amount: number;
	/** Date of listing */
	date: string;
	/** Creditor name */
	creditor?: string;
	/** Case/reference number */
	referenceNumber?: string;
	/** Status */
	status: "Active" | "Paid" | "Rescinded";
}

export interface ProcureCheckTradePayment {
	/** Creditor/supplier name */
	creditor: string;
	/** Credit limit with this creditor */
	creditLimit: number;
	/** Current balance */
	currentBalance: number;
	/** Payment status */
	paymentStatus: "Current" | "30 Days" | "60 Days" | "90 Days" | "120+ Days";
	/** Last payment date */
	lastPaymentDate?: string;
}

// ============================================
// Error Responses
// ============================================

export interface ProcureCheckErrorResponse {
	error: {
		code: string;
		message: string;
		details?: string;
	};
}

// ============================================
// Score Mapping Utility Types
// ============================================

/**
 * Map ProcureCheck score (0-100) to our ITC score range (300-850)
 */
export function mapProcureCheckScore(procureCheckScore: number): number {
	// ProcureCheck uses 0-100, we use 300-850 range
	// Linear mapping: 0 -> 300, 100 -> 850
	return Math.round(300 + (procureCheckScore / 100) * 550);
}

/**
 * Map ProcureCheck risk category to our risk category
 */
export function mapProcureCheckRiskCategory(
	category: ProcureCheckCreditProfile["riskCategory"]
): "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH" {
	switch (category) {
		case "Very Low":
		case "Low":
			return "LOW";
		case "Medium":
			return "MEDIUM";
		case "High":
			return "HIGH";
		case "Very High":
			return "VERY_HIGH";
		default:
			return "MEDIUM";
	}
}
