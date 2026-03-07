/**
 * Override Taxonomy — Structured AI Feedback Categories
 *
 * This taxonomy maps human overrides into programmatic categories
 * that feed the AI retraining pipeline. Each category represents
 * a class of AI failure that triggered a human correction.
 */

// ============================================
// Override Categories
// ============================================

/**
 * Top-level override category values.
 * Used in Zod schemas as z.enum(OVERRIDE_CATEGORIES).
 */
export const OVERRIDE_CATEGORIES = [
	"AI_ALIGNED",
	"MISSING_CONTEXT",
	"INCORRECT_RISK_SCORING",
	"FALSE_POSITIVE_FLAG",
	"FALSE_NEGATIVE_MISS",
	"POLICY_EXCEPTION",
	"DATA_QUALITY_ISSUE",
	"OTHER",
] as const;

/** Union type for override categories */
export type OverrideCategory = (typeof OVERRIDE_CATEGORIES)[number];

/** Human-readable labels for each category */
export const OVERRIDE_CATEGORY_LABELS: Record<OverrideCategory, string> = {
	AI_ALIGNED: "AI Decision Aligned",
	MISSING_CONTEXT: "Missing Context",
	INCORRECT_RISK_SCORING: "Incorrect Risk Scoring",
	FALSE_POSITIVE_FLAG: "False Positive Flag",
	FALSE_NEGATIVE_MISS: "False Negative Miss",
	POLICY_EXCEPTION: "Policy Exception",
	OTHER: "Other",
	DATA_QUALITY_ISSUE: "Data Quality Issue",
};

// ============================================
// Override Subcategories
// ============================================

/**
 * Subcategories mapped by parent category.
 * Provides finer granularity for retraining signals.
 */
export const OVERRIDE_SUBCATEGORIES: Partial<
	Record<OverrideCategory, { value: string; label: string }[]>
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
		{ value: "management_override", label: "Management Override" },
		{ value: "regulatory_change", label: "New Regulatory Guidance" },
		{ value: "client_tier_exception", label: "Client Tier Exception" },
	],
	DATA_QUALITY_ISSUE: [
		{ value: "stale_data", label: "Stale/Outdated Data" },
		{ value: "incorrect_data", label: "Incorrect Data Source" },
		{ value: "missing_fields", label: "Missing Required Fields" },
	],
};

// ============================================
// Divergence Types
// ============================================

/**
 * Types of divergence between AI and human decisions.
 * Used to classify the nature of the AI's error.
 */
export const DIVERGENCE_TYPES = [
	"false_positive",
	"false_negative",
	"severity_mismatch",
] as const;

export type DivergenceType = (typeof DIVERGENCE_TYPES)[number];

// ============================================
// AI Check Types
// ============================================

/**
 * Types of AI checks that produced the analysis.
 * Maps to the assessment origin in riskAssessments.
 */
export const AI_CHECK_TYPES = [
	"identity_verification",
	"document_analysis",
	"risk_screening",
	"aggregated",
] as const;

export type AiCheckType = (typeof AI_CHECK_TYPES)[number];

// ============================================
// Utility Functions
// ============================================

/**
 * Format a subcategory value into a human-readable label.
 * Falls back to title-casing the raw value if no mapping exists.
 */
export function formatSubcategoryLabel(
	category: OverrideCategory,
	subcategoryValue: string
): string {
	const subcategories = OVERRIDE_SUBCATEGORIES[category];
	if (subcategories) {
		const match = subcategories.find(s => s.value === subcategoryValue);
		if (match) return match.label;
	}
	// Fallback: convert snake_case to Title Case
	return subcategoryValue
		.split("_")
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}
