"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface DecisionActionsProps {
	approveLabel: string;
	declineLabel: string;
	requiresDeclineReason?: boolean;
	disabled?: boolean;
	approveButtonType?: "submit" | "button";
	onApprove?: () => Promise<void>;
	onDecline: (reason?: string) => Promise<void>;
}

export default function DecisionActions({
	approveLabel,
	declineLabel,
	requiresDeclineReason = false,
	disabled = false,
	approveButtonType = "submit",
	onApprove,
	onDecline,
}: DecisionActionsProps) {
	const [showDeclineInput, setShowDeclineInput] = useState(false);
	const [reason, setReason] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-2">
				<Button
					type={approveButtonType}
					disabled={disabled || submitting}
					onClick={
						approveButtonType === "button"
							? async () => {
									if (!onApprove) return;
									setSubmitting(true);
									setError(null);
									try {
										await onApprove();
									} catch (approveError) {
										setError(
											approveError instanceof Error
												? approveError.message
												: "Approval request failed"
										);
									} finally {
										setSubmitting(false);
									}
								}
							: undefined
					}>
					{approveLabel}
				</Button>
				<Button
					type="button"
					variant="destructive"
					disabled={disabled || submitting}
					onClick={() => {
						setShowDeclineInput(true);
						setError(null);
					}}>
					{declineLabel}
				</Button>
			</div>
			{showDeclineInput ? (
				<div className="space-y-2 rounded-md border border-border p-3">
					<Textarea
						placeholder="Optional reason for decline"
						value={reason}
						onChange={event => setReason(event.target.value)}
						rows={3}
					/>
					{error ? <p className="text-xs text-destructive">{error}</p> : null}
					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							disabled={submitting}
							onClick={() => {
								setShowDeclineInput(false);
								setReason("");
								setError(null);
							}}>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							disabled={submitting}
							onClick={async () => {
								if (requiresDeclineReason && !reason.trim()) {
									setError("Please provide a reason.");
									return;
								}
								setSubmitting(true);
								setError(null);
								try {
									await onDecline(reason.trim() || undefined);
								} catch (declineError) {
									setError(
										declineError instanceof Error
											? declineError.message
											: "Decline request failed"
									);
								} finally {
									setSubmitting(false);
								}
							}}>
							Confirm decline
						</Button>
					</div>
				</div>
			) : null}
		</div>
	);
}
