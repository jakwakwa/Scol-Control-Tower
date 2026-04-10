import { FAILED_OCR_REASON } from "@/lib/services/identity-verification-inngest-logic";
import { writeTerminalVerificationStatus } from "@/lib/services/identity-verification-terminal";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";
import { recordVendorCheckFailure } from "@/lib/services/telemetry/vendor-metrics";

export interface HandleAutoVerifyIdentityRetryExhaustedParams {
	workflowId: number;
	applicantId: number;
	documentId: number;
	documentType: string;
	error: unknown;
}

export async function handleAutoVerifyIdentityRetryExhausted(
	params: HandleAutoVerifyIdentityRetryExhaustedParams
): Promise<void> {
	const { workflowId, applicantId, documentId, documentType, error } = params;
	const errorMessage = error instanceof Error ? error.message : String(error);

	console.error("[ControlTower] Identity verification exhausted all retries:", {
		workflowId,
		applicantId,
		documentId,
		documentType,
		error: errorMessage,
	});

	recordVendorCheckFailure({
		vendor: "document_ai_identity",
		stage: "async",
		workflowId,
		applicantId,
		durationMs: 0,
		outcome: "persistent_failure",
		error,
	});

	await writeTerminalVerificationStatus({
		documentId,
		status: "failed_ocr",
		reason: FAILED_OCR_REASON,
		errorMessage,
	});

	await logWorkflowEvent({
		workflowId,
		eventType: "vendor_check_failed",
		payload: {
			vendor: "document_ai_identity",
			context: "identity_verification_retry_exhausted",
			documentId,
			documentType,
			error: errorMessage,
		},
	}).catch((err) => {
		console.error("[ControlTower] logWorkflowEvent failed:", err);
	});

	await createWorkflowNotification({
		workflowId,
		applicantId,
		type: "warning",
		title: "Automated ID verification failed",
		message:
			"Document AI identity verification exhausted retries. Manual review of the ID document may be required.",
		actionable: true,
	}).catch((err) => {
		console.error("[ControlTower] createWorkflowNotification failed:", err);
	});
}
