import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { canViewPostHogAnalytics } from "@/lib/auth/analytics-access";
import { getPostHogPersonalApiKey } from "@/lib/posthog-rest";

export async function ensurePostHogAnalyticsAccess(): Promise<NextResponse | null> {
	const { userId, has, orgRole } = await auth();
	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	if (!canViewPostHogAnalytics(userId, has, orgRole)) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}
	if (!getPostHogPersonalApiKey()) {
		return NextResponse.json(
			{ error: "PostHog analytics is not configured (POSTHOG_PERSONAL_API_KEY)" },
			{ status: 503 }
		);
	}
	return null;
}
