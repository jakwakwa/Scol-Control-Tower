"use client";

import {
	RiCheckboxCircleLine,
	RiCheckDoubleLine,
	RiCheckLine,
	RiContractLine,
	RiEditLine,
	RiFileTextLine,
	RiFlowChart,
	RiMenu3Line,
	RiRobot2Line,
	RiTimeLine,
	RiUserLine,
} from "@remixicon/react";
import Link from "next/link";
import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { RiskBadge } from "../ui/status-badge";

export type PipelineWorkflow = {
	id: number | string;
	stage: string;
	status?: string;
	clientName?: string;
	applicantId?: number;
	hasQuote?: boolean;
	payload?: {
		riskLevel?: string;
		registrationNumber?: string;
		mandateType?: string;
		procurementCleared?: boolean;
		documentsComplete?: boolean;
		aiAnalysisComplete?: boolean;
	};
	startedAt?: string | Date;
};

/**
 * V2 Workflow Pipeline Stages (6-stage system)
 * Maps to the workflow stage numbers: 1-6
 */
const PIPELINE_STAGES = [
	{
		id: "quote_review",
		stageNumber: 1,
		title: "Lead Capture",
		color: "bg-cyan-950/30 border-cyan-800",
		icon: RiUserLine,
		shortTitle: "Lead",
	},
	{
		id: "mandate_collection",
		stageNumber: 2,
		title: "Facility & Quote",
		color: "bg-indigo-950/20 border-indigo-800",
		icon: RiEditLine,
		shortTitle: "Facility",
	},
	{
		id: "procurement_ai",
		stageNumber: 3,
		title: "Procurement & AI",
		color: "bg-amber-950/20 border-amber-800",
		icon: RiFileTextLine,
		shortTitle: "Parallel",
	},
	{
		id: "risk_review",
		stageNumber: 4,
		title: "Risk Review",
		color: "bg-red-950/20 border-red-800",
		icon: RiRobot2Line,
		shortTitle: "Review",
	},
	{
		id: "contract",
		stageNumber: 5,
		title: "Contract",
		color: "bg-teal-800/10 border-teal-800",
		icon: RiContractLine,
		shortTitle: "Contract",
	},
	{
		id: "final_approval",
		stageNumber: 6,
		title: "Final Approval",
		color: "bg-emerald-500/5 border-emerald-500/70",
		icon: RiCheckboxCircleLine,
		shortTitle: "Approval",
	},
];

