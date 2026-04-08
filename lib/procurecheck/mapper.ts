import {
	API_CATEGORY_ENDPOINTS,
	API_TO_INTERNAL_CATEGORY,
	type ApiCategoryEndpoint,
	type CategoryResultResponse,
	type CategoryResultTables,
	PROCURECHECK_CATEGORY_IDS,
	type ProcurementCategory,
	type ProcurementCategoryId,
	type ProcurementCheckItem,
	type ProcurementData,
	type ProcurementVendorDetail,
	type VendorSummaryArray,
	type VendorSummaryResponse,
} from "./types";

export function mapVendorResultsToPayload(
	summary: VendorSummaryResponse,
	categoryResults: Map<ApiCategoryEndpoint, CategoryResultResponse>,
	vendorId: string,
): ProcurementData {
	const vendor: ProcurementVendorDetail = {
		name: summary.VendorName,
		entityNumber: summary.EntityNumber ?? "",
		entityType: summary.EntityType ?? "",
		entityStatus: summary.EntityStatus ?? "",
		startDate: summary.StartDate ?? "",
		registrationDate: summary.RegistrationDate ?? "",
		taxNumber: summary.TaxNumber ?? "",
		withdrawFromPublic: summary.WithdrawFromPublic ?? "",
		postalAddress: summary.PostalAddress ?? "",
		registeredAddress: summary.RegisteredAddress ?? "",
	};

	const categorySummaries = summary.CheckCategories.map((cc) => ({
		category: cc.Category,
		total: cc.Total,
		executed: cc.Executed,
		outstanding: cc.Outstanding,
		review: cc.Review,
		status: cc.Status,
	}));

	const categories: ProcurementCategory[] = [];

	for (const endpoint of API_CATEGORY_ENDPOINTS) {
		const raw = categoryResults.get(endpoint);
		if (!raw) continue;

		const internalId = API_TO_INTERNAL_CATEGORY[endpoint];

		const checks: ProcurementCheckItem[] = raw.Checks.map((check) => ({
			name: check.Name,
			status: check.Status,
			result: check.Result,
		}));

		categories.push({
			id: internalId,
			description: raw.Description ?? "",
			reviewed: raw.Reviewed,
			checks,
		});
	}

	return {
		vendorId,
		vendor,
		summary: { categories: categorySummaries },
		categories,
		checkedAt: new Date().toISOString(),
		provider: "procurecheck",
	};
}

/**
 * Map the V7 array-based vendorresults + Tables-based category results
 * to the internal ProcurementData shape.
 *
 * Used by the Inngest-native procurement flow (procurecheck-steps.ts).
 */
export function mapV7ResultsToPayload(
	summaryItems: VendorSummaryArray,
	categoryTables: Map<ApiCategoryEndpoint, CategoryResultTables>,
	vendorId: string,
	vendorName: string,
): ProcurementData {
	// Build summary from array items (CheckResultsSummary[])
	const categorySummaries = summaryItems.map((item) => ({
		category: item.VerificationType,
		total: item.TotalChecks,
		executed: item.ChecksCompleted,
		outstanding: item.OutstandingChecks,
		review: 0,
		status: (
			item.OutstandingChecks === 0 && item.FailedChecks === 0
				? "CLEARED"
				: item.FailedChecks > 0
					? "FLAGGED"
					: "PENDING"
		) as "CLEARED" | "FLAGGED" | "PENDING",
	}));

	// Build per-category detail from Tables responses
	const categories: ProcurementCategory[] = [];
	for (const [endpointKey, tables] of categoryTables.entries()) {
		const internalId = API_TO_INTERNAL_CATEGORY[endpointKey];
		if (
			!PROCURECHECK_CATEGORY_IDS.includes(
				internalId as ProcurementCategoryId,
			)
		) {
			continue;
		}

		// Map ITableData rows to check items.
		// Swagger: IDataRowObject = { Severity: int, Comments: [...] }
		// Severity 0 = clear; >0 = flagged.
		const checks: ProcurementCheckItem[] = (tables.Tables ?? []).flatMap(
			(table) =>
				(table.Data ?? []).map((row) => ({
					name: table.MetaData?.TableName ?? endpointKey,
					status: "EXECUTED" as const,
					result: ((row.Severity ?? 0) > 0 ? "FLAGGED" : "CLEARED") as
						| "CLEARED"
						| "FLAGGED"
						| "UNKNOWN",
				})),
		);

		categories.push({
			id: internalId,
			description: endpointKey,
			reviewed: false,
			checks,
		});
	}

	// Vendor detail — V7 array response doesn't include vendor profile fields;
	// populate with what we have and leave blanks for the rest.
	const vendorDetail: ProcurementVendorDetail = {
		name: vendorName,
		entityNumber: "",
		entityType: "",
		entityStatus: "",
		startDate: "",
		registrationDate: "",
		taxNumber: "",
		withdrawFromPublic: "",
		postalAddress: "",
		registeredAddress: "",
	};

	return {
		vendorId,
		vendor: vendorDetail,
		summary: { categories: categorySummaries },
		categories,
		checkedAt: new Date().toISOString(),
		provider: "procurecheck",
	};
}
