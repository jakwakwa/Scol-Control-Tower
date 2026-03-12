"use client";

import { RiFlashlightLine, RiRobot2Line } from "@remixicon/react";
import type React from "react";
import type { GREEN_LANE_APPROVER_ID } from "@/lib/services/green-lane.service";
import { cn } from "@/lib/utils";

interface GreenLaneApprovalRecord {
	approvedBy: typeof GREEN_LANE_APPROVER_ID;
	approvedAt: string;
	eligibilityResult?: {
		criteria?: {
			scoreCheck?: { value: number };
			riskLevelCheck?: { value: string | null };
			flagsCheck?: { count: number };
		};
	};
}

interface GreenLaneBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
	approvalRecord?: GreenLaneApprovalRecord | null;
	showDetails?: boolean;
	variant?: "compact" | "full";
}

export function GreenLaneBadge({
	approvalRecord,
	showDetails = false,
	variant = "compact",
	className,
	...props
}: GreenLaneBadgeProps) {
	if (!approvalRecord) {
		return null;
	}

	const criteria = approvalRecord.eligibilityResult?.criteria;
	const approvedAt = approvalRecord.approvedAt
		? new Date(approvalRecord.approvedAt).toLocaleString()
		: "Unknown";

	if (variant === "compact") {
		return (
			<div
				className={cn(
					"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
					"bg-gradient-to-r from-emerald-500/20 to-teal-500/20",
					"text-emerald-300 border border-emerald-500/30",
					"backdrop-blur-sm shadow-sm shadow-emerald-500/10",
					className
				)}
				title={`Green Lane Auto-Approved on ${approvedAt}`}
				{...props}>
				<RiFlashlightLine className="h-3.5 w-3.5 text-emerald-400" />
				<span>Green Lane</span>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"rounded-lg border border-emerald-500/30 p-4",
				"bg-gradient-to-br from-emerald-500/10 to-teal-500/10",
				"backdrop-blur-sm",
				className
			)}
			{...props}>
			<div className="flex items-start gap-3">
				<div className="p-2 rounded-lg bg-emerald-500/20">
					<RiFlashlightLine className="h-5 w-5 text-emerald-400" />
				</div>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 mb-1">
						<h4 className="text-sm font-semibold text-emerald-300">
							Green Lane Approved
						</h4>
						<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
							<RiRobot2Line className="h-2.5 w-2.5" />
							Auto
						</span>
					</div>
					<p className="text-xs text-muted-foreground">
						Approved by{" "}
						<span className="font-mono text-emerald-400">
							{approvalRecord.approvedBy}
						</span>
					</p>
					<p className="text-[10px] text-muted-foreground mt-1">{approvedAt}</p>

					{showDetails && criteria && (
						<div className="mt-3 pt-3 border-t border-emerald-500/20">
							<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
								Eligibility Criteria
							</p>
							<div className="grid grid-cols-3 gap-2">
								<div className="text-center p-2 rounded bg-emerald-500/10">
									<p className="text-[10px] text-muted-foreground">Score</p>
									<p className="text-sm font-bold text-emerald-400">
										{criteria.scoreCheck?.value ?? "N/A"}%
									</p>
								</div>
								<div className="text-center p-2 rounded bg-emerald-500/10">
									<p className="text-[10px] text-muted-foreground">Risk</p>
									<p className="text-sm font-bold text-emerald-400 capitalize">
										{criteria.riskLevelCheck?.value ?? "N/A"}
									</p>
								</div>
								<div className="text-center p-2 rounded bg-emerald-500/10">
									<p className="text-[10px] text-muted-foreground">Flags</p>
									<p className="text-sm font-bold text-emerald-400">
										{criteria.flagsCheck?.count ?? 0}
									</p>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export function GreenLaneIndicator({
	isGreenLane,
	className,
}: {
	isGreenLane: boolean;
	className?: string;
}) {
	if (!isGreenLane) {
		return null;
	}

	return (
		<span
			className={cn(
				"inline-flex items-center justify-center w-5 h-5 rounded-full",
				"bg-emerald-500/20 text-emerald-400",
				"ring-2 ring-emerald-500/30",
				className
			)}
			title="Green Lane Approved">
			<RiFlashlightLine className="h-3 w-3" />
		</span>
	);
}
