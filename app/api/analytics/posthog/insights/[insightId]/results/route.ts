import { NextResponse } from "next/server";
import { ensurePostHogAnalyticsAccess } from "@/app/api/analytics/posthog/_access";
import { getPostHogInsightQueryResult } from "@/lib/posthog-analytics-service";
import { PostHogRestError } from "@/lib/posthog-rest";

export const dynamic = "force-dynamic";

interface RouteParams {
	params: Promise<{ insightId: string }>;
}

export async function GET(_req: Request, ctx: RouteParams) {
	const gate = await ensurePostHogAnalyticsAccess();
	if (gate) return gate;
	const { insightId: raw } = await ctx.params;
	const id = Number.parseInt(raw, 10);
	if (!Number.isFinite(id)) {
		return NextResponse.json({ error: "Invalid insight id" }, { status: 400 });
	}
	try {
		const payload = await getPostHogInsightQueryResult(id);
		return NextResponse.json(payload);
	} catch (e) {
		if (e instanceof PostHogRestError) {
			return NextResponse.json({ error: "PostHog request failed" }, { status: 502 });
		}
		throw e;
	}
}
