#!/usr/bin/env bash
# Shared helpers for browser-flow stage scripts (source from repo root context).
# Call browser_flow_load_env after setting SCRIPT_DIR and REPO_ROOT.

browser_flow_load_env() {
	if [ -f "${REPO_ROOT}/.env.local" ]; then
		set -a
		# shellcheck disable=SC1090
		source "${REPO_ROOT}/.env.local"
		set +a
	fi
	if [ -f "${REPO_ROOT}/.env.test" ]; then
		set -a
		# shellcheck disable=SC1090
		source "${REPO_ROOT}/.env.test"
		set +a
	fi
}

# Default app URL for browser-flow (matches dev:browser-flow port).
browser_flow_resolve_base_url() {
	local port="${BROWSER_FLOW_PORT:-3100}"
	BASE_URL="${BASE_URL:-${BROWSER_FLOW_BASE_URL:-http://127.0.0.1:${port}}}"
}

browser_flow_init_viewport() {
	agent-browser set viewport 1920 1080 2>/dev/null || true
}

# Full-page screenshot (agent-browser: --full).
browser_flow_shot() {
	agent-browser screenshot --full "$1"
}

browser_flow_capture_workflows() {
	local name="$1"
	agent-browser open "${BASE_URL}/dashboard/workflows" && agent-browser wait --load networkidle
	agent-browser wait 2000
	browser_flow_shot "${SCREENSHOT_DIR}/${name}"
}
