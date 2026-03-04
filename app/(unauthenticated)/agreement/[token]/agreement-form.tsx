"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useState } from "react";
import type { FieldValues, Resolver } from "react-hook-form";
import { useFieldArray, useForm } from "react-hook-form";
import type { z } from "zod";
import sharedStyles from "@/components/forms/external/external-form-theme.module.css";
import ExternalStatusCard from "@/components/forms/external/external-status-card";
import { stratcolAgreementSchema } from "@/lib/validations/forms";
import "./agreement-form.css";
import TermBlock from "./_components/form-term-box";

type AgreementFormValues = z.infer<typeof stratcolAgreementSchema>;

interface AgreementFormProps {
	token: string;
	applicantId: number;
	workflowId: number | null;
	defaultValues?: Partial<AgreementFormValues>;
}

const ENTITY_TYPES = [
	"Proprietor",
	"Company",
	"Close Corporation",
	"Partnership",
	"Other",
] as const;

const TEST_DATA: AgreementFormValues = {
	registeredName: "Test Company (Pty) Ltd",
	proprietorName: "",
	tradingName: "Test Trading Co",
	registrationNumber: "2024/123456/07",
	entityType: "Company",
	telephone: "012 345 6789",
	businessAddress: {
		address: "123 Business Street, Sandton",
		postalCode: "2196",
	},
	postalAddress: {
		address: "PO Box 1234, Sandton",
		postalCode: "2196",
	},
	durationAtAddress: "5 years",
	industryTenure: "10 years",
	authorisedRepresentative: {
		name: "John Smith",
		idNumber: "8001015009087",
		position: "Director",
	},
	companyResolution: {
		cityTown: "Johannesburg",
		date: new Date().toISOString().split("T")[0],
		resolvedName: "John Smith",
		resolvedIdNumber: "8001015009087",
	},
	beneficialOwners: [
		{
			name: "Jane Doe",
			idNumber: "8505050050080",
			address: "456 Owner Lane, Johannesburg, 2000",
			position: "Shareholder",
			shareholdingPercent: 60,
		},
	],
	creditBankAccount: {
		accountName: "Test Company (Pty) Ltd",
		bankName: "ABSA",
		branch: "Sandton",
		branchCode: "632005",
		accountNumber: "4098765432",
	},
	debitBankAccount: {
		accountName: "Test Company (Pty) Ltd",
		bankName: "ABSA",
		branch: "Sandton",
		branchCode: "632005",
		accountNumber: "4098765433",
	},
	consentAccepted: true as const,
	signatureName: "John Smith",
	signatureDate: new Date().toISOString().split("T")[0],
};

