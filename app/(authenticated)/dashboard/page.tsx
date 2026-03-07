import {
	RiCheckboxCircleLine,
	RiFileTextLine,
	RiShieldCheckLine,
	RiTimeLine,
	RiUserAddLine,
} from "@remixicon/react";
import { count, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { getDatabaseClient } from "@/app/utils";
import { DashboardGrid, DashboardLayout, StatsCard } from "@/components/dashboard";
import type { WorkflowNotification } from "@/components/dashboard/notifications-panel";
import {
	PipelineView,
	type PipelineWorkflow,
} from "@/components/dashboard/pipeline-view";
import { Button } from "@/components/ui/button";
import { applicants, notifications, quotes, workflows } from "@/db/schema";

export default async function DashboardPage() {
	const db = getDatabaseClient();
	let activeWorkflows: PipelineWorkflow[] = [];

	let workflowsCount = 0;

	if (db) {
		try {
			// Fetch Workflows with applicant data
			const result = await db
				.select({
					id: workflows.id,
					applicantId: workflows.applicantId,
					stage: workflows.stage, // Use workflow stage number for pipeline view
					status: workflows.status,
					startedAt: workflows.startedAt,
					metadata: workflows.metadata,
					clientName: applicants.companyName,
					registrationNumber: applicants.registrationNumber,
					mandateType: applicants.mandateType,
					riskLevel: applicants.riskLevel,
				})
				.from(workflows)
				.leftJoin(applicants, eq(workflows.applicantId, applicants.id))
				.orderBy(desc(workflows.startedAt))
				.limit(20);

			// Fetch quotes to check which workflows have quotes
			const quoteRows = await db.select({ workflowId: quotes.workflowId }).from(quotes);
			const workflowsWithQuotes = new Set(quoteRows.map(q => q.workflowId));

			activeWorkflows = result.map(w => ({
				id: w.id,
				applicantId: w.applicantId,
				stage: String(w.stage || 1),
				status: w.status || "pending",
				clientName: w.clientName || "Unknown",
				startedAt: w.startedAt?.toISOString(),
				hasQuote: workflowsWithQuotes.has(w.id),
				payload: {
					registrationNumber: w.registrationNumber || undefined,
					mandateType: w.mandateType || undefined,
					riskLevel: w.riskLevel || undefined,
					...(w.metadata
						? (() => {
								try {
									return JSON.parse(w.metadata);
								} catch {
									return {};
								}
							})()
						: {}),
				},
			}));

			const wfCountResult = await db.select({ count: count() }).from(workflows);
			workflowsCount = wfCountResult[0]?.count || 0;
		} catch (error) {
			console.error("Failed to fetch dashboard data:", error);
		}
	}

	// Fetch notifications
	let workflowNotifications: WorkflowNotification[] = [];
	if (db) {
		try {
			// Change import of notifications at top first!
			// Dynamic import or separate fetch call not possible inside ReplaceFileContent easily without adding imports
			// I will fetch notifications here assuming update of imports below

			const notificationsResult = await db
				.select({
					id: notifications.id,
					workflowId: notifications.workflowId,
					applicantId: notifications.applicantId,
					type: notifications.type,
					message: notifications.message,
					read: notifications.read,
					actionable: notifications.actionable,
					createdAt: notifications.createdAt,
					clientName: applicants.companyName,
				})
				.from(notifications)
				.leftJoin(applicants, eq(notifications.applicantId, applicants.id))
				.orderBy(desc(notifications.createdAt))
				.limit(20);

			workflowNotifications = notificationsResult.map(n => ({
				id: n.id.toString(),
				workflowId: n.workflowId || 0,
				applicantId: n.applicantId || 0,
				clientName: n.clientName || "Unknown",
				type: (n.type as WorkflowNotification["type"]) || "awaiting",
				message: n.message,
				timestamp: n.createdAt || new Date(),
				read: n.read,
				actionable: n.actionable,
			}));
		} catch (error) {
			console.error("Failed to fetch notifications:", error);
		}
	}

	// ... Imports
	return (
		<DashboardLayout
			title="Onboarding Pipeline"
			description="Track and manage client applications through the onboarding process"
			actions={
				<Link href="/dashboard/applicants/new">
					<Button variant="secondary">
						<RiUserAddLine color="var(--color-teal-200)" />
						New Applicant
					</Button>
				</Link>
			}
			notifications={workflowNotifications}>
			{/* Stats Grid - StratCol Style */}
			<DashboardGrid columns={4} className="mb-8">
				<StatsCard
					title="Total Applications"
					value={workflowsCount}
					change={{ value: 12, trend: "up" }}
					icon={RiFileTextLine}
					iconColor="blue"
				/>
				<StatsCard
					title="In Progress"
					value={
						activeWorkflows.filter(w => !["won", "lost", "completed"].includes(w.stage))
							.length
					}
					change={{ value: 5, trend: "up" }}
					icon={RiTimeLine}
					iconColor="amber" // Used cyan in screenshot, mapping to StratCol palette
				/>
				<StatsCard
					title="Completed"
					value={
						activeWorkflows.filter(w => ["won", "activation"].includes(w.stage)).length
					}
					change={{ value: 18, trend: "up" }}
					icon={RiCheckboxCircleLine}
					iconColor="green"
				/>
				<StatsCard
					title="High Risk"
					value={1}
					change={{ value: 8, trend: "down" }}
					icon={RiShieldCheckLine}
					iconColor="red"
				/>
			</DashboardGrid>

			{/* Pipeline View - Full Width */}
			<div className="w-full">
				<PipelineView workflows={activeWorkflows} />
			</div>
		</DashboardLayout>
	);
}
