import { MACHINE_STATE_CONFIG, REVIEW_STATE_CONFIG } from "@/components/dashboard/risk-review/risk-review-config";
import type { SectionStatus } from "@/lib/risk-review/types";

export function SectionStatusBanner({ status, label }: { status?: SectionStatus; label: string }) {
	if (!status || (status.machineState === "completed" && status.reviewState !== "pending")) {
		return null;
	}

	const machineConfig = MACHINE_STATE_CONFIG[status.machineState];
	const reviewConfig = REVIEW_STATE_CONFIG[status.reviewState];
	const isTerminal = ["completed", "failed", "manual_required"].includes(status.machineState);

	return (
		<div
			className={`flex flex-wrap items-center gap-3 px-4 py-3 mb-4 rounded-lg border text-sm ${
				status.machineState === "failed"
					? "bg-destructive/10 border-destructive/20"
					: status.machineState === "manual_required"
						? "bg-warning border-warning/90"
						: status.machineState === "in_progress"
							? "bg-primary/5 border-primary/20"
							: "bg-muted/30 border-border"
			}`}>
				
			<span className="font-medium text-foreground">
				{machineConfig.icon} {label} 
			</span>
			{/* {isTerminal && status.reviewState !== "not_required" && (
				<span className="text-muted-foreground">| Review: {reviewConfig.label}</span>
			)} */}
			{/* {status.provider && (
				<span className="text-xs text-muted-foreground">Provider: {status.provider}</span>
			)} */}
			{/* {status.errorDetails && (
				<span className="text-xs text-destructive-foreground">{status.errorDetails}</span>
			)} */}
		</div>
	);
}
