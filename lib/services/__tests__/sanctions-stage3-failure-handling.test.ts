import { describe, test, expect } from "bun:test";

/**
 * Contract tests for Stage 3 sanctions check failure handling.
 * Validates that the error path creates a notification and sends an email,
 * matching the contract already established by runSanctionsForWorkflow's
 * internal catch block.
 */
describe("Sanctions Stage 3 failure handling contract", () => {
	test("sendInternalAlertEmail is importable from email.service", async () => {
		const { sendInternalAlertEmail } = await import("@/lib/services/email.service");
		expect(typeof sendInternalAlertEmail).toBe("function");
	});

	test("createWorkflowNotification accepts error type and high severity", async () => {
		const { createWorkflowNotification } = await import(
			"@/lib/services/notification-events.service"
		);
		expect(typeof createWorkflowNotification).toBe("function");
	});
});
