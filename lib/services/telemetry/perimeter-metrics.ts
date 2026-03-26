/**
 * Perimeter Validation Telemetry
 *
 * Structured logging and metrics collection for perimeter validation outcomes.
 * Supports monitoring validation failures, payload violations, and rollout health.
 */

import { getPerimeterValidationConfig } from "@/lib/config/perimeter-validation";
import { getPostHogProjectToken } from "@/lib/posthog-env";
import { getOptionalPostHogClient } from "@/lib/posthog-server";
import { getPerimeterSchemaVersion } from "@/lib/validations/control-tower/perimeter-schema-versions";

export interface PerimeterValidationMetric {
	eventName: string;
	sourceSystem: string;
	validationMode: "strict" | "warn" | "disabled";
	outcome: "success" | "warning" | "failure";
	failedPaths?: string[];
	messages?: string[];
	producer?: string;
	timestamp: string;
	workflowId?: number;
	applicantId?: number;
}

type PerimeterAttemptResult = "pass" | "fail";
type PerimeterCaptureEvent = {
	distinctId: string;
	event: string;
	properties: {
		env: "production" | "preview" | "development";
		perimeter_id: string;
		schema_version: string;
		result: PerimeterAttemptResult;
		reason_code: string | null;
		sampling_weight: number;
	};
};
type PerimeterCaptureSender = (event: PerimeterCaptureEvent) => void;

let testCaptureSender: PerimeterCaptureSender | null = null;

function getDeploymentEnv(): "production" | "preview" | "development" {
	if (process.env.VERCEL_ENV === "production") return "production";
	if (process.env.VERCEL_ENV === "preview") return "preview";
	return "development";
}

function getReasonCode(metric: PerimeterValidationMetric): string | null {
	if (metric.outcome === "success") return null;
	if (!metric.failedPaths || metric.failedPaths.length === 0) return "unknown";
	return metric.failedPaths.slice(0, 5).join(">");
}

function shouldSendPassEvent(samplingWeight: number): boolean {
	if (samplingWeight <= 1) return true;
	return Math.floor(Math.random() * samplingWeight) === 0;
}

function getAttemptResult(metric: PerimeterValidationMetric): PerimeterAttemptResult {
	return metric.outcome === "success" ? "pass" : "fail";
}

function maybeCapturePerimeterAttempt(metric: PerimeterValidationMetric): void {
	const config = getPerimeterValidationConfig();
	if (!config.enableTelemetry) return;
	if (!(getPostHogProjectToken() && process.env.NEXT_PUBLIC_POSTHOG_HOST)) {
		return;
	}

	const result = getAttemptResult(metric);
	const samplingWeight = result === "pass" ? config.passSamplingWeight : 1;
	if (result === "pass" && !shouldSendPassEvent(samplingWeight)) return;

	try {
		const event: PerimeterCaptureEvent = {
			distinctId: "perimeter-telemetry",
			event: "perimeter_validation_attempt",
			properties: {
				env: getDeploymentEnv(),
				perimeter_id: metric.eventName,
				schema_version: getPerimeterSchemaVersion(metric.eventName),
				result,
				reason_code: result === "fail" ? getReasonCode(metric) : null,
				sampling_weight: samplingWeight,
			},
		};

		if (testCaptureSender) {
			testCaptureSender(event);
			return;
		}

		const client = getOptionalPostHogClient();
		client?.capture(event);
	} catch (error) {
		console.warn("[PerimeterTelemetry] Failed to send PostHog event", {
			eventName: metric.eventName,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

export function recordPerimeterValidationMetric(metric: PerimeterValidationMetric): void {
	const logLevel =
		metric.outcome === "failure"
			? "error"
			: metric.outcome === "warning"
				? "warn"
				: "info";

	const logData = {
		metric: "perimeter_validation",
		...metric,
		failedPathsCount: metric.failedPaths?.length || 0,
		messagesCount: metric.messages?.length || 0,
	};

	const verboseDev =
		process.env.PERIMETER_TELEMETRY_VERBOSE_LOG === "true" ||
		process.env.NODE_ENV !== "development";
	if (verboseDev || metric.outcome !== "success") {
		// biome-ignore lint/suspicious/noConsole: intentional structured ops logging for perimeter rollout
		console[logLevel]("[PerimeterTelemetry]", JSON.stringify(logData));
	}
	maybeCapturePerimeterAttempt(metric);
}

/**
 * Records validation failure with detailed context
 */
export function recordValidationFailure(params: {
	eventName: string;
	sourceSystem: string;
	validationMode: "strict" | "warn";
	failedPaths: string[];
	messages: string[];
	producer?: string;
	workflowId?: number;
	applicantId?: number;
}): void {
	recordPerimeterValidationMetric({
		...params,
		outcome: params.validationMode === "strict" ? "failure" : "warning",
		timestamp: new Date().toISOString(),
	});
}

/**
 * Records successful validation
 */
export function recordValidationSuccess(params: {
	eventName: string;
	sourceSystem: string;
	validationMode: "strict" | "warn" | "disabled";
	producer?: string;
	workflowId?: number;
	applicantId?: number;
}): void {
	recordPerimeterValidationMetric({
		...params,
		outcome: "success",
		timestamp: new Date().toISOString(),
	});
}

/**
 * Extracts producer information from event context
 */
export function inferProducer(eventName: string, sourceSystem: string): string {
	const producerMap: Record<string, string> = {
		"onboarding/lead.created:control-tower": "internal-api",
		"sanctions/external.received:sanctions-ingress": "external-provider",
	};

	const key = `${eventName}:${sourceSystem}`;
	return producerMap[key] || `${sourceSystem}-unknown`;
}

export function setPerimeterTelemetryCaptureSenderForTests(
	sender: PerimeterCaptureSender | null
): void {
	testCaptureSender = sender;
}
