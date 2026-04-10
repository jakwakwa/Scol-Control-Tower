import { describe, expect, test } from "bun:test";
import {
	AUTO_VERIFY_IDENTITY_INNGEST_RETRIES,
	classifyIdentityStepOutcome,
	FAILED_OCR_REASON,
	FAILED_UNPROCESSABLE_REASON,
} from "@/lib/services/identity-verification-inngest-logic";

describe("classifyIdentityStepOutcome", () => {
	test("success path: result without error yields success kind", () => {
		const result = classifyIdentityStepOutcome({
			data: { entities: [{ type: "ID_NUMBER" }] },
		});
		expect(result.kind).toBe("success");
		if (result.kind === "success") {
			expect(result.result).toEqual({ data: { entities: [{ type: "ID_NUMBER" }] } });
		}
	});

	test("persistent / unprocessable: non-retriable error yields terminal_unprocessable", () => {
		const result = classifyIdentityStepOutcome({
			error: "3 INVALID_ARGUMENT: No text detected in image.",
		});
		expect(result.kind).toBe("terminal_unprocessable");
		if (result.kind === "terminal_unprocessable") {
			expect(result.errorMessage).toContain("No text detected");
		}
	});

	test("retriable: generic network error yields throw_for_inngest_retry", () => {
		const result = classifyIdentityStepOutcome({
			error: "connect ETIMEDOUT 203.0.113.10:443",
		});
		expect(result.kind).toBe("throw_for_inngest_retry");
		if (result.kind === "throw_for_inngest_retry") {
			expect(result.errorMessage).toContain("ETIMEDOUT");
		}
	});

	test("error branch with empty message is not misclassified as success", () => {
		const result = classifyIdentityStepOutcome({ error: "" });
		expect(result.kind).not.toBe("success");
		if (result.kind === "throw_for_inngest_retry") {
			expect(result.errorMessage).toBe("Unknown identity verification error");
		}
	});

	test("recovery: transient error then success classifies independently", () => {
		const first = classifyIdentityStepOutcome({
			error: "connect ETIMEDOUT 10.0.0.1:443",
		});
		const second = classifyIdentityStepOutcome({ data: { entities: [] } });
		expect(first.kind).toBe("throw_for_inngest_retry");
		expect(second.kind).toBe("success");
	});

	test("AUTO_VERIFY_IDENTITY_INNGEST_RETRIES is 4", () => {
		expect(AUTO_VERIFY_IDENTITY_INNGEST_RETRIES).toBe(4);
	});

	test("terminal reason strings stay distinct", () => {
		expect(FAILED_OCR_REASON).not.toBe(FAILED_UNPROCESSABLE_REASON);
		expect(FAILED_OCR_REASON).toContain("retry budget");
		expect(FAILED_UNPROCESSABLE_REASON).toContain("re-upload");
	});
});
