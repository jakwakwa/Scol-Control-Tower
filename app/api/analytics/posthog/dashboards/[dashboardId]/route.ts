import { NextResponse } from "next/server";
import { ensurePostHogAnalyticsAccess } from "@/app/api/analytics/posthog/_access";
import { getPostHogDashboardDetail } from "@/lib/posthog-analytics-service";
import { PostHogRestError } from "@/lib/posthog-rest";

export const dynamic = "force-dynamic";

interface RouteParams {
	params: Promise<{ dashboardId: string }>;
}

export async function GET(_req: Request, ctx: RouteParams) {
	const gate = await ensurePostHogAnalyticsAccess();
	if (gate) return gate;
	const { dashboardId: raw } = await ctx.params;
	const id = Number.parseInt(raw, 10);
	if (!Number.isFinite(id)) {
		return NextResponse.json({ error: "Invalid dashboard id" }, { status: 400 });
	}
	try {
		const dashboard = await getPostHogDashboardDetail(id);
		if (!dashboard) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}
		return NextResponse.json({ dashboard });
	} catch (e) {
		if (e instanceof PostHogRestError) {
			return NextResponse.json({ error: "PostHog request failed" }, { status: 502 });
		}
		throw e;
	}
}
