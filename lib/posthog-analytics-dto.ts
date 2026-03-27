/**
 * Stable DTOs for the in-app PostHog analytics UI (server → client).
 */

export type AnalyticsTileKind = "trends" | "table" | "unsupported";

export interface AnalyticsDashboardSummaryDto {
	id: number;
	name: string;
	description?: string;
}

export interface AnalyticsDashboardTileDto {
	tileId: string;
	insightId: number | null;
	insightShortId: string | null;
	name: string | null;
}

export interface AnalyticsDashboardDetailDto {
	id: number;
	name: string;
	description?: string;
	tiles: AnalyticsDashboardTileDto[];
}

export interface TrendSeriesDto {
	key: string;
	label: string;
	points: Array<{ x: string; y: number }>;
}

export interface AnalyticsTrendsResultDto {
	kind: "trends";
	series: TrendSeriesDto[];
}

export interface AnalyticsTableResultDto {
	kind: "table";
	columns: string[];
	rows: unknown[][];
}

export interface AnalyticsUnsupportedResultDto {
	kind: "unsupported";
	insightKind: string;
	message: string;
}

export type AnalyticsInsightResultDto =
	| AnalyticsTrendsResultDto
	| AnalyticsTableResultDto
	| AnalyticsUnsupportedResultDto;

export interface AnalyticsInsightQueryResponseDto {
	insightId: number;
	name: string;
	shortId: string | null;
	result: AnalyticsInsightResultDto;
	posthogUrl: string;
}
