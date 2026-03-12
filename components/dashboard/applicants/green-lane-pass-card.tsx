"use client";

import { RiCheckLine, RiLoader4Line, RiShieldCheckLine } from "@remixicon/react";
import { toast } from "sonner";
import { GlassCard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import ConfirmActionDrawer from "@/components/shared/confirm-action-drawer";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export interface GreenLaneStatus {
	signedQuotePrerequisite: boolean;
	requested: boolean;
	requestedBy: string | null;
	requestedAt: string | null;
	consumed: boolean;
	consumedAt: string | null;
}

interface GreenLanePassCardProps {
	workflowId: number;
	applicantId: number;
	greenLaneStatus: GreenLaneStatus;
	onSuccess?: () => void;
}

const formatDateTime = (value: string | null) => {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString(undefined, {
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

export default function GreenLanePassCard({
	workflowId,
	applicantId,
	greenLaneStatus,
	onSuccess,
}: GreenLanePassCardProps) {
	const [notes, setNotes] = useState("");
	const [loading, setLoading] = useState(false);

	const canRequest =
		greenLaneStatus.signedQuotePrerequisite &&
		!greenLaneStatus.requested &&
		!greenLaneStatus.consumed;

	const handleRequestGreenLane = async () => {
		setLoading(true);
		try {
			const response = await fetch(`/api/workflows/${workflowId}/green-lane`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ applicantId, notes: notes.trim() || undefined }),
			});

			const data = (await response.json()) as {
				success?: boolean;
				error?: string;
				alreadyRequested?: boolean;
				alreadyConsumed?: boolean;
			};

			if (!response.ok) {
				throw new Error(data.error ?? "Failed to grant Green Lane");
			}

			onSuccess?.();
		} finally {
			setLoading(false);
		}
	};

	const statusMessage = (() => {
		if (!greenLaneStatus.signedQuotePrerequisite) {
			return "Available after the quote has been signed.";
		}
		if (greenLaneStatus.consumed) {
			return "Already consumed by system Green Lane bypass.";
		}
		if (greenLaneStatus.requested) {
			return `Already granted by ${greenLaneStatus.requestedBy ?? "staff"} at ${formatDateTime(greenLaneStatus.requestedAt)}.`;
		}
		return null;
	})();

	return (
		<GlassCard className="border-l-4 border-l-emerald-500">
			<h4 className="flex items-center gap-2 text-emerald-600 font-bold mb-2">
				<RiShieldCheckLine className="h-5 w-5" />
				Manual Green Lane Pass
			</h4>
			<p className="text-sm text-muted-foreground mb-4">
				Grant Green Lane to bypass Stage 4 risk review. Same path as automatic Green Lane.
			</p>

			{statusMessage && (
				<p className="text-sm text-muted-foreground mb-4">{statusMessage}</p>
			)}

			{canRequest && (
				<>
					<Textarea
						value={notes}
						onChange={e => setNotes(e.target.value)}
						placeholder="Optional notes for audit trail"
						className="min-h-[72px] mb-3"
						disabled={loading}
					/>
					<ConfirmActionDrawer
						disabled={loading}
						isLoading={loading}
						title="Grant Green Lane?"
						description="This will bypass Stage 4 risk review. The workflow will proceed to Stage 5 without Risk Manager review. Are you sure?"
						confirmLabel="Yes, grant Green Lane"
						cancelLabel="No, cancel"
						onConfirm={async () => {
							await toast.promise(handleRequestGreenLane(), {
								loading: "Granting Green Lane...",
								success: "Green Lane granted.",
								error: err =>
									err instanceof Error ? err.message : "Failed to grant Green Lane",
							});
						}}
						trigger={
							<Button disabled={loading} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
								{loading ? (
									<RiLoader4Line className="h-4 w-4 animate-spin" />
								) : (
									<RiCheckLine className="h-4 w-4" />
								)}
								Grant Green Lane
							</Button>
						}
					/>
				</>
			)}
		</GlassCard>
	);
}
