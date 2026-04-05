/**
 * Clerk permission constants aligned with dashboard.clerk.com Roles & Permissions.
 *
 * Roles:
 * - org:member — read-only; can login and view, no write permissions
 * - org:admin — can do all; bypasses permission checks
 * - org:risk_manager — risk decisions, procurement, kill switch, green lane
 * - org:account_manager — quote/contract approval, kill switch, green lane
 *
 * Features:
 * - green_lane: approve (risk_manager, account_manager)
 * - quote: approve (account_manager)
 * - risk_assessment: approve, configure, adjudication_denied (risk_manager)
 * - workflow: terminate (risk_manager, account_manager)
 */

export const PERMISSIONS = {
	GREEN_LANE_APPROVE: "org:green_lane:approve",
	QUOTE_APPROVE: "org:quote:approve",
	RISK_ASSESSMENT_APPROVE: "org:risk_assessment:approve",
	RISK_ASSESSMENT_CONFIGURE: "org:risk_assessment:configure",
	RISK_ASSESSMENT_ADJUDICATION_DENIED: "org:risk_assessment:adjudication_denied",
	WORKFLOW_TERMINATE: "org:workflow:terminate",
	/** View in-app PostHog analytics (private REST + charts). Configure in Clerk Roles & Permissions. */
	ANALYTICS_VIEW: "org:analytics:view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Admin role can perform all actions; no permission check needed. */
export const ADMIN_ROLE = "org:admin" as const;

/**
 * Returns true if the user has the permission OR is an admin.
 * Use for all permission-gated write routes.
 */
export function hasPermissionOrAdmin(
	has: (params: { permission: string }) => boolean,
	orgRole: string | undefined,
	permission: string
): boolean {
	return orgRole === ADMIN_ROLE || has({ permission });
}
