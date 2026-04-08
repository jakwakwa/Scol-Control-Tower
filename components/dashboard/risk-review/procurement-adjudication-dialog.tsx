"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
	ADJUDICATION_CATEGORIES,
	ADJUDICATION_DETAILS_BY_CATEGORY,
	ADJUDICATION_REASON_LABELS,
	type AdjudicationCategory,
} from "@/lib/constants/adjudication-taxonomy";
import type { RiskReviewData } from "@/lib/risk-review/types";

const ADJUDICATION_NOTES_MAX_LENGTH = 300;
const ADJUDICATION_DETAIL_MAX_LENGTH = 500;

type AdjudicationErrors = {
	adjudicationReason?: string;
	adjudicationDetailItem?: string;
	adjudicationDetail?: string;
	adjudicationNotes?: string;
};

type ProcurementAdjudicationDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	workflowId: number;
	applicantId: number;
	entityName: string;
	data: RiskReviewData;
};

function buildValidationErrors(input: {
	adjudicationReason: AdjudicationCategory | "";
	adjudicationDetailItem: string;
	adjudicationDetail: string;
	adjudicationNotes: string;
	requiresReasonDetailSelection: boolean;
	requiresReasonDetailText: boolean;
	requiresAdjudicationNotes: boolean;
}): AdjudicationErrors {
	const errors: AdjudicationErrors = {};

	if (!input.adjudicationReason) {
		errors.adjudicationReason = "Select a decision category.";
	}

	if (input.requiresReasonDetailSelection && !input.adjudicationDetailItem) {
		errors.adjudicationDetailItem = "Select a reason.";
	}

	if (input.requiresReasonDetailText && input.adjudicationDetail.trim().length === 0) {
		errors.adjudicationDetail = "Enter details when category is Other.";
	}

	if (input.adjudicationDetail.length > ADJUDICATION_DETAIL_MAX_LENGTH) {
		errors.adjudicationDetail = `Reason details must be ${ADJUDICATION_DETAIL_MAX_LENGTH} characters or fewer.`;
	}

	if (input.requiresAdjudicationNotes && input.adjudicationNotes.trim().length === 0) {
		errors.adjudicationNotes =
			"Notes are required when the selected category has reasons.";
	}

	if (input.adjudicationNotes.length > ADJUDICATION_NOTES_MAX_LENGTH) {
		errors.adjudicationNotes = `Notes must be ${ADJUDICATION_NOTES_MAX_LENGTH} characters or fewer.`;
	}

	return errors;
}

function buildProcureCheckResult(data: RiskReviewData): {
	riskScore: number;
	anomalies: string[];
	recommendedAction: "APPROVE" | "MANUAL_REVIEW" | "DECLINE";
	rawData: Record<string, unknown>;
} {
	const procurementData = data.procurementData;

	if (!procurementData) {
		return {
			riskScore: 50,
			anomalies: ["Procurement data unavailable at time of adjudication"],
			recommendedAction: "MANUAL_REVIEW",
			rawData: { reason: "missing_procurement_data" },
		};
	}

	const anomalies = procurementData.categories.flatMap(category =>
		category.checks
			.filter(check => check.result === "FLAGGED")
			.map(check => `${category.id.toUpperCase()}: ${check.name}`)
	);

	const hasFlagged = procurementData.summary.categories.some(c => c.status === "FLAGGED");
	const allCleared = procurementData.summary.categories.every(
		c => c.status === "CLEARED"
	);

	const recommendedAction: "APPROVE" | "MANUAL_REVIEW" | "DECLINE" = hasFlagged
		? "DECLINE"
		: allCleared
			? "APPROVE"
			: "MANUAL_REVIEW";

	const riskScore = Math.min(100, Math.max(0, data.globalData.overallRiskScore || 50));

	return {
		riskScore,
		anomalies,
		recommendedAction,
		rawData: {
			vendorId: procurementData.vendorId,
			checkedAt: procurementData.checkedAt,
			categorySummary: procurementData.summary.categories,
		},
	};
}

