"use client";

/**
 * Individual Form Page
 * Renders the appropriate form based on the formType parameter
 */

import { RiArrowLeftLine, RiLoader4Line } from "@remixicon/react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard";
import { AbsaPacketSection } from "@/components/dashboard/contract/absa-packet-section";
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
	absa_6995: "Absa 6995 Pre-screening",
};

// ============================================
// Page Component
// ============================================

export default function FormPage({
	params,
}: {
	params: Promise<{ id: string; formType: string }>;
}) {
	const [resolvedParams, setResolvedParams] = useState<{
		id: string;
		formType: string;
	} | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [formData, setFormData] = useState<FormData | null>(null);
	const [absaDocuments, setAbsaDocuments] = useState<DocumentUpload[]>([]);

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
			setAbsaDocuments((documents ?? []).filter(d => d.documentType === "ABSA_6995_PDF"));
		}
	}, [resolvedParams?.id]);

	useEffect(() => {
		if (resolvedParams?.formType === "absa_6995") {
			fetchAbsaDocuments();
		}
	}, [resolvedParams?.formType, fetchAbsaDocuments]);

	if (!resolvedParams) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<RiLoader4Line className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const { id: workflowId, formType } = resolvedParams;

	if (formType === "stratcol_agreement") {
		notFound();
	}

	const formTitle = FORM_TITLES[formType] || "Form";

	// Parse initial data from submission
	const initialData = formData?.submission?.formData
		? JSON.parse(formData.submission.formData)
		: undefined;

	// Check if form is read-only (already approved)
	const isReadOnly = formData?.status === "approved";

	// Render the appropriate form
	const renderForm = () => {
		if (isLoading) {
			return (
				<div className="flex items-center justify-center py-12">
					<RiLoader4Line className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			);
		}

		switch (formType) {
			case "absa_6995":
				return (
					<AbsaPacketSection
						workflowId={parseInt(workflowId, 10)}
						applicantId={formData?.applicantId ?? null}
						initialFormData={initialData}
						absaDocuments={absaDocuments}
						disabled={isReadOnly}
						onRefresh={async () => {
							await fetchAbsaDocuments();
						}}
					/>
				);
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
