import type { SanctionsCheckResult } from "@/lib/services/agents";
import type {
	SanctionsTelemetryPath,
	SanctionsTelemetrySource,
	VendorAttemptMetric,
	VendorCheckName,
	VendorCheckStage,
} from "./vendor-metrics";

/** Must stay aligned with manual fallback in `runSanctionsForWorkflow`. */
export const MANUAL_FALLBACK_SANCTIONS_DATA_SOURCE =
	"Manual Fallback (OpenSanctions + Firecrawl failed)" as const;

function sanctionsSourceToStage(source: SanctionsTelemetrySource): VendorCheckStage {
	return source === "pre_risk" ? 2 : 3;
}

export function vendorCheckNameFromSanctionsDataSource(dataSource: string): VendorCheckName {
	if (dataSource.startsWith("Firecrawl")) return "firecrawl_sanctions";
	return "opensanctions";
}

export function sanctionsPathFromAutomatedDataSource(
	dataSource: string
): Extract<SanctionsTelemetryPath, "primary" | "fallback" | "manual_fallback"> {
	if (dataSource === MANUAL_FALLBACK_SANCTIONS_DATA_SOURCE) return "manual_fallback";
	if (dataSource.startsWith("Firecrawl")) return "fallback";
	return "primary";
}

export type BuildSanctionsVendorAttemptMetricInput =
	| {
			kind: "reused";
			source: SanctionsTelemetrySource;
			workflowId: number;
			applicantId: number;
			durationMs: number;
			previousDataSource: string;
	  }
	| {
			kind: "automated";
			source: SanctionsTelemetrySource;
			workflowId: number;
			applicantId: number;
			durationMs: number;
			result: SanctionsCheckResult;
	  }
	| {
			kind: "manual_fallback";
			source: SanctionsTelemetrySource;
			workflowId: number;
			applicantId: number;
			durationMs: number;
			error: unknown;
	  }
	| {
			kind: "infra_failure";
			source: SanctionsTelemetrySource;
			workflowId: number;
			applicantId: number;
			durationMs: number;
			error: unknown;
	  };

/**
 * Builds a single `vendor_check_attempt` payload for sanctions orchestration.
 * Manual fallback uses `transient_failure` (automation degraded; human path is expected).
 */
export function buildSanctionsVendorAttemptMetric(
	input: BuildSanctionsVendorAttemptMetricInput
): VendorAttemptMetric {
	const stage = sanctionsSourceToStage(input.source);
	const common = {
		stage,
		workflowId: input.workflowId,
		applicantId: input.applicantId,
		durationMs: input.durationMs,
		sanctionsSource: input.source,
	} as const;

	if (input.kind === "reused") {
		return {
			...common,
			vendor: vendorCheckNameFromSanctionsDataSource(input.previousDataSource),
			outcome: "success",
			sanctionsPath: "reused",
		};
	}

	if (input.kind === "automated") {
		const ds = input.result.metadata.dataSource;
		return {
			...common,
			vendor: vendorCheckNameFromSanctionsDataSource(ds),
			outcome: "success",
			sanctionsPath: sanctionsPathFromAutomatedDataSource(ds),
		};
	}

	if (input.kind === "manual_fallback") {
		return {
			...common,
			vendor: "opensanctions",
			outcome: "transient_failure",
			sanctionsPath: "manual_fallback",
			error: input.error,
		};
	}

	return {
		...common,
		vendor: "opensanctions",
		outcome: "persistent_failure",
		error: input.error,
	};
}
