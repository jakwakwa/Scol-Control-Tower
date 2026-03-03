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

import { generateObject } from "ai";
import { z } from "zod";
import { getHighStakesModel } from "@/lib/ai/models";

const AI_CONFIG = {
	ANALYSIS_TEMPERATURE: 0.2,
};

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
	if (!(input.bankStatementText || input.applicantData)) {
		console.warn("[RiskAgent] No usable data provided for risk analysis");
		throw new Error("No input data provided for risk analysis");
	}

	if (!input.bankStatementText?.trim()) {
		return {
			bankAnalysis: {
				accountType: "UNKNOWN",
				bankName: "UNKNOWN",
				averageBalance: 0,
				minimumBalance: 0,
				maximumBalance: 0,
				volatilityScore: 0,
			},
			cashFlow: {
				totalCredits: 0,
				totalDebits: 0,
				netCashFlow: 0,
				regularIncomeDetected: false,
				incomeFrequency: "UNKNOWN",
				consistencyScore: 0,
			},
			stability: {
				overallScore: 0,
				debtIndicators: [],
				gamblingIndicators: [],
				loanRepayments: 0,
				hasBounced: false,
				bouncedCount: 0,
				bouncedAmount: 0,
			},
			creditRisk: {
				riskCategory: "HIGH",
				riskScore: 95,
				affordabilityRatio: 0,
				redFlags: ["No bank statement evidence provided for automated assessment"],
				positiveIndicators: [],
			},
			overall: {
				score: 10,
				recommendation: "MANUAL_REVIEW",
				reasoning:
					"Automated risk analysis cannot be completed without readable bank statement evidence.",
				conditions: [
					"Provide readable recent bank statements and complete manual risk review",
				],
			},
			dataSource: "Manual Escalation - Insufficient Evidence",
		};
	}

	const prompt = buildRiskPrompt(input);

	try {
		const { object } = await generateObject({
			model: getHighStakesModel(),
			schema: RiskAnalysisResultSchema,
			schemaName: "RiskAnalysis",
			schemaDescription:
				"Financial risk analysis based on bank statements and applicant data",
			prompt,
			temperature: AI_CONFIG.ANALYSIS_TEMPERATURE,
		});

		return { ...object, dataSource: "Gemini AI" };
	} catch (error) {
		console.error("[RiskAgent] AI analysis failed:", error);
		throw new Error(
			`AI analysis failed: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

/**
 * Build the prompt for the Risk Analysis AI
 */
function buildRiskPrompt(input: RiskAnalysisInput): string {
	const dataContext = input.applicantData
		? `
COMPANY DATA:
- Company Name: ${input.applicantData.companyName || "Unknown"}
- Industry: ${input.applicantData.industry || "Unknown"}
- Employee Count: ${input.applicantData.employeeCount || "Unknown"}
- Years in Business: ${input.applicantData.yearsInBusiness || "Unknown"}
`
		: "";

	const requestedAmountContext = input.requestedAmount
		? `Requested Mandate Volume: R ${(input.requestedAmount / 100).toFixed(2)}`
		: "Requested Mandate Volume: Unknown";

	const statementContext = input.bankStatementText
		? `
BANK STATEMENT DATA (Extracted Text):
${input.bankStatementText.substring(0, 15000)} // Truncate if too long
`
		: "\nNO BANK STATEMENT DATA PROVIDED.\n";

	return `
You are an expert Financial Risk Analyst evaluating a company for a debit order mandate facility.
Your goal is to assess their financial stability, cash flow consistency, and overall credit risk based on the provided data.

CONTEXT:
${dataContext}
${requestedAmountContext}
${statementContext}

TASK:
Analyze the provided information and generate a comprehensive risk assessment.
Follow the exact required output schema.
For all monetary amounts, output in CENTS (e.g., R 1,000.00 = 100000).
Ensure the rationale clearly justifies your scoring and recommendations.
If data is sparse, default to conservative scoring and recommend MANUAL_REVIEW.

GROUNDING RULES (CRITICAL):
- Use only data explicitly present in the provided statement/applicant context.
- Do NOT infer or invent requested mandate values, addresses, balances, transaction details, or business facts.
- If a value cannot be proven from the evidence, set it to 0/UNKNOWN and include a red flag explaining missing evidence.
`;
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
