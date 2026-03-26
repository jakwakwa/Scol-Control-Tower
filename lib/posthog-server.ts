import { PostHog } from "posthog-node";
import { getPostHogProjectToken } from "@/lib/posthog-env";

let posthogClient: PostHog | null = null;

const DEFAULT_FLUSH_AT = 20;
const DEFAULT_FLUSH_INTERVAL_MS = 10_000;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
	const n = Number(raw);
	return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * Server-side PostHog client when project token + host are configured.
 * Prefer {@link captureServerEvent} in route handlers so missing env never throws.
 */
export function getOptionalPostHogClient(): PostHog | null {
	const token = getPostHogProjectToken()?.trim();
	const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim().replace(/\/+$/, "");
	if (!(token && host)) return null;

	if (!posthogClient) {
		posthogClient = new PostHog(token, {
			host,
			// Never use flushAt: 1 + flushInterval: 0 in dev — one HTTP round-trip per capture will tank the machine.
			flushAt: parsePositiveInt(process.env.POSTHOG_FLUSH_AT, DEFAULT_FLUSH_AT),
			flushInterval: parsePositiveInt(
				process.env.POSTHOG_FLUSH_INTERVAL_MS,
				DEFAULT_FLUSH_INTERVAL_MS
			),
		});
	}
	return posthogClient;
}

/** @throws only when PostHog is required but not configured */
export function getPostHogClient(): PostHog {
	const client = getOptionalPostHogClient();
	if (!client) {
		throw new Error(
			"Missing PostHog project token: set NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN or NEXT_PUBLIC_POSTHOG_KEY, and NEXT_PUBLIC_POSTHOG_HOST"
		);
	}
	return client;
}

export function captureServerEvent(payload: {
	distinctId: string;
	event: string;
	properties?: Record<string, unknown>;
	groups?: Record<string, string>;
}): void {
	const client = getOptionalPostHogClient();
	if (!client) return;
	try {
		client.capture(payload);
	} catch (error) {
		console.warn("[PostHog] captureServerEvent failed", {
			event: payload.event,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

export async function shutdownPostHog(): Promise<void> {
	if (posthogClient) {
		await posthogClient.shutdown();
	}
}
