import { describe, it, expect, beforeEach } from "bun:test";
import { mapVendorResultsToPayload } from "../mapper";
import type {
	VendorSummaryResponse,
	CategoryResultResponse,
	ApiCategoryEndpoint,
	ProcurementData,
} from "../types";

import summaryFixture from "./fixtures/vendor-summary-response.json";
import cipcFixture from "./fixtures/category-cipc-response.json";
import propertyFixture from "./fixtures/category-property-response.json";
import nonpreferredFixture from "./fixtures/category-nonpreferred-response.json";
import judgementFixture from "./fixtures/category-judgement-response.json";
import safpsFixture from "./fixtures/category-safps-response.json";
import persalFixture from "./fixtures/category-persal-response.json";

const VENDOR_ID = "vendor-test-123";

function buildCategoryResults(): Map<ApiCategoryEndpoint, CategoryResultResponse> {
	const map = new Map<ApiCategoryEndpoint, CategoryResultResponse>();
	map.set("cipc", cipcFixture as CategoryResultResponse);
	map.set("property", propertyFixture as CategoryResultResponse);
	map.set("nonpreferred", nonpreferredFixture as CategoryResultResponse);
	map.set("judgement", judgementFixture as CategoryResultResponse);
	map.set("safps", safpsFixture as CategoryResultResponse);
	map.set("persal", persalFixture as CategoryResultResponse);
	return map;
}

