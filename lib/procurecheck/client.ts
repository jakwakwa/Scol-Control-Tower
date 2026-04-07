import { z } from "zod";
import {
	type ApiCategoryEndpoint,
	AuthResponseSchema,
	type CategoryResultResponse,
	CategoryResultResponseSchema,
	type CreateVendorParams,
	VendorCreateResponseSchema,
	type VendorListResponse,
	VendorListResponseSchema,
	type VendorSummaryResponse,
	VendorSummaryResponseSchema,
} from "./types";

// ============================================
// Constants
// ============================================

const DEFAULT_SANDBOX_BASE_URL = "https://xdev.procurecheck.co.za/api/api/v1/";
const DEFAULT_PRODUCTION_BASE_URL = "https://api.procurecheck.co.za/api/api/v1/";
const DEFAULT_EGRESS_OWNER = "control-tower-server-runtime";
const SA_NATIONALITY_ID = "153a0fb2-cc8d-4805-80d2-5f996720fed9";
const TOKEN_TTL_MS = 25 * 60 * 1000; // 25 minutes (V7 spec: 30min validity, refresh at 25min for safety margin)

// ============================================
// Env schemas
// ============================================

const ProcureCheckRoutingEnv = z.object({
	PROCURECHECK_ENV: z.enum(["sandbox", "production"]).optional(),
	PROCURECHECK_SANDBOX_BASE_URL: z.string().optional(),
	PROCURECHECK_BASE_URL: z.string().optional(),
	PROCURECHECK_EGRESS_OWNER: z.string().optional(),
});

const ProcureCheckCredentialsEnv = z.object({
	PROCURECHECK_USERNAME: z.string().min(1, "PROCURECHECK_USERNAME is required"),
	PROCURECHECK_PASSWORD: z.string().min(1, "PROCURECHECK_PASSWORD is required"),
});

// ============================================
// Types
// ============================================

export type ProcureCheckEnvironment = "sandbox" | "production";

export type ProcureCheckRuntimeConfig = {
	environment: ProcureCheckEnvironment;
	baseUrl: string;
	egressOwner: string;
};

type BunFetchProxyOption =
	| string
	| {
			url: string;
			headers?: HeadersInit;
	  };

type BunProxyRequestInit = RequestInit & {
	proxy?: BunFetchProxyOption;
};

export interface PollOptions {
	timeoutMs?: number;
	initialDelayMs?: number;
	maxDelayMs?: number;
}

// ============================================
// Custom errors
// ============================================

export class VendorAlreadyExistsError extends Error {
	public readonly statusCode: number;
	public readonly responseBody: string;
	constructor(statusCode: number, responseBody: string) {
		super(`Vendor already exists (HTTP ${statusCode})`);
		this.name = "VendorAlreadyExistsError";
		this.statusCode = statusCode;
		this.responseBody = responseBody;
	}
}

// ============================================
// Server-side guard
// ============================================

export function assertServerRuntime(): void {
	if (typeof window !== "undefined") {
		throw new Error("ProcureCheck client must run on the server/runtime boundary only.");
	}
}

// ============================================
// Helpers
// ============================================

function withTrailingSlash(url: string): string {
	return url.endsWith("/") ? url : `${url}/`;
}

function getFixieProxyUrl(): string | undefined {
	const value = process.env.FIXIE_URL?.trim();
	return value && value.length > 0 ? value : undefined;
}

export function getProcureCheckProxyOption(): BunFetchProxyOption | undefined {
	return getFixieProxyUrl();
}

export function withProcureCheckProxy(init: RequestInit): BunProxyRequestInit {
	const proxy = getProcureCheckProxyOption();
	if (!proxy) return { ...init };
	return { ...init, proxy };
}

// ============================================
// Runtime config
// ============================================

