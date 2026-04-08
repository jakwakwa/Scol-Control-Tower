import { describe, expect, it } from "bun:test";
import {
	ENTITIES_LIST_EXCLUDED_WORKFLOW_STATUSES,
	parseEntitiesShowHistory,
} from "@/app/api/risk-review/entities/route";

describe("parseEntitiesShowHistory", () => {
	it("is false when showHistory is absent", () => {
		expect(parseEntitiesShowHistory(new URLSearchParams())).toBe(false);
		expect(parseEntitiesShowHistory(new URLSearchParams("page=1"))).toBe(false);
	});

	it("is true only for the literal string true", () => {
		expect(parseEntitiesShowHistory(new URLSearchParams("showHistory=true"))).toBe(true);
		expect(parseEntitiesShowHistory(new URLSearchParams("showHistory=1"))).toBe(false);
		expect(parseEntitiesShowHistory(new URLSearchParams("showHistory=false"))).toBe(
			false
		);
	});
});

describe("ENTITIES_LIST_EXCLUDED_WORKFLOW_STATUSES", () => {
	it("matches the hide-history terminal workflow filter", () => {
		expect([...ENTITIES_LIST_EXCLUDED_WORKFLOW_STATUSES]).toEqual([
			"completed",
			"terminated",
			"failed",
		]);
	});
});
