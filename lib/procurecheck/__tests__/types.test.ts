import { describe, expect, it } from "bun:test";
import {
	AuthResponseSchema,
	CategoryResultResponseSchema,
	PROCURECHECK_CATEGORY_IDS,
	type ProcurementCategoryId,
	type ProcurementData,
	ProcurementDataSchema,
	VendorCreateResponseSchema,
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
		it("contains exactly 6 category identifiers", () => {
			expect(PROCURECHECK_CATEGORY_IDS).toHaveLength(6);
		});

		it("includes all expected categories", () => {
			const expected: ProcurementCategoryId[] = [
				"cipc",
				"property",
				"restrictedList",
				"legal",
				"safps",
				"persal",
			];
			for (const id of expected) {
				expect(PROCURECHECK_CATEGORY_IDS).toContain(id);
			}
		});
	});
});
