#!/usr/bin/env bash
# Shared helpers for browser-flow stage scripts (source from repo root context).
# Call browser_flow_load_env after setting SCRIPT_DIR and REPO_ROOT.

# .env.test first (TEST_*, E2E_*), then .env.local so Clerk keys match the dashboard (no redirect loops).
browser_flow_load_env() {
	if [ -f "${REPO_ROOT}/.env.test" ]; then
		set -a
		# shellcheck disable=SC1090
		source "${REPO_ROOT}/.env.test"
		set +a
	fi
	if [ -f "${REPO_ROOT}/.env.local" ]; then
		set -a
		# shellcheck disable=SC1090
		source "${REPO_ROOT}/.env.local"
		set +a
	fi
}

# Default http://localhost — matches Next dev "Local" URL; 127.0.0.1 triggers Next 16 dev cross-origin blocks.
browser_flow_resolve_base_url() {
	local port="${BROWSER_FLOW_PORT:-3100}"
	BASE_URL="${BASE_URL:-${BROWSER_FLOW_BASE_URL:-http://localhost:${port}}}"
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

# Clerk <SignIn /> uses name="identifier" and name="password" on inputs; label text varies by theme.
# Prefer those selectors — "find label Email address" often fails when snapshot lists no interactive elements.
browser_flow_clerk_login() {
	local username="$1"
	local password="$2"
	agent-browser wait 5000
	agent-browser wait 'input[name="identifier"]' 2>/dev/null || true
	agent-browser fill 'input[name="identifier"]' "${username}" ||
		agent-browser fill 'input[type="email"]' "${username}" ||
		agent-browser find label "Email address" fill "${username}" ||
		agent-browser find label "Email" fill "${username}"
	agent-browser find role button click --name "Continue"
	agent-browser wait 3000
	agent-browser fill 'input[name="password"]' "${password}" ||
		agent-browser find label "Password" fill "${password}"
	agent-browser find role button click --name "Continue"
}
