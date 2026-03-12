/**
 * Green Lane Service
 *
 * Implements automatic approval logic for applicants who meet strict eligibility criteria.
 * Green Lane approved applicants bypass Stage 4 (Risk Manager review) in the onboarding workflow.
 *
 * Eligibility Criteria:
 * - Aggregated AI score >= 85%
 * - Risk level: LOW (stored as "green" in the database)
 * - Zero flags from AI analysis
 *
 * Synthetic approvals are recorded with:
 * - approvedBy: "system_green_lane"
 * - Full audit trail for compliance
 *
 * @module green-lane.service
 */

import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { applicants, workflowEvents, workflows } from "@/db/schema";

// ============================================
// Constants
// ============================================

export const GREEN_LANE_APPROVER_ID = "system_green_lane" as const;
export const GREEN_LANE_SCORE_THRESHOLD = 85;
export const GREEN_LANE_RISK_LEVEL = "green" as const;

// ============================================
// Types
// ============================================

export interface GreenLaneEligibilityInput {
	aggregatedScore: number;
	riskLevel: string | null | undefined;
	flags: string[];
}

export interface GreenLaneEligibilityResult {
	isEligible: boolean;
	reasons: string[];
	criteria: {
		scoreCheck: {
			passed: boolean;
			value: number;
			threshold: number;
		};
		riskLevelCheck: {
			passed: boolean;
			value: string | null;
			required: string;
		};
		flagsCheck: {
			passed: boolean;
			count: number;
			flags: string[];
		};
	};
}

export interface GreenLaneApprovalRecord {
	approvedBy: typeof GREEN_LANE_APPROVER_ID;
	approvedAt: string;
	eligibilityResult: GreenLaneEligibilityResult;
	workflowId: number;
	applicantId: number;
}

// ============================================
// Pure Eligibility Functions (Unit Testable)
// ============================================

/**
 * Check if the aggregated score meets the Green Lane threshold.
 * Pure function - no side effects.
 */
export function checkScoreEligibility(score: number): {
	passed: boolean;
	value: number;
	threshold: number;
} {
	return {
		passed: score >= GREEN_LANE_SCORE_THRESHOLD,
		value: score,
		threshold: GREEN_LANE_SCORE_THRESHOLD,
	};
}

/**
 * Check if the risk level qualifies for Green Lane.
 * Risk level must be "green" (LOW risk).
 * Pure function - no side effects.
 */
export function checkRiskLevelEligibility(riskLevel: string | null | undefined): {
	passed: boolean;
	value: string | null;
	required: string;
} {
	const normalizedLevel = riskLevel?.toLowerCase() ?? null;
	return {
		passed: normalizedLevel === GREEN_LANE_RISK_LEVEL,
		value: riskLevel ?? null,
		required: GREEN_LANE_RISK_LEVEL,
	};
}

/**
 * Check if there are zero flags from AI analysis.
 * Any flags disqualify the applicant from Green Lane.
 * Pure function - no side effects.
 */
export function checkFlagsEligibility(flags: string[]): {
	passed: boolean;
	count: number;
	flags: string[];
} {
	return {
		passed: flags.length === 0,
		count: flags.length,
		flags,
	};
}

/**
 * Evaluate full Green Lane eligibility based on all criteria.
 * This is a pure function that can be easily unit tested.
 *
 * @param input - The eligibility input containing score, risk level, and flags
 * @returns A detailed eligibility result with pass/fail for each criterion
 */
export function evaluateGreenLaneEligibility(
	input: GreenLaneEligibilityInput
): GreenLaneEligibilityResult {
	const scoreCheck = checkScoreEligibility(input.aggregatedScore);
	const riskLevelCheck = checkRiskLevelEligibility(input.riskLevel);
	const flagsCheck = checkFlagsEligibility(input.flags);

	const reasons: string[] = [];

	if (!scoreCheck.passed) {
		reasons.push(
			`Score ${scoreCheck.value}% is below the ${scoreCheck.threshold}% threshold`
		);
	}
	if (!riskLevelCheck.passed) {
		reasons.push(
			`Risk level "${riskLevelCheck.value ?? "unknown"}" is not "${riskLevelCheck.required}"`
		);
	}
	if (!flagsCheck.passed) {
		reasons.push(`${flagsCheck.count} flag(s) present: ${flagsCheck.flags.join(", ")}`);
	}

	const isEligible = scoreCheck.passed && riskLevelCheck.passed && flagsCheck.passed;

	return {
		isEligible,
		reasons: isEligible ? ["All Green Lane criteria met"] : reasons,
		criteria: {
			scoreCheck,
			riskLevelCheck,
			flagsCheck,
		},
	};
}

// ============================================
// Database Operations
// ============================================

/**
 * Fetch the data needed to evaluate Green Lane eligibility for a workflow.
 */
