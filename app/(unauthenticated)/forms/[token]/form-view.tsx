"use client";

import { useEffect, useMemo, useState } from "react";
import DecisionActions from "@/components/forms/decision-actions";
import FormRenderer from "@/components/forms/form-renderer";
import FormStatusMessage from "@/components/forms/form-status-message";
import { Button } from "@/components/ui/button";
import type { FormType } from "@/lib/types";
import { formContent } from "./content";

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
		<div className="space-y-6">
			{quoteSummary ? (
				<div className="rounded-md border border-border p-4 space-y-2">
					<p className="text-sm font-semibold">Quotation summary</p>
					<p className="text-sm text-muted-foreground">
						Amount: R {(quoteSummary.amount / 100).toLocaleString()}
					</p>
					<p className="text-sm text-muted-foreground">
						Base fee: {(quoteSummary.baseFeePercent / 100).toFixed(2)}%
					</p>
					<p className="text-sm text-muted-foreground">
						Adjusted fee:{" "}
						{quoteSummary.adjustedFeePercent
							? `${(quoteSummary.adjustedFeePercent / 100).toFixed(2)}%`
							: "-"}
					</p>
					{quoteSummary.rationale ? (
						<p className="text-sm text-muted-foreground">{quoteSummary.rationale}</p>
					) : null}
				</div>
			) : quoteLoading ? (
				<p className="text-sm text-muted-foreground">Loading quotation details...</p>
			) : null}

			{isDecisionEnabled && decisionConfig && isSubmittedOnly ? (
				<div className="space-y-4">
					<p className="text-sm text-muted-foreground">
						Your form details are already submitted. Please approve or decline this step.
					</p>
					<DecisionActions
						approveLabel={approvalLabel}
						declineLabel={decisionConfig.declineLabel}
						requiresDeclineReason={decisionConfig.requiresDeclineReason}
						approveButtonType="button"
						onApprove={async () => {
							await callDecisionEndpoint("APPROVED");
						}}
						onDecline={async reason => {
							await callDecisionEndpoint("DECLINED", reason);
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
									await callDecisionEndpoint("DECLINED", reason);
								}}
							/>
						) : (
							<Button type="submit">Submit</Button>
						)
					}
					onSubmit={async values => {
						const response = await fetch("/api/forms/submit", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								token,
								formType,
								data: values,
							}),
						});

						if (!response.ok) {
							const payload = await response.json().catch(() => ({}));
							throw new Error(payload?.error || "Submission failed");
						}

						const payload = await response.json();
						setSubmitMessage(payload?.message || null);
						setSubmitted(true);

						if (isDecisionEnabled) {
							await callDecisionEndpoint("APPROVED");
						}
					}}
				/>
			)}
		</div>
	);
}
