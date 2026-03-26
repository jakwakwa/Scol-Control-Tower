"use client";

/**
 * Facility Application Form
 * Product configuration for service selection and volume metrics
 * Note: Using UK spelling throughout (e.g., organisation, authorisation)
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { RiLineChartLine, RiServiceLine } from "@remixicon/react";
import * as React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
	AdditionalService,
	FACILITY_APPLICATION_STEP_TITLES,
	type FacilityApplicationFormData,
	facilityApplicationSchema,
	ServiceType,
} from "@/lib/validations/onboarding";
import { FormStep, FormWizard } from "../form-wizard";

// ============================================
// Types
// ============================================

interface FacilityApplicationFormProps {
	/** Workflow ID */
	workflowId: number;
	/** Initial form data for editing */
	initialData?: Partial<FacilityApplicationFormData>;
	/** Callback on successful submission */
	onSubmit: (data: FacilityApplicationFormData) => Promise<void>;
	/** Callback to save draft */
	onSaveDraft?: (data: Partial<FacilityApplicationFormData>) => Promise<void>;
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
	description?: string;
}

function FormField({
	label,
	required,
	error,
	children,
	className,
	description,
}: FormFieldProps) {
	return (
		<div className={cn("space-y-2", className)}>
			<Label className="text-sm font-medium">
				{label}
				{required && <span className="text-destructive ml-1">*</span>}
			</Label>
			{description && <p className="text-xs text-muted-foreground">{description}</p>}
			{children}
			{error && (
				<div className="bg-destructive">
					<p className="text-sm text-destructive">{error}</p>
				</div>
			)}
		</div>
	);
}

// ============================================
// Checkbox Group Component
// ============================================

interface CheckboxOption {
	value: string;
	label: string;
	description?: string;
}

interface CheckboxGroupProps {
	options: CheckboxOption[];
	value: string[];
	onChange: (value: string[]) => void;
	disabled?: boolean;
	className?: string;
}

function CheckboxGroup({
	options,
	value,
	onChange,
	disabled,
	className,
}: CheckboxGroupProps) {
	const handleChange = (optionValue: string, checked: boolean) => {
		if (checked) {
			onChange([...value, optionValue]);
		} else {
			onChange(value.filter(v => v !== optionValue));
		}
	};

	return (
		<div className={cn("grid grid-cols-1 md:grid-cols-2 gap-3", className)}>
			{options.map(option => (
				<div
					key={option.value}
					className={cn(
						"flex items-start gap-3 p-3 rounded-lg border transition-colors",
						value.includes(option.value)
							? "border-primary bg-primary/5"
							: "border-border hover:border-primary/50"
					)}>
					<Checkbox
						id={option.value}
						checked={value.includes(option.value)}
						onCheckedChange={checked => handleChange(option.value, checked as boolean)}
						disabled={disabled}
					/>
					<div className="flex-1">
						<Label htmlFor={option.value} className="text-sm font-medium cursor-pointer">
							{option.label}
						</Label>
						{option.description && (
							<p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
						)}
					</div>
				</div>
			))}
		</div>
	);
}

// ============================================
// Service Type Options
// ============================================

const SERVICE_TYPE_OPTIONS: CheckboxOption[] = [
	{
		value: ServiceType.EFT,
		label: "EFT",
		description: "Electronic Funds Transfer collections",
	},
	{
		value: ServiceType.DEBICHECK,
		label: "DebiCheck",
		description: "Authenticated debit order collections",
	},
	{
		value: ServiceType.THIRD_PARTY_PAYMENTS,
		label: "3rd Party Payments",
		description: "Process payments on behalf of third parties",
	},
	{
		value: ServiceType.PAY_AT,
		label: "Pay@",
		description: "Pay@ retail collection points",
	},
	{
		value: ServiceType.CARD_PAYMENTS,
		label: "Card Payments",
		description: "Credit and debit card processing",
	},
];

const ADDITIONAL_SERVICE_OPTIONS: CheckboxOption[] = [
	{
		value: AdditionalService.INTEGRATION,
		label: "Integration",
		description: "API integration services",
	},
	{
		value: AdditionalService.E_MANDATE,
		label: "E-Mandate",
		description: "Electronic mandate registration",
	},
	{
		value: AdditionalService.ACCOUNT_VERIFICATION,
		label: "Account Verification",
		description: "Bank account verification service",
	},
	{
		value: AdditionalService.ID_VERIFICATION,
		label: "ID Verification",
		description: "Identity document verification",
	},
	{
		value: AdditionalService.BULK_SMS,
		label: "Bulk SMS",
		description: "Bulk SMS notification service",
	},
];

