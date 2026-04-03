"use client";

import {
	RiAlertFill,
	RiAlertLine,
	RiArrowDownSLine,
	RiArrowUpSLine,
	RiCheckLine,
	RiCloseLine,
	RiErrorWarningFill,
	RiFlowChart,
	RiMore2Fill,
	RiPauseCircleLine,
	RiTimeLine,
	RiUserLine,
} from "@remixicon/react";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// --- Types ---

export interface WorkflowRow {
	id: number;
	applicantId: number;
	clientName: string;
	stage: 1 | 2 | 3 | 4 | 5 | 6;
	stageName: string;
	status:
		| "pending"
		| "in_progress"
		| "awaiting_human"
		| "completed"
		| "failed"
		| "timeout"
		| "terminated"
		| "paused";
	terminationReason?: string;
	currentAgent?: string;
	startedAt: Date;
	payload?: Record<string, unknown>;
	hasQuote?: boolean;
	/** Review type for stage 3/4 routing */
	reviewType?: "procurement" | "general";
	/** Row-level alert severity from tiered notifications */
	alertSeverity?: "low" | "medium" | "high" | "critical";
	/** Decision type for routing */
	decisionType?: string;
	/** Target resource endpoint */
	targetResource?: string;
}

/** V2 Workflow Stage Names (SOP-aligned) */
export const STAGE_NAMES: Record<number, string> = {
	1: "Lead Capture",
	2: "Facility & Quote",
	3: "Procurement & AI",
	4: "Risk Review",
	5: "Contract",
	6: "Final Approval",
};

// --- Components ---

const statusConfig = {
	pending: { label: "Pending", color: "secondary", icon: RiTimeLine },
	in_progress: {
		label: "In Progress",
		color: "info",
		icon: RiTimeLine,
		pulse: true,
	},
	awaiting_human: {
		label: "Awaiting Human",
		color: "warning",
		icon: RiUserLine,
		pulse: true,
	},
	completed: { label: "Completed", color: "success", icon: RiCheckLine },
	failed: { label: "Failed", color: "destructive", icon: RiAlertLine },
	timeout: { label: "Timeout", color: "destructive", icon: RiAlertLine },
	terminated: { label: "Terminated", color: "destructive", icon: RiCloseLine },
	paused: {
		label: "Paused",
		color: "warning",
		icon: RiPauseCircleLine,
		pulse: true,
	},
} as const;

export function StatusBadge({ status }: { status: WorkflowRow["status"] }) {
	const config = statusConfig[status];

	if (!config) {
		return (
			<Badge variant="outline" className="gap-1.5 text-muted-foreground">
				<RiAlertLine className="h-3 w-3" />
				{status || "Unknown"}
			</Badge>
		);
	}

	const Icon = config.icon;
	const hasPulse = "pulse" in config && config.pulse;

	return (
		<Badge
			variant={
				config.color as "default" | "secondary" | "destructive" | "outline" | "info"
			}
			className={cn("gap-1.5", hasPulse && "animate-pulse")}>
			<Icon className="h-3 w-3" />
			{config.label}
		</Badge>
	);
}

