import { describe, expect, it } from "bun:test";
import {
	inferInsightVisualizationKind,
	mapPostHogQueryResponseToResult,
} from "@/lib/posthog-analytics-mappers";

describe("inferInsightVisualizationKind", () => {
	it("detects TrendsQuery", () => {
		const q = {
			kind: "InsightVizNode",
			source: { kind: "TrendsQuery", series: [] },
		};
		expect(inferInsightVisualizationKind(q)).toBe("trends");
	});

	it("detects DataTableNode + HogQL", () => {
		const q = {
			kind: "DataTableNode",
			source: { kind: "HogQLQuery", query: "SELECT 1" },
		};
		expect(inferInsightVisualizationKind(q)).toBe("table");
	});

	it("returns unsupported for funnels", () => {
		const q = {
			kind: "InsightVizNode",
			source: { kind: "FunnelsQuery" },
		};
		expect(inferInsightVisualizationKind(q)).toBe("unsupported");
	});
});

describe("mapPostHogQueryResponseToResult", () => {
	it("maps HogQL columns + results to table", () => {
		const r = mapPostHogQueryResponseToResult({
			columns: ["a", "b"],
			results: [
				[1, 2],
				[3, 4],
			],
		});
		expect(r.kind).toBe("table");
		if (r.kind === "table") {
			expect(r.columns).toEqual(["a", "b"]);
			expect(r.rows).toHaveLength(2);
		}
	});

	it("maps trends-style results array", () => {
		const r = mapPostHogQueryResponseToResult({
			results: [
				{
					label: "A",
					data: [1, 2],
					labels: ["d1", "d2"],
				},
			],
		});
		expect(r.kind).toBe("trends");
		if (r.kind === "trends") {
			expect(r.series).toHaveLength(1);
			expect(r.series[0]?.points).toHaveLength(2);
			expect(r.series[0]?.points[0]?.y).toBe(1);
		}
	});

	it("maps result singular alias", () => {
		const r = mapPostHogQueryResponseToResult({
			result: [
				{
					label: "S",
					data: [5],
					labels: ["x"],
				},
			],
		});
		expect(r.kind).toBe("trends");
	});
});
