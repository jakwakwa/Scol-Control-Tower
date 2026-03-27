import { NextResponse } from "next/server";
import { ensurePostHogAnalyticsAccess } from "@/app/api/analytics/posthog/_access";
import { listPostHogDashboards } from "@/lib/posthog-analytics-service";
import { PostHogRestError } from "@/lib/posthog-rest";

export const dynamic = "force-dynamic";

export async function GET() {
	const gate = await ensurePostHogAnalyticsAccess();
	if (gate) return gate;
	try {
		const dashboards = await listPostHogDashboards();
		return NextResponse.json({ dashboards });
	} catch (e) {
		if (e instanceof PostHogRestError) {
			return NextResponse.json({ error: "PostHog request failed" }, { status: 502 });
		}
		throw e;
	}
}