export function WorkflowStageIndicator({
	currentStage,
	compact = false,
	showLabels = false,
}: {
	currentStage: 1 | 2 | 3 | 4 | 5 | 6;
	compact?: boolean;
	/** Show stage name labels below indicators */
	showLabels?: boolean;
}) {
	const stages = [1, 2, 3, 4, 5, 6] as const;

	return (
		<div className="flex flex-col gap-0 mx-2 h-10 w-full items-center justify-center">
			<div className="flex items-center w-full gap-0 h-9">
				{stages.map(stage => (
					<div key={`stage-w-${stage}`} className="flex items-center">
						<div
							className={cn(
								"flex items-center justify-center rounded-full font-medium transition-all",
								compact ? "h-5 w-5 text-[9px]" : "h-4 w-4",
								stage < currentStage && "bg-emerald-500/70 text-emerald-600/80",
								stage === currentStage &&
									"bg-stone-500/20 text-stone-400 ring-3 ring-indigo-400/70",
								stage > currentStage && "bg-zinc-500/20 text-muted-foreground"
							)}
							title={STAGE_NAMES[stage]}>
							{stage < currentStage ? (
								<CheckIcon
									color="var(--color-emerald-200)"
									className={
										compact
											? "h-5 w-5 p-1 text-foreground"
											: "h-5 w-5 p-2.5 text-foreground"
									}
								/>
							) : (
								stage
							)}
						</div>
						{stage < 6 && (
							<div
								className={cn(
									"h-0.5 transition-colors",
									compact ? "w-1.5" : "w-2.5",
									stage < currentStage ? "bg-emerald-500/0" : "bg-zinc-500/20"
								)}
							/>
						)}
					</div>
				))}
			</div>
			{showLabels && (
				<span className="text-[9px] text-muted-foreground truncate max-w-[120px]">
					{STAGE_NAMES[currentStage]}
				</span>
			)}
		</div>
	);
}

// --- Table Columns ---

