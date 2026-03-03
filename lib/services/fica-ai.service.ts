/**
 * FICA AI Analysis Service
 *
 * Uses Vercel AI SDK to analyze FICA documents (bank statements, accountant letters)
 * and extract structured data for risk assessment.
 *
 * Features:
 * - Bank statement analysis with risk flag detection
 * - Accountant letter verification
 * - Structured output via Zod schemas (generateObject)
 * - AI trust scoring for auto-approval decisions
 * - Multi-model strategy: Gemini 2.0 Flash for complex analysis
 */

import {
	getThinkingModel,
	isAIConfigured,
	runStructuredInteraction,
} from "@/lib/ai/models";
import {
	type AccountantLetterAnalysis,
	AccountantLetterAnalysisSchema,
	AI_TRUST_THRESHOLDS,
	type FacilityApplication,
	type FicaDocumentAnalysis,
	FicaDocumentAnalysisSchema,
} from "@/lib/types";

// ============================================
// Types
// ============================================

export interface AnalyzeBankStatementOptions {
	/** PDF content as base64 or text extracted from bank statement */
	content: string;
	/** Content type */
	contentType: "base64" | "text";
	/** Facility application to verify against */
	facilityApplication?: Partial<FacilityApplication>;
	/** Workflow ID for tracking */
	workflowId: number;
}

export interface AnalyzeAccountantLetterOptions {
	/** PDF content as base64 or text extracted */
	content: string;
	contentType: "base64" | "text";
	facilityApplication?: Partial<FacilityApplication>;
	workflowId: number;
}

// ============================================
// Configuration is imported from @/lib/ai/models

// ============================================
// Bank Statement Analysis
// ============================================

/**
 * Analyze a bank statement using AI
 */
export async function analyzeBankStatement(
	options: AnalyzeBankStatementOptions
): Promise<FicaDocumentAnalysis> {
	const { content, contentType, facilityApplication } = options;

	if (isAIConfigured()) {
		try {
			return await analyzeWithAI(content, contentType, facilityApplication);
		} catch (err) {
			console.error("[FicaAI] AI analysis failed:", err);
			throw new Error(
				`AI analysis failed: ${err instanceof Error ? err.message : String(err)}`
			);
		}
	}

	throw new Error("AI is not configured");
}

/**
 * Analyze bank statement with real AI (Vercel AI SDK)
 */
async function analyzeWithAI(
	content: string,
	contentType: "base64" | "text",
	facilityApplication?: Partial<FacilityApplication>
): Promise<FicaDocumentAnalysis> {
	const verificationContext = facilityApplication
		? `
VERIFICATION CONTEXT:
Verify the bank statement against this facility application:
- Company Name: ${facilityApplication.companyName || "Not provided"}
- Account Number: ${facilityApplication.bankingDetails?.accountNumber || "Not provided"}
- Bank Name: ${facilityApplication.bankingDetails?.bankName || "Not provided"}

Check if the account holder name matches the company name and flag any discrepancies.
`
		: "";

	const prompt = `You are a FICA (Financial Intelligence Centre Act) compliance analyst for a South African financial services company. Analyze this bank statement and extract structured data for risk assessment.

${verificationContext}

BANK STATEMENT CONTENT:
${contentType === "base64" ? "Note: Content is base64 encoded. Decode and analyze." : content}

ANALYSIS REQUIREMENTS:
1. Extract account holder name and account number
2. Identify the bank name and branch code
3. Determine the statement period (start and end dates)
4. Calculate financial metrics:
   - Opening and closing balances
   - Average daily balance
   - Total credits and debits
   - Number of dishonoured/bounced transactions
5. Assess income regularity (REGULAR, IRREGULAR, SEASONAL, or UNKNOWN)
6. Identify the primary income source
7. Calculate a cash flow score (0-100)
8. Detect risk flags with severity levels:
   - BOUNCED_DEBIT: Multiple bounced debit orders
   - GAMBLING: Transactions to gambling sites/casinos
   - IRREGULAR_DEPOSITS: Unusual large deposits
   - CASH_INTENSIVE: High proportion of cash transactions
   - OVERDRAFT: Frequent overdraft usage
   - UNUSUAL_TRANSFERS: Suspicious transfers
9. Verify name and account number match the application
10. Generate an AI trust score (0-100) based on overall financial health
11. Provide a summary and recommendation (APPROVE, APPROVE_WITH_CONDITIONS, MANUAL_REVIEW, or DECLINE)

Be thorough but concise. Flag any concerning patterns immediately.`;

	return runStructuredInteraction({
		model: getThinkingModel(),
		input: prompt,
		schema: FicaDocumentAnalysisSchema,
	});
}

