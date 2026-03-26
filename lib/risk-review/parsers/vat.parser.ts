import type { SectionStatus, VatStatus } from "@/lib/risk-review/types";

// ---------------------------------------------------------------------------
// Machine state / review state guards
// ---------------------------------------------------------------------------

const MACHINE_STATES = [
	"pending",
	"in_progress",
	"completed",
	"failed",
	"manual_required",
] as const;

const REVIEW_STATES = [
	"pending",
	"acknowledged",
	"approved",
	"rejected",
	"not_required",
] as const;

/**
 * Safely parse an arbitrary DB value into a valid SectionStatus machineState.
 * Unknown values fall back to "pending" and are logged for investigation;
 * this function never throws.
 */
export function parseMachineState(raw: unknown): SectionStatus["machineState"] {
	if (typeof raw !== "string") return "pending";
	if ((MACHINE_STATES as readonly string[]).includes(raw)) {
		return raw as SectionStatus["machineState"];
	}
	console.warn(`[vat.parser] Unknown machineState value: "${raw}" — falling back to "pending"`);
	return "pending";
}

/**
 * Safely parse an arbitrary DB value into a valid SectionStatus reviewState.
 * Unknown values fall back to "pending" and are logged for investigation;
 * this function never throws.
 */
export function parseReviewState(raw: unknown): SectionStatus["reviewState"] {
	if (typeof raw !== "string") return "pending";
	if ((REVIEW_STATES as readonly string[]).includes(raw)) {
		return raw as SectionStatus["reviewState"];
	}
	console.warn(`[vat.parser] Unknown reviewState value: "${raw}" — falling back to "pending"`);
	return "pending";
}

// ---------------------------------------------------------------------------
// VAT status mapping
// ---------------------------------------------------------------------------

/**
 * Map a Firecrawl VatVerificationResult into the canonical VatStatus union.
 *
 * Mapping table:
 *   offline                                        → service_down
 *   live + success + verified=true                 → verified
 *   live + success + verified=false/undefined      → not_verified
 *   live + partial | action_required               → manual_review
 *   live + error (Firecrawl runtimeState)          → timeout
 *   live + blocked | unknown runtimeState          → error
 */
export function parseVatStatus(
	firecrawlStatus: "live" | "offline",
	runtimeState?: string,
	verified?: boolean
): VatStatus {
	if (firecrawlStatus === "offline") return "service_down";

	switch (runtimeState) {
		case "success":
			return verified === true ? "verified" : "not_verified";
		case "partial":
		case "action_required":
			return "manual_review";
		case "error":
			return "timeout";
		default:
			return "error";
	}
}

// ---------------------------------------------------------------------------
// AI analysis snapshot parsing
// ---------------------------------------------------------------------------

/**
 * Shape of the JSON blob stored in risk_assessments.aiAnalysis that contains
 * the aggregated external check results, including the SARS VAT search.
 */
export type AggregatedAnalysisSnapshot = {
	externalChecks?: {
		sarsVatSearch?: {
			status?: "offline" | "live";
			result?: {
				verified?: boolean;
				vatNumber?: string;
				tradingName?: string;
				office?: string;
				successMessage?: string;
				failureMessage?: string;
				/** Firecrawl agent runtimeState for mapping to VatStatus */
				runtimeState?: string;
			};
		};
		industryRegulator?: {
			status?: "offline" | "live";
			result?: Record<string, unknown>;
		};
		socialReputation?: {
			status?: "offline" | "live";
			result?: Record<string, unknown>;
		};
	};
	metadata?: {
		analyzedAt?: string;
	};
};

export type ParseResult<T> =
	| { ok: true; value: T }
	| { ok: false; error: string };

/**
 * Parse the raw aiAnalysis JSON string into an AggregatedAnalysisSnapshot.
 * Returns a discriminated union so callers must handle the parse-failure
 * case explicitly — this function never returns a silently-wrong T.
 */
export function parseAiAnalysisSnapshot(
	raw: string | null
): ParseResult<AggregatedAnalysisSnapshot> {
	if (!raw || typeof raw !== "string" || raw.trim() === "") {
		return { ok: false, error: "empty or null input" };
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (err) {
		return { ok: false, error: `JSON.parse failed: ${String(err)}` };
	}

	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		return { ok: false, error: "parsed value is not a plain object" };
	}

	return { ok: true, value: parsed as AggregatedAnalysisSnapshot };
}
