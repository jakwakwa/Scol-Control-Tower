/**
 * Regression tests for `executeProcurementCheck` (`lib/services/procurecheck.service.ts`).
 * That orchestration is @deprecated in favor of `procurecheck-steps` + Inngest step.run/sleep;
 * this file keeps the legacy path covered for backward compatibility and ad-hoc callers.
 */
import { beforeEach, describe, expect, it, mock } from "bun:test";
import type {
	ApiCategoryEndpoint,
	CategoryResultResponse,
	CreateVendorParams,
	VendorSummaryResponse,
} from "../lib/procurecheck/types";

const mockAuthenticate = mock(() => Promise.resolve("mock-token"));
const mockClearTokenCache = mock(() => {});
const mockCreateVendor = mock<(params: CreateVendorParams) => Promise<string>>(() =>
	Promise.resolve("vendor-abc-123")
);
const mockGetVendorSummary = mock<() => Promise<VendorSummaryResponse>>(() =>
	Promise.resolve({
		VendorID: "vendor-abc-123",
		VendorName: "Test Company",
		EntityNumber: "2024/123/07",
		EntityType: "Private Company",
		EntityStatus: "In Business",
		StartDate: "2024-01-01",
		RegistrationDate: "2024-01-01",
		TaxNumber: "9012345678",
		WithdrawFromPublic: "No",
		PostalAddress: "PO Box 1",
		RegisteredAddress: "1 Main Rd",
		RiskSummary: {
			TotalChecks: 10,
			ExecutedChecks: 10,
			OutstandingChecks: 0,
			FailedChecks: 0,
			ReviewChecks: 0,
		},
		CheckCategories: [
			{
				Category: "CIPC",
				Total: 2,
				Executed: 2,
				Outstanding: 0,
				Review: 0,
				Status: "CLEARED" as const,
			},
		],
	})
);
const mockGetCategoryResult = mock<
	(vendorId: string, category: ApiCategoryEndpoint) => Promise<CategoryResultResponse>
>(() =>
	Promise.resolve({
		Category: "CIPC",
		Description: "CIPC checks",
		Reviewed: true,
		Checks: [
			{ Name: "Company Reg", Status: "EXECUTED" as const, Result: "CLEARED" as const },
		],
	})
);
const mockPollUntilReady = mock<(vendorId: string) => Promise<VendorSummaryResponse>>(
	() => mockGetVendorSummary()
);

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

const mockFindVendorByExternalId = mock(
	(): Promise<string | null> => Promise.resolve(null)
);

mock.module("@/lib/procurecheck/client", () => ({
	authenticate: mockAuthenticate,
	clearTokenCache: mockClearTokenCache,
	createVendor: mockCreateVendor,
	getVendorSummary: mockGetVendorSummary,
	getCategoryResult: mockGetCategoryResult,
	pollUntilReady: mockPollUntilReady,
	findVendorByExternalId: mockFindVendorByExternalId,
	initiateVerification: mock(() => Promise.resolve({ success: true, raw: null })),
	VendorAlreadyExistsError: MockVendorAlreadyExistsError,
	getProcureCheckRuntimeConfig: () => ({
		environment: "sandbox" as const,
		baseUrl: "https://xdev.procurecheck.co.za/api/api/v1/",
		egressOwner: "test",
	}),
	getProcureCheckProxyOption: () => undefined,
	withProcureCheckProxy: (init: RequestInit) => init,
	getVendorsList: mock(() => Promise.resolve({ VendorList: [], TotalVendors: 0 })),
}));

type ApplicantProbeRow = {
	id: number;
	companyName: string;
	tradingName: null;
	registrationNumber: string;
	entityType: string;
	idNumber: null;
	vatNumber: null;
};

type MockDatabaseClient = {
	select: () => {
		from: () => {
			where: () => Promise<ApplicantProbeRow[]>;
		};
	};
};

