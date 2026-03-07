import { RiUserAddLine } from "@remixicon/react";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { getDatabaseClient } from "@/app/utils";
import { DashboardLayout, DashboardSection } from "@/components/dashboard";
import {
	type ApplicantRow,
	ApplicantsTable,
} from "@/components/dashboard/applicants-table";
import { Button } from "@/components/ui/button";
import { applicants, quotes, workflows } from "@/db/schema";
import { cn } from "@/lib/utils";

const statusConfig = {
	new: { label: "New", color: "bg-white/10 text-slate-400/80" },
	in_progress: { label: "In Progress", color: "bg-blue-950 text-blue-300" },
	approved: { label: "Approved", color: "bg-emerald-500/5 text-emerald-400" },
	rejected: { label: "Rejected", color: "bg-red-500/5 text-red-400" },
} as const;

export default async function ApplicantsPage() {
	const db = getDatabaseClient();
	let allApplicants: ApplicantRow[] = [];

	if (db) {
		try {
			const applicantRows = await db
				.select()
				.from(applicants)
				.orderBy(desc(applicants.createdAt));

			const workflowRows = await db.select().from(workflows);
			const quoteRows = await db.select().from(quotes);

			const workflowsByApplicant = new Map<number, typeof workflows.$inferSelect>();
			for (const workflow of workflowRows.sort((a, b) => {
				const aTime = new Date(a.startedAt || 0).getTime();
				const bTime = new Date(b.startedAt || 0).getTime();
				return bTime - aTime;
			})) {
				if (!workflowsByApplicant.has(workflow.applicantId)) {
					workflowsByApplicant.set(workflow.applicantId, workflow);
				}
			}

			const quotesByWorkflow = new Map<number, typeof quotes.$inferSelect>();
			for (const quote of quoteRows.sort((a, b) => {
				const aTime = new Date(a.createdAt || 0).getTime();
				const bTime = new Date(b.createdAt || 0).getTime();
				return bTime - aTime;
			})) {
				if (!quotesByWorkflow.has(quote.workflowId)) {
					quotesByWorkflow.set(quote.workflowId, quote);
				}
			}

			allApplicants = applicantRows.map(applicant => {
				const workflow = workflowsByApplicant.get(applicant.id);
				const quote = workflow ? quotesByWorkflow.get(workflow.id) : null;
				return {
					id: applicant.id,
					companyName: applicant.companyName,
					contactName: applicant.contactName,
					email: applicant.email,
					status: applicant.status,
					industry: applicant.industry || "",
					employeeCount: applicant.employeeCount || 0,
					createdAt: applicant.createdAt,
					workflowId: workflow?.id ?? null,
					workflowStage: workflow?.stage ?? null,
					hasQuote: !!quote,
				};
			});
		} catch (error) {
			console.error("Failed to fetch applicants:", error);
		}
	}

	return (
		<DashboardLayout
			title="Applicants"
			description="Manage your applicants and their onboarding"
			actions={
				<Link href="/dashboard/applicants/new">
					<Button variant="secondary">
						<RiUserAddLine />
						Onboard Applicant
					</Button>
				</Link>
			}>
			{/* Pipeline Stats */}
			<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-8">
				{Object.entries(statusConfig).map(([status, config]) => {
					const count = allApplicants.filter(l => l.status === status).length;
					return (
						<div
							key={status}
							className={cn(
								`rounded-xl  shadow-[0_5px_10px_0_rgba(0,0,0,.15)] bg-${config.color} border rounded-br-2xl  
								after:rounded-tl-lg before:rounded-tl-lg 
								after:rounded-tr-lg before:rounded-tr-lg 
								border-sidebar-border p-4 text-center`,
								`transition-colors ${config.color}`
							)}>
							<p className="text-2xl font-bold">{count}</p>
							<p className="text-xs text-muted-foreground">{config.label}</p>
						</div>
					);
				})}
			</div>

			{/* Applicants Table */}
			<DashboardSection title="All Applicants">
				<ApplicantsTable applicants={allApplicants} />
			</DashboardSection>
		</DashboardLayout>
	);
}
