import type { RiskReviewData, SectionStatus } from "@/lib/risk-review/types";

const TERMINAL_MACHINE_STATES = new Set<SectionStatus["machineState"]>([
	"completed",
	"failed",
	"manual_required",
]);

const SECTION_LABELS: Record<
	keyof NonNullable<RiskReviewData["sectionStatuses"]>,
	string
> = {
	procurement: "Procurement",
	itc: "ITC Credit",
	sanctions: "Sanctions & AML",
	fica: "FICA / KYC",
};

export function isTerminalMachineState(
	machineState: SectionStatus["machineState"]
): boolean {
	return TERMINAL_MACHINE_STATES.has(machineState);
}

export function getReportExportState(
	sectionStatuses?: RiskReviewData["sectionStatuses"]
) {
	const sections = (
		Object.entries(sectionStatuses ?? {}) as Array<
			[keyof NonNullable<RiskReviewData["sectionStatuses"]>, SectionStatus]
		>
	).map(([key, status]) => ({
		key,
		label: SECTION_LABELS[key],
		status,
	}));

	const pendingSections = sections
		.filter(({ status }) => !isTerminalMachineState(status.machineState))
		.map(({ label }) => label);
	const degradedSections = sections
		.filter(
			({ status }) =>
				status.machineState === "failed" || status.machineState === "manual_required"
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
