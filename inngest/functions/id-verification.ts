import { processIdentityVerification } from "@/app/actions/verify-id";
import { recordVendorCheckAttempt } from "@/lib/services/telemetry/vendor-metrics";
import { inngest } from "../client";

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

		const { result, hasError } = await step.run("verify-identity-document", async () => {
			const verificationStart = Date.now();
			const verificationResult = await processIdentityVerification(
				applicantId,
				documentId
			);
			const verificationHasError =
				"error" in verificationResult && Boolean(verificationResult.error);

			recordVendorCheckAttempt({
				vendor: "document_ai_identity",
				stage: "async",
				workflowId,
				applicantId,
				outcome: verificationHasError ? "transient_failure" : "success",
				durationMs: Date.now() - verificationStart,
			});

			return {
				result: verificationResult,
				hasError: verificationHasError,
			};
		});

		if (hasError) {
			const errorMessage =
				"error" in result && result.error
					? result.error
					: "Unknown identity verification error";
			throw new Error(`Identity verification failed: ${errorMessage}`);
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