describe("mapVendorResultsToPayload", () => {
	let result: ProcurementData;

	beforeEach(() => {
		result = mapVendorResultsToPayload(
			summaryFixture as VendorSummaryResponse,
			buildCategoryResults(),
			VENDOR_ID,
		);
	});

	it("sets vendorId from the provided argument", () => {
		expect(result.vendorId).toBe(VENDOR_ID);
	});

	it("sets provider to 'procurecheck'", () => {
		expect(result.provider).toBe("procurecheck");
	});

	it("sets checkedAt to a valid ISO timestamp", () => {
		expect(result.checkedAt).toBeTruthy();
		expect(() => new Date(result.checkedAt).toISOString()).not.toThrow();
	});

	describe("vendor detail mapping", () => {
		it("maps VendorName to name", () => {
			expect(result.vendor.name).toBe("Test Company (Pty) Ltd");
		});

		it("maps EntityNumber to entityNumber", () => {
			expect(result.vendor.entityNumber).toBe("2024/123456/07");
		});

		it("maps EntityType to entityType", () => {
			expect(result.vendor.entityType).toBe("Private Company");
		});

		it("maps EntityStatus to entityStatus", () => {
			expect(result.vendor.entityStatus).toBe("In Business");
		});

		it("maps StartDate to startDate", () => {
			expect(result.vendor.startDate).toBe("2024-01-15");
		});

		it("maps RegistrationDate to registrationDate", () => {
			expect(result.vendor.registrationDate).toBe("2024-01-10");
		});

		it("maps TaxNumber to taxNumber", () => {
			expect(result.vendor.taxNumber).toBe("9012345678");
		});

		it("maps WithdrawFromPublic to withdrawFromPublic", () => {
			expect(result.vendor.withdrawFromPublic).toBe("No");
		});

		it("maps PostalAddress to postalAddress", () => {
			expect(result.vendor.postalAddress).toBe("PO Box 12345, Sandton, 2146");
		});

		it("maps RegisteredAddress to registeredAddress", () => {
			expect(result.vendor.registeredAddress).toBe(
				"100 West Street, Sandton, Johannesburg, 2196",
			);
		});
	});

	describe("summary.categories mapping", () => {
		it("maps all CheckCategories to summary.categories", () => {
			expect(result.summary.categories).toHaveLength(6);
		});

		it("lowercases Category to category", () => {
			const cipcSummary = result.summary.categories.find(
				(c) => c.category === "CIPC",
			);
			expect(cipcSummary).toBeDefined();
			expect(cipcSummary!.total).toBe(7);
			expect(cipcSummary!.executed).toBe(7);
			expect(cipcSummary!.outstanding).toBe(0);
			expect(cipcSummary!.review).toBe(1);
			expect(cipcSummary!.status).toBe("FLAGGED");
		});

		it("maps each category summary with correct fields", () => {
			const legalSummary = result.summary.categories.find(
				(c) => c.category === "Legal Matter",
			);
			expect(legalSummary).toBeDefined();
			expect(legalSummary!.total).toBe(10);
			expect(legalSummary!.executed).toBe(8);
			expect(legalSummary!.outstanding).toBe(2);
			expect(legalSummary!.review).toBe(1);
			expect(legalSummary!.status).toBe("FLAGGED");
		});
	});

	describe("category mapping from API endpoints to internal IDs", () => {
		it("maps cipc -> cipc", () => {
			const cat = result.categories.find((c) => c.id === "cipc");
			expect(cat).toBeDefined();
		});

		it("maps property -> property", () => {
			const cat = result.categories.find((c) => c.id === "property");
			expect(cat).toBeDefined();
		});

		it("maps nonpreferred -> restrictedList", () => {
			const cat = result.categories.find((c) => c.id === "restrictedList");
			expect(cat).toBeDefined();
		});

		it("maps judgement -> legal", () => {
			const cat = result.categories.find((c) => c.id === "legal");
			expect(cat).toBeDefined();
		});

		it("maps safps -> safps", () => {
			const cat = result.categories.find((c) => c.id === "safps");
			expect(cat).toBeDefined();
		});

		it("maps persal -> persal", () => {
			const cat = result.categories.find((c) => c.id === "persal");
			expect(cat).toBeDefined();
		});

		it("produces exactly 6 categories", () => {
			expect(result.categories).toHaveLength(6);
		});
	});

	describe("check items mapping", () => {
		it("maps Name to name, Status to status, Result to result", () => {
			const cipc = result.categories.find((c) => c.id === "cipc")!;
			expect(cipc.checks).toHaveLength(7);

			const firstCheck = cipc.checks[0];
			expect(firstCheck.name).toBe("Company Registration Verified");
			expect(firstCheck.status).toBe("EXECUTED");
			expect(firstCheck.result).toBe("CLEARED");
		});

		it("preserves FLAGGED results", () => {
			const cipc = result.categories.find((c) => c.id === "cipc")!;
			const flagged = cipc.checks.find(
				(c) => c.name === "Director Deregistered Company Check",
			);
			expect(flagged).toBeDefined();
			expect(flagged!.result).toBe("FLAGGED");
		});

		it("preserves PENDING status and UNKNOWN result", () => {
			const legal = result.categories.find((c) => c.id === "legal")!;
			const pending = legal.checks.find(
				(c) => c.name === "Director Disqualification",
			);
			expect(pending).toBeDefined();
			expect(pending!.status).toBe("PENDING");
			expect(pending!.result).toBe("UNKNOWN");
		});

		it("maps category description and reviewed flag", () => {
			const cipc = result.categories.find((c) => c.id === "cipc")!;
			expect(cipc.description).toBe(
				"Companies and Intellectual Property Commission verification checks",
			);
			expect(cipc.reviewed).toBe(true);

			const legal = result.categories.find((c) => c.id === "legal")!;
			expect(legal.reviewed).toBe(false);
		});
	});

	describe("edge cases", () => {
		it("defaults missing optional summary fields to empty strings", () => {
			const minimalSummary: VendorSummaryResponse = {
				VendorID: "v1",
				VendorName: "Minimal Corp",
				EntityNumber: "",
				EntityType: "",
				EntityStatus: "",
				StartDate: "",
				RegistrationDate: "",
				TaxNumber: "",
				WithdrawFromPublic: "",
				PostalAddress: "",
				RegisteredAddress: "",
				RiskSummary: {
					TotalChecks: 0,
					ExecutedChecks: 0,
					OutstandingChecks: 0,
					FailedChecks: 0,
					ReviewChecks: 0,
				},
				CheckCategories: [],
			};
			const empty = new Map<ApiCategoryEndpoint, CategoryResultResponse>();
			const mapped = mapVendorResultsToPayload(minimalSummary, empty, "v1");

			expect(mapped.vendor.entityNumber).toBe("");
			expect(mapped.vendor.taxNumber).toBe("");
			expect(mapped.vendor.postalAddress).toBe("");
		});

		it("handles empty CheckCategories array", () => {
			const summaryNoCategories: VendorSummaryResponse = {
				...(summaryFixture as VendorSummaryResponse),
				CheckCategories: [],
			};
			const empty = new Map<ApiCategoryEndpoint, CategoryResultResponse>();
			const mapped = mapVendorResultsToPayload(
				summaryNoCategories,
				empty,
				VENDOR_ID,
			);

			expect(mapped.summary.categories).toEqual([]);
			expect(mapped.categories).toEqual([]);
		});

		it("handles a category result with empty checks array", () => {
			const emptyChecksResult: CategoryResultResponse = {
				Category: "CIPC",
				Description: "Empty",
				Reviewed: false,
				Checks: [],
			};
			const map = new Map<ApiCategoryEndpoint, CategoryResultResponse>();
			map.set("cipc", emptyChecksResult);

			const mapped = mapVendorResultsToPayload(
				summaryFixture as VendorSummaryResponse,
				map,
				VENDOR_ID,
			);

			const cipc = mapped.categories.find((c) => c.id === "cipc");
			expect(cipc).toBeDefined();
			expect(cipc!.checks).toEqual([]);
		});

		it("skips category endpoints not present in the results map", () => {
			const partialMap = new Map<ApiCategoryEndpoint, CategoryResultResponse>();
			partialMap.set("cipc", cipcFixture as CategoryResultResponse);

			const mapped = mapVendorResultsToPayload(
				summaryFixture as VendorSummaryResponse,
				partialMap,
				VENDOR_ID,
			);

			expect(mapped.categories).toHaveLength(1);
			expect(mapped.categories[0].id).toBe("cipc");
		});
	});
});