export function getProcureCheckRuntimeConfig(): ProcureCheckRuntimeConfig {
	const env = ProcureCheckRoutingEnv.parse({
		PROCURECHECK_ENV: process.env.PROCURECHECK_ENV,
		PROCURECHECK_SANDBOX_BASE_URL: process.env.PROCURECHECK_SANDBOX_BASE_URL,
		PROCURECHECK_BASE_URL: process.env.PROCURECHECK_BASE_URL,
		PROCURECHECK_EGRESS_OWNER: process.env.PROCURECHECK_EGRESS_OWNER,
	});

	const environment = env.PROCURECHECK_ENV ?? "sandbox";
	const baseUrlCandidate =
		environment === "sandbox"
			? (env.PROCURECHECK_SANDBOX_BASE_URL ??
				env.PROCURECHECK_BASE_URL ??
				DEFAULT_SANDBOX_BASE_URL)
			: (env.PROCURECHECK_BASE_URL ??
				env.PROCURECHECK_SANDBOX_BASE_URL ??
				DEFAULT_PRODUCTION_BASE_URL);

	return {
		environment,
		baseUrl: withTrailingSlash(baseUrlCandidate),
		egressOwner: env.PROCURECHECK_EGRESS_OWNER || DEFAULT_EGRESS_OWNER,
	};
}

// ============================================
// Token cache
// ============================================

let cachedToken: string | null = null;
let cachedTokenTimestamp = 0;

export function clearTokenCache(): void {
	cachedToken = null;
	cachedTokenTimestamp = 0;
}

function isTokenFresh(): boolean {
	return cachedToken !== null && Date.now() - cachedTokenTimestamp < TOKEN_TTL_MS;
}

// ============================================
// authenticate()
// ============================================

export async function authenticate(): Promise<string> {
	if (isTokenFresh()) return cachedToken!;

	const creds = ProcureCheckCredentialsEnv.parse({
		PROCURECHECK_USERNAME: process.env.PROCURECHECK_USERNAME,
		PROCURECHECK_PASSWORD: process.env.PROCURECHECK_PASSWORD,
	});
	const { baseUrl } = getProcureCheckRuntimeConfig();

	const response = await fetch(
		`${baseUrl}authenticate`,
		withProcureCheckProxy({
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				username: creds.PROCURECHECK_USERNAME,
				password: creds.PROCURECHECK_PASSWORD,
			}),
		})
	);

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`ProcureCheck auth failed (POST ${baseUrl}authenticate): ${response.status} ${errorText}`
		);
	}

	const data = await response.json();
	const parsed = AuthResponseSchema.parse(data);
	const token =
		typeof parsed === "string" ? parsed : (parsed.token ?? parsed.access_token);

	if (!token) {
		throw new Error("ProcureCheck auth response did not contain a token");
	}

	cachedToken = token;
	cachedTokenTimestamp = Date.now();
	return token;
}

// ============================================
// Entity type mapping
// ============================================

function mapEntityType(entityType: string | null): string {
	switch (entityType) {
		case "sole_prop":
			return "2";
		case "company":
			return "4";
		case "trust":
			return "17";
		default:
			return "4";
	}
}

// ============================================
// createVendor()
// ============================================

