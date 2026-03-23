"use client";

import posthog from "posthog-js";
import { useState } from "react";
import ExternalStatusCard from "@/components/forms/external/external-status-card";
import { ExternalStratcolAgreementWizard } from "@/components/forms/external/stratcol-agreement-wizard";
import { getPostHogProjectToken } from "@/lib/posthog-env";
import type { StratcolAgreementFormData } from "@/lib/validations/onboarding";
import "./agreement-form.css";

interface AgreementFormProps {
	token: string;
	applicantId: number;
	workflowId: number | null;
	defaultValues?: Partial<StratcolAgreementFormData>;
}

export default function AgreementForm({
	token,
	applicantId,
	workflowId: _workflowId,
	defaultValues,
}: AgreementFormProps) {
	const [submitted, setSubmitted] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	if (submitted) {
		return (
			<ExternalStatusCard
				title="Contract Submitted Successfully"
				description="Thank you. Your StratCol Agreement has been submitted. Our team will be in touch shortly."
			/>
		);
	}

	return (
		<div className="contract-page py-8">
			<div className="mb-6 contract-header-meta">
				<h1 className="text-2xl font-bold">STRATCOL AGREEMENT</h1>
				<div>StratCol Ltd, Reg no: 1983/001494/06</div>
				<div>StratCol Premium Collections (Pty) Ltd, Reg no: 2015/071843/07</div>
				<div>
					StratCol Premium Collections is an Authorised Financial Services Provider - FSP
					no: 46105
				</div>
				<div className="mt-2">
					<strong>Master ID:</strong> {applicantId}
				</div>
			</div>

			<ExternalStratcolAgreementWizard
				initialData={defaultValues}
				storageKey={`external-stratcol-agreement-${token}`}
				title="StratCol Agreement"
				submitButtonText="Submit Contract"
				onSubmit={async data => {
					setSubmitError(null);
					try {
						const response = await fetch("/api/contract/review", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ token, data }),
						});

						if (!response.ok) {
							const payload = await response.json().catch(() => ({}));
							throw new Error(payload?.error || "Submission failed");
						}

						if (getPostHogProjectToken()) {
							posthog.capture("agreement_contract_submitted", {
								applicant_id: applicantId,
							});
						}

						setSubmitted(true);
					} catch (error) {
						const message = error instanceof Error ? error.message : "Failed to submit";
						setSubmitError(message);
						throw error;
					}
				}}
			/>

			{submitError && <div className="contract-error-banner mt-6">{submitError}</div>}
		</div>
	);
}
