import { and, eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { applicantMagiclinkForms, applicants, RISK_CHECK_TYPES, workflows } from "@/db/schema";
import { getRiskChecksForWorkflow, updateRiskCheckReviewState } from "@/lib/services/risk-check.service";
import { logWorkflowEvent } from "@/lib/services/notification-events.service";
import { mapProcureCheckRiskCategory } from "./procure-check.types";

export const GREEN_LANE_APPROVED_BY = "system_green_lane";
export const GREEN_LANE_REVIEW_NOTE = "Green Lane auto-approval";
export const GREEN_LANE_MIN_CREDIT_SCORE = 500;

export const GREEN_LANE_REQUEST_SOURCE = {
	MANUAL_AM: "manual_am",
	AUTOMATIC: "automatic",
} as const;

const GREEN_LANE_SANCTIONS_RISK_LEVELS = new Set(["CLEAR", "LOW"]);
const REQUIRED_GREEN_LANE_CHECK_TYPES = RISK_CHECK_TYPES;

type ItcRiskCategory = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

type ProcurementPayload = {
	anomalies?: unknown;
	recommendedAction?: unknown;
};

type ItcPayload = {
	creditScore?: unknown;
	riskCategory?: unknown;
	adverseListings?: unknown;
	passed?: unknown;
	recommendation?: unknown;
};

type ProcureCheckCreditProfile = {
	riskCategory?: "Very High" | "High" | "Medium" | "Low" | "Very Low";
};

type ProcureCheckRawPayload = {
	creditProfile?: ProcureCheckCreditProfile;
	adverseListings?: unknown;
};

type SanctionsPayload = {
	isBlocked?: unknown;
	riskLevel?: unknown;
	passed?: unknown;
};

type FicaSummary = {
	overallRecommendation?: unknown;
	criticalMismatchCount?: unknown;
};

type FicaComparison = {
	summary?: {
		criticalMismatchCount?: unknown;
		overallStatus?: unknown;
	};
};

type FicaPayload = {
	summary?: FicaSummary;
	ficaComparisons?: unknown;
	overallRecommendation?: unknown;
};

export interface GreenLaneEligibilitySummary {
	applicantRiskLevel: string | null;
	creditScore: number | null;
	itcRiskCategory: ItcRiskCategory | null;
	procurementAnomalyCount: number;
	itcAdverseListingCount: number | null;
	sanctionsRiskLevel: string | null;
	sanctionsBlocked: boolean;
	ficaOverallRecommendation: string | null;
	ficaCriticalMismatchCount: number;
}

export interface GreenLaneEligibilityResult {
	eligible: boolean;
	reason?: string;
	summary: GreenLaneEligibilitySummary;
}

const DEFAULT_SUMMARY: GreenLaneEligibilitySummary = {
	applicantRiskLevel: null,
	creditScore: null,
	itcRiskCategory: null,
	procurementAnomalyCount: 0,
	itcAdverseListingCount: 0,
	sanctionsRiskLevel: null,
	sanctionsBlocked: false,
	ficaOverallRecommendation: null,
	ficaCriticalMismatchCount: 0,
};

export async function isGreenLaneEligible(
	workflowId: number
): Promise<GreenLaneEligibilityResult> {
	const checks = await getRiskChecksForWorkflow(workflowId);

	if (checks.length !== REQUIRED_GREEN_LANE_CHECK_TYPES.length) {
		return {
			eligible: false,
			reason: "Missing one or more risk checks",
			summary: DEFAULT_SUMMARY,
		};
	}

	const checksByType = new Map(checks.map(check => [check.checkType, check]));
	for (const checkType of REQUIRED_GREEN_LANE_CHECK_TYPES) {
		const check = checksByType.get(checkType);
		if (!check) {
			return {
				eligible: false,
				reason: `Missing ${checkType} risk check`,
				summary: DEFAULT_SUMMARY,
			};
		}
		if (check.machineState !== "completed") {
			return {
				eligible: false,
				reason: `${checkType} risk check is not completed`,
				summary: DEFAULT_SUMMARY,
			};
		}
	}

	const applicantRiskLevel = await getApplicantRiskLevel(checks[0].applicantId);
	const procurementCheck = checksByType.get("PROCUREMENT");
	const itcCheck = checksByType.get("ITC");
	const sanctionsCheck = checksByType.get("SANCTIONS");
	const ficaCheck = checksByType.get("FICA");

	if (!procurementCheck || !itcCheck || !sanctionsCheck || !ficaCheck) {
		return {
			eligible: false,
			reason: "Required checks are missing",
			summary: {
				...DEFAULT_SUMMARY,
				applicantRiskLevel,
			},
		};
	}

	const procurementPayload = parseJson<ProcurementPayload>(procurementCheck.payload);
	const procurementAnomalies = getArrayLength(procurementPayload?.anomalies);

	const itcPayload = parseJson<ItcPayload>(itcCheck.payload);
	const itcRawPayload = parseJson<ProcureCheckRawPayload>(itcCheck.rawPayload);
	const creditScore = getNumber(itcPayload?.creditScore);
	const itcRiskCategory = getItcRiskCategory(itcPayload, itcRawPayload, creditScore);
	const itcAdverseListingCount = getItcAdverseListingCount(itcPayload, itcRawPayload);

	const sanctionsPayload = parseJson<SanctionsPayload>(sanctionsCheck.payload);
	const sanctionsRiskLevel = getString(sanctionsPayload?.riskLevel);
	const sanctionsBlocked = sanctionsPayload?.isBlocked === true;

	const ficaPayload = parseJson<FicaPayload>(ficaCheck.payload);
	const ficaOverallRecommendation =
		getString(ficaPayload?.summary?.overallRecommendation) ??
		getString(ficaPayload?.overallRecommendation);
	const ficaCriticalMismatchCount = getFicaCriticalMismatchCount(ficaPayload);

	const summary: GreenLaneEligibilitySummary = {
		applicantRiskLevel,
		creditScore,
		itcRiskCategory,
		procurementAnomalyCount: procurementAnomalies,
		itcAdverseListingCount,
		sanctionsRiskLevel,
		sanctionsBlocked,
		ficaOverallRecommendation,
		ficaCriticalMismatchCount,
	};

	if (applicantRiskLevel === "red") {
		return { eligible: false, reason: "Applicant is high risk", summary };
	}

	if (procurementAnomalies > 0) {
		return { eligible: false, reason: "Procurement anomalies present", summary };
	}

	if (creditScore === null || creditScore < GREEN_LANE_MIN_CREDIT_SCORE) {
		return { eligible: false, reason: "ITC credit score is below threshold", summary };
	}

	if (itcRiskCategory !== "LOW") {
		return { eligible: false, reason: "ITC risk category is not LOW", summary };
	}

	if (itcAdverseListingCount === null) {
		return {
			eligible: false,
			reason: "ITC adverse listing evidence is incomplete",
			summary,
		};
	}

	if (itcAdverseListingCount !== 0) {
		return { eligible: false, reason: "ITC adverse listings present", summary };
	}

	if (
		sanctionsBlocked ||
		!sanctionsRiskLevel ||
		!GREEN_LANE_SANCTIONS_RISK_LEVELS.has(sanctionsRiskLevel)
	) {
		return { eligible: false, reason: "Sanctions result is not clear", summary };
	}

	if (ficaOverallRecommendation !== "PROCEED" || ficaCriticalMismatchCount > 0) {
		return {
			eligible: false,
			reason: "FICA review requires intervention",
			summary,
		};
	}

	return { eligible: true, summary };
}

async function getApplicantRiskLevel(applicantId: number): Promise<string | null> {
	const db = getDatabaseClient();
	if (!db) return null;

	const [row] = await db
		.select({ riskLevel: applicants.riskLevel })
		.from(applicants)
		.where(eq(applicants.id, applicantId));

	return row?.riskLevel ?? null;
}

function parseJson<T>(value: string | null): T | null {
	if (!value) return null;
	try {
		return JSON.parse(value) as T;
	} catch {
		return null;
	}
}

function getArrayLength(value: unknown): number {
	return Array.isArray(value) ? value.length : 0;
}

function getNumber(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getString(value: unknown): string | null {
	return typeof value === "string" && value.length > 0 ? value : null;
}

function getItcRiskCategory(
	payload: ItcPayload | null,
	rawPayload: ProcureCheckRawPayload | null,
	creditScore: number | null
): ItcRiskCategory | null {
	const payloadRiskCategory = getString(payload?.riskCategory);
	if (isItcRiskCategory(payloadRiskCategory)) {
		return payloadRiskCategory;
	}

	const providerRiskCategory = rawPayload?.creditProfile?.riskCategory;
	if (providerRiskCategory) {
		return mapProcureCheckRiskCategory(providerRiskCategory);
	}

	if (creditScore === null) {
		return null;
	}

	return deriveItcRiskCategory(creditScore);
}

function deriveItcRiskCategory(creditScore: number): ItcRiskCategory {
	if (creditScore >= 750) return "LOW";
	if (creditScore >= 650) return "MEDIUM";
	if (creditScore >= 550) return "HIGH";
	return "VERY_HIGH";
}

function getItcAdverseListingCount(
	payload: ItcPayload | null,
	rawPayload: ProcureCheckRawPayload | null
): number | null {
	if (Array.isArray(payload?.adverseListings)) {
		return payload.adverseListings.length;
	}

	if (Array.isArray(rawPayload?.adverseListings)) {
		return rawPayload.adverseListings.length;
	}

	return null;
}

function getFicaCriticalMismatchCount(payload: FicaPayload | null): number {
	const summaryCount = getNumber(payload?.summary?.criticalMismatchCount);
	if (summaryCount !== null) {
		return summaryCount;
	}

	if (!Array.isArray(payload?.ficaComparisons)) {
		return 0;
	}

	return payload.ficaComparisons.reduce((count, comparison) => {
		if (!isFicaComparison(comparison)) {
			return count;
		}

		const criticalMismatchCount = getNumber(comparison.summary?.criticalMismatchCount);
		if (criticalMismatchCount !== null) {
			return count + criticalMismatchCount;
		}

		return comparison.summary?.overallStatus === "MISMATCHED" ? count + 1 : count;
	}, 0);
}

function isFicaComparison(value: unknown): value is FicaComparison {
	return typeof value === "object" && value !== null;
}

function isItcRiskCategory(value: string | null): value is ItcRiskCategory {
	return value === "LOW" || value === "MEDIUM" || value === "HIGH" || value === "VERY_HIGH";
}

// ============================================
// Manual Green Lane & applyGreenLanePass
// ============================================

export interface GreenLaneWorkflowStatus {
	greenLaneRequestedAt: Date | null;
	greenLaneRequestedBy: string | null;
	greenLaneRequestNotes: string | null;
	greenLaneRequestSource: string | null;
	greenLaneConsumedAt: Date | null;
}

export async function getGreenLaneWorkflowStatus(
	workflowId: number
): Promise<GreenLaneWorkflowStatus | null> {
	const db = getDatabaseClient();
	if (!db) return null;

	const [row] = await db
		.select({
			greenLaneRequestedAt: workflows.greenLaneRequestedAt,
			greenLaneRequestedBy: workflows.greenLaneRequestedBy,
			greenLaneRequestNotes: workflows.greenLaneRequestNotes,
			greenLaneRequestSource: workflows.greenLaneRequestSource,
			greenLaneConsumedAt: workflows.greenLaneConsumedAt,
		})
		.from(workflows)
		.where(eq(workflows.id, workflowId));

	if (!row) return null;

	return {
		greenLaneRequestedAt: row.greenLaneRequestedAt,
		greenLaneRequestedBy: row.greenLaneRequestedBy,
		greenLaneRequestNotes: row.greenLaneRequestNotes,
		greenLaneRequestSource: row.greenLaneRequestSource,
		greenLaneConsumedAt: row.greenLaneConsumedAt,
	};
}

/** Returns true if a manual Green Lane request exists and has not been consumed. */
export async function hasManualGreenLaneRequest(workflowId: number): Promise<boolean> {
	const status = await getGreenLaneWorkflowStatus(workflowId);
	if (!status) return false;
	return status.greenLaneRequestedAt !== null && status.greenLaneConsumedAt === null;
}

/** Returns true if the workflow has a signed quote (SIGNED_QUOTATION form submitted). */
export async function hasSignedQuotePrerequisite(workflowId: number): Promise<boolean> {
	const db = getDatabaseClient();
	if (!db) return false;

	const [row] = await db
		.select({ id: applicantMagiclinkForms.id })
		.from(applicantMagiclinkForms)
		.where(
			and(
				eq(applicantMagiclinkForms.workflowId, workflowId),
				eq(applicantMagiclinkForms.formType, "SIGNED_QUOTATION"),
				eq(applicantMagiclinkForms.status, "submitted")
			)
		)
		.limit(1);

	return row !== undefined;
}

/**
 * Apply Green Lane pass: approve all four risk checks with system_green_lane,
 * log the event, and mark the workflow grant as consumed.
 * Used by both automatic eligibility and manual AM-triggered Green Lane.
 */
export async function applyGreenLanePass(
	workflowId: number,
	options: {
		source: "automatic" | "manual_am";
		checkSummary?: string;
		eligibilitySummary?: Partial<GreenLaneEligibilitySummary>;
	}
): Promise<void> {
	const db = getDatabaseClient();
	if (!db) {
		throw new Error("[GreenLane] Database connection failed");
	}

	for (const checkType of RISK_CHECK_TYPES) {
		await updateRiskCheckReviewState(
			workflowId,
			checkType,
			"approved",
			GREEN_LANE_APPROVED_BY,
			GREEN_LANE_REVIEW_NOTE
		);
	}

	const now = new Date();
	await db
		.update(workflows)
		.set({
			greenLaneConsumedAt: now,
			greenLaneRequestSource: options.source,
		})
		.where(eq(workflows.id, workflowId));

	await logWorkflowEvent({
		workflowId,
		eventType: "green_lane_approved",
		payload: {
			approvedBy: GREEN_LANE_APPROVED_BY,
			source: options.source,
			stage: 4,
			checkSummary: options.checkSummary,
			eligibility: options.eligibilitySummary,
			timestamp: now.toISOString(),
		},
		actorId: GREEN_LANE_APPROVED_BY,
	});
}

export interface RequestManualGreenLaneResult {
	success: boolean;
	workflowId: number;
	applicantId: number;
	alreadyRequested?: boolean;
	alreadyConsumed?: boolean;
	error?: string;
}

/**
 * Persist a manual Green Lane request on the workflow.
 * Caller must ensure signed quote prerequisite and idempotency.
 */
export async function requestManualGreenLane(
	workflowId: number,
	applicantId: number,
	actorId: string,
	notes?: string
): Promise<RequestManualGreenLaneResult> {
	const db = getDatabaseClient();
	if (!db) {
		return { success: false, workflowId, applicantId, error: "Database connection failed" };
	}

	const status = await getGreenLaneWorkflowStatus(workflowId);
	if (!status) {
		return { success: false, workflowId, applicantId, error: "Workflow not found" };
	}
	if (status.greenLaneConsumedAt) {
		return {
			success: false,
			workflowId,
			applicantId,
			alreadyConsumed: true,
			error: "Green Lane grant has already been consumed",
		};
	}
	if (status.greenLaneRequestedAt) {
		return {
			success: false,
			workflowId,
			applicantId,
			alreadyRequested: true,
			error: "Green Lane has already been requested",
		};
	}

	const now = new Date();
	await db
		.update(workflows)
		.set({
			greenLaneRequestedAt: now,
			greenLaneRequestedBy: actorId,
			greenLaneRequestNotes: notes ?? null,
			greenLaneRequestSource: GREEN_LANE_REQUEST_SOURCE.MANUAL_AM,
		})
		.where(eq(workflows.id, workflowId));

	await logWorkflowEvent({
		workflowId,
		eventType: "green_lane_requested",
		payload: {
			requestedBy: actorId,
			notes,
			timestamp: now.toISOString(),
		},
		actorType: "user",
		actorId,
	});

	return { success: true, workflowId, applicantId };
}
