import { z } from "zod";
import { NOTIFICATION_SEVERITIES } from "@/db/schema";
import {
	isNotificationType,
	NOTIFICATION_TYPES,
	type NotificationType,
} from "@/lib/notifications/types";

const NotificationSeveritySchema = z.custom<(typeof NOTIFICATION_SEVERITIES)[number]>(
	val => typeof val === "string" && (NOTIFICATION_SEVERITIES as readonly string[]).includes(val),
	{ message: "Invalid notification severity" }
);

/** SQLite / Drizzle may surface booleans as 0 | 1 */
const sqliteBool = z
	.union([z.boolean(), z.number()])
	.transform(v => Boolean(v));

const DbNotificationRowSchema = z.object({
	id: z.union([z.number(), z.string()]),
	workflowId: z.number().nullable(),
	applicantId: z.number().nullable(),
	type: z.string(),
	message: z.string(),
	read: sqliteBool,
	actionable: z.preprocess(
		val => (val === null || val === undefined ? undefined : val),
		sqliteBool.optional()
	),
	createdAt: z.coerce.date().nullable(),
	sourceEventType: z.string().nullable().optional(),
	clientName: z.string().nullable().optional(),
	severity: z.string().nullable().optional(),
	groupKey: z.string().nullable().optional(),
});

/**
 * Dashboard notification row — shared by dashboard-shell, notifications-panel, and data loaders.
 */
export interface WorkflowNotification {
	id: string;
	workflowId: number;
	applicantId: number;
	clientName: string;
	type: NotificationType;
	message: string;
	timestamp: Date;
	read: boolean;
	actionable?: boolean;
	severity?: (typeof NOTIFICATION_SEVERITIES)[number];
	groupKey?: string;
	sourceEventType?: string | null;
}

/**
 * Server-sent event payload from {@link broadcast} / `/api/notifications/stream`.
 */
export const NotificationStreamEventSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("notification"),
		notificationId: z.number().int().optional(),
	}),
	z.object({
		type: z.literal("update"),
		notificationId: z.number().int().optional(),
	}),
]);

export type NotificationStreamEvent = z.infer<typeof NotificationStreamEventSchema>;

/**
 * Parse and normalize a DB join row into {@link WorkflowNotification}.
 * Returns `null` if the row fails validation (malformed data degrades safely).
 */
export function mapDbNotificationRowToWorkflowNotification(
	raw: unknown
): WorkflowNotification | null {
	const r = DbNotificationRowSchema.safeParse(raw);
	if (!r.success) {
		console.warn(
			"[workflow-notification] Dropped invalid notification row:",
			r.error.flatten()
		);
		return null;
	}
	const n = r.data;
	const severityParsed = NotificationSeveritySchema.safeParse(n.severity ?? undefined);
	return {
		id: String(n.id),
		workflowId: n.workflowId ?? 0,
		applicantId: n.applicantId ?? 0,
		clientName: n.clientName ?? "Unknown",
		type: isNotificationType(n.type) ? n.type : NOTIFICATION_TYPES[0],
		message: n.message,
		timestamp: n.createdAt ?? new Date(),
		read: n.read,
		actionable: n.actionable,
		severity: severityParsed.success ? severityParsed.data : undefined,
		groupKey: n.groupKey ?? undefined,
		sourceEventType: n.sourceEventType ?? null,
	};
}
