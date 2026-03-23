import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { workflows } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { hasPermissionOrAdmin } from "@/lib/auth/permissions";
import type { AgreementContractOverrides } from "@/lib/utils/agreement-defaults";
import {
	logWorkflowEventOnce,
	markStage5GateOnce,
} from "@/lib/services/workflow-command.service";

const ContractReviewSchema = z.object({
	applicantId: z.number().int().positive(),
	reviewNotes: z.string().max(2000).optional(),
	contractOverrides: z.record(z.string(), z.string().max(500)).optional(),
	markReviewed: z.boolean().optional(),
});

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { userId, has, orgRole } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		if (!hasPermissionOrAdmin(has, orgRole, "org:quote:approve")) {
			return NextResponse.json(
				{ error: "Forbidden - Missing org:quote:approve permission" },
				{ status: 403 }
			);
		}

		const { id } = await params;
		const workflowId = Number.parseInt(id, 10);
		if (Number.isNaN(workflowId)) {
			return NextResponse.json({ error: "Invalid workflow ID" }, { status: 400 });
		}

		const payload = await request.json();
		const parsed = ContractReviewSchema.safeParse(payload);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.flatten().fieldErrors },
				{ status: 400 }
			);
		}

		const {
			applicantId,
			reviewNotes,
			contractOverrides,
			markReviewed = true,
		} = parsed.data;
		const db = await getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const [workflow] = await db
			.select()
			.from(workflows)
			.where(eq(workflows.id, workflowId));

		if (!workflow) {
			return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
		}

		if (workflow.applicantId !== applicantId) {
			return NextResponse.json({ error: "Applicant/workflow mismatch" }, { status: 409 });
		}

		if (contractOverrides && Object.keys(contractOverrides).length > 0) {
			let metadata: { contractOverrides?: AgreementContractOverrides } = {};
			if (workflow.metadata) {
				try {
					metadata = JSON.parse(workflow.metadata) as {
						contractOverrides?: AgreementContractOverrides;
					};
				} catch {
					metadata = {};
				}
			}

			await db
				.update(workflows)
				.set({
					metadata: JSON.stringify({
						...metadata,
						contractOverrides,
					}),
				})
				.where(eq(workflows.id, workflowId));
		}

		if (!markReviewed) {
			return NextResponse.json({
				success: true,
				workflowId,
				applicantId,
				message: "Contract draft saved",
				alreadyReviewed: Boolean(workflow.contractDraftReviewedAt),
			});
		}

		const applied = await markStage5GateOnce({
			workflowId,
			gate: "contract_reviewed",
			actorId: userId,
		});

		const reviewedAt = new Date().toISOString();
		if (applied) {
			await logWorkflowEventOnce({
				workflowId,
				eventType: "contract_draft_reviewed",
				payload: {
					reviewedBy: userId,
					reviewNotes,
					timestamp: reviewedAt,
				},
				actorType: "user",
				actorId: userId,
			});
		}

		await inngest.send({
			name: "contract/draft.reviewed",
			data: {
				workflowId,
				applicantId,
				reviewedBy: userId,
				reviewedAt,
				changes: reviewNotes ? { reviewNotes } : undefined,
			},
		});

		return NextResponse.json({
			success: true,
			workflowId,
			applicantId,
			message: applied
				? "Contract draft review recorded"
				: "Contract draft review already recorded",
			alreadyReviewed: !applied,
		});
	} catch (error) {
		console.error("[ContractReviewAction] Error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
