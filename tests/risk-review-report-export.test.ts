import { describe, expect, it } from "bun:test";
import { buildReportData } from "../lib/risk-review/build-report-data";
import type { RiskCheckRow } from "../lib/services/risk-check.service";

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

describe("buildReportData — V7 procurement parsing", () => {
	it("returns null procurementData when payload fails V7 schema validation", () => {
		const invalidPayload = JSON.stringify({
			vendorId: "vendor-xyz",
			vendor: { name: "Partial Vendor" }, // missing required V7 fields
			summary: { categories: [] },
			categories: [],
			// missing checkedAt + provider
		});

		const report = buildReportData(
			{
				id: 7,
				companyName: "Partial Vendor",
				tradingName: null,
				registrationNumber: "2010/000001/07",
				contactName: "Jane Doe",
				entityType: "Private Company",
			},
			{ id: 42, applicantId: 7, startedAt: new Date("2026-04-07T10:00:00.000Z") },
			[makeRiskCheck("PROCUREMENT", "completed", "pending", invalidPayload)],
			null,
			null
		);

		expect(report.procurementData).toBeNull();
		expect(report.globalData.entity.registeredAddress).toBe("—");
	});

	it("preserves V7 category structure when payload is valid", () => {
		const validPayload = JSON.stringify({
			vendorId: "vendor-123",
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
						total: 2,
						executed: 2,
						review: 0,
						status: "CLEARED",
					},
					{
						category: "SAFPS",
						outstanding: 0,
						total: 1,
						executed: 1,
						review: 0,
						status: "FLAGGED",
					},
				],
			},
			categories: [
				{
					id: "cipc",
					description: "CIPC checks",
					reviewed: true,
					checks: [
						{ name: "Company status", status: "EXECUTED", result: "CLEARED" },
						{ name: "Directors", status: "EXECUTED", result: "CLEARED" },
					],
				},
				{
					id: "safps",
					description: "SAFPS fraud check",
					reviewed: true,
					checks: [{ name: "Fraud list match", status: "EXECUTED", result: "FLAGGED" }],
				},
			],
			checkedAt: "2026-04-07T10:00:00.000Z",
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
			{ id: 42, applicantId: 7, startedAt: new Date("2026-04-07T10:00:00.000Z") },
			[makeRiskCheck("PROCUREMENT", "completed", "pending", validPayload)],
			null,
			null
		);

		expect(report.procurementData).not.toBeNull();
		expect(report.procurementData?.provider).toBe("procurecheck");
		expect(report.procurementData?.summary.categories).toHaveLength(2);
		expect(report.procurementData?.categories[1]?.checks[0]?.result).toBe("FLAGGED");
		expect(report.globalData.entity.registeredAddress).toBe(
			"1 Main Street, Johannesburg"
		);
	});
});