// ============================================
// Accountant Letter Analysis
// ============================================

/**
 * Analyze an accountant letter using AI
 */
export async function analyzeAccountantLetter(
	options: AnalyzeAccountantLetterOptions
): Promise<AccountantLetterAnalysis> {
	const { content, contentType, facilityApplication } = options;

	if (isAIConfigured()) {
		try {
			return await analyzeAccountantLetterWithAI(
				content,
				contentType,
				facilityApplication
			);
		} catch (err) {
			console.error("[FicaAI] AI analysis failed:", err);
			throw new Error(
				`AI analysis failed: ${err instanceof Error ? err.message : String(err)}`
			);
		}
	}

	throw new Error("AI is not configured");
}

/**
 * Analyze accountant letter with real AI
 */
async function analyzeAccountantLetterWithAI(
	content: string,
	contentType: "base64" | "text",
	facilityApplication?: Partial<FacilityApplication>
): Promise<AccountantLetterAnalysis> {
	const prompt = `You are a FICA compliance analyst. Analyze this accountant's letterhead letter and extract verification data.

CLIENT CONTEXT:
- Company Name: ${facilityApplication?.companyName || "Not provided"}

LETTER CONTENT:
${contentType === "base64" ? "Note: Content is base64 encoded. Decode and analyze." : content}

ANALYSIS REQUIREMENTS:
1. Extract practitioner name and practice number (CA(SA) number)
2. Verify letterhead authenticity indicators
3. Extract the letter date
4. Confirm client name matches the application
5. Assess business standing (GOOD, CONCERNING, POOR, or UNKNOWN)
6. Extract annual turnover if mentioned
7. Note years in business
8. List any concerns mentioned
9. Determine verification confidence (0-100)`;

	return runStructuredInteraction({
		model: getThinkingModel(),
		input: prompt,
		schema: AccountantLetterAnalysisSchema,
	});
}

// ============================================
// Result Helpers
// ============================================

/**
 * Determine if analysis allows auto-approval
 * DISABLED: All applications require human review
 */
export function canAutoApprove(_analysis: FicaDocumentAnalysis): boolean {
	// Auto-approve is disabled - all applications go to human review
	return false;
}

/**
 * Determine if analysis requires manual review
 */
export function requiresManualReview(analysis: FicaDocumentAnalysis): boolean {
	return (
		analysis.aiTrustScore < AI_TRUST_THRESHOLDS.AUTO_APPROVE ||
		!analysis.nameMatchVerified ||
		!analysis.accountMatchVerified ||
		analysis.recommendation === "MANUAL_REVIEW" ||
		analysis.riskFlags.some(f => f.severity === "HIGH" || f.severity === "CRITICAL")
	);
}

/**
 * Calculate combined risk score from multiple analyses
 */
export function calculateCombinedRiskScore(
	bankAnalysis: FicaDocumentAnalysis,
	accountantAnalysis?: AccountantLetterAnalysis
): number {
	const bankWeight = 0.7;
	const accountantWeight = 0.3;

	let score = bankAnalysis.aiTrustScore * bankWeight;

	if (accountantAnalysis) {
		let accountantScore = 50;
		if (accountantAnalysis.verified) accountantScore += 20;
		if (accountantAnalysis.letterheadAuthentic) accountantScore += 15;
		if (accountantAnalysis.businessStanding === "GOOD") accountantScore += 15;
		if (accountantAnalysis.concerns.length === 0) accountantScore += 10;

		score += Math.min(accountantScore, 100) * accountantWeight;
	} else {
		score = bankAnalysis.aiTrustScore;
	}

	return Math.round(score);
}
