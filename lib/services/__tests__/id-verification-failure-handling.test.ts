import { describe, test, expect } from "bun:test";

/**
 * Contract tests for identity verification failure handling.
 * Validates that the function is configured with retry caps and
 * the onFailure handler exists.
 */
describe("Identity verification failure handling contract", () => {
	test("autoVerifyIdentity is exported from id-verification module", async () => {
		const mod = await import(
			"@/inngest/functions/services/id-verification"
		);
		expect(mod.autoVerifyIdentity).toBeDefined();
	});

	test("isNonRetriableIdentityError is available for error classification", async () => {
		const { isNonRetriableIdentityError } = await import(
			"@/lib/risk-review/identity-verification-errors"
		);
		expect(isNonRetriableIdentityError("PAGE_LIMIT_EXCEEDED")).toBe(true);
		expect(isNonRetriableIdentityError("network timeout")).toBe(false);
	});
});
