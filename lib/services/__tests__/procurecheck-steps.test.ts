import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const mockAuthenticate = mock(() => Promise.resolve("mock-token"));
const mockCreateVendor = mock(() => Promise.resolve("vendor-123"));
const mockFindVendorByExternalId = mock(() => Promise.resolve(null));
const mockGetRuntimeConfig = mock(() => ({
	environment: "sandbox" as const,
	baseUrl: "https://xdev.procurecheck.co.za/api/api/v1/",
	egressOwner: "test",
}));

class MockVendorAlreadyExistsError extends Error {
	public readonly statusCode: number;
	public readonly responseBody: string;
	constructor(statusCode: number, responseBody: string) {
		super(`Vendor already exists (HTTP ${statusCode})`);
		this.name = "VendorAlreadyExistsError";
		this.statusCode = statusCode;
		this.responseBody = responseBody;
	}
}

mock.module("@/lib/procurecheck/client", () => ({
	authenticate: mockAuthenticate,
	createVendor: mockCreateVendor,
	findVendorByExternalId: mockFindVendorByExternalId,
	getProcureCheckRuntimeConfig: mockGetRuntimeConfig,
	withProcureCheckProxy: (init: RequestInit) => init,
	VendorAlreadyExistsError: MockVendorAlreadyExistsError,
}));

const originalFetch = globalThis.fetch;

