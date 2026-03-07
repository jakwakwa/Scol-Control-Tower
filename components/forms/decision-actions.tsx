"use client";

import { useState } from "react";
import styles from "./external/external-form-theme.module.css";

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
		<div className={styles.externalField}>
			<div className={styles.externalActions}>
				<button
					type={approveButtonType}
					disabled={disabled || submitting}
					className={styles.primaryButton}
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
				</button>
				<button
					type="button"
					disabled={disabled || submitting}
					className={styles.dangerButton}
					onClick={() => {
						setShowDeclineInput(true);
						setError(null);
					}}>
					{declineLabel}
				</button>
			</div>
			{showDeclineInput ? (
				<div className={styles.externalCard}>
					<div className={styles.externalSectionBody}>
						<textarea
							placeholder="Optional reason for decline"
							value={reason}
							onChange={event => setReason(event.target.value)}
							rows={3}
							className={styles.externalTextarea}
						/>
						{error ? <p className={styles.externalError}>{error}</p> : null}
						<div className={styles.externalActions}>
							<button
								type="button"
								disabled={submitting}
								className={styles.outlineButton}
								onClick={() => {
									setShowDeclineInput(false);
									setReason("");
									setError(null);
								}}>
								Cancel
							</button>
							<button
								type="button"
								disabled={submitting}
								className={styles.dangerButton}
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
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
