import type { GetEvents, GetStepTools } from "inngest";
import type { SanctionsCheckResult } from "@/lib/services/agents";
import type { BusinessType } from "@/lib/services/document-requirements.service";
import type { inngest } from "../../client";

export type ControlTowerStepTools = GetStepTools<
	typeof inngest,
	"onboarding/lead.created"
>;
export type ControlTowerEvent = GetEvents<typeof inngest>["onboarding/lead.created"];

export interface Stage2Output {
	facilitySubmission: unknown;
	mandateInfo: {
		businessType: BusinessType;
		mandateType: string;
		mandateVolume: number;
		requiredDocuments: Array<{ id: string; name: string; description: string; required: boolean }>;
	};
	mandateVerified: { documentsComplete: boolean };
}

export interface WorkflowContext {
	applicantId: number;
	workflowId: number;
	procurementCleared?: boolean;
	facilitySubmission?: unknown;
	mandateInfo?: Stage2Output["mandateInfo"];
	mandateVerified?: Stage2Output["mandateVerified"];
	[key: string]: unknown;
}

export type StageStatus = "completed" | "terminated" | "failed" | "awaiting_human";

export interface StageResult {
	status: StageStatus;
	stage: number;
	reason?: string;
	error?: unknown;
	data?: Partial<Stage2Output> | Record<string, unknown>;
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
