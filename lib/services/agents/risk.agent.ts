/**
 * Risk Agent - Mock Implementation (Phase 1)
 *
 * This agent performs financial risk analysis including:
 * - Bank statement analysis
 * - Cash flow assessment
 * - Financial stability scoring
 * - Credit risk evaluation
 *
 * NOTE: This is a mock implementation for Phase 1.
 * Real implementation will integrate with actual financial data sources.
 */

import { z } from "zod";

// ============================================
// Types & Schemas
// ============================================

export const RiskAnalysisResultSchema = z.object({
	// Bank Statement Analysis
	bankAnalysis: z.object({
		accountType: z.string().describe("Type of bank account"),
		bankName: z.string().describe("Name of the bank"),
		averageBalance: z.number().describe("Average daily balance in cents"),
		minimumBalance: z.number().describe("Lowest balance in the period"),
		maximumBalance: z.number().describe("Highest balance in the period"),
		volatilityScore: z
			.number()
			.min(0)
			.max(100)
			.describe("Balance volatility score (100 = very volatile)"),
	}),

	// Cash Flow Assessment
	cashFlow: z.object({
		totalCredits: z.number().describe("Total credits/deposits in cents"),
		totalDebits: z.number().describe("Total debits/withdrawals in cents"),
		netCashFlow: z.number().describe("Net cash flow in cents"),
		regularIncomeDetected: z.boolean().describe("Whether regular income is detected"),
		incomeFrequency: z
			.enum(["WEEKLY", "BI_WEEKLY", "MONTHLY", "IRREGULAR", "UNKNOWN"])
			.describe("Detected income frequency"),
		consistencyScore: z.number().min(0).max(100).describe("Cash flow consistency score"),
	}),

	// Financial Stability
	stability: z.object({
		overallScore: z.number().min(0).max(100).describe("Financial stability score"),
		debtIndicators: z.array(z.string()).describe("Detected debt-related transactions"),
		gamblingIndicators: z
			.array(z.string())
			.describe("Detected gambling-related transactions"),
		loanRepayments: z.number().describe("Estimated monthly loan repayments in cents"),
		hasBounced: z.boolean().describe("Whether bounced transactions were detected"),
		bouncedCount: z.number().describe("Number of bounced transactions"),
		bouncedAmount: z.number().describe("Total amount of bounced transactions in cents"),
	}),

	// Credit Risk Evaluation
	creditRisk: z.object({
		riskCategory: z
			.enum(["LOW", "MEDIUM", "HIGH", "VERY_HIGH"])
			.describe("Overall credit risk category"),
		riskScore: z
			.number()
			.min(0)
			.max(100)
			.describe("Credit risk score (100 = highest risk)"),
		affordabilityRatio: z.number().describe("Ratio of income to expenses (>1 is good)"),
		redFlags: z.array(z.string()).describe("Credit-related red flags"),
		positiveIndicators: z.array(z.string()).describe("Positive credit indicators"),
	}),

	// Overall Assessment
	overall: z.object({
		score: z.number().min(0).max(100).describe("Overall risk assessment score"),
		recommendation: z
			.enum(["APPROVE", "CONDITIONAL_APPROVE", "MANUAL_REVIEW", "DECLINE"])
			.describe("Recommended action"),
		reasoning: z.string().describe("Detailed reasoning for the assessment"),
		conditions: z
			.array(z.string())
			.optional()
			.describe("Conditions for approval if applicable"),
	}),

	// Data Source Indicator
	dataSource: z.string().describe("Whether results are from live AI or mock engine"),
});

export type RiskAnalysisResult = z.infer<typeof RiskAnalysisResultSchema>;

export interface RiskAnalysisInput {
	bankStatementText?: string;
	applicantId: number;
	workflowId: number;
	requestedAmount?: number; // Requested mandate volume in cents
	applicantData?: {
		companyName?: string;
		industry?: string;
		employeeCount?: number;
		yearsInBusiness?: number;
	};
}

// ============================================
// Risk Agent Implementation (Mock)
// ============================================

/**
 * Analyze financial risk based on bank statements and applicant data
 *
 * NOTE: This is a mock implementation for Phase 1.
 */
export async function analyzeFinancialRisk(
	input: RiskAnalysisInput
): Promise<RiskAnalysisResult> {
	// Simulate processing delay
	await new Promise(resolve => setTimeout(resolve, 500));

	// Generate deterministic mock results based on input
	const mockResult = generateMockRiskAnalysis(input);

	return mockResult;
}

/**
 * Generate mock risk analysis results
 */
