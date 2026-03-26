"use client";

import { RiExternalLinkLine, RiLoader4Line } from "@remixicon/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useDashboardStore } from "@/lib/dashboard-store";
import type {
	AnalyticsDashboardDetailDto,
	AnalyticsDashboardSummaryDto,
	AnalyticsDashboardTileDto,
	AnalyticsInsightQueryResponseDto,
	TrendSeriesDto,
} from "@/lib/posthog-analytics-dto";

async function jsonFetch<T>(url: string): Promise<T> {
	const res = await fetch(url);
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		const msg =
			typeof err === "object" &&
			err !== null &&
			"error" in err &&
			typeof (err as { error: unknown }).error === "string"
				? (err as { error: string }).error
				: res.statusText;
		throw new Error(msg);
	}
	return (await res.json()) as T;
}

const LINE_COLORS = ["#266d7b", "#38bdf8", "#4ade80", "#fbbf24", "#a78bfa", "#fb7185"];

function mergeSeriesForRecharts(
	series: TrendSeriesDto[]
): Array<Record<string, string | number>> {
	if (series.length === 0) return [];
	const len = series[0]?.points.length ?? 0;
	const out: Array<Record<string, string | number>> = [];
	for (let i = 0; i < len; i++) {
		const row: Record<string, string | number> = { x: series[0]?.points[i]?.x ?? "" };
		for (const s of series) {
			row[s.key] = s.points[i]?.y ?? 0;
		}
		out.push(row);
	}
	return out;
}

