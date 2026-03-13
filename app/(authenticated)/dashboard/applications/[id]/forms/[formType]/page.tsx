"use client";

/**
 * Individual Form Page
 * Renders the appropriate form based on the formType parameter
 */

import {
	RiArrowLeftLine,
	RiFileUploadLine,
	RiLoader4Line,
	RiSendPlaneLine,
} from "@remixicon/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard";
import {
	Absa6995Form,
	FacilityApplicationForm,
	FicaUploadForm,
	StratcolAgreementForm,
} from "@/components/onboarding-forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

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
	applicantId?: number | null;
}

interface DocumentUpload {
	id: number;
	fileName: string;
	fileSize: number;
	documentType: string;
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
	const [absaDocuments, setAbsaDocuments] = useState<DocumentUpload[]>([]);
	const [absaSending, setAbsaSending] = useState(false);
	const absaFileInputRef = useRef<HTMLInputElement>(null);

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

	// Fetch ABSA PDFs when on absa form
	const fetchAbsaDocuments = useCallback(async () => {
		if (!resolvedParams?.id) return;
		const res = await fetch(
			`/api/onboarding/documents/upload?workflowId=${resolvedParams.id}`
		);
		if (res.ok) {
			const { documents } = (await res.json()) as { documents: DocumentUpload[] };
			setAbsaDocuments(
				(documents ?? []).filter(d => d.documentType === "ABSA_6995_PDF")
			);
		}
	}, [resolvedParams?.id]);

	useEffect(() => {
		if (resolvedParams?.formType === "absa_6995") {
			fetchAbsaDocuments();
		}
	}, [resolvedParams?.formType, fetchAbsaDocuments]);

	const handleAbsaPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!(file && resolvedParams?.id)) return;
		const fd = new FormData();
		fd.set("file", file);
		fd.set("workflowId", resolvedParams.id);
		fd.set("category", "standard");
		fd.set("documentType", "ABSA_6995_PDF");
		try {
			const res = await fetch("/api/onboarding/documents/upload", {
				method: "POST",
				body: fd,
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err?.error ?? "Upload failed");
			}
			toast.success("PDF uploaded");
			fetchAbsaDocuments();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Upload failed");
		}
		e.target.value = "";
	};

	const handleSendToAbsa = async (docId: number) => {
		if (!(resolvedParams?.id && formData?.applicantId)) return;
		setAbsaSending(true);
		try {
			const res = await fetch(
				`/api/workflows/${resolvedParams.id}/absa/send`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						applicantId: formData.applicantId,
						documentUploadId: docId,
					}),
				}
			);
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err?.error ?? err?.message ?? "Send failed");
			}
			toast.success("ABSA packet sent to test address");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Send failed");
		} finally {
			setAbsaSending(false);
		}
	};

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
		} catch (_error) {
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
		} catch (_error) {
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
			workflowId: parseInt(workflowId, 10),
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
				return (
					<div className="space-y-8">
						<Absa6995Form {...commonProps} />
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Prefilled ABSA PDF</CardTitle>
								<p className="text-sm text-muted-foreground">
									Upload the prefilled ABSA 6995 form (PDF). Mock send goes to{" "}
									{process.env.NEXT_PUBLIC_APP_URL ? "ABSA_TEST_EMAIL" : "configured test address"}.
								</p>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex flex-col gap-2">
									<Label>Upload PDF</Label>
									<div className="flex gap-2">
										<input
											ref={absaFileInputRef}
											type="file"
											accept="application/pdf"
											onChange={handleAbsaPdfUpload}
											className="hidden"
										/>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => absaFileInputRef.current?.click()}
											className="gap-1.5"
										>
											<RiFileUploadLine className="h-4 w-4" />
											Choose PDF
										</Button>
									</div>
								</div>
								{absaDocuments.length > 0 && (
									<div className="space-y-2">
										<Label>Uploaded PDFs</Label>
										<ul className="space-y-2">
											{absaDocuments.map(doc => (
												<li
													key={doc.id}
													className="flex items-center justify-between rounded-lg border p-3"
												>
													<span className="text-sm">{doc.fileName}</span>
													<Button
														size="sm"
														onClick={() => handleSendToAbsa(doc.id)}
														disabled={absaSending || !formData?.applicantId}
														className="gap-1.5"
													>
														{absaSending ? (
															<RiLoader4Line className="h-4 w-4 animate-spin" />
														) : (
															<RiSendPlaneLine className="h-4 w-4" />
														)}
														Send to ABSA
													</Button>
												</li>
											))}
										</ul>
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				);
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
