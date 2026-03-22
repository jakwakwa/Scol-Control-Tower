"use client";

import {
	RiArrowLeftLine,
	RiCheckLine,
	RiSendPlaneLine,
} from "@remixicon/react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { DashboardLayout, } from "@/components/dashboard";
import { AbsaPacketSection } from "@/components/dashboard/contract/absa-packet-section";
import ConfirmActionDrawer from "@/components/shared/confirm-action-drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Absa6995FormData } from "@/lib/validations/onboarding";
import { contractReviewContent } from "./content";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

interface ApplicantSummary {
	id: number;
	companyName: string;
	registrationNumber?: string | null;
}

interface WorkflowSummary {
	id: number;
	stage?: number | null;
	status?: string | null;
}

interface AbsaFormData {
	form: { id: number; status: string };
	submission: { formData: string } | null;
	applicantId: number | null;
}

interface ApplicantPayload {
	applicant: ApplicantSummary;
	workflow: WorkflowSummary | null;
	contractReviewed?: boolean;
	absaPacketSent?: boolean;
	absaFormData?: AbsaFormData | null;
	absaDocuments?: { id: number; fileName: string | null }[];
}

type ActionLoadingState = "contract-review" | "absa-confirm" | null;

interface ContractReviewClientProps {
	applicantId: string;
}

