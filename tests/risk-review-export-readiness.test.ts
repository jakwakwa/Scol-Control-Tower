import { describe, expect, it } from "bun:test";
import {
	getCreditComplianceExportState,
	getProcurementExportState,
} from "../lib/risk-review/export-readiness";
import type { SectionStatus } from "../lib/risk-review/types";

function makeStatus(
	machineState: SectionStatus["machineState"],
	reviewState: SectionStatus["reviewState"] = "pending"
): SectionStatus {
	return { machineState, reviewState };
}

describe("getCreditComplianceExportState", () => {
	it("ignores procurement status entirely", () => {
		const state = getCreditComplianceExportState({
			procurement: makeStatus("pending"),
			itc: makeStatus("completed"),
			sanctions: makeStatus("completed"),
			fica: makeStatus("completed"),
		});

		expect(state.canExport).toBe(true);
		expect(state.pendingSections).toEqual([]);
		expect(state.hasPendingSections).toBe(false);
	});

	it("blocks export while any credit/compliance section is non-terminal", () => {
		const state = getCreditComplianceExportState({
			procurement: makeStatus("completed"),
			itc: makeStatus("in_progress"),
			sanctions: makeStatus("pending"),
			fica: makeStatus("completed"),
		});

		expect(state.canExport).toBe(false);
		expect(state.pendingSections).toEqual(["ITC Credit", "Sanctions & AML"]);
	});

	it("allows export with degraded but terminal credit/compliance sections", () => {
		const state = getCreditComplianceExportState({
			procurement: makeStatus("completed"),
			itc: makeStatus("failed"),
			sanctions: makeStatus("manual_required"),
			fica: makeStatus("completed", "approved"),
		});

		expect(state.canExport).toBe(true);
		expect(state.hasDegradedSections).toBe(true);
		expect(state.degradedSections).toEqual(["ITC Credit", "Sanctions & AML"]);
	});

	it("treats missing sectionStatuses as fully pending (cannot export)", () => {
		const state = getCreditComplianceExportState(undefined);
		expect(state.canExport).toBe(false);
		expect(state.pendingSections).toEqual([
			"ITC Credit",
			"Sanctions & AML",
			"FICA / KYC",
		]);
	});
});

describe("getProcurementExportState", () => {
	it("allows procurement export when procurement machine state is terminal", () => {
		const state = getProcurementExportState({
			procurement: makeStatus("completed"),
			itc: makeStatus("pending"),
			sanctions: makeStatus("pending"),
			fica: makeStatus("pending"),
		});

		expect(state.canExport).toBe(true);
		expect(state.pendingSections).toEqual([]);
	});

	it("blocks procurement export while procurement is in progress", () => {
		const state = getProcurementExportState({
			procurement: makeStatus("in_progress"),
			itc: makeStatus("completed"),
			sanctions: makeStatus("completed"),
			fica: makeStatus("completed"),
		});

		expect(state.canExport).toBe(false);
		expect(state.pendingSections).toEqual(["Procurement"]);
	});

	it("allows procurement export when terminal but degraded (manual_required)", () => {
		const state = getProcurementExportState({
			procurement: makeStatus("manual_required"),
			itc: makeStatus("pending"),
			sanctions: makeStatus("pending"),
			fica: makeStatus("pending"),
		});

		expect(state.canExport).toBe(true);
		expect(state.hasDegradedSections).toBe(true);
		expect(state.degradedSections).toEqual(["Procurement"]);
	});

	it("treats missing sectionStatuses as pending (cannot export)", () => {
		const state = getProcurementExportState(undefined);
		expect(state.canExport).toBe(false);
		expect(state.pendingSections).toEqual(["Procurement"]);
	});
});
