"use client";

import { RiLoader4Line, RiSendPlaneLine } from "@remixicon/react";
import { useState } from "react";
import { toast } from "sonner";
import { GlassCard } from "@/components/dashboard";
import ConfirmActionDrawer from "@/components/shared/confirm-action-drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
	buildAbsaConfirmEndpoint,
	canConfirmAbsa,
	showAbsaActions,
} from "@/lib/config/workflow-gates";

interface WorkflowGatesCardProps {
	workflowId: number;
	applicantId: number;
	workflowStage: number | null | undefined;
	workflowStatus: string | null | undefined;
	contractReviewed: boolean;
	absaPacketSent: boolean;
	onGateCompleted: () => Promise<void> | void;
}

export default function WorkflowGatesCard({
	workflowId,
	applicantId,
	workflowStage,
	workflowStatus,
	contractReviewed,
	absaPacketSent,
	onGateCompleted,
}: WorkflowGatesCardProps) {
	const [actionLoading, setActionLoading] = useState<"absa-confirm" | null>(null);
	const [absaConfirmNotes, setAbsaConfirmNotes] = useState("");

	const showAbsa = showAbsaActions(
		workflowStage,
		workflowStatus,
		contractReviewed
	);
	const absaConfirmEnabled = canConfirmAbsa(
		workflowStage,
		workflowStatus,
		absaPacketSent
	);

	const handleConfirmAbsaApproved = async () => {
		setActionLoading("absa-confirm");
		try {
			const response = await fetch(
				buildAbsaConfirmEndpoint(workflowId),
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						applicantId,
						notes: absaConfirmNotes.trim() || undefined,
					}),
				}
			);
			if (!response.ok) {
				const payload = await response.json().catch(() => ({}));
				throw new Error(
					payload?.error || "Failed to confirm ABSA approval"
				);
			}
			setAbsaConfirmNotes("");
			await onGateCompleted();
		} finally {
			setActionLoading(null);
		}
	};

	if (!showAbsa) return null;

	return (
		<GlassCard className="space-y-4 border-l-4 border-l-amber-500">
			<h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
				ABSA Approval
			</h3>

			<div className="space-y-3">
				<p className="text-xs font-semibold uppercase text-muted-foreground">
					Step 2 &mdash; ABSA Packet
				</p>
				<p className="text-xs text-muted-foreground">
					Send the ABSA packet, then confirm once ABSA has approved.
				</p>
				{!absaPacketSent && (
					<p className="text-xs text-amber-300/80">
						Send the ABSA packet first before confirming.
					</p>
				)}
				<Textarea
					value={absaConfirmNotes}
					onChange={(e) => setAbsaConfirmNotes(e.target.value)}
					placeholder="Optional confirmation notes..."
					className="min-h-[72px] text-sm"
					disabled={actionLoading !== null || !absaConfirmEnabled}
				/>
				<ConfirmActionDrawer
					disabled={actionLoading !== null || !absaConfirmEnabled}
					isLoading={actionLoading === "absa-confirm"}
					title="Confirm ABSA approved?"
					description="This advances Stage 5 once ABSA approval is confirmed."
					confirmLabel="Yes, confirm ABSA"
					cancelLabel="Cancel"
					onConfirm={async () => {
						await toast.promise(handleConfirmAbsaApproved(), {
							loading: "Confirming ABSA approval...",
							success: "ABSA approval confirmed.",
							error: (e) =>
								e instanceof Error
									? e.message
									: "Failed to confirm ABSA approval",
						});
					}}
					trigger={
						<Button
							size="sm"
							variant="secondary"
							disabled={actionLoading !== null || !absaConfirmEnabled}
							className="gap-2 w-full bg-action hover:bg-action/85">
							{actionLoading === "absa-confirm" ? (
								<RiLoader4Line className="h-4 w-4 animate-spin" />
							) : (
								<RiSendPlaneLine className="h-4 w-4" />
							)}
							Confirm ABSA Approved
						</Button>
					}
				/>
			</div>
		</GlassCard>
	);
}
