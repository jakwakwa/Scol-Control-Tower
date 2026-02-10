import {
	RiDownloadLine,
	RiFilterLine,
	RiFlowChart,
	RiUserAddLine,
} from "@remixicon/react";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { getDatabaseClient } from "@/app/utils";
import {
	DashboardGrid,
	DashboardLayout,
	DashboardSection,
	STAGE_NAMES,
	StatsCard,
	WorkflowTable,
} from "@/components/dashboard";
import type { WorkflowRow } from "@/components/dashboard/workflow-table";
import { Button } from "@/components/ui/button";
import { applicants, quotes, workflows } from "@/db/schema";
// Type import needed for WorkflowTable props
// ensuring we match the expected shape

export default async function WorkflowsPage() {
	const db = getDatabaseClient();
	let allWorkflows: WorkflowRow[] = [];
	/** V2 Workflow 6-Stage Stats */
	let stageStats = {
		entry_quote: 0,
		quote_signing: 0,
		mandate_processing: 0,
		ai_analysis: 0,
		contract_forms: 0,
		completion: 0,
	};

	if (db) {
		try {
			// Fetch all workflows with applicant data
			const workflowRows = await db
				.select({
					id: workflows.id,
					applicantId: workflows.applicantId,
					stage: workflows.stage,
					stageName: workflows.stageName,
					status: workflows.status,
					startedAt: workflows.startedAt,
					metadata: workflows.metadata,
					currentAgent: workflows.currentAgent,
					clientName: applicants.companyName,
				})
				.from(workflows)
				.leftJoin(applicants, eq(workflows.applicantId, applicants.id))
				.orderBy(desc(workflows.startedAt));

			const quoteRows = await db.select().from(quotes);
			const quotesByWorkflow = new Map<number, typeof quotes.$inferSelect>();

			for (const quote of quoteRows) {
				if (!quotesByWorkflow.has(quote.workflowId)) {
					quotesByWorkflow.set(quote.workflowId, quote);
				}
			}

			allWorkflows = workflowRows.map(w => ({
				...w,
				stageName: w.stageName || STAGE_NAMES[w.stage] || "Unknown",
				// Parse metadata if it exists, otherwise use empty object
				payload: w.metadata ? JSON.parse(w.metadata) : {},
				hasQuote: quotesByWorkflow.has(w.id),
			}));

			// Calculate stats for V2 6-stage workflow
			stageStats = {
				entry_quote: allWorkflows.filter(w => w.stage === 1).length,
				quote_signing: allWorkflows.filter(w => w.stage === 2).length,
				mandate_processing: allWorkflows.filter(w => w.stage === 3).length,
				ai_analysis: allWorkflows.filter(w => w.stage === 4).length,
				contract_forms: allWorkflows.filter(w => w.stage === 5).length,
				completion: allWorkflows.filter(w => w.stage === 6).length,
			};
		} catch (error) {
			console.error("Failed to fetch workflows:", error);
		}
	}

	return (
		<DashboardLayout
			title="Workflows"
			description="All onboarding workflows across all stages"
			actions={
				<div className="flex items-center gap-3">
					<Link href="/dashboard/applicants/new">
						<Button variant="secondary">
							<RiUserAddLine className="mr-2 h-4 w-4" />
							New Applicant
						</Button>
					</Link>
					<Button variant="outline" className="gap-2">
						<RiFilterLine className="h-4 w-4" />
						Filter
					</Button>
					<Button variant="outline" className="gap-2">
						<RiDownloadLine className="h-4 w-4" />
						Export
					</Button>
				</div>
			}>
			{/* Stage distribution - V2 6-stage workflow */}
			<DashboardGrid columns={6} className="mb-8">
				<StatsCard
					title="Lead Capture"
					value={stageStats.entry_quote}
					icon={RiFlowChart}
					iconColor="blue"
				/>
				<StatsCard
					title="Facility & Quote"
					value={stageStats.quote_signing}
					icon={RiFlowChart}
					iconColor="blue"
				/>
				<StatsCard
					title="Procurement & AI"
					value={stageStats.mandate_processing}
					icon={RiFlowChart}
					iconColor="purple"
				/>
				<StatsCard
					title="Risk Review"
					value={stageStats.ai_analysis}
					icon={RiFlowChart}
					iconColor="amber"
				/>
				<StatsCard
					title="Contract"
					value={stageStats.contract_forms}
					icon={RiFlowChart}
					iconColor="red"
				/>
				<StatsCard
					title="Final Approval"
					value={stageStats.completion}
					icon={RiFlowChart}
					iconColor="green"
				/>
			</DashboardGrid>

			{/* Full workflows table */}
			<DashboardSection title="All Workflows">
				<WorkflowTable workflows={allWorkflows} />
			</DashboardSection>
		</DashboardLayout>
	);
}
