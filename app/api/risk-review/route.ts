import { auth } from "@clerk/nextjs/server";
import { and, eq, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { applicants, riskAssessments, workflows } from "@/db/schema";

/**
 * GET /api/risk-review
 *
 * Fetches all workflows awaiting risk review.
 * SOP-aligned: Stage 3 (procurement review) and Stage 4 (risk manager final review).
 * Uses the Reporter Agent output stored in risk_assessments.ai_analysis.
 */
export async function GET(_request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// Fetch workflows awaiting human review at Stage 3 or Stage 4
		const riskReviewWorkflows = await db
			.select({
				workflowId: workflows.id,
				applicantId: workflows.applicantId,
				stage: workflows.stage,
				status: workflows.status,
				startedAt: workflows.startedAt,
				metadata: workflows.metadata,
				companyName: applicants.companyName,
				contactName: applicants.contactName,
				itcScore: applicants.itcScore,
				riskLevel: applicants.riskLevel,
			})
			.from(workflows)
			.leftJoin(applicants, eq(workflows.applicantId, applicants.id))
			.where(
				and(
					eq(workflows.status, "awaiting_human"),
					or(eq(workflows.stage, 3), eq(workflows.stage, 4))
				)
			);

		// For each workflow, fetch the Reporter Agent output from risk_assessments
		const itemsWithAnalysis = await Promise.all(
			riskReviewWorkflows.map(async workflow => {
				// Fetch risk assessment (contains Reporter Agent / aggregated AI output)
				const assessments = await db
					.select()
					.from(riskAssessments)
					.where(eq(riskAssessments.applicantId, workflow.applicantId));

				const assessment = assessments[0];
				let aiAnalysis: Record<string, unknown> | null = null;

				if (assessment?.aiAnalysis) {
					try {
						aiAnalysis = JSON.parse(assessment.aiAnalysis);
					} catch {
						// Ignore parsing errors
					}
				}

				// Extract fields from Reporter Agent output
				const aggregatedScore = (aiAnalysis?.scores as Record<string, number>)
					?.aggregatedScore;
				const recommendation = aiAnalysis?.recommendation as string | undefined;
				const flags = aiAnalysis?.flags as string[] | undefined;
				const sanctionsLevel = aiAnalysis?.sanctionsLevel as string | undefined;
				const validationSummary = aiAnalysis?.validationSummary as
					| Record<string, unknown>
					| undefined;
				const riskDetails = aiAnalysis?.riskDetails as
					| Record<string, unknown>
					| undefined;
				const dataSource = aiAnalysis?.dataSource as string | undefined;

				// Build risk flags array from the flags field
				const riskFlags = (flags || []).map((flag: string, idx: number) => ({
					type: `flag_${idx}`,
					severity: "MEDIUM" as const,
					description: flag,
				}));

				// Map recommendation to stage-appropriate labels
				const stageLabel = workflow.stage === 3 ? "Procurement & AI" : "Risk Review";
				const reviewType = workflow.stage === 3 ? "procurement" : "general";

				return {
					id: workflow.workflowId,
					workflowId: workflow.workflowId,
					applicantId: workflow.applicantId,
					clientName: workflow.contactName || "Unknown",
					companyName: workflow.companyName || "Unknown Company",
					stage: workflow.stage || 3,
					stageName: stageLabel,
					reviewType,
					createdAt: workflow.startedAt
						? new Date(workflow.startedAt).toISOString()
						: new Date().toISOString(),
					// Reporter Agent / AI Analysis output
					aiTrustScore: aggregatedScore,
					riskFlags,
					itcScore: workflow.itcScore || undefined,
					riskLevel: workflow.riskLevel || assessment?.overallRisk || undefined,
					recommendation: recommendation || undefined,
					summary: aiAnalysis
						? `Aggregated AI score: ${aggregatedScore ?? "N/A"}%. Recommendation: ${recommendation || "Pending"}.`
						: undefined,
					reasoning: aiAnalysis
						? `Sanctions: ${sanctionsLevel || "Pending"}. Validation: ${validationSummary ? "Complete" : "Pending"}. Risk: ${riskDetails ? "Complete" : "Pending"}.`
						: undefined,
					// Data source indicator (mock vs live)
					dataSource: dataSource || undefined,
					// Full Reporter Agent payload for detail view
					reporterAgentOutput: aiAnalysis,
					// Assessment fields
					cashFlowConsistency: assessment?.cashFlowConsistency || undefined,
					dishonouredPayments: assessment?.dishonouredPayments || undefined,
					averageDailyBalance: assessment?.averageDailyBalance || undefined,
					accountMatchVerified: assessment?.accountMatchVerified || undefined,
					letterheadVerified: assessment?.letterheadVerified || undefined,
					overallRisk: assessment?.overallRisk || undefined,
					reviewedBy: assessment?.reviewedBy || undefined,
				};
			})
		);

		return NextResponse.json({
			items: itemsWithAnalysis,
			count: itemsWithAnalysis.length,
		});
	} catch (error) {
		console.error("[API] Risk review fetch error:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch risk review items",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
