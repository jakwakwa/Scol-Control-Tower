/**
 * Single source of truth for notification classification and routing.
 *
 * Prefer `sourceEventType` from persisted workflow events when present — routing
 * does not depend on user-facing copy. Legacy rows without `sourceEventType`
 * fall back to substring lists below.
 */

export type NotificationSemanticInput = {
	message: string;
	sourceEventType?: string | null;
};

export const PROCUREMENT_MANUAL_TERMS = [
	"manual procurement check required",
	"procurement_check_failed",
	"procurecheck failed",
	"procurement check failed",
	"procurement review required",
] as const;

export const SANCTIONS_MANUAL_TERMS = [
	"manual sanctions check required",
	"sanctions_check_failed",
	"automated sanctions checks failed",
] as const;

export const VAT_TERMS = [
	"vat verification",
	"vat number",
	"vat check",
	"vat number check",
] as const;

export const PRE_RISK_TERMS = ["pre-risk", "sales evaluation"] as const;

export const QUOTE_TERMS = [
	"quote ready for review",
	"overlimit: quote requires special approval",
	"quotation",
] as const;

export type NotificationCategory =
	| "procurement_manual"
	| "sanctions_manual"
	| "vat_verification"
	| "pre_risk_review"
	| "quote_review"
	| "general";

function matches(message: string, terms: ReadonlyArray<string>): boolean {
	return terms.some(term => message.includes(term));
}

function categoryFromSourceEvent(event: string): NotificationCategory | null {
	switch (event.trim()) {
		case "vat_verification_completed":
			return "vat_verification";
		default:
			return null;
	}
}

/**
 * Classify a notification by category.
 *
 * Priority ordering (highest to lowest): explicit source event → procurement_manual →
 * sanctions_manual → vat_verification → pre_risk_review → quote_review → general.
 */
export function classifyNotification(input: NotificationSemanticInput): NotificationCategory {
	const evt = input.sourceEventType?.trim();
	if (evt) {
		const fromEvent = categoryFromSourceEvent(evt);
		if (fromEvent !== null) {
			return fromEvent;
		}
	}

	const m = input.message.toLowerCase();

	if (matches(m, PROCUREMENT_MANUAL_TERMS)) return "procurement_manual";
	if (matches(m, SANCTIONS_MANUAL_TERMS)) return "sanctions_manual";
	if (matches(m, VAT_TERMS)) return "vat_verification";
	if (matches(m, PRE_RISK_TERMS)) return "pre_risk_review";
	if (matches(m, QUOTE_TERMS)) return "quote_review";
	return "general";
}

export function isProcurementManualNotification(input: NotificationSemanticInput): boolean {
	return classifyNotification(input) === "procurement_manual";
}

export function isSanctionsManualNotification(input: NotificationSemanticInput): boolean {
	return classifyNotification(input) === "sanctions_manual";
}

export function isManualFallbackNotification(input: NotificationSemanticInput): boolean {
	const category = classifyNotification(input);
	return category === "procurement_manual" || category === "sanctions_manual";
}

export function isVatNotification(input: NotificationSemanticInput): boolean {
	return classifyNotification(input) === "vat_verification";
}

export function getNotificationRoute(notification: NotificationSemanticInput & {
	applicantId: number;
}): string {
	const category = classifyNotification(notification);

	switch (category) {
		case "procurement_manual":
		case "sanctions_manual":
			return "/dashboard/risk-review";
		case "vat_verification":
			return `/dashboard/risk-review/reports/${notification.applicantId}`;
		case "pre_risk_review":
		case "quote_review":
			return `/dashboard/applicants/${notification.applicantId}?tab=reviews`;
		case "general":
			return `/dashboard/applicants/${notification.applicantId}`;
	}
}

export function formatNotificationMessage(input: NotificationSemanticInput): string {
	const category = classifyNotification(input);

	if (category === "sanctions_manual") {
		return "Automated sanctions checks failed. Risk Manager must complete a full manual sanctions screening and record the sanctions outcome.";
	}

	if (category === "procurement_manual") {
		return "Automated procurement checks failed. Risk Manager must complete a full manual procurement check and record a procurement decision.";
	}

	return input.message;
}
