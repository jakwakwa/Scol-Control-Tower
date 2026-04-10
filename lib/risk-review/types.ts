import type { FinancialRiskAnalysisResult } from "@/lib/services/agents/financial-risk.agent";

/**
 * Explicit status union for the VAT sub-agent.
 *
 * verified         — SARS/vatsearch confirmed the VAT number
 * not_verified     — check ran but could not confirm the number
 * not_checked      — applicant has no vatNumber; check was skipped
 * service_down     — Firecrawl returned status "offline" or was not configured
 * invalid_input    — vatNumber failed the 10-digit format guard before calling Firecrawl
 * timeout          — Firecrawl agent returned runtimeState "error" (timed out / page error)
 * manual_review    — partial data (runtimeState "partial" | "action_required")
 * error            — unexpected runtime exception thrown by the VAT step
 */
export type VatStatus =
	| "verified"
	| "not_verified"
	| "not_checked"
	| "service_down"
	| "invalid_input"
	| "timeout"
	| "manual_review"
	| "error";

/** Document AI Identity Proofing entity row (shared UI + verify-id action). */
export type DocumentAiProofingEntity = { type: string; value: string };

export interface SectionStatus {
	machineState: "pending" | "in_progress" | "completed" | "failed" | "manual_required";
	reviewState: "pending" | "acknowledged" | "approved" | "rejected" | "not_required";
	provider?: string;
	errorDetails?: string;
}

export interface RiskReviewData {
	workflowId: number;
	applicantId: number;
	globalData: {
		transactionId: string;
		generatedAt: string;
		overallStatus: string;
		overallRiskScore: number;
		//  used for calling the procurecheck API (entity name = vendor name, registration number = registration number, entity type = entity type, registered address = registered address)
		entity: {
			name: string;
			tradingAs?: string;
			registrationNumber?: string;
			entityType?: string;
			registeredAddress?: string;
		};
	};
	sectionStatuses?: {
		procurement: SectionStatus;
		itc: SectionStatus;
		sanctions: SectionStatus;
		fica: SectionStatus;
	};
	procurementData: import("@/lib/procurecheck/types").ProcurementData | null;

	itcData: {
		creditScore: number;
		scoreBand: string;
		judgements: number | string;
		defaults: number | string;
		defaultDetails: string;
		tradeReferences: number | string;
		recentEnquiries: number | string;
	};
	/** AI bank statement analysis (Gemini); complementary to XDS / ITC bureau data */
	bankStatementAnalysis?: FinancialRiskAnalysisResult;
	sanctionsData: {
		sanctionsMatch: string;
		pepHits: number | string;
		adverseMedia: number | string;
		alerts: Array<{ date: string; source: string; title: string; severity: string }>;
	};
	ficaData: {
		identity: Array<{ name: string; id: string; status: string; deceasedStatus: string }>;
		residence: {
			address: string;
			documentType: string;
			ageInDays: number | string;
			status: string;
		};
		lastVerified: string;
		banking: {
			bankName: string;
			accountNumber: string;
			avsStatus: string;
			avsDetails: string;
		};
		documentAiResult?: DocumentAiProofingEntity[];
		vatVerification?: {
			checked: boolean;
			/** Summary status for UX display — derived from all available evidence sources. */
			status: VatStatus;
			/**
			 * Explicit error state preserved alongside status for audit purposes.
			 * Allows callers to distinguish between "not_checked because no vatNumber"
			 * and "not_checked because the service was down".
			 */
			errorState?: VatStatus;
			vatNumber?: string;
			tradingName?: string;
			office?: string;
			message?: string;
			checkedAt?: string;
		};
		/**
		 * Placeholder for future AI-inferred VAT interpretation
		 * (populated when performAggregatedAnalysis is wired in a later milestone).
		 */
		aiVatInference?: { available: false } | VatVerificationSummary;
	};

	/**
	 * Deprecated Firecrawl screening flags — always false.
	 * Kept temporarily for type compatibility with existing UI components.
	 */
	externalScreeningUi: {
		industryRegulator: false;
		socialReputation: false;
	};
}

/** Structured VAT verification summary produced by the AI pipeline. */
export interface VatVerificationSummary {
	available: true;
	status: VatStatus;
	vatNumber?: string;
	tradingName?: string;
	office?: string;
	message?: string;
	checkedAt?: string;
}
