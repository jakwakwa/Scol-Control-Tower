"use client";

import { RiFileUploadLine } from "@remixicon/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { GlassCard } from "@/components/dashboard";
import { Absa6995Form } from "@/components/forms/external/onboarding-forms";
import AsyncActionButton from "@/components/shared/async-action-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { Absa6995FormData } from "@/lib/validations/onboarding";

interface DocumentUpload {
	id: number;
	fileName: string | null;
}

interface AbsaPacketSectionProps {
	workflowId: number;
	applicantId: number | null;
	initialFormData?: Partial<Absa6995FormData>;
	absaDocuments: DocumentUpload[];
	disabled: boolean;
	onRefresh: () => Promise<unknown>;
}

const absaPacketContent = {
	label: "Step 1 - ABSA 6995 Packet",
	description:
		"Fill in the ABSA 6995 form for recordkeeping, then upload the prefilled PDF and send it to the test address. Once ABSA has approved, confirm the approval in the sidebar.",
	lockedHint: "Complete the contract review step first.",
};

export function AbsaPacketSection({
	workflowId,
	applicantId,
	initialFormData,
	absaDocuments,
	disabled,
	onRefresh,
}: AbsaPacketSectionProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [absaSending, setAbsaSending] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleAbsaPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!(file && workflowId)) return;
		const fd = new FormData();
		fd.set("file", file);
		fd.set("workflowId", String(workflowId));
		fd.set("category", "standard");
		fd.set("documentType", "ABSA_6995_PDF");
		await toast.promise(
			(async () => {
				const res = await fetch("/api/onboarding/documents/upload", {
					method: "POST",
					body: fd,
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(err?.error ?? "Upload failed");
				}
				await onRefresh();
			})(),
			{
				loading: "Uploading PDF...",
				success: "PDF uploaded",
				error: err => (err instanceof Error ? err.message : "Upload failed"),
			}
		);
		e.target.value = "";
	};

	const handleSendToAbsa = async (docId: number) => {
		if (!(applicantId != null)) return;
		setAbsaSending(true);
		try {
			await toast.promise(
				(async () => {
					const res = await fetch(`/api/workflows/${workflowId}/absa/send`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							applicantId,
							documentUploadId: docId,
						}),
					});
					if (!res.ok) {
						const err = await res.json().catch(() => ({}));
						throw new Error(err?.error ?? err?.message ?? "Send failed");
					}
					await onRefresh();
				})(),
				{
					loading: "Sending ABSA packet...",
					success: "ABSA packet sent to test address",
					error: err => (err instanceof Error ? err.message : "Send failed"),
				}
			);
		} finally {
			setAbsaSending(false);
		}
	};

	const handleSubmit = async (data: Absa6995FormData) => {
		setIsSubmitting(true);
		try {
			await toast.promise(
				(async () => {
					const response = await fetch(`/api/onboarding/forms/${workflowId}/absa_6995`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ formData: data, isDraft: false }),
					});
					if (!response.ok) throw new Error("Failed to submit form");
					await onRefresh();
				})(),
				{
					loading: "Saving ABSA form...",
					success: "ABSA form saved",
					error: "Failed to save ABSA form",
				}
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleSaveDraft = async (data: Partial<Absa6995FormData>) => {
		await toast.promise(
			(async () => {
				const response = await fetch(`/api/onboarding/forms/${workflowId}/absa_6995`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ formData: data, isDraft: true }),
				});
				if (!response.ok) throw new Error("Failed to save draft");
				await onRefresh();
			})(),
			{
				loading: "Saving draft...",
				success: "Draft saved",
				error: "Failed to save draft",
			}
		);
	};

	return (
		<GlassCard className="space-y-6 surface-card">
			<div>
				<p className="text-base uppercase text-secondary-foreground font-medium">
					{absaPacketContent.label}
				</p>
				<p className="text-stone-300/70 mt-1">{absaPacketContent.description}</p>
				{disabled && (
					<p className="text-sm text-amber-300/80 mt-2">{absaPacketContent.lockedHint}</p>
				)}
			</div>

			<div className={disabled ? " opacity-60" : ""}>
				<Absa6995Form
					workflowId={workflowId}
					initialData={initialFormData}
					onSubmit={handleSubmit}
					onSaveDraft={handleSaveDraft}
					readOnly={disabled}
					isSubmitting={isSubmitting}
				/>

				<Card className="mt-6">
					<CardHeader>
						<CardTitle className="text-base">Prefilled ABSA PDF</CardTitle>
						<p className="text-sm text-muted-foreground">
							Upload the prefilled ABSA 6995 form (PDF). Mock send goes to{" "}
							{process.env.NEXT_PUBLIC_APP_URL
								? "ABSA_TEST_EMAIL"
								: "configured test address"}
							.
						</p>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex flex-col gap-2">
							<Label>Upload PDF</Label>
							<div className="flex gap-2">
								<input
									ref={fileInputRef}
									type="file"
									accept="application/pdf"
									onChange={handleAbsaPdfUpload}
									className="hidden"
								/>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => fileInputRef.current?.click()}
									className="gap-1.5"
									disabled={disabled}>
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
											className="flex items-center justify-between rounded-lg border p-3">
											<span className="text-sm">{doc.fileName ?? "PDF"}</span>
											<AsyncActionButton
												size="sm"
												className="gap-1.5"
												label="Send to ABSA"
												loadingLabel="Sending..."
												isLoading={absaSending}
												disabled={applicantId == null || disabled}
												onClick={() => handleSendToAbsa(doc.id)}
											/>
										</li>
									))}
								</ul>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</GlassCard>
	);
}
