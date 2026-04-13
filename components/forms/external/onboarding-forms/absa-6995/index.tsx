"use client";

/**
 * Absa 6995 User Pre-screening Assessment Form
 * Mandatory assessment for collection facilities
 * Note: Using UK spelling throughout (e.g., organisation, authorisation, centre)
 *
 * Structure:
 * - Step 1: Applicant Details & Application Type
 * - Step 2: Directors & Contact Details
 * - Step 3: Banking & Collection History
 * - Step 4: Compliance & Metrics (Page 2)
 * - Step 5: Bureau Details (conditional)
 * - Step 6: Declarations & Signatures
 */

import { zodResolver } from "@hookform/resolvers/zod";
import {
	RiAddLine,
	RiBankLine,
	RiBuildingLine,
	RiDeleteBinLine,
	RiFileListLine,
	RiShieldCheckLine,
	RiUserLine,
} from "@remixicon/react";
import * as React from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
	ABSA_6995_STEP_TITLES,
	type Absa6995FormData,
	ApplicationType,
	absa6995Schema,
	ExitReason,
	getAbsa6995DefaultValues,
	SalesDistribution,
} from "@/lib/validations/onboarding";
import { FormStep, FormWizard, readPersistedWizardStep } from "../form-wizard";
import { SignatureCanvas } from "../signature-canvas";

// ============================================
// Types
// ============================================

interface Absa6995FormProps {
	/** Workflow ID */
	workflowId: number;
	/** Initial form data for editing */
	initialData?: Partial<Absa6995FormData>;
	/** Callback on successful submission */
	onSubmit: (data: Absa6995FormData) => Promise<void>;
	/** Callback to save draft */
	onSaveDraft?: (data: Partial<Absa6995FormData>) => Promise<void>;
	/** Whether the form is in read-only mode */
	readOnly?: boolean;
	/** External submitting state */
	isSubmitting?: boolean;
}

// ============================================
// Form Field Component
// ============================================

interface FormFieldProps {
	label: string;
	required?: boolean;
	error?: string;
	children: React.ReactNode;
	className?: string;
}

function FormField({ label, required, error, children, className }: FormFieldProps) {
	return (
		<div className={cn("space-y-2", className)}>
			<Label className="text-sm font-medium">
				{label}
				{required && <span className="text-destructive ml-1">*</span>}
			</Label>
			{children}
			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	);
}

// ============================================
// Checkbox Group Component
// ============================================

interface CheckboxOption {
	value: string;
	label: string;
}

interface CheckboxGroupProps {
	options: CheckboxOption[];
	value: string[];
	onChange: (value: string[]) => void;
	disabled?: boolean;
	columns?: 2 | 3 | 4;
}

function CheckboxGroup({
	options,
	value = [],
	onChange,
	disabled,
	columns = 2,
}: CheckboxGroupProps) {
	const handleChange = (optionValue: string, checked: boolean) => {
		if (checked) {
			onChange([...value, optionValue]);
		} else {
			onChange(value.filter(v => v !== optionValue));
		}
	};

	return (
		<div
			className={cn(
				"grid gap-2",
				columns === 2 && "grid-cols-2",
				columns === 3 && "grid-cols-3",
				columns === 4 && "grid-cols-4"
			)}>
			{options.map(option => (
				<div key={option.value} className="flex items-center gap-2">
					<Checkbox
						id={option.value}
						checked={value.includes(option.value)}
						onCheckedChange={checked => handleChange(option.value, checked as boolean)}
						disabled={disabled}
					/>
					<Label htmlFor={option.value} className="text-sm cursor-pointer">
						{option.label}
					</Label>
				</div>
			))}
		</div>
	);
}

// ============================================
// Option Configurations
// ============================================

const APPLICATION_TYPE_OPTIONS: CheckboxOption[] = [
	{ value: ApplicationType.EFT, label: "EFT" },
	{ value: ApplicationType.DEBICHECK, label: "DebiCheck" },
	{ value: ApplicationType.ABSAPAY, label: "AbsaPay" },
	{ value: ApplicationType.PAYMENTS, label: "Payments" },
	{ value: ApplicationType.NEW_TPPP, label: "New TPPP" },
	{ value: ApplicationType.PAYSHAP, label: "PayShap" },
	{ value: ApplicationType.RM, label: "RM" },
];

const SALES_DISTRIBUTION_OPTIONS: CheckboxOption[] = [
	{ value: SalesDistribution.DIRECT_SALES, label: "Direct Sales" },
	{ value: SalesDistribution.CALL_CENTRE, label: "Call Centre" },
	{ value: SalesDistribution.NETWORK_MARKETING, label: "Network Marketing" },
	{ value: SalesDistribution.FACE_TO_FACE, label: "Face-to-Face" },
];

const EXIT_REASON_OPTIONS: CheckboxOption[] = [
	{
		value: ExitReason.DEBITING_WITHOUT_MANDATE,
		label: "Debiting without a debit order mandate",
	},
	{
		value: ExitReason.DEBITING_WITHOUT_CONSENT,
		label: "Debiting without explicit consent",
	},
	{ value: ExitReason.OTHER, label: "Other" },
];

// ============================================
// Test Data
// ============================================