export default function AgreementForm({
	token,
	applicantId,
	defaultValues: prefilled,
}: AgreementFormProps) {
	const [submitted, setSubmitted] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const emptyOwner = {
		name: "",
		idNumber: "",
		address: "",
		position: "",
	};
	const mergedDefaults = {
		...prefilled,
		beneficialOwners:
			prefilled?.beneficialOwners?.length ? prefilled.beneficialOwners : [emptyOwner],
		consentAccepted: false,
	} as FieldValues;

	const form = useForm<FieldValues>({
		resolver: zodResolver(stratcolAgreementSchema) as unknown as Resolver<FieldValues>,
		defaultValues: mergedDefaults,
	});

	const {
		fields: ownerFields,
		append: appendOwner,
		remove: removeOwner,
	} = useFieldArray({
		control: form.control,
		name: "beneficialOwners",
	});

	const showTestButton = process.env.NEXT_PUBLIC_TEST_FORMS === "true";

	const handleSubmit = useCallback(
		form.handleSubmit(async values => {
			setSubmitError(null);
			try {
				const response = await fetch("/api/contract/review", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ token, data: values }),
				});

				if (!response.ok) {
					const payload = await response.json().catch(() => ({}));
					throw new Error(payload?.error || "Submission failed");
				}

				setSubmitted(true);
			} catch (error) {
				const message = error instanceof Error ? error.message : "Failed to submit";
				setSubmitError(message);
			}
		}),
		[]
	);

	if (submitted) {
		return (
			<ExternalStatusCard
				title="Contract Submitted Successfully"
				description="Thank you. Your StratCol Agreement has been submitted. Our team will be in touch shortly."
			/>
		);
	}

	const selectedEntityType = form.watch("entityType");
	const isCompanyEntity =
		selectedEntityType === "Company" ||
		selectedEntityType === "Close Corporation" ||
		selectedEntityType === "Partnership";

	const errors = form.formState.errors;

	/**
	 * Helper to render a labeled input field with error state
	 */
	const Field = ({
		name,
		label,
		required,
		type = "text",
		placeholder,
		className,
	}: {
		name: string;
		label: string;
		required?: boolean;
		type?: string;
		placeholder?: string;
		className?: string;
	}) => {
		// biome-ignore lint/suspicious/noExplicitAny: <"explanation">
		const fieldError = name.split(".").reduce((err: any, key) => err?.[key], errors);
		return (
			<div className={`contract-field ${className || ""}`}>
				<label>
					{label}
					{required && <span className="required-star">*</span>}

					<input type={type} placeholder={placeholder} {...form.register(name)} />
					{fieldError?.message && (
						<span className="contract-field-error">{fieldError.message as string}</span>
					)}
				</label>
			</div>
		);
	};

	return (
		<div className="contract-page">
			{/* ── Header ── */}
			<div className="contract-header">
				<div className="contract-header-left">
					<h1>STRATCOL AGREEMENT</h1>
					<div className="contract-header-meta">
						<div>StratCol Ltd, Reg no: 1983/001494/06</div>
						<div>StratCol Premium Collections (Pty) Ltd, Reg no: 2015/071843/07</div>
						<div>
							StratCol Premium Collections is an Authorised Financial Services Provider —
							FSP no: 46105
						</div>
					</div>
				</div>
				<div className="contract-logo-placeholder">
					<img src={`/stratcol-logo.svg`} width={240} height={80} alt=""></img>
				</div>
			</div>

			{/* ── Master ID ── */}
			<div className="contract-master-id">
				{/** biome-ignore lint/a11y/noLabelWithoutControl: <"explanation"> */}
				<label>Master ID:</label>
				<span>{applicantId}</span>
			</div>

			{/* ── Part 1 banner ── */}
			<div className="contract-part-banner">
				<span className="part-label">Part 1</span>
				<span className="part-text"></span>
			</div>

			{showTestButton && (
				<div className={sharedStyles.testingBanner}>
					<div>
						<div className={sharedStyles.testingTitle}>Testing Mode</div>
						<div className={sharedStyles.testingText}>
							Click to autofill with test data
						</div>
					</div>
					<button
						type="button"
						onClick={() => form.reset(TEST_DATA)}
						className={sharedStyles.outlineButton}>
						Autofill Form
					</button>
				</div>
			)}

			<form onSubmit={handleSubmit}>
				{/* ══════════════════════════════════════════
				    Section 1: Details of User
				    ══════════════════════════════════════════ */}
				<div className="contract-card">
					<div className="contract-section-header">1. Details of user</div>
					<div className="contract-section-body">
						<div className="contract-grid">
							<Field
								name="registeredName"
								label="Registered Name"
								required
								className="contract-field-full"
							/>
							<Field name="proprietorName" label="If Proprietor; Name and Surname" />
							<Field name="tradingName" label="Trading Name" required />
							<Field name="registrationNumber" label="Reg. No./ID No." required />
							<Field name="telephone" label="Telephone" type="tel" />

							{/* Entity type radio group */}
							<div className="contract-field contract-field-full">
								{/** biome-ignore lint/a11y/noLabelWithoutControl: <"explanation"> */}
								<label>
									Indicate type of entity
									<span className="required-star">*</span>
								</label>
								<div className="contract-entity-types">
									{ENTITY_TYPES.map(type => (
										<label key={type} className="contract-entity-type">
											<input type="radio" value={type} {...form.register("entityType")} />
											{type}
										</label>
									))}
								</div>
								{errors.entityType?.message && (
									<span className="contract-field-error">
										{errors.entityType.message as string}
									</span>
								)}
							</div>

							<Field
								name="businessAddress.address"
								label="Business Address"
								required
								className="contract-field-full"
							/>
							<Field name="businessAddress.postalCode" label="Postal Code" required />
							<div />
							<Field
								name="postalAddress.address"
								label="Postal Address"
								required
								className="contract-field-full"
							/>
							<Field name="postalAddress.postalCode" label="Postal Code" required />
							<div />
							<Field name="durationAtAddress" label="How long at current address?" />
							<Field
								name="industryTenure"
								label="How long in current business/discipline?"
							/>
						</div>
					</div>
				</div>

				{/* ══════════════════════════════════════════
				    Section 2: Director/Member/Official/Owner/Partner
				    ══════════════════════════════════════════ */}
				<div className="contract-card">
					<div className="contract-section-header">
						2. Director / Member / Official / Owner / Partner
					</div>
					<div className="contract-section-body">
						<div className="contract-grid">
							<Field
								name="authorisedRepresentative.name"
								label="First Name and Surnames"
								required
								className="contract-field-full"
							/>
							<Field name="authorisedRepresentative.idNumber" label="ID No" required />
							<Field name="authorisedRepresentative.position" label="Position" required />
						</div>
					</div>
				</div>

				{/* ══════════════════════════════════════════
				    Section 3: Company Resolutions
					To be completed if the USER is a company or other legal entity (not
									individuals or partnerships).
				    ══════════════════════════════════════════ */}
				{isCompanyEntity && (
					<div className="contract-card">
						<div className="contract-section-header">3. Company Resolutions</div>
						<div className="contract-section-body">
							<div className="contract-resolution-box">
								<div className="contract-grid">
									<Field name="companyResolution.cityTown" label="City/Town" required />
									<Field
										name="companyResolution.date"
										label="Date"
										type="date"
										required
									/>
									<Field
										name="companyResolution.resolvedName"
										label="Resolved: That (Name)"
										required
										className="contract-field-full"
									/>
									<Field
										name="companyResolution.resolvedIdNumber"
										label="With ID No"
										required
									/>
								</div>
								<p className="contract-section-note mt-3 mb-0">
									authorised to represent and to sign this agreement with StratCol
									Limited.
								</p>
							</div>
						</div>
					</div>
				)}

				{/* ══════════════════════════════════════════
				    Beneficial Owners
					To be completed if the USER is a company or other legal entity (not individuals or partnerships).
				    ══════════════════════════════════════════ */}
				{isCompanyEntity && (
					<div className="contract-card">
						<div className="contract-section-header">Beneficial Owners</div>
						<div className="contract-section-body">
							<p className="contract-section-note">
								List all beneficial owners with 5% or more shareholding.
							</p>
							<div className="flex flex-col gap-4">
								{ownerFields.map((field, index) => (
									<div key={field.id} className="contract-owner-card">
										{ownerFields.length > 1 && (
											<button
												type="button"
												className="contract-owner-remove"
												onClick={() => removeOwner(index)}
												title="Remove owner">
												✕
											</button>
										)}
										<div className="contract-grid">
											<Field
												name={`beneficialOwners.${index}.name`}
												label="Full Name"
												required
											/>
											<Field
												name={`beneficialOwners.${index}.idNumber`}
												label="ID Number"
												required
											/>
											<Field
												name={`beneficialOwners.${index}.address`}
												label="Address"
												required
												className="contract-field-full"
											/>
											<Field
												name={`beneficialOwners.${index}.position`}
												label="Position"
												required
											/>
											<Field
												name={`beneficialOwners.${index}.shareholdingPercent`}
												label="Shareholding %"
												type="number"
											/>
										</div>
									</div>
								))}
							</div>
							<button
								type="button"
								className={`contract-add-btn mt-3`}
								onClick={() =>
									appendOwner({ name: "", idNumber: "", address: "", position: "" })
								}>
								+ Add beneficial owner
							</button>
						</div>
					</div>
				)}

				{/* ══════════════════════════════════════════
				    Banking & Mandates
				    ══════════════════════════════════════════ */}
				<div className="contract-card">
					<div className="contract-section-header">Banking &amp; Mandates</div>
					<div className="contract-section-body">
						<p className="contract-section-note">
							Provide banking details for credit and debit accounts.
						</p>
						<div className="contract-grid">
							<Field
								name="creditBankAccount.accountName"
								label="Credit Account Name"
								required
							/>
							<Field name="creditBankAccount.bankName" label="Credit Bank" required />
							<Field name="creditBankAccount.branch" label="Credit Branch" />
							<Field
								name="creditBankAccount.branchCode"
								label="Credit Branch Code"
								required
							/>
							<Field
								name="creditBankAccount.accountNumber"
								label="Credit Account Number"
								required
							/>
							<div />
							<Field
								name="debitBankAccount.accountName"
								label="Debit Account Name"
								required
							/>
							<Field name="debitBankAccount.bankName" label="Debit Bank" required />
							<Field name="debitBankAccount.branch" label="Debit Branch" />
							<Field
								name="debitBankAccount.branchCode"
								label="Debit Branch Code"
								required
							/>
							<Field
								name="debitBankAccount.accountNumber"
								label="Debit Account Number"
								required
							/>
						</div>
					</div>
				</div>

				{/* ══════════════════════════════════════════
				    Section 4: Representative Declaration & Signature
				    ══════════════════════════════════════════ */}
				<div className="contract-card">
					<div className="contract-section-header">
						4. User&apos;s Representative signing this agreement on behalf of User
					</div>
					<div className="contract-section-body">
						<p className="contract-section-note">
							I, the above mentioned Director / Member / Official, hereby guarantee that
							all information supplied is factually correct. I have read and understand
							all clauses of this agreement, specifically Part 3: clause 18.
						</p>

						<div style={{ marginBottom: "1rem" }}>
							<div className="contract-consent">
								<input
									id="consentAccepted"
									type="checkbox"
									{...form.register("consentAccepted")}
								/>
								<label htmlFor="consentAccepted">
									I accept the StratCol agreement terms. I confirm that the information
									provided is accurate and complete.
								</label>
							</div>
							{errors.consentAccepted?.message && (
								<span className="contract-field-error mt-1 block">
									{errors.consentAccepted.message as string}
								</span>
							)}
						</div>

						<div className="contract-signature-row">
							<Field name="signatureDate" label="Date" type="date" required />
							<Field name="signatureName" label="For User (Typed Signature)" required />
						</div>

						<div className="contract-acceptance">
							Agreement Accepted in Pretoria on behalf of <strong>StratCol</strong>.
						</div>
					</div>
				</div>

				<div>
					{/* PART 3: Terms and Conditions */}
					<div className="mb-12 ">
						<h2 className="contract-part-banner part-label ">
							Part 3: Terms and Conditions
						</h2>
						<p className="font-bold mb-6 uppercase text-left">
							Terms and Conditions of Agreement to Render Payment, Collection and or Other
							Services
						</p>

						<div className="space-y-6 text-sm text-justify leading-relaxed mx-4">
							<TermBlock title="1 DEFINITIONS">
								<p>
									a. STRATCOL and/or STRATCOL GROUP as the case may be, as referred to in
									clause 2, STRATCOL LIMITED, registration number 1983/001494/06, or
									STRATCOL PREMIUM COLLECTIONS (PTY) LTD, registration number
									2015/071843/07.
								</p>
								<p>
									b. The USER - the person or entity referred to above, who contracts with
									STRATCOL.
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
									STRATCOL signs the agreement, and the agreement is effected in Pretoria.
								</p>
								<p>
									e. Additional USER IDs issued after the contract conclusion date fall
									under this agreement and are regulated by the terms and conditions
									contained herein.
								</p>
								<p>
									f. In addition to what is contained herein, all collections are always
									subject to:
								</p>
								<ul className="list-disc pl-6 space-y-1 mt-1 mb-2">
									<li>
										Policies, rules, and directives issued from time to time by STRATCOL's
										bankers or any regulatory authority. The USER is responsible for
										staying informed about these.
									</li>
								</ul>
								<p>
									g. Information in any correspondence sent to the USER regarding limits,
									payment dates, security requirements, time restrictions, other
									applicable fees (if any), and any other relevant aspects.
								</p>
								<p>
									h. The parties agree that StratCol will, on behalf of the USER, recover
									funds from third parties, alternatively make payments to third parties
									on behalf of the USER, as well as provide additional services related
									thereto and as identified between the parties from time to time. All
									collections or payments will be made through official payment channels
									as identified in the respective USER IDS.
								</p>
							</TermBlock>

							<TermBlock title="3 CONFIDENTIALITY, FICA, AND POPIA LEGISLATION">
								<p>
									a. The USER acknowledges that STRATCOL is legally obligated to obtain
									certain information from the USER to enter and continue contractual
									agreements. The USER undertakes to provide all such information promptly
									from time to time.
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
								<p>
									d. The USER acknowledges being aware that under certain circumstances,
									STRATCOL may be legally obliged to disclose information in terms of a
									court order, or to STRATCOL' s bankers, or to regulatory authorities.
								</p>
							</TermBlock>

							<TermBlock title="4 HIGHEST GOOD FAITH AND SECURITY">
								<p>
									a. The parties contract in the highest good faith with each other under
									circumstances where STRATCOL bears the risk concerning, among other
									things:
								</p>
								<ul className="list-[lower-roman] pl-8 space-y-1 mt-1 mb-2">
									<li>
										Reputation arising from the financial, public, and/or business conduct
										of the USER;
									</li>
									<li>The creditworthiness of the USER;</li>
									<li>
										Potential incidental indebtedness that the USER may incur to STRATCOL;
									</li>
									<li>
										The degree of financial discipline applied by the USER in managing
										limits and ratios of unpaid and disputed items.
									</li>
								</ul>
								<p>
									b. The risk that STRATCOL thus incurs may also change in certain
									instances, including but not limited to:
								</p>
								<ul className="list-[lower-roman] pl-8 space-y-1 mt-1 mb-2">
									<li>
										If the User's circumstances change, including, but not limited to,
										changes in: Ownership; Creditworthiness; Cash flow; Public, financial,
										or business conduct.
									</li>
									<li>
										If the USER acts in violation of limits, ratios, or validity
										requirements.
									</li>
									<li>
										If the USER disputes any debit order collection from STRATCOL or if it
										remains unpaid after presentation.
									</li>
									<li>If the USER fails to provide any mandates upon request.</li>
									<li>
										If a senior representative of the USER is not immediately reachable
										within normal working hours.
									</li>
								</ul>
								<p>
									c. Instructions provided by the USER must always comply with at least
									the following requirements:
								</p>
								<ul className="list-[lower-roman] pl-8 space-y-1 mt-1 mb-2">
									<li>Collections may only take place under a valid written mandate.</li>
									<li>
										No amount that is disputed or reasonably expected to be disputed may
										be claimed.
									</li>
									<li>Cancellation requirements must be strictly adhered to.</li>
									<li>Limits and required ratios must be strictly followed.</li>
								</ul>
								<p>
									d. STRATCOL will from time to time agree on the following with the USER:
								</p>
								<ul className="list-[lower-roman] pl-8 space-y-1 mt-1 mb-2">
									<li>Collection limits;</li>
									<li>Payout dates and cycles of amounts collected;</li>
									<li>Security requirements.</li>
								</ul>
								<p>
									e. If the User's risk towards STRATCOL changes without express consent
									from STRATCOL, STRATCOL may implement changes to collection limits,
									payout dates, and payout amounts without notice and with immediate
									effect. STRATCOL may specifically withhold funds until such date as
									STRATCOL could make a new risk assessment and is satisfied that the
									risk, if it has weakened, has been restored to the level before its
									increase.
								</p>
								<p>
									f. To make risk assessments, STRATCOL may inquire from time to time with
									credit bureaus and the USER itself regarding products or services sold
									or delivered, business practices, media references, and trading
									partners.
								</p>
								<p>
									g. Upon termination of the agreement, security in trust will be
									reimbursed to the USER after a minimum of 45 working days.
								</p>
								<p>
									h. All interest received on funds in trust, whether held as security or
									otherwise, will accrue to STRATCOL.
								</p>
								<p>
									i. All funds held by STRATCOL on behalf of the USER will simultaneously
									serve as security for all obligations that the USER may have towards
									both entities in the STRATCOL group.
								</p>
							</TermBlock>

							<TermBlock title="5 COLLECTION OF DUE AMOUNTS">
								<p>
									a. STRATCOL will agree with the USER on which day each financial month
									will end, and an invoice will be issued.
								</p>
								<p>
									b. All amounts due are payable on demand and at STRATCOL's discretion,
									payable by means of either set-off against collected collections, or by
									direct debit order from the User's bank account.
								</p>
								<p>
									c. The USER hereby grants an irrevocable mandate to STRATCOL to draw any
									amount due by debit order from any bank account the USER may hold during
									the time any amounts are owed to STRATCOL.
								</p>
								<p>
									d. If amounts due are paid to a third party's bank account under a
									separate agreement between the USER and that third party, the USER
									guarantees that the third party also grants STRATCOL irrevocable
									authorization to draw amounts due by debit order from that third party's
									account.
								</p>
								<p>
									e. A certificate signed by any director of STRATCOL (whose appointment
									need not be proven) will be sufficient evidence of all amounts owed by
									the USER to STRATCOL in any provisional or final proceedings that may be
									instituted against the USER. The burden of proving any errors lies with
									the USER.
								</p>
							</TermBlock>

							<TermBlock title="6 RISK OF LOSS AND LIABILITY">
								<p>
									a. The risk of loss of data during transmission between the parties
									rests with the USER.
								</p>
								<p>
									b. In the event that any instruction given by the USER to STRATCOL
									cannot be fully or timely executed due to circumstances beyond
									STRATCOL's control, STRATCOL will attempt to deliver the service as soon
									as possible thereafter but will not incur any liability to the USER.
								</p>
								<p>
									c. In any other case where STRATCOL may incur any liability, such
									liability is limited to direct damages and to the amount of the
									preceding month's monthly administration fee or one thousand rand,
									whichever is greater.
								</p>
								<p>
									d. The burden is on the USER to check all reports and data transmissions
									from STRATCOL for receipt and accuracy.
								</p>
								<p>
									e. The USER indemnifies STRATCOL against any claim from a third party
									arising out of the processing of any instruction received from the USER.
								</p>
								<p>
									f. In any litigation in which STRATCOL is successful against the USER,
									the USER shall be liable for costs on a scale as between attorney and
									client.
								</p>
							</TermBlock>

							<TermBlock title="7 DURATION OF AGREEMENT">
								<p>
									a. The agreement comes into effect on the date of signing on behalf of
									STRATCOL.
								</p>
								<p>
									b. The agreement continues indefinitely until either party gives at
									least 3 calendar months' written notice to the other to cancel it,
									alternatively if it is suspended or cancelled under the following
									circumstances:
								</p>
								<ul className="list-[lower-roman] pl-8 space-y-1 mt-1 mb-2">
									<li>
										STRATCOL may suspend the agreement and refuse to perform any
										instructions if the USER is in default of any obligation to STRATCOL,
										for as long as there is an unacceptable change in the risk that the
										USER poses to STRATCOL, if a judgment is granted against the USER, or
										if the USER is sequestrated, liquidated, or placed under business
										management.
									</li>
									<li>
										STRATCOL may summarily cancel the agreement if the USER acts in any
										way, or fails to act, resulting in a change in the risk that the USER
										poses to STRATCOL to the extent that it exceeds STRATCOL's then
										current risk appetite.
									</li>
								</ul>
								<p>
									c. The USER shall be responsible for all fees incurred during the
									duration of the agreement, as well as related to transactions
									thereafter.
								</p>
							</TermBlock>

							<TermBlock title="8 FEES">
								<p>
									a. The fees owed by the USER to STRATCOL for the services rendered
									herein will be communicated to the USER in writing from time to time.
									Unless expressly stated otherwise, this excludes VAT.
								</p>
								<p>
									b. STRATCOL may change its fee structure to the USER with a minimum of
									30 calendar days' notice.
								</p>
								<p>c. No fees may be withheld by the USER pending any dispute.</p>
								<p>
									d. All payments shall first cover fees, then interest, and then capital.
								</p>
							</TermBlock>

							<TermBlock title="9 CHOSEN ADDRESS FOR SERVICE OF PROCESSES">
								<p>
									The parties choose the following addresses as chosen domicilium citandi
									et executandi, being an address where that party accepts service of any
									legal document. Any party may change such address with 14 days' written
									notice to the other.
								</p>
								<p>a. STRATCOL - 1211 Cobham avenue, Queenswood, Pretoria.</p>
								<p>b. The USER - The address chosen in the preamble hereof.</p>
							</TermBlock>

							<TermBlock title="10 JURISDICTION">
								<p>
									a. The parties consent to the jurisdiction of the Magistrate's Court
									regarding any legal proceedings, regardless of whether the amount of the
									claim exceeds the jurisdiction of that court.
								</p>
								<p>
									b. This consent does not prejudice any party from approaching another
									court with jurisdiction.
								</p>
							</TermBlock>

							<TermBlock title="11 CESSION">
								<p>
									a. STRATCOL may only transfer and cede its obligations under this
									agreement to another if the latter assumes all responsibilities that
									STRATCOL may have herein.
								</p>
								<p>
									b. The USER may not cede any rights and/or obligations to another
									without STRATCOL's consent.
								</p>
							</TermBlock>

							<TermBlock title="12 WAIVER">
								<p>
									a. Any relaxation or concession made by STRATCOL shall not create new
									rights or affect existing rights.
								</p>
							</TermBlock>

							<TermBlock title="13 SCOPE OF AGREEMENT">
								<p>
									a. This agreement is the sole agreement between STRATCOL and the USER.
								</p>
								<p>
									b. Any amendment to this agreement is only valid if signed by STRATCOL
									and confirmed in writing to the USER.
								</p>
							</TermBlock>

							<TermBlock title="14 INTERPRETATION">
								<p>
									a. Each clause hereof is severable from the others, and if any clause is
									found to be unenforceable or invalid, it shall not affect the other
									clauses.
								</p>
								<p>
									b. The parties agree that the general rule of interpretation, where any
									ambiguity may be presumed against the party who drafted the agreement,
									shall not apply hereto.
								</p>
							</TermBlock>

							<TermBlock title="15 SIGNATURES">
								<p>
									a. Where the agreement is signed in a representative capacity, the
									signatory guarantees that they are fully authorized to bind the USER to
									this and to sign this agreement.
								</p>
							</TermBlock>

							<TermBlock title="16 ELECTRONIC CORRESPONDENCE">
								<p>
									a. The USER agrees to receive all reports, invoices, and correspondence
									herein in electronic format.
								</p>
							</TermBlock>

							<TermBlock title="17 GUARANTEE">
								<p>
									a. If the USER is not a natural person, or if the USER and the signatory
									are not the same person, the signatory hereby binds itself as surety and
									co-principal debtor with the USER for the punctual performance of all
									obligations to STRATCOL.
								</p>
								<p>
									b. The signatory's signature hereto is firstly on behalf of the USER,
									and secondly as surety and co-principal debtor.
								</p>
								<p>
									c. The signatory waives the right to demand that the USER be sued first
									before steps can be taken against the signatory.
								</p>
							</TermBlock>

							<TermBlock title="18 SURETY">
								<p>
									If the USER is a company, close corporation, trust or any association,
									the person signing this agreement hereby binds him/herself as surety and
									co-principal debtor with the USER for payment of all amounts due, now or
									in future. In this regard, such person's signature will be as
									representative of the USER as well as in personal capacity as surety.
								</p>
								<p className="font-bold mt-2">The following is also applicable:</p>
								<p>
									18.1 Future debts include debts arising from other user ids issued to
									the USER, as well as from user id's issued to any other party for which
									this USER bound, or binds itself in the future, as surety in favour of
									STRATCOL.
								</p>
								<p>
									18.2 Should any other persons already have bound themselves as surety
									for the USER, or if other persons hereafter bind themselves as surety
									for the USER, such old and new sureties will all stand surety in favour
									of STRATCOL, jointly and severally.
								</p>
								<p>
									18.3 This suretyship can only be cancelled in writing under signature of
									a director of STRATCOL.
								</p>
							</TermBlock>
						</div>
					</div>
				</div>

				{/* ── Submit ── */}
				{submitError && <div className="contract-error-banner">{submitError}</div>}

				<div className="contract-submit-area">
					<button
						type="submit"
						className="contract-submit-btn"
						disabled={form.formState.isSubmitting}>
						{form.formState.isSubmitting ? "Submitting…" : "Submit Contract"}
					</button>
				</div>
			</form>
		</div>
	);
}
