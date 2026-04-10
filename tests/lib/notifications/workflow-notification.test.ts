import { describe, expect, test } from "bun:test";
import {
	mapDbNotificationRowToWorkflowNotification,
	NotificationStreamEventSchema,
} from "@/lib/notifications/workflow-notification";

describe("mapDbNotificationRowToWorkflowNotification", () => {
	test("normalizes a valid row including terminated type and severity", () => {
		const n = mapDbNotificationRowToWorkflowNotification({
			id: 1,
			workflowId: 2,
			applicantId: 3,
			type: "terminated",
			message: "Workflow ended",
			read: 0,
			actionable: null,
			createdAt: new Date("2025-01-01T00:00:00Z"),
			sourceEventType: null,
			clientName: "Acme",
			severity: "high",
			groupKey: "g1",
		});
		expect(n).not.toBeNull();
		expect(n?.type).toBe("terminated");
		expect(n?.severity).toBe("high");
		expect(n?.groupKey).toBe("g1");
		expect(n?.actionable).toBeUndefined();
	});

	test("returns null for malformed rows", () => {
		expect(
			mapDbNotificationRowToWorkflowNotification({
				id: 1,
				workflowId: "bad",
				applicantId: 1,
				type: "info",
				message: "m",
				read: false,
				createdAt: new Date(),
			} as unknown)
		).toBeNull();
	});
});

describe("NotificationStreamEventSchema", () => {
	test("accepts notification and update shapes", () => {
		expect(NotificationStreamEventSchema.safeParse({ type: "notification" }).success).toBe(true);
		expect(NotificationStreamEventSchema.safeParse({ type: "update" }).success).toBe(true);
	});

	test("rejects arbitrary payloads", () => {
		expect(NotificationStreamEventSchema.safeParse({ type: "ping" }).success).toBe(false);
		expect(NotificationStreamEventSchema.safeParse(null).success).toBe(false);
	});
});
