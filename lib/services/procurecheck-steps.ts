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
	type CategoryResultTables,
	CategoryResultTablesSchema,
	type CreateVendorParams,
	isSummaryReady,
	type ProcurementCheckResult,
	type VendorSummaryArray,
	VendorSummaryArraySchema,
} from "@/lib/procurecheck/types";

function extractVendorIdFromErrorBody(body: string): string | null {
	const match = body.match(
		/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
	);
	return match ? match[0] : null;
}

export interface VendorResolution {
	vendorId: string;
	isExisting: boolean;
}

/**
 * Create or reuse a vendor. Inngest step.run() context.
 * When E2E_PROCURECHECK_REUSE_VENDOR + PROCURECHECK_VERIFICATION_VENDOR_ID are set (.env.test),
 * skips create and reuses the sandbox vendor (no DELETE API on ProcureCheck).
 */
export async function resolveVendorStep(
	params: CreateVendorParams
): Promise<VendorResolution> {
	if (
		process.env.E2E_PROCURECHECK_REUSE_VENDOR === "1" &&
		process.env.PROCURECHECK_VERIFICATION_VENDOR_ID
	) {
		const vendorId =
			process.env.PROCURECHECK_VERIFICATION_VENDOR_GUID ??
			process.env.PROCURECHECK_VERIFICATION_VENDOR_ID;
		console.info(
			`[ProcureCheck] TEST MODE: reusing verification vendor ${vendorId} ` +
				`for applicant ${params.applicantId} (no create call)`
		);
		return { vendorId, isExisting: true };
	}

	const externalId = `STC-${params.applicantId}`;
	const preflightId = await findVendorByExternalId(externalId);
	if (preflightId) {
		console.info(
			`[ProcureCheck] Vendor ${externalId} already exists (${preflightId}), skipping create`
		);
		return { vendorId: preflightId, isExisting: true };
	}

	try {
		const vendorId = await createVendor(params);
		return { vendorId, isExisting: false };
	} catch (error) {
		if (!(error instanceof VendorAlreadyExistsError)) throw error;

		console.info(
			`[ProcureCheck] Vendor already exists for applicant ${params.applicantId} (race), finding existing`
		);

		let vendorId = extractVendorIdFromErrorBody(error.responseBody);
		if (!vendorId) {
			vendorId = await findVendorByExternalId(externalId);
		}
		if (!vendorId) {
			throw new Error(
				`Vendor already exists for applicant ${params.applicantId} but could not determine vendor ID`
			);
		}

		return { vendorId, isExisting: true };
	}
}

export interface VendorReadiness {
	ready: boolean;
	outstandingChecks: number;
	totalChecks: number;
	executedChecks: number;
	summaryItems: VendorSummaryArray;
}

/** GET /vendorresults?id= for check readiness. Do not use /VendorResults/resultsummary for this. */
export async function checkVendorReadiness(vendorId: string): Promise<VendorReadiness> {
	const token = await authenticate();
	const { baseUrl } = getProcureCheckRuntimeConfig();
	const response = await fetch(
		`${baseUrl}vendorresults?id=${encodeURIComponent(vendorId)}`,
		withProcureCheckProxy({
			method: "GET",
			headers: { Authorization: `Bearer ${token}` },
		})
	);
	if (!response.ok) {
		const text = await response.text();
		throw new Error(
			`ProcureCheck vendorresults failed (GET): ${response.status} ${text}`
		);
	}
	const data = await response.json();
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

/** Parallel GET per category; 404 skipped (not all vendor types expose every category). */
export async function fetchAllCategoryResults(
	vendorId: string,
	summaryItems: VendorSummaryArray,
	vendorName: string
): Promise<ProcurementCheckResult> {
	const token = await authenticate();
	const { baseUrl } = getProcureCheckRuntimeConfig();

	const categoryEntries = await Promise.all(
		API_CATEGORY_ENDPOINTS.map(async endpoint => {
			const url = `${baseUrl}vendorresults/${endpoint}?id=${encodeURIComponent(vendorId)}`;
			const response = await fetch(
				url,
				withProcureCheckProxy({
					method: "GET",
					headers: { Authorization: `Bearer ${token}` },
				})
			);
			if (!response.ok) {
				console.info(
					`[ProcureCheck] Category ${endpoint} not available for vendor ${vendorId} (${response.status})`
				);
				return null;
			}
			const data = await response.json();
			const normalized = typeof data === "string" ? JSON.parse(data) : data;
			const parsed = CategoryResultTablesSchema.safeParse(normalized);
			if (!parsed.success) {
				console.warn(
					`[ProcureCheck] Category ${endpoint} parse failed:`,
					parsed.error.message
				);
				return null;
			}
			return [endpoint, parsed.data] as [ApiCategoryEndpoint, CategoryResultTables];
		})
	);

	const categoryTables = new Map<ApiCategoryEndpoint, CategoryResultTables>(
		categoryEntries.filter(
			(e): e is [ApiCategoryEndpoint, CategoryResultTables] => e !== null
		)
	);

	const payload = mapV7ResultsToPayload(
		summaryItems,
		categoryTables,
		vendorId,
		vendorName
	);
	const rawPayload: Record<string, unknown> = {
		summaryItems,
		categories: Object.fromEntries(categoryTables),
	};

	return { vendorId, payload, rawPayload };
}
