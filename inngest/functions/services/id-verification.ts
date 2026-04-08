import { processIdentityVerification, writeTerminalVerificationStatus } from "@/app/actions/verify-id";
import { inngest } from "@/inngest";
import { isNonRetriableIdentityError } from "@/lib/risk-review/identity-verification-errors";
import { recordVendorCheckAttempt } from "@/lib/services/telemetry/vendor-metrics";

/**
 * Automated Identity Verification
 *
 * Listens for individual document uploads. If the document is an identity
 * document, it triggers the Google Cloud Document AI Identity Proofing processor.
 */
export const autoVerifyIdentity = inngest.createFunction(
	{ id: "auto-verify-identity", name: "Automated Identity Verification" },
	{ event: "document/uploaded" },
	async ({ event, step }) => {
		const { workflowId, applicantId, documentId, documentType } = event.data;

		// Filter for identity document types
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
			const hasError = "error" in verificationResult && Boolean(verificationResult.error);
			const errorMessage =
				hasError && verificationResult.error
					? String(verificationResult.error)
					: "Unknown identity verification error";
			const isNonRetriableError = hasError && isNonRetriableIdentityError(errorMessage);

			recordVendorCheckAttempt({
				vendor: "document_ai_identity",
				stage: "async",
				workflowId,
				applicantId,
				outcome: hasError
					? isNonRetriableError
						? "persistent_failure"
						: "transient_failure"
					: "success",
				durationMs: Date.now() - verificationStart,
				error: hasError ? verificationResult.error : undefined,
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

				throw new Error(`Identity verification failed: ${errorMessage}`);
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
