import type { RiskReviewData, SectionStatus } from "@/lib/risk-review/types";

const TERMINAL_MACHINE_STATES = new Set<SectionStatus["machineState"]>([
	"completed",
	"failed",
	"manual_required",
]);

type SectionKey = keyof NonNullable<RiskReviewData["sectionStatuses"]>;

const SECTION_LABELS: Record<SectionKey, string> = {
	procurement: "Procurement",
	itc: "ITC Credit",
	sanctions: "Sanctions & AML",
	fica: "FICA / KYC",
};

const CREDIT_COMPLIANCE_KEYS: readonly SectionKey[] = ["itc", "sanctions", "fica"];
const PROCUREMENT_KEYS: readonly SectionKey[] = ["procurement"];

export interface ReportExportState {
	canExport: boolean;
	hasPendingSections: boolean;
	hasDegradedSections: boolean;
	pendingSections: string[];
	degradedSections: string[];
}

export function isTerminalMachineState(
	machineState: SectionStatus["machineState"]
): boolean {
	return TERMINAL_MACHINE_STATES.has(machineState);
}

function isPendingStatus(
	status: SectionStatus | undefined
): status is undefined | SectionStatus {
	if (!status) return true;
	return !isTerminalMachineState(status.machineState);
}

function computeExportState(
	sectionStatuses: RiskReviewData["sectionStatuses"] | undefined,
	keys: readonly SectionKey[]
): ReportExportState {
	const sections = keys.map(key => ({
		key,
		label: SECTION_LABELS[key],
		status: sectionStatuses?.[key],
	}));

	const pendingSections = sections
		.filter(({ status }) => isPendingStatus(status))
		.map(({ label }) => label);

	const degradedSections = sections
		.filter(
			({ status }) =>
				status?.machineState === "failed" || status?.machineState === "manual_required"
		)
		.map(({ label }) => label);

	return {
		canExport: pendingSections.length === 0,
		hasPendingSections: pendingSections.length > 0,
		hasDegradedSections: degradedSections.length > 0,
		pendingSections,
		degradedSections,
	};
}

/** Credit & compliance PDF (ITC, sanctions, FICA) — not gated by procurement. */
export function getCreditComplianceExportState(
	sectionStatuses?: RiskReviewData["sectionStatuses"]
): ReportExportState {
	return computeExportState(sectionStatuses, CREDIT_COMPLIANCE_KEYS);
}

/** Procurement Checks PDF — only the procurement section gates export. */
export function getProcurementExportState(
	sectionStatuses?: RiskReviewData["sectionStatuses"]
): ReportExportState {
	return computeExportState(sectionStatuses, PROCUREMENT_KEYS);
}
