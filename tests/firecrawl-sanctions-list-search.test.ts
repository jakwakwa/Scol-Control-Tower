import { describe, expect, it } from "bun:test";
import type { SanctionsCheckInput } from "@/lib/services/agents/sanctions.agent";
import {
	mapCombinedToSanctionsCheckResult,
	runFirecrawlSanctionsSearch,
} from "@/lib/services/firecrawl/checks/sanctions-list-search";

const baseInput: SanctionsCheckInput = {
	applicantId: 1001,
	workflowId: 2002,
	entityName: "Acme Holdings",
	entityType: "COMPANY",
	countryCode: "ZA",
};

describe("runFirecrawlSanctionsSearch", () => {
	it("returns empty UN-only shape when no search terms are provided", async () => {
		const result = await runFirecrawlSanctionsSearch({ entityName: "   " });

		expect(result).toEqual({
			un: { individuals: [], entities: [] },
			hasBlockingMatch: false,
		});
	});
});

describe("mapCombinedToSanctionsCheckResult", () => {
	it("maps UN match into a blocked sanctions decision", () => {
		const result = mapCombinedToSanctionsCheckResult(
			{
				un: {
					individuals: [
						{ FIRST_NAME: "John", SECOND_NAME: "Doe", REFERENCE_NUMBER: "QDe.001" },
					],
					entities: [],
				},
				hasBlockingMatch: true,
			},
			baseInput
		);

		expect(result.unSanctions.matchFound).toBe(true);
		expect(result.overall.riskLevel).toBe("BLOCKED");
		expect(result.overall.passed).toBe(false);
		expect(result.overall.recommendation).toBe("BLOCK");
		expect(result.watchLists.listsChecked).toEqual(["UN Consolidated"]);
		expect(result.watchLists.matchesFound).toBe(0);
		expect(result.metadata.dataSource).toBe("Firecrawl (UN)");
	});

	it("maps no UN match into a clear sanctions decision", () => {
		const result = mapCombinedToSanctionsCheckResult(
			{
				un: { individuals: [], entities: [] },
				hasBlockingMatch: false,
			},
			baseInput
		);

		expect(result.unSanctions.matchFound).toBe(false);
		expect(result.overall.riskLevel).toBe("CLEAR");
		expect(result.overall.passed).toBe(true);
		expect(result.overall.recommendation).toBe("PROCEED");
		expect(result.overall.reviewRequired).toBe(false);
		expect(result.watchLists.matches).toEqual([]);
	});
});
