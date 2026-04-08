/**
 * Centralised timeout configuration for the Control Tower workflow.
 *
 * All Inngest `waitForEvent` and `step.sleep` durations should reference
 * these constants instead of inline string literals.
 */

export const WORKFLOW_TIMEOUTS = {
	/** Overall workflow-level timeout */
	WORKFLOW: "30d",

	/** Default stage-level timeout (waitForEvent on form submissions, doc uploads) */
	STAGE: "14d",

	/** Human review / approval timeout (risk decisions, pre-risk, quote approval) */
	REVIEW: "7d",

	/** Mandate collection retry interval */
	MANDATE_RETRY: "7d",

	/** FICA document upload timeout */
	FICA_UPLOAD: "14d",

	/** Contract draft review timeout */
	CONTRACT_REVIEW: "7d",

	/** ABSA 6995 form completion timeout */
	ABSA_FORM: "14d",

	/** Final approval gate timeout (risk + account manager) */
	FINAL_APPROVAL: "7d",

	/** Contract signature timeout */
	CONTRACT_SIGNATURE: "14d",

	/** Financial statements confirmation timeout */
	FINANCIAL_STATEMENTS: "14d",
} as const;

export type TimeoutKey = keyof typeof WORKFLOW_TIMEOUTS;

// ============================================
// Reminder Intervals (env-var-driven)
// ============================================

/** Parse an env var as an Inngest duration string (e.g. "3d", "12h"). Falls back to `fallback`. */
function envDuration(key: string, fallback: string): string {
	return process.env[key]?.trim() || fallback;
}

function envInt(key: string, fallback: number): number {
	const v = Number(process.env[key]);
	return Number.isFinite(v) && v > 0 ? v : fallback;
}

/**
 * Configurable reminder intervals for applicant/staff follow-up nudges.
 *
 * Env vars:
 *   REMINDER_FIRST_NUDGE  — Inngest duration string for first nudge (default "3d")
 *   REMINDER_SECOND_NUDGE — Inngest duration string for second nudge after first (default "4d")
 *   REMINDER_MAX_COUNT    — Maximum reminders before hard terminate (default 2)
 */
export const REMINDER_INTERVALS = {
	/** First nudge after N days of inactivity (env: REMINDER_FIRST_NUDGE, default "3d") */
	FIRST_NUDGE: envDuration("REMINDER_FIRST_NUDGE", "3d"),
	/** Second nudge interval after first nudge (env: REMINDER_SECOND_NUDGE, default "4d") */
	SECOND_NUDGE: envDuration("REMINDER_SECOND_NUDGE", "4d"),
	/** Max reminder count before hard terminate (env: REMINDER_MAX_COUNT, default 2) */
	MAX_REMINDERS: envInt("REMINDER_MAX_COUNT", 2),
};

/** Maximum mandate collection retries before escalation */
export const MAX_MANDATE_RETRIES = 8;

/** Overlimit threshold in cents (R500,000) */
export const OVERLIMIT_THRESHOLD = 500_000_00;

/** Sanctions recheck window in milliseconds (7 days) */
export const SANCTIONS_RECHECK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
