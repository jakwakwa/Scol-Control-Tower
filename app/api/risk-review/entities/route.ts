import { auth } from "@clerk/nextjs/server";
import { and, count, desc, eq, notInArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { applicants, riskAssessments, workflowEvents, workflows } from "@/db/schema";

// --- Types ---

export interface RiskEntityRow {
	id: number;
	applicantId: number;
	companyName: string;
	procurementStatus: "pending" | "cleared" | "manual_required" | "failed";
	itcStatus: "pending" | "cleared" | "manual_required" | "failed";
	sanctionStatus: "clear" | "flagged" | "confirmed_hit" | "pending";
	ficaStatus: "pending" | "submitted" | "verified" | "rejected";
	finalReportReady: boolean;
}

/**
 * GET /api/risk-review/entities?page=1&pageSize=10
 *
 * Returns paginated applicants with in-progress workflows and their
 * check statuses (procurement, ITC, sanctions, FICA).
 */
export async function GET(request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const url = new URL(request.url);
		const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
		const pageSize = Math.min(
			50,
			Math.max(1, Number(url.searchParams.get("pageSize") || "10"))
		);
		const offset = (page - 1) * pageSize;

		// Terminal statuses — exclude from in-progress list
		const terminalStatuses = ["completed", "terminated", "failed"];

		// Total count for pagination
		const [totalResult] = await db
			.select({ value: count() })
			.from(workflows)
			.leftJoin(applicants, eq(workflows.applicantId, applicants.id))
			.where(notInArray(workflows.status, terminalStatuses));

		const totalCount = totalResult?.value ?? 0;

		// Fetch paginated rows ordered by most recent first
		const rows = await db
			.select({
				workflowId: workflows.id,
				applicantId: workflows.applicantId,
				companyName: applicants.companyName,
				stage: workflows.stage,
				status: workflows.status,
				procurementCleared: workflows.procurementCleared,
				itcScore: applicants.itcScore,
				itcStatusDb: applicants.itcStatus,
				sanctionStatusDb: applicants.sanctionStatus,
				riskLevel: applicants.riskLevel,
			})
			.from(workflows)
			.leftJoin(applicants, eq(workflows.applicantId, applicants.id))
			.where(notInArray(workflows.status, terminalStatuses))
			.orderBy(desc(workflows.id))
			.limit(pageSize)
			.offset(offset);

		// Enrich each row with check statuses
		const items: RiskEntityRow[] = await Promise.all(
			rows.map(async row => {
				// --- Procurement status ---
				let procurementStatus: RiskEntityRow["procurementStatus"] = "pending";
				if (row.procurementCleared) {
					procurementStatus = "cleared";
				} else {
					// Check for procurement failure events
					const failureEvents = await db
						.select({ id: workflowEvents.id })
						.from(workflowEvents)
						.where(
							and(
								eq(workflowEvents.workflowId, row.workflowId),
								eq(workflowEvents.eventType, "error")
							)
						)
						.limit(1);

					if (failureEvents.length > 0) {
						procurementStatus = "manual_required";
					}
				}

				// --- ITC status ---
				let itcStatus: RiskEntityRow["itcStatus"] = "pending";
				const itcVal = (row.itcStatusDb || "").toUpperCase();
				if (itcVal === "CLEARED" || itcVal === "PASSED") {
					itcStatus = "cleared";
				} else if (itcVal === "MANUAL_REVIEW") {
					itcStatus = "manual_required";
				} else if (itcVal === "FAILED" || itcVal === "REJECTED") {
					itcStatus = "failed";
				}

				// --- Sanctions status ---
				let sanctionStatus: RiskEntityRow["sanctionStatus"] = "pending";
				const sanctionVal = row.sanctionStatusDb || "pending";
				if (
					sanctionVal === "clear" ||
					sanctionVal === "flagged" ||
					sanctionVal === "confirmed_hit"
				) {
					sanctionStatus = sanctionVal;
				}

				// --- FICA status ---
				// Derive from risk assessment and document state
				let ficaStatus: RiskEntityRow["ficaStatus"] = "pending";
				const assessments = await db
					.select({
						aiAnalysis: riskAssessments.aiAnalysis,
						reviewedBy: riskAssessments.reviewedBy,
					})
					.from(riskAssessments)
					.where(eq(riskAssessments.applicantId, row.applicantId))
					.limit(1);

				if (assessments.length > 0) {
					const assessment = assessments[0];
					if (assessment.reviewedBy) {
						ficaStatus = "verified";
					} else if (assessment.aiAnalysis) {
						ficaStatus = "submitted";
					}
				}

				// --- Final report readiness ---
				const finalReportReady =
					procurementStatus === "cleared" &&
					itcStatus === "cleared" &&
					sanctionStatus === "clear" &&
					ficaStatus === "verified";

				return {
					id: row.workflowId,
					applicantId: row.applicantId,
					companyName: row.companyName || "Unknown Company",
					procurementStatus,
					itcStatus,
					sanctionStatus,
					ficaStatus,
					finalReportReady,
				};
			})
		);

		return NextResponse.json({
			items,
			totalCount,
			page,
			pageSize,
			pageCount: Math.ceil(totalCount / pageSize),
		});
	} catch (error) {
		console.error("[API] Risk entities fetch error:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch risk entities",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
