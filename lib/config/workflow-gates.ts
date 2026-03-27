export function buildContractReviewEndpoint(workflowId: number): string {
	return `/api/workflows/${workflowId}/contract/review`;
}

export function buildAbsaConfirmEndpoint(workflowId: number): string {
	return `/api/workflows/${workflowId}/absa/confirm`;
}

export interface ContractReviewBody {
	applicantId: number;
	reviewNotes?: string;
}

export interface AbsaConfirmBody {
	applicantId: number;
	notes?: string;
}

const isActiveStage5 = (
	stage: number | null | undefined,
	status: string | null | undefined
): boolean => stage === 5 && status !== "terminated" && status !== "completed";

export function canPerformGateActions(
	stage: number | null | undefined,
	status: string | null | undefined
): boolean {
	return isActiveStage5(stage, status);
}

export function showContractReviewAction(
	stage: number | null | undefined,
	status: string | null | undefined,
	contractReviewed: boolean
): boolean {
	return isActiveStage5(stage, status) && !contractReviewed;
}

export function showAbsaActions(
	stage: number | null | undefined,
	status: string | null | undefined,
	contractReviewed: boolean
): boolean {
	return isActiveStage5(stage, status) && contractReviewed;
}

export function canConfirmAbsa(
	stage: number | null | undefined,
	status: string | null | undefined,
	absaPacketSent: boolean
): boolean {
	return canPerformGateActions(stage, status) && absaPacketSent;
}

export function showTwoFactorApproval(
	stage: number | null | undefined,
	status: string | null | undefined
): boolean {
	return stage === 6 && status === "awaiting_human";
}