export function PipelineView({ workflows }: { workflows: PipelineWorkflow[] }) {
	const columns = useMemo(
		() =>
			PIPELINE_STAGES.reduce(
				(acc, stage) => {
					acc[stage.id] = workflows.filter(workflow => {
						// Handle both string stage names and numeric stage numbers
						const stageValue = workflow.stage;

						// Numeric stage matching (V2 workflow)
						if (typeof stageValue === "number" || !Number.isNaN(Number(stageValue))) {
							return Number(stageValue) === stage.stageNumber;
						}

						// Legacy string-based stage matching for backwards compatibility
						const stageString = String(stageValue).toLowerCase();
						switch (stage.id) {
							case "quote_review":
								return [
									"new",
									"contacted",
									"qualified",
									"lead_capture",
									"entry",
									"entry_quote",
									"quote",
								].includes(stageString);
							case "mandate_collection":
								return [
									"proposal",
									"quotation",
									"quote_signing",
									"signing",
									"facility",
									"facility_application",
									"mandate",
									"mandate_processing",
									"mandate_collection",
								].includes(stageString);
							case "procurement_ai":
								return [
									"negotiation",
									"verification",
									"procurement",
									"ai_analysis",
									"procurement_ai",
								].includes(stageString);
							case "risk_review":
								return ["review", "fica_review", "risk_review", "analysis"].includes(
									stageString
								);
							case "contract":
								return ["contract", "contract_forms", "absa_form", "forms"].includes(
									stageString
								);
							case "final_approval":
								return [
									"won",
									"activation",
									"completed",
									"integration",
									"completion",
									"final_approval",
								].includes(stageString);
							default:
								return false;
						}
					});
					return acc;
				},
				{} as Record<string, PipelineWorkflow[]>
			),
		[workflows]
	);

	return (
		<div className="h-full overflow-x-auto  dotted-grid-container rounded-4xl border border-sidebar-borde  m-0 shadow-[inset_-10px_-1px_10px_rgba(0,0,0,0.12)] bg-linear-to-br from-zinc-900 from-0% via-zinc-900/80 via-60% to-amber-950/10 to-95%">
			{/* 6-column layout with reduced gaps for smaller screens */}
			<div className="flex gap-3 min-w-[1400px] dotted-grid p-3">
				{PIPELINE_STAGES.map(stage => (
					<div
						key={stage.id + 11}
						className={`flex-1 min-w-[180px] max-w-[240px] flex flex-col gap-3`}>
						<div
							className={cn(
								`flex items-center glass-card after:rounded-2xl before:rounded-2xl backdrop-blur-xs justify-between p-4 rounded-xl shadow-sm border-t-[1.5px] border-t-${stage.color} min-h-[70px]`,
								stage.color
							)}>
							<div className="flex items-center gap-2">
								<stage.icon className="h-5 w-5 outline-0  border-none text-muted-foreground" />
								<h3 className="font-bold text-xs text-foreground">{stage.title}</h3>
							</div>
							<span className="flex h-6 w-6 items-center justify-center rounded-full  text-xs font-bold text-muted-foreground border border-sidebar-border">
								{columns[stage.id]?.length || 0}
							</span>
						</div>

						{/* Static Card List (drag-and-drop disabled) */}
						<div className="flex-1 flex flex-col gap-3 rounded-xl min-h-[100px]">
							{columns[stage.id]?.map(workflow => (
								<MemoizedPipelineCard key={workflow.id.toString()} workflow={workflow} />
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function formatRelativeTime(date?: string | Date): string {
	if (!date) return "Just now";
	const now = new Date();
	const d = typeof date === "string" ? new Date(date) : date;
	const diff = now.getTime() - d.getTime();
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);

	if (minutes < 1) return "Just now";
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	return `${days}d ago`;
}

function PipelineCard({ workflow }: { workflow: PipelineWorkflow }) {
	const stageNumber =
		typeof workflow.stage === "number"
			? workflow.stage
			: Number.isNaN(Number(workflow.stage))
				? 1
				: Number(workflow.stage);
	const canViewQuote = stageNumber >= 2 && workflow.hasQuote;

	return (
		<div className="glass-card after:rounded-2xl before:rounded-2xl backdrop-blur-xs p-7  border border-white/10 shadow-[0px_10px_10px_rgba(0,0,0,0.05)] transition-all group relative select-none">
			{/* Header: Company Name & Risk if applicable */}
			<div className="flex justify-between items-start mb-2">
				<h4 className="font-medium line-clamp-1 text-ellipsis  whitespace-nowrap uppercase   text-[11px] text-card-foreground leading-tight pr-6">
					{workflow.clientName || "Unknown Company"}
				</h4>
			</div>
			<div className="flex gap-1">
				<p className="text-[10px] text-card-foreground/50 font-mono mb-4">
					{`Reg No: ${workflow.payload?.registrationNumber ? workflow.payload.registrationNumber : " #"}`}
				</p>
				<p className="text-[10px] text-card-foreground/50 font-mono mb-4">
					{`| ID: ${workflow.applicantId ? workflow.applicantId : " #"}`}
				</p>
			</div>

			{/* Stage 3 Parallel Indicators */}
			{stageNumber === 3 && (
				<div className="flex items-center gap-1.5 mt-2 mb-2">
					<div
						className={`flex items-center justify-center p-1 rounded-sm border ${
							workflow.payload?.procurementCleared
								? "bg-green-500/10 border-green-500/20 text-green-500"
								: "bg-amber-500/10 border-amber-500/20 text-amber-500"
						}`}
						title="Procurement Review">
						{workflow.payload?.procurementCleared ? (
							<RiCheckDoubleLine className="w-3.5 h-3.5" />
						) : (
							<RiTimeLine className="w-3.5 h-3.5" />
						)}
					</div>
					<div
						className={`flex items-center justify-center p-1 rounded-sm border ${
							workflow.payload?.documentsComplete
								? "bg-green-500/10 border-green-500/20 text-green-500"
								: "bg-amber-500/10 border-amber-500/20 text-amber-500"
						}`}
						title="FICA Documents">
						{workflow.payload?.documentsComplete ? (
							<RiCheckDoubleLine className="w-3.5 h-3.5" />
						) : (
							<RiTimeLine className="w-3.5 h-3.5" />
						)}
					</div>
					<div
						className={`flex items-center justify-center p-1 rounded-sm border ${
							workflow.payload?.aiAnalysisComplete
								? "bg-green-500/10 border-green-500/20 text-green-500"
								: "bg-amber-500/10 border-amber-500/20 text-amber-500"
						}`}
						title="AI Analysis">
						{workflow.payload?.aiAnalysisComplete ? (
							<RiCheckDoubleLine className="w-3.5 h-3.5" />
						) : (
							<RiTimeLine className="w-3.5 h-3.5" />
						)}
					</div>
				</div>
			)}

			{/* Subtitle: Registration Number */}

			{/* Footer: Details & Time */}
			<div className="flex items-center justify-between pt-3 border-t border-sidebar-border/50 mt-2">
				<div className="flex flex-col">
					<span className="text-[11px] font-semibold text-secondary/50">
						{workflow.payload?.mandateType || "Debit Order"}
					</span>
				</div>

				<div className="flex flex-col items-end">
					<span className="text-[11px] text-secondary/80">
						{formatRelativeTime(workflow.startedAt)}
					</span>
				</div>
				{workflow.payload?.riskLevel && <RiskBadge level={workflow.payload.riskLevel} />}
			</div>

			{/* Action Menu (Hidden until Hover) */}
			<div className="absolute top-3 right-3 opacity-100 group-hover:opacity-20 hover:overflow-hidden p-0 hover:rounded-full transition-opacity focus-visible:outline-0">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" className="h-5 w-5 select-none">
							<RiMenu3Line className="text-muted font-black h-5 w-5" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-[180px] backdrop-blur-xs">
						<DropdownMenuLabel>Actions</DropdownMenuLabel>
						{workflow.applicantId && (
							<DropdownMenuItem asChild>
								<Link
									href={`/dashboard/applicants/${workflow.applicantId}`}
									className="cursor-pointer flex items-center">
									<RiUserLine className="mr-2 h-4 w-4" />
									View Applicant
								</Link>
							</DropdownMenuItem>
						)}
						<DropdownMenuItem asChild>
							<Link
								href={`/dashboard/workflows/${workflow.id}`}
								className="cursor-pointer flex items-center">
								<RiFlowChart className="mr-2 h-4 w-4" />
								View Workflow
							</Link>
						</DropdownMenuItem>
						{canViewQuote && workflow.applicantId && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem asChild>
									<Link
										href={`/dashboard/applicants/${workflow.applicantId}?tab=reviews`}
										className="cursor-pointer flex items-center">
										<RiCheckLine className="mr-2 h-4 w-4" />
										View Quote
									</Link>
								</DropdownMenuItem>
							</>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}

const MemoizedPipelineCard = memo(PipelineCard);
