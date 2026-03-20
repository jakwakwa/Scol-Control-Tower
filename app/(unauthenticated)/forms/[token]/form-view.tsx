"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DecisionActions from "@/components/forms/decision-actions";
import styles from "@/components/forms/external/external-form-theme.module.css";
import FormRenderer from "@/components/forms/form-renderer";
import FormStatusMessage from "@/components/forms/form-status-message";
import type { FormType } from "@/lib/types";
import { formContent } from "./content";
import { toast } from "sonner";

interface FormViewProps {
	token: string;
	formType: Exclude<FormType, "DOCUMENT_UPLOADS">;
	initialFormStatus: string;
	initialDecisionStatus: string | null;
	initialDecisionOutcome: string | null;
}

interface QuoteSummary {
	amount: number;
	baseFeePercent: number;
	adjustedFeePercent: number | null;
	rationale: string | null;
	status: string;
}

export default function FormView({
	token,
	formType,
	initialFormStatus,
	initialDecisionStatus,
	initialDecisionOutcome,
}: FormViewProps) {
	const [submitted, setSubmitted] = useState(false);
	const [submitMessage, setSubmitMessage] = useState<string | null>(null);
	const [decisionOutcome, setDecisionOutcome] = useState<string | null>(
		initialDecisionStatus === "responded" ? initialDecisionOutcome : null
	);
	const [quoteSummary, setQuoteSummary] = useState<QuoteSummary | null>(null);
	const [quoteLoading, setQuoteLoading] = useState(false);
	const content = formContent[formType];
	const decisionConfig = content?.decision;
	const hasResponded = initialDecisionStatus === "responded" || Boolean(decisionOutcome);
	const isDecisionEnabled = Boolean(decisionConfig?.enabled);
	const isSubmittedOnly = initialFormStatus === "submitted" && !submitted;
	const submitLockRef = useRef(false);
	const decisionLockRef = useRef(false);

	useEffect(() => {
		let active = true;
		const loadQuote = async () => {
			if (formType !== "SIGNED_QUOTATION") return;
			setQuoteLoading(true);
			try {
				const response = await fetch(`/api/forms/${token}/quote`);
				if (!response.ok) return;
				const payload = await response.json();
				if (active) {
					setQuoteSummary(payload?.quote || null);
				}
			} catch {
				// No-op: quote details are optional for rendering
			} finally {
				if (active) setQuoteLoading(false);
			}
		};
		loadQuote();
		return () => {
			active = false;
		};
	}, [formType, token]);

	const approvalLabel = useMemo(
		() => decisionConfig?.approveLabel || content?.submitLabel || "Submit",
		[content?.submitLabel, decisionConfig?.approveLabel]
	);

	const callDecisionEndpoint = async (
		decision: "APPROVED" | "DECLINED",
		reason?: string
	) => {
		if (decisionLockRef.current) {
			return;
		}
		decisionLockRef.current = true;
		try {
			const response = await fetch(`/api/forms/${token}/decision`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ decision, reason }),
			});

			if (!response.ok) {
				const payload = await response.json().catch(() => ({}));
				throw new Error(payload?.error || "Failed to record decision");
			}

			setDecisionOutcome(decision.toLowerCase());
			setSubmitMessage(
				decision === "APPROVED"
					? "Thank you. Your approval has been recorded."
					: "Your decline decision has been recorded."
			);
		} finally {
			decisionLockRef.current = false;
		}
	};

	if (hasResponded) {
		return (
			<FormStatusMessage
				title={
					decisionOutcome === "declined"
						? "Decision recorded: declined"
						: "Decision recorded: approved"
				}
				description={
					submitMessage || "Your response has already been recorded for this form link."
				}
			/>
		);
	}

	if (submitted && !isDecisionEnabled) {
		return (
			<FormStatusMessage
				title="Submission received"
				description={
					submitMessage || "Thank you. Your form has been submitted successfully."
				}
			/>
		);
	}

	if (!content) {
		return (
			<FormStatusMessage
				title="Unsupported form"
				description="This form type is not yet available."
			/>
		);
	}

	return (
		<div className={styles.externalField}>
			{quoteSummary ? (
				<div className={styles.externalCard}>
					<div className={styles.externalSectionHeader}>Quotation summary</div>
					<div className={styles.externalSectionBody}>
						<p className={styles.externalSectionNote}>
							Amount: R {(quoteSummary.amount / 100).toLocaleString()}
						</p>
						<p className={styles.externalSectionNote}>
							Base fee: {(quoteSummary.baseFeePercent / 100).toFixed(2)}%
						</p>
						<p className={styles.externalSectionNote}>
							Adjusted fee:{" "}
							{quoteSummary.adjustedFeePercent
								? `${(quoteSummary.adjustedFeePercent / 100).toFixed(2)}%`
								: "-"}
						</p>
						{quoteSummary.rationale ? (
							<p className={styles.externalSectionNote}>{quoteSummary.rationale}</p>
						) : null}
					</div>
				</div>
			) : quoteLoading ? (
				<p className={styles.externalSectionNote}>Loading quotation details...</p>
			) : null}

			{isDecisionEnabled && decisionConfig && isSubmittedOnly ? (
				<div className={styles.externalField}>
					<p className={styles.externalSectionNote}>
						Your form details are already submitted. Please approve or decline this step.
					</p>
					<DecisionActions
						approveLabel={approvalLabel}
						declineLabel={decisionConfig.declineLabel}
						requiresDeclineReason={decisionConfig.requiresDeclineReason}
						approveButtonType="button"
						onApprove={async () => {
							await toast.promise(callDecisionEndpoint("APPROVED"), {
								loading: "Recording approval...",
								success: "Approval recorded.",
								error: "Failed to record approval.",
							});
						}}
						onDecline={async reason => {
							await toast.promise(callDecisionEndpoint("DECLINED", reason), {
								loading: "Recording decline...",
								success: "Decline recorded.",
								error: "Failed to record decline.",
							});
						}}
					/>
				</div>
			) : (
				<FormRenderer
					sections={content.sections}
					schema={content.schema}
					defaultValues={content.defaultValues}
					testData={content.testData}
					submitLabel={content.submitLabel}
					renderActions={
						isDecisionEnabled && decisionConfig ? (
							<DecisionActions
								approveLabel={approvalLabel}
								declineLabel={decisionConfig.declineLabel}
								requiresDeclineReason={decisionConfig.requiresDeclineReason}
								disabled={
									initialFormStatus === "revoked" || initialFormStatus === "expired"
								}
								onDecline={async reason => {
									await toast.promise(callDecisionEndpoint("DECLINED", reason), {
										loading: "Recording decline...",
										success: "Decline recorded.",
										error: "Failed to record decline.",
									});
								}}
							/>
						) : (
							<button type="submit" className={styles.primaryButton}>
								Submit
							</button>
						)
					}
					onSubmit={async values => {
						if (submitLockRef.current) return;
						submitLockRef.current = true;
						const response = await fetch("/api/forms/submit", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								token,
								formType,
								data: values,
							}),
						});

						try {
							if (!response.ok) {
								const payload = await response.json().catch(() => ({}));
								throw new Error(payload?.error || "Submission failed");
							}

							const payload = await response.json();
							setSubmitMessage(payload?.message || null);

							if (isDecisionEnabled) {
								await toast.promise(callDecisionEndpoint("APPROVED"), {
									loading: "Recording approval...",
									success: "Approval recorded.",
									error: "Failed to record approval.",
								});
							}

							setSubmitted(true);
						} finally {
							submitLockRef.current = false;
						}
					}}
				/>
			)}
		</div>
	);
}
