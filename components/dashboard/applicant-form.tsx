"use client";

import { RiLoader4Line, RiTestTubeLine } from "@remixicon/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GlassCard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ApplicantFormData {
	companyName: string;
	registrationNumber: string;
	contactName: string;
	email: string;
	phone: string;
	entityType: string;
	productType: string;
	industry: string;
	employeeCount: string;
	estimatedVolume: string;
	mandateType: string;
	notes: string;
}

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
	const [errors, setErrors] = useState<Partial<Record<keyof ApplicantFormData, string>>>(
		{}
	);

	const [formData, setFormData] = useState<ApplicantFormData>({
		companyName: initialData?.companyName || "",
		registrationNumber: initialData?.registrationNumber || "",
		contactName: initialData?.contactName || "",
		email: initialData?.email || "",
		phone: initialData?.phone || "",
		entityType: initialData?.entityType || "",
		productType: initialData?.productType || "",
		industry: initialData?.industry || "",
		mandateType: initialData?.mandateType || "",
		employeeCount: initialData?.employeeCount || "",
		estimatedVolume: initialData?.estimatedVolume || "",
		notes: initialData?.notes || "",
	});

	// Check if Mockaroo test mode is enabled
	const isMockarooTestMode = process.env.NEXT_PUBLIC_USE_MOCKAROO_CREDIT_CHECK === "true";

	// Fill form with test data for Mockaroo testing
	const fillTestData = () => {
		setFormData({
			companyName: `${isMockarooTestMode ? "Jacob Kotzee T/a Doodles Digital" : "Test Company Inc"}`,
			registrationNumber: `${isMockarooTestMode ? "0787173160001" : "2024/123456/07"}`,
			contactName: `${isMockarooTestMode ? "Jacob Kotzee" : "John Test"}`,
			email: `${isMockarooTestMode ? "jkotzee@icloud.com" : "john.test@testcompany.co.za"}`,
			phone: `${isMockarooTestMode ? "+27 76 341 0291" : "+27 82 123 4567"}`,
			entityType: "company",
			productType: "standard",
			industry: `${isMockarooTestMode ? "Software Development" : "Financial Services"}`,
			mandateType: `${isMockarooTestMode ? "Debit Order" : "debit_order"}`,
			employeeCount: `${isMockarooTestMode ? "1" : "50"}`,
			estimatedVolume: `${isMockarooTestMode ? `R ${Math.floor(Math.random() * 100000)}` : "R500,000"}`,
			notes: "Mockaroo test applicant - auto-generated for credit check testing",
		});
	};

	const updateField = (field: keyof ApplicantFormData, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }));
		// Clear error when user starts typing
		if (errors[field]) {
			setErrors(prev => ({ ...prev, [field]: undefined }));
		}
	};

	const validateForm = (): boolean => {
		const newErrors: Partial<Record<keyof ApplicantFormData, string>> = {};

		if (!formData.companyName.trim()) {
			newErrors.companyName = "Company name is required";
		}
		if (!formData.contactName.trim()) {
			newErrors.contactName = "Contact name is required";
		}
		if (!formData.email.trim()) {
			newErrors.email = "Email is required";
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			newErrors.email = "Invalid email address";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) return;

		setIsLoading(true);

		try {
			if (onSubmit) {
				await onSubmit(formData);
			} else {
				// Default behavior: POST to API
				const response = await fetch("/api/applicants", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						...formData,
						employeeCount: formData.employeeCount
							? parseInt(formData.employeeCount, 10)
							: undefined,
					}),
				});

				if (!response.ok) {
					throw new Error("Failed to create applicant");
				}

				const data = await response.json();
				if (data.applicant?.id) {
					router.push(`/dashboard/applicants/${data.applicant.id}`);
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
		<form onSubmit={handleSubmit} className="space-y-8">
			{/* Test Mode Banner */}
			{isMockarooTestMode && (
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

			{/* Company Information */}
			<div className="glass-card-container-form">
				<GlassCard>
					<h3 className="text-lg font-semibold mb-6">Company Information</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-2">
							<Label htmlFor="companyName">Company Name *</Label>
							<Input
								id="companyName"
								value={formData.companyName}
								onChange={e => updateField("companyName", e.target.value)}
								placeholder="Enter company name"
								className={cn(
									errors.companyName ? "border-red-500" : "border-input-border"
								)}
							/>
							{errors.companyName && (
								<p className="text-xs text-red-400">{errors.companyName}</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="registrationNumber">CIPC Registration Number</Label>
							<Input
								className="border-input-border"
								id="registrationNumber"
								value={formData.registrationNumber}
								onChange={e => updateField("registrationNumber", e.target.value)}
								placeholder="e.g., 2024/123456/07"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="entityType">Entity Type</Label>
							<select
								id="entityType"
								value={formData.entityType}
								onChange={e => updateField("entityType", e.target.value)}
								className="flex h-10 w-full rounded-md border border-input-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
								<option value="">Select Entity Type</option>
								<option value="proprietor">Proprietor</option>
								<option value="company">Company (Pty Ltd)</option>
								<option value="close_corporation">Close Corporation</option>
								<option value="partnership">Partnership</option>
								<option value="npo">NPO</option>
								<option value="trust">Trust</option>
								<option value="body_corporate">Body Corporate</option>
								<option value="other">Other</option>
							</select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="productType">Product Type</Label>
							<select
								id="productType"
								value={formData.productType}
								onChange={e => updateField("productType", e.target.value)}
								className="flex h-10 w-full rounded-md border border-input-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
								<option value="">Select Product Type</option>
								<option value="standard">Standard</option>
								<option value="premium_collections">Premium Collections</option>
								<option value="call_centre">Call Centre</option>
							</select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="industry">Industry</Label>
							<Input
								className="border-input-border"
								id="industry"
								value={formData.industry}
								onChange={e => updateField("industry", e.target.value)}
								placeholder="e.g., Financial Services, Mining"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="employeeCount">Employee Count</Label>
							<Input
								className="border-input-border"
								id="employeeCount"
								type="number"
								value={formData.employeeCount}
								onChange={e => updateField("employeeCount", e.target.value)}
								placeholder="e.g., 250"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="estimatedVolume">Estimated Volume</Label>
							<Input
								className="border-input-border"
								id="estimatedVolume"
								value={formData.estimatedVolume}
								onChange={e => updateField("estimatedVolume", e.target.value)}
								placeholder="e.g., R500,000"
							/>
						</div>
					</div>

					<div className="space-y-2 mt-4">
						<Label htmlFor="mandateType">Mandate Type</Label>
						<select
							id="mandateType"
							value={formData.mandateType}
							onChange={e => updateField("mandateType", e.target.value)}
							className="flex h-10 w-full rounded-md border border-input-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
							<option value="">Select Mandate Type</option>
							<option value="debit_order">Debit Order</option>
							<option value="eft_collection">EFT Collection</option>
							<option value="realtime_clearing">Realtime Clearing</option>
							<option value="managed_collection">Managed Collection</option>
						</select>
					</div>
				</GlassCard>
			</div>
			<div className="glass-card-container-form">
				{/* Contact Information */}
				<GlassCard>
					<h3 className="text-lg font-semibold mb-6">Contact Information</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-2">
							<Label htmlFor="contactName">Contact Name *</Label>
							<Input
								id="contactName"
								value={formData.contactName}
								onChange={e => updateField("contactName", e.target.value)}
								placeholder="Enter contact name"
								className={cn(errors.contactName && "border-red-500")}
							/>
							{errors.contactName && (
								<p className="text-xs text-red-400">{errors.contactName}</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="email">Email Address *</Label>
							<Input
								id="email"
								type="email"
								value={formData.email}
								onChange={e => updateField("email", e.target.value)}
								placeholder="contact@company.co.za"
								className={cn(errors.email && "border-red-500")}
							/>
							{errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
						</div>

						<div className="space-y-2 md:col-span-2">
							<Label htmlFor="phone">Phone Number</Label>
							<Input
								id="phone"
								type="tel"
								value={formData.phone}
								onChange={e => updateField("phone", e.target.value)}
								placeholder="+27 XX XXX XXXX"
							/>
						</div>
					</div>
				</GlassCard>
			</div>
			<div className="glass-card-container-form">
				{/* Additional Notes */}
				<GlassCard>
					<h3 className="text-lg font-semibold mb-6">Additional Notes</h3>
					<div className="space-y-2">
						<Label htmlFor="notes">Notes</Label>
						<Textarea
							id="notes"
							value={formData.notes}
							onChange={e => updateField("notes", e.target.value)}
							placeholder="Add any relevant notes about this applicant..."
							rows={4}
						/>
					</div>
				</GlassCard>
			</div>
			{/* Actions */}
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
