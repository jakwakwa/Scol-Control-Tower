"use client";

import {
	RiAlertLine,
	RiArrowDownSLine,
	RiArrowUpSLine,
	RiCheckLine,
	RiCloseLine,
	RiFlowChart,
	RiMore2Fill,
	RiPauseCircleLine,
	RiThumbDownLine,
	RiThumbUpLine,
	RiTimeLine,
	RiUserLine,
} from "@remixicon/react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
		| "paused";
	currentAgent?: string;
	startedAt: Date;
	payload?: Record<string, unknown>;
	hasQuote?: boolean;
	/** Review type for stage 3/4 routing */
	reviewType?: "procurement" | "general";
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
		color: "default",
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
			variant={config.color as "default" | "secondary" | "destructive" | "outline"}
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
		<div className="flex flex-col gap-1">
			<div className="flex items-center gap-0.5">
				{stages.map(stage => (
					<div key={`stage-w-${stage}`} className="flex items-center">
						<div
							className={cn(
								"flex items-center justify-center rounded-full font-medium transition-all",
								compact ? "h-5 w-5 text-[9px]" : "h-7 w-7 text-xs",
								stage < currentStage && "bg-teal-500/40 text-emerald-600/80",
								stage === currentStage &&
									"bg-stone-500/20 text-stone-400 ring-2 ring-stone-500/30",
								stage > currentStage && "bg-secondary/5 text-muted-foreground"
							)}
							title={STAGE_NAMES[stage]}>
							{stage < currentStage ? (
								<RiCheckLine className={compact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} />
							) : (
								stage
							)}
						</div>
						{stage < 6 && (
							<div
								className={cn(
									"h-0.5 transition-colors",
									compact ? "w-1.5" : "w-2.5",
									stage < currentStage ? "bg-teal-500/40" : "bg-secondary/10"
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
				className="translate-y-0.5"
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={value => row.toggleSelected(!!value)}
				aria-label="Select row"
				className="translate-y-0.5"
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
				className="-ml-4 hover:bg-transparent hover:text-foreground"
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
		cell: ({ row }) => (
			<div className="flex flex-col">
				<span className="font-medium text-foreground">{row.original.clientName}</span>
				<span className="text-xs text-muted-foreground">#{row.original.id}</span>
			</div>
		),
	},
	{
		accessorKey: "stage",
		header: () => (
			<span className="-ml-4 font-light hover:bg-transparent hover:text-foreground">
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
				className="-ml-4 hover:bg-transparent hover:text-foreground"
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
				className="-ml-4 hover:bg-transparent hover:text-foreground"
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
				className="-ml-4 hover:bg-transparent hover:text-foreground"
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
		header: () => <span className="-ml-4 font-light text-xs uppercase">Actions</span>,
		cell: ({ row, table }) => {
			const meta = table.options.meta as {
				onManualOverride: (data: WorkflowRow) => void;
				onQuickApprove: (data: WorkflowRow) => void;
				onQuickReject: (data: WorkflowRow) => void;
				onRejectWorkflow: (data: WorkflowRow) => void;
			};
			const isAwaiting = row.original.status === "awaiting_human";
			const canViewQuote = row.original.stage >= 2 && row.original.hasQuote;

			return (
				<div className="flex items-center gap-1">
					{/* Quick HITL Actions - only show when awaiting human */}
					{isAwaiting && (
						<>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 hover:bg-teal-500/40 hover:text-emerald-600/80 transition-colors"
								onClick={() => meta?.onQuickApprove(row.original)}
								title="Approve">
								<RiThumbUpLine className="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400 transition-colors"
								onClick={() => meta?.onQuickReject(row.original)}
								title="Reject">
								<RiThumbDownLine className="h-4 w-4" />
							</Button>
						</>
					)}

					<DropdownMenu>
						<DropdownMenuTrigger
							className={cn(
								buttonVariants({ variant: "ghost", size: "icon" }),
								"h-8 w-8 hover:bg-secondary/10"
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
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="cursor-pointer flex items-center text-destructive focus:text-destructive"
								onClick={() => meta?.onRejectWorkflow(row.original)}>
								<RiCloseLine className="mr-2 h-4 w-4" />
								Reject Workflow
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			);
		},
	},
];

// --- HITL Confirmation Dialog ---

function HITLConfirmDialog({
	workflow,
	action,
	open,
	onOpenChange,
	onConfirm,
}: {
	workflow: WorkflowRow | null;
	action: "approve" | "reject" | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => Promise<void>;
}) {
	const [isLoading, setIsLoading] = React.useState(false);

	const handleConfirm = async () => {
		setIsLoading(true);
		try {
			await onConfirm();
			onOpenChange(false);
		} finally {
			setIsLoading(false);
		}
	};

	if (!(workflow && action)) return null;

	const isApprove = action === "approve";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md border-secondary/10 bg-white/90 backdrop-blur-xl">
				<DialogHeader>
					<DialogTitle
						className={cn(
							"flex items-center gap-2",
							isApprove ? "text-emerald-500" : "text-red-500"
						)}>
						{isApprove ? (
							<RiThumbUpLine className="h-5 w-5" />
						) : (
							<RiThumbDownLine className="h-5 w-5" />
						)}
						{isApprove ? "Approve Workflow" : "Reject Workflow"}
					</DialogTitle>
					<DialogDescription>
						{isApprove
							? `Approve ${workflow.clientName}'s workflow to proceed to the next stage.`
							: `Reject ${workflow.clientName}'s workflow. This action cannot be undone.`}
					</DialogDescription>
				</DialogHeader>

				<div className="py-4">
					<div className="rounded-lg border border-secondary/10 bg-secondary/5 p-4 space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Client</span>
							<span className="font-medium">{workflow.clientName}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Stage</span>
							<span className="font-medium">{workflow.stageName}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Workflow ID</span>
							<code className="text-xs bg-black/50 px-2 py-0.5 rounded">
								#{workflow.id}
							</code>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="ghost"
						onClick={() => onOpenChange(false)}
						disabled={isLoading}>
						Cancel
					</Button>
					<Button
						variant={isApprove ? "default" : "destructive"}
						onClick={handleConfirm}
						disabled={isLoading}
						className={cn("gap-2", isApprove && "bg-emerald-600 hover:bg-emerald-700")}>
						{isLoading ? "Processing..." : isApprove ? "Approve" : "Reject"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// --- Workflow Rejection Dialog ---

function WorkflowRejectDialog({
	workflow,
	open,
	onOpenChange,
	onConfirm,
}: {
	workflow: WorkflowRow | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => Promise<void>;
}) {
	const [isLoading, setIsLoading] = React.useState(false);

	const handleConfirm = async () => {
		setIsLoading(true);
		try {
			await onConfirm();
			onOpenChange(false);
		} finally {
			setIsLoading(false);
		}
	};

	if (!workflow) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md border-secondary/10 bg-zinc-100 backdrop-blur-xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-destructive">
						<RiAlertLine className="h-5 w-5" />
						Reject Workflow
					</DialogTitle>
					<DialogDescription>
						This will permanently remove the workflow for{" "}
						<strong>{workflow.clientName}</strong>. The applicant record will be
						preserved, but the workflow and all related data (quotes, events) will be
						deleted.
					</DialogDescription>
				</DialogHeader>

				<div className="py-4">
					<div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Client</span>
							<span className="font-medium">{workflow.clientName}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Stage</span>
							<span className="font-medium">{workflow.stageName}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Workflow ID</span>
							<code className="text-xs bg-black/50 px-2 py-0.5 rounded">
								#{workflow.id}
							</code>
						</div>
					</div>
					<p className="mt-4 text-xs text-muted-foreground">
						This action cannot be undone.
					</p>
				</div>

				<DialogFooter>
					<Button
						variant="ghost"
						onClick={() => onOpenChange(false)}
						disabled={isLoading}>
						Cancel
					</Button>
					<Button variant="destructive" onClick={handleConfirm} disabled={isLoading}>
						{isLoading ? "Rejecting..." : "Reject Workflow"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// --- Main Component ---

interface WorkflowTableProps {
	workflows: WorkflowRow[];
	onRefresh?: () => void;
}

export function WorkflowTable({ workflows, onRefresh }: WorkflowTableProps) {
	const [selectedWorkflow, setSelectedWorkflow] = React.useState<WorkflowRow | null>(
		null
	);
	const [isHITLOpen, setIsHITLOpen] = React.useState(false);
	const [hitlAction, setHitlAction] = React.useState<"approve" | "reject" | null>(null);
	const [isRejectOpen, setIsRejectOpen] = React.useState(false);

	const handleQuickApprove = React.useCallback((workflow: WorkflowRow) => {
		setSelectedWorkflow(workflow);
		setHitlAction("approve");
		setIsHITLOpen(true);
	}, []);

	const handleQuickReject = React.useCallback((workflow: WorkflowRow) => {
		setSelectedWorkflow(workflow);
		setHitlAction("reject");
		setIsHITLOpen(true);
	}, []);

	const handleRejectWorkflow = React.useCallback((workflow: WorkflowRow) => {
		setSelectedWorkflow(workflow);
		setIsRejectOpen(true);
	}, []);

	const handleHITLConfirm = React.useCallback(async () => {
		if (!(selectedWorkflow && hitlAction)) return;

		const payload = {
			agentId: "human_hitl",
			status: hitlAction === "approve" ? "COMPLETED" : "REJECTED",
			decision: {
				outcome: hitlAction === "approve" ? "APPROVED" : "REJECTED",
				reason:
					hitlAction === "approve"
						? "Approved via Control Tower"
						: "Rejected via Control Tower",
			},
			audit: {
				humanActor: "admin",
				timestamp: new Date().toISOString(),
			},
		};

		try {
			const response = await fetch(`/api/workflows/${selectedWorkflow.id}/signal`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to signal workflow");
			}

			toast.success(
				hitlAction === "approve"
					? `Workflow approved for ${selectedWorkflow.clientName}`
					: `Workflow rejected for ${selectedWorkflow.clientName}`,
				{ description: "Signal sent successfully" }
			);

			onRefresh?.();
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Unexpected error";
			toast.error("Failed to process workflow", {
				description: message,
			});
			throw err;
		}
	}, [selectedWorkflow, hitlAction, onRefresh]);

	const handleRejectConfirm = React.useCallback(async () => {
		if (!selectedWorkflow) return;

		try {
			const response = await fetch(`/api/workflows/${selectedWorkflow.id}/reject`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					reason: "Rejected via Control Tower",
					actor: "admin",
				}),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to reject workflow");
			}

			toast.success(`Workflow rejected for ${selectedWorkflow.clientName}`, {
				description: "Workflow has been removed",
			});

			onRefresh?.();
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Unexpected error";
			toast.error("Failed to reject workflow", {
				description: message,
			});
			throw err;
		}
	}, [selectedWorkflow, onRefresh]);

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
			<DataTable
				columns={columns}
				data={workflows}
				meta={{
					onQuickApprove: handleQuickApprove,
					onQuickReject: handleQuickReject,
					onRejectWorkflow: handleRejectWorkflow,
				}}
			/>

			<HITLConfirmDialog
				workflow={selectedWorkflow}
				action={hitlAction}
				open={isHITLOpen}
				onOpenChange={setIsHITLOpen}
				onConfirm={handleHITLConfirm}
			/>

			<WorkflowRejectDialog
				workflow={selectedWorkflow}
				open={isRejectOpen}
				onOpenChange={setIsRejectOpen}
				onConfirm={handleRejectConfirm}
			/>
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
