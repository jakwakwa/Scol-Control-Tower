import { processIdentityVerification } from "@/app/actions/verify-id";
import { inngest } from "@/inngest";
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

export const autoVerifyIdentity = inngest.createFunction(
	{
		id: "auto-verify-identity",
		name: "Automated Identity Verification",
		retries: AUTO_VERIFY_IDENTITY_INNGEST_RETRIES,
		onFailure: async ({ event, error }) => {
			const payload = event.data.event.data;
			await handleAutoVerifyIdentityRetryExhausted({
				workflowId: payload.workflowId,
				applicantId: payload.applicantId,
				documentId: payload.documentId,
				documentType: payload.documentType,
				error,
			});
		},
	},
	{ event: "document/uploaded" },
	async ({ event, step }) => {
		const { workflowId, applicantId, documentId, documentType } = event.data;

		const idTypes = ["ID_DOCUMENT", "PROPRIETOR_ID", "DIRECTOR_ID", "FICA_ID"];

		if (!idTypes.includes(documentType)) {
			return { skipped: true, reason: "Not an identity document type", documentType };
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

			if (outcome.kind === "terminal_unprocessable") {
				await writeTerminalVerificationStatus({
					documentId,
					status: "failed_unprocessable",
					reason: FAILED_UNPROCESSABLE_REASON,
					errorMessage: outcome.errorMessage,
				});

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

		const entitiesFound = "data" in result ? result.data?.entities?.length || 0 : 0;

		return {
			status: "completed",
			applicantId,
			documentId,
			entitiesFound,
		};
	}
);
