import { beforeEach, describe, expect, mock, test } from "bun:test";
import { FAILED_OCR_REASON } from "@/lib/services/identity-verification-inngest-logic";

const writeTerminal = mock(() => Promise.resolve());
const recordFailure = mock(() => undefined);
const logEvent = mock(() => Promise.resolve());
const notify = mock(() => Promise.resolve());

mock.module("@/lib/services/identity-verification-terminal", () => ({
	writeTerminalVerificationStatus: writeTerminal,
}));

mock.module("@/lib/services/telemetry/vendor-metrics", () => ({
	recordVendorCheckFailure: recordFailure,
}));

mock.module("@/lib/services/notification-events.service", () => ({
	logWorkflowEvent: logEvent,
	createWorkflowNotification: notify,
}));

const { handleAutoVerifyIdentityRetryExhausted } = await import(
	"@/lib/services/identity-verification-on-failure"
);

describe("handleAutoVerifyIdentityRetryExhausted", () => {
	beforeEach(() => {
		writeTerminal.mockReset();
		recordFailure.mockReset();
		logEvent.mockReset();
		notify.mockReset();
		writeTerminal.mockResolvedValue(undefined);
		logEvent.mockResolvedValue(undefined);
		notify.mockResolvedValue(undefined);
	});

	test("persists failed_ocr terminal status before best-effort logging", async () => {
		const err = new Error("Identity verification failed: last attempt");

		await handleAutoVerifyIdentityRetryExhausted({
			workflowId: 10,
			applicantId: 20,
			documentId: 30,
			documentType: "ID_DOCUMENT",
			error: err,
		});

		expect(writeTerminal).toHaveBeenCalledTimes(1);
		expect(writeTerminal.mock.calls[0]?.[0]).toEqual(
			expect.objectContaining({
				documentId: 30,
				status: "failed_ocr",
				reason: FAILED_OCR_REASON,
				errorMessage: err.message,
			})
		);

		expect(recordFailure).toHaveBeenCalledTimes(1);
		expect(logEvent).toHaveBeenCalledTimes(1);
		expect(notify).toHaveBeenCalledTimes(1);
	});
});