export const columns: ColumnDef<WorkflowRow>[] = [
	{
		id: "select",
		header: ({ table }) => (
			<Checkbox
				checked={
					table.getIsAllPageRowsSelected()
						? true
						: table.getIsSomePageRowsSelected()
							? "indeterminate"
							: false
				}
				onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
				aria-label="Select all"
				className="translate-y-0.5 hidden"
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={value => row.toggleSelected(!!value)}
				aria-label="Select row"
				className="translate-y-0.5 hidden"
			/>
		),
		enableSorting: false,
		enableHiding: false,
	},
	{
		accessorKey: "clientName",
		header: ({ column }) => (
			<Button
				variant="ghost"
				size="xs"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
				Client
				{column.getIsSorted() === "asc" ? (
					<RiArrowUpSLine className="ml-2 h-4 w-4" />
				) : column.getIsSorted() === "desc" ? (
					<RiArrowDownSLine className="ml-2 h-4 w-4" />
				) : (
					<RiArrowDownSLine className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100" />
				)}
			</Button>
		),
		cell: ({ row }) => {
			const alert = row.original.alertSeverity;
			return (
				<div className="flex items-center gap-2">
					{alert === "high" || alert === "critical" ? (
						<Link href={`/dashboard/workflows/${row.original.id}`}>
							<RiAlertFill className="h-4 w-4 text-destructive animate-bounce shrink-0" />
						</Link>
					) : alert === "low" || alert === "medium" ? (
						<Link href={`/dashboard/workflows/${row.original.id}`}>
							<RiErrorWarningFill className="h-4 w-4 text-warning-foreground animate-bounce shrink-0" />
						</Link>
					) : null}
					<div className="flex flex-col">
						<span className="font-medium text-foreground">{row.original.clientName}</span>
						<span className="text-xs text-muted-foreground">#{row.original.id}</span>
					</div>
				</div>
			);
		},
	},
	{
		accessorKey: "stage",
		header: () => (
			<span className="-ml-4 text-sm font-medium align-self-center text-center min-w-full	 hover:bg-transparent hover:text-foreground">
				Stage
			</span>
		),
		cell: ({ row }) => (
			<WorkflowStageIndicator currentStage={row.original.stage} compact />
		),
	},
	{
		accessorKey: "status",
		header: ({ column }) => (
			<Button
				variant="ghost"
				size="xs"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
				Status
				{column.getIsSorted() === "asc" ? (
					<RiArrowUpSLine className="ml-2 h-4 w-4" />
				) : column.getIsSorted() === "desc" ? (
					<RiArrowDownSLine className="ml-2 h-4 w-4" />
				) : (
					<RiArrowDownSLine className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100" />
				)}
			</Button>
		),
		cell: ({ row }) => <StatusBadge status={row.original.status} />,
	},
	{
		accessorKey: "currentAgent",
		header: ({ column }) => (
			<Button
				variant="ghost"
				size="xs"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
				Agent
				{column.getIsSorted() === "asc" ? (
					<RiArrowUpSLine className="ml-2 h-4 w-4" />
				) : column.getIsSorted() === "desc" ? (
					<RiArrowDownSLine className="ml-2 h-4 w-4" />
				) : (
					<RiArrowDownSLine className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100" />
				)}
			</Button>
		),
		cell: ({ row }) => (
			<code className="rounded bg-secondary/5 px-2 py-0.5 text-xs text-muted-foreground font-mono">
				{row.original.currentAgent || "—"}
			</code>
		),
	},
	{
		accessorKey: "startedAt",
		header: ({ column }) => (
			<Button
				variant="ghost"
				size="xs"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
				Started
				{column.getIsSorted() === "asc" ? (
					<RiArrowUpSLine className="ml-2 h-4 w-4" />
				) : column.getIsSorted() === "desc" ? (
					<RiArrowDownSLine className="ml-2 h-4 w-4" />
				) : (
					<RiArrowDownSLine className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100" />
				)}
			</Button>
		),
		cell: ({ row }) => (
			<span className="text-sm text-muted-foreground">
				{formatRelativeTime(row.original.startedAt)}
			</span>
		),
	},
	{
		id: "actions",
		header: () => (
			<span className="-ml-4 hidden font-light text-xs uppercase">Actions</span>
		),
		cell: ({ row }) => {
			const canViewQuote = row.original.stage >= 2 && row.original.hasQuote;

			return (
				<div className="flex items-center gap-1">
					<DropdownMenu>
						<DropdownMenuTrigger
							className={cn(
								buttonVariants({ variant: "ghost", size: "icon" }),
								"h-8 w-8 hover:bg-background/50"
							)}>
							<RiMore2Fill className="h-4 w-4" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-[200px]">
							<DropdownMenuLabel>Actions</DropdownMenuLabel>
							<DropdownMenuItem asChild>
								<Link
									href={`/dashboard/applicants/${row.original.applicantId}`}
									className="cursor-pointer flex items-center">
									<RiUserLine className="mr-2 h-4 w-4" />
									View Applicant Details
								</Link>
							</DropdownMenuItem>
							{canViewQuote && (
								<DropdownMenuItem asChild>
									<Link
										href={`/dashboard/applicants/${row.original.applicantId}?tab=reviews`}
										className="cursor-pointer flex items-center">
										<RiCheckLine className="mr-2 h-4 w-4" />
										View Quotation
									</Link>
								</DropdownMenuItem>
							)}
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<Link
									href={`/dashboard/workflows/${row.original.id}`}
									className="cursor-pointer flex items-center">
									<RiFlowChart className="mr-2 h-4 w-4" />
									View Workflow Graph
								</Link>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			);
		},
	},
];

// --- Main Component ---

interface WorkflowTableProps {
	workflows: WorkflowRow[];
	onRefresh?: () => void;
}

export function WorkflowTable({ workflows }: WorkflowTableProps) {
	if (workflows.length === 0) {
		return (
			<div className="rounded-2xl border border-sidebar-border bg-card/90 p-12 text-center">
				<RiFlowChart className="mx-auto h-12 w-12 text-muted-foreground/50" />
				<h3 className="mt-4 text-lg font-medium">No workflows yet</h3>
				<p className="mt-2 text-sm text-muted-foreground">
					Create a new applicant to start an onboarding workflow.
				</p>
			</div>
		);
	}

	return (
		<div className="w-full space-y-4">
			<DataTable columns={columns} data={workflows} />
		</div>
	);
}

// --- Utils ---

function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);

	if (minutes < 1) return "Just now";
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	return `${days}d ago`;
}
