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

const ADJUDICATION_NOTES_MAX_LENGTH = 300;
const ADJUDICATION_DETAIL_MAX_LENGTH = 500;

type AdjudicationErrors = {
	adjudicationReason?: string;
	adjudicationDetailItem?: string;
	adjudicationDetail?: string;
	adjudicationNotes?: string;
};

type FinalAdjudicationDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	workflowId: number;
	applicantId: number;
	entityName: string;
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

export function FinalAdjudicationDialog({
	open,
	onOpenChange,
	workflowId,
	applicantId,
	entityName,
}: FinalAdjudicationDialogProps) {
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
							onValueChange={value => handleReasonChange(value as AdjudicationCategory)}
							disabled={adjudicationSubmitting}>
							<SelectTrigger id="decision-reason" className="w-full">
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
							<Label htmlFor="adjudication-notes">
								Adjudication Notes {requiresAdjudicationNotes ? "*" : "(Optional)"}
							</Label>
							<Textarea
								id="adjudication-notes"
								className="min-h-[100px]"
								placeholder="Add any context for this final adjudication..."
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
