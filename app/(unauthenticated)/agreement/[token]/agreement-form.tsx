"use client";

import posthog from "posthog-js";
import { useState } from "react";
import ExternalStatusCard from "@/components/forms/external/external-status-card";
import { ExternalStratcolAgreementWizard } from "@/components/forms/external/stratcol-agreement-wizard";
import { getPostHogProjectToken } from "@/lib/posthog-env";
import type { StratcolAgreementFormData } from "@/lib/validations/onboarding";
import TermBlock from "./_components/form-term-box";
import "./agreement-form.css";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

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
			<div className="mb-6 text-xs font-light	 text-muted-foreground">
				<h1 className="text-xl font-bold">STRATCOL AGREEMENT</h1>
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

			<div className="mb-12 mt-10">
				<Accordion type="single" collapsible defaultValue="item-1" className="max-w-full">
					<AccordionItem value="item-1">
						<AccordionTrigger className="contract-part-banner part-label">
							Part 3: Terms and Conditions
						</AccordionTrigger>
						<AccordionContent>
							<p className="font-bold mb-6 uppercase text-left">
								Terms and Conditions of Agreement to Render Payment, Collection and or
								Other Services
							</p>
							<div className="space-y-6 text-sm text-justify leading-relaxed mx-4">
								<TermBlock title="1 DEFINITIONS">
									<p>
										a. STRATCOL and/or STRATCOL GROUP as the case may be, as referred to
										in clause 2, STRATCOL LIMITED, registration number 1983/001494/06, or
										STRATCOL PREMIUM COLLECTIONS (PTY) LTD, registration number
										2015/071843/07.
									</p>
									<p>
										b. The USER - the person or entity referred to above, who contracts
										with STRATCOL.
									</p>
								</TermBlock>

								<TermBlock title="2 CONTRACTING PARTIES AND AGREEMENT CLOSURE">
									<p>
										a. Transactions under the jurisdiction of the FSCA are processed by
										StratCol Premium Collections (Pty) Ltd.
									</p>
									<p>
										b. Transactions outside the jurisdiction of the FSCA are processed by
										StratCol Ltd.
									</p>
									<p>
										c. STRATCOL issues one or more USER IDs for each contract, indicating
										which entity in the STRATCOL GROUP is contracting for those specific
										collection of funds.
									</p>
									<p>
										d. The effective date of contract conclusion is the date on which
										STRATCOL signs the agreement, and the agreement is effected in
										Pretoria.
									</p>
									<p>
										e. Additional USER IDs issued after the contract conclusion date fall
										under this agreement and are regulated by the terms and conditions
										contained herein.
									</p>
								</TermBlock>

								<TermBlock title="3 CONFIDENTIALITY, FICA, AND POPIA LEGISLATION">
									<p>
										a. The USER acknowledges that STRATCOL is legally obligated to obtain
										certain information from the USER to enter and continue contractual
										agreements. The USER undertakes to provide all such information
										promptly from time to time.
									</p>
									<p>
										b. STRATCOL acknowledges that the information received, as well as
										information related to the USER and its affairs, is obtained on a
										confidential basis, also subject to POPIA legislation.
									</p>
									<p>
										c. STRATCOL will always handle the User's information and data as
										confidential, and specifically, STRATCOL will take reasonable steps to
										preserve such information.
									</p>
								</TermBlock>

								<TermBlock title="4 HIGHEST GOOD FAITH AND SECURITY">
									<p>
										a. The parties contract in the highest good faith with each other
										under circumstances where STRATCOL bears risk concerning, among other
										things: reputation, creditworthiness, incidental indebtedness, and
										financial discipline applied by the USER.
									</p>
									<p>
										b. If the USER's risk profile changes, STRATCOL may change collection
										limits, payout dates, and payout amounts with immediate effect.
									</p>
									<p>
										c. Instructions by the USER must always comply with valid written
										mandates, dispute controls, cancellation requirements, and agreed
										limits.
									</p>
									<p>
										d. STRATCOL may hold funds as security and apply group-level security
										rights across obligations to both STRATCOL entities.
									</p>
								</TermBlock>

								<TermBlock title="5 COLLECTION OF DUE AMOUNTS">
									<p>
										a. STRATCOL and the USER will agree on month-end processing and
										invoice issuance periods.
									</p>
									<p>
										b. Amounts due are payable on demand and may be settled by set-off
										against collections or debit order.
									</p>
									<p>
										c. The USER grants STRATCOL an irrevocable mandate to draw amounts due
										from any USER bank account while amounts are owed.
									</p>
								</TermBlock>

								<TermBlock title="6 RISK OF LOSS AND LIABILITY">
									<p>a. Transmission data-loss risk rests with the USER.</p>
									<p>
										b. Where instructions cannot be executed due to circumstances beyond
										STRATCOL's control, STRATCOL is not liable for delay.
									</p>
									<p>
										c. Liability is limited to direct damages up to the prior month's
										administration fee or one thousand rand, whichever is greater.
									</p>
								</TermBlock>

								<TermBlock title="7 DURATION OF AGREEMENT">
									<p>a. The agreement takes effect on signature by STRATCOL.</p>
									<p>
										b. It remains in force until cancelled by written notice, or suspended
										/ cancelled under default or risk-change events.
									</p>
								</TermBlock>

								<TermBlock title="8 FEES">
									<p>
										a. Fees are communicated in writing from time to time and exclude VAT
										unless stated otherwise.
									</p>
									<p>
										b. STRATCOL may amend fees with at least 30 calendar days' notice.
									</p>
									<p>c. Fees may not be withheld pending disputes.</p>
								</TermBlock>

								<TermBlock title="9 CHOSEN ADDRESS FOR SERVICE OF PROCESSES">
									<p>
										The parties choose domicilium addresses for service of legal process.
										Either party may change its address by written notice.
									</p>
								</TermBlock>

								<TermBlock title="10 JURISDICTION">
									<p>
										The parties consent to Magistrate's Court jurisdiction without
										prejudice to approach other competent courts.
									</p>
								</TermBlock>

								<TermBlock title="11 CESSION">
									<p>
										STRATCOL may cede obligations only where full responsibilities are
										assumed; the USER may not cede rights/obligations without STRATCOL
										consent.
									</p>
								</TermBlock>

								<TermBlock title="12 WAIVER">
									<p>
										Any concession or relaxation by STRATCOL does not create new rights or
										prejudice existing rights.
									</p>
								</TermBlock>

								<TermBlock title="13 SCOPE OF AGREEMENT">
									<p>
										This is the sole agreement between the parties. Amendments are valid
										only if confirmed in writing by STRATCOL.
									</p>
								</TermBlock>

								<TermBlock title="14 INTERPRETATION">
									<p>
										Clauses are severable and invalidity of one clause does not invalidate
										others.
									</p>
								</TermBlock>

								<TermBlock title="15 SIGNATURES">
									<p>
										Where signed in a representative capacity, the signatory warrants
										authority to bind the USER.
									</p>
								</TermBlock>

								<TermBlock title="16 ELECTRONIC CORRESPONDENCE">
									<p>
										The USER agrees to receive reports, invoices, and correspondence in
										electronic form.
									</p>
								</TermBlock>

								<TermBlock title="17 GUARANTEE">
									<p>
										Where applicable, the signatory binds itself as surety and
										co-principal debtor for USER obligations to STRATCOL.
									</p>
								</TermBlock>

								<TermBlock title="18 SURETY">
									<p>
										For non-natural person USER entities, the signatory also binds itself
										in a personal surety capacity for amounts due now or in future.
									</p>
									<p>
										18.1 Future debts include obligations under additional USER IDs issued
										to the USER, and IDs where this USER has acted or will act as surety.
									</p>
									<p>
										18.2 Existing and future sureties stand jointly and severally in
										favour of STRATCOL.
									</p>
									<p>
										18.3 This suretyship can only be cancelled in writing under signature
										of a director of STRATCOL.
									</p>
								</TermBlock>
							</div>
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>

			{submitError && <div className="contract-error-banner mt-6">{submitError}</div>}
		</div>
	);
}

export function AccordionBasic(items) {
	return (
		<Accordion type="single" collapsible defaultValue="item-1" className="max-w-lg">
			{items.map(item => (
				<AccordionItem key={item.value} value={item.value}>
					<AccordionTrigger>{item.trigger}</AccordionTrigger>
					<AccordionContent>{item.content}</AccordionContent>
				</AccordionItem>
			))}
		</Accordion>
	);
}
