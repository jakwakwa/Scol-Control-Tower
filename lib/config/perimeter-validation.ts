import { z } from "zod";
import { getOptionalPostHogClient } from "@/lib/posthog-server";

export type ValidationMode = "strict" | "warn" | "disabled";

const VALIDATION_MODES: ValidationMode[] = ["strict", "warn", "disabled"];
const FLAG_KEY = "perimeter_validation_config";
const FLAG_DISTINCT_ID = "perimeter-validation-runtime";
const DEFAULT_CACHE_TTL_MS = 60_000;
const DEFAULT_PASS_SAMPLING_WEIGHT = 20;

const flagPayloadSchema = z.object({
	globalMode: z.enum(VALIDATION_MODES).optional(),
	eventOverrides: z.record(z.string(), z.enum(VALIDATION_MODES)).optional(),
	telemetryEnabled: z.boolean().optional(),
	passSamplingWeight: z.coerce.number().int().positive().optional(),
});

type FlagPayload = z.infer<typeof flagPayloadSchema>;
type FlagPayloadFetcher = () => Promise<unknown>;

export interface PerimeterValidationConfig {
	globalMode: ValidationMode;
	eventOverrides: Record<string, ValidationMode>;
	enableTelemetry: boolean;
	passSamplingWeight: number;
}

let cachedFlagPayload: FlagPayload | null = null;
let cacheLoadedAt = 0;
let inFlightRefresh: Promise<void> | null = null;
let hasLoggedFlagError = false;
let flagPayloadFetcher: FlagPayloadFetcher | null = null;

function parseEnvGlobalMode(): ValidationMode {
	const enforceStrict = process.env.ENFORCE_STRICT_SCHEMAS?.toLowerCase();
	if (enforceStrict === "false" || enforceStrict === "0") return "disabled";
	if (enforceStrict === "warn") return "warn";
	return "strict";
}

function parseEnvOverrides(): Record<string, ValidationMode> {
	const overridesRaw = process.env.PERIMETER_VALIDATION_OVERRIDES || "";
	const eventOverrides: Record<string, ValidationMode> = {};

	if (!overridesRaw) return eventOverrides;

	for (const override of overridesRaw.split(",")) {
		const [eventName, mode] = override.split(":").map(s => s.trim());
		if (eventName && mode && VALIDATION_MODES.includes(mode as ValidationMode)) {
			eventOverrides[eventName] = mode as ValidationMode;
		}
	}

	return eventOverrides;
}

function isPostHogConfigEnabled(): boolean {
	return process.env.POSTHOG_PERIMETER_CONFIG_ENABLED === "true";
}

function getConfigCacheTtlMs(): number {
	const parsed = Number(
		process.env.POSTHOG_PERIMETER_CONFIG_TTL_MS ?? DEFAULT_CACHE_TTL_MS
	);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CACHE_TTL_MS;
}

function getDeploymentEnv(): "production" | "preview" | "development" {
	if (process.env.VERCEL_ENV === "production") return "production";
	if (process.env.VERCEL_ENV === "preview") return "preview";
	return "development";
}

function getEnvConfig(): PerimeterValidationConfig {
	return {
		globalMode: parseEnvGlobalMode(),
		eventOverrides: parseEnvOverrides(),
		enableTelemetry: process.env.PERIMETER_TELEMETRY_ENABLED !== "false",
		passSamplingWeight: DEFAULT_PASS_SAMPLING_WEIGHT,
	};
}

function getMergedConfig(): PerimeterValidationConfig {
	const envConfig = getEnvConfig();
	if (!(isPostHogConfigEnabled() && cachedFlagPayload)) return envConfig;

	return {
		globalMode: cachedFlagPayload.globalMode ?? envConfig.globalMode,
		eventOverrides: {
			...envConfig.eventOverrides,
			...(cachedFlagPayload.eventOverrides ?? {}),
		},
		enableTelemetry: cachedFlagPayload.telemetryEnabled ?? envConfig.enableTelemetry,
		passSamplingWeight:
			cachedFlagPayload.passSamplingWeight ?? envConfig.passSamplingWeight,
	};
}

async function refreshFromPostHog(): Promise<void> {
	if (!isPostHogConfigEnabled()) return;
	if (!(flagPayloadFetcher || getOptionalPostHogClient())) {
		return;
	}

	try {
		let payload: unknown = await flagPayloadFetcher?.();
		if (payload === undefined || payload === null) {
			const client = getOptionalPostHogClient();
			if (!client) return;
			payload = await client.getFeatureFlagPayload(
				FLAG_KEY,
				FLAG_DISTINCT_ID,
				undefined,
				{
					personProperties: {
						deployment_env: getDeploymentEnv(),
					},
				}
			);
		}

		const parsed = flagPayloadSchema.safeParse(payload);
		if (!parsed.success) {
			if (!hasLoggedFlagError) {
				console.warn("[PerimeterValidation] Invalid PostHog flag payload", {
					flagKey: FLAG_KEY,
					errors: parsed.error.issues.map(issue => issue.message),
				});
				hasLoggedFlagError = true;
			}
			return;
		}

		cachedFlagPayload = parsed.data;
		hasLoggedFlagError = false;
	} catch (error) {
		if (!hasLoggedFlagError) {
			console.warn("[PerimeterValidation] Failed to refresh PostHog flag config", {
				flagKey: FLAG_KEY,
				error: error instanceof Error ? error.message : String(error),
			});
			hasLoggedFlagError = true;
		}
	} finally {
		cacheLoadedAt = Date.now();
	}
}

export async function ensurePerimeterValidationConfigLoaded(): Promise<void> {
	if (!isPostHogConfigEnabled()) return;

	const ttl = getConfigCacheTtlMs();
	if (cacheLoadedAt > 0 && Date.now() - cacheLoadedAt < ttl) return;

	if (!inFlightRefresh) {
		inFlightRefresh = refreshFromPostHog().finally(() => {
			inFlightRefresh = null;
		});
	}
	await inFlightRefresh;
}

export function getPerimeterValidationConfig(): PerimeterValidationConfig {
	return getMergedConfig();
}

export function getValidationModeForEvent(eventName: string): ValidationMode {
	const config = getPerimeterValidationConfig();
	return config.eventOverrides[eventName] || config.globalMode;
}

export function resetPerimeterValidationConfigCacheForTests(): void {
	cachedFlagPayload = null;
	cacheLoadedAt = 0;
	inFlightRefresh = null;
	hasLoggedFlagError = false;
	flagPayloadFetcher = null;
}

export function setPerimeterValidationFlagPayloadFetcherForTests(
	fetcher: FlagPayloadFetcher
): void {
	flagPayloadFetcher = fetcher;
}
