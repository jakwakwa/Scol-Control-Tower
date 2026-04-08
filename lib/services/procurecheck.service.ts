import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { applicants } from "@/db/schema";
import {
	createVendor,
	findVendorByExternalId,
	getCategoryResult,
	getVendorSummary,
	initiateVerification,
	pollUntilReady,
	VendorAlreadyExistsError,
} from "@/lib/procurecheck/client";
import { mapVendorResultsToPayload } from "@/lib/procurecheck/mapper";
import {
	API_CATEGORY_ENDPOINTS,
	type ApiCategoryEndpoint,
	type CategoryResultResponse,
	type CreateVendorParams,
	type ProcurementCheckResult,
} from "@/lib/procurecheck/types";

/**
 * Attempt to extract a UUID from a ProcureCheck error response body.
 */
function extractVendorIdFromErrorBody(body: string): string | null {
	const match = body.match(
		/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
	);
	return match ? match[0] : null;
}

/**
 * Try to create a vendor; if it already exists, find and return the existing vendor ID.
 */
async function resolveVendorId(
	params: CreateVendorParams,
	applicantId: number
): Promise<{ vendorId: string; isExisting: boolean }> {
	try {
		const createResult = await createVendor(params);
		// createVendor returns a string vendor ID directly
		return { vendorId: createResult, isExisting: false };
	} catch (error) {
		if (!(error instanceof VendorAlreadyExistsError)) {
			throw error;
		}

		console.info(
			`[ProcureCheck] Vendor already exists for applicant ${applicantId}, attempting to find existing vendor`
		);

		// Strategy 1: extract vendor ID from the error response body
		let vendorId = extractVendorIdFromErrorBody(error.responseBody);

		// Strategy 2: search by the external ID we set during creation
		if (!vendorId) {
			const externalId = `STC-${applicantId}`;
			vendorId = await findVendorByExternalId(externalId);
		}

		if (!vendorId) {
			throw new Error(
				`Vendor already exists for applicant ${applicantId} but could not determine vendor ID. ` +
					`Original error: ${error.message}`
			);
		}

		console.info(
			`[ProcureCheck] Found existing vendor ${vendorId} for applicant ${applicantId}`
		);
		return { vendorId, isExisting: true };
	}
}

/**
 * @deprecated Use the atomic step functions in `lib/services/procurecheck-steps.ts`
 * (resolveVendorStep, checkVendorReadiness, fetchAllCategoryResults) with Inngest
 * step.run() and step.sleep() instead. The Inngest-native approach in
 * inngest/functions/control-tower/stages/stage3_enrichment.ts provides durable
 * polling that survives function restarts, unlike the in-process 60s polling here.
 * Retained for backward compatibility and ad-hoc/manual invocation only.
 */
export async function executeProcurementCheck(
	applicantId: number,
	_workflowId: number
): Promise<ProcurementCheckResult> {
	const db = getDatabaseClient();
	if (!db) {
		throw new Error("Database client unavailable for procurement check");
	}

	const rows = await db.select().from(applicants).where(eq(applicants.id, applicantId));

	const applicantData = rows[0];
	if (!applicantData) {
		throw new Error(`Applicant ${applicantId} not found — cannot run procurement check`);
	}

	const { vendorId, isExisting } = await resolveVendorId(
		{
			vendorName: applicantData.companyName,
			registrationNumber: applicantData.registrationNumber ?? null,
			entityType: applicantData.entityType ?? null,
			idNumber: applicantData.idNumber ?? null,
			vatNumber: applicantData.vatNumber ?? null,
			applicantId,
		},
		applicantId
	);

	// Determine whether to initiate verification based on vendor state
	if (isExisting) {
		const existingSummary = await getVendorSummary(vendorId);
		const hasNoChecks =
			existingSummary.RiskSummary.TotalChecks === 0 ||
			(existingSummary.RiskSummary.ExecutedChecks === 0 &&
				existingSummary.RiskSummary.OutstandingChecks === 0);

		if (hasNoChecks) {
			// Vendor exists but checks were never initiated
			await initiateVerification(vendorId);
		}
		// If OutstandingChecks > 0: checks are running, pollUntilReady will wait
		// If OutstandingChecks === 0 && ExecutedChecks > 0: checks already complete, skip straight to results
	} else {
		// New vendor: always initiate verification
		await initiateVerification(vendorId);
	}

	const summary = await pollUntilReady(vendorId);

	const categoryEntries = await Promise.all(
		API_CATEGORY_ENDPOINTS.map(async endpoint => {
			const result = await getCategoryResult(vendorId, endpoint);
			return [endpoint, result] as [ApiCategoryEndpoint, CategoryResultResponse];
		})
	);

	const categoryResults = new Map<ApiCategoryEndpoint, CategoryResultResponse>(
		categoryEntries
	);

	const payload = mapVendorResultsToPayload(summary, categoryResults, vendorId);

	const rawPayload: Record<string, unknown> = {
		summary,
		categories: Object.fromEntries(categoryResults),
	};

	return { vendorId, payload, rawPayload };
}
