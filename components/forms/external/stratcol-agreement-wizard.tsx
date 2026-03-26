"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	RiAddLine,
	RiBankLine,
	RiBuildingLine,
	RiDeleteBinLine,
	RiUserLine,
} from "@remixicon/react";
import * as React from "react";
import type { Resolver } from "react-hook-form";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import {
	FormStep,
	FormWizard,
} from "@/components/forms/external/onboarding-forms/form-wizard";
import { SignatureCanvas } from "@/components/forms/external/onboarding-forms/signature-canvas";
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
import {
	EntityType,
	STRATCOL_AGREEMENT_STEP_TITLES,
	type StratcolAgreementFormData,
	stratcolAgreementSchema,
} from "@/lib/validations/onboarding";

interface ExternalStratcolAgreementWizardProps {
	initialData?: Partial<StratcolAgreementFormData>;
	onSubmit: (data: StratcolAgreementFormData) => Promise<void>;
	isSubmitting?: boolean;
	submitButtonText?: string;
	storageKey?: string;
	title?: string;
}

interface FormFieldProps {
	label: string;
	required?: boolean;
	error?: string;
	children: React.ReactNode;
	className?: string;
}

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
	signature: {
		name: "John Doe",
		signature: "John Doe",
		date: new Date().toISOString().split("T")[0],
	},
};

function FormField({ label, required, error, children, className }: FormFieldProps) {
	return (
		<div className={cn("space-y-2", className)}>
			<Label className="text-sm font-medium">
				{label}
				{required && <span className="text-destructive ml-1">*</span>}
			</Label>
			{children}
			{error && (
				<div className="bg-destructive/20 mt-1.5 border-destructive/40 border rounded-sm px-2 py-1 ">
					<p className="text-xs text-destructive-foreground">{error}</p>
				</div>
			)}
		</div>
	);
}

const stepFieldNames: Array<Array<keyof StratcolAgreementFormData | string>> = [
	["entityDetails"],
	["signatoryAndOwners"],
	["bankingAndMandates"],
	["declarationsAccepted", "signature"],
];

