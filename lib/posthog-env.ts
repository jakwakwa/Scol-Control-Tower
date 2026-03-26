/**
 * PostHog project API key used by posthog-js and posthog-node for capture and flags.
 * The wizard and some env files use `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`; others use `NEXT_PUBLIC_POSTHOG_KEY` — both are supported.
 */
export function getPostHogProjectToken(): string | undefined {
	const a = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
	const b = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
	return a || b || undefined;
}
