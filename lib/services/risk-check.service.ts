/**
 * Risk Check Service — CRUD operations for the dedicated risk_check_results table.
 *
 * This is the canonical read/write layer for Procurement, ITC, Sanctions,
 * and FICA check lifecycle state. All consumers (workflow stages, APIs,
 * report builders) should go through these functions instead of directly
 * querying scattered applicant/workflow/riskAssessment fields.
 */

import { and, eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import {
	type RiskCheckMachineState,
	type RiskCheckReviewState,
	type RiskCheckType,
	riskCheckResults,
} from "@/db/schema";

export interface RiskCheckRow {
	id: number;
	workflowId: number;
	applicantId: number;
	checkType: string;
	machineState: string;
	reviewState: string;
	provider: string | null;
	externalCheckId: string | null;
	payload: string | null;
	rawPayload: string | null;
	errorDetails: string | null;
	startedAt: Date | null;
	completedAt: Date | null;
	reviewedBy: string | null;
	reviewedAt: Date | null;
	reviewNotes: string | null;
	createdAt: Date | null;
	updatedAt: Date | null;
}

export async function ensureRiskChecksExist(
	workflowId: number,
	applicantId: number
): Promise<void> {
	const db = getDatabaseClient();
	if (!db) return;

	const existing = await db
		.select({ checkType: riskCheckResults.checkType })
		.from(riskCheckResults)
		.where(eq(riskCheckResults.workflowId, workflowId));

	const existingTypes = new Set(existing.map(r => r.checkType));
	const allTypes: RiskCheckType[] = ["PROCUREMENT", "ITC", "SANCTIONS", "FICA"];

	const missing = allTypes.filter(t => !existingTypes.has(t));
	if (missing.length === 0) return;

	await db.insert(riskCheckResults).values(
		missing.map(checkType => ({
			workflowId,
			applicantId,
			checkType,
			machineState: "pending" as const,
			reviewState: "pending" as const,
		}))
	);
}

export async function getRiskChecksForWorkflow(
	workflowId: number
): Promise<RiskCheckRow[]> {
	const db = getDatabaseClient();
	if (!db) return [];

	return db
		.select()
		.from(riskCheckResults)
		.where(eq(riskCheckResults.workflowId, workflowId));
}

export async function getRiskCheck(
	workflowId: number,
	checkType: RiskCheckType
): Promise<RiskCheckRow | null> {
	const db = getDatabaseClient();
	if (!db) return null;

	const [row] = await db
		.select()
		.from(riskCheckResults)
		.where(
			and(
				eq(riskCheckResults.workflowId, workflowId),
				eq(riskCheckResults.checkType, checkType)
			)
		);

	return row ?? null;
}

export async function updateRiskCheckMachineState(
	workflowId: number,
	checkType: RiskCheckType,
	machineState: RiskCheckMachineState,
	updates?: {
		provider?: string;
		externalCheckId?: string;
		payload?: object;
		rawPayload?: object;
		errorDetails?: string;
	}
): Promise<void> {
	const db = getDatabaseClient();
	if (!db) return;

	const now = new Date();

	await db
		.update(riskCheckResults)
		.set({
			machineState,
			...(updates?.provider !== undefined && { provider: updates.provider }),
			...(updates?.externalCheckId !== undefined && { externalCheckId: updates.externalCheckId }),
			...(updates?.payload !== undefined && { payload: JSON.stringify(updates.payload) }),
			...(updates?.rawPayload !== undefined && { rawPayload: JSON.stringify(updates.rawPayload) }),
			...(updates?.errorDetails !== undefined && { errorDetails: updates.errorDetails }),
			...(machineState === "in_progress" && { startedAt: now }),
			...(["completed", "failed", "manual_required"].includes(machineState) && { completedAt: now }),
			updatedAt: now,
		})
		.where(
			and(
				eq(riskCheckResults.workflowId, workflowId),
				eq(riskCheckResults.checkType, checkType)
			)
		);
}

export async function updateRiskCheckReviewState(
	workflowId: number,
	checkType: RiskCheckType,
	reviewState: RiskCheckReviewState,
	reviewedBy: string,
	reviewNotes?: string
): Promise<void> {
	const db = getDatabaseClient();
	if (!db) return;

	const now = new Date();

	await db
		.update(riskCheckResults)
		.set({
			reviewState,
			reviewedBy,
			reviewedAt: now,
			...(reviewNotes !== undefined && { reviewNotes }),
			updatedAt: now,
		})
		.where(
			and(
				eq(riskCheckResults.workflowId, workflowId),
				eq(riskCheckResults.checkType, checkType)
			)
		);
}

export interface HybridGateStatus {
	allChecksTerminal: boolean;
	allChecksReviewed: boolean;
	ready: boolean;
	checks: Array<{
		checkType: string;
		machineState: string;
		reviewState: string;
	}>;
}

const TERMINAL_MACHINE_STATES: RiskCheckMachineState[] = [
	"completed",
	"failed",
	"manual_required",
];
const REVIEWED_STATES: RiskCheckReviewState[] = [
	"acknowledged",
	"approved",
	"not_required",
];

export async function getHybridGateStatus(
	workflowId: number
): Promise<HybridGateStatus> {
	const checks = await getRiskChecksForWorkflow(workflowId);

	const allChecksTerminal = checks.length === 4 && checks.every(
		c => TERMINAL_MACHINE_STATES.includes(c.machineState as RiskCheckMachineState)
	);

	const allChecksReviewed = checks.length === 4 && checks.every(
		c => REVIEWED_STATES.includes(c.reviewState as RiskCheckReviewState)
	);

	return {
		allChecksTerminal,
		allChecksReviewed,
		ready: allChecksTerminal && allChecksReviewed,
		checks: checks.map(c => ({
			checkType: c.checkType,
			machineState: c.machineState,
			reviewState: c.reviewState,
		})),
	};
}
