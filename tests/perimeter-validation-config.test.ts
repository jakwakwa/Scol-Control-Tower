import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
	ensurePerimeterValidationConfigLoaded,
	getPerimeterValidationConfig,
	resetPerimeterValidationConfigCacheForTests,
	setPerimeterValidationFlagPayloadFetcherForTests,
} from "../lib/config/perimeter-validation";

describe("perimeter validation config", () => {
	beforeEach(() => {
		process.env.ENFORCE_STRICT_SCHEMAS = undefined;
		process.env.PERIMETER_VALIDATION_OVERRIDES = undefined;
		process.env.PERIMETER_TELEMETRY_ENABLED = undefined;
		process.env.POSTHOG_PERIMETER_CONFIG_ENABLED = undefined;
		process.env.POSTHOG_PERIMETER_CONFIG_TTL_MS = undefined;
		resetPerimeterValidationConfigCacheForTests();
	});

	afterEach(() => {
		process.env.ENFORCE_STRICT_SCHEMAS = undefined;
		process.env.PERIMETER_VALIDATION_OVERRIDES = undefined;
		process.env.PERIMETER_TELEMETRY_ENABLED = undefined;
		process.env.POSTHOG_PERIMETER_CONFIG_ENABLED = undefined;
		process.env.POSTHOG_PERIMETER_CONFIG_TTL_MS = undefined;
		resetPerimeterValidationConfigCacheForTests();
	});

	it("uses env fallback config when PostHog is disabled", () => {
		process.env.ENFORCE_STRICT_SCHEMAS = "warn";
		process.env.PERIMETER_VALIDATION_OVERRIDES =
			"onboarding/lead.created:strict,sanctions/external.received:disabled";
		process.env.PERIMETER_TELEMETRY_ENABLED = "false";

		const config = getPerimeterValidationConfig();
		expect(config.globalMode).toBe("warn");
		expect(config.eventOverrides["onboarding/lead.created"]).toBe("strict");
		expect(config.eventOverrides["sanctions/external.received"]).toBe("disabled");
		expect(config.enableTelemetry).toBe(false);
		expect(config.passSamplingWeight).toBe(20);
	});

	it("merges PostHog payload over env config when enabled", async () => {
		process.env.POSTHOG_PERIMETER_CONFIG_ENABLED = "true";
		process.env.ENFORCE_STRICT_SCHEMAS = "warn";

		setPerimeterValidationFlagPayloadFetcherForTests(async () => ({
			globalMode: "strict",
			eventOverrides: {
				"onboarding/lead.created": "warn",
			},
			telemetryEnabled: true,
			passSamplingWeight: 50,
		}));

		await ensurePerimeterValidationConfigLoaded();
		const config = getPerimeterValidationConfig();
		expect(config.globalMode).toBe("strict");
		expect(config.eventOverrides["onboarding/lead.created"]).toBe("warn");
		expect(config.enableTelemetry).toBe(true);
		expect(config.passSamplingWeight).toBe(50);
	});

	it("falls back to env config when payload shape is invalid", async () => {
		process.env.POSTHOG_PERIMETER_CONFIG_ENABLED = "true";
		process.env.ENFORCE_STRICT_SCHEMAS = "warn";

		setPerimeterValidationFlagPayloadFetcherForTests(async () => ({
			globalMode: "not-a-mode",
		}));

		await ensurePerimeterValidationConfigLoaded();
		const config = getPerimeterValidationConfig();
		expect(config.globalMode).toBe("warn");
		expect(config.passSamplingWeight).toBe(20);
	});

	it("uses cache ttl to avoid repeated fetches", async () => {
		process.env.POSTHOG_PERIMETER_CONFIG_ENABLED = "true";
		process.env.POSTHOG_PERIMETER_CONFIG_TTL_MS = "60000";

		let fetchCount = 0;
		setPerimeterValidationFlagPayloadFetcherForTests(async () => {
			fetchCount += 1;
			return { globalMode: "strict", passSamplingWeight: 20 };
		});

		await ensurePerimeterValidationConfigLoaded();
		await ensurePerimeterValidationConfigLoaded();
		expect(fetchCount).toBe(1);
	});
});
