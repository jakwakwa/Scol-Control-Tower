import { describe, expect, test } from "bun:test";
import {
	NOTIFICATION_ROUTING_SOURCE_EVENTS,
	parseCreateWorkflowNotificationInput,
} from "@/lib/notifications/contract";

describe("parseCreateWorkflowNotificationInput", () => {
	test("accepts valid payload with sourceEventType", () => {
		const parsed = parseCreateWorkflowNotificationInput({
			workflowId: 1,
			applicantId: 2,
			type: "info",
			title: "T",
			message: "M",
			severity: "high",
			sourceEventType: "vat_verification_completed",
		});
		expect(parsed).not.toBeNull();
		expect(parsed?.sourceEventType).toBe("vat_verification_completed");
	});

	test("rejects invalid notification type", () => {
		const parsed = parseCreateWorkflowNotificationInput({
			workflowId: 1,
			applicantId: 2,
			type: "not_a_real_type",
			title: "T",
			message: "M",
			severity: "high",
		});
		expect(parsed).toBeNull();
	});

	test("coerces empty sourceEventType string to null", () => {
		const parsed = parseCreateWorkflowNotificationInput({
			workflowId: 1,
			applicantId: 2,
			type: "info",
			title: "T",
			message: "M",
			severity: "high",
			sourceEventType: "",
		});
		expect(parsed?.sourceEventType).toBeNull();
	});

	test("routing events list includes VAT event emitted by Stage 3", () => {
		expect(NOTIFICATION_ROUTING_SOURCE_EVENTS).toEqual(["vat_verification_completed"]);
	});
});
