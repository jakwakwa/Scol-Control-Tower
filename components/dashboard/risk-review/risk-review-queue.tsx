"use client";

import {
	RiAlarmWarningLine,
	RiAlertLine,
	RiBuilding2Line,
	RiCheckLine,
	RiCloseLine,
	RiErrorWarningLine,
	RiEyeLine,
	RiPercentLine,
	RiRefreshLine,
	RiScalesLine,
	RiShieldCheckLine,
	RiTimeLine,
} from "@remixicon/react";
import * as React from "react";
import { toast } from "sonner";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	OVERRIDE_CATEGORIES,
	OVERRIDE_CATEGORY_LABELS,
	OVERRIDE_SUBCATEGORIES,
	type OverrideCategory,
} from "@/lib/constants/override-taxonomy";
import { cn } from "@/lib/utils";

// ============================================
// Types
// ============================================

export interface RiskReviewItem {
	id: number;
	workflowId: number;
	applicantId: number;
	clientName: string;
	companyName: string;
	stage: number;
	stageName: string;
	createdAt: Date;
	// AI Analysis Data
	aiTrustScore?: number;
	riskFlags?: Array<{
		type: string;
		severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
		description: string;
		evidence?: string;
	}>;
	itcScore?: number;
	recommendation?: string;
	summary?: string;
	reasoning?: string; // AI's detailed reasoning for the score
	analysisConfidence?: number; // AI confidence in the analysis (0-100)
	// Document Status
	bankStatementVerified?: boolean;
	accountantLetterVerified?: boolean;
	nameMatchVerified?: boolean;
	accountMatchVerified?: boolean;
	// V2 Workflow - Review Type (Phase 3)
	/** Review type: "procurement" for Stage 3, "general" for Stage 4 */
	reviewType?: "procurement" | "general";
	/** Procurement-specific: ProcureCheck risk score */
	procurementScore?: number;
	/** Procurement-specific: Has anomalies detected */
	hasAnomalies?: boolean;
	/** Procurement-specific: Anomaly descriptions */
	anomalies?: string[];
	// SOP v3.1.0 — Sanctions & Escalation
	/** Current sanction status */
	sanctionStatus?: "clear" | "flagged" | "confirmed_hit";
	/** Current escalation tier (1=Normal, 2=Manager Alert, 3=Salvage) */
	escalationTier?: number;
}

interface RiskReviewCardProps {
	item: RiskReviewItem;
	onApprove: (id: number, overrideData: OverrideData) => Promise<void>;
	onReject: (id: number, overrideData: OverrideData) => Promise<void>;
	onViewDetails: (item: RiskReviewItem) => void;
}

/** Structured override data passed from the dialog */
export interface OverrideData {
	overrideCategory: OverrideCategory;
	overrideSubcategory?: string;
	overrideDetails?: string;
}

interface RiskDecisionDialogProps {
	item: RiskReviewItem | null;
	action: "approve" | "reject" | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: (overrideData: OverrideData) => Promise<void>;
}

// ============================================
// Utility Functions
// ============================================

function getTrustScoreColor(score: number): string {
	if (score >= 80) return "text-emerald-400";
	if (score >= 60) return "text-warning-foreground";
	if (score >= 40) return "text-orange-400";
	return "text-red-400";
}

function _getTrustScoreBg(score: number): string {
	if (score >= 80) return "bg-emerald-500/10";
	if (score >= 60) return "bg-warning/50";
	if (score >= 40) return "bg-orange-500/10";
	return "bg-red-500/10";
}

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

function formatTimeAgo(date: Date): string {
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);

	if (hours < 1) return "Just now";
	if (hours < 24) return `${hours}h ago`;
	return `${days}d ago`;
}

// ============================================
// Risk Score Gauge Component
// ============================================

function TrustScoreGauge({ score }: { score: number }) {
	const circumference = 2 * Math.PI * 36;
	const progress = (score / 100) * circumference;

	return (
		<div className="relative w-24 h-24">
			<svg className="w-24 h-24 transform -rotate-90">
				<title>Trust Score Gauge</title>
				{/* Background circle */}
				<circle
					cx="48"
					cy="48"
					r="36"
					stroke="currentColor"
					strokeWidth="8"
					fill="none"
					className="text-secondary/20"
				/>
				{/* Progress circle */}
				<circle
					cx="48"
					cy="48"
					r="36"
					stroke="currentColor"
					strokeWidth="8"
					fill="none"
					strokeDasharray={circumference}
					strokeDashoffset={circumference - progress}
					strokeLinecap="round"
					className={getTrustScoreColor(score)}
					style={{ transition: "stroke-dashoffset 0.5s ease-in-out" }}
				/>
			</svg>
			<div className="absolute inset-0 flex flex-col items-center justify-center">
				<span className={cn("text-2xl font-bold", getTrustScoreColor(score))}>
					{score}
				</span>
				<span className="text-[10px] text-muted-foreground">AI Score</span>
			</div>
		</div>
	);
}

