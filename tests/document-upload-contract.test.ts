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
