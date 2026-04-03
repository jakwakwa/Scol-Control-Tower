import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, gte } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { applicants, riskAssessments, workflowEvents, workflows } from "@/db/schema";

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

		const url = new URL(_request.url);
		const showHistory = url.searchParams.get("showHistory") === "true";

		const baseConditions = showHistory
			? gte(workflows.stage, 3)
			: and(eq(workflows.status, "awaiting_human"), eq(workflows.stage, 4));

		// Fetch workflows awaiting human review at Stage 3 or Stage 4 (or all if history)
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
				itcStatus: applicants.itcStatus,
				riskLevel: applicants.riskLevel,
				decisionType: workflows.decisionType,
				targetResource: workflows.targetResource,
				reviewTypeDb: workflows.reviewType,
			})
			.from(workflows)
			.leftJoin(applicants, eq(workflows.applicantId, applicants.id))
			.where(baseConditions);

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

				// Resolve procurement execution state from workflow events
				const events = await db
					.select({
						eventType: workflowEvents.eventType,
						payload: workflowEvents.payload,
						timestamp: workflowEvents.timestamp,
					})
					.from(workflowEvents)
					.where(eq(workflowEvents.workflowId, workflow.workflowId))
					.orderBy(desc(workflowEvents.timestamp));

				let procurementScore: number | undefined;
				let procurementRecommendedAction: string | undefined;
				let procurementCheckFailed = false;
				let procurementFailureReason: string | undefined;
				let procurementFailureSource: string | undefined;
				let procurementFailureGuidance: string | undefined;
				let failedAreas: string[] = [];
				let anomalies: string[] = [];

				for (const workflowEvent of events) {
					let payload: Record<string, unknown> | null = null;
					if (workflowEvent.payload) {
						try {
							payload = JSON.parse(workflowEvent.payload) as Record<string, unknown>;
						} catch {
							// Ignore malformed event payloads
						}
					}

					if (!payload) continue;

					if (
						workflowEvent.eventType === "procurement_check_completed" &&
						procurementScore === undefined
					) {
						if (typeof payload.riskScore === "number") {
							procurementScore = payload.riskScore;
						}
						if (Array.isArray(payload.anomalies)) {
							anomalies = payload.anomalies.filter(
								(anomaly): anomaly is string => typeof anomaly === "string"
							);
						}
						if (typeof payload.recommendedAction === "string") {
							procurementRecommendedAction = payload.recommendedAction;
						}
					}

					if (
						!procurementCheckFailed &&
						workflowEvent.eventType === "error" &&
						payload.context === "procurement_check_failed"
					) {
						procurementCheckFailed = true;
						procurementFailureReason =
							typeof payload.error === "string"
								? payload.error
								: "Automated ProcureCheck execution failed";
						procurementFailureSource =
							typeof payload.source === "string" ? payload.source : "procurecheck";
						procurementFailureGuidance =
							typeof payload.guidance === "string"
								? payload.guidance
								: "Risk Manager must perform a full manual procurement check.";
						if (Array.isArray(payload.failedAreas)) {
							failedAreas = payload.failedAreas.filter(
								(area): area is string => typeof area === "string"
							);
						}
					}

					if (procurementCheckFailed && procurementScore !== undefined) {
						break;
					}
				}

				if (procurementCheckFailed) {
					const fallbackAnomalies =
						failedAreas.length > 0
							? failedAreas.map(area => `${area} failed to run automatically`)
							: [
									"Automated ProcureCheck execution failed - manual human procurement check required",
								];
					anomalies = Array.from(new Set([...anomalies, ...fallbackAnomalies]));
				}

				const hasAnomalies = anomalies.length > 0;

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

				const reviewType = "general";
				const stageLabel = "Risk Review";
				const decisionType = workflow.decisionType || "risk_review";
				const targetResource = workflow.targetResource || "/api/risk-decision";
				const agentSummary =
					(aiAnalysis?.agents as Record<string, Record<string, unknown>>) || {};
				const validationAgentSummary = agentSummary.validation || {};
				const ficaComparisonSummary = validationAgentSummary.ficaComparisonSummary as
					| {
							totalMismatches?: number;
							criticalMismatches?: number;
							documentsWithMismatches?: number;
							keyDiscrepancies?: string[];
					  }
					| undefined;
				const checkStatuses = {
					procurement: procurementCheckFailed ? "manual_required" : "available",
					validation:
						(agentSummary.validation?.dataSource as string) ===
						"Validation Error - Manual Escalation"
							? "manual_required"
							: "available",
					risk:
						(agentSummary.risk?.dataSource as string) === "Risk Error - Manual Escalation"
							? "manual_required"
							: "available",
					sanctions: (agentSummary.sanctions?.dataSource as string)?.includes("Manual")
						? "manual_required"
						: "available",
					itc:
						(workflow.itcStatus || "").toString().toUpperCase() === "MANUAL_REVIEW"
							? "manual_required"
							: "available",
				};

				return {
					id: workflow.workflowId,
					workflowId: workflow.workflowId,
					applicantId: workflow.applicantId,
					clientName: workflow.contactName || "Unknown",
					companyName: workflow.companyName || "Unknown Company",
					stage: workflow.stage || 3,
					stageName: stageLabel,
					reviewType,
					decisionType,
					targetResource,
					checkStatuses,
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
						? `Aggregated AI score: ${aggregatedScore ?? "N/A"}%. Recommendation: ${recommendation || "Pending"}.${procurementCheckFailed ? " Automated procurement execution failed; full manual procurement check required." : ""}`
						: procurementCheckFailed
							? "Automated procurement execution failed. Full manual procurement check required."
							: undefined,
					reasoning: aiAnalysis
						? `Sanctions: ${sanctionsLevel || "Pending"}. Validation: ${validationSummary ? "Complete" : "Pending"}. Risk: ${riskDetails ? "Complete" : "Pending"}.`
						: undefined,
					// Data source indicator (mock vs live)
					dataSource: dataSource || undefined,
					// Full Reporter Agent payload for detail view
					reporterAgentOutput: aiAnalysis,
					ficaComparison: ficaComparisonSummary
						? {
								totalMismatches: ficaComparisonSummary.totalMismatches || 0,
								criticalMismatches: ficaComparisonSummary.criticalMismatches || 0,
								documentsWithMismatches:
									ficaComparisonSummary.documentsWithMismatches || 0,
								keyDiscrepancies: ficaComparisonSummary.keyDiscrepancies || [],
							}
						: undefined,
					// Assessment fields
					cashFlowConsistency: assessment?.cashFlowConsistency || undefined,
					dishonouredPayments: assessment?.dishonouredPayments || undefined,
					averageDailyBalance: assessment?.averageDailyBalance || undefined,
					accountMatchVerified: assessment?.accountMatchVerified || undefined,
					letterheadVerified: assessment?.letterheadVerified || undefined,
					overallRisk: assessment?.overallRisk || undefined,
					reviewedBy: assessment?.reviewedBy || undefined,
					// Procurement review context (manual fallback support)
					procurementScore,
					hasAnomalies,
					anomalies: hasAnomalies ? anomalies : undefined,
					procurementRecommendedAction,
					procurementCheckFailed,
					procurementFailureReason,
					procurementFailureSource,
					procurementFailureGuidance,
					// Track if decisions have already been made
					procurementDecisionMade: events.some(
						e => e.eventType === "procurement_decision"
					),
					riskManagerDecisionMade: events.some(e => e.eventType === "human_override"),
				};
			})
		);

		let filteredItems = itemsWithAnalysis;
		if (!showHistory) {
			filteredItems = itemsWithAnalysis.filter(item => {
				if (item.stage === 4 && item.riskManagerDecisionMade) return false;
				return true;
			});
		}

		return NextResponse.json({
			items: filteredItems,
			count: filteredItems.length,
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
