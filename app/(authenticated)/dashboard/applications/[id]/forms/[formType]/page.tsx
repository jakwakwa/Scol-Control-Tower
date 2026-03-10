"use client";

/**
 * Individual Form Page
 * Renders the appropriate form based on the formType parameter
 */

import { RiArrowLeftLine, RiLoader4Line } from "@remixicon/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard";
import {
	Absa6995Form,
	FacilityApplicationForm,
	FicaUploadForm,
	StratcolAgreementForm,
} from "@/components/onboarding-forms";
import { Button } from "@/components/ui/button";

// ============================================
// Types
// ============================================

interface FormData {
	form: {
		id: number;
		status: string;
		currentStep: number;
		totalSteps: number;
	} | null;
	submission: {
		id: number;
		formData: string;
		version: number;
	} | null;
	status: string;
}

// ============================================
// Form Title Map
// ============================================

const FORM_TITLES: Record<string, string> = {
	stratcol_agreement: "StratCol Agreement",
	facility_application: "Facility Application",
	absa_6995: "Absa 6995 Pre-screening",
	fica_documents: "FICA Documents",
};

// ============================================
// Page Component
// ============================================

export default function FormPage({
	params,
}: {
	params: Promise<{ id: string; formType: string }>;
}) {
	const router = useRouter();
	const [resolvedParams, setResolvedParams] = useState<{
		id: string;
		formType: string;
	} | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formData, setFormData] = useState<FormData | null>(null);

	// Resolve params
	useEffect(() => {
		params.then(p => setResolvedParams(p));
	}, [params]);

	// Fetch form data
	useEffect(() => {
		if (!resolvedParams) return;

		const fetchFormData = async () => {
			try {
				const response = await fetch(
					`/api/onboarding/forms/${resolvedParams.id}/${resolvedParams.formType}`
				);
				if (response.ok) {
					const data = await response.json();
					setFormData(data);
				}
			} catch (error) {
				console.error("Failed to fetch form data:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchFormData();
	}, [resolvedParams]);

	if (!resolvedParams) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<RiLoader4Line className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const { id: workflowId, formType } = resolvedParams;
	const formTitle = FORM_TITLES[formType] || "Form";

	// Parse initial data from submission
	const initialData = formData?.submission?.formData
		? JSON.parse(formData.submission.formData)
		: undefined;

	// Check if form is read-only (already approved)
	const isReadOnly = formData?.status === "approved";

	// Handle form submission
	const handleSubmit = async (data: unknown) => {
		setIsSubmitting(true);
		try {
			const response = await fetch(`/api/onboarding/forms/${workflowId}/${formType}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					formData: data,
					isDraft: false,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to submit form");
			}

			toast.success("Form submitted successfully", {
				description: "Your form has been submitted for review.",
			});

			router.push(`/dashboard/applications/${workflowId}/forms`);
		} catch (error) {
			toast.error("Failed to submit form", {
				description: "Please try again later.",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle save draft
	const handleSaveDraft = async (data: unknown) => {
		try {
			const response = await fetch(`/api/onboarding/forms/${workflowId}/${formType}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					formData: data,
					isDraft: true,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to save draft");
			}

			toast.success("Draft saved", {
				description: "Your progress has been saved.",
			});
		} catch (error) {
			toast.error("Failed to save draft", {
				description: "Please try again later.",
			});
		}
	};

	// Render the appropriate form
	const renderForm = () => {
		if (isLoading) {
			return (
				<div className="flex items-center justify-center py-12">
					<RiLoader4Line className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			);
		}

		const commonProps = {
			workflowId: parseInt(workflowId),
			initialData,
			onSubmit: handleSubmit,
			onSaveDraft: handleSaveDraft,
			readOnly: isReadOnly,
			isSubmitting,
		};

		switch (formType) {
			case "stratcol_agreement":
				return <StratcolAgreementForm {...commonProps} />;
			case "facility_application":
				return <FacilityApplicationForm {...commonProps} />;
			case "absa_6995":
				return <Absa6995Form {...commonProps} />;
			case "fica_documents":
				return <FicaUploadForm {...commonProps} />;
			default:
				return (
					<div className="text-center py-12">
						<p className="text-muted-foreground">Form type not found</p>
					</div>
				);
		}
	};

	return (
		<DashboardLayout
			actions={
				<div className="flex items-center gap-4">
					{formTitle}
					<Link href={`/dashboard/applications/${workflowId}/forms`}>
						<Button variant="ghost" size="sm" className="gap-1.5">
							<RiArrowLeftLine className="h-4 w-4" />
							Back to Forms
						</Button>
					</Link>
				</div>
			}>
			<div className="max-w-4xl mx-auto">{renderForm()}</div>
		</DashboardLayout>
	);
}