export async function createVendor(params: CreateVendorParams): Promise<string> {
	const token = await authenticate();
	const { baseUrl } = getProcureCheckRuntimeConfig();

	const vendorType = mapEntityType(params.entityType);
	const isSoleProp = vendorType === "2";

	const payload: Record<string, unknown> = {
		vendor_Name: params.vendorName,
		vendor_Type: vendorType,
		vendor_RegNum: isSoleProp ? "" : (params.registrationNumber ?? ""),
		nationality_Id: SA_NATIONALITY_ID,
		vendor_VatNum: params.vatNumber ?? null,
		vendorExternalID: `STC-${params.applicantId}`,
	};

	if (isSoleProp && params.idNumber) {
		payload.VendorDirectors = [
			{
				IsIdNumber: true,
				director_IdNum: params.idNumber,
			},
		];
	}

	const response = await fetch(
		`${baseUrl}vendors?processBeeInfo=false`,
		withProcureCheckProxy({
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(payload),
		})
	);

	if (!response.ok) {
		const errorText = await response.text();
		const isAlreadyExists =
			(response.status === 400 || response.status === 409) &&
			/already exists|duplicate|already registered/i.test(errorText);
		if (isAlreadyExists) {
			throw new VendorAlreadyExistsError(response.status, errorText);
		}
		throw new Error(
			`ProcureCheck vendor create failed (POST ${baseUrl}vendors): ${response.status} ${errorText}`
		);
	}

	const data = await response.json();
	// Guard: ProcureCheck may return string-encoded JSON in some edge cases
	const normalizedCreate = typeof data === "string" ? JSON.parse(data) : data;
	if (process.env.LOG_LEVEL === "debug" || process.env.DEBUG_FIX) {
	}
	const parsed = VendorCreateResponseSchema.parse(normalizedCreate);
	const vendorId = parsed.ProcureCheckVendorID ?? parsed.vendor_Id ?? parsed.id;

	if (!vendorId) {
		throw new Error("ProcureCheck vendor create response did not contain a vendor ID");
	}

	return vendorId;
}

// ============================================
// getVendorSummary()
// ============================================

export async function getVendorSummary(vendorId: string): Promise<VendorSummaryResponse> {
	const token = await authenticate();
	const { baseUrl } = getProcureCheckRuntimeConfig();
	const url = `${baseUrl}vendorresults?id=${encodeURIComponent(vendorId)}`;

	const response = await fetch(
		url,
		withProcureCheckProxy({
			method: "GET",
			headers: { Authorization: `Bearer ${token}` },
		})
	);

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`ProcureCheck getVendorSummary failed (GET ${url}): ${response.status} ${errorText}`
		);
	}

	const data = await response.json();
	// Guard: ProcureCheck may return string-encoded JSON in some edge cases
	const normalizedSummary = typeof data === "string" ? JSON.parse(data) : data;
	if (process.env.LOG_LEVEL === "debug" || process.env.DEBUG_FIX) {
	}
	return VendorSummaryResponseSchema.parse(normalizedSummary);
}

// ============================================
// getCategoryResult()
// ============================================

export async function getCategoryResult(
	vendorId: string,
	category: ApiCategoryEndpoint
): Promise<CategoryResultResponse> {
	const token = await authenticate();
	const { baseUrl } = getProcureCheckRuntimeConfig();
	const url = `${baseUrl}vendorresults/${category}?id=${encodeURIComponent(vendorId)}`;

	const response = await fetch(
		url,
		withProcureCheckProxy({
			method: "GET",
			headers: { Authorization: `Bearer ${token}` },
		})
	);

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`ProcureCheck getCategoryResult failed (GET ${url}): ${response.status} ${errorText}`
		);
	}

	const data = await response.json();
	// Guard: ProcureCheck may return string-encoded JSON in some edge cases
	const normalizedCategory = typeof data === "string" ? JSON.parse(data) : data;
	if (process.env.LOG_LEVEL === "debug" || process.env.DEBUG_FIX) {
	}
	return CategoryResultResponseSchema.parse(normalizedCategory);
}

// ============================================
// pollUntilReady()
// ============================================

export async function pollUntilReady(
	vendorId: string,
	opts?: PollOptions
): Promise<VendorSummaryResponse> {
	const timeoutMs = opts?.timeoutMs ?? 60_000;
	const initialDelayMs = opts?.initialDelayMs ?? 1_000;
	const maxDelayMs = opts?.maxDelayMs ?? 8_000;

	const deadline = Date.now() + timeoutMs;
	let delayMs = initialDelayMs;

	while (true) {
		const summary = await getVendorSummary(vendorId);

		if (summary.RiskSummary.OutstandingChecks === 0) {
			return summary;
		}

		if (Date.now() + delayMs > deadline) {
			throw new Error(
				`ProcureCheck pollUntilReady timed out after ${timeoutMs}ms for vendor ${vendorId} ` +
					`(${summary.RiskSummary.OutstandingChecks} checks still outstanding)`
			);
		}

		await new Promise(resolve => setTimeout(resolve, delayMs));
		delayMs = Math.min(delayMs * 2, maxDelayMs);
	}
}

