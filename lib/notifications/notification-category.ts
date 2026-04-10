/**
 * High-level routing bucket for dashboard notifications (not DB `type` / severity).
 */
export type NotificationCategory =
	| "procurement_manual"
	| "sanctions_manual"
	| "vat_verification"
	| "pre_risk_review"
	| "quote_review"
	| "general";
