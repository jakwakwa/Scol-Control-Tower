import { describe, expect, it } from "bun:test";
import type { SanctionsCheckResult } from "@/lib/services/agents";
import {
	buildSanctionsVendorAttemptMetric,
	MANUAL_FALLBACK_SANCTIONS_DATA_SOURCE,
	sanctionsPathFromAutomatedDataSource,
	vendorCheckNameFromSanctionsDataSource,
} from "@/lib/services/telemetry/sanctions-vendor-telemetry";

function minimalResult(dataSource: string): SanctionsCheckResult {
	return {
		unSanctions: {
			checked: true,
			matchFound: false,
			matchDetails: [],
			lastChecked: new Date().toISOString(),
		},
		pepScreening: { checked: true, isPEP: false, familyAssociates: [] },
		adverseMedia: { checked: false, alertsFound: 0, alerts: [] },
		watchLists: { checked: true, listsChecked: [], matchesFound: 0, matches: [] },
		overall: {
			riskLevel: "CLEAR",
			passed: true,
			requiresEDD: false,
			recommendation: "PROCEED",
			reasoning: "ok",
			reviewRequired: false,
		},
		metadata: {
			checkId: "test",
			checkedAt: new Date().toISOString(),
			expiresAt: new Date().toISOString(),
			dataSource,
		},
	};
}

describe("sanctions-vendor-telemetry", () => {
	it("maps OpenSanctions dataSource to primary and opensanctions vendor", () => {
		expect(vendorCheckNameFromSanctionsDataSource("OpenSanctions (default)")).toBe(
			"opensanctions"
		);
		expect(sanctionsPathFromAutomatedDataSource("OpenSanctions (default)")).toBe(
			"primary"
		);
		const m = buildSanctionsVendorAttemptMetric({
			kind: "automated",
			source: "itc_main",
			workflowId: 10,
			applicantId: 20,
			durationMs: 500,
			result: minimalResult("OpenSanctions (za_export)"),
		});
		expect(m.vendor).toBe("opensanctions");
		expect(m.sanctionsPath).toBe("primary");
		expect(m.sanctionsSource).toBe("itc_main");
		expect(m.stage).toBe(3);
		expect(m.outcome).toBe("success");
	});

	it("maps Firecrawl dataSource to fallback and firecrawl_sanctions vendor", () => {
		expect(vendorCheckNameFromSanctionsDataSource("Firecrawl (UN)")).toBe(
			"firecrawl_sanctions"
		);
		expect(sanctionsPathFromAutomatedDataSource("Firecrawl (UN)")).toBe("fallback");
		const m = buildSanctionsVendorAttemptMetric({
			kind: "automated",
			source: "pre_risk",
			workflowId: 1,
			applicantId: 2,
			durationMs: 800,
			result: minimalResult("Firecrawl (UN)"),
		});
		expect(m.vendor).toBe("firecrawl_sanctions");
		expect(m.sanctionsPath).toBe("fallback");
		expect(m.stage).toBe(2);
	});

	it("maps manual fallback constant to manual_fallback path", () => {
		expect(sanctionsPathFromAutomatedDataSource(MANUAL_FALLBACK_SANCTIONS_DATA_SOURCE)).toBe(
			"manual_fallback"
		);
	});

	it("builds manual_fallback metric as transient_failure with error", () => {
		const m = buildSanctionsVendorAttemptMetric({
			kind: "manual_fallback",
			source: "itc_main",
			workflowId: 5,
			applicantId: 6,
			durationMs: 1200,
			error: new Error("Sanctions check failed across providers: x"),
		});
		expect(m.outcome).toBe("transient_failure");
		expect(m.sanctionsPath).toBe("manual_fallback");
		expect(m.vendor).toBe("opensanctions");
	});

	it("builds reused metric with vendor from previous dataSource", () => {
		const m = buildSanctionsVendorAttemptMetric({
			kind: "reused",
			source: "itc_main",
			workflowId: 7,
			applicantId: 8,
			durationMs: 3,
			previousDataSource: "Firecrawl (UN)",
		});
		expect(m.sanctionsPath).toBe("reused");
		expect(m.vendor).toBe("firecrawl_sanctions");
		expect(m.outcome).toBe("success");
	});

	it("builds infra_failure as persistent_failure without sanctionsPath", () => {
		const m = buildSanctionsVendorAttemptMetric({
			kind: "infra_failure",
			source: "pre_risk",
			workflowId: 9,
			applicantId: 10,
			durationMs: 0,
			error: new Error("Database connection failed"),
		});
		expect(m.outcome).toBe("persistent_failure");
		expect(m.sanctionsPath).toBeUndefined();
		expect(m.vendor).toBe("opensanctions");
	});
});
