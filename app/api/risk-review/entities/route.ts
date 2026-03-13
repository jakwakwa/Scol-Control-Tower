import { auth } from "@clerk/nextjs/server";
import { count, desc, eq, notInArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { applicants, riskCheckResults, workflows } from "@/db/schema";

// --- Types ---

export interface RiskEntityRow {
	id: number;
	applicantId: number;
	companyName: string;
	procurementStatus: string;
	itcStatus: string;
	sanctionStatus: string;
	ficaStatus: string;
	procurementReviewState: string;
	itcReviewState: string;
	sanctionsReviewState: string;
	ficaReviewState: string;
	finalReportReady: boolean;
}

const TERMINAL_MACHINE_STATES = ["completed", "failed", "manual_required"];
const REVIEWED_STATES = ["acknowledged", "approved", "not_required"];

/**
 * GET /api/risk-review/entities?page=1&pageSize=10
 *
 * Returns paginated applicants with in-progress workflows and their
 * check statuses from the canonical risk_check_results table.
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

		const terminalStatuses = ["completed", "terminated", "failed"];

		const [totalResult] = await db
			.select({ value: count() })
			.from(workflows)
			.leftJoin(applicants, eq(workflows.applicantId, applicants.id))
			.where(notInArray(workflows.status, terminalStatuses));

		const totalCount = totalResult?.value ?? 0;

		const rows = await db
			.select({
				workflowId: workflows.id,
				applicantId: workflows.applicantId,
				companyName: applicants.companyName,
			})
			.from(workflows)
			.leftJoin(applicants, eq(workflows.applicantId, applicants.id))
			.where(notInArray(workflows.status, terminalStatuses))
			.orderBy(desc(workflows.id))
			.limit(pageSize)
			.offset(offset);

		const items: RiskEntityRow[] = await Promise.all(
			rows.map(async row => {
				const checks = await db
					.select({
						checkType: riskCheckResults.checkType,
						machineState: riskCheckResults.machineState,
						reviewState: riskCheckResults.reviewState,
					})
					.from(riskCheckResults)
					.where(eq(riskCheckResults.workflowId, row.workflowId));

				const checkMap = new Map(
					checks.map(c => [c.checkType, c])
				);

				const proc = checkMap.get("PROCUREMENT");
				const itc = checkMap.get("ITC");
				const sanc = checkMap.get("SANCTIONS");
				const fica = checkMap.get("FICA");

				const allTerminal =
					checks.length === 4 &&
					checks.every(c => TERMINAL_MACHINE_STATES.includes(c.machineState));
				const allReviewed =
					checks.length === 4 &&
					checks.every(c => REVIEWED_STATES.includes(c.reviewState));

				return {
					id: row.workflowId,
					applicantId: row.applicantId,
					companyName: row.companyName || "Unknown Company",
					procurementStatus: proc?.machineState ?? "pending",
					itcStatus: itc?.machineState ?? "pending",
					sanctionStatus: sanc?.machineState ?? "pending",
					ficaStatus: fica?.machineState ?? "pending",
					procurementReviewState: proc?.reviewState ?? "pending",
					itcReviewState: itc?.reviewState ?? "pending",
					sanctionsReviewState: sanc?.reviewState ?? "pending",
					ficaReviewState: fica?.reviewState ?? "pending",
					finalReportReady: allTerminal && allReviewed,
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
