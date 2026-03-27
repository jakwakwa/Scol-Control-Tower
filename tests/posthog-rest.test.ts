import { afterEach, describe, expect, it } from "bun:test";
import { resolvePostHogApiHost } from "@/lib/posthog-rest";

describe("resolvePostHogApiHost", () => {
	const prev: Record<string, string | undefined> = {};

	afterEach(() => {
		for (const k of Object.keys(prev)) {
			const v = prev[k];
			if (v === undefined) delete process.env[k];
			else process.env[k] = v;
		}
		for (const k of Object.keys(prev)) delete prev[k];
	});

	function setEnv(key: string, value: string | undefined): void {
		if (!(key in prev)) prev[key] = process.env[key];
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}

	it("uses POSTHOG_API_HOST when set", () => {
		setEnv("POSTHOG_API_HOST", "https://eu.posthog.com/");
		setEnv("NEXT_PUBLIC_POSTHOG_HOST", undefined);
		expect(resolvePostHogApiHost()).toBe("https://eu.posthog.com");
	});

	it("falls back to app host when NEXT_PUBLIC is ingest", () => {
		setEnv("POSTHOG_API_HOST", undefined);
		setEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://us.i.posthog.com");
		expect(resolvePostHogApiHost()).toBe("https://us.posthog.com");
	});

	it("uses NEXT_PUBLIC_POSTHOG_HOST when it is not ingest-only", () => {
		setEnv("POSTHOG_API_HOST", undefined);
		setEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://us.posthog.com");
		expect(resolvePostHogApiHost()).toBe("https://us.posthog.com");
	});
});
