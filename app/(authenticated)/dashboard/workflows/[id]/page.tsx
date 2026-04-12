import {
	RiArrowLeftLine,
	RiBuildingLine,
	RiCheckLine,
	RiErrorWarningLine,
	RiFileTextLine,
	RiMailLine,
	RiPhoneLine,
	RiRobot2Line,
	RiTimeLine,
	RiUserLine,
} from "@remixicon/react";
import { formatDistanceToNow } from "date-fns";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDatabaseClient } from "@/app/utils";
import {
	DashboardLayout,
	DashboardSection,
	WorkflowActivityTimeline,
} from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { applicants, quotes, workflowEvents, workflows } from "@/db/schema";
import { mapWorkflowEventRowsToTimelineItems } from "@/lib/dashboard/workflow-timeline-mapper";
import { cn } from "@/lib/utils";

// --- Types ---
type WorkflowStatus =
	| "pending"
	| "in_progress"
	| "awaiting_human"
	| "completed"
	| "failed"
	| "timeout";

// --- Status Config ---
const statusConfig: Record<
	WorkflowStatus,
	{ label: string; color: string; icon: typeof RiTimeLine }
> = {
	pending: {
		label: "Pending",
		color: "bg-muted text-muted-foreground border-border",
		icon: RiTimeLine,
	},
	in_progress: {
		label: "Processing",
		color: "bg-blue-950 text-blue-300 border-blue-900",
		icon: RiTimeLine,
	},
	awaiting_human: {
		label: "Awaiting Input",
		color: "bg-warning/50 text-warning-foreground border-warning",
		icon: RiUserLine,
	},
	completed: {
		label: "Completed",
		color: "bg-emerald-500/10 text-emerald-500 border-emerald-200/70",
		icon: RiCheckLine,
	},
	failed: {
		label: "Failed",
		color: "bg-red-500/10 text-red-500 border-red-500/20",
		icon: RiErrorWarningLine,
	},
	timeout: {
		label: "Timeout",
		color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
		icon: RiTimeLine,
	},
};

function StatusBadge({ status }: { status: string }) {
	const config = statusConfig[status as WorkflowStatus] || statusConfig.pending;
	const Icon = config.icon;
	return (
		<Badge variant="outline" className={cn("gap-1.5 pl-1.5 pr-2.5 py-1", config.color)}>
			<Icon size={14} />
			{config.label}
		</Badge>
	);
}

function StageBadge({ stage, name }: { stage: number; name: string }) {
	const formattedName = name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
	return (
		<Badge
			variant="secondary"
			className="bg-muted hover:bg-muted/80 text-muted-foreground border-border">
			Stage {stage}: {formattedName}
		</Badge>
	);
}

// --- Main Page Component ---

