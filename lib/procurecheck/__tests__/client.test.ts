import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import type { CreateVendorParams } from "../types";

import authFixture from "./fixtures/auth-response.json";
import vendorCreateFixture from "./fixtures/vendor-create-response.json";
import vendorSummaryFixture from "./fixtures/vendor-summary-response.json";
import categoryCipcFixture from "./fixtures/category-cipc-response.json";

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function textResponse(body: string, status: number): Response {
	return new Response(body, { status });
}

let originalFetch: typeof globalThis.fetch;
let fetchMock: ReturnType<typeof mock>;

beforeEach(() => {
	originalFetch = globalThis.fetch;
	fetchMock = mock(() => Promise.resolve(jsonResponse({})));
	globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

	process.env.PROCURECHECK_USERNAME = "test-user";
	process.env.PROCURECHECK_PASSWORD = "test-pass";
	process.env.PROCURECHECK_ENV = "sandbox";
	Reflect.deleteProperty(process.env, "FIXIE_URL");
});

afterEach(() => {
	globalThis.fetch = originalFetch;
	Reflect.deleteProperty(process.env, "PROCURECHECK_USERNAME");
	Reflect.deleteProperty(process.env, "PROCURECHECK_PASSWORD");
	Reflect.deleteProperty(process.env, "PROCURECHECK_ENV");
	Reflect.deleteProperty(process.env, "FIXIE_URL");
});

async function importClient() {
	const mod = await import("../client");
	return mod;
}

// ============================================
// authenticate()
// ============================================

describe("authenticate()", () => {
	it("returns token from 'token' field", async () => {
		fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(authFixture)));
		const client = await importClient();
		client.clearTokenCache();
		const token = await client.authenticate();
		expect(token).toBe(authFixture.token);
	});

	it("returns token from 'access_token' variant", async () => {
		const accessTokenResponse = { access_token: "access-tok-123" };
		fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(accessTokenResponse)));
		const client = await importClient();
		client.clearTokenCache();
		const token = await client.authenticate();
		expect(token).toBe("access-tok-123");
	});

	it("throws on 401 response", async () => {
		fetchMock.mockImplementation(() =>
			Promise.resolve(textResponse("Unauthorized", 401)),
		);
		const client = await importClient();
		client.clearTokenCache();
		await expect(client.authenticate()).rejects.toThrow(/401/);
	});

	it("throws when response contains no token", async () => {
		fetchMock.mockImplementation(() =>
			Promise.resolve(jsonResponse({ message: "ok but no token" })),
		);
		const client = await importClient();
		client.clearTokenCache();
		await expect(client.authenticate()).rejects.toThrow(/token/i);
	});

	it("sends correct credentials in POST body", async () => {
		fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(authFixture)));
		const client = await importClient();
		client.clearTokenCache();
		await client.authenticate();

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toContain("authenticate");
		expect(init.method).toBe("POST");
		const body = JSON.parse(init.body as string);
		expect(body.username).toBe("test-user");
		expect(body.password).toBe("test-pass");
	});
});

// ============================================
// Token caching
// ============================================

describe("token caching", () => {
	it("reuses cached token on subsequent calls", async () => {
		fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(authFixture)));
		const client = await importClient();
		client.clearTokenCache();

		const token1 = await client.authenticate();
		const token2 = await client.authenticate();
		expect(token1).toBe(token2);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("re-authenticates after cache is cleared", async () => {
		fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(authFixture)));
		const client = await importClient();
		client.clearTokenCache();

		await client.authenticate();
		client.clearTokenCache();
		await client.authenticate();

		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});

// ============================================
// createVendor()
// ============================================

