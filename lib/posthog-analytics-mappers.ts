import type {
	AnalyticsInsightResultDto,
	AnalyticsTableResultDto,
	AnalyticsTrendsResultDto,
	AnalyticsUnsupportedResultDto,
	TrendSeriesDto,
} from "@/lib/posthog-analytics-dto";

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null;
}

/** Inspect saved insight `query` to choose visualization path. */
export function inferInsightVisualizationKind(rawQuery: unknown): "trends" | "table" | "unsupported" {
	if (!isRecord(rawQuery)) return "unsupported";
	if (rawQuery.kind === "HogQLQuery") return "table";
	if (rawQuery.kind === "DataTableNode") return "table";
	if (rawQuery.kind === "InsightVizNode") {
		const src = rawQuery.source;
		if (isRecord(src)) {
			if (src.kind === "TrendsQuery") return "trends";
			if (src.kind === "HogQLQuery") return "table";
		}
	}
	return "unsupported";
}

interface TrendSeriesRaw {
	label?: string;
	data?: unknown;
	days?: unknown;
	labels?: unknown;
}

function coerceNumber(n: unknown): number {
	if (typeof n === "number" && Number.isFinite(n)) return n;
	if (typeof n === "string") {
		const x = Number(n);
		if (Number.isFinite(x)) return x;
	}
	return 0;
}

function pickXLabels(series: TrendSeriesRaw): string[] {
	if (Array.isArray(series.labels) && series.labels.length > 0) {
		return series.labels.map((x, i) => (typeof x === "string" ? x : String(x ?? i)));
	}
	if (Array.isArray(series.days) && series.days.length > 0) {
		return series.days.map((x, i) => (typeof x === "string" ? x : String(x ?? i)));
	}
	if (Array.isArray(series.data)) {
		return series.data.map((_, i) => String(i));
	}
	return [];
}

function mapTrendSeriesRaw(series: TrendSeriesRaw, index: number): TrendSeriesDto {
	const label = typeof series.label === "string" ? series.label : `Series ${index + 1}`;
	const xs = pickXLabels(series);
	const data = Array.isArray(series.data) ? series.data : [];
	const points = xs.map((x, i) => ({
		x,
		y: coerceNumber(data[i]),
	}));
	return {
		key: `s${index}`,
		label,
		points,
	};
}

/**
 * Map PostHog `POST /api/projects/:id/query/` response bodies to chart DTOs.
 * Shapes vary by query kind; we handle common Trends + HogQL table layouts.
 */
export function mapPostHogQueryResponseToResult(raw: unknown): AnalyticsInsightResultDto {
	if (!isRecord(raw)) {
		return unsupported("empty", "Unexpected empty query response");
	}

	// HogQL / data table: top-level columns + results
	if (Array.isArray(raw.columns) && Array.isArray(raw.results)) {
		const cols = raw.columns.map(c => String(c));
		const rows = raw.results as unknown[][];
		const table: AnalyticsTableResultDto = { kind: "table", columns: cols, rows };
		return table;
	}

	// Trends: array of series under `results`
	if (Array.isArray(raw.results)) {
		const arr = raw.results as unknown[];
		if (arr.length === 0) {
			return unsupported("trends", "No series returned");
		}
		const first = arr[0];
		if (isRecord(first) && Array.isArray(first.data)) {
			const series = arr
				.filter(isRecord)
				.map((s, i) => mapTrendSeriesRaw(s as TrendSeriesRaw, i));
			const trends: AnalyticsTrendsResultDto = { kind: "trends", series };
			return trends;
		}
	}

	// Some responses nest under `result` (singular)
	if (Array.isArray(raw.result)) {
		return mapPostHogQueryResponseToResult({ ...raw, results: raw.result });
	}

	// HogQL via insight runner sometimes returns `results` as tuple rows only
	if (Array.isArray(raw.results) && raw.results.length > 0) {
		const sample = raw.results[0];
		if (Array.isArray(sample)) {
			const n = (sample as unknown[]).length;
			const columns = Array.from({ length: n }, (_, i) => `col_${i}`);
			const table: AnalyticsTableResultDto = {
				kind: "table",
				columns,
				rows: raw.results as unknown[][],
			};
			return table;
		}
	}

	return unsupported("unknown", "Could not map query response to trends or table");
}

function unsupported(insightKind: string, message: string): AnalyticsUnsupportedResultDto {
	return { kind: "unsupported", insightKind, message };
}
