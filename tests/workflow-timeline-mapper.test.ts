import { describe, expect, it } from "bun:test";
import {
	formatWorkflowEventType,
	mapWorkflowEventRowsToTimelineItems,
	mapWorkflowEventRowToTimelineItem,
	parseWorkflowEventPayload,
} from "@/lib/dashboard/workflow-timeline-mapper";

const baseDate = new Date("2026-04-07T12:00:00.000Z");

describe("parseWorkflowEventPayload", () => {
	it("returns null for null payload", () => {
		expect(parseWorkflowEventPayload(null)).toBeNull();
	});

	it("returns object for valid JSON object", () => {
		expect(parseWorkflowEventPayload('{"context":"procurement_check_failed"}')).toEqual({
			context: "procurement_check_failed",
		});
	});

	it("returns null for non-object JSON", () => {
		expect(parseWorkflowEventPayload('"string"')).toBeNull();
	});

	it("returns null for malformed JSON", () => {
		expect(parseWorkflowEventPayload("{not json")).toBeNull();
	});
});

describe("formatWorkflowEventType", () => {
	it("title-cases snake_case", () => {
		expect(formatWorkflowEventType("stage_change")).toBe("Stage Change");
	});
});

describe("mapWorkflowEventRowToTimelineItem", () => {
	it("maps platform actor to Automation label", () => {
		const item = mapWorkflowEventRowToTimelineItem({
			id: 1,
			workflowId: 10,
			eventType: "stage_change",
			payload: null,
			timestamp: baseDate,
			actorType: "platform",
			actorId: null,
		});
		expect(item.actorKind).toBe("platform");
		expect(item.actorBadgeLabel).toBe("Automation");
		expect(item.dotTone).toBe("success");
	});

	it("maps user actor to Human", () => {
		const item = mapWorkflowEventRowToTimelineItem({
			id: 2,
			workflowId: 10,
			eventType: "human_adjudication",
			payload: null,
			timestamp: baseDate,
			actorType: "user",
			actorId: "user_abc",
		});
		expect(item.actorKind).toBe("human");
		expect(item.actorBadgeLabel).toBe("Human");
		expect(item.actorId).toBe("user_abc");
	});

	it("maps agent actor", () => {
		const item = mapWorkflowEventRowToTimelineItem({
			id: 3,
			workflowId: 10,
			eventType: "agent_dispatch",
			payload: null,
			timestamp: baseDate,
			actorType: "agent",
			actorId: "gemini",
		});
		expect(item.actorKind).toBe("agent");
		expect(item.actorBadgeLabel).toBe("Agent");
	});

	it("defaults missing actor to System", () => {
		const item = mapWorkflowEventRowToTimelineItem({
			id: 4,
			workflowId: 10,
			eventType: "timeout",
			payload: null,
			timestamp: baseDate,
			actorType: null,
			actorId: null,
		});
		expect(item.actorKind).toBe("system");
		expect(item.actorBadgeLabel).toBe("System");
	});

	it("detects procurement execution failure banner", () => {
		const item = mapWorkflowEventRowToTimelineItem({
			id: 5,
			workflowId: 10,
			eventType: "error",
			payload: JSON.stringify({ context: "procurement_check_failed" }),
			timestamp: baseDate,
			actorType: "platform",
			actorId: null,
		});
		expect(item.procurementFailureBanner).toBe(true);
		expect(item.title).toBe("Procurement Automation Failed");
		expect(item.dotTone).toBe("error");
	});

	it("maps error without procurement context to formatted type", () => {
		const item = mapWorkflowEventRowToTimelineItem({
			id: 6,
			workflowId: 10,
			eventType: "error",
			payload: JSON.stringify({ message: "oops" }),
			timestamp: baseDate,
			actorType: null,
			actorId: null,
		});
		expect(item.procurementFailureBanner).toBe(false);
		expect(item.title).toBe("Error");
	});

	it("uses current time when timestamp is null", () => {
		const before = Date.now();
		const item = mapWorkflowEventRowToTimelineItem({
			id: 7,
			workflowId: 10,
			eventType: "stage_change",
			payload: null,
			timestamp: null,
			actorType: "platform",
			actorId: null,
		});
		const after = Date.now();
		expect(item.timestamp.getTime()).toBeGreaterThanOrEqual(before);
		expect(item.timestamp.getTime()).toBeLessThanOrEqual(after);
	});
});

describe("mapWorkflowEventRowsToTimelineItems", () => {
	it("maps multiple rows in order", () => {
		const rows = [
			{
				id: 1,
				workflowId: 1,
				eventType: "a",
				payload: null,
				timestamp: baseDate,
				actorType: "platform" as const,
				actorId: null,
			},
			{
				id: 2,
				workflowId: 1,
				eventType: "b",
				payload: null,
				timestamp: baseDate,
				actorType: "user" as const,
				actorId: null,
			},
		];
		const items = mapWorkflowEventRowsToTimelineItems(rows);
		expect(items).toHaveLength(2);
		expect(items[0]?.title).toBe("A");
		expect(items[1]?.title).toBe("B");
	});
});
