import {
	API_CATEGORY_ENDPOINTS,
	API_TO_INTERNAL_CATEGORY,
	type ApiCategoryEndpoint,
	type CategoryResultResponse,
	type ProcurementCategory,
	type ProcurementCheckItem,
	type ProcurementData,
	type ProcurementVendorDetail,
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