// ============================================
// Risk Review Card Component
// ============================================

export function RiskReviewCard({
	item,
	onApprove,
	onReject,
	onViewDetails,
}: RiskReviewCardProps) {
	const [_isApproving, setIsApproving] = React.useState(false);
	const [showDecisionDialog, setShowDecisionDialog] = React.useState(false);
	const [decisionAction, setDecisionAction] = React.useState<"approve" | "reject" | null>(
		null
	);

	const handleApproveClick = () => {
		setDecisionAction("approve");
		setShowDecisionDialog(true);
	};

	const handleRejectClick = () => {
		setDecisionAction("reject");
		setShowDecisionDialog(true);
	};

	const handleConfirmDecision = async (overrideData: OverrideData) => {
		setIsApproving(true);
		try {
			if (decisionAction === "approve") {
				await onApprove(item.id, overrideData);
				toast.success(`Approved ${item.clientName}`, {
					description: "Application has been approved and workflow resumed.",
				});
			} else {
				await onReject(item.id, overrideData);
				toast.success(`Rejected ${item.clientName}`, {
					description: "Application has been rejected.",
				});
			}
			setShowDecisionDialog(false);
		} catch (_error) {
			toast.error("Failed to process decision");
		} finally {
			setIsApproving(false);
		}
	};

	// Sort flags by severity for display (CRITICAL > HIGH > MEDIUM > LOW)
	const displayFlags = [...(item.riskFlags || [])].sort((a, b) => {
		const weight = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
		return (
			(weight[b.severity as keyof typeof weight] || 0) -
			(weight[a.severity as keyof typeof weight] || 0)
		);
	});

	return (
		<>
			<div className="group relative overflow-hidden rounded-xl border border-secondary/10 bg-card/30 backdrop-blur-sm transition-all hover:border-secondary/20 hover:bg-card/50">
				{/* Risk Level Indicator Bar */}
				<div
					className={cn(
						"absolute left-0 top-0 h-full w-1",
						item.aiTrustScore && item.aiTrustScore >= 80
							? "bg-emerald-500"
							: item.aiTrustScore && item.aiTrustScore >= 60
								? "bg-warning"
								: "bg-red-500"
					)}
				/>

				<div className="p-5 pl-6">
					{/* Header */}
					<div className="flex items-start justify-between gap-4">
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2">
								<h3 className="text-base font-semibold ">{item.clientName}</h3>
								<Badge className="bg-secondary/10 text-secondary text-[10px] shrink-0">
									WF-{item.workflowId}
								</Badge>
								{/* SOP v3.1.0: Sanction status badge */}
								{item.sanctionStatus === "flagged" && (
									<Badge variant="destructive" className="text-[10px] shrink-0 gap-1">
										<RiAlarmWarningLine className="h-3 w-3" />
										SANCTION
									</Badge>
								)}
								{/* SOP v3.1.0: Escalation tier badge */}
								{item.escalationTier && item.escalationTier >= 2 && (
									<Badge
										variant="outline"
										className={cn(
											"text-[10px] shrink-0",
											item.escalationTier === 3
												? "bg-red-500/10 text-red-400 border-red-500/20"
												: "bg-orange-500/10 text-orange-400 border-orange-500/20"
										)}>
										Tier {item.escalationTier}
									</Badge>
								)}
							</div>
							<div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
								<span className="flex items-center gap-1">
									<RiBuilding2Line className="h-3.5 w-3.5" />
									{item.companyName}
								</span>
								<span className="flex items-center gap-1">
									<RiTimeLine className="h-3.5 w-3.5" />
									{formatTimeAgo(item.createdAt)}
								</span>
							</div>
						</div>

						{/* AI Trust Score */}
						{item.aiTrustScore !== undefined && (
							<TrustScoreGauge score={item.aiTrustScore} />
						)}
					</div>

					{/* Metrics Row */}
					<div className="grid grid-cols-3 gap-4 mt-5 py-4 border-y border-secondary/10">
						{/* ITC Score */}
						<div className="text-center">
							<div className="flex items-center justify-center gap-1.5 text-muted-foreground">
								<RiPercentLine className="h-4 w-4" />
								<span className="text-[10px] uppercase tracking-wider">ITC Score</span>
							</div>
							<p
								className={cn(
									"text-lg font-semibold mt-1",
									item.itcScore && item.itcScore >= 700
										? "text-emerald-400"
										: item.itcScore && item.itcScore >= 600
											? "text-warning-foreground"
											: "text-red-400"
								)}>
								{item.itcScore || "N/A"}
							</p>
						</div>

						{/* Risk Flags */}
						<div className="text-center">
							<div className="flex items-center justify-center gap-1.5 text-muted-foreground">
								<RiAlertLine className="h-4 w-4" />
								<span className="text-[10px] uppercase tracking-wider">Risk Flags</span>
							</div>
							<p
								className={cn(
									"text-lg font-semibold mt-1",
									displayFlags.some(
										f => f.severity === "HIGH" || f.severity === "CRITICAL"
									)
										? "text-red-400"
										: displayFlags.length > 0
											? "text-warning-foreground"
											: "text-emerald-400"
								)}>
								{item.riskFlags?.length || 0}
							</p>
						</div>

						{/* Verification Status */}
						<div className="text-center">
							<div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
								<RiShieldCheckLine className="h-4 w-4" />
								<span className="text-[10px] uppercase tracking-wider">Verified</span>
							</div>
							<div className="flex flex-col gap-0.5 text-[10px] mt-1">
								<div className="flex items-center justify-center gap-1">
									{item.bankStatementVerified ? (
										<RiCheckLine className="h-3 w-3 text-emerald-400" />
									) : (
										<RiCloseLine className="h-3 w-3 text-red-400" />
									)}
									<span className="text-muted-foreground">Bank</span>
								</div>
								<div className="flex items-center justify-center gap-1">
									{item.accountantLetterVerified ? (
										<RiCheckLine className="h-3 w-3 text-emerald-400" />
									) : (
										<RiCloseLine className="h-3 w-3 text-muted-foreground" />
									)}
									<span className="text-muted-foreground">CPA</span>
								</div>
								<div className="flex items-center justify-center gap-1">
									{item.nameMatchVerified ? (
										<RiCheckLine className="h-3 w-3 text-emerald-400" />
									) : (
										<RiCloseLine className="h-3 w-3 text-red-400" />
									)}
									<span className="text-muted-foreground">Name</span>
								</div>
							</div>
						</div>
					</div>

					{/* Risk Flags Preview */}
					{displayFlags.length > 0 && (
						<div className="mt-4">
							<p className="text-xs font-medium text-muted-foreground mb-2">
								Flags Detected:
							</p>
							<div className="flex flex-wrap gap-1.5">
								{displayFlags.slice(0, 3).map((flag, _idx) => (
									<Badge
										key={flag.type}
										variant="outline"
										className={cn("text-[10px]", getSeverityColor(flag.severity))}>
										{flag.type.replace(/_/g, " ")}
									</Badge>
								))}
								{displayFlags.length > 3 && (
									<Badge variant="outline" className="text-[10px] text-muted-foreground">
										+{displayFlags.length - 3} more
									</Badge>
								)}
							</div>
						</div>
					)}

					{/* AI Summary */}
					{item.summary && (
						<div className="mt-4 p-3 rounded-lg bg-secondary/5 border border-secondary/10">
							<p className="text-xs text-muted-foreground">{item.summary}</p>
						</div>
					)}

					{/* Actions */}
					<div className="flex items-center justify-between mt-5 pt-4 border-t border-secondary/10">
						<Button
							variant="ghost"
							size="sm"
							className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
							onClick={() => onViewDetails(item)}>
							<RiEyeLine className="h-3.5 w-3.5" />
							View Details
						</Button>

						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								className="gap-1.5 text-xs border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
								onClick={handleRejectClick}>
								<RiCloseLine className="h-3.5 w-3.5" />
								Reject
							</Button>
							<Button
								size="sm"
								className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700"
								onClick={handleApproveClick}>
								<RiCheckLine className="h-3.5 w-3.5" />
								Approve
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Decision Dialog */}
			<RiskDecisionDialog
				item={item}
				action={decisionAction}
				open={showDecisionDialog}
				onOpenChange={setShowDecisionDialog}
				onConfirm={handleConfirmDecision}
			/>
		</>
	);
}

