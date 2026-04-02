import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { applicants } from "@/db/schema";
import {
	createVendor,
	getCategoryResult,
	pollUntilReady,
} from "@/lib/procurecheck/client";
import { mapVendorResultsToPayload } from "@/lib/procurecheck/mapper";
import {
	API_CATEGORY_ENDPOINTS,
	type ApiCategoryEndpoint,
	type CategoryResultResponse,
	type ProcurementCheckResult,
} from "@/lib/procurecheck/types";

function extractVendorId(raw: Record<string, unknown>): string {
	const id =
		(raw.ProcureCheckVendorID as string | undefined) ??
		(raw.vendor_Id as string | undefined) ??
		(raw.id as string | undefined);
	if (!id) {
		throw new Error("ProcureCheck vendor creation did not return a vendor ID");
	}
	return id;
}

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

	const createResult = await createVendor({
		vendorName: applicantData.companyName,
		registrationNumber: applicantData.registrationNumber ?? null,
		entityType: applicantData.entityType ?? null,
		idNumber: applicantData.idNumber ?? null,
		vatNumber: applicantData.vatNumber ?? null,
		applicantId,
	});

	const vendorId = extractVendorId(createResult as unknown as Record<string, unknown>);

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
