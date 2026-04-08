import { describe, expect, it } from "bun:test";
import { buildReportData } from "../lib/risk-review/build-report-data";
import { getReportExportState } from "../lib/risk-review/export-readiness";
import type { SectionStatus } from "../lib/risk-review/types";
import type { RiskCheckRow } from "../lib/services/risk-check.service";

function makeStatus(
	machineState: SectionStatus["machineState"],
	reviewState: SectionStatus["reviewState"] = "pending"
): SectionStatus {
	return { machineState, reviewState };
}

function makeRiskCheck(
	checkType: string,
	machineState: string,
	reviewState: string,
	payload: string | null = null
): RiskCheckRow {
	return {
		id: 1,
		workflowId: 42,
		applicantId: 7,
		checkType,
		machineState,
		reviewState,
		provider: null,
		externalCheckId: null,
		payload,
		rawPayload: null,
		errorDetails: null,
		startedAt: null,
		completedAt: null,
		reviewedBy: null,
		reviewedAt: null,
		reviewNotes: null,
		createdAt: null,
		updatedAt: null,
	};
}

describe("getReportExportState", () => {
	it("disables export until all sections reach a terminal state", () => {
		const exportState = getReportExportState({
			procurement: makeStatus("completed"),
			itc: makeStatus("pending"),
			sanctions: makeStatus("in_progress"),
			fica: makeStatus("manual_required"),
		});

		expect(exportState.canExport).toBe(false);
		expect(exportState.hasPendingSections).toBe(true);
		expect(exportState.pendingSections).toEqual(["ITC Credit", "Sanctions & AML"]);
	});

	it("allows export for degraded but terminal workflows", () => {
		const exportState = getReportExportState({
			procurement: makeStatus("completed"),
			itc: makeStatus("failed"),
			sanctions: makeStatus("manual_required"),
			fica: makeStatus("completed", "approved"),
		});

		expect(exportState.canExport).toBe(true);
		expect(exportState.hasPendingSections).toBe(false);
		expect(exportState.hasDegradedSections).toBe(true);
		expect(exportState.degradedSections).toEqual(["ITC Credit", "Sanctions & AML"]);
	});
});

describe("buildReportData", () => {
	it("uses assessment summary fields and procurement address in global data", () => {
		const procurementPayload = JSON.stringify({
			vendorId: "vendor-1",
			vendor: {
				name: "Acme Supplies",
				entityNumber: "2010/000001/07",
				entityType: "Private Company",
				entityStatus: "Active",
				startDate: "2020-01-01",
				registrationDate: "2020-01-01",
				taxNumber: "1234567890",
				withdrawFromPublic: "No",
				postalAddress: "PO Box 1",
				registeredAddress: "1 Main Street, Johannesburg",
			},
			summary: {
				categories: [
					{
						category: "CIPC",
						outstanding: 0,
						total: 1,
						executed: 1,
						review: 0,
						status: "CLEARED",
					},
				],
			},
			categories: [
				{
					id: "cipc",
					description: "CIPC checks",
					reviewed: true,
					checks: [{ name: "Company status", status: "EXECUTED", result: "CLEARED" }],
				},
			],
			checkedAt: "2026-04-04T10:00:00.000Z",
			provider: "procurecheck",
		});

		const report = buildReportData(
			{
				id: 7,
				companyName: "Acme Supplies",
				tradingName: "Acme",
				registrationNumber: "2010/000001/07",
				contactName: "Jane Doe",
				entityType: "Private Company",
			},
			{ id: 42, applicantId: 7, startedAt: new Date("2026-04-04T10:00:00.000Z") },
			[
				makeRiskCheck("PROCUREMENT", "completed", "pending", procurementPayload),
				makeRiskCheck("ITC", "completed", "pending"),
				makeRiskCheck("SANCTIONS", "completed", "pending"),
				makeRiskCheck("FICA", "completed", "pending"),
			],
			null,
			{
				overallScore: 74,
				overallStatus: "REVIEW REQUIRED",
				aiAnalysis: null,
			}
		);

		expect(report.globalData.overallRiskScore).toBe(74);
		expect(report.globalData.overallStatus).toBe("REVIEW REQUIRED");
		expect(report.globalData.entity.registeredAddress).toBe(
			"1 Main Street, Johannesburg"
		);
	});

	it("falls back to reporter ai analysis when assessment summary columns are absent", () => {
		const report = buildReportData(
			{
				id: 7,
				companyName: "Acme Supplies",
				tradingName: null,
				registrationNumber: "2010/000001/07",
				contactName: "Jane Doe",
				entityType: "Private Company",
			},
			{ id: 42, applicantId: 7, startedAt: new Date("2026-04-04T10:00:00.000Z") },
			[],
			null,
			{
				overallScore: null,
				overallStatus: null,
				aiAnalysis: JSON.stringify({
					scores: { aggregatedScore: 81 },
					recommendation: "COMPLIANT",
				}),
			}
		);

		expect(report.globalData.overallRiskScore).toBe(81);
		expect(report.globalData.overallStatus).toBe("COMPLIANT");
	});
});
