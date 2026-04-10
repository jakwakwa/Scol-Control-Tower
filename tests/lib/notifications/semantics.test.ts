import { describe, expect, test } from "bun:test";
import { NOTIFICATION_ROUTING_SOURCE_EVENTS } from "@/lib/notifications/contract";
import {
	classifyNotification,
	getNotificationRoute,
	isVatNotification,
} from "@/lib/notifications/semantics";

describe("notification semantics", () => {
	test("VAT routes via sourceEventType without VAT phrases in message", () => {
		const input = {
			message: "Application update for client.",
			sourceEventType: "vat_verification_completed",
			applicantId: 42,
		};
		expect(isVatNotification(input)).toBe(true);
		expect(getNotificationRoute(input)).toBe("/dashboard/risk-review/reports/42");
	});

	test("legacy VAT messages still classify when sourceEventType absent", () => {
		const input = { message: "VAT verification pending for applicant" };
		expect(classifyNotification(input)).toBe("vat_verification");
		expect(isVatNotification(input)).toBe(true);
	});

	test("unknown sourceEventType falls back to message classification", () => {
		const input = {
			message: "manual sanctions check required",
			sourceEventType: "not_a_real_event",
		};
		expect(classifyNotification(input)).toBe("sanctions_manual");
	});

	test("routing event constants stay wired for VAT drift test", () => {
		expect(NOTIFICATION_ROUTING_SOURCE_EVENTS).toContain("vat_verification_completed");
	});
});
