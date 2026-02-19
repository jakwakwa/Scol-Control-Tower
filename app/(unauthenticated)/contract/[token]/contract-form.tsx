"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useState } from "react";
import type { FieldValues, Resolver } from "react-hook-form";
import { useFieldArray, useForm } from "react-hook-form";
import type { z } from "zod";
import { stratcolContractSchema } from "@/lib/validations/forms";
import "./contract-form.css";

type ContractFormValues = z.infer<typeof stratcolContractSchema>;

interface ContractFormProps {
	token: string;
	applicantId: number;
	workflowId: number | null;
}

const ENTITY_TYPES = [
	"Proprietor",
	"Company",
	"Close Corporation",
	"Partnership",
	"Other",
] as const;

const TEST_DATA: ContractFormValues = {
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

export default function ContractForm({
	token,
	applicantId,
	workflowId,
}: ContractFormProps) {
	const [submitted, setSubmitted] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const form = useForm<FieldValues>({
		resolver: zodResolver(stratcolContractSchema) as unknown as Resolver<FieldValues>,
		defaultValues: {
			beneficialOwners: [{}],
			consentAccepted: false,
		},
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
			<div className="contract-success">
				<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
					<svg
						className="h-8 w-8 text-green-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M5 13l4 4L19 7"
						/>
					</svg>
				</div>
				<h2>Contract Submitted Successfully</h2>
				<p>
					Thank you. Your StratCol Agreement has been submitted. Our team will be in touch
					shortly.
				</p>
			</div>
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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const fieldError = name.split(".").reduce((err: any, key) => err?.[key], errors);
		return (
			<div className={`contract-field ${className || ""}`}>
				<label>
					{label}
					{required && <span className="required-star">*</span>}
				</label>
				<input type={type} placeholder={placeholder} {...form.register(name)} />
				{fieldError?.message && (
					<span className="contract-field-error">{fieldError.message as string}</span>
				)}
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
					LOGO
					<br />
					PLACEHOLDER
				</div>
			</div>

			{/* ── Master ID ── */}
			<div className="contract-master-id">
				<label>Master ID:</label>
				<span>{applicantId}</span>
			</div>

			{/* ── Part 1 banner ── */}
			<div className="contract-part-banner">
				<span className="part-label">Part 1</span>
				<span className="part-text">
					Please use block letters - use only black pen - mark with X in boxes
				</span>
			</div>

			{showTestButton && (
				<div
					style={{
						marginBottom: "1rem",
						padding: "0.75rem 1rem",
						border: "1px dashed #c9a356",
						borderRadius: "8px",
						background: "#fdf6e7",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}>
					<div>
						<div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#92780d" }}>
							Testing Mode
						</div>
						<div style={{ fontSize: "0.7rem", color: "#a08a2a" }}>
							Click to autofill with test data
						</div>
					</div>
					<button
						type="button"
						onClick={() => form.reset(TEST_DATA)}
						style={{
							background: "white",
							border: "1px solid #c9a356",
							borderRadius: "6px",
							padding: "0.35rem 0.75rem",
							fontSize: "0.75rem",
							fontWeight: 600,
							color: "#92780d",
							cursor: "pointer",
						}}>
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
				    ══════════════════════════════════════════ */}
				{isCompanyEntity && (
					<div className="contract-card">
						<div className="contract-section-header">3. Company Resolutions</div>
						<div className="contract-section-body">
							<div className="contract-resolution-box">
								<p className="contract-section-note">
									To be completed if the USER is a company or other legal entity (not
									individuals or partnerships).
									<br />
									<strong>
										EXTRACT from the MINUTES of a MEETING of Directors / Members /
										Officials / Owners / Partners held at:
									</strong>
								</p>
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
								<p
									className="contract-section-note"
									style={{ marginTop: "0.75rem", marginBottom: 0 }}>
									be authorised to represent and to sign this agreement with StratCol
									Limited.
								</p>
							</div>
						</div>
					</div>
				)}

				{/* ══════════════════════════════════════════
				    Beneficial Owners
				    ══════════════════════════════════════════ */}
				<div className="contract-card">
					<div className="contract-section-header">Beneficial Owners</div>
					<div className="contract-section-body">
						<p className="contract-section-note">
							List all beneficial owners with 5% or more shareholding.
						</p>
						<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
							className="contract-add-btn"
							style={{ marginTop: "0.75rem" }}
							onClick={() =>
								appendOwner({ name: "", idNumber: "", address: "", position: "" })
							}>
							+ Add beneficial owner
						</button>
					</div>
				</div>

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
								<span
									className="contract-field-error"
									style={{ marginTop: "0.25rem", display: "block" }}>
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
