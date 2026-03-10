import type { GetEvents, GetStepTools } from "inngest";
import type { SanctionsCheckResult } from "@/lib/services/agents";
import type { inngest } from "../../client";

export type ControlTowerStepTools = GetStepTools<
	typeof inngest,
	"onboarding/lead.created"
>;
export type ControlTowerEvent = GetEvents<typeof inngest>["onboarding/lead.created"];

/**
 * Typed stage handoff payloads.
 *
 * Each stage returns its data via StageResult.data and the orchestrator
 * merges it into WorkflowContext. These types replace the previous
 * `[key: string]: unknown` index signature so downstream stages
 * can rely on compile-time safety rather than runtime casts.
 */

export interface Stage2Output {
	facilitySubmission: unknown;
	mandateInfo: {
		businessType: string;
		mandateType: string;
		mandateVolume: number;
		requiredDocuments: Array<{ id: string; name: string; description: string; required: boolean }>;
	};
	mandateVerified: { documentsComplete: boolean };
}

export interface Stage3Output {
	aiAnalysis: {
		scores: { aggregatedScore: number; [key: string]: unknown };
		overall: {
			recommendation: string;
			flags: string[];
			[key: string]: unknown;
		};
		[key: string]: unknown;
	};
}

export interface WorkflowContext {
	applicantId: number;
	workflowId: number;
	procurementCleared?: boolean;
	aiAnalysisComplete?: boolean;
	facilitySubmission?: unknown;
	mandateInfo?: Stage2Output["mandateInfo"];
	mandateVerified?: Stage2Output["mandateVerified"];
	aiAnalysis?: Stage3Output["aiAnalysis"];
	[key: string]: unknown;
}

export type StageStatus = "completed" | "terminated" | "failed" | "awaiting_human";

export interface StageResult {
	status: StageStatus;
	stage: number;
	reason?: string;
	error?: unknown;
	data?: Partial<Stage2Output> | Partial<Stage3Output> | Record<string, unknown>;
}

export interface StageDependencies {
	event: ControlTowerEvent;
	step: ControlTowerStepTools;
	context: WorkflowContext;
}

export type SanctionsCheckSource = "pre_risk" | "itc_main";

export interface SanctionsExecutionResult {
	source: SanctionsCheckSource;
	reused: boolean;
	checkedAt: string;
	riskLevel: SanctionsCheckResult["overall"]["riskLevel"];
	isBlocked: boolean;
	result: SanctionsCheckResult;
}

export interface StoredSanctionsPayload {
	source: SanctionsCheckSource;
	checkedAt: string;
	sanctionsResult: SanctionsCheckResult;
	[key: string]: unknown;
}
