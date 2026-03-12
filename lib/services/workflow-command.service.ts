import { and, eq, isNull } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { workflowEvents, workflows } from "@/db/schema";

type ApprovalDecision = "APPROVED" | "REJECTED";
type ApprovalRole = "risk_manager" | "account_manager";

interface ApprovalState {
	approvedBy: string;
	decision: ApprovalDecision;
	timestamp: string;
	reason?: string;
}

const parseApprovalState = (value: string | null): ApprovalState | null => {
	if (!value) return null;
	try {
		return JSON.parse(value) as ApprovalState;
	} catch {
		return null;
	}
};

export async function hasWorkflowEvent(
	workflowId: number,
	eventType: string
): Promise<boolean> {
	const db = getDatabaseClient();
	if (!db) throw new Error("Database connection failed");

	const [existing] = await db
		.select({ id: workflowEvents.id })
		.from(workflowEvents)
		.where(
			and(
				eq(workflowEvents.workflowId, workflowId),
				eq(workflowEvents.eventType, eventType)
			)
		)
		.limit(1);

	return Boolean(existing);
}

export async function logWorkflowEventOnce(params: {
	workflowId: number;
	eventType: string;
	payload: Record<string, unknown>;
	actorType?: "user" | "agent" | "platform";
	actorId?: string;
}): Promise<boolean> {
	const db = getDatabaseClient();
	if (!db) throw new Error("Database connection failed");

	const exists = await hasWorkflowEvent(params.workflowId, params.eventType);
	if (exists) return false;

	await db.insert(workflowEvents).values({
		workflowId: params.workflowId,
		eventType: params.eventType,
		payload: JSON.stringify(params.payload),
		actorType: params.actorType ?? "platform",
		actorId: params.actorId,
		timestamp: new Date(),
	});

	return true;
}

type Stage5Gate = "contract_reviewed" | "absa_packet_sent" | "absa_approval_confirmed";

export async function markStage5GateOnce(params: {
	workflowId: number;
	gate: Stage5Gate;
	actorId: string;
}): Promise<boolean> {
	const db = getDatabaseClient();
	if (!db) throw new Error("Database connection failed");

	const now = new Date();
	if (params.gate === "contract_reviewed") {
		const [updated] = await db
			.update(workflows)
			.set({
				contractDraftReviewedAt: now,
				contractDraftReviewedBy: params.actorId,
			})
			.where(
				and(
					eq(workflows.id, params.workflowId),
					isNull(workflows.contractDraftReviewedAt)
				)
			)
			.returning({ id: workflows.id });
		return Boolean(updated);
	}

	if (params.gate === "absa_packet_sent") {
		const [updated] = await db
			.update(workflows)
			.set({
				absaPacketSentAt: now,
				absaPacketSentBy: params.actorId,
			})
			.where(
				and(eq(workflows.id, params.workflowId), isNull(workflows.absaPacketSentAt))
			)
			.returning({ id: workflows.id });
		return Boolean(updated);
	}

	const [updated] = await db
		.update(workflows)
		.set({
			absaApprovalConfirmedAt: now,
			absaApprovalConfirmedBy: params.actorId,
		})
		.where(
			and(
				eq(workflows.id, params.workflowId),
				isNull(workflows.absaApprovalConfirmedAt)
			)
		)
		.returning({ id: workflows.id });
	return Boolean(updated);
}

export async function recordFinalApprovalDecision(params: {
	workflowId: number;
	role: ApprovalRole;
	decision: ApprovalDecision;
	approvedBy: string;
	reason?: string;
	timestamp?: string;
}): Promise<{
	alreadyRecorded: boolean;
	bothApproved: boolean;
	riskApproval: ApprovalState | null;
	accountApproval: ApprovalState | null;
}> {
	const db = getDatabaseClient();
	if (!db) throw new Error("Database connection failed");

	const [workflow] = await db
		.select({
			id: workflows.id,
			riskManagerApproval: workflows.riskManagerApproval,
			accountManagerApproval: workflows.accountManagerApproval,
		})
		.from(workflows)
		.where(eq(workflows.id, params.workflowId))
		.limit(1);

	if (!workflow) throw new Error(`Workflow ${params.workflowId} not found`);

	const existingRisk = parseApprovalState(workflow.riskManagerApproval);
	const existingAccount = parseApprovalState(workflow.accountManagerApproval);
	const timestamp = params.timestamp ?? new Date().toISOString();
	const nextApproval: ApprovalState = {
		approvedBy: params.approvedBy,
		decision: params.decision,
		timestamp,
		...(params.reason ? { reason: params.reason } : {}),
	};

	const alreadyRecorded =
		params.role === "risk_manager"
			? Boolean(
					existingRisk &&
						existingRisk.decision === params.decision &&
						existingRisk.approvedBy === params.approvedBy
				)
			: Boolean(
					existingAccount &&
						existingAccount.decision === params.decision &&
						existingAccount.approvedBy === params.approvedBy
				);

	if (!alreadyRecorded) {
		await db
			.update(workflows)
			.set(
				params.role === "risk_manager"
					? { riskManagerApproval: JSON.stringify(nextApproval) }
					: { accountManagerApproval: JSON.stringify(nextApproval) }
			)
			.where(eq(workflows.id, params.workflowId));
	}

	const riskApproval =
		params.role === "risk_manager" ? nextApproval : (existingRisk ?? null);
	const accountApproval =
		params.role === "account_manager" ? nextApproval : (existingAccount ?? null);
	const bothApproved =
		riskApproval?.decision === "APPROVED" &&
		accountApproval?.decision === "APPROVED";

	return {
		alreadyRecorded,
		bothApproved,
		riskApproval,
		accountApproval,
	};
}