// ============================================
// Test Data
// ============================================

const TEST_DATA: Partial<FacilityApplicationFormData> = {
	idNumber: "8501015009087",
	applicantDetails: {
		registeredName: "Test Company (Pty) Ltd",
		tradingName: "Test Trading",
		registrationOrIdNumber: "2024/123456/07",
		contactPerson: "John Smith",
	},
	facilitySelection: {
		serviceTypes: [ServiceType.EFT, ServiceType.DEBICHECK],
		additionalServices: [AdditionalService.INTEGRATION],
	},
	volumeMetrics: {
		history: {
			currentProvider: "None",
			previousProvider: "None",
			hasOutstandingAmounts: false,
			amountsOwed: "R 0.00",
		},
		statistics: {
			averageTransactionsPerMonth: "500",
			averageTransactionValue: "R 250.00",
			unpaidTransactionsValue: "R 0.00",
			unpaidTransactionsQuantity: "0",
			disputedTransactionsValue: "R 0.00",
			disputedTransactionsQuantity: "0",
		},
		predictedGrowth: {
			month1Volume: "600",
			month1Value: "R 150000.00",
			month2Volume: "700",
			month2Value: "R 175000.00",
			month3Volume: "800",
			month3Value: "R 200000.00",
		},
		limitsAppliedFor: {
			maxTransactionsPerMonth: "1000",
			maxRandValue: "R 500000.00",
			lineLimit: "R 5000.00",
		},
	},
};

// ============================================
// Main Form Component
// ============================================

