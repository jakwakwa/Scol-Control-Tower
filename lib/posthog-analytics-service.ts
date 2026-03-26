import type {
	AnalyticsDashboardDetailDto,
	AnalyticsDashboardSummaryDto,
	AnalyticsDashboardTileDto,
	AnalyticsInsightQueryResponseDto,
} from "@/lib/posthog-analytics-dto";
import {
	inferInsightVisualizationKind,
	mapPostHogQueryResponseToResult,
} from "@/lib/posthog-analytics-mappers";
import {
	buildPostHogInsightWebUrl,
	getPostHogProjectId,
	posthogProjectFetch,
} from "@/lib/posthog-rest";

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null;
}

export function mapDashboardListPayload(raw: unknown): AnalyticsDashboardSummaryDto[] {
	if (!(isRecord(raw) && Array.isArray(raw.results))) return [];
	return raw.results
		.filter(isRecord)
		.map(r => ({
			id: typeof r.id === "number" ? r.id : Number(r.id),
			name: typeof r.name === "string" ? r.name : "Untitled",
			description: typeof r.description === "string" ? r.description : undefined,
		}))
		.filter(d => Number.isFinite(d.id));
}

export function mapDashboardDetailPayload(raw: unknown): AnalyticsDashboardDetailDto | null {
	if (!isRecord(raw)) return null;
	const id = typeof raw.id === "number" ? raw.id : Number(raw.id);
	if (!Number.isFinite(id)) return null;
	const name = typeof raw.name === "string" ? raw.name : "Dashboard";
	const description = typeof raw.description === "string" ? raw.description : undefined;
	const tilesRaw = raw.tiles;
	const tiles: AnalyticsDashboardTileDto[] = [];
	if (Array.isArray(tilesRaw)) {
		for (let i = 0; i < tilesRaw.length; i++) {
			const t = tilesRaw[i];
			if (!isRecord(t)) continue;
			const ins = t.insight;
			if (!isRecord(ins)) continue;
			const insightId = typeof ins.id === "number" ? ins.id : null;
			const insightShortId = typeof ins.short_id === "string" ? ins.short_id : null;
			const tileName = typeof ins.name === "string" ? ins.name : null;
			tiles.push({
				tileId: typeof t.id === "string" || typeof t.id === "number" ? String(t.id) : `tile-${i}`,
				insightId,
				insightShortId,
				name: tileName,
			});
		}
	}
	return { id, name, description, tiles };
}

export async function listPostHogDashboards(): Promise<AnalyticsDashboardSummaryDto[]> {
	const data = await posthogProjectFetch<unknown>("/dashboards/?limit=500", { method: "GET" });
	return mapDashboardListPayload(data);
}

export async function getPostHogDashboardDetail(dashboardId: number): Promise<AnalyticsDashboardDetailDto | null> {
	const data = await posthogProjectFetch<unknown>(`/dashboards/${dashboardId}/`, { method: "GET" });
	return mapDashboardDetailPayload(data);
}

export async function getPostHogInsightQueryResult(insightId: number): Promise<AnalyticsInsightQueryResponseDto> {
	const projectId = getPostHogProjectId();
	const insight = await posthogProjectFetch<Record<string, unknown>>(`/insights/${insightId}/`, {
		method: "GET",
	});
	const id = typeof insight.id === "number" ? insight.id : insightId;
	const name = typeof insight.name === "string" ? insight.name : `Insight ${id}`;
	const shortId = typeof insight.short_id === "string" ? insight.short_id : null;
	const posthogUrl = buildPostHogInsightWebUrl(projectId, shortId ?? String(id));
	const q = insight.query;

	if (q == null) {
		return {
			insightId: id,
			name,
			shortId,
			result: {
				kind: "unsupported",
				insightKind: "none",
				message: "This insight has no query definition.",
			},
			posthogUrl,
		};
	}

	const viz = inferInsightVisualizationKind(q);
	if (viz === "unsupported") {
		const kindStr = isRecord(q) && typeof q.kind === "string" ? q.kind : "unknown";
		return {
			insightId: id,
			name,
			shortId,
			result: {
				kind: "unsupported",
				insightKind: kindStr,
				message: "This insight type is not supported in-app yet. Open in PostHog to view.",
			},
			posthogUrl,
		};
	}

	const rawRes = await posthogProjectFetch<unknown>("/query/", {
		method: "POST",
		body: JSON.stringify({
			query: q,
			name: `control-tower-${name}`.slice(0, 120),
		}),
	});

	const mapped = mapPostHogQueryResponseToResult(rawRes);
	return {
		insightId: id,
		name,
		shortId,
		result: mapped,
		posthogUrl,
	};
}
