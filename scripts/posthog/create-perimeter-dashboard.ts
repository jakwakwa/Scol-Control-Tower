/**
 * Creates (or reuses) a PostHog dashboard + saved insights for `perimeter_validation_attempt`.
 *
 * Auth: **POSTHOG_PERSONAL_API_KEY** only (User settings → Personal API keys; scopes: insight + dashboard write, query read).
 * `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` are **project** keys (`phc_…`) for capture in the browser/SDK;
 * PostHog’s private REST API rejects them as Bearer tokens (401 authentication_failed).
 *
 * Usage:
 *   bun run posthog:perimeter-dashboard
 *
 * Optional env:
 *   POSTHOG_API_HOST — REST API base (default https://us.posthog.com). Use if NEXT_PUBLIC_POSTHOG_HOST points at ingest (`*.i.posthog.com`).
 *   NEXT_PUBLIC_POSTHOG_HOST — fallback API host when POSTHOG_API_HOST unset and not an ingest-only URL
 *   POSTHOG_PROJECT_ID (default 349918)
 *   POSTHOG_PERIMETER_DASHBOARD_NAME
 *   POSTHOG_PERIMETER_FORCE_INSIGHTS=1  recreate insights even if tiles already exist
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getPostHogProjectToken } from "../../lib/posthog-env";
import { getPostHogProjectId, posthogProjectFetch } from "../../lib/posthog-rest";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DASHBOARD_NAME_DEFAULT = "Perimeter validation — Control Tower";

function loadDotEnvFiles(): void {
	const root = resolve(__dirname, "../..");
	for (const name of [".env.local", ".env"]) {
		const p = resolve(root, name);
		if (!existsSync(p)) continue;
		const raw = readFileSync(p, "utf8");
		for (const line of raw.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) continue;
			const eq = trimmed.indexOf("=");
			if (eq === -1) continue;
			const k = trimmed.slice(0, eq).trim();
			let v = trimmed.slice(eq + 1).trim();
			if (
				(v.startsWith('"') && v.endsWith('"')) ||
				(v.startsWith("'") && v.endsWith("'"))
			) {
				v = v.slice(1, -1);
			}
			if (!(k in process.env) || process.env[k] === "") {
				process.env[k] = v;
			}
		}
	}
}

interface DashboardSummary {
	id: number;
	name: string;
}

interface DashboardList {
	results?: DashboardSummary[];
}

interface DashboardDetail {
	id: number;
	name: string;
	tiles?: Array<{ insight?: { id: number; name?: string } | null }>;
}

interface InsightCreateResponse {
	id: number;
	short_id?: string;
	name?: string;
}

async function findDashboardByName(name: string): Promise<number | null> {
	const list = await posthogProjectFetch<DashboardList>("/dashboards/?limit=500", {
		method: "GET",
	});
	const hit = list.results?.find(d => d.name === name);
	return hit?.id ?? null;
}

async function createDashboard(name: string): Promise<number> {
	const created = await posthogProjectFetch<DashboardSummary>("/dashboards/", {
		method: "POST",
		body: JSON.stringify({
			name,
			description:
				"Perimeter schema validation telemetry (event: perimeter_validation_attempt). Created by scripts/posthog/create-perimeter-dashboard.ts",
			pinned: false,
		}),
	});
	return created.id;
}

async function getDashboardTilesMeta(
	dashboardId: number
): Promise<{ tileCount: number; insightNames: Set<string> }> {
	const d = await posthogProjectFetch<DashboardDetail>(`/dashboards/${dashboardId}/`, {
		method: "GET",
	});
	const tiles = d.tiles ?? [];
	const insightNames = new Set<string>();
	for (const t of tiles) {
		const n = t.insight?.name;
		if (n) insightNames.add(n);
	}
	return { tileCount: tiles.filter(t => t.insight?.id).length, insightNames };
}

async function createInsight(
	body: Record<string, unknown>
): Promise<InsightCreateResponse> {
	return posthogProjectFetch<InsightCreateResponse>("/insights/", {
		method: "POST",
		body: JSON.stringify(body),
	});
}

async function main(): Promise<void> {
	loadDotEnvFiles();

	const personalKey = process.env.POSTHOG_PERSONAL_API_KEY?.trim();
	const projectToken = getPostHogProjectToken();
	const _projectId = getPostHogProjectId();
	const dashboardName =
		process.env.POSTHOG_PERIMETER_DASHBOARD_NAME?.trim() || DASHBOARD_NAME_DEFAULT;
	const forceInsights = process.env.POSTHOG_PERIMETER_FORCE_INSIGHTS === "1";

	if (!personalKey) {
		if (projectToken) {
			console.error(
				"Missing POSTHOG_PERSONAL_API_KEY. You have NEXT_PUBLIC_POSTHOG_KEY or NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN set — that is the project capture key (phc_…), not a personal API key. PostHog’s dashboard/insight API requires a Personal API key (phx_…) from User settings → Personal API keys (insight write, dashboard write, query read). See docs/posthog-perimeter-dashboard.md."
			);
		} else {
			console.error(
				"Missing POSTHOG_PERSONAL_API_KEY. Create a Personal API key in PostHog (User settings → Personal API keys) and add it to .env.local. See docs/posthog-perimeter-dashboard.md."
			);
		}
		process.exit(1);
	}

	let dashboardId = await findDashboardByName(dashboardName);
	if (dashboardId == null) {
		dashboardId = await createDashboard(dashboardName);
	}

	const { tileCount: existingTiles, insightNames } =
		await getDashboardTilesMeta(dashboardId);
	if (existingTiles >= 4 && !forceInsights) {
		return;
	}

	const hogqlVolume = `
SELECT
  toStartOfDay(timestamp) AS day,
  ifNull(nullIf(JSONExtractString(properties, 'env'), ''), '(empty)') AS env,
  ifNull(nullIf(JSONExtractString(properties, 'perimeter_id'), ''), '(empty)') AS perimeter_id,
  sum(
    if(
      JSONExtractString(properties, 'result') = 'pass',
      toFloatOrZero(JSONExtractString(properties, 'sampling_weight')),
      1
    )
  ) AS estimated_attempts
FROM events
WHERE event = 'perimeter_validation_attempt'
  AND timestamp >= now() - INTERVAL 30 DAY
GROUP BY day, env, perimeter_id
ORDER BY day DESC, estimated_attempts DESC
LIMIT 500
`.trim();

	const hogqlPassRate = `
SELECT
  ifNull(nullIf(JSONExtractString(properties, 'env'), ''), '(empty)') AS env,
  ifNull(nullIf(JSONExtractString(properties, 'perimeter_id'), ''), '(empty)') AS perimeter_id,
  countIf(JSONExtractString(properties, 'result') = 'pass') AS pass_events,
  countIf(JSONExtractString(properties, 'result') = 'fail') AS fail_events,
  count() AS total_events,
  if(
    count() > 0,
    round(100.0 * countIf(JSONExtractString(properties, 'result') = 'pass') / count(), 2),
    0
  ) AS pass_rate_pct
FROM events
WHERE event = 'perimeter_validation_attempt'
  AND timestamp >= now() - INTERVAL 7 DAY
GROUP BY env, perimeter_id
ORDER BY total_events DESC
LIMIT 200
`.trim();

	const hogqlFailures = `
SELECT
  ifNull(nullIf(JSONExtractString(properties, 'reason_code'), ''), '(empty)') AS reason_code,
  ifNull(nullIf(JSONExtractString(properties, 'env'), ''), '(empty)') AS env,
  ifNull(nullIf(JSONExtractString(properties, 'perimeter_id'), ''), '(empty)') AS perimeter_id,
  count() AS failures
FROM events
WHERE event = 'perimeter_validation_attempt'
  AND JSONExtractString(properties, 'result') = 'fail'
  AND timestamp >= now() - INTERVAL 3 DAY
GROUP BY reason_code, env, perimeter_id
ORDER BY failures DESC
LIMIT 100
`.trim();

	// HogQL-backed insights: API expects root `DataTableNode`, not `InsightVizNode` + HogQL (see PostHog QuerySchemaRoot).
	const insights: Array<{ title: string; body: Record<string, unknown> }> = [
		{
			title: "CT Perimeter — estimated attempt volume (30d)",
			body: {
				name: "CT Perimeter — estimated attempt volume (30d)",
				description:
					"Weighted sum: pass rows use properties.sampling_weight; fail rows count as 1. Aligns with server-side sampling.",
				dashboards: [dashboardId],
				query: {
					kind: "DataTableNode",
					source: {
						kind: "HogQLQuery",
						query: hogqlVolume,
					},
				},
			},
		},
		{
			title: "CT Perimeter — pass rate by env + perimeter (7d)",
			body: {
				name: "CT Perimeter — pass rate by env + perimeter (7d)",
				description:
					"pass_rate_pct is computed on captured events only; pass events are sampled at the server, so interpret alongside sampling_weight.",
				dashboards: [dashboardId],
				query: {
					kind: "DataTableNode",
					source: {
						kind: "HogQLQuery",
						query: hogqlPassRate,
					},
				},
			},
		},
		{
			title: "CT Perimeter — top failure reasons (72h)",
			body: {
				name: "CT Perimeter — top failure reasons (72h)",
				description:
					"Failures are unsampled; reason_code is derived from Zod paths at capture time.",
				dashboards: [dashboardId],
				query: {
					kind: "DataTableNode",
					source: {
						kind: "HogQLQuery",
						query: hogqlFailures,
					},
				},
			},
		},
		{
			title: "CT Perimeter — pass vs fail trend (raw counts)",
			body: {
				name: "CT Perimeter — pass vs fail trend (raw counts)",
				description:
					"Raw PostHog counts; pass line reflects sampling (not true attempt volume). Use the HogQL volume insight for estimated totals.",
				dashboards: [dashboardId],
				query: {
					kind: "InsightVizNode",
					source: {
						kind: "TrendsQuery",
						series: [
							{
								kind: "EventsNode",
								math: "total",
								name: "pass (sampled)",
								event: "perimeter_validation_attempt",
								properties: [
									{
										key: "result",
										value: "pass",
										operator: "exact",
										type: "event",
									},
								],
							},
							{
								kind: "EventsNode",
								math: "total",
								name: "fail (full)",
								event: "perimeter_validation_attempt",
								properties: [
									{
										key: "result",
										value: "fail",
										operator: "exact",
										type: "event",
									},
								],
							},
						],
						interval: "day",
						dateRange: { date_from: "-30d", explicitDate: false },
						trendsFilter: { display: "ActionsLineGraph", showLegend: true },
						properties: [],
						filterTestAccounts: false,
					},
				},
			},
		},
	];

	for (const { title, body } of insights) {
		const insightName = body.name as string;
		if (insightNames.has(insightName)) {
			continue;
		}
		try {
			const _ins = await createInsight(body);
			insightNames.add(insightName);
		} catch (e) {
			console.error(`Failed insight "${title}":`, e instanceof Error ? e.message : e);
		}
	}
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
