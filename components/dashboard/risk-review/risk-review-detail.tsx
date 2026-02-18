"use client";

import {
	RiAlertLine,
	RiArrowDownSLine,
	RiArrowRightSLine,
	RiBankLine,
	RiBuilding2Line,
	RiCheckLine,
	RiCloseLine,
	RiExternalLinkLine,
	RiEyeLine,
	RiFileTextLine,
	RiHistoryLine,
	RiLoader4Line,
	RiPercentLine,
	RiQuestionLine,
	RiShieldCheckLine,
	RiShoppingBag3Line,
	RiUserLine,
} from "@remixicon/react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { RiskReviewItem } from "./risk-review-queue";

// ============================================
// Override Category Type
// ============================================

type OverrideCategory = "CONTEXT" | "HALLUCINATION" | "DATA_ERROR";

const OVERRIDE_CATEGORIES: {
	value: OverrideCategory;
	label: string;
	description: string;
}[] = [
	{
		value: "CONTEXT",
		label: "Additional Context",
		description: "I have contextual information the AI did not have access to",
	},
	{
		value: "HALLUCINATION",
		label: "AI Hallucination",
		description: "The AI generated inaccurate or fabricated information",
	},
	{
		value: "DATA_ERROR",
		label: "Data Error",
		description: "The underlying data used by the AI was incorrect or outdated",
	},
];

// ============================================
// Types
// ============================================

interface RiskReviewDetailProps {
	item: RiskReviewItem | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onApprove: (id: number, reason?: string) => Promise<void>;
	onReject: (id: number, reason: string) => Promise<void>;
}

interface TimelineEvent {
	id: string;
	type: "stage_change" | "agent_dispatch" | "agent_callback" | "human_override" | "error";
	title: string;
	description: string;
	timestamp: Date;
	actor?: string;
}

// ============================================
// Helper Functions
// ============================================

function getSeverityColor(severity: string): string {
	switch (severity) {
		case "LOW":
			return "bg-blue-500/10 text-blue-400 border-blue-500/20";
		case "MEDIUM":
			return "bg-warning/50 text-warning-foreground border-warning";
		case "HIGH":
			return "bg-orange-500/10 text-orange-400 border-orange-500/20";
		case "CRITICAL":
			return "bg-red-500/10 text-red-400 border-red-500/20";
		default:
			return "bg-secondary/10 text-muted-foreground";
	}
}