const TEST_DATA: Partial<Absa6995FormData> = {
	sectionA: {
		applicantDetails: {
			ultimateCreditorName: "Test Company (Pty) Ltd",
			preferredShortName: "TESTCO",
			alternativeShortNames: {
				alternative1: "TEST",
				alternative2: "TCO",
				alternative3: "TC",
				alternative4: "TCL",
			},
			natureOfBusiness: "Software Development",
			companyRegistrationNumber: "2024/123456/07",
		},
		applicationTypes: {
			applicationTypes: [ApplicationType.EFT, ApplicationType.DEBICHECK],
		},
		directors: {
			directors: [
				{ fullName: "John Doe", idNumber: "8001015009087" },
				{ fullName: "Jane Smith", idNumber: "8505050050080" },
				{ fullName: "Bob Jones", idNumber: "9009095009081" },
			],
		},
		contactDetails: {
			physicalAddress: {
				address: "123 Test Street",
				suburb: "Testville",
				townCity: "Test City",
				postalCode: "1234",
			},
			cipcRegisteredAddress: {
				address: "456 Reg Road",
				suburb: "Regville",
				townCity: "Reg City",
				postalCode: "5678",
			},
			telephoneNumber: "0111234567",
			emailAddress: "test@example.com",
			websiteAddress: "https://example.com",
		},
		bankingDetails: {
			bankName: "Test Bank",
			accountType: "Current",
			branchCode: "123456",
			accountNumber: "123456789",
			sourceOfIncome: "Sales",
		},
		collectionHistory: {
			salesDistribution: [SalesDistribution.DIRECT_SALES],
			isNewToCollections: true,
			hasPastCollections: false,
			pastCollectionProduct: "",
			previousShortName: "",
			collectingBureau: "",
		},
	},
	complianceHistory: {
		previousHistory: {
			previousSponsoringBank: "",
			hasBeenExited: false,
			exitReasons: [],
			exitReasonOther: "",
		},
		references: {
			references: [
				{ name: "Ref 1", accountNumber: "111", reference: "Good" },
				{ name: "Ref 2", accountNumber: "222", reference: "Good" },
				{ name: "Ref 3", accountNumber: "333", reference: "Good" },
				{ name: "Ref 4", accountNumber: "444", reference: "Good" },
				{ name: "Ref 5", accountNumber: "555", reference: "Good" },
			],
		},
		ratiosAndMetrics: {
			averageDisputeRatio: "1.5",
			averageUnpaidRatio: "2.0",
		},
		businessMetrics: {
			salesEmployeesCount: "10",
			averageDebitOrderValue: "500",
			presentBookSize: "1000",
			businessOperationLength: "5 years",
			isPresentlySponsored: false,
			sponsoringBankName: "",
			sponsorshipPeriodYears: "",
			sponsorshipPeriodMonths: "",
			hasLitigationPending: false,
			hasDirectorsUnderAdministration: false,
			hasFormalComplaints: false,
			hasComplianceConcerns: false,
		},
	},
	bureauDetails: {
		isApplicable: false,
		bureauName: "",
		ldCode: "",
		bureauCif: "",
	},
};

// ============================================
// Main Form Component
// ============================================

