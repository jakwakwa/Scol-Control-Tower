"use client";

/**
 * StratCol Agreement Form
 * Core contract establishing legal relationship and primary entity data
 * Note: Using UK spelling throughout (e.g., organisation, authorisation)
 */
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	RiAddLine,
	RiBankLine,
	RiBuildingLine,
	RiDeleteBinLine,
	RiUserLine,
} from "@remixicon/react";
import * as React from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { FormStep, FormWizard } from "../form-wizard";
import { SignatureCanvas } from "../signature-canvas";

import {
	EntityType,
	STRATCOL_AGREEMENT_STEP_TITLES,
	stratcolAgreementSchema,
	type StratcolAgreementFormData,
} from "@/lib/validations/onboarding";

// ============================================
// Types
// ============================================

interface StratcolAgreementFormProps {
	/** Workflow ID */
	workflowId: number;
	/** Initial form data for editing */
	initialData?: Partial<StratcolAgreementFormData>;
	/** Callback on successful submission */
	onSubmit: (data: StratcolAgreementFormData) => Promise<void>;
	/** Callback to save draft */
	onSaveDraft?: (data: Partial<StratcolAgreementFormData>) => Promise<void>;
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
// Section Components
// ============================================

function EntityDetailsSection() {
	const {
		register,
		formState: { errors },
		watch,
		setValue,
	} = useForm<StratcolAgreementFormData>();

	const entityType = watch("entityDetails.entityType");

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-2 mb-4">
				<RiBuildingLine className="h-5 w-5 text-muted-foreground" />
				<h3 className="text-lg font-semibold">Entity Details</h3>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<FormField
					label="Registered Name"
					required
					error={errors.entityDetails?.registeredName?.message}>
					<Input
						{...register("entityDetails.registeredName")}
						placeholder="Company (Pty) Ltd"
					/>
				</FormField>

				<FormField
					label="Trading Name"
					required
					error={errors.entityDetails?.tradingName?.message}>
					<Input {...register("entityDetails.tradingName")} placeholder="Trading As" />
				</FormField>

				<FormField
					label="Proprietor Name"
					error={errors.entityDetails?.proprietorName?.message}>
					<Input
						{...register("entityDetails.proprietorName")}
						placeholder="If applicable"
					/>
				</FormField>

				<FormField
					label="Registration Number"
					required
					error={errors.entityDetails?.registrationNumber?.message}>
					<Input
						{...register("entityDetails.registrationNumber")}
						placeholder="2024/123456/07"
					/>
				</FormField>

				<FormField
					label="Entity Type"
					required
					error={errors.entityDetails?.entityType?.message}>
					<Select
						value={entityType}
						onValueChange={value => setValue("entityDetails.entityType", value as any)}>
						<SelectTrigger>
							<SelectValue placeholder="Select entity type" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={EntityType.PROPRIETOR}>Proprietor</SelectItem>
							<SelectItem value={EntityType.COMPANY}>Company</SelectItem>
							<SelectItem value={EntityType.CLOSE_CORPORATION}>
								Close Corporation
							</SelectItem>
							<SelectItem value={EntityType.PARTNERSHIP}>Partnership</SelectItem>
							<SelectItem value={EntityType.OTHER}>Other</SelectItem>
						</SelectContent>
					</Select>
				</FormField>

				{entityType === EntityType.OTHER && (
					<FormField label="Specify Entity Type" required>
						<Input
							{...register("entityDetails.otherEntityType")}
							placeholder="Specify type"
						/>
					</FormField>
				)}
			</div>

			{/* Business Address */}
			<div className="space-y-4">
				<h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
					Business Address
				</h4>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormField
						label="Address"
						required
						error={errors.entityDetails?.businessAddress?.address?.message}
						className="md:col-span-2">
						<Input
							{...register("entityDetails.businessAddress.address")}
							placeholder="Street address"
						/>
					</FormField>
					<FormField
						label="Suburb"
						required
						error={errors.entityDetails?.businessAddress?.suburb?.message}>
						<Input
							{...register("entityDetails.businessAddress.suburb")}
							placeholder="Suburb"
						/>
					</FormField>
					<FormField
						label="Town/City"
						required
						error={errors.entityDetails?.businessAddress?.townCity?.message}>
						<Input
							{...register("entityDetails.businessAddress.townCity")}
							placeholder="Town/City"
						/>
					</FormField>
					<FormField
						label="Postal Code"
						required
						error={errors.entityDetails?.businessAddress?.postalCode?.message}>
						<Input
							{...register("entityDetails.businessAddress.postalCode")}
							placeholder="0000"
							maxLength={4}
						/>
					</FormField>
				</div>
			</div>

			{/* Postal Address */}
			<div className="space-y-4">
				<h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
					Postal Address
				</h4>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormField
						label="Address"
						required
						error={errors.entityDetails?.postalAddress?.address?.message}
						className="md:col-span-2">
						<Input
							{...register("entityDetails.postalAddress.address")}
							placeholder="Postal address"
						/>
					</FormField>
					<FormField
						label="Suburb"
						required
						error={errors.entityDetails?.postalAddress?.suburb?.message}>
						<Input
							{...register("entityDetails.postalAddress.suburb")}
							placeholder="Suburb"
						/>
					</FormField>
					<FormField
						label="Town/City"
						required
						error={errors.entityDetails?.postalAddress?.townCity?.message}>
						<Input
							{...register("entityDetails.postalAddress.townCity")}
							placeholder="Town/City"
						/>
					</FormField>
					<FormField
						label="Postal Code"
						required
						error={errors.entityDetails?.postalAddress?.postalCode?.message}>
						<Input
							{...register("entityDetails.postalAddress.postalCode")}
							placeholder="0000"
							maxLength={4}
						/>
					</FormField>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<FormField label="Duration at Address">
					<Input
						{...register("entityDetails.durationAtAddress")}
						placeholder="e.g., 5 years"
					/>
				</FormField>
				<FormField label="Industry Tenure">
					<Input
						{...register("entityDetails.industryTenure")}
						placeholder="e.g., 10 years"
					/>
				</FormField>
			</div>
		</div>
	);
}

