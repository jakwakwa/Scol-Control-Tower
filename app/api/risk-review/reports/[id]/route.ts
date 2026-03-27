import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import {
	aiAnalysisLogs,
	applicants,
	riskAssessments,
	riskCheckResults,
	workflows,
} from "@/db/schema";
import { buildReportData } from "@/lib/risk-review/build-report-data";
import { FINANCIAL_RISK_AGENT_NAME } from "@/lib/services/agents/financial-risk.agent";

/**
 * GET /api/risk-review/reports/[id]
 *
 * Returns RiskReviewData for the given applicant ID.
 * Used by the risk review report page to render RiskReviewDetail.
 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const resolvedParams = await params;
		const applicantId = parseInt(resolvedParams.id, 10);

		if (Number.isNaN(applicantId) || applicantId <= 0) {
			return NextResponse.json({ error: "Invalid applicant ID" }, { status: 400 });
		}

		const [applicantRows, workflowRows] = await Promise.all([
			db.select().from(applicants).where(eq(applicants.id, applicantId)).limit(1),
			db
				.select({
					id: workflows.id,
					applicantId: workflows.applicantId,
					startedAt: workflows.startedAt,
				})
				.from(workflows)
				.where(eq(workflows.applicantId, applicantId))
				.orderBy(desc(workflows.startedAt))
				.limit(1),
		]);

		const applicant = applicantRows[0] ?? null;
		const workflow = workflowRows[0] ?? null;

		if (!applicant) {
			return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
		}

		const riskChecks = workflow
			? await db
					.select()
					.from(riskCheckResults)
					.where(eq(riskCheckResults.workflowId, workflow.id))
			: [];

		const financialRiskRows = workflow
			? await db
					.select({ rawOutput: aiAnalysisLogs.rawOutput })
					.from(aiAnalysisLogs)
					.where(
						and(
							eq(aiAnalysisLogs.workflowId, workflow.id),
							eq(aiAnalysisLogs.agentName, FINANCIAL_RISK_AGENT_NAME)
						)
					)
					.orderBy(desc(aiAnalysisLogs.createdAt))
					.limit(1)
			: [];
		const riskAssessmentRows = workflow
			? await db
					.select({ aiAnalysis: riskAssessments.aiAnalysis })
					.from(riskAssessments)
					.where(eq(riskAssessments.applicantId, applicant.id))
					.orderBy(desc(riskAssessments.createdAt))
					.limit(1)
			: [];

		const reportData = buildReportData(
			applicant,
			workflow,
			riskChecks,
			financialRiskRows[0]?.rawOutput,
			riskAssessmentRows[0]?.aiAnalysis
		);

		return NextResponse.json(reportData);
	} catch (error) {
		console.error("[API] Risk review report fetch error:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch report",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
