import type { SectionStatus } from "@/lib/risk-review/types";

export type PrimaryRiskTabId = "procurement" | "itc" | "sanctions" | "fica";

export const PRIMARY_RISK_TABS: Array<{
	id: PrimaryRiskTabId;
	label: string;
	subtitle: string;
}> = [
	{ id: "procurement", label: "Procurement", subtitle: "Compliance & Conflicts" },
	{ id: "itc", label: "ITC Credit", subtitle: "Commercial & Defaults" },
	{ id: "sanctions", label: "Sanctions & AML", subtitle: "WorldCheck & Media" },
	{ id: "fica", label: "FICA / KYC", subtitle: "Identity & Banking" },
];

export const MACHINE_STATE_CONFIG: Record<
	SectionStatus["machineState"],
	{ label: string; icon: string }
> = {
	pending: { label: "Pending", icon: "⏳" },
	in_progress: { label: "In Progress", icon: "⟳" },
	completed: { label: "Complete", icon: "✓" },
	failed: { label: "Failed", icon: "✗" },
	manual_required: { label: "Manual Review Required", icon: "⚠" },
};

export const REVIEW_STATE_CONFIG: Record<SectionStatus["reviewState"], { label: string }> = {
	pending: { label: "Awaiting Review" },
	acknowledged: { label: "Acknowledged" },
	approved: { label: "Approved" },
	rejected: { label: "Rejected" },
	not_required: { label: "N/A" },
};
