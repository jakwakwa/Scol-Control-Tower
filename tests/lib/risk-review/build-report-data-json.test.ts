import { describe, expect, test } from "bun:test";
import { buildReportData, parseReportJsonObject } from "@/lib/risk-review/build-report-data";
import type { RiskCheckRow } from "@/lib/services/risk-check.service";

function ficaRow(payload: string | null): RiskCheckRow {
	const now = new Date();
	return {
		id: 1,
		workflowId: 10,
		applicantId: 1,
		checkType: "FICA",
		machineState: "pending",
		reviewState: "pending",
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
		createdAt: now,
		updatedAt: now,
	};
}

describe("parseReportJsonObject", () => {
	test("returns null for invalid JSON", () => {
		expect(parseReportJsonObject("{not json")).toBeNull();
	});

	test("returns null for non-object root", () => {
		expect(parseReportJsonObject('"hello"')).toBeNull();
		expect(parseReportJsonObject("[1,2]")).toBeNull();
	});

	test("returns plain object for valid object JSON", () => {
		expect(parseReportJsonObject('{"a":1}')).toEqual({ a: 1 });
	});
});

describe("buildReportData JSON tolerance", () => {
	test("malformed FICA payload does not throw", () => {
		const data = buildReportData(
			{
				id: 1,
				companyName: "X",
				tradingName: null,
				registrationNumber: null,
				contactName: "c",
				entityType: null,
			},
			{ id: 10, applicantId: 1, startedAt: new Date() },
			[ficaRow("{bogus")]
		);
		expect(data.ficaData.identity).toEqual([]);
		expect(data.ficaData.vatVerification?.status ?? "not_checked").toBe("not_checked");
	});
});
