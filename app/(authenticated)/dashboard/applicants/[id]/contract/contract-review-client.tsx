"use client";

import { RiArrowLeftLine, RiCheckLine, RiLoader4Line, RiSendPlaneLine } from "@remixicon/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DashboardLayout, GlassCard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { contractReviewContent } from "./content";

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

interface ApplicantPayload {
	applicant: ApplicantSummary;
	workflow: WorkflowSummary | null;
}

type ActionLoadingState = "contract-review" | "absa-mock" | null;

interface ContractReviewClientProps {
	applicantId: string;
}

const ContractReviewClient = ({ applicantId }: ContractReviewClientProps) => {
	const [payload, setPayload] = useState<ApplicantPayload | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [actionLoading, setActionLoading] = useState<ActionLoadingState>(null);
	const [actionMessage, setActionMessage] = useState<string | null>(null);
	const [contractReviewNotes, setContractReviewNotes] = useState("");
	const [absaMockNotes, setAbsaMockNotes] = useState("");

	const refreshApplicantData = useCallback(async () => {
		const response = await fetch(`/api/applicants/${applicantId}`);
		if (!response.ok) {
			throw new Error("Failed to fetch applicant");
		}
		const data = (await response.json()) as ApplicantPayload;
		setPayload(data);
		return data;
	}, [applicantId]);

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			try {
				const data = await refreshApplicantData();
				if (!mounted) return;
				setPayload(data);
			} catch (loadError) {
				if (!mounted) return;
				setError(
					loadError instanceof Error ? loadError.message : "Failed to load applicant"
				);
			} finally {
				if (mounted) {
					setLoading(false);
				}
			}
		};

		load();
		return () => {
			mounted = false;
		};
	}, [refreshApplicantData]);

	const canPerformActions =
		payload?.workflow?.stage === 5 && payload.workflow.status !== "terminated";

	const handleContractDraftReviewed = async () => {
		if (!(payload?.workflow?.id && payload?.applicant?.id)) return;
		setActionLoading("contract-review");
		setActionMessage(null);
		try {
			const response = await fetch(`/api/workflows/${payload.workflow.id}/contract/review`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					applicantId: payload.applicant.id,
					reviewNotes: contractReviewNotes.trim() || undefined,
				}),
			});
			if (!response.ok) {
				const responsePayload = await response.json().catch(() => ({}));
				throw new Error(responsePayload?.error || "Failed to mark contract draft reviewed");
			}
			setActionMessage("Contract draft review recorded. Workflow contract gate updated.");
			setContractReviewNotes("");
			await refreshApplicantData();
		} catch (actionError) {
			setActionMessage(
				actionError instanceof Error
					? actionError.message
					: "Failed to mark contract draft reviewed"
			);
		} finally {
			setActionLoading(null);
		}
	};

	const handleMockAbsaSend = async () => {
		if (!(payload?.workflow?.id && payload?.applicant?.id)) return;
		setActionLoading("absa-mock");
		setActionMessage(null);
		try {
			const response = await fetch(`/api/workflows/${payload.workflow.id}/absa/mock`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					applicantId: payload.applicant.id,
					notes: absaMockNotes.trim() || undefined,
				}),
			});
			if (!response.ok) {
				const responsePayload = await response.json().catch(() => ({}));
				throw new Error(responsePayload?.error || "Failed to mock ABSA handoff");
			}
			setActionMessage("ABSA handoff mocked and completion signal emitted to workflow.");
			setAbsaMockNotes("");
			await refreshApplicantData();
		} catch (actionError) {
			setActionMessage(
				actionError instanceof Error ? actionError.message : "Failed to mock ABSA handoff"
			);
		} finally {
			setActionLoading(null);
		}
	};

	if (loading) {
		return (
			<DashboardLayout title="Loading..." description="Fetching contract review details">
				<p className="text-sm text-muted-foreground">Loading contract review...</p>
			</DashboardLayout>
		);
	}

	if (error || !payload?.applicant) {
		return (
			<DashboardLayout title="Applicant not found" description="Unable to load applicant">
				<p className="text-sm text-destructive">{error || "Applicant not found"}</p>
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
			<div className="space-y-4">
				<GlassCard>
					<p className="text-sm text-foreground">{contractReviewContent.description}</p>
				</GlassCard>
				<GlassCard className="space-y-3">
					<p className="text-xs uppercase text-muted-foreground font-bold">
						{contractReviewContent.contractGate.label}
					</p>
					<p className="text-sm text-foreground">
						{contractReviewContent.contractGate.description}
					</p>
					<Textarea
						value={contractReviewNotes}
						onChange={e => setContractReviewNotes(e.target.value)}
						placeholder={contractReviewContent.contractGate.placeholder}
						className="min-h-[88px]"
						disabled={actionLoading !== null || !canPerformActions}
					/>
					<Button
						onClick={handleContractDraftReviewed}
						disabled={actionLoading !== null || !canPerformActions}
						className="gap-2">
						{actionLoading === "contract-review" ? (
							<RiLoader4Line className="h-4 w-4 animate-spin" />
						) : (
							<RiCheckLine className="h-4 w-4" />
						)}
						{contractReviewContent.contractGate.actionLabel}
					</Button>
				</GlassCard>
				<GlassCard className="space-y-3">
					<p className="text-xs uppercase text-muted-foreground font-bold">
						{contractReviewContent.absaMockGate.label}
					</p>
					<p className="text-sm text-foreground">
						{contractReviewContent.absaMockGate.description}
					</p>
					<Textarea
						value={absaMockNotes}
						onChange={e => setAbsaMockNotes(e.target.value)}
						placeholder={contractReviewContent.absaMockGate.placeholder}
						className="min-h-[88px]"
						disabled={actionLoading !== null || !canPerformActions}
					/>
					<Button
						variant="secondary"
						onClick={handleMockAbsaSend}
						disabled={actionLoading !== null || !canPerformActions}
						className="gap-2 bg-action hover:bg-action/85">
						{actionLoading === "absa-mock" ? (
							<RiLoader4Line className="h-4 w-4 animate-spin" />
						) : (
							<RiSendPlaneLine className="h-4 w-4" />
						)}
						{contractReviewContent.absaMockGate.actionLabel}
					</Button>
				</GlassCard>
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
