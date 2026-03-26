/**
 * AI Agents - Control Tower
 *
 * Export all agent services for the onboarding workflow
 */

// Aggregated Analysis Service
export {
	type AggregatedAnalysisInput,
	type AggregatedAnalysisResult,
	performAggregatedAnalysis,
} from "./aggregated-analysis.service";

// Risk Agent (Mock Implementation - Phase 1)
export {
	analyzeFinancialRisk,
	canAutoApprove as canAutoApproveRisk,
	RISK_THRESHOLDS,
	type RiskAnalysisInput,
	type RiskAnalysisResult,
	requiresManualReview as requiresManualRiskReview,
} from "./risk.agent";

// Financial Risk Agent — bank statement analysis (Gemini), multi-stage, logs to ai_analysis_logs
export {
	FINANCIAL_RISK_AGENT_NAME,
	runFinancialRiskAgent,
	type FinancialRiskAgentInput,
	type FinancialRiskAgentResult,
	type FinancialRiskAnalysisResult,
} from "./financial-risk.agent";

// Sanctions Agent (Mock Implementation - Phase 1)
export {
	type BatchSanctionsInput,
	type BatchSanctionsResult,
	canAutoApprove as canAutoApproveSanctions,
	isBlocked as isSanctionsBlocked,
	performBatchSanctionsCheck,
	performSanctionsCheck,
	type SanctionsCheckInput,
	type SanctionsCheckResult,
} from "./sanctions.agent";
// Validation Agent (Real Implementation)
export {
	type BatchValidationInput,
	type BatchValidationResult,
	type ValidationInput,
	type ValidationResult,
	validateDocument,
	validateDocumentsBatch,
} from "./validation.agent";
