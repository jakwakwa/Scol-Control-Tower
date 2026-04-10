import { describe, expect, mock, test } from "bun:test";

mock.module("@/app/utils", () => ({
	getDatabaseClient: () => null,
}));

const { writeTerminalVerificationStatus } = await import(
	"@/lib/services/identity-verification-terminal"
);

describe("writeTerminalVerificationStatus", () => {
	test("throws when database client is unavailable so callers can retry", async () => {
		await expect(
			writeTerminalVerificationStatus({
				documentId: 42,
				status: "failed_ocr",
				reason: "test",
			})
		).rejects.toThrow(/getDatabaseClient\(\) returned no client/);
	});
});
