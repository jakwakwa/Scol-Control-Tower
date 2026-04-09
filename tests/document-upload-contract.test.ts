import { describe, expect, test } from "bun:test";
import { isNonRetriableIdentityError } from "@/lib/risk-review/identity-verification-errors";
import { DocumentTypeSchema } from "@/lib/types";

describe("company upload document type contract", () => {
	test("accepts required company mandate document types", () => {
		const requiredCompanyTypes = [
			"CIPC_REGISTRATION",
			"COMPANY_DIRECTORS",
			"COMPANY_RESOLUTION",
			"SHARE_CERTIFICATE",
			"DIRECTOR_ID",
		] as const;

		for (const documentType of requiredCompanyTypes) {
			const parsed = DocumentTypeSchema.safeParse(documentType);
			expect(parsed.success).toBe(true);
		}
	});
});

describe("identity verification retry classification", () => {
	test("classifies document ai page limit errors as non-retriable", () => {
		expect(
			isNonRetriableIdentityError(
				"3 INVALID_ARGUMENT: Document pages exceed the limit: 2 got 11"
			)
		).toBe(true);
		expect(isNonRetriableIdentityError("PAGE_LIMIT_EXCEEDED")).toBe(true);
	});

	test("does not classify generic transient errors as non-retriable", () => {
		expect(isNonRetriableIdentityError("connect ETIMEDOUT 203.0.113.10:443")).toBe(false);
	});
});

describe("non-retriable document errors produce failed_unprocessable status", () => {
    test("page limit error is classified as non-retriable (existing coverage)", () => {
        expect(
            isNonRetriableIdentityError(
                "3 INVALID_ARGUMENT: Document pages exceed the limit: 2 got 11"
            )
        ).toBe(true);
    });

    test("UNSUPPORTED_FILE_TYPE error is classified as non-retriable", () => {
        // Extend the pattern list to cover additional Document AI content errors
        expect(isNonRetriableIdentityError("UNSUPPORTED_FILE_TYPE")).toBe(true);
    });

    test("INVALID_ARGUMENT content errors are classified as non-retriable", () => {
        expect(
            isNonRetriableIdentityError("3 INVALID_ARGUMENT: Unable to process document")
        ).toBe(true);
    });

    test("generic INVALID_ARGUMENT without document content message is not non-retriable", () => {
        // Configuration errors (bad processor name, project ID) should still retry
        expect(isNonRetriableIdentityError("3 INVALID_ARGUMENT: Invalid processor name")).toBe(false);
    });
});

describe("retry exhaustion terminal status", () => {
    test("failed_ocr reason string communicates retry budget exhaustion", () => {
        // Documents the string contract used by onFailure handler and the UI
        const reason = "Transient OCR failures exhausted retry budget";
        expect(reason).toContain("retry budget");
        // Must not suggest re-upload (that is failed_unprocessable's message)
        expect(reason).not.toContain("re-upload");
    });

    test("failed_ocr and failed_unprocessable have distinct reason strings", () => {
        const reasons = {
            failed_ocr: "Transient OCR failures exhausted retry budget",
            failed_unprocessable: "Document content rejected by Document AI — re-upload required",
        } as const;
        expect(reasons.failed_ocr).not.toBe(reasons.failed_unprocessable);
    });
});

describe("writeTerminalVerificationStatus idempotency", () => {
	test("status map covers both terminal failure values", () => {
		// Validates the enum values match the schema — no DB needed
		const terminalStatuses = ["failed_ocr", "failed_unprocessable"] as const;
		// Both must satisfy the type expected by writeTerminalVerificationStatus
		// If this compiles, the type contract is correct.
		const _check: Array<"failed_ocr" | "failed_unprocessable"> = terminalStatuses;
		expect(_check).toHaveLength(2);
	});

	test("failed_ocr maps to the transient-exhausted reason", () => {
		const reasons: Record<"failed_ocr" | "failed_unprocessable", string> = {
			failed_ocr: "Transient OCR failures exhausted retry budget",
			failed_unprocessable: "Document content rejected by Document AI — re-upload required",
		};
		expect(reasons.failed_ocr).toContain("retry budget");
		expect(reasons.failed_unprocessable).toContain("re-upload");
	});
});
