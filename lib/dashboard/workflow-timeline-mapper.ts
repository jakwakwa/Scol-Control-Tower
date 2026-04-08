/**
 * Maps persisted `workflow_events` rows to a stable UI DTO for dashboard timelines.
 * Keeps workflow detail, future feeds, and notifications aligned on one contract.
 */

export type WorkflowTimelineActorKind = "human" | "agent" | "platform" | "system";

export type WorkflowTimelineDotTone = "error" | "success";

export interface WorkflowTimelineItem {
	id: number;
	workflowId: number | null;
	timestamp: Date;
	title: string;
	dotTone: WorkflowTimelineDotTone;
	procurementFailureBanner: boolean;
	payload: string | null;
	parsedPayload: Record<string, unknown> | null;
	actorBadgeLabel: string;
	actorKind: WorkflowTimelineActorKind;
	/** Raw actor id from the event row, if any (display only). */
	actorId: string | null;
}

/** Minimal row shape from DB or Drizzle select — avoids coupling mapper to schema inference. */
export type WorkflowEventRowInput = {
	id: number;
	workflowId: number | null;
	eventType: string;
	payload: string | null;
	timestamp: Date | null;
	actorType: string | null;
	actorId: string | null;
};

export function parseWorkflowEventPayload(
	payload: string | null
): Record<string, unknown> | null {
	if (!payload) return null;
	try {
		const data: unknown = JSON.parse(payload);
		if (data !== null && typeof data === "object" && !Array.isArray(data)) {
			return data as Record<string, unknown>;
		}
		return null;
	} catch {
		return null;
	}
}

export function formatWorkflowEventType(type: string): string {
	return type
		.split("_")
		.map(w => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
}

function isProcurementExecutionFailure(
	eventType: string,
	parsed: Record<string, unknown> | null
): boolean {
	return (
		eventType === "error" &&
		parsed !== null &&
		parsed.context === "procurement_check_failed"
	);
}

function actorFromRow(actorType: string | null): {
	kind: WorkflowTimelineActorKind;
	badgeLabel: string;
} {
	const normalized = (actorType ?? "").toLowerCase();
	if (normalized === "user") {
		return { kind: "human", badgeLabel: "Human" };
	}
	if (normalized === "agent") {
		return { kind: "agent", badgeLabel: "Agent" };
	}
	if (normalized === "platform") {
		return { kind: "platform", badgeLabel: "Automation" };
	}
	return { kind: "system", badgeLabel: "System" };
}

export function mapWorkflowEventRowToTimelineItem(
	row: WorkflowEventRowInput
): WorkflowTimelineItem {
	const parsedPayload = parseWorkflowEventPayload(row.payload);
	const procurementFailureBanner = isProcurementExecutionFailure(
		row.eventType,
		parsedPayload
	);
	const title = procurementFailureBanner
		? "Procurement Automation Failed"
		: formatWorkflowEventType(row.eventType);
	const dotTone: WorkflowTimelineDotTone =
		row.eventType === "error" ? "error" : "success";
	const ts = row.timestamp ?? new Date();
	const { kind, badgeLabel } = actorFromRow(row.actorType);

	return {
		id: row.id,
		workflowId: row.workflowId,
		timestamp: ts,
		title,
		dotTone,
		procurementFailureBanner,
		payload: row.payload,
		parsedPayload,
		actorBadgeLabel: badgeLabel,
		actorKind: kind,
		actorId: row.actorId,
	};
}

export function mapWorkflowEventRowsToTimelineItems(
	rows: WorkflowEventRowInput[]
): WorkflowTimelineItem[] {
	return rows.map(mapWorkflowEventRowToTimelineItem);
}
