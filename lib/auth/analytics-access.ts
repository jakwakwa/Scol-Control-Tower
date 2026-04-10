import { PERMISSIONS, hasPermissionOrAdmin } from "@/lib/auth/permissions";

/**
 * Who may call PostHog analytics API routes and open `/dashboard/analytics`.
 * - org admins always
 * - users with `org:analytics:view`
 * - optional env allowlist: POSTHOG_ANALYTICS_ALLOWED_USER_IDS=comma,separated,clerk_user_ids
 */
export function canViewPostHogAnalytics(
	userId: string | null | undefined,
	has: (params: { permission: string }) => boolean,
	orgRole: string | undefined
): boolean {
	if (!userId) return false;
	if (hasPermissionOrAdmin(has, orgRole, PERMISSIONS.ANALYTICS_VIEW)) return true;
	const raw = process.env.POSTHOG_ANALYTICS_ALLOWED_USER_IDS?.trim();
	if (!raw) return false;
	const allow = new Set(
		raw
			.split(",")
			.map(s => s.trim())
			.filter(Boolean)
	);
	return allow.has(userId);
}
