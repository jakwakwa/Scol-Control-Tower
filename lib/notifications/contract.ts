import { z } from "zod";
import { NOTIFICATION_SEVERITIES } from "@/db/schema";
import { NOTIFICATION_TYPES, type NotificationType } from "@/lib/notifications/types";

/**
 * Event types persisted on notification rows for structured routing.
 * Keep in sync with producers that pass `sourceEventType` into `createWorkflowNotification`.
 */
export const NOTIFICATION_ROUTING_SOURCE_EVENTS = ["vat_verification_completed"] as const;

const NotificationTypeSchema = z.custom<NotificationType>(
	val => typeof val === "string" && (NOTIFICATION_TYPES as readonly string[]).includes(val),
	{ message: "Invalid notification type" }
);

const NotificationSeveritySchema = z.custom<
	(typeof NOTIFICATION_SEVERITIES)[number]
>(
	val =>
		typeof val === "string" && (NOTIFICATION_SEVERITIES as readonly string[]).includes(val),
	{ message: "Invalid notification severity" }
);

const NotificationErrorDetailsSchema = z.object({
	message: z.string(),
	code: z.string().optional(),
	raw: z.unknown().optional(),
});

/** Params accepted by `createWorkflowNotification` after validation. */
export const CreateWorkflowNotificationParamsSchema = z.object({
	workflowId: z.number().int(),
	applicantId: z.number().int(),
	type: NotificationTypeSchema,
	title: z.string(),
	message: z.string(),
	actionable: z.boolean().optional(),
	errorDetails: NotificationErrorDetailsSchema.optional(),
	severity: NotificationSeveritySchema.optional(),
	groupKey: z.string().optional(),
	sourceEventType: z.preprocess(
		val => (val === "" ? null : val),
		z.string().max(128).nullable().optional()
	),
});

export type CreateWorkflowNotificationInput = z.infer<
	typeof CreateWorkflowNotificationParamsSchema
>;

export function parseCreateWorkflowNotificationInput(
	raw: unknown
): CreateWorkflowNotificationInput | null {
	const result = CreateWorkflowNotificationParamsSchema.safeParse(raw);
	if (!result.success) {
		console.error(
			"[notifications/contract] Invalid createWorkflowNotification params:",
			result.error.flatten()
		);
		return null;
	}
	return result.data;
}
