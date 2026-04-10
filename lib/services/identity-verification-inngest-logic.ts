import type { IdentityVerificationProcessResult } from "@/app/actions/verify-id";
import { isNonRetriableIdentityError } from "@/lib/risk-review/identity-verification-errors";

export const AUTO_VERIFY_IDENTITY_INNGEST_RETRIES = 4 as const;

export const FAILED_OCR_REASON = "Transient OCR failures exhausted retry budget";
export const FAILED_UNPROCESSABLE_REASON =
	"Document content rejected by Document AI — re-upload required";

export type IdentityStepOutcome =
	| { kind: "success"; result: IdentityVerificationProcessResult }
	| { kind: "terminal_unprocessable"; errorMessage: string }
	| { kind: "throw_for_inngest_retry"; errorMessage: string };

export function classifyIdentityStepOutcome(
	verificationResult: IdentityVerificationProcessResult
): IdentityStepOutcome {
	const hasError = "error" in verificationResult;

	if (!hasError) {
		return { kind: "success", result: verificationResult };
	}

	const errorMessage = String(verificationResult.error);
	if (isNonRetriableIdentityError(errorMessage)) {
		return { kind: "terminal_unprocessable", errorMessage };
	}

	return { kind: "throw_for_inngest_retry", errorMessage };
}
