import { describe, expect, test } from "bun:test";
import { isNotificationType, NOTIFICATION_TYPES } from "@/lib/notifications/types";

describe("NotificationType", () => {
	test("terminated is a canonical type", () => {
		expect(NOTIFICATION_TYPES).toContain("terminated");
		expect(isNotificationType("terminated")).toBe(true);
	});

	test("unknown strings are not notification types", () => {
		expect(isNotificationType("bogus")).toBe(false);
		expect(isNotificationType(undefined)).toBe(false);
	});
});
