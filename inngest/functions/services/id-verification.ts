import { processIdentityVerification, writeTerminalVerificationStatus } from "@/app/actions/verify-id";
import { inngest } from "@/inngest";
import { isNonRetriableIdentityError } from "@/lib/risk-review/identity-verification-errors";
import {
	AUTO_VERIFY_IDENTITY_INNGEST_RETRIES,
	classifyIdentityStepOutcome,
	FAILED_UNPROCESSABLE_REASON,
} from "@/lib/services/identity-verification-inngest-logic";
import { handleAutoVerifyIdentityRetryExhausted } from "@/lib/services/identity-verification-on-failure";
import { writeTerminalVerificationStatus } from "@/lib/services/identity-verification-terminal";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";
import { recordVendorCheckAttempt } from "@/lib/services/telemetry/vendor-metrics";

/** Same fields as `document/uploaded` in `inngest/events.ts`. */
type DocumentUploadedPayload = {
	workflowId: number;
	applicantId: number;
	documentId: number;
	documentType: string;
};

/**
 * `onFailure` receives `inngest/function.failed`: `event.data.event` is the original
 * trigger (`{ name, data }`). Some runtimes may surface only the inner `data`; accept both.
 */
function documentUploadedPayloadFromFailureEvent(event: {
	data: {
		run_id?: string;
		function_id?: string;
		event?: unknown;
	};
}): DocumentUploadedPayload | null {
	const trigger = event.data.event;
	if (!trigger || typeof trigger !== "object") {
		return null;
	}

	const asRecord = trigger as Record<string, unknown>;
	const inner =
		"data" in asRecord && asRecord.data !== null && typeof asRecord.data === "object"
			? (asRecord.data as Record<string, unknown>)
			: asRecord;

	if (
		typeof inner.workflowId === "number" &&
		typeof inner.applicantId === "number" &&
		typeof inner.documentId === "number" &&
		typeof inner.documentType === "string"
	) {
		return {
			workflowId: inner.workflowId,
			applicantId: inner.applicantId,
			documentId: inner.documentId,
			documentType: inner.documentType,
		};
	}

	return null;
}

export const autoVerifyIdentity = inngest.createFunction(
	{
		id: "auto-verify-identity",
		name: "Automated Identity Verification",
		retries: AUTO_VERIFY_IDENTITY_INNGEST_RETRIES,
		onFailure: async ({ event, error }) => {
			const payload = documentUploadedPayloadFromFailureEvent(event);
			if (!payload) {
				console.error(
					"[ControlTower] autoVerifyIdentity onFailure: missing document/uploaded payload (expected event.data.event.data or event.data.event as data)",
					{ runId: event.data.run_id, functionId: event.data.function_id }
				);
				return;
			}

			await handleAutoVerifyIdentityRetryExhausted({
				...payload,
				error,
			});

			await logWorkflowEvent({
				workflowId,
				eventType: "vendor_check_failed",
				payload: {
					vendor: "document_ai_identity",
					documentId,
					documentType,
					error: errorMessage,
					context: "identity_verification_retries_exhausted",
				},
			});

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "warning",
				title: "Identity Verification Failed",
				message: `Automated identity verification failed after all retry attempts for document ${documentId}. Manual identity verification required.`,
				actionable: true,
				severity: "high",
			});

			await writeTerminalVerificationStatus({
				documentId,
				status: "failed_ocr",
				reason: "Transient OCR failures exhausted retry budget",
				errorMessage,
			});
		},
	},
	{ event: "document/uploaded" },
	async ({ event, step }) => {
		const { workflowId, applicantId, documentId, documentType } = event.data;

		const idTypes = ["ID_DOCUMENT", "PROPRIETOR_ID", "DIRECTOR_ID", "FICA_ID"];

		if (!idTypes.includes(documentType)) {
			return {
				skipped: true,
				reason: "Not an identity document type",
				documentType,
			};
		}

		const result = await step.run("verify-identity-document", async () => {
			const verificationStart = Date.now();
			const verificationResult = await processIdentityVerification(
				applicantId,
				documentId
			);
			const outcome = classifyIdentityStepOutcome(verificationResult);

			let attemptOutcome: "success" | "persistent_failure" | "transient_failure";
			switch (outcome.kind) {
				case "success":
					attemptOutcome = "success";
					break;
				case "terminal_unprocessable":
					attemptOutcome = "persistent_failure";
					break;
				case "throw_for_inngest_retry":
					attemptOutcome = "transient_failure";
					break;
			}

			recordVendorCheckAttempt({
				vendor: "document_ai_identity",
				stage: "async",
				workflowId,
				applicantId,
				outcome: attemptOutcome,
				durationMs: Date.now() - verificationStart,
				error: "error" in verificationResult ? verificationResult.error : undefined,
			});

			if (hasError) {
				if (isNonRetriableError) {
					await writeTerminalVerificationStatus({
						documentId,
						status: "failed_unprocessable",
						reason: "Document content rejected by Document AI — re-upload required",
						errorMessage,
					});
					return {
						skipped: true,
						reason: "manual_required_identity_document_constraints",
						error: errorMessage,
					};
				}

				await logWorkflowEvent({
					workflowId,
					eventType: "vendor_check_failed",
					payload: {
						vendor: "document_ai_identity",
						context: "identity_verification_non_retriable",
						documentId,
						documentType,
						error: outcome.errorMessage,
					},
				}).catch(err => {
					console.error("[ControlTower] logWorkflowEvent failed:", err);
				});

				await createWorkflowNotification({
					workflowId,
					applicantId,
					type: "warning",
					title: "ID document could not be processed",
					message:
						"The uploaded identity document was rejected by automated verification. A new upload may be required.",
					actionable: true,
				}).catch(err => {
					console.error("[ControlTower] createWorkflowNotification failed:", err);
				});

				return {
					skipped: true,
					reason: "manual_required_identity_document_constraints",
					error: outcome.errorMessage,
				};
			}

			if (outcome.kind === "throw_for_inngest_retry") {
				throw new Error(`Identity verification failed: ${outcome.errorMessage}`);
			}

			return verificationResult;
		});

		if ("skipped" in result && result.skipped) {
			return {
				status: "manual_required",
				applicantId,
				documentId,
				reason: result.reason,
				error: result.error,
			};
		}

		const entitiesFound =
			"data" in result ? result.data?.entities?.length || 0 : 0;

		return {
			status: "completed",
			applicantId,
			documentId,
			entitiesFound,
		};
	}
);
