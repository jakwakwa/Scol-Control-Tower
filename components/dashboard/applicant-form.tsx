"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RiLoader4Line, RiTestTubeLine } from "@remixicon/react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useState } from "react";
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
import { getPostHogProjectToken } from "@/lib/posthog-env";
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

	const form = useForm<ApplicantFormData>({
		resolver: zodResolver(applicantSchema),
		defaultValues: {
			companyName: initialData?.companyName || "",
			registrationNumber: initialData?.registrationNumber || "",
			vatNumber: initialData?.vatNumber || "",
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
		watch,
		formState: { errors },
	} = form;

	const entityType = watch("entityType");

	// Check if test mode is enabled
	const isTestMode = process.env.NEXT_PUBLIC_USE_TESTMODE_CHECK === "true";

	// Fill form with test data for testing
	const fillTestData = () => {
		form.reset({
			companyName: `${isTestMode ? "Jacob Kotze" : "Test Company Inc"}`,
			registrationNumber: `${isTestMode ? "0787173160001" : "2024/123456/07"}`,
			vatNumber: "4420106777",
			contactName: `${isTestMode ? "Jacob Kotzee" : "John Test"}`,
			idNumber: `${isTestMode ? "8503195187088" : ""}`,
			email: `${isTestMode ? "jkotzee@icloud.com" : "john.test@testcompany.co.za"}`,
			phone: `${isTestMode ? "" : "+27 82 123 4567"}`,
			entityType: isTestMode ? "proprietor" : "company",
			productType: "standard",
			industry: `${isTestMode ? "IT" : "Financial Services"}`,
			mandateType: `${isTestMode ? "Debit Order" : "debit_order"}`,
			employeeCount: `${isTestMode ? "1" : "5"}`,
			estimatedTransactionsPerMonth: `${isTestMode ? "20" : "1500"}`,
			notes: "test applicant input - auto-generated for credit check testing",
		});
	};

	const onSubmitForm = async (data: ApplicantFormData) => {
		setIsLoading(true);

		try {
			if (onSubmit) {
				await onSubmit(data);
			} else {
				// Default behavior: POST to API
				const response = await fetch("/api/applicants", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						...data,
						idNumber: data.idNumber?.trim() || undefined,
						vatNumber: data.vatNumber?.trim() || undefined,
						employeeCount: data.employeeCount
							? parseInt(data.employeeCount, 10)
							: undefined,
						estimatedTransactionsPerMonth: data.estimatedTransactionsPerMonth
							? Math.round(Number(data.estimatedTransactionsPerMonth)) || undefined
							: undefined,
					}),
				});

				if (!response.ok) {
					throw new Error("Failed to create applicant");
				}

				const responseData = await response.json();
				if (getPostHogProjectToken()) {
					posthog.capture("applicant_form_submitted", {
						company_name: data.companyName,
						entity_type: data.entityType,
						product_type: data.productType,
						industry: data.industry,
						applicant_id: responseData.applicant?.id,
					});
				}

				if (responseData.applicant?.id) {
					router.push(`/dashboard/applicants/${responseData.applicant.id}`);
				} else {
					router.push("/dashboard");
				}
				router.refresh();
			}
		} catch (error) {
			console.error("Error saving applicant:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmitForm)} className="space-y-8">
			{/* Test Mode Banner */}
			{isTestMode && (
				<div className="flex items-center backdrop-blur-xs bg-primary/10 justify-between p-4 rounded-lg border border-warning bg-warning/20 shadow-lg shadow-amber-800/5">
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
									{...register("registrationNumber")}
									className={cn(
										errors.registrationNumber ? "border-red-500" : "border-input-border"
									)}
								/>
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
									<Select onValueChange={field.onChange} value={field.value}>
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
							<Label htmlFor="vatNumber">VAT Number (Optional)</Label>
							<Input
								id="vatNumber"
								placeholder="10-digit VAT number"
								maxLength={10}
								{...register("vatNumber")}
								className={cn(
									errors.vatNumber ? "border-red-500" : "border-input-border"
								)}
							/>
							{errors.vatNumber && (
								<p className="text-xs text-red-500">{errors.vatNumber.message}</p>
							)}
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

						{entityType === "proprietor" && (
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
					size="lg"
					className="gap-2 bg-linear-to-r from-cyan-900 to-180% to-cyan-800 hover:from-secondary hover:to-secondary">
					{isLoading && <RiLoader4Line className="h-4 w-4 animate-spin" />}
					{isEditing ? "Save Changes" : "Create Applicant"}
				</Button>
			</div>
		</form>
	);
}
