import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
	recordValidationFailure,
	recordValidationSuccess,
	setPerimeterTelemetryCaptureSenderForTests,
} from "../lib/services/telemetry/perimeter-metrics";

describe("perimeter telemetry", () => {
	beforeEach(() => {
		process.env.PERIMETER_TELEMETRY_ENABLED = "true";
		process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = "test-token";
		process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://us.posthog.com";
		process.env.VERCEL_ENV = "preview";
	});

	afterEach(() => {
		process.env.PERIMETER_TELEMETRY_ENABLED = undefined;
		process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = undefined;
		process.env.NEXT_PUBLIC_POSTHOG_HOST = undefined;
		process.env.VERCEL_ENV = undefined;
		setPerimeterTelemetryCaptureSenderForTests(null);
	});

	it("always sends failure attempts with sampling_weight 1", () => {
		const events: Array<{ properties: { result: string; reason_code: string | null; sampling_weight: number } }> = [];
		setPerimeterTelemetryCaptureSenderForTests(event => {
			events.push({
				properties: {
					result: event.properties.result,
					reason_code: event.properties.reason_code,
					sampling_weight: event.properties.sampling_weight,
				},
			});
		});

		recordValidationFailure({
			eventName: "onboarding/lead.created",
			sourceSystem: "control-tower",
			validationMode: "strict",
			failedPaths: ["email"],
			messages: ["Invalid email"],
		});

		expect(events.length).toBe(1);
		expect(events[0]?.properties.result).toBe("fail");
		expect(events[0]?.properties.reason_code).toBe("email");
		expect(events[0]?.properties.sampling_weight).toBe(1);
	});

	it("samples pass attempts using passSamplingWeight", () => {
		const events: Array<{ properties: { result: string; sampling_weight: number } }> = [];
		setPerimeterTelemetryCaptureSenderForTests(event => {
			events.push({
				properties: {
					result: event.properties.result,
					sampling_weight: event.properties.sampling_weight,
				},
			});
		});

		const originalRandom = Math.random;
		Math.random = () => 0.99;
		recordValidationSuccess({
			eventName: "onboarding/lead.created",
			sourceSystem: "control-tower",
			validationMode: "strict",
		});
		expect(events.length).toBe(0);

		Math.random = () => 0;
		recordValidationSuccess({
			eventName: "onboarding/lead.created",
			sourceSystem: "control-tower",
			validationMode: "strict",
		});
		expect(events.length).toBe(1);
		expect(events[0]?.properties.result).toBe("pass");
		expect(events[0]?.properties.sampling_weight).toBe(20);
		Math.random = originalRandom;
	});
});