// ============================================
// Test Data
// ============================================

const TEST_DATA: Partial<StratcolAgreementFormData> = {
	entityDetails: {
		registeredName: "Test Entity (Pty) Ltd",
		tradingName: "Test Entity",
		registrationNumber: "2024/100200/07",
		entityType: EntityType.COMPANY,
		businessAddress: {
			address: "10 Business Rd",
			suburb: "Bizville",
			townCity: "Biz City",
			postalCode: "1000",
		},
		postalAddress: {
			address: "PO Box 10",
			suburb: "Postville",
			townCity: "Post City",
			postalCode: "2000",
		},
		durationAtAddress: "1 year",
		industryTenure: "5 years",
	},
	signatoryAndOwners: {
		authorisedRepresentative: {
			name: "John Doe",
			idNumber: "8001015009087",
			position: "Director",
		},
		beneficialOwners: [
			{
				name: "Jane Doe",
				idNumber: "8501015009087",
				address: "Sample Address",
				position: "Shareholder",
				shareholdingPercentage: "50",
			},
		],
	},
	bankingAndMandates: {
		creditBankAccount: {
			accountName: "Test Account",
			bankName: "Test Bank",
			accountType: "Current",
			branchCode: "123456",
			accountNumber: "987654321",
		},
		debitBankAccount: {
			accountName: "Test Account",
			bankName: "Test Bank",
			accountType: "Current",
			branchCode: "123456",
			accountNumber: "987654321",
		},
		useSameAccountForDebit: true,
	},
	declarationsAccepted: true,
};

// ============================================
// Main Form Component
// ============================================

