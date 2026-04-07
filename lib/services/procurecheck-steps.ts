import {
	authenticate,
	createVendor,
	findVendorByExternalId,
	getProcureCheckRuntimeConfig,
	VendorAlreadyExistsError,
	withProcureCheckProxy,
} from "@/lib/procurecheck/client";
import { mapV7ResultsToPayload } from "@/lib/procurecheck/mapper";
import {
	API_CATEGORY_ENDPOINTS,
	type ApiCategoryEndpoint,
	CategoryResultTablesSchema,
	type CategoryResultTables,
	type CreateVendorParams,
	isSummaryReady,
	type ProcurementCheckResult,
	type VendorSummaryArray,
	VendorSummaryArraySchema,
} from "@/lib/procurecheck/types";

// ============================================
// Helpers
// ============================================

/**
 * Extract a UUID from a ProcureCheck error response body.
 */
function extractVendorIdFromErrorBody(body: string): string | null {
	const match = body.match(
		/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
	);
	return match ? match[0] : null;
}

// ============================================
// Step 1: resolveVendorStep
// ============================================

export interface VendorResolution {
	vendorId: string;
	isExisting: boolean;
}

/**
 * Resolve vendor — create new or find existing when it already exists.
 * Designed for use inside a single Inngest step.run() block.
 */
export async function resolveVendorStep(
	params: CreateVendorParams,
): Promise<VendorResolution> {
	try {
		const vendorId = await createVendor(params);
		return { vendorId, isExisting: false };
	} catch (error) {
		if (!(error instanceof VendorAlreadyExistsError)) throw error;

		console.info(
			`[ProcureCheck] Vendor already exists for applicant ${params.applicantId}, finding existing`,
		);

		let vendorId = extractVendorIdFromErrorBody(error.responseBody);
		if (!vendorId) {
			vendorId = await findVendorByExternalId(`STC-${params.applicantId}`);
		}
		if (!vendorId) {
			throw new Error(
				`Vendor already exists for applicant ${params.applicantId} but could not determine vendor ID`,
			);
		}

		return { vendorId, isExisting: true };
	}
}

// ============================================
// Step 2: checkVendorReadiness
// ============================================

export interface VendorReadiness {
	ready: boolean;
	outstandingChecks: number;
	totalChecks: number;
	executedChecks: number;
	summaryItems: VendorSummaryArray;
}

/**
 * Check if vendor results are ready by polling the V7 vendorresults endpoint.
 *
 * Confirmed endpoint: GET /vendorresults?id={vendorId} → CheckResultsSummary[]
 *
 * ⚠️  WARNING: GET /VendorResults/resultsummary?vendorId= returns WORLD COMPLIANCE data
 *              (Category/Vendors/ActiveDirectors), NOT check readiness — do NOT use it here.
 *
 * Returns readiness status — does NOT throw on "not ready".
 */
export async function checkVendorReadiness(
	vendorId: string,
): Promise<VendorReadiness> {
	const token = await authenticate();
	const { baseUrl } = getProcureCheckRuntimeConfig();
	const response = await fetch(
		`${baseUrl}vendorresults?id=${encodeURIComponent(vendorId)}`,
		withProcureCheckProxy({
			method: "GET",
			headers: { Authorization: `Bearer ${token}` },
		}),
	);
	if (!response.ok) {
		const text = await response.text();
		throw new Error(
			`ProcureCheck vendorresults failed (GET): ${response.status} ${text}`,
		);
	}
	const data = await response.json();
	// Guard: ProcureCheck may return string-encoded JSON in some edge cases
	const normalized = typeof data === "string" ? JSON.parse(data) : data;
	const items = VendorSummaryArraySchema.parse(normalized);
	return {
		ready: isSummaryReady(items),
		outstandingChecks: items.reduce((s, i) => s + i.OutstandingChecks, 0),
		totalChecks: items.reduce((s, i) => s + i.TotalChecks, 0),
		executedChecks: items.reduce((s, i) => s + i.ChecksCompleted, 0),
		summaryItems: items,
	};
}

// ============================================
// Step 3: fetchAllCategoryResults
// ============================================

/**
 * Fetch all category results in parallel and map them to the internal payload.
 *
 * Accepts summaryItems already fetched by checkVendorReadiness — avoids a second fetch.
 * Uses CategoryResultTablesSchema (V7 VendorResultTablesDTO) for each category.
 *
 * Handles 404 gracefully: not all vendors have all category types (e.g. SoleProp skips DOJ).
 */
export async function fetchAllCategoryResults(
	vendorId: string,
	summaryItems: VendorSummaryArray,
	vendorName: string,
): Promise<ProcurementCheckResult> {
	const token = await authenticate();
	const { baseUrl } = getProcureCheckRuntimeConfig();

	const categoryEntries = await Promise.all(
		API_CATEGORY_ENDPOINTS.map(async (endpoint) => {
			const url = `${baseUrl}vendorresults/${endpoint}?id=${encodeURIComponent(vendorId)}`;
			const response = await fetch(
				url,
				withProcureCheckProxy({
					method: "GET",
					headers: { Authorization: `Bearer ${token}` },
				}),
			);
			if (!response.ok) {
				// 404 = this vendor type doesn't have this check category — skip silently
				console.info(
					`[ProcureCheck] Category ${endpoint} not available for vendor ${vendorId} (${response.status})`,
				);
				return null;
			}
			const data = await response.json();
			// Guard: ProcureCheck may return string-encoded JSON in some edge cases
			const normalized = typeof data === "string" ? JSON.parse(data) : data;
			const parsed = CategoryResultTablesSchema.safeParse(normalized);
			if (!parsed.success) {
				console.warn(
					`[ProcureCheck] Category ${endpoint} parse failed:`,
					parsed.error.message,
				);
				return null;
			}
			return [endpoint, parsed.data] as [
				ApiCategoryEndpoint,
				CategoryResultTables,
			];
		}),
	);

	const categoryTables = new Map<ApiCategoryEndpoint, CategoryResultTables>(
		categoryEntries.filter(
			(e): e is [ApiCategoryEndpoint, CategoryResultTables] => e !== null,
		),
	);

	const payload = mapV7ResultsToPayload(
		summaryItems,
		categoryTables,
		vendorId,
		vendorName,
	);
	const rawPayload: Record<string, unknown> = {
		summaryItems,
		categories: Object.fromEntries(categoryTables),
	};

	return { vendorId, payload, rawPayload };
}