function formatDate(date: Date): string {
	return new Intl.DateTimeFormat("en-ZA", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}

// ============================================
// Metric Card Component
// ============================================

function MetricCard({
	icon: Icon,
	label,
	value,
	status,
}: {
	icon: React.ElementType;
	label: string;
	value: React.ReactNode;
	status?: "good" | "warning" | "danger" | "neutral";
}) {
	const statusColors = {
		good: "text-emerald-400",
		warning: "text-warning-foreground",
		danger: "text-red-400",
		neutral: "text-muted-foreground",
	};

	return (
		<div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/5 border border-secondary/10">
			<div className="p-2 rounded-lg bg-secondary/10">
				<Icon className="h-4 w-4 text-muted-foreground" />
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-[10px] uppercase tracking-wider text-muted-foreground">
					{label}
				</p>
				<p className={cn("text-sm font-semibold", status && statusColors[status])}>
					{value}
				</p>
			</div>
		</div>
	);
}

// ============================================
// Document Card Component
// ============================================

function DocumentCard({
	name,
	type,
	verified,
	uploadDate,
	onView,
}: {
	name: string;
	type: string;
	verified: boolean;
	uploadDate?: Date;
	onView?: () => void;
}) {
	return (
		<div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/5 border border-secondary/10 hover:bg-secondary/10 transition-colors">
			<div
				className={cn(
					"p-2 rounded-lg",
					verified ? "bg-emerald-500/10" : "bg-warning/50"
				)}>
				<RiFileTextLine
					className={cn(
						"h-5 w-5",
						verified ? "text-emerald-400" : "text-warning-foreground"
					)}
				/>
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium truncate">{name}</p>
				<div className="flex items-center gap-2 text-[10px] text-muted-foreground">
					<span>{type}</span>
					{uploadDate && (
						<>
							<span>•</span>
							<span>{formatDate(uploadDate)}</span>
						</>
					)}
				</div>
			</div>
			<div className="flex items-center gap-2">
				{verified ? (
					<Badge
						variant="outline"
						className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
						Verified
					</Badge>
				) : (
					<Badge
						variant="outline"
						className="bg-warning/50 text-warning-foreground border-warning text-[10px]">
						Pending
					</Badge>
				)}
				{onView && (
					<Button variant="ghost" size="icon" className="h-7 w-7" onClick={onView}>
						<RiEyeLine className="h-3.5 w-3.5" />
					</Button>
				)}
			</div>
		</div>
	);
}

// ============================================
// Timeline Event Component
// ============================================

function TimelineEventCard({ event }: { event: TimelineEvent }) {
	const typeConfig = {
		stage_change: {
			icon: RiHistoryLine,
			color: "text-blue-400",
			bg: "bg-blue-500/10",
		},
		agent_dispatch: {
			icon: RiExternalLinkLine,
			color: "text-purple-400",
			bg: "bg-purple-500/10",
		},
		agent_callback: {
			icon: RiCheckLine,
			color: "text-emerald-400",
			bg: "bg-emerald-500/10",
		},
		human_override: {
			icon: RiUserLine,
			color: "text-warning-foreground",
			bg: "bg-warning/50",
		},
		error: { icon: RiAlertLine, color: "text-red-400", bg: "bg-red-500/10" },
	};

	const config = typeConfig[event.type];
	const Icon = config.icon;

	return (
		<div className="flex gap-3">
			<div className={cn("p-1.5 rounded-lg h-fit", config.bg)}>
				<Icon className={cn("h-3.5 w-3.5", config.color)} />
			</div>
			<div className="flex-1 min-w-0 pb-4">
				<div className="flex items-start justify-between gap-2">
					<p className="text-sm font-medium">{event.title}</p>
					<span className="text-[10px] text-muted-foreground whitespace-nowrap">
						{formatDate(event.timestamp)}
					</span>
				</div>
				<p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
				{event.actor && (
					<p className="text-[10px] text-muted-foreground/70 mt-1">By: {event.actor}</p>
				)}
			</div>
		</div>
	);
}

// ============================================
// Risk Review Detail Sheet
// ============================================

export function RiskReviewDetail({
	item,
	open,
	onOpenChange,
	onApprove,
	onReject,
}: RiskReviewDetailProps) {
	const [activeTab, setActiveTab] = React.useState("overview");
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const [actionType, setActionType] = React.useState<"approve" | "reject" | null>(null);

	// Override modal state (SOP v3.1.0 — "Why" modal)
	const [showOverrideModal, setShowOverrideModal] = React.useState(false);
	const [pendingAction, setPendingAction] = React.useState<"approve" | "reject" | null>(
		null
	);
	const [overrideCategory, setOverrideCategory] = React.useState<OverrideCategory | null>(
		null
	);
	const [overrideReason, setOverrideReason] = React.useState("");

	// Collapsible section state (SOP v3.1.0 — auto-collapse low-risk)
	const [collapsedSections, setCollapsedSections] = React.useState<
		Record<string, boolean>
	>({});

	/**
	 * Determine if a decision disagrees with the AI recommendation.
	 * If AI says APPROVE and user clicks Reject, or AI says DECLINE and user clicks Approve.
	 */
	const isOverride = React.useCallback(
		(action: "approve" | "reject"): boolean => {
			if (!item?.recommendation) return false;
			const rec = item.recommendation.toUpperCase();
			if (action === "approve" && (rec === "DECLINE" || rec === "REJECT")) return true;
			if (action === "reject" && rec === "APPROVE") return true;
			return false;
		},
		[item?.recommendation]
	);

	const toggleSection = React.useCallback((sectionId: string) => {
		setCollapsedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
	}, []);

	/**
	 * Initialize collapsed state based on risk flag severity.
	 * HIGH/CRITICAL → expanded, LOW/MEDIUM → collapsed.
	 */
	React.useEffect(() => {
		if (!item?.riskFlags) return;
		const initial: Record<string, boolean> = {};
		item.riskFlags.forEach((flag, idx) => {
			const key = `flag_${idx}`;
			// Collapse LOW/MEDIUM, expand HIGH/CRITICAL
			initial[key] = flag.severity === "LOW" || flag.severity === "MEDIUM";
		});
		// Collapse "documents" section if all docs are verified
		if (item.bankStatementVerified && item.accountantLetterVerified) {
			initial.documents_section = true;
		}
		setCollapsedSections(initial);
	}, [item?.riskFlags, item?.bankStatementVerified, item?.accountantLetterVerified]);

	/**
	 * Determine review type based on workflow stage (V2 Workflow Phase 3)
	 * Stage 3 = Procurement review, Stage 4 = General/Final review
	 */
	const reviewType: "procurement" | "general" =
		item?.reviewType || (item?.stage === 3 ? "procurement" : "general");

	/**
	 * Get the appropriate API endpoint based on review type
	 */
	const _getApiEndpoint = () => {
		return reviewType === "procurement"
			? "/api/risk-decision/procurement"
			: "/api/risk-decision";
	};

	/**
	 * Handle approve action — intercept if overriding AI recommendation
	 */
	const handleApprove = async () => {
		if (!item) return;
		if (isOverride("approve")) {
			setPendingAction("approve");
			setShowOverrideModal(true);
			return;
		}
		setIsSubmitting(true);
		setActionType("approve");
		try {
			await onApprove(item.id, `Approved via ${reviewType} review`);
			onOpenChange(false);
		} finally {
			setIsSubmitting(false);
			setActionType(null);
		}
	};

	/**
	 * Handle reject action — intercept if overriding AI recommendation
	 */
	const handleReject = async () => {
		if (!item) return;
		if (isOverride("reject")) {
			setPendingAction("reject");
			setShowOverrideModal(true);
			return;
		}
		setIsSubmitting(true);
		setActionType("reject");
		try {
			await onReject(item.id, `Rejected via ${reviewType} review`);
			onOpenChange(false);
		} finally {
			setIsSubmitting(false);
			setActionType(null);
		}
	};

	/**
	 * Submit override after selecting category and reason in the modal
	 */
	const handleOverrideSubmit = async () => {
		if (!(item && pendingAction && overrideCategory && overrideReason.trim())) return;
		setIsSubmitting(true);
		setActionType(pendingAction);
		try {
			const reasonWithCategory = `[${overrideCategory}] ${overrideReason}`;
			if (pendingAction === "approve") {
				await onApprove(item.id, reasonWithCategory);
			} else {
				await onReject(item.id, reasonWithCategory);
			}
			setShowOverrideModal(false);
			setPendingAction(null);
			setOverrideCategory(null);
			setOverrideReason("");
			onOpenChange(false);
		} finally {
			setIsSubmitting(false);
			setActionType(null);
		}
	};

	// Mock timeline events - in production, fetch from API
	const mockTimeline: TimelineEvent[] = item
		? [
				{
					id: "1",
					type: "stage_change",
					title: "Workflow Started",
					description: "Applicant captured and workflow initiated",
					timestamp: item.createdAt,
					actor: "System",
				},
				{
					id: "2",
					type: "agent_dispatch",
					title: "ITC Check Initiated",
					description: `Credit score returned: ${item.itcScore || "Pending"}`,
					timestamp: new Date(item.createdAt.getTime() + 60000),
					actor: "ITC Service",
				},
				{
					id: "3",
					type: "stage_change",
					title: "FICA Documents Received",
					description: "Bank statement and accountant letter uploaded",
					timestamp: new Date(item.createdAt.getTime() + 3600000),
				},
				{
					id: "4",
					type: "agent_callback",
					title: "AI FICA Analysis Complete",
					description: `Trust score: ${item.aiTrustScore}%. Recommendation: ${item.recommendation || "Manual Review"}`,
					timestamp: new Date(item.createdAt.getTime() + 3660000),
					actor: "FICA AI Agent",
				},
				{
					id: "5",
					type: "human_override",
					title: "Awaiting Risk Manager Decision",
					description: "Workflow paused for human review",
					timestamp: new Date(),
				},
			]
		: [];

	if (!item) return null;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full sm:max-w-xl border-secondary/20 bg-transparent bg-linear-to-br from-slate-950/60 to-slate-950/30 backdrop-blur-lg overflow-y-auto">
				<SheetHeader className="pb-4">
					<div className="flex items-start justify-between">
						<div>
							<SheetTitle className="text-xl text-white/90">{item.clientName}</SheetTitle>
							<SheetDescription className="flex items-center gap-2 mt-1 flex-wrap text-accent-foreground">
								<RiBuilding2Line className="h-3.5 w-3.5 text-white" />
								{item.companyName}
								<span className="text-muted">•</span>
								<Badge
									variant="secondary"
									className=" bg-white/10 text-[10px] text-white/90">
									WF-{item.workflowId}
								</Badge>
								{/* Review Type Badge (Phase 3) */}
								<Badge
									className={cn(
										"text-[13px] gap-2 h-8",
										reviewType === "procurement"
											? "bg-indigo-500/40 text-indigo-200 border-indigo-500/20"
											: "bg-indigo-500/40 text-indigo-300 border-blue-500/20"
									)}>
									{reviewType === "procurement" ? (
										<span className="flex items-center gap-2">
											<RiShoppingBag3Line className="h-4 w-4 text-indigo-400" />
											Procurement
										</span>
									) : (
										<span className="flex items-center gap-2">
											<RiShieldCheckLine className="h-4 w-4" />
											General
										</span>
									)}
								</Badge>
							</SheetDescription>
						</div>
						<div
							className={cn(
								"px-3 py-1.5 bg-secondary/10 w-20 rounded-lg text-center",
								item.aiTrustScore && item.aiTrustScore >= 80
									? "bg-emerald-500/10"
									: item.aiTrustScore && item.aiTrustScore >= 60
										? "bg-warning"
										: "bg-destructive-foreground/70"
							)}>
							<p className="text-[10px] text-white">AI Score</p>
							<p className="text-xl font-bold text-white">{item.aiTrustScore || "N/A"}</p>
						</div>
					</div>
				</SheetHeader>

				<Tabs value={activeTab} onValueChange={setActiveTab} className="mt-0">
					<TabsList className="w-full bg-secondary/10">
						<TabsTrigger value="overview" className="flex-1 text-xs">
							Overview
						</TabsTrigger>
						<TabsTrigger value="documents" className="flex-1 text-xs">
							Documents
						</TabsTrigger>
						<TabsTrigger value="risks" className="flex-1 text-xs">
							Risk Flags
						</TabsTrigger>
						<TabsTrigger value="timeline" className="flex-1 text-xs">
							Timeline
						</TabsTrigger>
					</TabsList>

					{/* Overview Tab */}
					<TabsContent value="overview" className="mt-0 space-y-4">
						{/* Key Metrics */}
						<div className="grid grid-cols-2 gap-3">
							<MetricCard
								icon={RiPercentLine}
								label="AI Trust Score"
								value={`${item.aiTrustScore || 0}%`}
								status={
									(item.aiTrustScore || 0) >= 80
										? "good"
										: (item.aiTrustScore || 0) >= 60
											? "warning"
											: "danger"
								}
							/>
							<MetricCard
								icon={RiBankLine}
								label="ITC Credit Score"
								value={item.itcScore || "N/A"}
								status={
									(item.itcScore || 0) >= 700
										? "good"
										: (item.itcScore || 0) >= 600
											? "warning"
											: "danger"
								}
							/>
							<MetricCard
								icon={RiAlertLine}
								label="Risk Flags"
								value={item.riskFlags?.length || 0}
								status={(item.riskFlags?.length || 0) === 0 ? "good" : "warning"}
							/>
							<MetricCard
								icon={RiShieldCheckLine}
								label="Name Match"
								value={item.nameMatchVerified ? "Verified" : "Mismatch"}
								status={item.nameMatchVerified ? "good" : "danger"}
							/>
						</div>

						{/* AI Summary */}
						{item.summary && (
							<div className="p-4 rounded-lg bg-secondary/5 border border-secondary/10">
								<h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
									<RiShieldCheckLine className="h-4 w-4 text-primary" />
									AI Analysis Summary
								</h4>
								<p className="text-sm text-muted-foreground leading-relaxed">
									{item.summary}
								</p>
							</div>
						)}

						{/* AI Explanation - Why this score? */}
						{item.reasoning && (
							<div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
								<h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
									<RiAlertLine className="h-4 w-4 text-primary" />
									Why This Score?
								</h4>
								<p className="text-sm text-foreground leading-relaxed">
									{item.reasoning}
								</p>

								{item.riskFlags && item.riskFlags.length > 0 && (
									<div className="mt-4 pt-4 border-t border-primary/10">
										<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
											Identified Risk Factors
										</p>
										<div className="space-y-2">
											{item.riskFlags.map((flag, idx) => (
												<div
													key={idx}
													className="flex items-start gap-2 bg-background/40 p-2 rounded border border-primary/10">
													<Badge
														variant="outline"
														className={cn(
															"text-[10px] shrink-0",
															getSeverityColor(flag.severity)
														)}>
														{flag.severity}
													</Badge>
													<div className="text-xs">
														<span className="font-semibold text-foreground/80">
															{flag.type.replace(/_/g, " ")}
														</span>
														<span className="mx-1 text-muted-foreground">-</span>
														<span className="text-muted-foreground">
															{flag.description}
														</span>
													</div>
												</div>
											))}
										</div>
									</div>
								)}

								{item.analysisConfidence && (
									<p className="text-xs text-muted-foreground mt-3">
										AI Confidence: {item.analysisConfidence}%
									</p>
								)}
							</div>
						)}

						{/* Recommendation */}
						<div className="p-4 rounded-lg bg-secondary/5 border border-secondary/10">
							<h4 className="text-sm font-semibold mb-2">Recommendation</h4>
							<Badge
								className={cn(
									"text-xs",
									item.recommendation === "APPROVE"
										? "bg-emerald-500/10 text-emerald-400"
										: item.recommendation === "MANUAL_REVIEW"
											? "bg-warning/50 text-warning-foreground"
											: "bg-red-500/10 text-red-400"
								)}>
								{item.recommendation || "Manual Review Required"}
							</Badge>
						</div>
					</TabsContent>

					{/* Documents Tab */}
					<TabsContent value="documents" className="mt-0 space-y-3">
						<DocumentCard
							name="Bank Statement - Jan to Mar 2026"
							type="Bank Statement"
							verified={item.bankStatementVerified}
							uploadDate={item.createdAt}
						/>
						<DocumentCard
							name="Accountant Letter"
							type="Verification Letter"
							verified={item.accountantLetterVerified}
							uploadDate={item.createdAt}
						/>
						<DocumentCard
							name="Company Registration"
							type="CIPC Document"
							verified={true}
							uploadDate={item.createdAt}
						/>
					</TabsContent>

					{/* Risk Flags Tab — Collapsible sections (SOP v3.1.0) */}
					<TabsContent value="risks" className="mt-0 space-y-3">
						{item.riskFlags && item.riskFlags.length > 0 ? (
							<>
								{/* Summary bar */}
								<div className="flex items-center justify-between p-3 rounded-lg bg-secondary/5 border border-secondary/10">
									<span className="text-xs text-muted-foreground">
										{
											item.riskFlags.filter(
												f => f.severity === "HIGH" || f.severity === "CRITICAL"
											).length
										}{" "}
										critical/high •{" "}
										{
											item.riskFlags.filter(
												f => f.severity === "LOW" || f.severity === "MEDIUM"
											).length
										}{" "}
										low/medium
									</span>
									<Button
										variant="ghost"
										size="sm"
										className="text-xs h-7"
										onClick={() => {
											const allExpanded = Object.values(collapsedSections).every(v => !v);
											const next: Record<string, boolean> = {};
											item.riskFlags?.forEach((_, idx) => {
												next[`flag_${idx}`] = !allExpanded;
											});
											setCollapsedSections(next);
										}}>
										{Object.values(collapsedSections).every(v => !v)
											? "Collapse All"
											: "Expand All"}
									</Button>
								</div>

								{item.riskFlags.map((flag, idx) => {
									const sectionKey = `flag_${idx}`;
									const isCollapsed = collapsedSections[sectionKey] ?? false;
									const isHighSeverity =
										flag.severity === "HIGH" || flag.severity === "CRITICAL";

									return (
										<div
											key={idx}
											className={cn(
												"rounded-lg border transition-all duration-200",
												isHighSeverity
													? "bg-red-500/5 border-red-500/20"
													: "bg-secondary/5 border-secondary/10"
											)}>
											{/* Clickable header */}
											<button
												type="button"
												className="flex items-center justify-between gap-3 w-full p-4 text-left"
												onClick={() => toggleSection(sectionKey)}>
												<div className="flex items-center gap-2">
													<Badge
														variant="outline"
														className={cn(
															"text-[10px]",
															getSeverityColor(flag.severity)
														)}>
														{flag.severity}
													</Badge>
													<h4 className="text-sm font-semibold">
														{flag.type.replace(/_/g, " ")}
													</h4>
												</div>
												{isCollapsed ? (
													<RiArrowRightSLine className="h-4 w-4 text-muted-foreground shrink-0" />
												) : (
													<RiArrowDownSLine className="h-4 w-4 text-muted-foreground shrink-0" />
												)}
											</button>

											{/* Collapsible content */}
											{!isCollapsed && (
												<div className="px-4 pb-4">
													<p className="text-sm text-muted-foreground">
														{flag.description}
													</p>
												</div>
											)}
										</div>
									);
								})}
							</>
						) : (
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<div className="p-3 rounded-full bg-emerald-500/10 mb-3">
									<RiCheckLine className="h-6 w-6 text-emerald-400" />
								</div>
								<p className="text-sm font-medium">No Risk Flags</p>
								<p className="text-xs text-muted-foreground mt-1">
									No concerning patterns detected
								</p>
							</div>
						)}
					</TabsContent>

					{/* Timeline Tab */}
					<TabsContent value="timeline" className="mt-0">
						<div className="relative pl-2 border-l border-secondary/20 ml-2">
							{mockTimeline.map(event => (
								<TimelineEventCard key={event.id} event={event} />
							))}
						</div>
					</TabsContent>
				</Tabs>

				{/* Action Buttons - Always visible */}
				<Separator className="my-0 bg-secondary/10" />

				{/* Review Type Context (Phase 3) */}
				<div className="mb-0 p-3 rounded-lg bg-white/10 border border-secondary/10 my-4">
					<p className="text-xs text-muted-foreground">
						<span className="font-medium text-accent-foreground">Review Type:</span>{" "}
						{reviewType === "procurement" ? (
							<span className="text-white/90">
								Procurement Review (Stage 3) - Routes to{" "}
								<code className="text-emerald-100">/api/risk-decision/procurement</code>
							</span>
						) : (
							<>
								General Review (Stage 4) - Routes to{" "}
								<code className="text-blue-400">/api/risk-decision</code>
							</>
						)}
					</p>

					{/* Procurement-specific data display */}
					{reviewType === "procurement" && item.procurementScore !== undefined && (
						<div className="mt-2 pt-2 border-t border-secondary/10 grid grid-cols-2 gap-2">
							<div>
								<p className="text-[10px] text-muted-foreground uppercase">
									ProcureCheck Score
								</p>
								<p
									className={cn(
										"text-sm font-semibold",
										item.procurementScore <= 30
											? "text-emerald-400"
											: item.procurementScore <= 60
												? "text-yellow-400"
												: "text-red-400"
									)}>
									{item.procurementScore}%
								</p>
							</div>
							<div>
								<p className="text-[10px] text-muted-foreground uppercase">Anomalies</p>
								<p
									className={cn(
										"text-sm font-semibold",
										item.hasAnomalies ? "text-red-400" : "text-emerald-400"
									)}>
									{item.hasAnomalies ? "Detected" : "None"}
								</p>
							</div>
						</div>
					)}

					{/* Anomaly list if present */}
					{reviewType === "procurement" &&
						item.anomalies &&
						item.anomalies.length > 0 && (
							<div className="mt-2 pt-2 border-t border-secondary/10">
								<p className="text-[10px] text-muted-foreground uppercase mb-1">
									Anomaly Details
								</p>
								<ul className="text-xs text-red-400 space-y-0.5">
									{item.anomalies.map((anomaly, idx) => (
										<li key={idx} className="flex items-start gap-1">
											<RiAlertLine className="h-3 w-3 shrink-0 mt-0.5" />
											{anomaly}
										</li>
									))}
								</ul>
							</div>
						)}
				</div>

				<div className="flex gap-4 mt-4">
					<Button
						variant="destructive"
						disabled={isSubmitting}
						className="flex-1 border-red-500/20 bg-destructive-foreground/90 shadow-md shadow-red-900/70 w-fit max-w-[100px] text-white/90 hover:bg-red-500/10"
						onClick={handleReject}>
						{isSubmitting && actionType === "reject" ? (
							<RiLoader4Line className="h-4 w-4 mr-0 animate-spin" />
						) : (
							<RiCloseLine className="h-4 w-4 mr-0" />
						)}
						Reject
					</Button>
					<Button
						disabled={isSubmitting}
						className="flex-1 bg-emerald-600 hover:bg-emerald-700"
						onClick={handleApprove}>
						{isSubmitting && actionType === "approve" ? (
							<RiLoader4Line className="h-4 w-4 mr-2 animate-spin" />
						) : (
							<RiCheckLine className="h-4 w-4 mr-2" />
						)}
						Approve
					</Button>
				</div>

				{/* Override "Why" Modal (SOP v3.1.0) */}
				<Dialog
					open={showOverrideModal}
					onOpenChange={open => {
						setShowOverrideModal(open);
						if (!open) {
							setPendingAction(null);
							setOverrideCategory(null);
							setOverrideReason("");
						}
					}}>
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<RiQuestionLine className="h-5 w-5 text-amber-500" />
								Why are you overriding the AI recommendation?
							</DialogTitle>
							<DialogDescription>
								The AI recommended <strong>{item.recommendation || "—"}</strong> but you
								are choosing to <strong>{pendingAction}</strong>. Please select a reason
								category and provide a justification.
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-4 py-2">
							{/* Category selection */}
							<div className="space-y-2">
								<Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
									Override Category <span className="text-destructive">*</span>
								</Label>
								<div className="grid gap-2">
									{OVERRIDE_CATEGORIES.map(cat => (
										<button
											key={cat.value}
											type="button"
											className={cn(
												"flex flex-col items-start p-3 rounded-lg border text-left transition-all duration-150",
												overrideCategory === cat.value
													? "border-primary bg-primary/10 ring-1 ring-primary/30"
													: "border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5"
											)}
											onClick={() => setOverrideCategory(cat.value)}>
											<span className="text-sm font-medium">{cat.label}</span>
											<span className="text-xs text-muted-foreground mt-0.5">
												{cat.description}
											</span>
										</button>
									))}
								</div>
							</div>

							{/* Reason text */}
							<div className="space-y-1.5">
								<Label htmlFor="overrideReason" className="text-xs font-medium">
									Justification <span className="text-destructive">*</span>
								</Label>
								<Textarea
									id="overrideReason"
									placeholder="Explain why you are overriding the AI recommendation..."
									value={overrideReason}
									onChange={e => setOverrideReason(e.target.value)}
									rows={3}
								/>
							</div>
						</div>

						<DialogFooter className="gap-2">
							<Button
								variant="outline"
								onClick={() => setShowOverrideModal(false)}
								disabled={isSubmitting}>
								Cancel
							</Button>
							<Button
								onClick={handleOverrideSubmit}
								disabled={isSubmitting || !overrideCategory || !overrideReason.trim()}
								className={cn(
									pendingAction === "approve"
										? "bg-emerald-600 hover:bg-emerald-700"
										: "bg-destructive hover:bg-destructive/90"
								)}>
								{isSubmitting ? (
									<RiLoader4Line className="h-4 w-4 mr-2 animate-spin" />
								) : null}
								Confirm Override & {pendingAction === "approve" ? "Approve" : "Reject"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</SheetContent>
		</Sheet>
	);
}

export default RiskReviewDetail;