describe("createVendor()", () => {
	function stubAuthThenCreate() {
		let callIdx = 0;
		fetchMock.mockImplementation(() => {
			callIdx++;
			if (callIdx === 1) return Promise.resolve(jsonResponse(authFixture));
			return Promise.resolve(jsonResponse(vendorCreateFixture));
		});
	}

	const companyParams: CreateVendorParams = {
		vendorName: "Test Co (Pty) Ltd",
		registrationNumber: "2024/123456/07",
		entityType: "company",
		idNumber: null,
		vatNumber: null,
		applicantId: 42,
	};

	const solePropParams: CreateVendorParams = {
		vendorName: "John Doe Sole Prop",
		registrationNumber: null,
		entityType: "sole_prop",
		idNumber: "9001015009087",
		vatNumber: null,
		applicantId: 99,
	};

	it("creates a vendor with CIPC (company) type", async () => {
		stubAuthThenCreate();
		const client = await importClient();
		client.clearTokenCache();

		const vendorId = await client.createVendor(companyParams);
		expect(vendorId).toBe(vendorCreateFixture.ProcureCheckVendorID);

		const [, createInit] = fetchMock.mock.calls[1] as [string, RequestInit];
		const body = JSON.parse(createInit.body as string);
		expect(body.vendor_Type).toBe("4");
		expect(body.vendor_RegNum).toBe("2024/123456/07");
	});

	it("creates a sole prop vendor (type 2) with director", async () => {
		stubAuthThenCreate();
		const client = await importClient();
		client.clearTokenCache();

		const vendorId = await client.createVendor(solePropParams);
		expect(vendorId).toBe(vendorCreateFixture.ProcureCheckVendorID);

		const [, createInit] = fetchMock.mock.calls[1] as [string, RequestInit];
		const body = JSON.parse(createInit.body as string);
		expect(body.vendor_Type).toBe("2");
		expect(body.VendorDirectors).toHaveLength(1);
		expect(body.VendorDirectors[0].director_IdNum).toBe("9001015009087");
	});

	it("returns vendorId from response", async () => {
		stubAuthThenCreate();
		const client = await importClient();
		client.clearTokenCache();

		const vendorId = await client.createVendor(companyParams);
		expect(typeof vendorId).toBe("string");
		expect(vendorId.length).toBeGreaterThan(0);
	});

	it("throws on API error", async () => {
		let callIdx = 0;
		fetchMock.mockImplementation(() => {
			callIdx++;
			if (callIdx === 1) return Promise.resolve(jsonResponse(authFixture));
			return Promise.resolve(textResponse("Bad Request", 400));
		});
		const client = await importClient();
		client.clearTokenCache();

		await expect(client.createVendor(companyParams)).rejects.toThrow(/400/);
	});
});

// ============================================
// getVendorSummary()
// ============================================

describe("getVendorSummary()", () => {
	function stubAuthThenSummary() {
		let callIdx = 0;
		fetchMock.mockImplementation(() => {
			callIdx++;
			if (callIdx === 1) return Promise.resolve(jsonResponse(authFixture));
			return Promise.resolve(jsonResponse(vendorSummaryFixture));
		});
	}

	it("fetches and parses vendor summary", async () => {
		stubAuthThenSummary();
		const client = await importClient();
		client.clearTokenCache();

		const summary = await client.getVendorSummary("vendor-123");
		expect(summary.VendorID).toBe(vendorSummaryFixture.VendorID);
		expect(summary.VendorName).toBe(vendorSummaryFixture.VendorName);
		expect(summary.RiskSummary.TotalChecks).toBe(42);
		expect(summary.CheckCategories).toHaveLength(6);
	});

	it("calls correct URL with vendor ID", async () => {
		stubAuthThenSummary();
		const client = await importClient();
		client.clearTokenCache();

		await client.getVendorSummary("abc-def");

		const [url] = fetchMock.mock.calls[1] as [string, RequestInit];
		expect(url).toContain("vendorresults");
		expect(url).toContain("id=abc-def");
	});

	it("throws on API error", async () => {
		let callIdx = 0;
		fetchMock.mockImplementation(() => {
			callIdx++;
			if (callIdx === 1) return Promise.resolve(jsonResponse(authFixture));
			return Promise.resolve(textResponse("Not Found", 404));
		});
		const client = await importClient();
		client.clearTokenCache();

		await expect(client.getVendorSummary("bad-id")).rejects.toThrow(/404/);
	});
});

// ============================================
// getCategoryResult()
// ============================================

describe("getCategoryResult()", () => {
	function stubAuthThenCategory() {
		let callIdx = 0;
		fetchMock.mockImplementation(() => {
			callIdx++;
			if (callIdx === 1) return Promise.resolve(jsonResponse(authFixture));
			return Promise.resolve(jsonResponse(categoryCipcFixture));
		});
	}

	it("fetches per-category results", async () => {
		stubAuthThenCategory();
		const client = await importClient();
		client.clearTokenCache();

		const result = await client.getCategoryResult("vendor-123", "cipc");
		expect(result.Category).toBe("CIPC");
		expect(result.Checks.length).toBeGreaterThan(0);
	});

	it("calls correct URL with category path", async () => {
		stubAuthThenCategory();
		const client = await importClient();
		client.clearTokenCache();

		await client.getCategoryResult("vendor-123", "property");

		const [url] = fetchMock.mock.calls[1] as [string, RequestInit];
		expect(url).toContain("vendorresults/property");
		expect(url).toContain("id=vendor-123");
	});

	it("throws on API error", async () => {
		let callIdx = 0;
		fetchMock.mockImplementation(() => {
			callIdx++;
			if (callIdx === 1) return Promise.resolve(jsonResponse(authFixture));
			return Promise.resolve(textResponse("Server Error", 500));
		});
		const client = await importClient();
		client.clearTokenCache();

		await expect(
			client.getCategoryResult("vendor-123", "cipc"),
		).rejects.toThrow(/500/);
	});
});