export function Absa6995Form({
	workflowId,
	initialData,
	onSubmit,
	onSaveDraft,
	readOnly = false,
	isSubmitting: externalIsSubmitting = false,
}: Absa6995FormProps) {
	const stepStorageKey = `absa-6995-${workflowId}`;
	const [currentStep, setCurrentStep] = React.useState(() =>
		readPersistedWizardStep(stepStorageKey, ABSA_6995_STEP_TITLES.length)
	);
	const [isSubmitting, setIsSubmitting] = React.useState(false);

	const methods = useForm<Absa6995FormData>({
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		resolver: zodResolver(absa6995Schema) as any,
		defaultValues: initialData ?? getAbsa6995DefaultValues(),
		mode: "onBlur",
	});

	const {
		handleSubmit,
		control,
		formState: { errors },
		watch,
		setValue,
		register,
	} = methods;

	// Directors field array
	const {
		fields: directors,
		append: addDirector,
		remove: removeDirector,
	} = useFieldArray({
		control,
		name: "sectionA.directors.directors",
	});

	// Form steps configuration
	const steps = ABSA_6995_STEP_TITLES.map((title, index) => ({
		id: `step-${index + 1}`,
		title,
		// Skip bureau details if not applicable
		shouldSkip: index === 4 ? () => !watch("bureauDetails.isApplicable") : undefined,
	}));

	// Handle form submission
	const handleFormSubmit = async (data: Absa6995FormData) => {
		setIsSubmitting(true);
		try {
			await onSubmit(data);
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle save draft
	const handleSaveDraft = async () => {
		if (onSaveDraft) {
			await onSaveDraft(methods.getValues());
		}
	};

	// Watch values for conditional rendering
	const applicationTypes = watch("sectionA.applicationTypes.applicationTypes") || [];
	const salesDistribution = watch("sectionA.collectionHistory.salesDistribution") || [];
	const hasPastCollections = watch("sectionA.collectionHistory.hasPastCollections");
	const hasBeenExited = watch("complianceHistory.previousHistory.hasBeenExited");
	const exitReasons = watch("complianceHistory.previousHistory.exitReasons") || [];
	const isPresentlySponsored = watch(
		"complianceHistory.businessMetrics.isPresentlySponsored"
	);
	const bureauApplicable = watch("bureauDetails.isApplicable");

	return (
		<FormProvider {...methods}>
			<form onSubmit={handleSubmit(handleFormSubmit)}>
				{process.env.NEXT_PUBLIC_TEST_FORMS === "true" && (
					<div className="mb-6 p-4 border border-dashed border-yellow-500/50 bg-yellow-50/50 rounded-lg flex items-center justify-between">
						<div className="space-y-1">
							<p className="text-sm font-medium text-yellow-800">Testing Mode Active</p>
							<p className="text-xs text-yellow-700">
								Click to autofill the form with test data.
							</p>
						</div>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => methods.reset(TEST_DATA as Absa6995FormData)}
							className="bg-white border-yellow-200 hover:bg-yellow-50 hover:text-yellow-900 text-yellow-800">
							Autofill Form
						</Button>
					</div>
				)}
				<FormWizard
					steps={steps}
					currentStep={currentStep}
					onStepChange={setCurrentStep}
					onSubmit={handleSubmit(handleFormSubmit)}
					onSaveDraft={onSaveDraft ? handleSaveDraft : undefined}
					title="Absa 6995 Pre-screening Assessment"
					isSubmitting={isSubmitting || externalIsSubmitting}
					storageKey={stepStorageKey}
					submitButtonText="Submit Assessment">
					{({ logicalStepIndex }) => (
						<>
							{/* Step 1: Applicant Details & Application Type */}
							<FormStep isActive={logicalStepIndex === 0}>
								<div className="space-y-6">
									<div className="flex items-center gap-2 mb-4">
										<RiBuildingLine className="h-5 w-5 text-muted-foreground" />
										<h3 className="text-lg font-semibold">Applicant Details</h3>
									</div>

									{/* Ultimate Creditor Details */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<FormField
											label="Name of the Ultimate Creditor"
											required
											error={
												errors.sectionA?.applicantDetails?.ultimateCreditorName?.message
											}>
											<Input
												{...register("sectionA.applicantDetails.ultimateCreditorName")}
												placeholder="Company name"
												disabled={readOnly}
											/>
										</FormField>

										<FormField
											label="Company Registration Number"
											required
											error={
												errors.sectionA?.applicantDetails?.companyRegistrationNumber
													?.message
											}>
											<Input
												{...register(
													"sectionA.applicantDetails.companyRegistrationNumber"
												)}
												placeholder="2024/123456/07"
												disabled={readOnly}
											/>
										</FormField>

										<FormField
											label="Preferred Abbreviated Short Name"
											required
											error={
												errors.sectionA?.applicantDetails?.preferredShortName?.message
											}>
											<Input
												{...register("sectionA.applicantDetails.preferredShortName")}
												placeholder="Short name for statements"
												disabled={readOnly}
											/>
										</FormField>

										<FormField label="Nature of Business">
											<Input
												{...register("sectionA.applicantDetails.natureOfBusiness")}
												placeholder="Describe your business"
												disabled={readOnly}
											/>
										</FormField>
									</div>

									{/* Alternative Short Names */}
									<div className="space-y-3 pt-4 border-t border-border">
										<h4 className="text-sm font-medium text-muted-foreground">
											Alternative Short Names (if preferred is unavailable)
										</h4>
										<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
											{[1, 2, 3, 4].map(num => (
												<FormField key={num} label={`Alternative ${num}`} required>
													<Input
														{...register(
															`sectionA.applicantDetails.alternativeShortNames.alternative${num}` as any
														)}
														placeholder={`Alt ${num}`}
														disabled={readOnly}
													/>
												</FormField>
											))}
										</div>
									</div>

									{/* Application Type */}
									<div className="space-y-3 pt-4 border-t border-border">
										<FormField
											label="Application Type"
											required
											error={
												errors.sectionA?.applicationTypes?.applicationTypes?.message
											}>
											<p className="text-xs text-muted-foreground mb-2">
												Select all that apply
											</p>
											<CheckboxGroup
												options={APPLICATION_TYPE_OPTIONS}
												value={applicationTypes}
												onChange={value =>
													setValue(
														"sectionA.applicationTypes.applicationTypes",
														value as any
													)
												}
												disabled={readOnly}
												columns={4}
											/>
										</FormField>
									</div>
								</div>
							</FormStep>

							{/* Step 2: Directors & Contact Details */}
							<FormStep isActive={logicalStepIndex === 1}>
								<div className="space-y-6">
									<div className="flex items-center gap-2 mb-4">
										<RiUserLine className="h-5 w-5 text-muted-foreground" />
										<h3 className="text-lg font-semibold">Directors & Contact Details</h3>
									</div>

									{/* Directors */}
									<div className="bg-zinc-900/10 rounded-xl border-zinc-300/10 p-1  space-y-4">
										<div className="flex items-center justify-between">
											<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
												Directors (Minimum 3 required)
											</h4>
											{!readOnly && directors.length < 10 && (
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() => addDirector({ fullName: "", idNumber: "" })}
													className="gap-1.5">
													<RiAddLine className="h-4 w-4" />
													Add Director
												</Button>
											)}
										</div>

										{directors.map((field, index) => (
											<div
												key={field.id}
												className="flex items-start gap-4 p-3 rounded-lg border border-border bg-muted/30">
												<div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
													<FormField label={`Director ${index + 1} Full Name`} required>
														<Input
															{...register(
																`sectionA.directors.directors.${index}.fullName`
															)}
															placeholder="Full name"
															disabled={readOnly}
														/>
													</FormField>
													<FormField label="ID Number" required>
														<Input
															{...register(
																`sectionA.directors.directors.${index}.idNumber`
															)}
															placeholder="13-digit ID number"
															maxLength={13}
															disabled={readOnly}
														/>
													</FormField>
												</div>
												{!readOnly && directors.length > 3 && (
													<Button
														type="button"
														variant="ghost"
														size="icon"
														onClick={() => removeDirector(index)}
														className="h-8 w-8 text-destructive shrink-0 mt-6">
														<RiDeleteBinLine className="h-4 w-4" />
													</Button>
												)}
											</div>
										))}
									</div>

									{/* Contact Details */}
									<div className="bg-zinc-900/15 rounded-xl border-zinc-300/10 px-4  space-y-4 py-4 border-t border-[1.5px]">
										<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
											Physical Operating Address
										</h4>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<FormField label="Address" required className="md:col-span-2">
												<Input
													{...register("sectionA.contactDetails.physicalAddress.address")}
													placeholder="Street address"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Suburb" required>
												<Input
													{...register("sectionA.contactDetails.physicalAddress.suburb")}
													placeholder="Suburb"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Town/City" required>
												<Input
													{...register(
														"sectionA.contactDetails.physicalAddress.townCity"
													)}
													placeholder="Town/City"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Postal Code" required>
												<Input
													{...register(
														"sectionA.contactDetails.physicalAddress.postalCode"
													)}
													placeholder="0000"
													maxLength={4}
													disabled={readOnly}
												/>
											</FormField>
										</div>
									</div>

									<div className="bg-zinc-900/15 rounded-xl border-zinc-300/10 px-4  space-y-4 py-4 border-t border-[1.5px]">
										<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
											CIPC Registered Address
										</h4>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<FormField label="Address" required className="md:col-span-2">
												<Input
													{...register(
														"sectionA.contactDetails.cipcRegisteredAddress.address"
													)}
													placeholder="Street address"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Suburb" required>
												<Input
													{...register(
														"sectionA.contactDetails.cipcRegisteredAddress.suburb"
													)}
													placeholder="Suburb"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Town/City" required>
												<Input
													{...register(
														"sectionA.contactDetails.cipcRegisteredAddress.townCity"
													)}
													placeholder="Town/City"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Postal Code" required>
												<Input
													{...register(
														"sectionA.contactDetails.cipcRegisteredAddress.postalCode"
													)}
													placeholder="0000"
													maxLength={4}
													disabled={readOnly}
												/>
											</FormField>
										</div>
									</div>

									<div className="bg-zinc-900/15 rounded-xl border-zinc-300/10 px-4  space-y-4 py-4 border-t border-[1.5px]">
										<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
											Contact Information
										</h4>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
											<FormField
												label="Telephone Number"
												required
												error={errors.sectionA?.contactDetails?.telephoneNumber?.message}>
												<Input
													{...register("sectionA.contactDetails.telephoneNumber")}
													placeholder="+27 XX XXX XXXX"
													disabled={readOnly}
												/>
											</FormField>
											<FormField
												label="Email Address"
												required
												error={errors.sectionA?.contactDetails?.emailAddress?.message}>
												<Input
													{...register("sectionA.contactDetails.emailAddress")}
													type="email"
													placeholder="email@company.co.za"
													disabled={readOnly}
												/>
											</FormField>
											<FormField
												label="Website Address"
												required
												error={errors.sectionA?.contactDetails?.websiteAddress?.message}>
												<Input
													{...register("sectionA.contactDetails.websiteAddress")}
													placeholder="https://www.company.co.za"
													disabled={readOnly}
												/>
											</FormField>
										</div>
									</div>
								</div>
							</FormStep>

							{/* Step 3: Banking & Collection History */}
							<FormStep isActive={logicalStepIndex === 2}>
								<div className="bg-zinc-900/10 rounded-xl border-zinc-300/10 p-1  space-y-6">
									<div className="flex items-center gap-2 mb-4">
										<RiBankLine className="h-5 w-5 text-muted-foreground" />
										<h3 className="text-lg font-semibold">
											Banking & Collection History
										</h3>
									</div>

									{/* Banking Details */}
									<div className="bg-zinc-900/10 rounded-xl border-zinc-300/10 p-1  space-y-4">
										<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
											Banking Details
										</h4>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<FormField label="Bank Name">
												<Input
													{...register("sectionA.bankingDetails.bankName")}
													placeholder="Bank where funds will be credited"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Account Type">
												<Input
													{...register("sectionA.bankingDetails.accountType")}
													placeholder="e.g., Current, Savings"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Branch Code">
												<Input
													{...register("sectionA.bankingDetails.branchCode")}
													placeholder="6-digit code"
													maxLength={6}
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Account Number">
												<Input
													{...register("sectionA.bankingDetails.accountNumber")}
													placeholder="Account number"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Source of Income" className="md:col-span-2">
												<Input
													{...register("sectionA.bankingDetails.sourceOfIncome")}
													placeholder="Describe source of income"
													disabled={readOnly}
												/>
											</FormField>
										</div>
									</div>

									{/* Sales Distribution */}
									<div className="bg-zinc-900/10 rounded-xl border-zinc-300/10 p-1  space-y-3 pt-4 border-t border-border">
										<FormField label="Sales Distribution">
											<p className="text-xs text-muted-foreground mb-2">
												Select all that apply
											</p>
											<CheckboxGroup
												options={SALES_DISTRIBUTION_OPTIONS}
												value={salesDistribution}
												onChange={value =>
													setValue(
														"sectionA.collectionHistory.salesDistribution",
														value as any
													)
												}
												disabled={readOnly}
											/>
										</FormField>
									</div>

									{/* Collection History */}
									<div className="bg-zinc-900/15 rounded-xl border-zinc-300/10 px-4  space-y-4 py-4 border-t border-[1.5px]">
										<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
											Collection History
										</h4>

										<div className="flex items-center gap-3 p-3 rounded-lg border border-border">
											<Checkbox
												id="newToCollections"
												checked={watch("sectionA.collectionHistory.isNewToCollections")}
												onCheckedChange={checked =>
													setValue(
														"sectionA.collectionHistory.isNewToCollections",
														checked as boolean
													)
												}
												disabled={readOnly}
											/>
											<Label
												htmlFor="newToCollections"
												className="text-sm cursor-pointer">
												The Ultimate Creditor is new to collections
											</Label>
										</div>

										<div className="flex items-center gap-3 p-3 rounded-lg border border-border">
											<Checkbox
												id="pastCollections"
												checked={hasPastCollections}
												onCheckedChange={checked =>
													setValue(
														"sectionA.collectionHistory.hasPastCollections",
														checked as boolean
													)
												}
												disabled={readOnly}
											/>
											<Label htmlFor="pastCollections" className="text-sm cursor-pointer">
												Have you in the past collected for any other product/service?
											</Label>
										</div>

										{hasPastCollections && (
											<div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-8">
												<FormField label="Previous Product/Service">
													<Input
														{...register(
															"sectionA.collectionHistory.pastCollectionProduct"
														)}
														placeholder="What was collected"
														disabled={readOnly}
													/>
												</FormField>
												<FormField label="Previous Short Name">
													<Input
														{...register("sectionA.collectionHistory.previousShortName")}
														placeholder="Previous abbreviated name"
														disabled={readOnly}
													/>
												</FormField>
												<FormField label="Collecting Bureau">
													<Input
														{...register("sectionA.collectionHistory.collectingBureau")}
														placeholder="Bureau name"
														disabled={readOnly}
													/>
												</FormField>
											</div>
										)}
									</div>
								</div>
							</FormStep>

							{/* Step 4: Compliance & Metrics */}
							<FormStep isActive={logicalStepIndex === 3}>
								<div className="space-y-6">
									<div className="flex items-center gap-2 mb-4">
										<RiShieldCheckLine className="h-5 w-5 text-muted-foreground" />
										<h3 className="text-lg font-semibold">Compliance & Metrics</h3>
									</div>

									{/* Previous History */}
									<div className="bg-zinc-900/10 rounded-xl border-zinc-300/10 p-1  space-y-4">
										<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
											Previous History
										</h4>

										<FormField label="Previous Sponsoring Bank">
											<Input
												{...register(
													"complianceHistory.previousHistory.previousSponsoringBank"
												)}
												placeholder="Name of previous bank"
												disabled={readOnly}
											/>
										</FormField>

										<div className="flex items-center gap-3 p-3 rounded-lg border border-border">
											<Checkbox
												id="hasBeenExited"
												checked={hasBeenExited}
												onCheckedChange={checked =>
													setValue(
														"complianceHistory.previousHistory.hasBeenExited",
														checked as boolean
													)
												}
												disabled={readOnly}
											/>
											<Label htmlFor="hasBeenExited" className="text-sm cursor-pointer">
												Has your business been exited from a sponsoring bank or bureau?
											</Label>
										</div>

										{hasBeenExited && (
											<div className="bg-zinc-900/10 rounded-xl border-zinc-300/10 p-1  pl-8 space-y-3">
												<FormField label="Reason for Exit">
													<CheckboxGroup
														options={EXIT_REASON_OPTIONS}
														value={exitReasons}
														onChange={value =>
															setValue(
																"complianceHistory.previousHistory.exitReasons",
																value as any
															)
														}
														disabled={readOnly}
														columns={2}
													/>
												</FormField>

												{exitReasons.includes(ExitReason.OTHER) && (
													<FormField label="Other Reason">
														<Input
															{...register(
																"complianceHistory.previousHistory.exitReasonOther"
															)}
															placeholder="Specify other reason"
															disabled={readOnly}
														/>
													</FormField>
												)}
											</div>
										)}
									</div>

									{/* References */}
									<div className="bg-zinc-900/15 rounded-xl border-zinc-300/10 px-4  space-y-4 py-4 border-t border-[1.5px]">
										<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
											References (5 Absa-banked clients you debited in the past)
										</h4>

										{[0, 1, 2, 3, 4].map(index => (
											<div
												key={index}
												className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 rounded-lg border border-border bg-muted/30">
												<FormField label={`Reference ${index + 1} - Name`}>
													<Input
														{...register(
															`complianceHistory.references.references.${index}.name` as any
														)}
														placeholder="Client name"
														disabled={readOnly}
													/>
												</FormField>
												<FormField label="Account Number">
													<Input
														{...register(
															`complianceHistory.references.references.${index}.accountNumber` as any
														)}
														placeholder="Account number"
														disabled={readOnly}
													/>
												</FormField>
												<FormField label="Reference">
													<Input
														{...register(
															`complianceHistory.references.references.${index}.reference` as any
														)}
														placeholder="Reference number"
														disabled={readOnly}
													/>
												</FormField>
											</div>
										))}
									</div>

									{/* Ratios & Business Metrics */}
									<div className="bg-zinc-900/15 rounded-xl border-zinc-300/10 px-4  space-y-4 py-4 border-t border-[1.5px]">
										<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
											Ratios & Business Metrics
										</h4>

										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<FormField label="Average Dispute Ratio (%)">
												<Input
													{...register(
														"complianceHistory.ratiosAndMetrics.averageDisputeRatio"
													)}
													placeholder="e.g., 2.5"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Average Unpaid Ratio (%)">
												<Input
													{...register(
														"complianceHistory.ratiosAndMetrics.averageUnpaidRatio"
													)}
													placeholder="e.g., 5.0"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Sales Employees Count">
												<Input
													{...register(
														"complianceHistory.businessMetrics.salesEmployeesCount"
													)}
													placeholder="Number of employees"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Average Debit Order Value">
												<Input
													{...register(
														"complianceHistory.businessMetrics.averageDebitOrderValue"
													)}
													placeholder="R 0.00"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Present Book Size (Volume & Value)">
												<Input
													{...register(
														"complianceHistory.businessMetrics.presentBookSize"
													)}
													placeholder="e.g., 10,000 transactions / R5m"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Business Operation Length">
												<Input
													{...register(
														"complianceHistory.businessMetrics.businessOperationLength"
													)}
													placeholder="e.g., 5 years"
													disabled={readOnly}
												/>
											</FormField>
										</div>

										{/* Sponsorship */}
										<div className="bg-zinc-900/10 rounded-xl border-zinc-300/10 p-1  flex items-center gap-3 p-3 rounded-lg border border-border">
											<Checkbox
												id="isPresentlySponsored"
												checked={isPresentlySponsored}
												onCheckedChange={checked =>
													setValue(
														"complianceHistory.businessMetrics.isPresentlySponsored",
														checked as boolean
													)
												}
												disabled={readOnly}
											/>
											<Label
												htmlFor="isPresentlySponsored"
												className="text-sm cursor-pointer">
												Are you presently sponsored by another bank/bureau?
											</Label>
										</div>

										{isPresentlySponsored && (
											<div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-8">
												<FormField label="Sponsoring Bank Name">
													<Input
														{...register(
															"complianceHistory.businessMetrics.sponsoringBankName"
														)}
														placeholder="Bank name"
														disabled={readOnly}
													/>
												</FormField>
												<FormField label="Period (Years)">
													<Input
														{...register(
															"complianceHistory.businessMetrics.sponsorshipPeriodYears"
														)}
														placeholder="Years"
														disabled={readOnly}
													/>
												</FormField>
												<FormField label="Period (Months)">
													<Input
														{...register(
															"complianceHistory.businessMetrics.sponsorshipPeriodMonths"
														)}
														placeholder="Months"
														disabled={readOnly}
													/>
												</FormField>
											</div>
										)}

										{/* Yes/No Questions */}
										<div className="space-y-3 over">
											{[
												{
													id: "hasLitigationPending",
													label:
														"Is there litigation pending regarding debiting without consent?",
													field:
														"complianceHistory.businessMetrics.hasLitigationPending" as const,
												},
												{
													id: "hasDirectorsUnderAdmin",
													label:
														"Are any directors under administration order/debt rearrangement?",
													field:
														"complianceHistory.businessMetrics.hasDirectorsUnderAdministration" as const,
												},
												{
													id: "hasFormalComplaints",
													label: "Are there formal complaints lodged (PASA, SARB, FSCA)?",
													field:
														"complianceHistory.businessMetrics.hasFormalComplaints" as const,
												},
												{
													id: "hasComplianceConcerns",
													label:
														"Do you have compliance concerns regarding your existing client base?",
													field:
														"complianceHistory.businessMetrics.hasComplianceConcerns" as const,
												},
											].map(item => (
												<div
													key={item.id}
													className="bg-zinc-900/10 rounded-xl border-zinc-300/10 p-4 space-y-3 over flex items-center gap-3 border">
													<Checkbox
														id={item.id}
														checked={watch(item.field)}
														onCheckedChange={checked =>
															setValue(item.field, checked as boolean)
														}
														disabled={readOnly}
													/>
													<Label htmlFor={item.id} className="text-sm cursor-pointer">
														{item.label}
													</Label>
												</div>
											))}
										</div>
									</div>
								</div>
							</FormStep>

							{/* Step 5: Bureau Details (Conditional) */}
							<FormStep isActive={logicalStepIndex === 4}>
								<div className="space-y-6">
									<div className="flex items-center gap-2 mb-4">
										<RiBuildingLine className="h-5 w-5 text-muted-foreground" />
										<h3 className="text-lg font-semibold">Bureau Details</h3>
									</div>

									<div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
										<Checkbox
											id="bureauApplicable"
											checked={bureauApplicable}
											onCheckedChange={checked =>
												setValue("bureauDetails.isApplicable", checked as boolean)
											}
											disabled={readOnly}
										/>
										<Label htmlFor="bureauApplicable" className="text-sm cursor-pointer">
											Bureau details are applicable
										</Label>
									</div>

									{bureauApplicable && (
										<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
											<FormField label="Bureau Name">
												<Input
													{...register("bureauDetails.bureauName")}
													placeholder="Bureau name"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="LD Code">
												<Input
													{...register("bureauDetails.ldCode")}
													placeholder="LD code"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Bureau CIF">
												<Input
													{...register("bureauDetails.bureauCif")}
													placeholder="CIF number"
													disabled={readOnly}
												/>
											</FormField>
										</div>
									)}

									{!bureauApplicable && (
										<p className="text-sm text-muted-foreground text-center py-8">
											Bureau details are not applicable. You can proceed to the next step.
										</p>
									)}
								</div>
							</FormStep>

							{/* Step 6: Declarations & Signatures */}
							<FormStep isActive={logicalStepIndex === 5}>
								<div className="space-y-6">
									<div className="flex items-center gap-2 mb-4">
										<RiFileListLine className="h-5 w-5 text-muted-foreground" />
										<h3 className="text-lg font-semibold">Declarations & Signatures</h3>
									</div>

									{/* Document Checklist */}
									<div className="space-y-4">
										<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
											Document Checklist
										</h4>
										<p className="text-xs text-muted-foreground">
											Please confirm the following documents will accompany this request
										</p>

										<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
											<div className="bg-zinc-900/10 rounded-xl border-zinc-300/10 p-1  flex items-center gap-3 p-3 rounded-lg border border-border">
												<Checkbox
													id="directorsIds"
													checked={watch("sectionC.documentChecklist.directorsIds")}
													onCheckedChange={checked =>
														setValue(
															"sectionC.documentChecklist.directorsIds",
															checked as boolean
														)
													}
													disabled={readOnly}
												/>
												<Label htmlFor="directorsIds" className="text-sm cursor-pointer">
													Copy of directors' IDs
												</Label>
											</div>
											<div className="bg-zinc-900/10 rounded-xl border-zinc-300/10 p-1  flex items-center gap-3 p-3 rounded-lg border border-border">
												<Checkbox
													id="proofOfBusinessAddress"
													checked={watch(
														"sectionC.documentChecklist.proofOfBusinessAddress"
													)}
													onCheckedChange={checked =>
														setValue(
															"sectionC.documentChecklist.proofOfBusinessAddress",
															checked as boolean
														)
													}
													disabled={readOnly}
												/>
												<Label
													htmlFor="proofOfBusinessAddress"
													className="text-sm cursor-pointer">
													Proof of business address
												</Label>
											</div>
											<div className="bg-zinc-900/10 rounded-xl border-zinc-300/10 p-1  flex items-center gap-3 p-3 rounded-lg border border-border">
												<Checkbox
													id="bankStatements"
													checked={watch("sectionC.documentChecklist.bankStatements")}
													onCheckedChange={checked =>
														setValue(
															"sectionC.documentChecklist.bankStatements",
															checked as boolean
														)
													}
													disabled={readOnly}
												/>
												<Label
													htmlFor="bankStatements"
													className="text-sm cursor-pointer">
													3 months bank statements
												</Label>
											</div>
											<div className="bg-zinc-900/10 rounded-xl border-zinc-300/10 p-1  flex items-center gap-3 p-3 rounded-lg border border-border">
												<Checkbox
													id="cipcDocuments"
													checked={watch("sectionC.documentChecklist.cipcDocuments")}
													onCheckedChange={checked =>
														setValue(
															"sectionC.documentChecklist.cipcDocuments",
															checked as boolean
														)
													}
													disabled={readOnly}
												/>
												<Label htmlFor="cipcDocuments" className="text-sm cursor-pointer">
													Latest CIPC and registration documents
												</Label>
											</div>
											<div className="bg-zinc-900/10 rounded-xl border-zinc-300/10 p-1  flex items-center gap-3 p-3 rounded-lg border border-border">
												<Checkbox
													id="regulatedIndustryCertificates"
													checked={watch(
														"sectionC.documentChecklist.regulatedIndustryCertificates"
													)}
													onCheckedChange={checked =>
														setValue(
															"sectionC.documentChecklist.regulatedIndustryCertificates",
															checked as boolean
														)
													}
													disabled={readOnly}
												/>
												<Label
													htmlFor="regulatedIndustryCertificates"
													className="text-sm cursor-pointer">
													Certified copies for regulated industries (NCR, FSCA, etc.)
												</Label>
											</div>
											<div className="bg-zinc-900/10 rounded-xl border-zinc-300/10 p-1  flex items-center gap-3 p-3 rounded-lg border border-border">
												<Checkbox
													id="clientMandates"
													checked={watch("sectionC.documentChecklist.clientMandates")}
													onCheckedChange={checked =>
														setValue(
															"sectionC.documentChecklist.clientMandates",
															checked as boolean
														)
													}
													disabled={readOnly}
												/>
												<Label
													htmlFor="clientMandates"
													className="text-sm cursor-pointer">
													Five mandates of existing clients
												</Label>
											</div>
											<div className="bg-zinc-900/10 rounded-xl border-zinc-300/10 p-1  flex items-center gap-3 p-3 rounded-lg border border-border">
												<Checkbox
													id="marketingMaterial"
													checked={watch("sectionC.documentChecklist.marketingMaterial")}
													onCheckedChange={checked =>
														setValue(
															"sectionC.documentChecklist.marketingMaterial",
															checked as boolean
														)
													}
													disabled={readOnly}
												/>
												<Label
													htmlFor="marketingMaterial"
													className="text-sm cursor-pointer">
													Brochure or marketing material
												</Label>
											</div>
										</div>
									</div>

									{/* Declarations */}
									<div className="space-y-4 pt-4 border-t border-border">
										<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
											Declarations & Warranties
										</h4>

										<div
											className={cn(
												"bg-zinc-900/10 rounded-xl border-zinc-200/30  flex items-start gap-3 p-3 border-[1.5px] shadow-md shadow-black/20",
												errors.sectionC?.declarations?.informationTrueAndCorrect
													? "border-destructive bg-destructive/5"
													: "border-border"
											)}>
											<Checkbox
												id="informationTrueAndCorrect"
												checked={watch("sectionC.declarations.informationTrueAndCorrect")}
												onCheckedChange={checked =>
													setValue(
														"sectionC.declarations.informationTrueAndCorrect",
														checked as boolean
													)
												}
												disabled={readOnly}
												className="mt-0.5"
											/>
											<Label
												htmlFor="informationTrueAndCorrect"
												className="text-sm cursor-pointer leading-relaxed">
												I confirm that all information provided is true and correct.
												<span className="text-destructive ml-1">*</span>
											</Label>
										</div>

										<div
											className={cn(
												"bg-zinc-900/10 rounded-xl border-zinc-200/30  flex items-start gap-3 p-3 border-[1.5px] shadow-md shadow-black/20",
												errors.sectionC?.declarations?.misrepresentationAcknowledgement
													? "border-destructive bg-destructive/5"
													: "border-border"
											)}>
											<Checkbox
												id="misrepresentationAcknowledgement"
												checked={watch(
													"sectionC.declarations.misrepresentationAcknowledgement"
												)}
												onCheckedChange={checked =>
													setValue(
														"sectionC.declarations.misrepresentationAcknowledgement",
														checked as boolean
													)
												}
												disabled={readOnly}
												className="mt-0.5"
											/>
											<Label
												htmlFor="misrepresentationAcknowledgement"
												className="text-sm cursor-pointer leading-relaxed">
												I acknowledge that misrepresentation may result in legal action.
												<span className="text-destructive ml-1">*</span>
											</Label>
										</div>

										<div
											className={cn(
												"bg-zinc-900/10 rounded-xl border-zinc-200/30  flex items-start gap-3 p-3 border-[1.5px] shadow-md shadow-black/20",
												errors.sectionC?.declarations?.debitingConsentAcknowledgement
													? "border-destructive bg-destructive/5"
													: "border-border"
											)}>
											<Checkbox
												id="debitingConsentAcknowledgement"
												checked={watch(
													"sectionC.declarations.debitingConsentAcknowledgement"
												)}
												onCheckedChange={checked =>
													setValue(
														"sectionC.declarations.debitingConsentAcknowledgement",
														checked as boolean
													)
												}
												disabled={readOnly}
												className="mt-0.5"
											/>
											<Label
												htmlFor="debitingConsentAcknowledgement"
												className="text-sm cursor-pointer leading-relaxed">
												I acknowledge that debiting without consent is a criminal offence.
												<span className="text-destructive ml-1">*</span>
											</Label>
										</div>

										<div
											className={cn(
												"bg-zinc-900/10 rounded-xl border-zinc-200/30  flex items-start gap-3 p-3 border-[1.5px] shadow-md shadow-black/20",
												errors.sectionC?.declarations?.personalInfoProcessingConsent
													? "border-destructive bg-destructive/5"
													: "border-border"
											)}>
											<Checkbox
												id="personalInfoProcessingConsent"
												checked={watch(
													"sectionC.declarations.personalInfoProcessingConsent"
												)}
												onCheckedChange={checked =>
													setValue(
														"sectionC.declarations.personalInfoProcessingConsent",
														checked as boolean
													)
												}
												disabled={readOnly}
												className="mt-0.5"
											/>
											<Label
												htmlFor="personalInfoProcessingConsent"
												className="text-sm cursor-pointer leading-relaxed">
												I consent to Absa processing personal information for
												pre-screening.
												<span className="text-destructive ml-1">*</span>
											</Label>
										</div>

										<div
											className={cn(
												"bg-zinc-900/10 rounded-xl border-zinc-200/30  flex items-start gap-3 p-3 border-[1.5px] shadow-md shadow-black/20",
												errors.sectionC?.declarations?.infoSharingUnderstanding
													? "border-destructive bg-destructive/5"
													: "border-border"
											)}>
											<Checkbox
												id="infoSharingUnderstanding"
												checked={watch("sectionC.declarations.infoSharingUnderstanding")}
												onCheckedChange={checked =>
													setValue(
														"sectionC.declarations.infoSharingUnderstanding",
														checked as boolean
													)
												}
												disabled={readOnly}
												className="mt-0.5"
											/>
											<Label
												htmlFor="infoSharingUnderstanding"
												className="text-sm cursor-pointer leading-relaxed">
												I understand that Absa may share information with credit
												bureaus/regulators.
												<span className="text-destructive ml-1">*</span>
											</Label>
										</div>

										<div className="bg-zinc-900/10 rounded-xl border-zinc-200/30  flex items-start gap-3 p-3 border-[1.5px] shadow-md shadow-black/20">
											<Checkbox
												id="tpppConsentWarranty"
												checked={watch("sectionC.declarations.tpppConsentWarranty")}
												onCheckedChange={checked =>
													setValue(
														"sectionC.declarations.tpppConsentWarranty",
														checked as boolean
													)
												}
												disabled={readOnly}
												className="mt-0.5"
											/>
											<Label
												htmlFor="tpppConsentWarranty"
												className="text-sm cursor-pointer leading-relaxed">
												Warranty that TPPP has obtained consent from the Ultimate
												Creditor.
											</Label>
										</div>

										<div className="bg-zinc-900/10 rounded-xl border-zinc-300/10 p-1  flex items-start gap-3 p-3 rounded-lg border border-border">
											<Checkbox
												id="ultimateCreditorInfoWarranty"
												checked={watch(
													"sectionC.declarations.ultimateCreditorInfoWarranty"
												)}
												onCheckedChange={checked =>
													setValue(
														"sectionC.declarations.ultimateCreditorInfoWarranty",
														checked as boolean
													)
												}
												disabled={readOnly}
												className="mt-0.5"
											/>
											<Label
												htmlFor="ultimateCreditorInfoWarranty"
												className="text-sm cursor-pointer leading-relaxed">
												Warranty that the Ultimate Creditor is informed about data
												sharing.
											</Label>
										</div>
									</div>

									{/* Signatures */}
									<div className="space-y-6 pt-4 border-t border-border">
										<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
											Signatures
										</h4>

										{/* Client Signature */}
										<div className="space-y-4 p-4 rounded-lg border border-border bg-muted/30">
											<h5 className="font-medium">Client Signature</h5>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<FormField label="Client's Name" required>
													<Input
														{...register("sectionC.signatures.clientSignature.name")}
														placeholder="Full name"
														disabled={readOnly}
													/>
												</FormField>
												<FormField label="Date" required>
													<Input
														{...register("sectionC.signatures.clientSignature.date")}
														type="date"
														disabled={readOnly}
													/>
												</FormField>
											</div>
											<SignatureCanvas
												label="Client Signature"
												required
												onSave={dataUrl =>
													setValue(
														"sectionC.signatures.clientSignature.signature",
														dataUrl
													)
												}
												initialValue={watch(
													"sectionC.signatures.clientSignature.signature"
												)}
												error={
													errors.sectionC?.signatures?.clientSignature?.signature?.message
												}
												disabled={readOnly}
											/>
										</div>

										{/* TPPP Official Signature */}
										<div className="space-y-4 p-4 rounded-lg border border-border bg-muted/30">
											<h5 className="font-medium">
												TPPP/SO Mandated Official (if applicable)
											</h5>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<FormField label="Official's Name">
													<Input
														{...register("sectionC.signatures.tpppOfficialName")}
														placeholder="Full name"
														disabled={readOnly}
													/>
												</FormField>
												<FormField label="Date">
													<Input
														{...register(
															"sectionC.signatures.tpppOfficialSignature.date"
														)}
														type="date"
														disabled={readOnly}
													/>
												</FormField>
											</div>
											<SignatureCanvas
												label="Official Signature"
												onSave={dataUrl =>
													setValue(
														"sectionC.signatures.tpppOfficialSignature.signature",
														dataUrl
													)
												}
												initialValue={watch(
													"sectionC.signatures.tpppOfficialSignature.signature"
												)}
												disabled={readOnly}
											/>
										</div>
									</div>
								</div>
							</FormStep>
						</>
					)}
				</FormWizard>
			</form>
		</FormProvider>
	);
}
