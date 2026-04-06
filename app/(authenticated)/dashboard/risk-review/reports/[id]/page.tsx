import { RiArrowLeftLine } from "@remixicon/react";
import { and, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDatabaseClient } from "@/app/utils";
import { DashboardLayout } from "@/components/dashboard";
import { RiskReviewDetail } from "@/components/dashboard/risk-review";
import { Button } from "@/components/ui/button";
import {
	aiAnalysisLogs,
	applicants,
	documents,
	documentUploads,
	riskAssessments,
	riskCheckResults,
	workflows,
} from "@/db/schema";
import { buildReportData } from "@/lib/risk-review/build-report-data";
import { FINANCIAL_RISK_AGENT_NAME } from "@/lib/services/agents/financial-risk.agent";

export default async function RiskReviewReportPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const applicantId = parseInt(id, 10);

	if (Number.isNaN(applicantId) || applicantId <= 0) {
		notFound();
	}

	const db = getDatabaseClient();
	if (!db) {
		throw new Error("Database connection failed");
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
		notFound();
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
				.select({
					overallScore: riskAssessments.overallScore,
					overallStatus: riskAssessments.overallStatus,
					aiAnalysis: riskAssessments.aiAnalysis,
				})
				.from(riskAssessments)
				.where(eq(riskAssessments.applicantId, applicant.id))
				.orderBy(desc(riskAssessments.createdAt))
				.limit(1)
		: [];

	const idDocTypes = ["ID_DOCUMENT", "PROPRIETOR_ID", "DIRECTOR_ID", "FICA_ID"] as const;

	const [verifiedDocRows, verifiedUploadRows] = await Promise.all([
		db
			.select({ processingResult: documents.processingResult })
			.from(documents)
			.where(and(eq(documents.applicantId, applicantId), inArray(documents.type, idDocTypes)))
			.orderBy(desc(documents.verifiedAt))
			.limit(1),
		workflow
			? db
					.select({ metadata: documentUploads.metadata })
					.from(documentUploads)
					.where(
						and(
							eq(documentUploads.workflowId, workflow.id),
							inArray(documentUploads.documentType, idDocTypes)
						)
					)
					.orderBy(desc(documentUploads.verifiedAt))
					.limit(1)
			: Promise.resolve([] as Array<{ metadata: string | null }>),
	]);

	function extractDocAiResult(raw: string | null): Array<{ type: string; value: string }> | undefined {
		if (!raw) return undefined;
		try {
			const parsed = JSON.parse(raw) as Record<string, unknown>;
			if (Array.isArray(parsed?.documentAiResult)) {
				return parsed.documentAiResult as Array<{ type: string; value: string }>;
			}
		} catch {}
		return undefined;
	}

	const documentAiResult =
		extractDocAiResult(verifiedDocRows[0]?.processingResult ?? null) ??
		extractDocAiResult(verifiedUploadRows[0]?.metadata ?? null);

	const reportData = buildReportData(
		applicant,
		workflow,
		riskChecks,
		financialRiskRows[0]?.rawOutput,
		riskAssessmentRows[0],
		documentAiResult
	);

	return (
		<DashboardLayout
			title="Risk Report"
			description={`Report for ${applicant.companyName}`}
			actions={
				<Link href="/dashboard/risk-review">
					<Button variant="outline" className="gap-2">
						<RiArrowLeftLine className="h-4 w-4" />
						Back to Risk Review
					</Button>
				</Link>
			}>
			<RiskReviewDetail data={reportData} />
		</DashboardLayout>
	);
}
