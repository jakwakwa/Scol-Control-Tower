import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
	recordVendorCheckAttempt,
	recordVendorCheckFailure,
	recordVendorCheckSuccess,
	setVendorTelemetryCaptureSenderForTests,
} from "../lib/services/telemetry/vendor-metrics";

type CapturedVendorEvent = {
	event: "vendor_check_attempt";
	properties: {
		vendor: string;
		stage: 2 | 3 | "async";
		workflow_id: number;
		applicant_id: number;
		outcome: string;
		failure_type: string | null;
		http_status: number | null;
		duration_ms: number;
		env: "production" | "preview" | "development";
		sanctions_path?: string;
		sanctions_source?: string;
	};
};

describe("vendor telemetry", () => {
	beforeEach(() => {
		process.env.VERCEL_ENV = "preview";
	});

	afterEach(() => {
		process.env.VERCEL_ENV = undefined;
		setVendorTelemetryCaptureSenderForTests(null);
	});

	it("captures success attempts with expected event shape", () => {
		const events: CapturedVendorEvent[] = [];
		setVendorTelemetryCaptureSenderForTests(event => {
			events.push(event);
		});

		recordVendorCheckSuccess({
			vendor: "procurecheck",
			stage: 3,
			workflowId: 42,
			applicantId: 7,
			durationMs: 1500,
		});

		expect(events.length).toBe(1);
		expect(events[0]?.event).toBe("vendor_check_attempt");
		expect(events[0]?.properties).toEqual({
			vendor: "procurecheck",
			stage: 3,
			workflow_id: 42,
			applicant_id: 7,
			outcome: "success",
			failure_type: null,
			http_status: null,
			duration_ms: 1500,
			env: "preview",
		});
	});

	it("infers auth failure type from http status", () => {
		const events: CapturedVendorEvent[] = [];
		setVendorTelemetryCaptureSenderForTests(event => {
			events.push(event);
		});

		recordVendorCheckFailure({
			vendor: "xds_itc",
			stage: 3,
			workflowId: 100,
			applicantId: 55,
			durationMs: 200,
			outcome: "persistent_failure",
			httpStatus: 401,
			error: new Error("Unauthorized"),
		});

		expect(events.length).toBe(1);
		expect(events[0]?.properties.outcome).toBe("persistent_failure");
		expect(events[0]?.properties.failure_type).toBe("auth");
		expect(events[0]?.properties.http_status).toBe(401);
	});

	it("includes optional sanctions_path and sanctions_source when provided", () => {
		const events: CapturedVendorEvent[] = [];
		setVendorTelemetryCaptureSenderForTests(event => {
			events.push(event);
		});

		recordVendorCheckAttempt({
			vendor: "opensanctions",
			stage: 3,
			workflowId: 1,
			applicantId: 2,
			outcome: "success",
			durationMs: 99,
			sanctionsPath: "fallback",
			sanctionsSource: "itc_main",
		});

		expect(events.length).toBe(1);
		expect(events[0]?.properties).toEqual({
			vendor: "opensanctions",
			stage: 3,
			workflow_id: 1,
			applicant_id: 2,
			outcome: "success",
			failure_type: null,
			http_status: null,
			duration_ms: 99,
			env: "preview",
			sanctions_path: "fallback",
			sanctions_source: "itc_main",
		});
	});
});
