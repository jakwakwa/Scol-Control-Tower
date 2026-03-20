import posthog from "posthog-js";
import { getPostHogProjectToken } from "@/lib/posthog-env";

const posthogProjectToken = getPostHogProjectToken();

if (posthogProjectToken) {
	const debug = process.env.NEXT_PUBLIC_POSTHOG_DEBUG === "true";
	const captureExceptions = process.env.NEXT_PUBLIC_POSTHOG_CAPTURE_EXCEPTIONS === "true";
	const sessionRecording = process.env.NEXT_PUBLIC_POSTHOG_SESSION_RECORDING === "true";

	posthog.init(posthogProjectToken, {
		api_host: "/ingest",
		ui_host: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST ?? "https://us.posthog.com",
		defaults: "2026-01-30",
		capture_exceptions: captureExceptions,
		debug,
		// Session replay is expensive (CPU, bandwidth, storage). Opt in explicitly.
		disable_session_recording: !sessionRecording,
	});
}
