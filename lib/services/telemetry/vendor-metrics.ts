import { captureServerEvent } from "@/lib/posthog-server";

export type VendorCheckName =
	| "procurecheck"
	| "xds_itc"
	| "opensanctions"
	| "firecrawl_sanctions"
	| "document_ai_fica"
	| "firecrawl_vat"
	| "document_ai_identity";

export type VendorCheckStage = 2 | 3 | "async";
export type VendorCheckOutcome =
	| "success"
	| "transient_failure"
	| "persistent_failure"
	| "business_denial";
export type VendorFailureType =
	| "network"
	| "timeout"
	| "auth"
	| "schema_error"
	| "rate_limit"
	| "outage";

/** Orchestration path for sanctions checks (PostHog: sanctions_path). */
export type SanctionsTelemetryPath =
	| "primary"
	| "fallback"
	| "manual_fallback"
	| "reused";

/** Workflow source for sanctions (PostHog: sanctions_source). */
export type SanctionsTelemetrySource = "pre_risk" | "itc_main";

type VendorCheckAttemptProperties = {
	vendor: VendorCheckName;
	stage: VendorCheckStage;
	workflow_id: number;
	applicant_id: number;
	outcome: VendorCheckOutcome;
	failure_type: VendorFailureType | null;
	http_status: number | null;
	duration_ms: number;
	env: "production" | "preview" | "development";
	sanctions_path?: SanctionsTelemetryPath;
	sanctions_source?: SanctionsTelemetrySource;
};

type VendorCaptureEvent = {
	distinctId: string;
	event: "vendor_check_attempt";
	properties: VendorCheckAttemptProperties;
};

type VendorCaptureSender = (event: VendorCaptureEvent) => void;

let testCaptureSender: VendorCaptureSender | null = null;

function getDeploymentEnv(): "production" | "preview" | "development" {
	if (process.env.VERCEL_ENV === "production") return "production";
	if (process.env.VERCEL_ENV === "preview") return "preview";
	return "development";
}

export function inferVendorFailureType(params: {
	error?: unknown;
	httpStatus?: number | null;
}): VendorFailureType | null {
	const { error, httpStatus } = params;
	if (httpStatus === 401 || httpStatus === 403) return "auth";
	if (httpStatus === 408) return "timeout";
	if (httpStatus === 429) return "rate_limit";
	if (typeof httpStatus === "number" && httpStatus >= 500) return "outage";

	const message = error instanceof Error ? error.message : String(error ?? "");
	const lower = message.toLowerCase();

	if (
		lower.includes("timeout") ||
		lower.includes("timed out") ||
		lower.includes("etimedout")
	) {
		return "timeout";
	}
	if (
		lower.includes("unauthorized") ||
		lower.includes("forbidden") ||
		lower.includes("auth")
	) {
		return "auth";
	}
	if (
		lower.includes("rate limit") ||
		lower.includes("too many requests") ||
		lower.includes("429")
	) {
		return "rate_limit";
	}
	if (
		lower.includes("schema") ||
		lower.includes("validation") ||
		lower.includes("zod") ||
		lower.includes("parse")
	) {
		return "schema_error";
	}
	if (
		lower.includes("network") ||
		lower.includes("fetch failed") ||
		lower.includes("econn") ||
		lower.includes("enotfound") ||
		lower.includes("socket hang up")
	) {
		return "network";
	}

	return null;
}

export interface VendorAttemptMetric {
	vendor: VendorCheckName;
	stage: VendorCheckStage;
	workflowId: number;
	applicantId: number;
	outcome: VendorCheckOutcome;
	durationMs: number;
	failureType?: VendorFailureType | null;
	httpStatus?: number | null;
	error?: unknown;
	/** Sanctions orchestration only — forwarded to PostHog as sanctions_path. */
	sanctionsPath?: SanctionsTelemetryPath;
	/** Sanctions orchestration only — forwarded to PostHog as sanctions_source. */
	sanctionsSource?: SanctionsTelemetrySource;
}

export function recordVendorCheckAttempt(params: VendorAttemptMetric): void {
	const failureType =
		params.outcome === "success"
			? null
			: (params.failureType ??
				inferVendorFailureType({
					error: params.error,
					httpStatus: params.httpStatus,
				}));

	const env = getDeploymentEnv();
	const metric: Record<string, string | number | null | undefined> = {
		metric: "vendor_check_attempt",
		vendor: params.vendor,
		stage: params.stage,
		workflow_id: params.workflowId,
		applicant_id: params.applicantId,
		outcome: params.outcome,
		failure_type: failureType,
		http_status: params.httpStatus ?? null,
		duration_ms: params.durationMs,
		env,
	};
	if (params.sanctionsPath !== undefined) {
		metric.sanctions_path = params.sanctionsPath;
	}
	if (params.sanctionsSource !== undefined) {
		metric.sanctions_source = params.sanctionsSource;
	}

	const logLevel = params.outcome === "success" ? "info" : "error";
	// biome-ignore lint/suspicious/noConsole: intentional structured operations telemetry
	console[logLevel]("[VendorTelemetry]", JSON.stringify(metric));

	const properties: VendorCheckAttemptProperties = {
		vendor: params.vendor,
		stage: params.stage,
		workflow_id: params.workflowId,
		applicant_id: params.applicantId,
		outcome: params.outcome,
		failure_type: failureType,
		http_status: params.httpStatus ?? null,
		duration_ms: params.durationMs,
		env,
	};
	if (params.sanctionsPath !== undefined) {
		properties.sanctions_path = params.sanctionsPath;
	}
	if (params.sanctionsSource !== undefined) {
		properties.sanctions_source = params.sanctionsSource;
	}

	const event: VendorCaptureEvent = {
		distinctId: `vendor-check:${params.vendor}`,
		event: "vendor_check_attempt",
		properties,
	};

	try {
		if (testCaptureSender) {
			testCaptureSender(event);
			return;
		}
		captureServerEvent(event);
	} catch (error) {
		console.warn("[VendorTelemetry] Failed to capture PostHog event", {
			vendor: params.vendor,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

export function recordVendorCheckFailure(params: {
	vendor: VendorCheckName;
	stage: VendorCheckStage;
	workflowId: number;
	applicantId: number;
	durationMs: number;
	outcome?: Extract<VendorCheckOutcome, "transient_failure" | "persistent_failure">;
	failureType?: VendorFailureType | null;
	httpStatus?: number | null;
	error?: unknown;
}): void {
	recordVendorCheckAttempt({
		vendor: params.vendor,
		stage: params.stage,
		workflowId: params.workflowId,
		applicantId: params.applicantId,
		durationMs: params.durationMs,
		outcome: params.outcome ?? "persistent_failure",
		failureType: params.failureType,
		httpStatus: params.httpStatus,
		error: params.error,
	});
}

export function recordVendorCheckSuccess(params: {
	vendor: VendorCheckName;
	stage: VendorCheckStage;
	workflowId: number;
	applicantId: number;
	durationMs: number;
}): void {
	recordVendorCheckAttempt({
		vendor: params.vendor,
		stage: params.stage,
		workflowId: params.workflowId,
		applicantId: params.applicantId,
		durationMs: params.durationMs,
		outcome: "success",
	});
}

export function setVendorTelemetryCaptureSenderForTests(
	sender: VendorCaptureSender | null
): void {
	testCaptureSender = sender;
}