// ============================================
// initiateVerification()
// ============================================

export interface InitiateVerificationOptions {
	/** Override the check types to run. Defaults to all standard checks. */
	checkTypes?: string[];
	notes?: string;
}

const DEFAULT_CHECK_TYPES = [
	"CIPC",
	"SAFPS",
	"Bank",
	"PropertyOwnership",
	"NonPreferred",
	"Judgement",
	"Persal",
];

/**
 * @deprecated V7 spec does not include a vendorverification endpoint.
 * With runInitialChecks removed from createVendor, checks auto-run on vendor creation.
 * Retained as fallback — remove after confirming auto-check behavior in production.
 */
export async function initiateVerification(
	vendorId: string,
	opts?: InitiateVerificationOptions
): Promise<{ success: boolean; raw: unknown }> {
	const token = await authenticate();
	const { baseUrl } = getProcureCheckRuntimeConfig();
	const url = `${baseUrl}vendorverification`;

	const body = {
		VendorID: vendorId,
		CheckTypes: opts?.checkTypes ?? DEFAULT_CHECK_TYPES,
		Notes: opts?.notes ?? "Initial verification triggered by Control Tower",
	};

	if (process.env.LOG_LEVEL === "debug" || process.env.DEBUG_FIX) {
	}

	const response = await fetch(
		url,
		withProcureCheckProxy({
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(body),
		})
	);

	const raw = await response.json().catch(() => null);

	if (!response.ok) {
		throw new Error(
			`ProcureCheck initiateVerification failed (POST ${url}): ${response.status} ${JSON.stringify(raw)}`
		);
	}

	if (process.env.LOG_LEVEL === "debug" || process.env.DEBUG_FIX) {
	}

	return { success: true, raw };
}

// ============================================
// getVendorsList() — backward compat
// ============================================

export async function getVendorsList(token: string): Promise<VendorListResponse> {
	const { baseUrl } = getProcureCheckRuntimeConfig();

	const response = await fetch(
		`${baseUrl}vendors/getlist`,
		withProcureCheckProxy({
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				QueryParams: {
					Conditions: [],
					PageIndex: 0,
					PageSize: 1,
					SortColumn: "Created",
					SortOrder: "Descending",
				},
			}),
		})
	);

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`ProcureCheck getVendorsList failed (POST ${baseUrl}vendors/getlist): ${response.status} ${errorText}`
		);
	}

	const data = await response.json();
	return VendorListResponseSchema.parse(data);
}

// ============================================
// findVendorByExternalId()
// ============================================

export async function findVendorByExternalId(externalId: string): Promise<string | null> {
	const token = await authenticate();
	const { baseUrl } = getProcureCheckRuntimeConfig();

	const response = await fetch(
		`${baseUrl}vendors/getlist`,
		withProcureCheckProxy({
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				QueryParams: {
					Conditions: [
						{
							ColumnName: "VendorExternalID",
							Operator: "Equals",
							Value: externalId,
						},
					],
					PageIndex: 0,
					PageSize: 1,
					SortColumn: "Created",
					SortOrder: "Descending",
				},
			}),
		})
	);

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`ProcureCheck findVendorByExternalId failed (POST ${baseUrl}vendors/getlist): ${response.status} ${errorText}`
		);
	}

	const data = await response.json();
	const parsed = VendorListResponseSchema.parse(data);

	if (!parsed.Data || parsed.Data.length === 0) return null;

	const vendor = parsed.Data[0];
	const vendorId =
		(vendor.ProcureCheckVendorID as string | undefined) ??
		(vendor.vendor_Id as string | undefined) ??
		(vendor.Id as string | undefined) ??
		(vendor.id as string | undefined);

	return vendorId ?? null;
}
