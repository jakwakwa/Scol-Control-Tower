/**
 * Adjudication Taxonomy — Structured Risk Manager Decisions
 *
 * Canonical vocabulary for risk manager adjudication decisions.
 */

export const ADJUDICATION_CATEGORIES = [
	"AI_ALIGNED",
	"MISSING_CONTEXT",
	"INCORRECT_RISK_SCORING",
	"FALSE_POSITIVE_FLAG",
	"FALSE_NEGATIVE_MISS",
	"POLICY_EXCEPTION",
	"DATA_QUALITY_ISSUE",
	"OTHER",
] as const;

export type AdjudicationCategory = (typeof ADJUDICATION_CATEGORIES)[number];

export const ADJUDICATION_REASON_LABELS: Record<AdjudicationCategory, string> = {
	AI_ALIGNED: "AI Decision Aligned",
	MISSING_CONTEXT: "Missing Context",
	INCORRECT_RISK_SCORING: "Incorrect Risk Scoring",
	FALSE_POSITIVE_FLAG: "False Positive Flag",
	FALSE_NEGATIVE_MISS: "False Negative Miss",
	POLICY_EXCEPTION: "Policy Exception",
	DATA_QUALITY_ISSUE: "Data Quality Issue",
	OTHER: "Other",
};

export const ADJUDICATION_DETAILS_BY_CATEGORY: Partial<
	Record<AdjudicationCategory, { value: string; label: string }[]>
> = {
	MISSING_CONTEXT: [
		{ value: "additional_docs_provided", label: "Additional Documents Provided" },
		{ value: "verbal_confirmation", label: "Verbal Confirmation Received" },
		{ value: "historical_relationship", label: "Historical Relationship Known" },
		{ value: "external_verification", label: "External Verification Done" },
	],
	INCORRECT_RISK_SCORING: [
		{ value: "score_too_high", label: "Score Too High" },
		{ value: "score_too_low", label: "Score Too Low" },
		{ value: "wrong_risk_factors", label: "Wrong Risk Factors Weighted" },
		{ value: "outdated_model", label: "Outdated Model Data" },
	],
	FALSE_POSITIVE_FLAG: [
		{ value: "name_collision", label: "Name Collision (Not Same Entity)" },
		{ value: "resolved_issue", label: "Issue Previously Resolved" },
		{ value: "incorrect_match", label: "Incorrect Data Match" },
		{ value: "legitimate_activity", label: "Legitimate Business Activity" },
	],
	FALSE_NEGATIVE_MISS: [
		{ value: "hidden_risk", label: "Hidden Risk Factor" },
		{ value: "pattern_not_detected", label: "Pattern Not Detected" },
		{ value: "new_risk_type", label: "New/Emerging Risk Type" },
		{ value: "cross_reference_miss", label: "Cross-reference Not Found" },
	],
	POLICY_EXCEPTION: [
		{ value: "management_exception", label: "Management Exception" },
		{ value: "regulatory_change", label: "New Regulatory Guidance" },
		{ value: "client_tier_exception", label: "Client Tier Exception" },
	],
	DATA_QUALITY_ISSUE: [
		{ value: "stale_data", label: "Stale/Outdated Data" },
		{ value: "incorrect_data", label: "Incorrect Data Source" },
		{ value: "missing_fields", label: "Missing Required Fields" },
	],
};

export const DIVERGENCE_TYPES = [
	"false_positive",
	"false_negative",
	"severity_mismatch",
] as const;

export type DivergenceType = (typeof DIVERGENCE_TYPES)[number];

export const AI_CHECK_TYPES = [
	"identity_verification",
	"document_analysis",
	"risk_screening",
	"aggregated",
] as const;

export type AiCheckType = (typeof AI_CHECK_TYPES)[number];

export function formatAdjudicationDetailLabel(
	category: AdjudicationCategory,
	detailValue: string
): string {
	const details = ADJUDICATION_DETAILS_BY_CATEGORY[category];
	if (details) {
		const match = details.find(d => d.value === detailValue);
		if (match) return match.label;
	}

	return detailValue
		.split("_")
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}