function generateMockRiskAnalysis(input: RiskAnalysisInput): RiskAnalysisResult {
	// Use applicantId to generate deterministic results
	const seed = input.applicantId;
	const variance = seed % 30;

	// Determine base risk level based on requested amount
	const requestedAmount = input.requestedAmount || 500_000_00; // Default R5,000
	let baseRiskScore = 30; // Start with low risk

	// Higher amounts = higher risk
	if (requestedAmount > 1_000_000_00) baseRiskScore += 15; // > R10,000
	if (requestedAmount > 5_000_000_00) baseRiskScore += 20; // > R50,000
	if (requestedAmount > 10_000_000_00) baseRiskScore += 25; // > R100,000

	// Industry adjustments
	const riskyIndustries = ["gambling", "crypto", "forex", "lending"];
	if (
		input.applicantData?.industry &&
		riskyIndustries.some(i => input.applicantData!.industry!.toLowerCase().includes(i))
	) {
		baseRiskScore += 20;
	}

	// Add variance
	const finalRiskScore = Math.min(100, Math.max(0, baseRiskScore + variance - 15));

	// Calculate other scores based on risk
	const stabilityScore = Math.max(0, 100 - finalRiskScore + (seed % 10));
	const consistencyScore = Math.max(0, 100 - finalRiskScore + (seed % 15));

	// Determine risk category
	let riskCategory: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
	if (finalRiskScore <= 25) riskCategory = "LOW";
	else if (finalRiskScore <= 50) riskCategory = "MEDIUM";
	else if (finalRiskScore <= 75) riskCategory = "HIGH";
	else riskCategory = "VERY_HIGH";

	// Determine recommendation
	let recommendation: "APPROVE" | "CONDITIONAL_APPROVE" | "MANUAL_REVIEW" | "DECLINE";
	if (finalRiskScore <= 30) recommendation = "APPROVE";
	else if (finalRiskScore <= 50) recommendation = "CONDITIONAL_APPROVE";
	else if (finalRiskScore <= 70) recommendation = "MANUAL_REVIEW";
	else recommendation = "DECLINE";

	// Generate mock values
	const averageBalance = (5_000_00 + (seed % 50) * 1_000_00) * (1 + variance / 100);
	const hasBounced = finalRiskScore > 50 && seed % 3 === 0;

	return {
		bankAnalysis: {
			accountType: seed % 2 === 0 ? "CURRENT" : "SAVINGS",
			bankName: ["ABSA", "FNB", "Standard Bank", "Nedbank", "Capitec"][seed % 5],
			averageBalance: Math.round(averageBalance),
			minimumBalance: Math.round(averageBalance * 0.3),
			maximumBalance: Math.round(averageBalance * 2.5),
			volatilityScore: Math.min(100, 20 + variance * 2),
		},

		cashFlow: {
			totalCredits: Math.round(averageBalance * 3),
			totalDebits: Math.round(averageBalance * 2.8),
			netCashFlow: Math.round(averageBalance * 0.2),
			regularIncomeDetected: stabilityScore > 60,
			incomeFrequency:
				stabilityScore > 70 ? "MONTHLY" : stabilityScore > 50 ? "BI_WEEKLY" : "IRREGULAR",
			consistencyScore,
		},

		stability: {
			overallScore: stabilityScore,
			debtIndicators:
				finalRiskScore > 40
					? ["Regular loan repayments detected", "Multiple creditor payments"]
					: [],
			gamblingIndicators:
				finalRiskScore > 70 && seed % 5 === 0
					? ["Possible gambling-related transactions"]
					: [],
			loanRepayments: Math.round(averageBalance * 0.15),
			hasBounced,
			bouncedCount: hasBounced ? 1 + (seed % 3) : 0,
			bouncedAmount: hasBounced ? 500_00 + (seed % 10) * 100_00 : 0,
		},

		creditRisk: {
			riskCategory,
			riskScore: finalRiskScore,
			affordabilityRatio: 1.5 - finalRiskScore / 100,
			redFlags:
				finalRiskScore > 50
					? [
							"High volatility in account balance",
							...(hasBounced ? ["Bounced transactions detected"] : []),
						]
					: [],
			positiveIndicators:
				finalRiskScore <= 50
					? ["Regular income deposits", "Consistent payment history"]
					: [],
		},

		overall: {
			score: Math.round(100 - finalRiskScore),
			recommendation,
			reasoning: generateReasoning(finalRiskScore, recommendation, hasBounced),
			conditions:
				recommendation === "CONDITIONAL_APPROVE"
					? ["Monthly volume limit of R50,000", "Quarterly account review required"]
					: undefined,
		},

		dataSource: "Mock Risk Engine v1.0",
	};
}

/**
 * Generate reasoning text based on analysis
 */
function generateReasoning(
	riskScore: number,
	recommendation: string,
	hasBounced: boolean
): string {
	const parts: string[] = [];

	if (riskScore <= 30) {
		parts.push("Financial profile demonstrates strong stability and low risk.");
		parts.push("Cash flow analysis shows consistent income and manageable expenses.");
	} else if (riskScore <= 50) {
		parts.push("Financial profile shows moderate stability with some areas of concern.");
		parts.push("Recommend proceeding with conditions to mitigate identified risks.");
	} else if (riskScore <= 70) {
		parts.push("Financial profile raises several concerns that require human review.");
		parts.push("Cash flow patterns suggest potential affordability challenges.");
	} else {
		parts.push("Financial profile indicates high risk factors.");
		parts.push("Multiple concerns identified including cash flow instability.");
	}

	if (hasBounced) {
		parts.push("Note: Bounced transactions were detected in the statement period.");
	}

	parts.push(`Recommendation: ${recommendation}`);

	return parts.join(" ");
}

// ============================================
// Risk Score Thresholds
// ============================================

export const RISK_THRESHOLDS = {
	AUTO_APPROVE: 30,
	CONDITIONAL_APPROVE: 50,
	MANUAL_REVIEW: 70,
	AUTO_DECLINE: 70,
} as const;

/**
 * Check if risk analysis allows auto-approval
 */
export function canAutoApprove(result: RiskAnalysisResult): boolean {
	return (
		result.creditRisk.riskScore <= RISK_THRESHOLDS.AUTO_APPROVE &&
		!result.stability.hasBounced &&
		result.stability.gamblingIndicators.length === 0
	);
}

/**
 * Check if risk analysis requires manual review
 */
export function requiresManualReview(result: RiskAnalysisResult): boolean {
	return (
		result.overall.recommendation === "MANUAL_REVIEW" ||
		result.overall.recommendation === "DECLINE" ||
		result.stability.hasBounced ||
		result.stability.gamblingIndicators.length > 0
	);
}
