import { and, desc, eq, gte, lte } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { aiAnalysisLogs } from "@/db/schema";

export interface AgreementReport {
	period: {
		start: Date;
		end: Date;
	};
	summary: {
		totalEvaluations: number;
		totalAdjudications: number;
		agreementRate: number;
	};
	adjudicationsByReason: {
		context: number;
		hallucination: number;
		dataError: number;
	};
	promptPerformance: Record<
		string,
		{
			evaluations: number;
			adjudications: number;
			agreementRate: number;
		}
	>;
	detailedAdjudications: Array<{
		workflowId: number;
		applicantId: number;
		promptVersionId: string | null;
		adjudicationReason: string | null;
		confidenceScore: number | null;
		createdAt: Date;
	}>;
}

/**
 * Generates a report on AI-Human agreement for the Reporter Agent
 * @param startDate Start of the reporting period
 * @param endDate End of the reporting period
 */
export async function generateWeeklyAgreementReport(
	startDate: Date,
	endDate: Date
): Promise<AgreementReport> {
	const db = getDatabaseClient();
	if (!db) {
		throw new Error("Database connection failed");
	}

	// Fetch all reporter logs for the period
	const logs = await db
		.select()
		.from(aiAnalysisLogs)
		.where(
			and(
				eq(aiAnalysisLogs.agentName, "reporter"),
				gte(aiAnalysisLogs.createdAt, startDate),
				lte(aiAnalysisLogs.createdAt, endDate)
			)
		)
		.orderBy(desc(aiAnalysisLogs.createdAt));

	const totalEvaluations = logs.length;
	const adjudications = logs.filter(log => log.humanAdjudicationReason !== null);
	const totalAdjudications = adjudications.length;
	const agreementRate =
		totalEvaluations > 0
			? ((totalEvaluations - totalAdjudications) / totalEvaluations) * 100
			: 100;

	// Breakdown by reason
	const adjudicationsByReason = {
		context: 0,
		hallucination: 0,
		dataError: 0,
	};

	adjudications.forEach(log => {
		if (log.humanAdjudicationReason === "CONTEXT") adjudicationsByReason.context++;
		if (log.humanAdjudicationReason === "HALLUCINATION")
			adjudicationsByReason.hallucination++;
		if (log.humanAdjudicationReason === "DATA_ERROR") adjudicationsByReason.dataError++;
	});

	// Breakdown by Prompt Version
	const promptPerformance: AgreementReport["promptPerformance"] = {};

	logs.forEach(log => {
		const version = log.promptVersionId || "unknown";
		if (!promptPerformance[version]) {
			promptPerformance[version] = {
				evaluations: 0,
				adjudications: 0,
				agreementRate: 0,
			};
		}
		promptPerformance[version].evaluations++;
		if (log.humanAdjudicationReason !== null) {
			promptPerformance[version].adjudications++;
		}
	});

	// Calculate rates for each version
	Object.keys(promptPerformance).forEach(version => {
		const stats = promptPerformance[version];
		stats.agreementRate =
			stats.evaluations > 0
				? ((stats.evaluations - stats.adjudications) / stats.evaluations) * 100
				: 100;
	});

	return {
		period: {
			start: startDate,
			end: endDate,
		},
		summary: {
			totalEvaluations,
			totalAdjudications,
			agreementRate,
		},
		adjudicationsByReason,
		promptPerformance,
		detailedAdjudications: adjudications.map(log => ({
			workflowId: log.workflowId,
			applicantId: log.applicantId,
			promptVersionId: log.promptVersionId,
			adjudicationReason: log.humanAdjudicationReason,
			confidenceScore: log.confidenceScore,
			createdAt: log.createdAt,
		})),
	};
}
