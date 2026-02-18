/**
 * Divergence Service
 *
 * Detects and records divergences between AI recommendations
 * and human risk decisions. Every divergence becomes a prioritized
 * retraining signal for the AI pipeline.
 *
 * Key concepts:
 * - false_positive: AI approved, human rejected (most dangerous)
 * - false_negative: AI declined, human approved (over-conservative)
 * - severity_mismatch: Same direction but different severity level
 */

import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { aiFeedbackLogs, riskAssessments } from "@/db/schema";
import { inngest } from "@/inngest/client";
import type {
	AiCheckType,
	DivergenceType,
	OverrideCategory,
} from "@/lib/constants/override-taxonomy";

// ============================================
// Types
// ============================================

interface DivergenceResult {
	isDivergent: boolean;
	divergenceWeight: number;
	divergenceType: DivergenceType | null;
}

interface RecordFeedbackInput {
	workflowId: number;
	applicantId: number;
	humanOutcome: "APPROVED" | "REJECTED" | "REQUEST_MORE_INFO";
	overrideCategory: OverrideCategory;
	overrideSubcategory?: string;
	overrideDetails?: string;
	decidedBy: string;
}

interface AiAnalysisSnapshot {
	aiOutcome: string;
	aiConfidence: number | null;
	aiCheckType: AiCheckType;
}

// ============================================
// Core Divergence Computation
// ============================================

/**
 * Compute divergence between AI recommendation and human decision.
 *
 * Divergence weight scale (1-10):
 * - 8-10: AI approved, Human rejected (false positive — most dangerous)
 * - 5-7:  AI rejected, Human approved (false negative — over-conservative)
 * - 2-4:  Same direction but different severity (severity mismatch)
 * - 0:    No divergence
 *
 * High AI confidence on a wrong call increases weight by +2.
 */
export function computeDivergence(
	aiOutcome: string,
	humanOutcome: string,
	aiConfidence: number | null
): DivergenceResult {
	const aiNormalized = normalizeOutcome(aiOutcome);
	const humanNormalized = normalizeOutcome(humanOutcome);

	// No divergence — AI and human agree
	if (aiNormalized === humanNormalized) {
		return { isDivergent: false, divergenceWeight: 0, divergenceType: null };
	}

	const confidenceBonus = aiConfidence !== null && aiConfidence >= 80 ? 2 : 0;

	// False positive: AI said approve, human rejected
	if (aiNormalized === "approve" && humanNormalized === "reject") {
		const baseWeight = 8;
		return {
			isDivergent: true,
			divergenceWeight: Math.min(10, baseWeight + confidenceBonus),
			divergenceType: "false_positive",
		};
	}

	// False negative: AI said reject, human approved
	if (aiNormalized === "reject" && humanNormalized === "approve") {
		const baseWeight = 5;
		return {
			isDivergent: true,
			divergenceWeight: Math.min(10, baseWeight + confidenceBonus),
			divergenceType: "false_negative",
		};
	}

	// Severity mismatch: one said review, other said approve/reject
	const baseWeight = 2;
	return {
		isDivergent: true,
		divergenceWeight: Math.min(10, baseWeight + confidenceBonus),
		divergenceType: "severity_mismatch",
	};
}

// ============================================
// Feedback Recording
// ============================================

/**
 * Record a structured feedback log entry.
 *
 * 1. Fetches the AI's analysis from riskAssessments
 * 2. Computes divergence metrics
 * 3. Inserts into ai_feedback_logs
 * 4. Emits Inngest event if divergent
 */
export async function recordFeedbackLog(input: RecordFeedbackInput): Promise<{
	success: boolean;
	feedbackLogId?: number;
	isDivergent: boolean;
	error?: string;
}> {
	try {
		const db = getDatabaseClient();
		if (!db) {
			return { success: false, isDivergent: false, error: "Database connection failed" };
		}

		// Fetch AI analysis snapshot
		const aiSnapshot = await getAiAnalysisSnapshot(db, input.applicantId);

		// Compute divergence
		const divergence = computeDivergence(
			aiSnapshot.aiOutcome,
			input.humanOutcome,
			aiSnapshot.aiConfidence
		);

		// Insert feedback log
		const result = await db
			.insert(aiFeedbackLogs)
			.values({
				workflowId: input.workflowId,
				applicantId: input.applicantId,
				aiOutcome: aiSnapshot.aiOutcome,
				aiConfidence: aiSnapshot.aiConfidence,
				aiCheckType: aiSnapshot.aiCheckType,
				humanOutcome: input.humanOutcome,
				overrideCategory: input.overrideCategory,
				overrideSubcategory: input.overrideSubcategory,
				overrideDetails: input.overrideDetails,
				isDivergent: divergence.isDivergent,
				divergenceWeight: divergence.divergenceWeight,
				divergenceType: divergence.divergenceType,
				decidedBy: input.decidedBy,
			})
			.returning({ id: aiFeedbackLogs.id });

		const feedbackLogId = result[0]?.id;

		// Emit Inngest event for divergent decisions
		if (divergence.isDivergent && feedbackLogId) {
			await inngest.send({
				name: "ai/feedback.divergence_detected",
				data: {
					workflowId: input.workflowId,
					applicantId: input.applicantId,
					feedbackLogId,
					divergenceType: divergence.divergenceType!,
					divergenceWeight: divergence.divergenceWeight,
					overrideCategory: input.overrideCategory,
					overrideSubcategory: input.overrideSubcategory,
					aiOutcome: aiSnapshot.aiOutcome,
					humanOutcome: input.humanOutcome,
				},
			});
		}

		return {
			success: true,
			feedbackLogId,
			isDivergent: divergence.isDivergent,
		};
	} catch (error) {
		console.error("[Divergence] Error recording feedback:", error);
		return {
			success: false,
			isDivergent: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

// ============================================
// Helpers
// ============================================

/**
 * Normalize AI/human outcome strings to comparable values.
 */
function normalizeOutcome(outcome: string): "approve" | "reject" | "review" {
	const upper = outcome.toUpperCase();
	if (upper.includes("APPROVE") || upper === "CLEARED") return "approve";
	if (upper.includes("REJECT") || upper.includes("DECLINE") || upper === "DENIED")
		return "reject";
	return "review";
}

/**
 * Fetch the AI's analysis snapshot for an applicant.
 * Falls back to sensible defaults if no AI analysis exists.
 */
async function getAiAnalysisSnapshot(
	db: ReturnType<typeof getDatabaseClient>,
	applicantId: number
): Promise<AiAnalysisSnapshot> {
	try {
		const assessments = await db
			.select()
			.from(riskAssessments)
			.where(eq(riskAssessments.applicantId, applicantId));

		const assessment = assessments[0];
		if (!assessment?.aiAnalysis) {
			return {
				aiOutcome: "MANUAL_REVIEW",
				aiConfidence: null,
				aiCheckType: "aggregated",
			};
		}

		const parsed = JSON.parse(assessment.aiAnalysis) as Record<string, unknown>;
		return {
			aiOutcome: (parsed.recommendation as string) || "MANUAL_REVIEW",
			aiConfidence: (parsed.scores as Record<string, number>)?.aggregatedScore ?? null,
			aiCheckType: "aggregated",
		};
	} catch {
		return { aiOutcome: "MANUAL_REVIEW", aiConfidence: null, aiCheckType: "aggregated" };
	}
}