export function FacilityApplicationForm({
	workflowId,
	initialData,
	onSubmit,
	onSaveDraft,
	readOnly = false,
	isSubmitting: externalIsSubmitting = false,
}: FacilityApplicationFormProps) {
	const [currentStep, setCurrentStep] = React.useState(0);
	const [isSubmitting, setIsSubmitting] = React.useState(false);

	const methods = useForm<FacilityApplicationFormData>({
		resolver: zodResolver(facilityApplicationSchema) as any,
		defaultValues: initialData ?? {
			idNumber: "",
			applicantDetails: {
				registeredName: "",
				tradingName: "",
				registrationOrIdNumber: "",
				contactPerson: "",
				telephone: "",
				email: "",
				industry: "",
				subIndustry: "",
				businessDescription: "",
				marketingMethod: "",
			},
			insuranceDetails: {
				isInsuranceClient: false,
				noneFscaRegulatedCollections: undefined,
			},
			facilitySelection: {
				serviceTypes: [],
				additionalServices: [],
			},
			volumeMetrics: {
				history: {
					currentProvider: "",
					previousProvider: "",
					amountsOwed: "",
					hasOutstandingAmounts: false,
				},
				statistics: {
					averageTransactionsPerMonth: "",
					averageTransactionValue: "",
					unpaidTransactionsValue: "",
					unpaidTransactionsQuantity: "",
					disputedTransactionsValue: "",
					disputedTransactionsQuantity: "",
				},
				predictedGrowth: {
					month1Volume: "",
					month1Value: "",
					month2Volume: "",
					month2Value: "",
					month3Volume: "",
					month3Value: "",
				},
				limitsAppliedFor: {
					maxTransactionsPerMonth: "",
					maxRandValue: "",
					lineLimit: "",
				},
			},
		},
		mode: "onBlur",
	});

	const {
		handleSubmit,
		formState: { errors },
		watch,
		setValue,
		register,
	} = methods;

	// Form steps configuration
	const steps = FACILITY_APPLICATION_STEP_TITLES.map((title, index) => ({
		id: `step-${index + 1}`,
		title,
	}));

	// Handle form submission
	const handleFormSubmit = async (data: FacilityApplicationFormData) => {
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

	// Watch values
	const serviceTypes = watch("facilitySelection.serviceTypes") || [];
	const additionalServices = watch("facilitySelection.additionalServices") || [];
	const hasOutstandingAmounts = watch("volumeMetrics.history.hasOutstandingAmounts");

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
							onClick={() => methods.reset(TEST_DATA as FacilityApplicationFormData)}
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
					title="Facility Application"
					isSubmitting={isSubmitting || externalIsSubmitting}
					storageKey={`facility-application-${workflowId}`}
					submitButtonText="Submit Application">
					{({ currentStep }) => (
						<>
							{/* Step 1: Facility Selection */}
							<FormStep isActive={currentStep === 0}>
								<div className="space-y-6">
									<div className="flex items-center gap-2 mb-4">
										<RiServiceLine className="h-5 w-5 text-muted-foreground" />
										<h3 className="text-lg font-semibold">Facility Selection</h3>
									</div>

									<div className="space-y-4">
										<h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
											Applicant Details
										</h4>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<FormField label="Registered Name / Surname">
												<Input
													{...register("applicantDetails.registeredName")}
													placeholder="Legal entity name"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Trading Name">
												<Input
													{...register("applicantDetails.tradingName")}
													placeholder="Trading name"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Registration No. / ID No.">
												<Input
													{...register("applicantDetails.registrationOrIdNumber")}
													placeholder="Registration or ID number"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Contact Person">
												<Input
													{...register("applicantDetails.contactPerson")}
													placeholder="Contact person"
													disabled={readOnly}
												/>
											</FormField>
										</div>
									</div>

									{/* SA ID Number */}
									<FormField
										label="SA ID Number"
										required
										error={errors.idNumber?.message}
										description="Enter your 13-digit South African ID number">
										<Input
											{...register("idNumber")}
											placeholder="e.g., 8501015009087"
											maxLength={13}
											disabled={readOnly}
										/>
									</FormField>

									{/* Service Types */}
									<FormField
										label="Service Types"
										required
										error={errors.facilitySelection?.serviceTypes?.message}
										description="Select the collection services you require">
										<CheckboxGroup
											options={SERVICE_TYPE_OPTIONS}
											value={serviceTypes}
											onChange={value =>
												setValue("facilitySelection.serviceTypes", value as any)
											}
											disabled={readOnly}
										/>
									</FormField>

									{/* Additional Services */}
									<FormField
										label="Additional Services"
										description="Select any additional services you require"
										className="pt-4 border-t border-border">
										<CheckboxGroup
											options={ADDITIONAL_SERVICE_OPTIONS}
											value={additionalServices}
											onChange={value =>
												setValue("facilitySelection.additionalServices", value as any)
											}
											disabled={readOnly}
										/>
									</FormField>
								</div>
							</FormStep>

							{/* Step 2: Volume & Risk Metrics */}
							<FormStep isActive={currentStep === 1}>
								<div className="space-y-6">
									<div className="flex items-center gap-2 mb-4">
										<RiLineChartLine className="h-5 w-5 text-muted-foreground" />
										<h3 className="text-lg font-semibold">Volume & Risk Metrics</h3>
									</div>

									{/* History */}
									<div className="space-y-4">
										<h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
											Service History
										</h4>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<FormField label="Current Service Provider">
												<Input
													{...register("volumeMetrics.history.currentProvider")}
													placeholder="Current provider name"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Previous Service Provider">
												<Input
													{...register("volumeMetrics.history.previousProvider")}
													placeholder="Previous provider name"
													disabled={readOnly}
												/>
											</FormField>
										</div>

										<div className="flex items-center gap-3 p-3 rounded-lg border border-border">
											<Checkbox
												id="hasOutstanding"
												checked={hasOutstandingAmounts}
												onCheckedChange={checked =>
													setValue(
														"volumeMetrics.history.hasOutstandingAmounts",
														checked as boolean
													)
												}
												disabled={readOnly}
											/>
											<Label htmlFor="hasOutstanding" className="text-sm cursor-pointer">
												We have outstanding amounts owed to a previous provider
											</Label>
										</div>

										{hasOutstandingAmounts && (
											<FormField label="Amount Owed">
												<Input
													{...register("volumeMetrics.history.amountsOwed")}
													placeholder="R 0.00"
													disabled={readOnly}
												/>
											</FormField>
										)}
									</div>

									{/* Statistics */}
									<div className="space-y-4 pt-4 border-t border-border">
										<h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
											Current Statistics
										</h4>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<FormField
												label="Average Transactions per Month"
												required
												error={
													errors.volumeMetrics?.statistics?.averageTransactionsPerMonth
														?.message
												}>
												<Input
													{...register(
														"volumeMetrics.statistics.averageTransactionsPerMonth"
													)}
													placeholder="e.g., 1000"
													type="number"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Average Transaction Value">
												<Input
													{...register(
														"volumeMetrics.statistics.averageTransactionValue"
													)}
													placeholder="R 0.00"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Unpaid Transactions Value">
												<Input
													{...register(
														"volumeMetrics.statistics.unpaidTransactionsValue"
													)}
													placeholder="R 0.00"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Unpaid Transactions Quantity">
												<Input
													{...register(
														"volumeMetrics.statistics.unpaidTransactionsQuantity"
													)}
													placeholder="e.g., 50"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Disputed Transactions Value">
												<Input
													{...register(
														"volumeMetrics.statistics.disputedTransactionsValue"
													)}
													placeholder="R 0.00"
													disabled={readOnly}
												/>
											</FormField>
											<FormField label="Disputed Transactions Quantity">
												<Input
													{...register(
														"volumeMetrics.statistics.disputedTransactionsQuantity"
													)}
													placeholder="e.g., 10"
													disabled={readOnly}
												/>
											</FormField>
										</div>
									</div>

									{/* Predicted Growth */}
									<div className="space-y-4 pt-4 border-t border-border">
										<h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
											3-Month Growth Forecast
										</h4>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
											<div className="space-y-3">
												<p className="text-sm font-medium">Month 1</p>
												<FormField label="Volume">
													<Input
														{...register("volumeMetrics.predictedGrowth.month1Volume")}
														placeholder="Transactions"
														disabled={readOnly}
													/>
												</FormField>
												<FormField label="Value">
													<Input
														{...register("volumeMetrics.predictedGrowth.month1Value")}
														placeholder="R 0.00"
														disabled={readOnly}
													/>
												</FormField>
											</div>
											<div className="space-y-3">
												<p className="text-sm font-medium">Month 2</p>
												<FormField label="Volume">
													<Input
														{...register("volumeMetrics.predictedGrowth.month2Volume")}
														placeholder="Transactions"
														disabled={readOnly}
													/>
												</FormField>
												<FormField label="Value">
													<Input
														{...register("volumeMetrics.predictedGrowth.month2Value")}
														placeholder="R 0.00"
														disabled={readOnly}
													/>
												</FormField>
											</div>
											<div className="space-y-3">
												<p className="text-sm font-medium">Month 3</p>
												<FormField label="Volume">
													<Input
														{...register("volumeMetrics.predictedGrowth.month3Volume")}
														placeholder="Transactions"
														disabled={readOnly}
													/>
												</FormField>
												<FormField label="Value">
													<Input
														{...register("volumeMetrics.predictedGrowth.month3Value")}
														placeholder="R 0.00"
														disabled={readOnly}
													/>
												</FormField>
											</div>
										</div>
									</div>

									{/* Limits Applied For */}
									<div className="space-y-4 pt-4 border-t border-border">
										<h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
											Limits Applied For
										</h4>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
											<FormField
												label="Max Transactions per Month"
												required
												error={
													errors.volumeMetrics?.limitsAppliedFor?.maxTransactionsPerMonth
														?.message
												}>
												<Input
													{...register(
														"volumeMetrics.limitsAppliedFor.maxTransactionsPerMonth"
													)}
													placeholder="e.g., 5000"
													type="number"
													disabled={readOnly}
												/>
											</FormField>
											<FormField
												label="Max Rand Value"
												required
												error={
													errors.volumeMetrics?.limitsAppliedFor?.maxRandValue?.message
												}>
												<Input
													{...register("volumeMetrics.limitsAppliedFor.maxRandValue")}
													placeholder="R 0.00"
													disabled={readOnly}
												/>
											</FormField>
											<FormField
												label="Line Limit (Highest Single Transaction)"
												required
												error={
													errors.volumeMetrics?.limitsAppliedFor?.lineLimit?.message
												}>
												<Input
													{...register("volumeMetrics.limitsAppliedFor.lineLimit")}
													placeholder="R 0.00"
													disabled={readOnly}
												/>
											</FormField>
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