const defaultApplicantDb: MockDatabaseClient = {
	select: () => ({
		from: () => ({
			where: () =>
				Promise.resolve([
					{
						id: 1,
						companyName: "Test Company (Pty) Ltd",
						tradingName: null,
						registrationNumber: "2024/123456/07",
						entityType: "company",
						idNumber: null,
						vatNumber: null,
					},
				]),
		}),
	}),
};

const mockGetDatabaseClient = mock<() => MockDatabaseClient | null>(
	() => defaultApplicantDb
);

mock.module("@/app/utils", () => ({
	getDatabaseClient: mockGetDatabaseClient,
	getBaseUrl: () => "http://localhost:3000",
}));

const { executeProcurementCheck } = await import("../lib/services/procurecheck.service");

describe("executeProcurementCheck (legacy orchestration)", () => {
	beforeEach(() => {
		mockAuthenticate.mockClear();
		mockCreateVendor.mockClear();
		mockGetVendorSummary.mockClear();
		mockGetCategoryResult.mockClear();
		mockPollUntilReady.mockClear();
		mockClearTokenCache.mockClear();
		mockGetDatabaseClient.mockImplementation(() => defaultApplicantDb);
	});

	it("fetches applicant, creates vendor, polls, and returns structured payload", async () => {
		const result = await executeProcurementCheck(1, 100);

		expect(result.vendorId).toBe("vendor-abc-123");
		expect(result.payload.provider).toBe("procurecheck");
		expect(result.payload.vendor.name).toBe("Test Company");
		expect(result.payload.checkedAt).toBeTruthy();
		expect(result.rawPayload).toBeTruthy();
	});

	it("calls createVendor with correct params from applicant data", async () => {
		await executeProcurementCheck(1, 100);

		expect(mockCreateVendor).toHaveBeenCalledTimes(1);
		const callArgs = mockCreateVendor.mock.calls[0]?.[0];
		expect(callArgs).toBeDefined();
		if (!callArgs) return;
		expect(callArgs.vendorName).toBe("Test Company (Pty) Ltd");
		expect(callArgs.registrationNumber).toBe("2024/123456/07");
		expect(callArgs.entityType).toBe("company");
		expect(callArgs.applicantId).toBe(1);
	});

	it("calls pollUntilReady after vendor creation", async () => {
		await executeProcurementCheck(1, 100);

		expect(mockPollUntilReady).toHaveBeenCalledTimes(1);
		expect(mockPollUntilReady.mock.calls[0]?.[0]).toBe("vendor-abc-123");
	});

	it("fetches all 7 category results in parallel", async () => {
		await executeProcurementCheck(1, 100);

		expect(mockGetCategoryResult).toHaveBeenCalledTimes(7);
		const calledCategories = mockGetCategoryResult.mock.calls.map(call => call[1]);
		expect(calledCategories).toContain("cipc");
		expect(calledCategories).toContain("property");
		expect(calledCategories).toContain("nonpreferred");
		expect(calledCategories).toContain("legalMatter");
		expect(calledCategories).toContain("safps");
		expect(calledCategories).toContain("persal");
		expect(calledCategories).toContain("doj");
	});

	it("throws when applicant is not found", async () => {
		mockGetDatabaseClient.mockReturnValueOnce({
			select: () => ({
				from: () => ({
					where: () => Promise.resolve([]),
				}),
			}),
		});

		const reloadedModule = await import("../lib/services/procurecheck.service");
		await expect(reloadedModule.executeProcurementCheck(999, 100)).rejects.toThrow(
			"not found"
		);
	});

	it("throws when database client is unavailable", async () => {
		mockGetDatabaseClient.mockReturnValueOnce(null);

		const reloadedModule = await import("../lib/services/procurecheck.service");
		await expect(reloadedModule.executeProcurementCheck(1, 100)).rejects.toThrow(
			"Database"
		);
	});

	it("returns rawPayload containing summary and category results", async () => {
		const result = await executeProcurementCheck(1, 100);

		expect(result.rawPayload).toHaveProperty("summary");
		expect(result.rawPayload).toHaveProperty("categories");
	});
});
