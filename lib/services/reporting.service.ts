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
		totalOverrides: number;
		agreementRate: number;
	};
	overridesByReason: {
		context: number;
		hallucination: number;
		dataError: number;
	};
	promptPerformance: Record<
		string,
		{
			evaluations: number;
			overrides: number;
			agreementRate: number;
		}
	>;
	detailedOverrides: Array<{
		workflowId: number;
		applicantId: number;
		promptVersionId: string | null;
		overrideReason: string | null;
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
	const overrides = logs.filter(log => log.humanOverrideReason !== null);
	const totalOverrides = overrides.length;
	const agreementRate =
		totalEvaluations > 0
			? ((totalEvaluations - totalOverrides) / totalEvaluations) * 100
			: 100;

	// Breakdown by reason
	const overridesByReason = {
		context: 0,
		hallucination: 0,
		dataError: 0,
	};

	overrides.forEach(log => {
		if (log.humanOverrideReason === "CONTEXT") overridesByReason.context++;
		if (log.humanOverrideReason === "HALLUCINATION") overridesByReason.hallucination++;
		if (log.humanOverrideReason === "DATA_ERROR") overridesByReason.dataError++;
	});

	// Breakdown by Prompt Version
	const promptPerformance: AgreementReport["promptPerformance"] = {};

	logs.forEach(log => {
		const version = log.promptVersionId || "unknown";
		if (!promptPerformance[version]) {
			promptPerformance[version] = {
				evaluations: 0,
				overrides: 0,
				agreementRate: 0,
			};
		}
		promptPerformance[version].evaluations++;
		if (log.humanOverrideReason !== null) {
			promptPerformance[version].overrides++;
		}
	});

	// Calculate rates for each version
	Object.keys(promptPerformance).forEach(version => {
		const stats = promptPerformance[version];
		stats.agreementRate =
			stats.evaluations > 0
				? ((stats.evaluations - stats.overrides) / stats.evaluations) * 100
				: 100;
	});

	return {
		period: {
			start: startDate,
			end: endDate,
		},
		summary: {
			totalEvaluations,
			totalOverrides,
			agreementRate,
		},
		overridesByReason,
		promptPerformance,
		detailedOverrides: overrides.map(log => ({
			workflowId: log.workflowId,
			applicantId: log.applicantId,
			promptVersionId: log.promptVersionId,
			overrideReason: log.humanOverrideReason,
			confidenceScore: log.confidenceScore,
			createdAt: log.createdAt,
		})),
	};
}