function InsightTile({ insightId, title }: { insightId: number; title: string | null }) {
	const { data, error, isLoading } = useSWR<AnalyticsInsightQueryResponseDto>(
		`/api/analytics/posthog/insights/${insightId}/results`,
		(url: string) => jsonFetch<AnalyticsInsightQueryResponseDto>(url)
	);

	return (
		<Card variant="secondary" size="sm" className="mb-0">
			<CardHeader className="border-b border-secondary/10 pb-4">
				<CardTitle className="text-base">
					{title || data?.name || `Insight ${insightId}`}
				</CardTitle>
				{data?.posthogUrl ? (
					<CardDescription>
						<Link
							href={data.posthogUrl}
							target="_blank"
							rel="noopener noreferrer"
							className=" hidden items-center gap-1 text-primary hover:underline">
							Open in PostHog
							<RiExternalLinkLine className="h-3.5 w-3.5" />
						</Link>
					</CardDescription>
				) : null}
			</CardHeader>
			<CardContent className="pt-6">
				{isLoading ? (
					<div className="flex items-center gap-2 text-muted-foreground">
						<RiLoader4Line className="h-5 w-5 animate-spin" />
						Loading…
					</div>
				) : error ? (
					<p className="text-sm text-destructive">
						{error instanceof Error ? error.message : "Failed to load"}
					</p>
				) : !data ? (
					<p className="text-sm text-muted-foreground">No data</p>
				) : data.result.kind === "trends" ? (
					<div className="h-[280px] w-full min-w-0">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart
								data={mergeSeriesForRecharts(data.result.series)}
								margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
								<CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
								<XAxis
									dataKey="x"
									tick={{ fontSize: 11 }}
									className="text-muted-foreground"
								/>
								<YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
								<Tooltip
									contentStyle={{
										background: "var(--background)",
										border: "1px solid hsl(var(--border))",
									}}
								/>
								<Legend />
								{data.result.series.map((s, i) => (
									<Line
										key={s.key}
										type="monotone"
										dataKey={s.key}
										name={s.label}
										stroke={LINE_COLORS[i % LINE_COLORS.length]}
										dot={false}
										strokeWidth={2}
									/>
								))}
							</LineChart>
						</ResponsiveContainer>
					</div>
				) : data.result.kind === "table" ? (
					<div className="overflow-x-auto rounded-md border border-secondary/10">
						<table className="w-full text-left text-xs">
							<thead>
								<tr className="border-b border-secondary/10 bg-secondary/5">
									{data.result.columns.map(c => (
										<th key={c} className="px-3 py-2 font-medium">
											{c}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{data.result.rows.slice(0, 200).map((row, ri) => (
									<tr key={ri} className="border-b border-secondary/5 last:border-0">
										{row.map((cell, ci) => (
											<td key={ci} className="px-3 py-1.5 font-mono text-[11px]">
												{cell === null || cell === undefined ? "" : String(cell)}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<div className="space-y-2 text-sm text-muted-foreground hidden">
						<p>{data.result.message}</p>
						{data.posthogUrl ? (
							<Button variant="outline" size="sm" asChild>
								<Link
									href={data.posthogUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="hidden">
									View in PostHog
								</Link>
							</Button>
						) : null}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export function PostHogAnalyticsDashboard() {
	const { setMeta } = useDashboardStore();
	const {
		data: listData,
		error: listError,
		isLoading: listLoading,
	} = useSWR<{
		dashboards: AnalyticsDashboardSummaryDto[];
	}>("/api/analytics/posthog/dashboards", (url: string) =>
		jsonFetch<{ dashboards: AnalyticsDashboardSummaryDto[] }>(url)
	);

	const [selectedId, setSelectedId] = useState<string>("");

	const dashboards = listData?.dashboards ?? [];

	useEffect(() => {
		if (dashboards.length > 0 && !selectedId) {
			setSelectedId(String(dashboards[0].id));
		}
	}, [dashboards, selectedId]);

	const dashboardIdNum = selectedId ? Number.parseInt(selectedId, 10) : NaN;

	const {
		data: detailData,
		error: detailError,
		isLoading: detailLoading,
	} = useSWR<{
		dashboard: AnalyticsDashboardDetailDto;
	}>(
		Number.isFinite(dashboardIdNum)
			? `/api/analytics/posthog/dashboards/${dashboardIdNum}`
			: null,
		(url: string) => jsonFetch<{ dashboard: AnalyticsDashboardDetailDto }>(url)
	);

	const dashboard = detailData?.dashboard;

	useEffect(() => {
		setMeta({
			title: "Analytics",
			description: "PostHog dashboards and insights (in-app)",
		});
		return () => setMeta({ title: null, description: null });
	}, [setMeta]);

	const insightTiles = useMemo(() => {
		if (!dashboard?.tiles) return [];
		return dashboard.tiles.filter(
			(t): t is AnalyticsDashboardTileDto & { insightId: number } =>
				typeof t.insightId === "number"
		);
	}, [dashboard?.tiles]);

	return (
		<div className="mx-auto max-w-7xl px-6 py-8">
			{listLoading ? (
				<div className="flex items-center gap-2 text-muted-foreground">
					<RiLoader4Line className="h-5 w-5 animate-spin" />
					Loading dashboards…
				</div>
			) : listError ? (
				<p className="text-destructive">
					{listError instanceof Error ? listError.message : "Failed to load dashboards"}
				</p>
			) : dashboards.length === 0 ? (
				<p className="text-muted-foreground">
					No dashboards found in this PostHog project.
				</p>
			) : (
				<div className="space-y-8">
					<div className="flex flex-wrap items-center gap-4">
						<span
							className="text-sm font-medium text-muted-foreground"
							id="analytics-dashboard-label">
							Dashboard
						</span>
						<Select value={selectedId} onValueChange={setSelectedId}>
							<SelectTrigger className="w-[min(100%,320px)]">
								<SelectValue placeholder="Select dashboard" />
							</SelectTrigger>
							<SelectContent>
								{dashboards.map(d => (
									<SelectItem key={d.id} value={String(d.id)}>
										{d.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{detailLoading ? (
						<div className="flex items-center gap-2 text-muted-foreground">
							<RiLoader4Line className="h-5 w-5 animate-spin" />
							Loading tiles…
						</div>
					) : detailError ? (
						<p className="text-destructive">
							{detailError instanceof Error
								? detailError.message
								: "Failed to load dashboard"}
						</p>
					) : !dashboard ? (
						<p className="text-muted-foreground">Dashboard not found.</p>
					) : insightTiles.length === 0 ? (
						<p className="text-muted-foreground">
							This dashboard has no insight tiles yet.
						</p>
					) : (
						<div className="grid grid-cols-1 gap-6 xl:grid-cols-1">
							{insightTiles.map(tile => (
								<InsightTile
									key={tile.tileId}
									insightId={tile.insightId}
									title={tile.name}
								/>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
