import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Converts an internal enum/constant value (e.g. "MANUAL_REVIEW", "manual_review")
 * to a human-readable title-case label (e.g. "Manual Review").
 */
export function formatEnumLabel(value: string): string {
	return value
		.toLowerCase()
		.replace(/_/g, " ")
		.replace(/\b\w/g, c => c.toUpperCase());
}

export function getBaseUrl() {
	if (typeof window !== "undefined") {
		return window.location.origin;
	}
	if (process.env.NEXT_PUBLIC_APP_URL) {
		return process.env.NEXT_PUBLIC_APP_URL;
	}
	if (process.env.VERCEL_URL) {
		return `https://${process.env.VERCEL_URL}`;
	}
	return "http://localhost:3000";
}

// ============================================
// Decision Routing — stage-decoupled endpoint resolution
// ============================================

interface DecisionRoutingInput {
	decisionType?: string | null;
	targetResource?: string | null;
	reviewType?: string | null;
	stage?: number | null;
}

const DECISION_TYPE_ENDPOINTS: Record<string, string> = {
	procurement_review: "/api/risk-decision/procurement",
	risk_review: "/api/risk-decision",
	quote_approval: "/api/applicants/approval",
	quality_gate: "/api/applicants/approval",
	final_approval: "/api/onboarding/approve",
};

/**
 * Resolves the API endpoint for a decision based on the item's metadata.
 * Prefers `targetResource` (explicit) > `decisionType` (typed) > `reviewType`/stage (legacy).
 */
export function getDecisionEndpoint(input: DecisionRoutingInput): string {
	if (input.targetResource) {
		return input.targetResource;
	}

	if (input.decisionType && DECISION_TYPE_ENDPOINTS[input.decisionType]) {
		return DECISION_TYPE_ENDPOINTS[input.decisionType];
	}

	if (input.reviewType === "procurement" || input.stage === 3) {
		return "/api/risk-decision/procurement";
	}

	return "/api/risk-decision";
}