export function ExternalStratcolAgreementWizard({
	initialData,
	onSubmit,
	isSubmitting: externalIsSubmitting = false,
	submitButtonText = "Submit Agreement",
	storageKey,
	title = "StratCol Agreement",
}: ExternalStratcolAgreementWizardProps) {
	const [currentStep, setCurrentStep] = React.useState(0);
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const methods = useForm<StratcolAgreementFormData>({
		resolver: zodResolver(stratcolAgreementSchema) as Resolver<StratcolAgreementFormData>,
		defaultValues: initialData,
		mode: "onBlur",
	});
	const {
		handleSubmit,
		control,
		trigger,
		formState: { errors },
		watch,
		setValue,
		register,
	} = methods;

	const { fields, append, remove } = useFieldArray({
		control,
		name: "signatoryAndOwners.beneficialOwners",
	});

	const useSameAccount = watch("bankingAndMandates.useSameAccountForDebit");
	const creditAccount = watch("bankingAndMandates.creditBankAccount");

	React.useEffect(() => {
		if (!(useSameAccount && creditAccount)) return;
		setValue("bankingAndMandates.debitBankAccount", creditAccount, {
			shouldValidate: false,
			shouldDirty: false,
		});
	}, [useSameAccount, creditAccount, setValue]);

	const steps = STRATCOL_AGREEMENT_STEP_TITLES.map((stepTitle, index) => ({
		id: `step-${index + 1}`,
		title: stepTitle,
		validate: async () => {
			const fieldsToValidate = stepFieldNames[index];
			return trigger(fieldsToValidate as Parameters<typeof trigger>[0], {
				shouldFocus: true,
			});
		},
	}));

	const handleFormSubmit = async (data: StratcolAgreementFormData) => {
		setIsSubmitting(true);
		try {
			const payload: StratcolAgreementFormData = useSameAccount
				? {
						...data,
						bankingAndMandates: {
							...data.bankingAndMandates,
							debitBankAccount: data.bankingAndMandates.creditBankAccount,
						},
					}
				: data;
			await onSubmit(payload);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<FormProvider {...methods}>
			<form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
				{process.env.NEXT_PUBLIC_TEST_FORMS === "true" && (
					<div className="mb-2 p-4 border border-dashed border-yellow-500/50 bg-yellow-50/50 rounded-lg flex items-center justify-between">
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
					isSubmitting={isSubmitting || externalIsSubmitting}
					submitButtonText={submitButtonText}
					storageKey={storageKey}
					title={title}>
					{({ currentStep }) => (
						<>
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
											/>
										</FormField>

										<FormField
											label="Trading Name"
											required
											error={errors.entityDetails?.tradingName?.message}>
											<Input
												{...register("entityDetails.tradingName")}
												placeholder="Trading As"
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
												value={watch("entityDetails.entityType")}
												onValueChange={value =>
													setValue(
														"entityDetails.entityType",
														value as (typeof EntityType)[keyof typeof EntityType]
													)
												}>
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

									<div className="space-y-4 pt-4 border-t border-border">
										<h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
											Business Address
										</h4>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<FormField label="Address" required className="md:col-span-2">
												<Input
													{...register("entityDetails.businessAddress.address")}
													placeholder="Street address"
												/>
											</FormField>
											<FormField label="Suburb" required>
												<Input
													{...register("entityDetails.businessAddress.suburb")}
													placeholder="Suburb"
												/>
											</FormField>
											<FormField label="Town/City" required>
												<Input
													{...register("entityDetails.businessAddress.townCity")}
													placeholder="Town/City"
												/>
											</FormField>
											<FormField label="Postal Code" required>
												<Input
													{...register("entityDetails.businessAddress.postalCode")}
													placeholder="0000"
													maxLength={4}
												/>
											</FormField>
										</div>
									</div>

									<div className="space-y-4 pt-4 border-t border-border">
										<h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
											Postal Address
										</h4>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<FormField label="Address" required className="md:col-span-2">
												<Input
													{...register("entityDetails.postalAddress.address")}
													placeholder="Postal address"
												/>
											</FormField>
											<FormField label="Suburb" required>
												<Input
													{...register("entityDetails.postalAddress.suburb")}
													placeholder="Suburb"
												/>
											</FormField>
											<FormField label="Town/City" required>
												<Input
													{...register("entityDetails.postalAddress.townCity")}
													placeholder="Town/City"
												/>
											</FormField>
											<FormField label="Postal Code" required>
												<Input
													{...register("entityDetails.postalAddress.postalCode")}
													placeholder="0000"
													maxLength={4}
												/>
											</FormField>
										</div>
									</div>
								</div>
							</FormStep>

							<FormStep isActive={currentStep === 1}>
								<div className="space-y-6">
									<div className="flex items-center gap-2 mb-4">
										<RiUserLine className="h-5 w-5 text-muted-foreground" />
										<h3 className="text-lg font-semibold">
											Signatory & Beneficial Owners
										</h3>
									</div>

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
												/>
											</FormField>
											<FormField label="ID Number" required>
												<Input
													{...register(
														"signatoryAndOwners.authorisedRepresentative.idNumber"
													)}
													placeholder="13-digit ID number"
													maxLength={13}
												/>
											</FormField>
											<FormField label="Position" required>
												<Input
													{...register(
														"signatoryAndOwners.authorisedRepresentative.position"
													)}
													placeholder="e.g., Director"
												/>
											</FormField>
										</div>
									</div>

									<div className="space-y-4 pt-4 border-t border-border">
										<div className="flex items-center justify-between">
											<h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
												Beneficial Owners (5% or more shareholding)
											</h4>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() =>
													append({
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
										</div>

										{fields.map((field, index) => (
											<div
												key={field.id}
												className="p-4 rounded-lg border border-border bg-muted/30 space-y-4">
												<div className="flex items-center justify-between">
													<span className="text-sm font-medium">Owner {index + 1}</span>
													{fields.length > 1 && (
														<Button
															type="button"
															variant="ghost"
															size="icon"
															onClick={() => remove(index)}
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
														/>
													</FormField>
													<FormField label="ID Number" required>
														<Input
															{...register(
																`signatoryAndOwners.beneficialOwners.${index}.idNumber`
															)}
															placeholder="13-digit ID"
															maxLength={13}
														/>
													</FormField>
													<FormField label="Position" required>
														<Input
															{...register(
																`signatoryAndOwners.beneficialOwners.${index}.position`
															)}
															placeholder="e.g., Director"
														/>
													</FormField>
													<FormField label="Address" required>
														<Input
															{...register(
																`signatoryAndOwners.beneficialOwners.${index}.address`
															)}
															placeholder="Residential address"
														/>
													</FormField>
													<FormField label="Shareholding %" required>
														<Input
															{...register(
																`signatoryAndOwners.beneficialOwners.${index}.shareholdingPercentage`
															)}
															placeholder="e.g., 25"
														/>
													</FormField>
												</div>
											</div>
										))}
									</div>
								</div>
							</FormStep>

							<FormStep isActive={currentStep === 2}>
								<div className="space-y-6">
									<div className="flex items-center gap-2 mb-4">
										<RiBankLine className="h-5 w-5 text-muted-foreground" />
										<h3 className="text-lg font-semibold">Banking & Mandates</h3>
									</div>

									<div className="space-y-4">
										<h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
											Credit Bank Account
										</h4>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<FormField label="Account Name" required>
												<Input
													{...register(
														"bankingAndMandates.creditBankAccount.accountName"
													)}
													placeholder="Account holder name"
												/>
											</FormField>
											<FormField label="Bank Name" required>
												<Input
													{...register("bankingAndMandates.creditBankAccount.bankName")}
													placeholder="e.g., ABSA"
												/>
											</FormField>
											<FormField label="Account Type" required>
												<Input
													{...register(
														"bankingAndMandates.creditBankAccount.accountType"
													)}
													placeholder="e.g., Current"
												/>
											</FormField>
											<FormField label="Branch Code" required>
												<Input
													{...register("bankingAndMandates.creditBankAccount.branchCode")}
													placeholder="6-digit code"
													maxLength={6}
												/>
											</FormField>
											<FormField label="Account Number" required>
												<Input
													{...register(
														"bankingAndMandates.creditBankAccount.accountNumber"
													)}
													placeholder="Account number"
												/>
											</FormField>
										</div>
									</div>

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
										/>
										<Label htmlFor="useSameAccount" className="text-sm cursor-pointer">
											Use the same account for debit.
										</Label>
									</div>

									{!useSameAccount && (
										<div className="space-y-4 pt-4 border-t border-border">
											<h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
												Debit Bank Account
											</h4>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<FormField label="Account Name" required>
													<Input
														{...register(
															"bankingAndMandates.debitBankAccount.accountName"
														)}
														placeholder="Account holder name"
													/>
												</FormField>
												<FormField label="Bank Name" required>
													<Input
														{...register("bankingAndMandates.debitBankAccount.bankName")}
														placeholder="e.g., ABSA"
													/>
												</FormField>
												<FormField label="Account Type" required>
													<Input
														{...register(
															"bankingAndMandates.debitBankAccount.accountType"
														)}
														placeholder="e.g., Current"
													/>
												</FormField>
												<FormField label="Branch Code" required>
													<Input
														{...register(
															"bankingAndMandates.debitBankAccount.branchCode"
														)}
														placeholder="6-digit code"
														maxLength={6}
													/>
												</FormField>
												<FormField label="Account Number" required>
													<Input
														{...register(
															"bankingAndMandates.debitBankAccount.accountNumber"
														)}
														placeholder="Account number"
													/>
												</FormField>
											</div>
										</div>
									)}
								</div>
							</FormStep>

							<FormStep isActive={currentStep === 3}>
								<div className="space-y-6">
									<div className="mb-4">
										<h3 className="text-lg font-semibold">Declarations & Signature</h3>
									</div>

									<div className="space-y-4 p-4 rounded-lg border border-border bg-muted/30">
										<h4 className="font-medium">Declarations</h4>
										<div className="flex items-start gap-3">
											<Checkbox
												id="declarations"
												checked={watch("declarationsAccepted")}
												onCheckedChange={checked =>
													setValue("declarationsAccepted", checked as boolean)
												}
											/>
											<Label
												htmlFor="declarations"
												className="text-sm leading-relaxed cursor-pointer">
												I confirm that all information provided in this agreement is true,
												correct, and complete. I authorise StratCol to process the
												personal information provided for the purposes of this agreement.
											</Label>
										</div>
										{errors.declarationsAccepted && (
											<div className="bg-destructive">
												<p className="text-sm text-destructive">
													{errors.declarationsAccepted.message}
												</p>
											</div>
										)}
									</div>

									<div className="space-y-4">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<FormField label="Signatory Name" required>
												<Input {...register("signature.name")} placeholder="Full name" />
											</FormField>
											<FormField label="Date" required>
												<Input {...register("signature.date")} type="date" />
											</FormField>
										</div>

										<SignatureCanvas
											label="Signature"
											required
											onSave={dataUrl => setValue("signature.signature", dataUrl)}
											initialValue={watch("signature.signature")}
											error={errors.signature?.signature?.message}
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
