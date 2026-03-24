import type { FinancialRiskAnalysisResult } from "@/lib/services/agents/financial-risk.agent";

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
	procurementData: {
		cipcStatus: string;
		taxStatus: string;
		taxExpiry: string;
		beeLevel: string;
		beeExpiry: string;
		riskAlerts: Array<{
			category: string;
			message: string;
			id?: string;
			action?: string;
		}>;
		checks: Array<{ name: string; status: string; detail: string }>;
		directors: Array<{
			name: string;
			idNumber: string;
			otherDirectorships: number;
			conflicts: number;
			status?: string;
		}>;
	};
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
		documentAiResult?: Array<{ type: string; value: string }>;
		vatVerification?: {
			checked: boolean;
			status: "verified" | "not_verified" | "not_checked";
			vatNumber?: string;
			tradingName?: string;
			office?: string;
			message?: string;
			checkedAt?: string;
		};
	};
}