export async function fetchGreenLaneEligibilityData(
	_workflowId: number,
	applicantId: number,
	aiAnalysis?: { scores?: { aggregatedScore?: number }; overall?: { flags?: string[] } }
): Promise<GreenLaneEligibilityInput | null> {
	const db = getDatabaseClient();
	if (!db) {
		console.error("[GreenLane] Database connection failed");
		return null;
	}

	const [applicant] = await db
		.select({ riskLevel: applicants.riskLevel })
		.from(applicants)
		.where(eq(applicants.id, applicantId));

	if (!applicant) {
		console.error(`[GreenLane] Applicant ${applicantId} not found`);
		return null;
	}

	const aggregatedScore = aiAnalysis?.scores?.aggregatedScore ?? 0;
	const flags = aiAnalysis?.overall?.flags ?? [];
	const riskLevel = applicant.riskLevel;

	return {
		aggregatedScore,
		riskLevel,
		flags,
	};
}

/**
 * Create a synthetic Green Lane approval record.
 * This writes to the database for full audit trail.
 */
export async function createGreenLaneApproval(
	workflowId: number,
	applicantId: number,
	eligibilityResult: GreenLaneEligibilityResult
): Promise<GreenLaneApprovalRecord> {
	const db = getDatabaseClient();
	if (!db) {
		throw new Error("[GreenLane] Database connection failed");
	}

	const approvalRecord: GreenLaneApprovalRecord = {
		approvedBy: GREEN_LANE_APPROVER_ID,
		approvedAt: new Date().toISOString(),
		eligibilityResult,
		workflowId,
		applicantId,
	};

	await db
		.update(workflows)
		.set({
			greenLaneApproval: JSON.stringify(approvalRecord),
		})
		.where(eq(workflows.id, workflowId));

	await db.insert(workflowEvents).values({
		workflowId,
		eventType: "green_lane_approval",
		payload: JSON.stringify({
			approvedBy: GREEN_LANE_APPROVER_ID,
			approvedAt: approvalRecord.approvedAt,
			eligibilityDetails: eligibilityResult,
		}),
		actorType: "platform",
		actorId: GREEN_LANE_APPROVER_ID,
	});

	console.info(
		`[GreenLane] Synthetic approval created for workflow ${workflowId}, applicant ${applicantId}`
	);

	return approvalRecord;
}

/**
 * Check if a workflow was Green Lane approved.
 */
export async function isGreenLaneApproved(
	workflowId: number
): Promise<{ approved: boolean; record?: GreenLaneApprovalRecord }> {
	const db = getDatabaseClient();
	if (!db) {
		return { approved: false };
	}

	const [workflow] = await db
		.select({ greenLaneApproval: workflows.greenLaneApproval })
		.from(workflows)
		.where(eq(workflows.id, workflowId));

	if (!workflow?.greenLaneApproval) {
		return { approved: false };
	}

	try {
		const record = JSON.parse(workflow.greenLaneApproval) as GreenLaneApprovalRecord;
		return { approved: true, record };
	} catch {
		return { approved: false };
	}
}

/**
 * Main entry point for Green Lane evaluation in the workflow.
 * Evaluates eligibility and creates approval if eligible.
 *
 * @returns The approval record if eligible, null if not eligible
 */
export async function processGreenLaneApproval(
	workflowId: number,
	applicantId: number,
	aiAnalysis?: { scores?: { aggregatedScore?: number }; overall?: { flags?: string[] } }
): Promise<{
	approved: boolean;
	eligibilityResult: GreenLaneEligibilityResult;
	approvalRecord?: GreenLaneApprovalRecord;
}> {
	const eligibilityData = await fetchGreenLaneEligibilityData(
		workflowId,
		applicantId,
		aiAnalysis
	);

	if (!eligibilityData) {
		return {
			approved: false,
			eligibilityResult: {
				isEligible: false,
				reasons: ["Could not fetch eligibility data"],
				criteria: {
					scoreCheck: { passed: false, value: 0, threshold: GREEN_LANE_SCORE_THRESHOLD },
					riskLevelCheck: { passed: false, value: null, required: GREEN_LANE_RISK_LEVEL },
					flagsCheck: { passed: false, count: 0, flags: [] },
				},
			},
		};
	}

	const eligibilityResult = evaluateGreenLaneEligibility(eligibilityData);

	if (!eligibilityResult.isEligible) {
		console.info(
			`[GreenLane] Workflow ${workflowId} not eligible: ${eligibilityResult.reasons.join("; ")}`
		);
		return { approved: false, eligibilityResult };
	}

	const approvalRecord = await createGreenLaneApproval(
		workflowId,
		applicantId,
		eligibilityResult
	);

	return {
		approved: true,
		eligibilityResult,
		approvalRecord,
	};
}
