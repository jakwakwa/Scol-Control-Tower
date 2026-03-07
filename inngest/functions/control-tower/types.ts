import type { GetEvents, GetStepTools } from "inngest";
import type { SanctionsCheckResult } from "@/lib/services/agents";
import type { inngest } from "../../client";

// Type definition for the step tools available in this specific Inngest function
// We infer this from the client to ensure type safety for step.run, step.waitForEvent, etc.
export type ControlTowerStepTools = GetStepTools<
	typeof inngest,
	"onboarding/lead.created"
>;
export type ControlTowerEvent = GetEvents<typeof inngest>["onboarding/lead.created"];

export interface WorkflowContext {
	applicantId: number;
	workflowId: number;
	procurementCleared?: boolean;
	aiAnalysisComplete?: boolean;
	[key: string]: unknown;
}

export type StageStatus = "completed" | "terminated" | "failed" | "awaiting_human";

export interface StageResult {
	status: StageStatus;
	stage: number;
	reason?: string;
	error?: unknown;
	data?: unknown; // Any output data passed to the next stage
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
