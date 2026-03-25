#!/usr/bin/env bash
# Browser-flow dev stack: Next.js on BROWSER_FLOW_PORT (default 3100) + Inngest dev.
# Uses TEST_DATABASE_URL via E2E_USE_TEST_DB=1 (same as Playwright webServer).
#
# Prerequisites: .env.test with TEST_DATABASE_URL (+ TEST_TURSO_GROUP_AUTH_TOKEN).
# Optional: .env.local for Clerk and other keys (sourced first so .env.test overrides TEST_*).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

cleanup() {
	echo ""
	echo "Stopping browser-flow dev services..."
	kill $(jobs -p) 2>/dev/null || true
	exit
}

trap cleanup SIGINT SIGTERM

BROWSER_FLOW_PORT="${BROWSER_FLOW_PORT:-3100}"

if [ -f "${SCRIPT_DIR}/.env.local" ]; then
	set -a
	# shellcheck disable=SC1090
	source "${SCRIPT_DIR}/.env.local"
	set +a
fi
if [ -f "${SCRIPT_DIR}/.env.test" ]; then
	set -a
	# shellcheck disable=SC1090
	source "${SCRIPT_DIR}/.env.test"
	set +a
fi

export E2E_USE_TEST_DB=1
export INNGEST_BASE_URL="${INNGEST_BASE_URL:-http://127.0.0.1:8288}"

if [ -z "${TEST_DATABASE_URL:-}" ]; then
	echo "ERROR: TEST_DATABASE_URL is not set. Add it to .env.test (see .env.test.example)."
	exit 1
fi

echo "Starting browser-flow dev stack..."
echo "  Port:            ${BROWSER_FLOW_PORT}"
echo "  Test DB:         E2E_USE_TEST_DB=1 (TEST_DATABASE_URL)"
echo "  Inngest UI:      ${INNGEST_BASE_URL}"
echo ""

echo "Starting Inngest dev (sync to Next /api/inngest)..."
bun x inngest-cli@latest dev -u "http://127.0.0.1:${BROWSER_FLOW_PORT}/api/inngest" &
sleep 3

echo "Starting Next.js (turbo) on port ${BROWSER_FLOW_PORT}..."
bun run dev -- --turbo --port "${BROWSER_FLOW_PORT}" &

echo ""
echo "Browser-flow dev ready:"
echo "  App:    http://127.0.0.1:${BROWSER_FLOW_PORT}"
echo "  Inngest: ${INNGEST_BASE_URL}"
echo "Press Ctrl+C to stop."
echo ""

wait
