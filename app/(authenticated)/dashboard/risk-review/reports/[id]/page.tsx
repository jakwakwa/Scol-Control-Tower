import { RiArrowLeftLine } from "@remixicon/react";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDatabaseClient } from "@/app/utils";
import { DashboardLayout } from "@/components/dashboard";
import { RiskReviewDetail } from "@/components/dashboard/risk-review";
import { Button } from "@/components/ui/button";
import { applicants, riskAssessments, workflows } from "@/db/schema";
import { buildReportData } from "@/lib/risk-review/build-report-data";

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

	const [applicantRows, assessmentRows, workflowRows] = await Promise.all([
		db.select().from(applicants).where(eq(applicants.id, applicantId)).limit(1),
		db
			.select()
			.from(riskAssessments)
			.where(eq(riskAssessments.applicantId, applicantId))
			.limit(1),
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
	const riskAssessment = assessmentRows[0] ?? null;
	const workflow = workflowRows[0] ?? null;

	if (!applicant) {
		notFound();
	}

	const reportData = buildReportData(applicant, riskAssessment, workflow);

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
