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
	DECISION_REASON,
	DECISION_REASON_DETAILS,
	DECISION_REASON_LABELS,
	type OverrideCategory,
} from "@/lib/constants/override-taxonomy";

const ADJUCATION_NOTES_MAX_LENGTH = 300;
const ADJUCATION_DETAIL_MAX_LENGTH = 500;

type AdjudicationErrors = {
	adjudicationReason?: string;
	adjudicationDetailItem?: string;
	adjudicationDetail?: string;
	adjucationNotes?: string;
};

type FinalAdjudicationDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	workflowId: number;
	applicantId: number;
	entityName: string;
};

function buildValidationErrors(input: {
	adjudicationReason: OverrideCategory | "";
	adjudicationDetailItem: string;
	adjudicationDetail: string;
	adjucationNotes: string;
	requiresReasonDetailSelection: boolean;
	requiresReasonDetailText: boolean;
	requiresAdjucationNotes: boolean;
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

	if (input.adjudicationDetail.length > ADJUCATION_DETAIL_MAX_LENGTH) {
		errors.adjudicationDetail = `Reason details must be ${ADJUCATION_DETAIL_MAX_LENGTH} characters or fewer.`;
	}

	if (input.requiresAdjucationNotes && input.adjucationNotes.trim().length === 0) {
		errors.adjucationNotes = "Notes are required when the selected category has reasons.";
	}

	if (input.adjucationNotes.length > ADJUCATION_NOTES_MAX_LENGTH) {
		errors.adjucationNotes = `Notes must be ${ADJUCATION_NOTES_MAX_LENGTH} characters or fewer.`;
	}

	return errors;
}

export function FinalAdjudicationDialog({
	open,
	onOpenChange,
	workflowId,
	applicantId,
	entityName,
}: FinalAdjudicationDialogProps) {
	const [adjudicationReason, setAdjudicationReason] = useState<OverrideCategory | "">("");
	const [adjudicationDetailItem, setAdjudicationDetailItem] = useState("");
	const [adjudicationDetail, setAdjudicationDetail] = useState("");
	const [adjucationNotes, setAdjucationNotes] = useState("");
	const [adjudicationSubmitting, setAdjudicationSubmitting] = useState(false);
	const [adjudicationResult, setAdjudicationResult] = useState<{
		success: boolean;
		message: string;
	} | null>(null);

	const adjudicationDetailOptions = adjudicationReason
		? DECISION_REASON_DETAILS[adjudicationReason]
		: undefined;
	const requiresReasonDetailSelection =
		adjudicationReason !== "OTHER" &&
		Boolean(adjudicationReason && adjudicationDetailOptions?.length);
	const requiresReasonDetailText = adjudicationReason === "OTHER";
	const requiresAdjucationNotes = requiresReasonDetailSelection;

	const adjudicationErrors = useMemo(
		() =>
			buildValidationErrors({
				adjudicationReason,
				adjudicationDetailItem,
				adjudicationDetail,
				adjucationNotes,
				requiresReasonDetailSelection,
				requiresReasonDetailText,
				requiresAdjucationNotes,
			}),
		[
			adjudicationReason,
			adjudicationDetail,
			adjudicationDetailItem,
			adjucationNotes,
			requiresAdjucationNotes,
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
		setAdjucationNotes("");
		setAdjudicationResult(null);
		setAdjudicationSubmitting(false);
	}, [open]);

	const handleReasonChange = (value: OverrideCategory) => {
		setAdjudicationReason(value);
		setAdjudicationDetailItem("");
		setAdjudicationDetail("");
	};

	const handleAdjudicate = async (outcome: "APPROVED" | "REJECTED") => {
		if (!adjudicationCanSubmit) {
			toast.error("Please complete the required adjudication fields.");
			return;
		}

		setAdjudicationSubmitting(true);
		setAdjudicationResult(null);

		try {
			const response = await fetch("/api/risk-decision", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workflowId,
					applicantId,
					decision: {
						outcome,
						adjudicationReason,
						adjudicationDetail: requiresReasonDetailText
							? adjudicationDetail.trim()
							: adjudicationDetailItem,
						adjucationNotes: adjucationNotes.trim(),
					},
				}),
			});
			const body = await response.json();
			if (!response.ok) {
				setAdjudicationResult({
					success: false,
					message: body.error || "Request failed",
				});
				toast.error(body.error || "Failed to submit risk decision.");
				return;
			}

			setAdjudicationResult({
				success: true,
				message: `Risk decision recorded: ${outcome}`,
			});
			setTimeout(() => onOpenChange(false), 1500);
		} catch (error) {
			setAdjudicationResult({
				success: false,
				message: error instanceof Error ? error.message : "Network error",
			});
			toast.error("Failed to submit risk decision.");
		} finally {
			setAdjudicationSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Final Adjudication</DialogTitle>
					<DialogDescription>
						Choose the adjudication category and reason for {entityName}, then submit your
						final decision to advance the workflow.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="decision-reason">Decision Category *</Label>
						<Select
							value={adjudicationReason}
							onValueChange={value => handleReasonChange(value as OverrideCategory)}
							disabled={adjudicationSubmitting}>
							<SelectTrigger id="decision-reason" className="w-full">
								<SelectValue placeholder="Select decision category" />
							</SelectTrigger>
							<SelectContent>
								{DECISION_REASON.map(reason => (
									<SelectItem key={reason} value={reason}>
										{DECISION_REASON_LABELS[reason]}
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
							<Label htmlFor="adjudication-detail-item">Reason *</Label>
							<Select
								value={adjudicationDetailItem}
								onValueChange={setAdjudicationDetailItem}
								disabled={adjudicationSubmitting}>
								<SelectTrigger id="adjudication-detail-item" className="w-full">
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
							<Label htmlFor="adjudication-detail">Reason Details *</Label>
							<Textarea
								id="adjudication-detail"
								className="min-h-[100px]"
								placeholder="Provide the adjudication reason details..."
								value={adjudicationDetail}
								onChange={event => setAdjudicationDetail(event.target.value)}
								disabled={adjudicationSubmitting}
								maxLength={ADJUCATION_DETAIL_MAX_LENGTH}
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
									{adjudicationDetail.length}/{ADJUCATION_DETAIL_MAX_LENGTH}
								</p>
							</div>
						</div>
					)}

					{!requiresReasonDetailText && (
						<div className="space-y-2">
							<Label htmlFor="adjucation-notes">
								Adjudication Notes {requiresAdjucationNotes ? "*" : "(Optional)"}
							</Label>
							<Textarea
								id="adjucation-notes"
								className="min-h-[100px]"
								placeholder="Add any context for this final adjudication..."
								value={adjucationNotes}
								onChange={event => setAdjucationNotes(event.target.value)}
								disabled={adjudicationSubmitting}
								maxLength={ADJUCATION_NOTES_MAX_LENGTH}
							/>
							<div className="flex items-center justify-between">
								{adjudicationErrors.adjucationNotes ? (
									<p className="text-sm text-destructive">
										{adjudicationErrors.adjucationNotes}
									</p>
								) : (
									<span />
								)}
								<p className="text-xs text-muted-foreground">
									{adjucationNotes.length}/{ADJUCATION_NOTES_MAX_LENGTH}
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
						onClick={() => handleAdjudicate("REJECTED")}>
						{adjudicationSubmitting ? "Submitting..." : "Reject"}
					</Button>
					<Button
						variant="default"
						disabled={adjudicationSubmitting || !adjudicationCanSubmit}
						onClick={() => handleAdjudicate("APPROVED")}>
						{adjudicationSubmitting ? "Submitting..." : "Approve"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
