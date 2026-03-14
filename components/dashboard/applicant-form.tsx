"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RiLoader4Line, RiTestTubeLine } from "@remixicon/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { GlassCard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getMockScenarioDefinition, type MockScenarioId } from "@/lib/mock-scenarios";
import {
	MOCK_SCENARIO_EVENT,
	readClientMockScenarioId,
} from "@/lib/mock-scenarios.client";
import { cn } from "@/lib/utils";
import {
	type ApplicantFormData,
	applicantSchema,
} from "@/lib/validations/schemas/applicant.schema";

interface ApplicantFormProps {
	initialData?: Partial<ApplicantFormData>;
	onSubmit?: (data: ApplicantFormData) => Promise<void>;
	isEditing?: boolean;
}

export function ApplicantForm({
	initialData,
	onSubmit,
	isEditing = false,
}: ApplicantFormProps) {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [activeScenarioId, setActiveScenarioId] = useState<MockScenarioId | null>(null);
	const [isMockEnvironment, setIsMockEnvironment] = useState(false);

	const form = useForm<ApplicantFormData>({
		resolver: zodResolver(applicantSchema),
		defaultValues: {
			companyName: initialData?.companyName || "",
			registrationNumber: initialData?.registrationNumber || "",
			contactName: initialData?.contactName || "",
			idNumber: initialData?.idNumber || "",
			email: initialData?.email || "",
			phone: initialData?.phone || "",
			entityType: initialData?.entityType || "company",
			productType: initialData?.productType || "standard",
			industry: initialData?.industry || "",
			mandateType: initialData?.mandateType || "debit_order",
			employeeCount: initialData?.employeeCount || "",
			estimatedTransactionsPerMonth:
				initialData?.estimatedTransactionsPerMonth != null
					? String(initialData.estimatedTransactionsPerMonth)
					: "",
			notes: initialData?.notes || "",
		},
	});

	const {
		register,
		control,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = form;

	const entityType = watch("entityType");
	const activeScenario = useMemo(
		() => getMockScenarioDefinition(activeScenarioId),
		[activeScenarioId]
	);
	const lockedEntityType = activeScenario?.lockedEntityType;
	const isEntityTypeLocked = Boolean(isMockEnvironment && !isEditing && lockedEntityType);
	const effectiveEntityType =
		isEntityTypeLocked && lockedEntityType ? lockedEntityType : entityType;

	useEffect(() => {
		setIsMockEnvironment(document.body.dataset.mockEnvironment === "true");
		setActiveScenarioId(readClientMockScenarioId());

		const syncScenarioState = () => {
			setActiveScenarioId(readClientMockScenarioId());
		};

		window.addEventListener(MOCK_SCENARIO_EVENT, syncScenarioState as EventListener);
		window.addEventListener("storage", syncScenarioState);

		return () => {
			window.removeEventListener(MOCK_SCENARIO_EVENT, syncScenarioState as EventListener);
			window.removeEventListener("storage", syncScenarioState);
		};
	}, []);

	useEffect(() => {
		if (lockedEntityType && !isEditing && entityType !== lockedEntityType) {
			setValue("entityType", lockedEntityType, {
				shouldDirty: false,
				shouldValidate: true,
			});
		}
	}, [entityType, isEditing, lockedEntityType, setValue]);

	// Check if test mode is enabled
	const isTestMode = process.env.NEXT_PUBLIC_USE_TESTMODE_CHECK === "true";

	// Fill form with test data for testing
	const fillTestData = () => {
		form.reset({
			companyName: `${isTestMode ? "Jacob Kotzee T/a Doodles Digital" : "Test Company Inc"}`,
			registrationNumber: `${isTestMode ? "0787173160001" : "2024/123456/07"}`,
			contactName: `${isTestMode ? "Jacob Kotzee" : "John Test"}`,
			idNumber: `${isTestMode ? "8501015009087" : ""}`,
			email: `${isTestMode ? "jkotzee@icloud.com" : "john.test@testcompany.co.za"}`,
			phone: `${isTestMode ? "+27 76 341 0291" : "+27 82 123 4567"}`,
			entityType: isTestMode ? "company" : "company",
			productType: "standard",
			industry: `${isTestMode ? "Software Development" : "Financial Services"}`,
			mandateType: `${isTestMode ? "Debit Order" : "debit_order"}`,
			employeeCount: `${isTestMode ? "1" : "5"}`,
			estimatedTransactionsPerMonth: `${isTestMode ? "5000" : "1500"}`,
			notes: "test applicant input - auto-generated for credit check testing",
		});
	};

	const onSubmitForm = async (data: ApplicantFormData) => {
		setIsLoading(true);
		setSubmitError(null);
		const submissionEntityType =
			isEntityTypeLocked && lockedEntityType
				? lockedEntityType
				: data.entityType || "company";

		try {
			if (onSubmit) {
				await onSubmit({ ...data, entityType: submissionEntityType });
			} else {
				// Default behavior: POST to API
				const response = await fetch("/api/applicants", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						...data,
						entityType: submissionEntityType,
						idNumber: data.idNumber?.trim() || undefined,
						employeeCount: data.employeeCount
							? parseInt(data.employeeCount, 10)
							: undefined,
						estimatedTransactionsPerMonth: data.estimatedTransactionsPerMonth
							? Math.round(Number(data.estimatedTransactionsPerMonth)) || undefined
							: undefined,
					}),
				});

				if (!response.ok) {
					const rawResponse = await response.text();
					const payload = (
						rawResponse
							? (() => {
									try {
										return JSON.parse(rawResponse);
									} catch {
										return null;
									}
								})()
							: null
					) as { error?: string; details?: Record<string, string[] | undefined> } | null;
					const detailMessage = payload?.details
						? Object.values(payload.details)
								.flatMap(value => value ?? [])
								.filter(Boolean)
								.join(" ")
						: "";
					const fallbackMessage = rawResponse
						? rawResponse
								.replace(/<[^>]+>/g, " ")
								.replace(/\s+/g, " ")
								.trim()
						: "";
					throw new Error(
						payload?.error ||
							detailMessage ||
							fallbackMessage ||
							`Failed to create applicant (${response.status})`
					);
				}

				const responseData = await response.json();

				if (responseData.applicant?.id) {
					router.push(`/dashboard/applicants/${responseData.applicant.id}`);
				} else {
					router.push("/dashboard");
				}
				router.refresh();
			}
		} catch (error) {
			console.error("Error saving applicant:", error);
			setSubmitError(
				error instanceof Error ? error.message : "Failed to create applicant"
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmitForm)} className="space-y-8">
			{/* Test Mode Banner */}
			{isTestMode && (
				<div className="flex items-center justify-between p-4 rounded-lg border border-warning bg-warning/20 shadow-lg shadow-amber-800/5">
					<div className="flex items-center gap-2">
						<span className="text-warning-foreground animate-pulse text-sm font-medium">
							<RiTestTubeLine className="h-8 w-8 animate-pulse" /> Test Mode
						</span>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={fillTestData}
						className="border-warning/50 text-warning-foreground hover:bg-warning">
						Fill Test Data
					</Button>
				</div>
			)}

			{submitError && (
				<div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200">
					{submitError}
				</div>
			)}

			<div className="glass-card-container-form">
				<GlassCard>
					<h3 className="text-lg font-semibold mb-6">Company Information</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-2">
							<Label htmlFor="companyName">Company Name *</Label>
							<Input
								id="companyName"
								autoComplete={"companyName"}
								placeholder="Enter company name"
								{...register("companyName")}
								className={cn(
									errors.companyName ? "border-red-500" : "border-input-border"
								)}
							/>
							{errors.companyName && (
								<p className="text-xs text-red-500">{errors.companyName.message}</p>
							)}
						</div>

						{entityType !== "proprietor" && (
							<div className="space-y-2">
								<Label htmlFor="registrationNumber">CIPC Registration Number *</Label>
								<Input
									id="registrationNumber"
									autoComplete={"registrationNumber"}
									placeholder="e.g., 2024/123456/07"
									maxLength={14}
									{...register("registrationNumber")}
									className={cn(
										errors.registrationNumber ? "border-red-500" : "border-input-border"
									)}
								/>
								<p className="text-xs text-muted-foreground">
									Enter the South African CIPC number in the format YYYY/NNNNNN/07: 12
									digits total, 14 characters including the slashes.
								</p>
								{errors.registrationNumber && (
									<p className="text-xs text-red-500">
										{errors.registrationNumber.message}
									</p>
								)}
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor="entityType">Entity Type</Label>
							<Controller
								name="entityType"
								control={control}
								render={({ field }) => (
									<Select
										onValueChange={field.onChange}
										value={field.value || effectiveEntityType}
										disabled={isEntityTypeLocked}>
										<SelectTrigger id="entityType" className="w-full">
											<SelectValue placeholder="Select Entity Type" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="proprietor">Proprietor</SelectItem>
											<SelectItem value="company">Company (Pty Ltd)</SelectItem>
											<SelectItem value="close_corporation">Close Corporation</SelectItem>
											<SelectItem value="partnership">Partnership</SelectItem>
											<SelectItem value="npo">NPO</SelectItem>
											<SelectItem value="trust">Trust</SelectItem>
											<SelectItem value="body_corporate">Body Corporate</SelectItem>
											<SelectItem value="other">Other</SelectItem>
										</SelectContent>
									</Select>
								)}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="productType">Product Type</Label>
							<Controller
								name="productType"
								control={control}
								render={({ field }) => (
									<Select onValueChange={field.onChange} value={field.value}>
										<SelectTrigger id="productType" className="w-full">
											<SelectValue placeholder="Select Product Type" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="standard">Standard</SelectItem>
											<SelectItem value="premium_collections">
												Premium Collections
											</SelectItem>
											<SelectItem value="call_centre">Call Centre</SelectItem>
										</SelectContent>
									</Select>
								)}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="industry">Industry</Label>
							<Input
								id="industry"
								autoComplete={"industry"}
								placeholder="e.g., Financial Services, Mining"
								{...register("industry")}
								className="border-input-border"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="employeeCount">Employee Count</Label>
							<Input
								id="employeeCount"
								type="number"
								placeholder="e.g., 250"
								{...register("employeeCount")}
								className="border-input-border"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="estimatedTransactionsPerMonth">
								Estimated Volume (transactions per month)
							</Label>
							<Input
								id="estimatedTransactionsPerMonth"
								type="number"
								min={1}
								autoComplete="estimatedTransactionsPerMonth"
								placeholder="e.g., 500"
								{...register("estimatedTransactionsPerMonth")}
								className="border-input-border"
							/>
						</div>
					</div>

					<div className="space-y-2 mt-4">
						<Label htmlFor="mandateType">Mandate Type</Label>
						<Controller
							name="mandateType"
							control={control}
							render={({ field }) => (
								<Select onValueChange={field.onChange} value={field.value}>
									<SelectTrigger id="mandateType" className="w-full">
										<SelectValue placeholder="Select Mandate Type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="debit_order">Debit Order</SelectItem>
										<SelectItem value="eft_collection">EFT Collection</SelectItem>
										<SelectItem value="realtime_clearing">Realtime Clearing</SelectItem>
										<SelectItem value="managed_collection">Managed Collection</SelectItem>
									</SelectContent>
								</Select>
							)}
						/>
						{isEntityTypeLocked && activeScenario && (
							<p className="text-xs text-amber-600 dark:text-amber-300">
								Locked to {lockedEntityType?.replaceAll("_", " ")} for the
								{activeScenario.label} scenario.
							</p>
						)}
					</div>
				</GlassCard>
			</div>

			<div className="glass-card-container-form">
				<GlassCard>
					<h3 className="text-lg font-semibold mb-6">Contact Information</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-2">
							<Label htmlFor="contactName">Contact Name *</Label>
							<Input
								id="contactName"
								placeholder="Enter contact name"
								{...register("contactName")}
								className={cn(errors.contactName && "border-red-500")}
							/>
							{errors.contactName && (
								<p className="text-xs text-red-500">{errors.contactName.message}</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="email">Email Address *</Label>
							<Input
								id="email"
								type="email"
								placeholder="contact@company.co.za"
								{...register("email")}
								className={cn(errors.email && "border-red-500")}
							/>
							{errors.email && (
								<p className="text-xs text-red-500">{errors.email.message}</p>
							)}
						</div>

						{effectiveEntityType === "proprietor" && (
							<div className="space-y-2">
								<Label htmlFor="idNumber">SA ID Number *</Label>
								<Input
									id="idNumber"
									placeholder="13-digit SA ID number"
									maxLength={13}
									{...register("idNumber")}
									className={cn(
										errors.idNumber ? "border-red-500" : "border-input-border"
									)}
								/>
								<p className="text-xs text-muted-foreground">
									South African personal ID numbers must be exactly 13 digits.
								</p>
								{errors.idNumber && (
									<p className="text-xs text-red-500">{errors.idNumber.message}</p>
								)}
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor="phone">Phone Number</Label>
							<Input
								id="phone"
								type="tel"
								placeholder="+27 XX XXX XXXX"
								{...register("phone")}
								className="border-input-border"
							/>
						</div>
					</div>
				</GlassCard>
			</div>

			<div className="glass-card-container-form">
				<GlassCard>
					<h3 className="text-lg font-semibold mb-6">Additional Notes</h3>
					<div className="space-y-2">
						<Label htmlFor="notes">Notes</Label>
						<Controller
							name="notes"
							control={control}
							render={({ field }) => (
								<Textarea
									id="notes"
									placeholder="Add any relevant notes about this applicant..."
									rows={4}
									{...field}
								/>
							)}
						/>
					</div>
				</GlassCard>
			</div>

			<div className="flex items-center justify-end gap-4">
				<Button
					type="button"
					variant="ghost"
					onClick={() => router.back()}
					disabled={isLoading}>
					Cancel
				</Button>
				<Button
					type="submit"
					disabled={isLoading}
					className="gap-2 bg-linear-to-r from-stone-500 to-stone-500 hover:from-stone-600 hover:to-stone-600">
					{isLoading && <RiLoader4Line className="h-4 w-4 animate-spin" />}
					{isEditing ? "Save Changes" : "Create Applicant"}
				</Button>
			</div>
		</form>
	);
}
