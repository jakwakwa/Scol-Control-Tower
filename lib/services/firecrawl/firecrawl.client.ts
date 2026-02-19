/**
 * Firecrawl Client Wrapper
 *
 * Thin service layer over @mendable/firecrawl-js (v2 API) that handles:
 * - SDK initialisation and auth via FIRECRAWL_API_KEY
 * - Structured JSON extraction using Zod schemas
 * - Consistent error handling and timeout semantics
 *
 * Uses the default `Firecrawl` export (v2 client) which exposes
 * `scrape(url, { formats: [{ type: "json", schema }] })`.
 * The v2 client returns a Document directly and throws on failure.
 */

import Firecrawl from "@mendable/firecrawl-js";
import type { z } from "zod";

import type {
	FailureDetail,
	RuntimeState,
} from "@/lib/services/agents/contracts/firecrawl-check.contracts";

export type { RuntimeState, FailureDetail };

export interface ScrapeOptions<T extends z.ZodType> {
	url: string;
	schema: T;
	prompt?: string;
	timeoutMs?: number;
}

export interface ScrapeResult<T> {
	success: boolean;
	data: T | null;
	runtimeState: RuntimeState;
	failureDetail?: FailureDetail;
	latencyMs: number;
	sourceUrl: string;
}

let _client: Firecrawl | null = null;

function getClient(): Firecrawl {
	if (_client) return _client;

	const apiKey = process.env.FIRECRAWL_API_KEY;
	if (!apiKey) {
		throw new Error(
			"FIRECRAWL_API_KEY is not set. Add it to .env to enable Firecrawl checks."
		);
	}

	_client = new Firecrawl({ apiKey });
	return _client;
}

/**
 * Scrape a URL and extract structured data matching the provided Zod schema.
 *
 * The Firecrawl v2 SDK accepts Zod schemas directly in
 * `formats: [{ type: "json", schema }]` and returns the document
 * directly (throws on HTTP/network errors).
 */
export async function scrapeWithSchema<T extends z.ZodType>(
	options: ScrapeOptions<T>
): Promise<ScrapeResult<z.infer<T>>> {
	const { url, schema, prompt, timeoutMs = 30_000 } = options;
	const start = Date.now();

	try {
		const client = getClient();

		const jsonFormat: { type: "json"; schema: T; prompt?: string } = {
			type: "json" as const,
			schema,
		};
		if (prompt) jsonFormat.prompt = prompt;

		const response = await client.scrape(url, {
			formats: [jsonFormat],
			timeout: timeoutMs,
		});

		const latencyMs = Date.now() - start;

		const json = response.json;

		if (json == null) {
			return {
				success: false,
				data: null,
				runtimeState: "partial",
				failureDetail: {
					code: "partial",
					message: "Firecrawl returned no JSON extraction data",
					retryPolicy: "backoff",
				},
				latencyMs,
				sourceUrl: url,
			};
		}

		const parsed = schema.safeParse(json);
		if (!parsed.success) {
			return {
				success: true,
				data: json as z.infer<T>,
				runtimeState: "partial",
				failureDetail: {
					code: "partial",
					message: `Schema validation partial: ${parsed.error.message}`,
					retryPolicy: "backoff",
				},
				latencyMs,
				sourceUrl: url,
			};
		}

		return {
			success: true,
			data: parsed.data,
			runtimeState: "success",
			latencyMs,
			sourceUrl: url,
		};
	} catch (error) {
		const latencyMs = Date.now() - start;
		const message = error instanceof Error ? error.message : "Unknown Firecrawl error";

		const isBlocked =
			message.includes("403") ||
			message.includes("blocked") ||
			message.includes("Cloudflare") ||
			message.includes("captcha");

		const runtimeState: RuntimeState = isBlocked ? "blocked" : "error";

		return {
			success: false,
			data: null,
			runtimeState,
			failureDetail: {
				code: runtimeState,
				message,
				retryPolicy: isBlocked ? "backoff" : "immediate",
				blockedReason: isBlocked ? message : undefined,
			},
			latencyMs,
			sourceUrl: url,
		};
	}
}

/** Convenience: check if the Firecrawl API key is configured */
export function isFirecrawlConfigured(): boolean {
	return !!process.env.FIRECRAWL_API_KEY;
}