describe("procurecheck-steps", () => {
	beforeEach(() => {
		mockCreateVendor.mockReset();
		mockCreateVendor.mockImplementation(() => Promise.resolve("vendor-123"));
		mockFindVendorByExternalId.mockReset();
		mockFindVendorByExternalId.mockImplementation(() => Promise.resolve(null));
		mockAuthenticate.mockReset();
		mockAuthenticate.mockImplementation(() => Promise.resolve("mock-token"));
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	describe("resolveVendorStep", () => {
		it("creates a new vendor and returns isExisting=false", async () => {
			const { resolveVendorStep } = await import("../procurecheck-steps");

			const result = await resolveVendorStep({
				vendorName: "Test Co",
				registrationNumber: "2020/123456/07",
				entityType: "company",
				idNumber: null,
				vatNumber: null,
				applicantId: 1,
			});

			expect(result.vendorId).toBe("vendor-123");
			expect(result.isExisting).toBe(false);
		});

		it("extracts vendor ID from VendorAlreadyExistsError response body", async () => {
			mockCreateVendor.mockImplementationOnce(() => {
				throw new MockVendorAlreadyExistsError(
					400,
					'{"message":"exists","vendorId":"abcdef12-3456-7890-abcd-ef1234567890"}',
				);
			});
			const { resolveVendorStep } = await import("../procurecheck-steps");

			const result = await resolveVendorStep({
				vendorName: "Dup Co",
				registrationNumber: "2020/999999/07",
				entityType: "company",
				idNumber: null,
				vatNumber: null,
				applicantId: 42,
			});

			expect(result.vendorId).toBe("abcdef12-3456-7890-abcd-ef1234567890");
			expect(result.isExisting).toBe(true);
		});

		it("falls back to findVendorByExternalId when error body has no UUID", async () => {
			mockCreateVendor.mockImplementationOnce(() => {
				throw new MockVendorAlreadyExistsError(400, "vendor exists");
			});
			mockFindVendorByExternalId.mockImplementationOnce(() =>
				Promise.resolve("fallback-uuid-1234"),
			);
			const { resolveVendorStep } = await import("../procurecheck-steps");

			const result = await resolveVendorStep({
				vendorName: "Dup Co 2",
				registrationNumber: "2020/888888/07",
				entityType: "company",
				idNumber: null,
				vatNumber: null,
				applicantId: 55,
			});

			expect(result.vendorId).toBe("fallback-uuid-1234");
			expect(result.isExisting).toBe(true);
			expect(mockFindVendorByExternalId).toHaveBeenCalledWith("STC-55");
		});
	});

	describe("checkVendorReadiness", () => {
		it("returns ready=true when outstanding=0 across all items", async () => {
			globalThis.fetch = mock(async () =>
				new Response(
					JSON.stringify([
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
					]),
					{ status: 200 },
				),
			) as typeof fetch;

			const { checkVendorReadiness } = await import("../procurecheck-steps");
			const result = await checkVendorReadiness("vendor-123");

			expect(result.ready).toBe(true);
			expect(result.outstandingChecks).toBe(0);
			expect(result.totalChecks).toBe(8);
			expect(result.executedChecks).toBe(8);
			expect(result.summaryItems).toHaveLength(2);
		});

		it("returns ready=false when any item has outstanding > 0", async () => {
			globalThis.fetch = mock(async () =>
				new Response(
					JSON.stringify([
						{
							VerificationType: "CIPC",
							TotalChecks: 7,
							OutstandingChecks: 3,
							ChecksCompleted: 4,
							PassedChecks: 4,
							FailedChecks: 0,
						},
					]),
					{ status: 200 },
				),
			) as typeof fetch;

			const { checkVendorReadiness } = await import("../procurecheck-steps");
			const result = await checkVendorReadiness("vendor-123");

			expect(result.ready).toBe(false);
			expect(result.outstandingChecks).toBe(3);
		});

		it("throws when vendorresults endpoint fails", async () => {
			globalThis.fetch = mock(
				async () => new Response("Server error", { status: 500 }),
			) as typeof fetch;

			const { checkVendorReadiness } = await import("../procurecheck-steps");
			await expect(checkVendorReadiness("vendor-123")).rejects.toThrow(
				"vendorresults failed",
			);
		});

		it("parses string-encoded JSON response (edge case)", async () => {
			const payload = JSON.stringify([
				{
					VerificationType: "CIPC",
					TotalChecks: 2,
					OutstandingChecks: 0,
					ChecksCompleted: 2,
					PassedChecks: 2,
					FailedChecks: 0,
				},
			]);
			globalThis.fetch = mock(
				async () => new Response(JSON.stringify(payload), { status: 200 }),
			) as typeof fetch;

			const { checkVendorReadiness } = await import("../procurecheck-steps");
			const result = await checkVendorReadiness("vendor-123");
			expect(result.ready).toBe(true);
		});
	});

	describe("fetchAllCategoryResults", () => {
		const summaryItems = [
			{
				VerificationType: "CIPC",
				TotalChecks: 7,
				OutstandingChecks: 0,
				ChecksCompleted: 7,
				PassedChecks: 7,
				FailedChecks: 0,
			},
		];

		it("fetches all 7 categories in parallel and maps payload", async () => {
			let callCount = 0;
			globalThis.fetch = mock(async () => {
				callCount++;
				return new Response(
					JSON.stringify({
						Tables: [
							{
								MetaData: { TableName: "Test Result" },
								Data: [{ Severity: 0, Comments: [] }],
							},
						],
					}),
					{ status: 200 },
				);
			}) as typeof fetch;

			const { fetchAllCategoryResults } = await import("../procurecheck-steps");
			const result = await fetchAllCategoryResults(
				"vendor-123",
				summaryItems,
				"Test Co",
			);

			expect(callCount).toBe(7);
			expect(result.vendorId).toBe("vendor-123");
			expect(result.payload.provider).toBe("procurecheck");
			expect(result.payload.vendor.name).toBe("Test Co");
		});

		it("silently skips 404 responses (e.g. DOJ missing for SoleProp)", async () => {
			let callCount = 0;
			globalThis.fetch = mock(async () => {
				callCount++;
				// First 6 succeed, last one (doj) returns 404
				if (callCount === 7) {
					return new Response("Not found", { status: 404 });
				}
				return new Response(JSON.stringify({ Tables: [] }), { status: 200 });
			}) as typeof fetch;

			const { fetchAllCategoryResults } = await import("../procurecheck-steps");
			const result = await fetchAllCategoryResults(
				"vendor-soleprop",
				summaryItems,
				"Sole Prop Co",
			);

			expect(result.vendorId).toBe("vendor-soleprop");
			// 6 categories mapped (doj skipped due to 404)
			expect(result.payload.categories).toHaveLength(6);
		});

		it("maps Severity > 0 rows to FLAGGED results", async () => {
			globalThis.fetch = mock(async () =>
				new Response(
					JSON.stringify({
						Tables: [
							{
								MetaData: { TableName: "SAFPS Fraud" },
								Data: [{ Severity: 2, Comments: [] }],
							},
						],
					}),
					{ status: 200 },
				),
			) as typeof fetch;

			const { fetchAllCategoryResults } = await import("../procurecheck-steps");
			const result = await fetchAllCategoryResults(
				"vendor-flagged",
				summaryItems,
				"Flagged Co",
			);

			// All 7 categories will return the same flagged mock
			for (const category of result.payload.categories) {
				expect(category.checks[0].result).toBe("FLAGGED");
			}
		});
	});
});