export function ProcurementAdjudicationDialog({
	open,
	onOpenChange,
	workflowId,
	applicantId,
	entityName,
	data,
}: ProcurementAdjudicationDialogProps) {
	const [adjudicationReason, setAdjudicationReason] = useState<AdjudicationCategory | "">(
		""
	);
	const [adjudicationDetailItem, setAdjudicationDetailItem] = useState("");
	const [adjudicationDetail, setAdjudicationDetail] = useState("");
	const [adjudicationNotes, setAdjudicationNotes] = useState("");
	const [adjudicationSubmitting, setAdjudicationSubmitting] = useState(false);
	const [adjudicationResult, setAdjudicationResult] = useState<{
		success: boolean;
		message: string;
	} | null>(null);

	const adjudicationDetailOptions = adjudicationReason
		? ADJUDICATION_DETAILS_BY_CATEGORY[adjudicationReason]
		: undefined;
	const requiresReasonDetailSelection =
		adjudicationReason !== "OTHER" &&
		Boolean(adjudicationReason && adjudicationDetailOptions?.length);
	const requiresReasonDetailText = adjudicationReason === "OTHER";
	const requiresAdjudicationNotes = requiresReasonDetailSelection;

	const adjudicationErrors = useMemo(
		() =>
			buildValidationErrors({
				adjudicationReason,
				adjudicationDetailItem,
				adjudicationDetail,
				adjudicationNotes,
				requiresReasonDetailSelection,
				requiresReasonDetailText,
				requiresAdjudicationNotes,
			}),
		[
			adjudicationReason,
			adjudicationDetail,
			adjudicationDetailItem,
			adjudicationNotes,
			requiresAdjudicationNotes,
			requiresReasonDetailSelection,
			requiresReasonDetailText,
		]
	);

	const adjudicationCanSubmit = Object.keys(adjudicationErrors).length === 0;

	useEffect(() => {
		if (!open) return;
		setAdjudicationReason("");
		setAdjudicationDetailItem("");
		setAdjudicationDetail("");
		setAdjudicationNotes("");
		setAdjudicationResult(null);
		setAdjudicationSubmitting(false);
	}, [open]);

	const handleReasonChange = (value: AdjudicationCategory) => {
		setAdjudicationReason(value);
		setAdjudicationDetailItem("");
		setAdjudicationDetail("");
	};

	const handleAdjudicate = async (outcome: "CLEARED" | "DENIED") => {
		if (!(adjudicationCanSubmit && adjudicationReason)) {
			toast.error("Please complete the required adjudication fields.");
			return;
		}

		setAdjudicationSubmitting(true);
		setAdjudicationResult(null);

		try {
			const procureCheckResult = buildProcureCheckResult(data);
			const response = await fetch("/api/risk-decision/procurement", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workflowId,
					applicantId,
					procureCheckResult,
					decision: {
						outcome,
						adjudicationReason,
						adjudicationDetail: requiresReasonDetailText
							? adjudicationDetail.trim()
							: adjudicationDetailItem,
						adjudicationNotes: adjudicationNotes.trim(),
					},
				}),
			});
			const body = await response.json();
			if (!response.ok) {
				setAdjudicationResult({
					success: false,
					message: body.error || "Request failed",
				});
				toast.error(body.error || "Failed to submit procurement decision.");
				return;
			}

			setAdjudicationResult({
				success: true,
				message: `Procurement decision recorded: ${outcome}`,
			});
			setTimeout(() => onOpenChange(false), 1500);
		} catch (error) {
			setAdjudicationResult({
				success: false,
				message: error instanceof Error ? error.message : "Network error",
			});
			toast.error("Failed to submit procurement decision.");
		} finally {
			setAdjudicationSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Procurement Adjudication</DialogTitle>
					<DialogDescription>
						Clear or deny the procurement check for {entityName}. This decision affects
						ProcureCheck evidence only — credit, sanctions, and FICA are adjudicated
						separately.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="procurement-decision-reason">Decision Category *</Label>
						<Select
							value={adjudicationReason}
							onValueChange={value => handleReasonChange(value as AdjudicationCategory)}
							disabled={adjudicationSubmitting}>
							<SelectTrigger id="procurement-decision-reason" className="w-full">
								<SelectValue placeholder="Select decision category" />
							</SelectTrigger>
							<SelectContent>
								{ADJUDICATION_CATEGORIES.map(reason => (
									<SelectItem key={reason} value={reason}>
										{ADJUDICATION_REASON_LABELS[reason]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{adjudicationErrors.adjudicationReason && (
							<p className="text-sm text-destructive">
								{adjudicationErrors.adjudicationReason}
							</p>
						)}
					</div>

					{requiresReasonDetailSelection && (
						<div className="space-y-2">
							<Label htmlFor="procurement-adjudication-detail-item">Reason *</Label>
							<Select
								value={adjudicationDetailItem}
								onValueChange={setAdjudicationDetailItem}
								disabled={adjudicationSubmitting}>
								<SelectTrigger
									id="procurement-adjudication-detail-item"
									className="w-full">
									<SelectValue placeholder="Select a reason" />
								</SelectTrigger>
								<SelectContent>
									{adjudicationDetailOptions?.map(detail => (
										<SelectItem key={detail.value} value={detail.value}>
											{detail.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{adjudicationErrors.adjudicationDetailItem && (
								<p className="text-sm text-destructive">
									{adjudicationErrors.adjudicationDetailItem}
								</p>
							)}
						</div>
					)}

					{requiresReasonDetailText && (
						<div className="space-y-2">
							<Label htmlFor="procurement-adjudication-detail">Reason Details *</Label>
							<Textarea
								id="procurement-adjudication-detail"
								className="min-h-[100px]"
								placeholder="Provide the procurement adjudication reason details..."
								value={adjudicationDetail}
								onChange={event => setAdjudicationDetail(event.target.value)}
								disabled={adjudicationSubmitting}
								maxLength={ADJUDICATION_DETAIL_MAX_LENGTH}
							/>
							<div className="flex items-center justify-between">
								{adjudicationErrors.adjudicationDetail ? (
									<p className="text-sm text-destructive">
										{adjudicationErrors.adjudicationDetail}
									</p>
								) : (
									<span />
								)}
								<p className="text-xs text-muted-foreground">
									{adjudicationDetail.length}/{ADJUDICATION_DETAIL_MAX_LENGTH}
								</p>
							</div>
						</div>
					)}

					{!requiresReasonDetailText && (
						<div className="space-y-2">
							<Label htmlFor="procurement-adjudication-notes">
								Adjudication Notes {requiresAdjudicationNotes ? "*" : "(Optional)"}
							</Label>
							<Textarea
								id="procurement-adjudication-notes"
								className="min-h-[100px]"
								placeholder="Add any context for this procurement adjudication..."
								value={adjudicationNotes}
								onChange={event => setAdjudicationNotes(event.target.value)}
								disabled={adjudicationSubmitting}
								maxLength={ADJUDICATION_NOTES_MAX_LENGTH}
							/>
							<div className="flex items-center justify-between">
								{adjudicationErrors.adjudicationNotes ? (
									<p className="text-sm text-destructive">
										{adjudicationErrors.adjudicationNotes}
									</p>
								) : (
									<span />
								)}
								<p className="text-xs text-muted-foreground pt-2">
									{adjudicationNotes.length}/{ADJUDICATION_NOTES_MAX_LENGTH}
								</p>
							</div>
						</div>
					)}
				</div>

				{adjudicationResult && (
					<p
						className={`text-sm font-medium ${adjudicationResult.success ? "text-green-600" : "text-destructive"}`}>
						{adjudicationResult.message}
					</p>
				)}

				<DialogFooter>
					<Button
						variant="destructive"
						disabled={adjudicationSubmitting || !adjudicationCanSubmit}
						onClick={() => handleAdjudicate("DENIED")}>
						{adjudicationSubmitting ? "Submitting..." : "Deny"}
					</Button>
					<Button
						variant="default"
						disabled={adjudicationSubmitting || !adjudicationCanSubmit}
						onClick={() => handleAdjudicate("CLEARED")}>
						{adjudicationSubmitting ? "Submitting..." : "Clear"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
