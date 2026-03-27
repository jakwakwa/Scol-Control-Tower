/**
 * PostHog private REST API (project scope). Uses POSTHOG_PERSONAL_API_KEY — never expose to the client.
 * Ingest URLs (*.i.posthog.com) cannot serve /api/projects/...; use POSTHOG_API_HOST when needed.
 */

const DEFAULT_HOST = "https://us.posthog.com";

export function resolvePostHogApiHost(): string {
	const explicit = process.env.POSTHOG_API_HOST?.trim();
	if (explicit) return explicit.replace(/\/$/, "");
	const pub = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim().replace(/\/$/, "") || "";
	if (/\.i\.posthog\.com/i.test(pub) || /\/ingest\b/i.test(pub)) return DEFAULT_HOST;
	if (pub) return pub;
	return DEFAULT_HOST;
}

export function getPostHogProjectId(): string {
	return process.env.POSTHOG_PROJECT_ID?.trim() || "349918";
}

export function getPostHogPersonalApiKey(): string | undefined {
	return process.env.POSTHOG_PERSONAL_API_KEY?.trim() || undefined;
}

export function buildPostHogInsightWebUrl(projectId: string, insightShortId: string): string {
	const host = resolvePostHogApiHost().replace(/\/$/, "");
	return `${host}/project/${projectId}/insights/${insightShortId}`;
}

export function buildPostHogDashboardWebUrl(projectId: string, dashboardId: number): string {
	const host = resolvePostHogApiHost().replace(/\/$/, "");
	return `${host}/project/${projectId}/dashboards/${dashboardId}`;
}

export class PostHogRestError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly url: string,
		readonly responseBody?: string
	) {
		super(message);
		this.name = "PostHogRestError";
	}
}

/**
 * Authenticated fetch to `/api/projects/:projectId/...`.
 */
export async function posthogProjectFetch<T>(
	path: string,
	init?: RequestInit & { projectId?: string }
): Promise<T> {
	const apiKey = getPostHogPersonalApiKey();
	if (!apiKey) {
		throw new Error("POSTHOG_PERSONAL_API_KEY is not configured");
	}
	const host = resolvePostHogApiHost();
	const projectId = init?.projectId ?? getPostHogProjectId();
	const base = host.replace(/\/$/, "");
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	const url = `${base}/api/projects/${projectId}${normalizedPath}`;
	const res = await fetch(url, {
		...init,
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
			...init?.headers,
		},
	});
	const text = await res.text();
	let data: unknown = text;
	try {
		data = text ? JSON.parse(text) : null;
	} catch {
		/* keep text */
	}
	if (!res.ok) {
		let msg = `PostHog API ${res.status} ${url}: ${typeof data === "string" ? data : JSON.stringify(data)}`;
		if (res.status === 401 && apiKey.startsWith("phc_")) {
			msg +=
				"\n\nHint: Bearer token looks like a project key (phc_…). Use POSTHOG_PERSONAL_API_KEY (phx_…) for the REST API.";
		}
		throw new PostHogRestError(msg, res.status, url, typeof data === "string" ? data : JSON.stringify(data));
	}
	return data as T;
}