// ============================================
// pollUntilReady()
// ============================================

describe("pollUntilReady()", () => {
	it("polls until OutstandingChecks reaches 0", async () => {
		const pendingSummary = {
			...vendorSummaryFixture,
			RiskSummary: { ...vendorSummaryFixture.RiskSummary, OutstandingChecks: 2 },
		};
		const readySummary = {
			...vendorSummaryFixture,
			RiskSummary: { ...vendorSummaryFixture.RiskSummary, OutstandingChecks: 0 },
		};

		let callIdx = 0;
		fetchMock.mockImplementation(() => {
			callIdx++;
			if (callIdx <= 1) return Promise.resolve(jsonResponse(authFixture));
			if (callIdx === 2) return Promise.resolve(jsonResponse(pendingSummary));
			if (callIdx === 3) return Promise.resolve(jsonResponse(pendingSummary));
			return Promise.resolve(jsonResponse(readySummary));
		});
		const client = await importClient();
		client.clearTokenCache();

		const result = await client.pollUntilReady("vendor-123", {
			timeoutMs: 30_000,
			initialDelayMs: 10,
		});
		expect(result.RiskSummary.OutstandingChecks).toBe(0);
	});

	it("throws on timeout", async () => {
		const pendingSummary = {
			...vendorSummaryFixture,
			RiskSummary: { ...vendorSummaryFixture.RiskSummary, OutstandingChecks: 5 },
		};

		let callIdx = 0;
		fetchMock.mockImplementation(() => {
			callIdx++;
			if (callIdx <= 1) return Promise.resolve(jsonResponse(authFixture));
			return Promise.resolve(jsonResponse(pendingSummary));
		});
		const client = await importClient();
		client.clearTokenCache();

		await expect(
			client.pollUntilReady("vendor-123", {
				timeoutMs: 100,
				initialDelayMs: 10,
			}),
		).rejects.toThrow(/timeout|timed out/i);
	});
});

// ============================================
// Proxy support
// ============================================

describe("proxy support", () => {
	it("getProcureCheckProxyOption returns undefined when FIXIE_URL not set", async () => {
		Reflect.deleteProperty(process.env, "FIXIE_URL");
		const client = await importClient();
		expect(client.getProcureCheckProxyOption()).toBeUndefined();
	});

	it("getProcureCheckProxyOption returns FIXIE_URL when set", async () => {
		process.env.FIXIE_URL = "https://proxy.example.com";
		const client = await importClient();
		expect(client.getProcureCheckProxyOption()).toBe("https://proxy.example.com");
	});

	it("withProcureCheckProxy adds proxy to RequestInit", async () => {
		process.env.FIXIE_URL = "https://proxy.example.com";
		const client = await importClient();
		const init = client.withProcureCheckProxy({ method: "GET" });
		expect(init.proxy).toBe("https://proxy.example.com");
	});

	it("withProcureCheckProxy returns plain init when no proxy", async () => {
		Reflect.deleteProperty(process.env, "FIXIE_URL");
		const client = await importClient();
		const init = client.withProcureCheckProxy({ method: "GET" });
		expect(init.proxy).toBeUndefined();
	});
});

// ============================================
// getProcureCheckRuntimeConfig()
// ============================================

describe("getProcureCheckRuntimeConfig()", () => {
	it("defaults to sandbox environment", async () => {
		Reflect.deleteProperty(process.env, "PROCURECHECK_ENV");
		const client = await importClient();
		const config = client.getProcureCheckRuntimeConfig();
		expect(config.environment).toBe("sandbox");
		expect(config.baseUrl).toContain("xdev.");
	});

	it("uses production URL when env is production", async () => {
		process.env.PROCURECHECK_ENV = "production";
		const client = await importClient();
		const config = client.getProcureCheckRuntimeConfig();
		expect(config.environment).toBe("production");
		expect(config.baseUrl).not.toContain("xdev.");
	});

	it("baseUrl always ends with trailing slash", async () => {
		const client = await importClient();
		const config = client.getProcureCheckRuntimeConfig();
		expect(config.baseUrl.endsWith("/")).toBe(true);
	});
});

// ============================================
// getVendorsList() backward compat
// ============================================

describe("getVendorsList()", () => {
	it("posts to vendors/getlist with token", async () => {
		const listResponse = { Data: [{ id: "1" }], TotalRecords: 1 };
		fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(listResponse)));
		const client = await importClient();

		await client.getVendorsList("bearer-tok");

		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toContain("vendors/getlist");
		expect(init.method).toBe("POST");
		expect((init.headers as Record<string, string>).Authorization).toBe(
			"Bearer bearer-tok",
		);
	});
});