export function StratcolAgreementForm({
	workflowId,
	initialData,
	onSubmit,
	onSaveDraft,
	readOnly = false,
	isSubmitting: externalIsSubmitting = false,
}: StratcolAgreementFormProps) {
	const [currentStep, setCurrentStep] = React.useState(0);
	const [isSubmitting, setIsSubmitting] = React.useState(false);

	const methods = useForm<StratcolAgreementFormData>({
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		resolver: zodResolver(stratcolAgreementSchema) as any,
		defaultValues: initialData,
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

	// Beneficial owners field array
	const {
		fields: beneficialOwners,
		append: addBeneficialOwner,
		remove: removeBeneficialOwner,
	} = useFieldArray({
		control,
		name: "signatoryAndOwners.beneficialOwners",
	});

	// Form steps configuration
	const steps = STRATCOL_AGREEMENT_STEP_TITLES.map((title, index) => ({
		id: `step-${index + 1}`,
		title,
	}));

	// Handle form submission
	const handleFormSubmit = async (data: StratcolAgreementFormData) => {
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

	// Use same bank account toggle
	const useSameAccount = watch("bankingAndMandates.useSameAccountForDebit");

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
							onClick={() => methods.reset(TEST_DATA as StratcolAgreementFormData)}
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
					title="StratCol Agreement"
					isSubmitting={isSubmitting || externalIsSubmitting}
					storageKey={`stratcol-agreement-${workflowId}`}
					submitButtonText="Submit Agreement">
					{({ currentStep, isLastStep }) => (
						<>
							{/* Step 1: Entity Details */}
							<FormStep isActive={currentStep === 0}>
								<div className="space-y-6">
									<div className="flex items-center gap-2 mb-4">
										<RiBuildingLine className="h-5 w-5 text-muted-foreground" />
										<h3 className="text-lg font-semibold">Entity Details</h3>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<FormField
											label="Registered Name"
											required
											error={errors.entityDetails?.registeredName?.message}>
											<Input
												{...register("entityDetails.registeredName")}
												placeholder="Company (Pty) Ltd"
												disabled={readOnly}
											/>
										</FormField>

										<FormField
											label="Trading Name"
											required
											error={errors.entityDetails?.tradingName?.message}>
											<Input
												{...register("entityDetails.tradingName")}
												placeholder="Trading As"
												disabled={readOnly}
											/>
										</FormField>

										<FormField
											label="Registration Number"
											required
											error={errors.entityDetails?.registrationNumber?.message}>
											<Input
												{...register("entityDetails.registrationNumber")}
												placeholder="2024/123456/07"
												disabled={readOnly}
											/>
										</FormField>

										<FormField
											label="Entity Type"
											required
											error={errors.entityDetails?.entityType?.message}>
											<Select
												value={watch("entityDetails.entityType")}
												onValueChange={value =>
													setValue("entityDetails.entityType", value as any)
												}
												disabled={readOnly}>
												<SelectTrigger>
													<SelectValue placeholder="Select entity type" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value={EntityType.PROPRIETOR}>
														Proprietor
													</SelectItem>
													<SelectItem value={EntityType.COMPANY}>Company</SelectItem>
													<SelectItem value={EntityType.CLOSE_CORPORATION}>
														Close Corporation
													</SelectItem>
													<SelectItem value={EntityType.PARTNERSHIP}>
														Partnership
													</SelectItem>
													<SelectItem value={EntityType.OTHER}>Other</SelectItem>
												</SelectContent>
											</Select>
										</FormField>
									</div>

									{/* Business Address */}
									<div className="space-y-4 pt-4 border-t border-border">
										<h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
											Business Address
										</h4>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<FormField label="Address" required className="md:col-span-2">
												<Input
													{...register("entityDetails.businessAddress.address")}
													placeholder="Street address"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Suburb" required>
												<Input
													{...register("entityDetails.businessAddress.suburb")}
													placeholder="Suburb"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Town/City" required>
												<Input
													{...register("entityDetails.businessAddress.townCity")}
													placeholder="Town/City"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Postal Code" required>
												<Input
													{...register("entityDetails.businessAddress.postalCode")}
													placeholder="0000"
													maxLength={4}
													disabled={readOnly}
												/>
											</FormField>
										</div>
									</div>
								</div>
							</FormStep>

							{/* Step 2: Signatory & Beneficial Owners */}
							<FormStep isActive={currentStep === 1}>
								<div className="space-y-6">
									<div className="flex items-center gap-2 mb-4">
										<RiUserLine className="h-5 w-5 text-muted-foreground" />
										<h3 className="text-lg font-semibold">
											Signatory & Beneficial Owners
										</h3>
									</div>

									{/* Authorised Representative */}
									<div className="space-y-4">
										<h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
											Authorised Representative
										</h4>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
											<FormField label="Name" required>
												<Input
													{...register(
														"signatoryAndOwners.authorisedRepresentative.name"
													)}
													placeholder="Full name"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="ID Number" required>
												<Input
													{...register(
														"signatoryAndOwners.authorisedRepresentative.idNumber"
													)}
													placeholder="13-digit ID number"
													maxLength={13}
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Position" required>
												<Input
													{...register(
														"signatoryAndOwners.authorisedRepresentative.position"
													)}
													placeholder="e.g., Director"
													disabled={readOnly}
												/>
											</FormField>
										</div>
									</div>

									{/* Beneficial Owners */}
									<div className="space-y-4 pt-4 border-t border-border">
										<div className="flex items-center justify-between">
											<h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
												Beneficial Owners (5% or more shareholding)
											</h4>
											{!readOnly && (
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() =>
														addBeneficialOwner({
															name: "",
															idNumber: "",
															address: "",
															position: "",
															shareholdingPercentage: "",
														})
													}
													className="gap-1.5">
													<RiAddLine className="h-4 w-4" />
													Add Owner
												</Button>
											)}
										</div>

										{beneficialOwners.map((field, index) => (
											<div
												key={field.id}
												className="p-4 rounded-lg border border-border bg-muted/30 space-y-4">
												<div className="flex items-center justify-between">
													<span className="text-sm font-medium">Owner {index + 1}</span>
													{!readOnly && beneficialOwners.length > 1 && (
														<Button
															type="button"
															variant="ghost"
															size="icon"
															onClick={() => removeBeneficialOwner(index)}
															className="h-8 w-8 text-destructive">
															<RiDeleteBinLine className="h-4 w-4" />
														</Button>
													)}
												</div>
												<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
													<FormField label="Name" required>
														<Input
															{...register(
																`signatoryAndOwners.beneficialOwners.${index}.name`
															)}
															placeholder="Full name"
															disabled={readOnly}
														/>
													</FormField>
													<FormField label="ID Number" required>
														<Input
															{...register(
																`signatoryAndOwners.beneficialOwners.${index}.idNumber`
															)}
															placeholder="13-digit ID"
															maxLength={13}
															disabled={readOnly}
														/>
													</FormField>
													<FormField label="Position" required>
														<Input
															{...register(
																`signatoryAndOwners.beneficialOwners.${index}.position`
															)}
															placeholder="e.g., Director"
															disabled={readOnly}
														/>
													</FormField>
													<FormField label="Address" required>
														<Input
															{...register(
																`signatoryAndOwners.beneficialOwners.${index}.address`
															)}
															placeholder="Residential address"
															disabled={readOnly}
														/>
													</FormField>
													<FormField label="Shareholding %" required>
														<Input
															{...register(
																`signatoryAndOwners.beneficialOwners.${index}.shareholdingPercentage`
															)}
															placeholder="e.g., 25"
															disabled={readOnly}
														/>
													</FormField>
												</div>
											</div>
										))}

										{beneficialOwners.length === 0 && (
											<p className="text-sm text-muted-foreground text-center py-4">
												No beneficial owners added. Click "Add Owner" to add one.
											</p>
										)}
									</div>
								</div>
							</FormStep>

							{/* Step 3: Banking & Mandates */}
							<FormStep isActive={currentStep === 2}>
								<div className="space-y-6">
									<div className="flex items-center gap-2 mb-4">
										<RiBankLine className="h-5 w-5 text-muted-foreground" />
										<h3 className="text-lg font-semibold">Banking & Mandates</h3>
									</div>

									{/* Credit Bank Account */}
									<div className="space-y-4">
										<h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
											Credit Bank Account (For receiving collected funds)
										</h4>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<FormField label="Account Name" required>
												<Input
													{...register(
														"bankingAndMandates.creditBankAccount.accountName"
													)}
													placeholder="Account holder name"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Bank Name" required>
												<Input
													{...register("bankingAndMandates.creditBankAccount.bankName")}
													placeholder="e.g., ABSA"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Branch Code" required>
												<Input
													{...register("bankingAndMandates.creditBankAccount.branchCode")}
													placeholder="6-digit code"
													maxLength={6}
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Account Number" required>
												<Input
													{...register(
														"bankingAndMandates.creditBankAccount.accountNumber"
													)}
													placeholder="Account number"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Account Type" required>
												<Input
													{...register(
														"bankingAndMandates.creditBankAccount.accountType"
													)}
													placeholder="e.g., Current"
													disabled={readOnly}
												/>
											</FormField>
										</div>
									</div>

									{/* Use same account toggle */}
									<div className="flex items-center gap-2 p-4 rounded-lg border border-border bg-muted/30">
										<Checkbox
											id="useSameAccount"
											checked={useSameAccount}
											onCheckedChange={checked =>
												setValue(
													"bankingAndMandates.useSameAccountForDebit",
													checked as boolean
												)
											}
											disabled={readOnly}
										/>
										<Label htmlFor="useSameAccount" className="text-sm cursor-pointer">
											Use the same account for debit (fees and unpaid re-collections)
										</Label>
									</div>

									{/* Debit Bank Account */}
									{!useSameAccount && (
										<div className="space-y-4 pt-4 border-t border-border">
											<h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
												Debit Bank Account (For fees and unpaid re-collections)
											</h4>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<FormField label="Account Name" required>
													<Input
														{...register(
															"bankingAndMandates.debitBankAccount.accountName"
														)}
														placeholder="Account holder name"
														disabled={readOnly}
													/>
												</FormField>
												<FormField label="Bank Name" required>
													<Input
														{...register("bankingAndMandates.debitBankAccount.bankName")}
														placeholder="e.g., ABSA"
														disabled={readOnly}
													/>
												</FormField>
												<FormField label="Branch Code" required>
													<Input
														{...register(
															"bankingAndMandates.debitBankAccount.branchCode"
														)}
														placeholder="6-digit code"
														maxLength={6}
														disabled={readOnly}
													/>
												</FormField>
												<FormField label="Account Number" required>
													<Input
														{...register(
															"bankingAndMandates.debitBankAccount.accountNumber"
														)}
														placeholder="Account number"
														disabled={readOnly}
													/>
												</FormField>
												<FormField label="Account Type" required>
													<Input
														{...register(
															"bankingAndMandates.debitBankAccount.accountType"
														)}
														placeholder="e.g., Current"
														disabled={readOnly}
													/>
												</FormField>
											</div>
										</div>
									)}
								</div>
							</FormStep>

							{/* Step 4: Declarations & Signature */}
							<FormStep isActive={currentStep === 3}>
								<div className="space-y-6">
									<div className="mb-4">
										<h3 className="text-lg font-semibold">Declarations & Signature</h3>
									</div>

									{/* Declarations */}
									<div className="space-y-4 p-4 rounded-lg border border-border bg-muted/30">
										<h4 className="font-medium">Declarations</h4>
										<div className="flex items-start gap-3">
											<Checkbox
												id="declarations"
												checked={watch("declarationsAccepted")}
												onCheckedChange={checked =>
													setValue("declarationsAccepted", checked as boolean)
												}
												disabled={readOnly}
											/>
											<Label
												htmlFor="declarations"
												className="text-sm leading-relaxed cursor-pointer">
												I confirm that all information provided in this agreement is true,
												correct, and complete. I understand that any misrepresentation may
												result in the termination of services and potential legal action.
												I authorise StratCol to process the personal information provided
												for the purposes of this agreement.
											</Label>
										</div>
										{errors.declarationsAccepted && (
											<p className="text-sm text-destructive">
												{errors.declarationsAccepted.message}
											</p>
										)}
									</div>

									{/* Signature */}
									<div className="space-y-4">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<FormField label="Signatory Name" required>
												<Input
													{...register("signature.name")}
													placeholder="Full name"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Date" required>
												<Input
													{...register("signature.date")}
													type="date"
													disabled={readOnly}
												/>
											</FormField>
										</div>

										<SignatureCanvas
											label="Signature"
											required
											onSave={dataUrl => setValue("signature.signature", dataUrl)}
											initialValue={watch("signature.signature")}
											error={errors.signature?.signature?.message}
											disabled={readOnly}
										/>
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
