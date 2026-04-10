import type { NotificationCategory } from "@/lib/notifications/notification-category";

/**
 * Maps persisted `notifications.source_event_type` (workflow log event names) to routing categories.
 * Add entries here when producers pass `sourceEventType` — UI routes without matching user copy.
 *
 * @see lib/services/notification-events.service LogEventParams.eventType
 */
export const SOURCE_EVENT_ROUTING = {
	vat_verification_completed: "vat_verification",
	risk_manager_review: "pre_risk_review",
	quote_generated: "quote_review",
	quote_sent: "quote_review",
	quote_adjusted: "quote_review",
	quote_needs_update: "quote_review",
	vendor_check_failed: "procurement_manual",
} as const satisfies Record<string, NotificationCategory>;

export type KnownRoutingSourceEvent = keyof typeof SOURCE_EVENT_ROUTING;

/** All structured keys we recognize for drift tests and documentation */
export const NOTIFICATION_ROUTING_SOURCE_EVENTS = Object.keys(
	SOURCE_EVENT_ROUTING
) as KnownRoutingSourceEvent[];

export function categoryFromStructuredSourceEvent(
	event: string
): NotificationCategory | null {
	const k = event.trim();
	if (k in SOURCE_EVENT_ROUTING) {
		return SOURCE_EVENT_ROUTING[k as KnownRoutingSourceEvent];
	}
	return null;
}