// ============================================
// Risk Decision Dialog Component (V2 - Structured)
// ============================================

export function RiskDecisionDialog({
	item,
	action,
	open,
	onOpenChange,
	onConfirm,
}: RiskDecisionDialogProps) {
	const [overrideCategory, setOverrideCategory] = React.useState<OverrideCategory | "">(
		""
	);
	const [overrideSubcategory, setOverrideSubcategory] = React.useState<string>("");
	const [overrideDetails, setOverrideDetails] = React.useState("");
	const [isSubmitting, setIsSubmitting] = React.useState(false);

	// Get subcategories for selected category
	const subcategories = overrideCategory ? OVERRIDE_SUBCATEGORIES[overrideCategory] : [];

	// Detect potential divergence with AI recommendation
	const aiRecommendation = item?.recommendation?.toUpperCase() || "";
	const isDivergent =
		(action === "approve" &&
			(aiRecommendation.includes("DECLINE") || aiRecommendation.includes("REJECT"))) ||
		(action === "reject" &&
			(aiRecommendation.includes("APPROVE") || aiRecommendation.includes("CLEAR")));

	// Validation: category is always required, reject also needs non-AI_ALIGNED category
	const isValid =
		overrideCategory !== "" &&
		(action === "approve" || overrideCategory !== "AI_ALIGNED") &&
		(overrideCategory !== "OTHER" || overrideDetails.trim().length > 0);

	const handleSubmit = async () => {
		if (!isValid) {
			toast.error("Please complete the required fields");
			return;
		}

		setIsSubmitting(true);
		try {
			await onConfirm({
				overrideCategory: overrideCategory as OverrideCategory,
				overrideSubcategory: overrideSubcategory || undefined,
				overrideDetails: overrideDetails.trim() || undefined,
			});
			// Reset form
			setOverrideCategory("");
			setOverrideSubcategory("");
			setOverrideDetails("");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!item) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md border-secondary/20 bg-zinc-100/95 backdrop-blur-xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						{action === "approve" ? (
							<>
								<div className="p-1.5 rounded-full bg-emerald-500/10">
									<RiCheckLine className="h-4 w-4 text-emerald-400" />
								</div>
								Approve Application
							</>
						) : (
							<>
								<div className="p-1.5 rounded-full bg-red-500/10">
									<RiCloseLine className="h-4 w-4 text-red-400" />
								</div>
								Reject Application
							</>
						)}
					</DialogTitle>
					<DialogDescription>
						{action === "approve"
							? `Approve ${item.clientName}'s application. Select the category that best describes your assessment.`
							: `Reject ${item.clientName}'s application. Select the reason category for rejection.`}
					</DialogDescription>
				</DialogHeader>

				{/* AI Divergence Warning */}
				{isDivergent && (
					<div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
						<RiErrorWarningLine className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
						<div className="text-sm">
							<p className="font-medium text-amber-400">AI Divergence</p>
							<p className="text-muted-foreground mt-0.5">
								The AI recommended <strong>{item.recommendation}</strong> for this
								application. Your {action === "approve" ? "approval" : "rejection"} will
								be flagged for retraining review.
							</p>
						</div>
					</div>
				)}

				{/* Summary Card */}
				<div className="p-4 rounded-lg bg-secondary/5 border border-secondary/10 space-y-3">
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Company</span>
						<span className="font-medium">{item.companyName}</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">AI Trust Score</span>
						<span
							className={cn("font-medium", getTrustScoreColor(item.aiTrustScore || 0))}>
							{item.aiTrustScore}%
						</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">ITC Credit Score</span>
						<span className="font-medium">{item.itcScore || "N/A"}</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Risk Flags</span>
						<span
							className={cn(
								"font-medium",
								(item.riskFlags?.length || 0) > 0
									? "text-warning-foreground"
									: "text-emerald-400"
							)}>
							{item.riskFlags?.length || 0}
						</span>
					</div>
				</div>

				{/* Override Category Selector */}
				<div className="space-y-3">
					<div className="space-y-2">
						<Label htmlFor="category">Override Category *</Label>
						<Select
							value={overrideCategory}
							onValueChange={value => {
								setOverrideCategory(value as OverrideCategory);
								setOverrideSubcategory(""); // Reset subcategory on category change
							}}>
							<SelectTrigger id="category" className="bg-secondary/5 border-secondary/20">
								<SelectValue placeholder="Select override category..." />
							</SelectTrigger>
							<SelectContent>
								{OVERRIDE_CATEGORIES.map(cat => (
									<SelectItem key={cat} value={cat}>
										{OVERRIDE_CATEGORY_LABELS[cat]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Subcategory Selector (conditional) */}
					{subcategories.length > 0 && (
						<div className="space-y-2">
							<Label htmlFor="subcategory">Subcategory</Label>
							<Select value={overrideSubcategory} onValueChange={setOverrideSubcategory}>
								<SelectTrigger
									id="subcategory"
									className="bg-secondary/5 border-secondary/20">
									<SelectValue placeholder="Select specific issue..." />
								</SelectTrigger>
								<SelectContent>
									{subcategories.map(sub => (
										<SelectItem key={sub.value} value={sub.value}>
											{sub.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{/* Additional Details (always available but required for OTHER) */}
					<div className="space-y-2">
						<Label htmlFor="details">
							{overrideCategory === "OTHER" ? "Details *" : "Additional Notes"}
						</Label>
						<Textarea
							id="details"
							placeholder={
								overrideCategory === "OTHER"
									? "Describe the specific reason..."
									: "Optional additional context..."
							}
							value={overrideDetails}
							onChange={e => setOverrideDetails(e.target.value)}
							className="min-h-[80px] bg-secondary/5 border-secondary/20"
							maxLength={500}
						/>
					</div>
				</div>

				<DialogFooter className="gap-2 sm:gap-0">
					<Button
						variant="ghost"
						onClick={() => onOpenChange(false)}
						disabled={isSubmitting}>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={isSubmitting || !isValid}
						className={cn(
							action === "approve"
								? "bg-emerald-600 hover:bg-emerald-700"
								: "bg-red-600 hover:bg-red-700"
						)}>
						{isSubmitting ? (
							<RiRefreshLine className="h-4 w-4 animate-spin" />
						) : action === "approve" ? (
							"Confirm Approval"
						) : (
							"Confirm Rejection"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ============================================
// Risk Review Queue Component
// ============================================

interface RiskReviewQueueProps {
	items: RiskReviewItem[];
	isLoading?: boolean;
	onApprove: (id: number, overrideData: OverrideData) => Promise<void>;
	onReject: (id: number, overrideData: OverrideData) => Promise<void>;
	onViewDetails: (item: RiskReviewItem) => void;
	onRefresh?: () => void;
}

export function RiskReviewQueue({
	items,
	isLoading,
	onApprove,
	onReject,
	onViewDetails,
	onRefresh,
}: RiskReviewQueueProps) {
	const highPriorityItems = items.filter(item => (item.aiTrustScore || 100) < 60);
	const normalItems = items.filter(item => (item.aiTrustScore || 100) >= 60);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-20">
				<RiRefreshLine className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (items.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-center">
				<div className="p-4 rounded-full bg-emerald-500/10 mb-4">
					<RiShieldCheckLine className="h-10 w-10 text-emerald-400" />
				</div>
				<h3 className="text-lg font-semibold">All Clear!</h3>
				<p className="text-sm text-muted-foreground mt-1">
					No applications pending review at this time.
				</p>
				{onRefresh && (
					<Button variant="outline" size="sm" className="mt-4" onClick={onRefresh}>
						<RiRefreshLine className="h-4 w-4 mr-1.5" />
						Refresh
					</Button>
				)}
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* High Priority Section */}
			{highPriorityItems.length > 0 && (
				<div>
					<div className="flex items-center gap-2 mb-4">
						<RiAlertLine className="h-5 w-5 text-red-400" />
						<h2 className="text-sm font-semibold text-red-400">
							High Priority ({highPriorityItems.length})
						</h2>
					</div>
					<div className="grid gap-4 md:grid-cols-2">
						{highPriorityItems.map(item => (
							<RiskReviewCard
								key={item.id}
								item={item}
								onApprove={onApprove}
								onReject={onReject}
								onViewDetails={onViewDetails}
							/>
						))}
					</div>
				</div>
			)}

			{/* Normal Priority Section */}
			{normalItems.length > 0 && (
				<div>
					<div className="flex items-center gap-2 mb-4">
						<RiScalesLine className="h-5 w-5 text-muted-foreground" />
						<h2 className="text-sm font-semibold text-muted-foreground">
							Standard Review ({normalItems.length})
						</h2>
					</div>
					<div className="grid gap-4 md:grid-cols-2">
						{normalItems.map(item => (
							<RiskReviewCard
								key={item.id}
								item={item}
								onApprove={onApprove}
								onReject={onReject}
								onViewDetails={onViewDetails}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

export default RiskReviewQueue;