export default async function WorkflowDetailsPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const workflowId = parseInt(id, 10);

	if (Number.isNaN(workflowId)) {
		notFound();
	}

	const db = getDatabaseClient();
	if (!db) {
		throw new Error("Database connection failed");
	}

	// 1. Fetch Workflow & Applicant
	const workflowResults = await db
		.select({
			workflow: workflows,
			applicant: applicants,
		})
		.from(workflows)
		.leftJoin(applicants, eq(workflows.applicantId, applicants.id))
		.where(eq(workflows.id, workflowId))
		.limit(1);

	if (workflowResults.length === 0) {
		notFound();
	}

	const result = workflowResults[0];
	if (!result) {
		notFound();
	}
	const { workflow, applicant } = result;

	// 2. Fetch Events (Audit Log)
	const events = await db
		.select()
		.from(workflowEvents)
		.where(eq(workflowEvents.workflowId, workflowId))
		.orderBy(desc(workflowEvents.timestamp));

	// 3. Fetch Quotes
	const workflowQuotes = await db
		.select()
		.from(quotes)
		.where(eq(quotes.workflowId, workflowId))
		.orderBy(desc(quotes.createdAt));

	const latestQuote = workflowQuotes[0];

	const timelineItems = mapWorkflowEventRowsToTimelineItems(events);

	// Helper for stage badge
	const stageName = applicant?.status ? applicant.status.replace("_", " ") : "Unknown";
	const stageNumber = workflow.stage || 0;

	return (
		<DashboardLayout
			actions={
				<>
					<div className="flex justify-start items-center gap-4 w-full">
						<Link href="/dashboard/workflows">
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 -ml-2 text-muted-foreground hover:text-foreground">
								<RiArrowLeftLine size={20} />
							</Button>
						</Link>
						<div className="flex flex-col gap-1">
							<h2 className="flex items-center text-lg font-bold uppercase text-foreground/70 gap-3">
								{applicant?.companyName || "Unknown Client"}
								<span className="text-foreground font-light text-xs">
									workflow no. {workflow.id}
								</span>
							</h2>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<StatusBadge status={workflow.status || "unknown"} />
						<StageBadge stage={stageNumber} name={stageName} />
					</div>
				</>
			}>
			<div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
				{/* Left Column: Timeline & Main Content */}
				<div className="lg:col-span-3 space-y-8">
					{/* Quote Card (if exists) */}
					{latestQuote && (
						<Card className="bg-card border-border">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-lg">
									<RiFileTextLine className="text-emerald-500" size={20} />
									Generated Quote
								</CardTitle>
								<CardDescription>
									Created {formatDistanceToNow(latestQuote.createdAt)} ago by{" "}
									{latestQuote.generatedBy === "gemini"
										? "Google Gemini"
										: latestQuote.generatedBy}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="flex items-end justify-between p-4 rounded-xl bg-muted/50">
									<div>
										<p className="text-sm text-muted-foreground mb-1">Total Amount</p>
										<p className="text-3xl font-bold text-foreground">
											${(latestQuote.amount / 100).toLocaleString()}
										</p>
									</div>
									<Badge
										variant="outline"
										className={cn(
											latestQuote.status === "approved"
												? "text-emerald-500 bg-emerald-500 border-emerald-200/70"
												: "text-warning-foreground border-warning"
										)}>
										{latestQuote.status.toUpperCase()}
									</Badge>
								</div>

								{latestQuote.rationale && (
									<div className="mt-4 space-y-2">
										<p className="text-sm font-medium text-foreground">AI Rationale</p>
										<p className="text-sm text-muted-foreground leading-relaxed">
											{latestQuote.rationale}
										</p>
									</div>
								)}

								<div className="mt-4 pt-4 border-t border-border flex gap-4 text-xs text-muted-foreground">
									<div>
										<span className="block text-foreground/70">Base Fee</span>
										<span>{(latestQuote.baseFeePercent / 100).toFixed(2)}%</span>
									</div>
									<div>
										<span className="block text-foreground/70">Adjusted Fee</span>
										<span>
											{((latestQuote.adjustedFeePercent ?? 0) / 100).toFixed(2)}%
										</span>
									</div>
									<div>
										<span className="block text-foreground/70">Terms</span>
										{/* <span>{latestQuote.terms || "-"}</span> */}
									</div>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Timeline */}
					<DashboardSection title="Activity Timeline">
						<WorkflowActivityTimeline
							items={timelineItems}
							workflowStartedAt={workflow.startedAt ?? null}
						/>
					</DashboardSection>
				</div>

				{/* Right Column: Info Cards */}
				<div className="space-y-6">
					{/* Client Info */}
					<Card className="bg-card border-border">
						<CardHeader className="pb-3">
							<CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
								Client Details
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{applicant ? (
								<>
									<div className="flex items-start gap-3">
										<div className="p-2 rounded-md bg-muted text-muted-foreground">
											<RiBuildingLine size={18} />
										</div>
										<div>
											<p className="text-sm font-medium text-foreground">
												{applicant.companyName}
											</p>
											<p className="text-xs text-muted-foreground">
												{applicant.industry || "Industry N/A"}
											</p>
										</div>
									</div>
									<Separator className="bg-border" />
									<div className="space-y-3">
										<div className="flex items-center gap-3">
											<RiUserLine size={16} className="text-muted-foreground" />
											<span className="text-sm text-foreground">
												{applicant.contactName}
											</span>
										</div>
										<div className="flex items-center gap-3">
											<RiMailLine size={16} className="text-muted-foreground" />
											<a
												href={`mailto:${applicant.email}`}
												className="text-sm text-muted-foreground hover:text-foreground transition-colors">
												{applicant.email}
											</a>
										</div>
										{applicant.phone && (
											<div className="flex items-center gap-3">
												<RiPhoneLine size={16} className="text-muted-foreground" />
												<span className="text-sm text-muted-foreground">
													{applicant.phone}
												</span>
											</div>
										)}
									</div>
								</>
							) : (
								<p className="text-sm text-muted-foreground italic">
									Applicant data unavailable
								</p>
							)}
						</CardContent>
					</Card>

					{/* Current Agent / Status Info */}
					<Card className="bg-card border-border">
						<CardHeader className="pb-3">
							<CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
								Processing Status
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
								<RiRobot2Line className="text-blue-500 animate-bounce" size={20} />
								<div>
									<p className="text-xs text-blue-500 font-medium">Current Agent</p>
									<p className="text-sm text-foreground">System (Orchestrator)</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</DashboardLayout>
	);
}
