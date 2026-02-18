"use client";

import {
	RiCheckboxCircleLine,
	RiCheckLine,
	RiContractLine,
	RiEditLine,
	RiFileTextLine,
	RiLoader3Line,
	RiRobot2Line,
	RiUserLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";

// ============================================
// Types
// ============================================

export interface WorkflowStep {
	stage: number;
	name: string;
	shortName: string;
	status: "completed" | "current" | "pending" | "error";
	/** Optional timestamp for completed steps */
	completedAt?: Date;
	/** Icon for the step */
	icon?: React.ElementType;
}

interface WorkflowProgressStepperProps {
	/** Current stage number (1-6) */
	currentStage: 1 | 2 | 3 | 4 | 5 | 6;
	/** Current workflow status */
	workflowStatus?: string;
	/** Compact mode for smaller displays */
	compact?: boolean;
	/** Custom step data (overrides default) */
	steps?: WorkflowStep[];
	/** Class name override */
	className?: string;
}

// ============================================
// Default V2 Workflow Steps
// ============================================

const DEFAULT_STEPS: Omit<WorkflowStep, "status">[] = [
	{
		stage: 1,
		name: "Lead Capture",
		shortName: "Lead",
		icon: RiUserLine,
	},
	{
		stage: 2,
		name: "Facility & Quote",
		shortName: "Facility",
		icon: RiEditLine,
	},
	{
		stage: 3,
		name: "Procurement & AI",
		shortName: "Parallel",
		icon: RiFileTextLine,
	},
	{
		stage: 4,
		name: "Risk Review",
		shortName: "Review",
		icon: RiRobot2Line,
	},
	{
		stage: 5,
		name: "Contract",
		shortName: "Contract",
		icon: RiContractLine,
	},
	{
		stage: 6,
		name: "Final Approval",
		shortName: "Approval",
		icon: RiCheckboxCircleLine,
	},
];

// ============================================
// Step Component
// ============================================

function StepItem({
	step,
	isLast,
	compact,
}: {
	step: WorkflowStep;
	isLast: boolean;
	compact: boolean;
}) {
	const Icon = step.icon || RiCheckLine;

	return (
		<div className="flex items-center flex-1">
			<div className="flex flex-col items-center">
				{/* Step Circle */}
				<div
					className={cn(
						"flex items-center justify-center rounded-full transition-all duration-300",
						compact ? "h-8 w-8" : "h-10 w-10",
						step.status === "completed" && "bg-emerald-500/20 ring-2 ring-emerald-500/40",
						step.status === "current" &&
							"bg-primary/20 ring-2 ring-primary animate-pulse",
						step.status === "pending" && "bg-muted border border-secondary/20",
						step.status === "error" && "bg-red-500/20 ring-2 ring-red-500/40"
					)}>
					{step.status === "completed" ? (
						<RiCheckLine
							className={cn("text-emerald-400", compact ? "h-4 w-4" : "h-5 w-5")}
						/>
					) : step.status === "current" ? (
						<RiLoader3Line
							className={cn("text-primary animate-spin", compact ? "h-4 w-4" : "h-5 w-5")}
						/>
					) : (
						<Icon
							className={cn(
								step.status === "error" ? "text-red-400" : "text-muted-foreground",
								compact ? "h-4 w-4" : "h-5 w-5"
							)}
						/>
					)}
				</div>

				{/* Step Label */}
				<div
					className={cn("mt-2 text-center", compact ? "max-w-[60px]" : "max-w-[80px]")}>
					<p
						className={cn(
							"font-medium truncate",
							compact ? "text-[10px]" : "text-xs",
							step.status === "completed" && "text-emerald-400",
							step.status === "current" && "text-foreground",
							step.status === "pending" && "text-muted-foreground",
							step.status === "error" && "text-red-400"
						)}>
						{compact ? step.shortName : step.name}
					</p>
					{!compact && step.status === "completed" && step.completedAt && (
						<p className="text-[9px] text-muted-foreground mt-0.5">
							{step.completedAt.toLocaleDateString("en-ZA", {
								month: "short",
								day: "numeric",
							})}
						</p>
					)}
				</div>
			</div>

			{/* Connector Line */}
			{!isLast && (
				<div
					className={cn(
						"flex-1 h-0.5 mx-2 rounded-full transition-colors duration-300",
						compact ? "min-w-[16px]" : "min-w-[24px]",
						step.status === "completed" ? "bg-emerald-500/40" : "bg-secondary/20"
					)}
				/>
			)}
		</div>
	);
}

// ============================================
// Main Component
// ============================================

/**
 * WorkflowProgressStepper - Horizontal progress indicator for V2 workflow
 *
 * Shows the 6 stages of the onboarding workflow with visual indicators
 * for completed, current, and pending stages.
 *
 * Usage:
 * ```tsx
 * <WorkflowProgressStepper currentStage={3} workflowStatus="in_progress" />
 * ```
 */
export function WorkflowProgressStepper({
	currentStage,
	workflowStatus,
	compact = false,
	steps,
	className,
}: WorkflowProgressStepperProps) {
	// Generate step statuses based on current stage
	const workflowSteps: WorkflowStep[] = (steps || DEFAULT_STEPS).map(step => {
		let status: WorkflowStep["status"] = "pending";

		if (step.stage < currentStage) {
			status = "completed";
		} else if (step.stage === currentStage) {
			status =
				workflowStatus === "failed" || workflowStatus === "error" ? "error" : "current";
		}

		return {
			...step,
			status,
		};
	});

	return (
		<div
			className={cn(
				"flex items-start justify-between w-full",
				compact ? "px-2" : "px-4",
				className
			)}>
			{workflowSteps.map((step, index) => (
				<StepItem
					key={step.stage}
					step={step}
					isLast={index === workflowSteps.length - 1}
					compact={compact}
				/>
			))}
		</div>
	);
}

export default WorkflowProgressStepper;
