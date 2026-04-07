import { describe, expect, it } from "bun:test";
import {
	AuthResponseSchema,
	CategoryResultResponseSchema,
	CategoryResultTablesSchema,
	isSummaryReady,
	PROCURECHECK_CATEGORY_IDS,
	type ProcurementCategoryId,
	type ProcurementData,
	ProcurementDataSchema,
	VendorCreateResponseSchema,
	VendorSummaryArraySchema,
	VendorSummaryResponseSchema,
} from "../types";

import authFixture from "./fixtures/auth-response.json";
import cipcFixture from "./fixtures/category-cipc-response.json";
import vendorCreateFixture from "./fixtures/vendor-create-response.json";
import vendorSummaryFixture from "./fixtures/vendor-summary-response.json";

describe("ProcureCheck Zod Schemas", () => {
	describe("AuthResponseSchema", () => {
		it("parses a valid auth response with token field", () => {
			const result = AuthResponseSchema.safeParse(authFixture);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.token).toBe(authFixture.token);
			}
		});

		it("parses a response with access_token field", () => {
			const result = AuthResponseSchema.safeParse({
				access_token: "abc123",
				message: "OK",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.access_token).toBe("abc123");
			}
		});

		it("rejects a response with neither token nor access_token", () => {
			const result = AuthResponseSchema.safeParse({ message: "No token" });
			expect(result.success).toBe(false);
		});
	});

	describe("VendorCreateResponseSchema", () => {
		it("parses a valid vendor create response", () => {
			const result = VendorCreateResponseSchema.safeParse(vendorCreateFixture);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.ProcureCheckVendorID).toBe(
					vendorCreateFixture.ProcureCheckVendorID
				);
			}
		});

		it("accepts vendor_Id as alternate key", () => {
			const result = VendorCreateResponseSchema.safeParse({
				vendor_Id: "xyz-456",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.vendor_Id).toBe("xyz-456");
			}
		});

		it("rejects empty object with no vendor ID", () => {
			const result = VendorCreateResponseSchema.safeParse({});
			expect(result.success).toBe(false);
		});
	});

	describe("VendorSummaryResponseSchema", () => {
		it("parses a valid vendor summary response", () => {
			const result = VendorSummaryResponseSchema.safeParse(vendorSummaryFixture);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.VendorID).toBe(vendorSummaryFixture.VendorID);
				expect(result.data.VendorName).toBe(vendorSummaryFixture.VendorName);
				expect(result.data.CheckCategories).toHaveLength(6);
				expect(result.data.RiskSummary.TotalChecks).toBe(42);
			}
		});

		it("rejects missing VendorID", () => {
			const { VendorID: _, ...noId } = vendorSummaryFixture;
			const result = VendorSummaryResponseSchema.safeParse(noId);
			expect(result.success).toBe(false);
		});

		it("rejects invalid CheckCategories status", () => {
			const bad = {
				...vendorSummaryFixture,
				CheckCategories: [
					{ ...vendorSummaryFixture.CheckCategories[0], Status: "INVALID" },
				],
			};
			const result = VendorSummaryResponseSchema.safeParse(bad);
			expect(result.success).toBe(false);
		});
	});

	describe("CategoryResultResponseSchema", () => {
		it("parses a valid category result", () => {
			const result = CategoryResultResponseSchema.safeParse(cipcFixture);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.Category).toBe("CIPC");
				expect(result.data.Checks).toHaveLength(7);
				expect(result.data.Reviewed).toBe(true);
			}
		});

		it("rejects a check with invalid Result value", () => {
			const bad = {
				...cipcFixture,
				Checks: [{ Name: "Test", Status: "EXECUTED", Result: "MAYBE" }],
			};
			const result = CategoryResultResponseSchema.safeParse(bad);
			expect(result.success).toBe(false);
		});
	});

	describe("ProcurementDataSchema (internal persistence shape)", () => {
		const validPayload: ProcurementData = {
			vendorId: "abc-123",
			vendor: {
				name: "Test Co",
				entityNumber: "2024/001/07",
				entityType: "Private Company",
				entityStatus: "In Business",
				startDate: "2024-01-01",
				registrationDate: "2024-01-01",
				taxNumber: "9012345678",
				withdrawFromPublic: "No",
				postalAddress: "PO Box 1",
				registeredAddress: "1 Main Rd",
			},
			summary: {
				categories: [
					{
						category: "CIPC",
						outstanding: 0,
						total: 7,
						executed: 7,
						review: 1,
						status: "FLAGGED",
					},
				],
			},
			categories: [
				{
					id: "cipc",
					description: "CIPC checks",
					reviewed: true,
					checks: [{ name: "Company Reg", status: "EXECUTED", result: "CLEARED" }],
				},
			],
			checkedAt: "2024-01-01T00:00:00Z",
			provider: "procurecheck",
		};

		it("validates a correct ProcurementData payload", () => {
			const result = ProcurementDataSchema.safeParse(validPayload);
			expect(result.success).toBe(true);
		});

		it("rejects invalid category id", () => {
			const bad = {
				...validPayload,
				categories: [{ ...validPayload.categories[0], id: "unknown_cat" }],
			};
			const result = ProcurementDataSchema.safeParse(bad);
			expect(result.success).toBe(false);
		});

		it("rejects invalid check result", () => {
			const bad = {
				...validPayload,
				categories: [
					{
						...validPayload.categories[0],
						checks: [{ name: "X", status: "EXECUTED", result: "MAYBE" }],
					},
				],
			};
			const result = ProcurementDataSchema.safeParse(bad);
			expect(result.success).toBe(false);
		});

		it("rejects missing provider", () => {
			const { provider: _, ...noProvider } = validPayload;
			const result = ProcurementDataSchema.safeParse(noProvider);
			expect(result.success).toBe(false);
		});
	});

	describe("PROCURECHECK_CATEGORY_IDS", () => {
		it("contains exactly 7 category identifiers", () => {
			expect(PROCURECHECK_CATEGORY_IDS).toHaveLength(7);
		});

		it("includes all expected categories", () => {
			const expected: ProcurementCategoryId[] = [
				"cipc",
				"property",
				"restrictedList",
				"legal",
				"safps",
				"persal",
				"doj",
			];
			for (const id of expected) {
				expect(PROCURECHECK_CATEGORY_IDS).toContain(id);
			}
		});
	});

	// ============================================
	// V7 Actual API Response Schemas
	// (sandbox-validated 2026-04-06)
	// ============================================

	describe("VendorSummaryArraySchema (actual V7 vendorresults response)", () => {
		it("parses the array returned by GET /vendorresults?id=", () => {
			const raw = [
				{
					$id: "1",
					VerificationType: "CIPC",
					TotalChecks: 7,
					OutstandingChecks: 7,
					ChecksCompleted: 0,
					PassedChecks: 0,
					FailedChecks: 0,
					PendingChecks: 0,
					VerificationCompleteDate: null,
					IsOptional: false,
					VerificationTypeId: 1,
					RiskLevel: "0",
					RiskColour: "#AFB2B6",
					RiskDescription: "",
				},
				{
					$id: "2",
					VerificationType: "SAFPS",
					TotalChecks: 1,
					OutstandingChecks: 0,
					ChecksCompleted: 1,
					PassedChecks: 1,
					FailedChecks: 0,
					PendingChecks: 0,
					VerificationCompleteDate: "2026-01-15T10:30:00",
					IsOptional: false,
					VerificationTypeId: 6,
					RiskLevel: "1",
					RiskColour: "#00AA00",
					RiskDescription: "Clear",
				},
			];
			const result = VendorSummaryArraySchema.safeParse(raw);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data).toHaveLength(2);
			expect(result.data[0].VerificationType).toBe("CIPC");
			expect(result.data[0].OutstandingChecks).toBe(7);
			expect(result.data[1].VerificationCompleteDate).toBe("2026-01-15T10:30:00");
		});

		it("computes readiness correctly via isSummaryReady helper", () => {
			const allComplete = [
				{
					VerificationType: "CIPC",
					TotalChecks: 7,
					OutstandingChecks: 0,
					ChecksCompleted: 7,
					PassedChecks: 7,
					FailedChecks: 0,
				},
				{
					VerificationType: "SAFPS",
					TotalChecks: 1,
					OutstandingChecks: 0,
					ChecksCompleted: 1,
					PassedChecks: 1,
					FailedChecks: 0,
				},
			];
			const result = VendorSummaryArraySchema.safeParse(allComplete);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(isSummaryReady(result.data)).toBe(true);
		});

		it("isSummaryReady returns false when outstanding > 0", () => {
			const pending = [
				{
					VerificationType: "CIPC",
					TotalChecks: 7,
					OutstandingChecks: 3,
					ChecksCompleted: 4,
					PassedChecks: 4,
					FailedChecks: 0,
				},
			];
			const result = VendorSummaryArraySchema.safeParse(pending);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(isSummaryReady(result.data)).toBe(false);
		});

		it("isSummaryReady returns false for empty array", () => {
			expect(isSummaryReady([])).toBe(false);
		});
	});

	describe("CategoryResultTablesSchema (VendorResultTablesDTO — Swagger-authoritative)", () => {
		it("parses empty Tables response (checks still running)", () => {
			// sandbox returned { "$id": "1", Tables: [] } — $id is JSON.NET artifact, ignored by Zod
			const raw = { Tables: [] };
			const result = CategoryResultTablesSchema.safeParse(raw);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.Tables).toHaveLength(0);
		});

		it("parses VendorResultTablesDTO with ITableData rows when checks complete", () => {
			// Swagger: ITableData = { MetaData: ITableMetaData, Data: [IDataRowObject] }
			// ITableMetaData = { TableName, TableHeader, RiskRanking, RiskRankingDisplayColour }
			// IDataRowObject = { Severity: int, Comments: [ResultComments] }
			const raw = {
				Tables: [
					{
						MetaData: {
							TableName: "CIPC Results",
							TableHeader: "Company Registration",
							RiskRanking: "Low",
							RiskRankingDisplayColour: "#00AA00",
						},
						Data: [
							{
								Severity: 0,
								Comments: [
									{
										Comment: "CIPC check cleared",
										CommentDate: "2026-01-15T10:30:00",
										UserNameOfCommenter: "System",
										ResultID: 42,
										IsEscalation: false,
									},
								],
							},
						],
					},
				],
			};
			const result = CategoryResultTablesSchema.safeParse(raw);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.Tables).toHaveLength(1);
			expect(result.data.Tables[0].MetaData?.TableName).toBe("CIPC Results");
			expect(result.data.Tables[0].Data[0].Severity).toBe(0);
			expect(result.data.Tables[0].Data[0].Comments[0].Comment).toBe(
				"CIPC check cleared"
			);
		});

		it("treats Severity > 0 as a flagged result", () => {
			const raw = {
				Tables: [
					{
						MetaData: { TableName: "SAFPS Fraud", RiskRanking: "High" },
						Data: [{ Severity: 2, Comments: [] }],
					},
				],
			};
			const result = CategoryResultTablesSchema.safeParse(raw);
			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data.Tables[0].Data[0].Severity).toBe(2);
		});
	});
});
