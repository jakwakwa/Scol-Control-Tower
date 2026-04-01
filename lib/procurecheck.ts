import { z } from "zod";

const DEFAULT_SANDBOX_BASE_URL = "https://xdev.procurecheck.co.za/api/api/v1/";
const DEFAULT_PRODUCTION_BASE_URL = "https://api.procurecheck.co.za/api/api/v1/";
const DEFAULT_EGRESS_OWNER = "control-tower-server-runtime";
const SA_NATIONALITY_ID = "153a0fb2-cc8d-4805-80d2-5f996720fed9";

function assertServerRuntime(): void {
	if (typeof window !== "undefined") {
		throw new Error("ProcureCheck client must run on the server/runtime boundary only.");
	}
}

assertServerRuntime();

export type ProcureCheckEnvironment = "sandbox" | "production";

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

export type ProcureCheckRuntimeConfig = {
	environment: ProcureCheckEnvironment;
	baseUrl: string;
	egressOwner: string;
};

function withTrailingSlash(url: string): string {
	return url.endsWith("/") ? url : `${url}/`;
}

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

/**
 * Backwards-compatible static export used by callers that only need the currently
 * resolved URL string. Runtime calls should prefer getProcureCheckRuntimeConfig().
 */
export const BASE_URL = getProcureCheckRuntimeConfig().baseUrl;

type AuthResponse = {
	token?: string;
	access_token?: string;
	message?: string;
	[key: string]: unknown;
};

type VendorListResponse = {
	Data?: unknown[];
	TotalRecords?: number;
	[key: string]: unknown;
};

type VendorCreateResponse = {
	ProcureCheckVendorID?: string;
	id?: string;
	vendor_Id?: string;
	message?: string;
	[key: string]: unknown;
};

type VendorResultsResponse = {
	RiskSummary?: {
		FailedChecks?: number;
	};
	JudgementCheck?: {
		Failed?: boolean;
	};
	[key: string]: unknown;
};

export type CreateTestVendorParams = {
	vendorName?: string;
	registrationNumber?: string;
	applicantId?: number;
	idNumber?: string;
	isProprietor?: boolean;
};

/**
 * Authenticate with ProcureCheck Web API v5 and get JWT token.
 * Separate from ITC OAuth2 flow in itc.service.ts.
 */
export async function authenticate(): Promise<string> {
	const env = ProcureCheckCredentialsEnv.parse({
		PROCURECHECK_USERNAME: process.env.PROCURECHECK_USERNAME,
		PROCURECHECK_PASSWORD: process.env.PROCURECHECK_PASSWORD,
	});
	const { baseUrl } = getProcureCheckRuntimeConfig();

	const response = await fetch(`${baseUrl}authenticate`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			username: env.PROCURECHECK_USERNAME,
			password: env.PROCURECHECK_PASSWORD,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`ProcureCheck auth failed: ${response.status} ${errorText}`);
	}

	const data: AuthResponse = await response.json();

	const token = data.token || data.access_token;
	if (!token) {
		throw new Error("ProcureCheck auth response did not contain a token");
	}

	return token;
}

/**
 * Get list of vendors (safe read-only endpoint for demo).
 * Uses empty conditions for all vendors, page 0 size 1.
 */
export async function getVendorsList(token: string): Promise<VendorListResponse> {
	const { baseUrl } = getProcureCheckRuntimeConfig();
	const response = await fetch(`${baseUrl}vendors/getlist`, {
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
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`ProcureCheck getlist failed: ${response.status} ${errorText}`);
	}

	return response.json();
}

/**
 * Create a minimal test vendor (CIPC type).
 * Uses processBeeInfo=false to minimize processing.
 * Returns the created vendor ID for follow-up.
 */
export async function createTestVendor(params: {
	vendorName?: string;
	registrationNumber?: string;
	applicantId?: number;
	idNumber?: string;
	isProprietor?: boolean;
}): Promise<VendorCreateResponse> {
	const token = await authenticate();
	const { baseUrl } = getProcureCheckRuntimeConfig();
	const isProprietor = Boolean(params.isProprietor);

	const payload = {
		vendor_Name: params.vendorName || "Meeting Demo Vendor",
		vendor_Type: isProprietor ? "2" : "4",
		vendor_RegNum: isProprietor ? "" : params.registrationNumber || "",
		nationality_Id: SA_NATIONALITY_ID,
		vendor_VatNum: null,
		vendorExternalID: params.applicantId
			? `STC-DEMO-${params.applicantId}`
			: "STC-MEETING-DEMO-001",
		...(isProprietor && params.idNumber
			? {
					VendorDirectors: [
						{
							IsIdNumber: true,
							director_IdNum: params.idNumber,
						},
					],
				}
			: {}),
	};

	const response = await fetch(`${baseUrl}vendors?processBeeInfo=false`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`ProcureCheck vendor create failed: ${response.status} ${errorText}`);
	}

	return response.json();
}

/**
 * Get vendor results by ID (summary).
 */
export async function getVendorResults(vendorId: string): Promise<VendorResultsResponse> {
	const token = await authenticate();
	const { baseUrl } = getProcureCheckRuntimeConfig();

	const response = await fetch(
		`${baseUrl}vendorresults?id=${encodeURIComponent(vendorId)}`,
		{
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		}
	);

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`ProcureCheck results failed: ${response.status} ${errorText}`);
	}

	return response.json();
}

/**
 * Convenience function to run a full demo flow for meeting.
 * Auth -> getlist (safe) -> create vendor (optional).
 */
export async function runMeetingDemo(includeCreate = false) {
	try {
		const config = getProcureCheckRuntimeConfig();
		const token = await authenticate();
		const listResult = await getVendorsList(token);
		const listedRecords = Array.isArray(listResult.Data) ? listResult.Data.length : 0;
		let createdVendorId: string | undefined;
		let failedChecks: number | undefined;

		if (includeCreate) {
			const createResult = await createTestVendor({});
			createdVendorId =
				createResult.ProcureCheckVendorID || createResult.id || createResult.vendor_Id;

			if (createdVendorId) {
				const results = await getVendorResults(createdVendorId);
				failedChecks = results.RiskSummary?.FailedChecks;
			}
		}

		return {
			success: true,
			token,
			baseUrl: config.baseUrl,
			egressOwner: config.egressOwner,
			listedRecords,
			createdVendorId,
			failedChecks,
		};
	} catch (error) {
		console.error("❌ Demo failed:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

// Default export for easy import
export default {
	authenticate,
	getVendorsList,
	createTestVendor,
	getVendorResults,
	runMeetingDemo,
	BASE_URL,
};
