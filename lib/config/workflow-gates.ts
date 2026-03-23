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

export function canPerformGateActions(
	stage: number | null | undefined,
	status: string | null | undefined
): boolean {
	return stage === 5 && status !== "terminated";
}

export function canConfirmAbsa(
	stage: number | null | undefined,
	status: string | null | undefined,
	absaPacketSent: boolean
): boolean {
	return canPerformGateActions(stage, status) && absaPacketSent;
}
