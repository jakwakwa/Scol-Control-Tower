export const NOTIFICATION_TYPES = [
	"awaiting",
	"completed",
	"failed",
	"timeout",
	"paused",
	"error",
	"warning",
	"info",
	"success",
	"terminated",
	"reminder",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export function isNotificationType(value: unknown): value is NotificationType {
	return NOTIFICATION_TYPES.includes(value as NotificationType);
}
