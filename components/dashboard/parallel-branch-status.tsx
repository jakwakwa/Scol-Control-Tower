"use client";

import {
	RiAlertLine,
	RiCheckLine,
	RiFileTextLine,
	RiGitBranchLine,
	RiLoader3Line,
	RiShieldCheckLine,
} from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ============================================
// Types
// ============================================

export interface BranchStatus {
	id: string;
	name: string;
	description: string;
	status: "pending" | "in_progress" | "completed" | "failed";
	/** For procurement check - the risk score if available */
	riskScore?: number;
	/** For mandate documents - received vs required count */
	documentsReceived?: number;
	documentsRequired?: number;
	/** Optional timestamp for completion */
	completedAt?: Date;
	/** Icon to display */
	icon: React.ElementType;
}

interface ParallelBranchStatusProps {
	/** Current workflow stage */
	stage: number;
	/** Array of branch statuses */
	branches: BranchStatus[];
	/** Title for the parallel processing section */
	title?: string;
	/** Whether all branches must complete */
	requireAll?: boolean;
}

// ============================================
// Status Configuration
// ============================================

const statusConfig = {
	pending: {
		label: "Pending",
		color: "bg-muted text-muted-foreground border-border",
		icon: RiLoader3Line,
		pulse: false,
	},
	in_progress: {
		label: "In Progress",
		color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
		icon: RiLoader3Line,
		pulse: true,
	},
	completed: {
		label: "Completed",
		color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
		icon: RiCheckLine,
		pulse: false,
	},
	failed: {
		label: "Failed",
		color: "bg-red-500/10 text-red-400 border-red-500/20",
		icon: RiAlertLine,
		pulse: false,
	},
};

// ============================================
// Branch Card Component
// ============================================

function BranchCard({ branch, isLast }: { branch: BranchStatus; isLast: boolean }) {
	const config = statusConfig[branch.status];
	const StatusIcon = config.icon;
	const BranchIcon = branch.icon;

	return (
		<div className="flex items-start gap-3">
			{/* Visual tree connector */}
			<div className="flex flex-col items-center">
				<div className="w-px h-3 bg-secondary/20" />
				<div
					className={cn(
						"w-5 h-5 rounded-full flex items-center justify-center",
						branch.status === "completed" && "bg-emerald-500/20",
						branch.status === "in_progress" && "bg-blue-500/20",
						branch.status === "pending" && "bg-muted",
						branch.status === "failed" && "bg-red-500/20"
					)}>
					<StatusIcon
						className={cn(
							"h-3 w-3",
							branch.status === "completed" && "text-emerald-400",
							branch.status === "in_progress" && "text-blue-400 animate-spin",
							branch.status === "pending" && "text-muted-foreground",
							branch.status === "failed" && "text-red-400",
							config.pulse && "animate-pulse"
						)}
					/>
				</div>
				{!isLast && <div className="w-px h-full bg-secondary/20 min-h-[20px]" />}
			</div>

			{/* Branch content */}
			<div className="flex-1 pb-4">
				<div className="p-3 rounded-lg border border-secondary/10 bg-secondary/5 hover:bg-secondary/10 transition-colors">
					<div className="flex items-start justify-between gap-3">
						<div className="flex items-center gap-2">
							<div className="p-1.5 rounded-md bg-secondary/10">
								<BranchIcon className="h-4 w-4 text-muted-foreground" />
							</div>
							<div>
								<p className="text-sm font-medium text-foreground">{branch.name}</p>
								<p className="text-xs text-muted-foreground">{branch.description}</p>
							</div>
						</div>

						<Badge variant="outline" className={cn("text-[10px]", config.color)}>
							{config.label}
						</Badge>
					</div>

					{/* Additional metrics */}
					<div className="mt-3 flex items-center gap-4 text-xs">
						{/* Risk Score for Procurement Check */}
						{branch.riskScore !== undefined && (
							<div className="flex items-center gap-1">
								<span className="text-muted-foreground">Risk Score:</span>
								<span
									className={cn(
										"font-medium",
										branch.riskScore <= 30 && "text-emerald-400",
										branch.riskScore > 30 && branch.riskScore <= 60 && "text-yellow-400",
										branch.riskScore > 60 && "text-red-400"
									)}>
									{branch.riskScore}%
								</span>
							</div>
						)}

						{/* Document count for Mandate Documents */}
						{branch.documentsReceived !== undefined && (
							<div className="flex items-center gap-1">
								<span className="text-muted-foreground">Documents:</span>
								<span
									className={cn(
										"font-medium",
										branch.documentsReceived === branch.documentsRequired
											? "text-emerald-400"
											: "text-yellow-400"
									)}>
									{branch.documentsReceived}/{branch.documentsRequired || "?"}
								</span>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

// ============================================
// Parallel Branch Status Component
// ============================================

/**
 * ParallelBranchStatus - Visualizes parallel workflow branches
 *
 * Used in Stage 3 (Mandate Processing) to show:
 * - Procurement Check branch with risk score
 * - Mandate Documents branch with document count
 *
 * Both branches run in parallel and must complete before
 * the workflow can proceed to Stage 4.
 */
export function ParallelBranchStatus({
	stage,
	branches,
	title = "Parallel Processing",
	requireAll = true,
}: ParallelBranchStatusProps) {
	const completedCount = branches.filter(b => b.status === "completed").length;
	const allComplete = completedCount === branches.length;
	const hasFailure = branches.some(b => b.status === "failed");

	return (
		<div className="space-y-3">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<RiGitBranchLine className="h-4 w-4 text-primary" />
					<h4 className="text-sm font-semibold text-foreground">{title}</h4>
					<span className="text-xs text-muted-foreground">Stage {stage}</span>
				</div>
				<div className="flex items-center gap-2">
					{/* Progress indicator */}
					<span className="text-xs text-muted-foreground">
						{completedCount}/{branches.length} complete
					</span>
					{allComplete && !hasFailure && (
						<Badge
							variant="outline"
							className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
							All Complete
						</Badge>
					)}
					{hasFailure && (
						<Badge
							variant="outline"
							className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20">
							Action Required
						</Badge>
					)}
				</div>
			</div>

			{/* Visual tree structure */}
			<div className="pl-2 border-l-2 border-secondary/20 ml-1.5">
				{branches.map((branch, index) => (
					<BranchCard
						key={branch.id}
						branch={branch}
						isLast={index === branches.length - 1}
					/>
				))}
			</div>

			{/* Requirement note */}
			{requireAll && !allComplete && (
				<p className="text-xs text-muted-foreground text-center">
					All branches must complete before proceeding to the next stage
				</p>
			)}
		</div>
	);
}

// ============================================
// Default Stage 3 Branches
// ============================================

/**
 * Helper function to create Stage 3 parallel branch configuration
 */
export function createStage3Branches(data: {
	procurementStatus: BranchStatus["status"];
	procurementRiskScore?: number;
	mandateStatus: BranchStatus["status"];
	mandateDocsReceived: number;
	mandateDocsRequired: number;
}): BranchStatus[] {
	return [
		{
			id: "procurement_check",
			name: "Procurement Check",
			description: "ProcureCheck verification and risk assessment",
			status: data.procurementStatus,
			riskScore: data.procurementRiskScore,
			icon: RiShieldCheckLine,
		},
		{
			id: "mandate_documents",
			name: "Mandate Documents",
			description: "Collection and verification of mandate documents",
			status: data.mandateStatus,
			documentsReceived: data.mandateDocsReceived,
			documentsRequired: data.mandateDocsRequired,
			icon: RiFileTextLine,
		},
	];
}

export default ParallelBranchStatus;
