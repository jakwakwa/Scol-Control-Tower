import { auth } from "@clerk/nextjs/server";
import { PostHogAnalyticsDashboard } from "@/components/dashboard/analytics/posthog-analytics-dashboard";
import { canViewPostHogAnalytics } from "@/lib/auth/analytics-access";
import { getPostHogPersonalApiKey } from "@/lib/posthog-rest";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
	const { userId, has, orgRole } = await auth();
	if (!userId) {
		return null;
	}
	if (!canViewPostHogAnalytics(userId, has, orgRole)) {
		return (
			<div className="mx-auto max-w-2xl px-6 py-16">
				<h1 className="text-xl font-semibold">Analytics</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					You do not have access to PostHog analytics. Ask an admin to grant{" "}
					<code className="rounded bg-secondary/30 px-1 py-0.5 text-xs">org:analytics:view</code> or add your user id to{" "}
					<code className="rounded bg-secondary/30 px-1 py-0.5 text-xs">POSTHOG_ANALYTICS_ALLOWED_USER_IDS</code>.
				</p>
			</div>
		);
	}
	if (!getPostHogPersonalApiKey()) {
		return (
			<div className="mx-auto max-w-2xl px-6 py-16">
				<h1 className="text-xl font-semibold">Analytics</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					PostHog analytics is not configured. Set{" "}
					<code className="rounded bg-secondary/30 px-1 py-0.5 text-xs">POSTHOG_PERSONAL_API_KEY</code> and{" "}
					<code className="rounded bg-secondary/30 px-1 py-0.5 text-xs">POSTHOG_API_HOST</code> (see docs/posthog-perimeter-dashboard.md).
				</p>
			</div>
		);
	}
	return <PostHogAnalyticsDashboard />;
}