const ContractReviewClient = ({ applicantId }: ContractReviewClientProps) => {
	const [actionLoading, setActionLoading] = useState<ActionLoadingState>(null);
	const [actionMessage, setActionMessage] = useState<string | null>(null);
	const [contractReviewNotes, setContractReviewNotes] = useState("");
	const [absaConfirmNotes, setAbsaConfirmNotes] = useState("");
	const { data: payload, isLoading, error, mutate } = useSWR<ApplicantPayload>(
		`/api/applicants/${applicantId}`,
		async (url: string) => {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error("Failed to fetch applicant");
			}
			return (await response.json()) as ApplicantPayload;
		},
		{
			refreshInterval: current => {
				const stage = current?.workflow?.stage;
				const status = current?.workflow?.status;
				return status === "awaiting_human" && (stage === 5 || stage === 6) ? 4000 : 0;
			},
		}
	);

	const canPerformActions =
		payload?.workflow?.stage === 5 && payload.workflow.status !== "terminated";
	const contractReviewed = payload?.contractReviewed ?? false;
	const absaPacketSent = payload?.absaPacketSent ?? false;
	const canConfirmAbsa = canPerformActions && absaPacketSent;

	const handleContractDraftReviewed = async () => {
		if (!(payload?.workflow?.id && payload?.applicant?.id)) return;
		setActionLoading("contract-review");
		setActionMessage(null);
		try {
			const response = await fetch(
				`/api/workflows/${payload.workflow.id}/contract/review`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						applicantId: payload.applicant.id,
						reviewNotes: contractReviewNotes.trim() || undefined,
					}),
				}
			);
			if (!response.ok) {
				const responsePayload = await response.json().catch(() => ({}));
				throw new Error(
					responsePayload?.error || "Failed to mark contract draft reviewed"
				);
			}
			setActionMessage("Contract draft review recorded. Workflow contract gate updated.");
			setContractReviewNotes("");
			await mutate();
		} catch (actionError) {
			setActionMessage(
				actionError instanceof Error
					? actionError.message
					: "Failed to mark contract draft reviewed"
			);
			throw actionError;
		} finally {
			setActionLoading(null);
		}
	};

	const handleConfirmAbsaApproved = async () => {
		if (!(payload?.workflow?.id && payload?.applicant?.id)) return;
		setActionLoading("absa-confirm");
		setActionMessage(null);
		try {
			const response = await fetch(`/api/workflows/${payload.workflow.id}/absa/confirm`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					applicantId: payload.applicant.id,
					notes: absaConfirmNotes.trim() || undefined,
				}),
			});
			if (!response.ok) {
				const responsePayload = await response.json().catch(() => ({}));
				throw new Error(responsePayload?.error || "Failed to confirm ABSA approval");
			}
			setActionMessage("ABSA approval confirmed. Workflow advancing.");
			setAbsaConfirmNotes("");
			await mutate();
		} catch (actionError) {
			setActionMessage(
				actionError instanceof Error ? actionError.message : "Failed to confirm ABSA approval"
			);
			throw actionError;
		} finally {
			setActionLoading(null);
		}
	};

	if (isLoading) {
		return (
			<DashboardLayout title="Loading..." description="Fetching contract review details">
				<p className="text-sm text-muted-foreground">Loading contract review...</p>
			</DashboardLayout>
		);
	}

	if (error || !payload?.applicant) {
		return (
			<DashboardLayout title="Applicant not found" description="Unable to load applicant">
				<p className="text-sm text-destructive">
					{error instanceof Error ? error.message : "Applicant not found"}
				</p>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout
			title={`${contractReviewContent.title}: ${payload.applicant.companyName}`}
			description={`Registration: ${payload.applicant.registrationNumber || "N/A"}`}
			actions={
				<Link href={`/dashboard/applicants/${payload.applicant.id}`}>
					<Button variant="outline" size="sm" className="gap-2">
						<RiArrowLeftLine className="h-4 w-4" />
						{contractReviewContent.backLabel}
					</Button>
				</Link>
			}>
			<div className="flex flex-col gap-3">
				<Card>
					<p className="text-normal">
						{contractReviewContent.description}
					</p>
				</Card>
				<Card className="flex flex-col pb-8">
					<p className="text-base">
						{contractReviewContent.contractGate.label}
					</p>
					<p className="text-base my-3 text-stone-300/70">
						{contractReviewContent.contractGate.description}
					</p>
					<Textarea
						value={contractReviewNotes}
						onChange={e => setContractReviewNotes(e.target.value)}
						placeholder={contractReviewContent.contractGate.placeholder}
						className="min-h-[88px]"
						disabled={actionLoading !== null || !canPerformActions}
					/>
					<ConfirmActionDrawer
						disabled={actionLoading !== null || !canPerformActions}
						isLoading={actionLoading === "contract-review"}
						title="Approve contract review?"
						description="Are you sure? This records the contract as reviewed and unlocks the ABSA gate."
						confirmLabel="Yes, approve review"
						cancelLabel="No, cancel"
						onConfirm={async () => {
							await toast.promise(handleContractDraftReviewed(), {
								loading: "Recording contract review...",
								success: "Contract review recorded.",
								error: error =>
									error instanceof Error ? error.message : "Failed to record review",
							});
						}}
						trigger={
							<Button disabled={actionLoading !== null || !canPerformActions} className="gap-2">
								<RiCheckLine className="h-4 w-4" />
								{contractReviewContent.contractGate.actionLabel}
							</Button>
						}
					/>
				</Card>

				{canPerformActions && payload?.workflow?.id && (
					<AbsaPacketSection
						workflowId={payload.workflow.id}
						applicantId={payload.applicant?.id ?? null}
						initialFormData={
							payload.absaFormData?.submission?.formData
								? (JSON.parse(
										payload.absaFormData.submission.formData
									) as Partial<Absa6995FormData>)
								: undefined
						}
						absaDocuments={payload.absaDocuments ?? []}
						disabled={!contractReviewed}
						onRefresh={mutate}
					/>
				)}

				<Card className="space-y-3">
					<p className="text-base uppercase text-secondary-foreground font-medium">
						{contractReviewContent.absaConfirmGate.label}
					</p>
					<p className="text-stone-300/70">
						{contractReviewContent.absaConfirmGate.description}
					</p>
					{!absaPacketSent && canPerformActions && (
						<p className="text-sm text-amber-300/80">
							Send the ABSA packet above first, then confirm once ABSA has approved.
						</p>
					)}
					<Textarea
						value={absaConfirmNotes}
						onChange={e => setAbsaConfirmNotes(e.target.value)}
						placeholder={contractReviewContent.absaConfirmGate.placeholder}
						className="min-h-[88px]"
						disabled={actionLoading !== null || !canConfirmAbsa}
					/>
					<ConfirmActionDrawer
						disabled={actionLoading !== null || !canConfirmAbsa}
						isLoading={actionLoading === "absa-confirm"}
						title="Confirm ABSA approved?"
						description="Are you sure? This advances Stage 5 once ABSA approval is confirmed."
						confirmLabel="Yes, confirm ABSA"
						cancelLabel="No, cancel"
						onConfirm={async () => {
							await toast.promise(handleConfirmAbsaApproved(), {
								loading: "Confirming ABSA approval...",
								success: "ABSA approval confirmed.",
								error: error =>
									error instanceof Error
										? error.message
										: "Failed to confirm ABSA approval",
							});
						}}
						trigger={
							<Button
								variant="secondary"
								disabled={actionLoading !== null || !canConfirmAbsa}
								className="gap-2 bg-action hover:bg-action/85">
								<RiSendPlaneLine className="h-4 w-4" />
								{contractReviewContent.absaConfirmGate.actionLabel}
							</Button>
						}
					/>
				</Card>
				{actionMessage ? <p className="text-sm text-amber-700">{actionMessage}</p> : null}
				{!canPerformActions ? (
					<p className="text-xs text-muted-foreground">
						{contractReviewContent.stageHint}
					</p>
				) : null}
			</div>
		</DashboardLayout>
	);
};

export default ContractReviewClient;
