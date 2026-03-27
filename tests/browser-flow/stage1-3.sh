#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Stage 1-3: Lead Capture, Facility & Quote, Procurement & AI
#
# Env:
#   BASE_URL / BROWSER_FLOW_BASE_URL / BROWSER_FLOW_PORT (default 3100)
#   E2E_CLERK_AM_USERNAME, E2E_CLERK_AM_PASSWORD (or risk manager fallbacks)
#
# Run stack: bun run dev:browser-flow  (uses TEST_DATABASE_URL + E2E_USE_TEST_DB=1).
# Default BASE_URL is http://localhost:3100 (not 127.0.0.1) for Next dev same-origin.
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
# shellcheck source=tests/browser-flow/_lib.sh
source "${SCRIPT_DIR}/_lib.sh"

SCREENSHOT_DIR="${SCRIPT_DIR}/screenshots"
APPLICANT_ID_FILE="${SCRIPT_DIR}/.applicant-id"

mkdir -p "$SCREENSHOT_DIR"

browser_flow_load_env
browser_flow_resolve_base_url

AM_USERNAME="${E2E_CLERK_AM_USERNAME:-${E2E_CLERK_RISKMANAGER_USERNAME:-}}"
AM_PASSWORD="${E2E_CLERK_AM_PASSWORD:-${E2E_CLERK_RISKMANAGER_PASSWORD:-}}"
: "${AM_USERNAME:?Missing E2E_CLERK_AM_USERNAME (or fallback E2E_CLERK_RISKMANAGER_USERNAME)}"
: "${AM_PASSWORD:?Missing E2E_CLERK_AM_PASSWORD (or fallback E2E_CLERK_RISKMANAGER_PASSWORD)}"

cleanup() {
	browser_flow_shot "${SCREENSHOT_DIR}/stage1-3-final.png" 2>/dev/null || true
	agent-browser close 2>/dev/null || true
}
trap cleanup EXIT

verify_no_error_overlay() {
	local result
	result=$(agent-browser eval 'document.querySelector("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay") ? "ERROR_OVERLAY" : "OK"')
	if echo "$result" | grep -q "ERROR_OVERLAY"; then
		echo "ERROR: Framework error overlay detected"
		browser_flow_shot "${SCREENSHOT_DIR}/error-overlay.png"
		exit 1
	fi
}

verify_has_content() {
	local result
	result=$(agent-browser eval 'document.body.innerText.trim().length > 0 ? "HAS_CONTENT" : "BLANK"')
	if echo "$result" | grep -q "BLANK"; then
		echo "ERROR: Page is blank"
		browser_flow_shot "${SCREENSHOT_DIR}/blank-page.png"
		exit 1
	fi
}

echo "=== Stage 1-3: Starting (BASE_URL=${BASE_URL}) ==="

echo "--- Logging into Clerk ---"
agent-browser open "${BASE_URL}/sign-in" && agent-browser wait --load networkidle
sleep 2
verify_no_error_overlay
browser_flow_init_viewport

CURRENT_URL=$(agent-browser get url || true)
if echo "$CURRENT_URL" | grep -q "/dashboard"; then
	echo "--- Session already authenticated; skipping sign-in form ---"
else
	agent-browser snapshot -i
	browser_flow_clerk_login "${AM_USERNAME}" "${AM_PASSWORD}"
fi

agent-browser wait 5000
CURRENT_URL=$(agent-browser get url || true)
if echo "$CURRENT_URL" | grep -q "/sign-in"; then
	echo "ERROR: Clerk login did not complete (still on sign-in)."
	exit 1
fi
verify_no_error_overlay
verify_has_content
echo "--- Logged in successfully ---"

echo "--- Stage 1: Creating new applicant ---"
agent-browser open "${BASE_URL}/dashboard/applicants/new" && agent-browser wait --load networkidle
verify_no_error_overlay
verify_has_content

TIMESTAMP=$(date +%s)
COMPANY_NAME="Browser Flow Test Co ${TIMESTAMP}"
E2E_EMAIL="e2e-browserflow-${TIMESTAMP}@test.co.za"

# agent-browser fill sets DOM value only; React Hook Form ignores it until input events fire.
FIELD_JSON="$(
	COMPANY_NAME="${COMPANY_NAME}" E2E_EMAIL="${E2E_EMAIL}" bun -e '
console.log(JSON.stringify({
	companyName: process.env.COMPANY_NAME,
	registrationNumber: "2024/123456/07",
	contactName: "E2E Test Contact",
	email: process.env.E2E_EMAIL,
	phone: "+27 82 000 0001",
	industry: "Technology",
	employeeCount: "10",
	estimatedTransactionsPerMonth: "100",
}))
'
)"

agent-browser snapshot -i
agent-browser eval --stdin <<EVALEOF
(() => {
	const fields = ${FIELD_JSON};
	const setNative = (el, value) => {
		if (!el) {
			return;
		}
		if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
			return;
		}
		const proto =
			el instanceof HTMLTextAreaElement
				? window.HTMLTextAreaElement.prototype
				: window.HTMLInputElement.prototype;
		const desc = Object.getOwnPropertyDescriptor(proto, "value");
		if (desc?.set) {
			desc.set.call(el, value);
		}
		el.dispatchEvent(new Event("input", { bubbles: true }));
		el.dispatchEvent(new Event("change", { bubbles: true }));
	};
	const pairs = [
		["#companyName", fields.companyName],
		["#registrationNumber", fields.registrationNumber],
		["#contactName", fields.contactName],
		["#email", fields.email],
		["#phone", fields.phone],
		["#industry", fields.industry],
		["#employeeCount", fields.employeeCount],
		["#estimatedTransactionsPerMonth", fields.estimatedTransactionsPerMonth],
	];
	for (const [sel, val] of pairs) {
		setNative(document.querySelector(sel), String(val ?? ""));
	}
	return "OK";
})()
EVALEOF

browser_flow_shot "${SCREENSHOT_DIR}/stage1-form-filled.png"
echo "--- Form filled (RHF-synced), submitting ---"

agent-browser scrollintoview 'button[type="submit"]' 2>/dev/null || true
agent-browser click 'button[type="submit"]'

# Wait for client navigation after POST (avoid networkidle stall on long-lived streams).
for _ in $(seq 1 40); do
	CURRENT_URL=$(agent-browser get url)
	if echo "${CURRENT_URL}" | grep -qE '/dashboard/applicants/[0-9]+'; then
		break
	fi
	sleep 0.25
done
agent-browser wait 1500

CURRENT_URL=$(agent-browser get url)
echo "--- After submit: ${CURRENT_URL} ---"

APPLICANT_ID=$(echo "$CURRENT_URL" | grep -oE 'applicants/[0-9]+' | grep -oE '[0-9]+' || echo "")

if [ -z "$APPLICANT_ID" ]; then
	echo "WARNING: No applicant id in URL; polling /api/applicants (email or company match only)"
	for attempt in $(seq 1 5); do
		APPLICANT_ID=$(agent-browser eval --stdin <<EVALEOF
(async () => {
  const email = "${E2E_EMAIL}".trim().toLowerCase();
  const company = "${COMPANY_NAME}".trim();
  const res = await fetch("/api/applicants");
  const data = await res.json();
  const list = data.applicants || [];
  const byEmail = list.find((a) => String(a.email || "").trim().toLowerCase() === email);
  if (byEmail) return String(byEmail.id);
  const byCompany = list.find((a) => String(a.companyName || "").trim() === company);
  if (byCompany) return String(byCompany.id);
  return "";
})()
EVALEOF
		)
		APPLICANT_ID=$(echo "$APPLICANT_ID" | tr -d '"' | xargs)
		if [ -n "$APPLICANT_ID" ]; then
			break
		fi
		echo "--- API poll ${attempt}/5 ---"
		sleep 1
	done
fi

APPLICANT_ID=$(echo "$APPLICANT_ID" | tr -d '"' | xargs)

if [ -z "$APPLICANT_ID" ]; then
	echo "ERROR: Failed to get APPLICANT_ID (submit did not navigate and no matching row in /api/applicants within ~5s)"
	exit 1
fi

echo "$APPLICANT_ID" > "$APPLICANT_ID_FILE"
echo "--- Stage 1: Applicant ID=${APPLICANT_ID} ---"
browser_flow_shot "${SCREENSHOT_DIR}/stage1-created.png"

echo "--- Verifying overview tab (application details) ---"
agent-browser open "${BASE_URL}/dashboard/applicants/${APPLICANT_ID}?tab=overview"
agent-browser wait --load networkidle
agent-browser wait 5000
verify_no_error_overlay
verify_has_content

OVERVIEW_OK=$(agent-browser eval --stdin <<EVALEOF
(() => {
  const needle = "${COMPANY_NAME}".trim().toLowerCase();
  const t = document.body.innerText.toLowerCase();
  return t.includes(needle) ? "OK" : "MISSING";
})()
EVALEOF
)
OVERVIEW_OK=$(echo "$OVERVIEW_OK" | tr -d '"' | xargs)
if ! echo "$OVERVIEW_OK" | grep -q "OK"; then
	echo "ERROR: Overview tab does not show expected company name: ${COMPANY_NAME}"
	browser_flow_shot "${SCREENSHOT_DIR}/stage1-3-overview-missing.png"
	exit 1
fi
browser_flow_shot "${SCREENSHOT_DIR}/stage1-3-overview.png"
echo "--- Stage 1 PASSED ---"

echo "--- Stage 2: Reviews tab ---"
agent-browser open "${BASE_URL}/dashboard/applicants/${APPLICANT_ID}?tab=reviews"
agent-browser wait --load networkidle
agent-browser wait 2000
verify_no_error_overlay
verify_has_content

BODY_TEXT=$(agent-browser eval 'document.body.innerText.substring(0, 2000)')
if echo "$BODY_TEXT" | grep -qi "reviews\|quote\|facility"; then
	echo "--- Stage 2 PASSED: Reviews tab rendered ---"
else
	echo "WARNING: Reviews/Quote text not found (may be pending for new applicant)"
fi
browser_flow_shot "${SCREENSHOT_DIR}/stage2-reviews.png"

echo "--- Stage 3: Risk Assessment tab ---"
agent-browser open "${BASE_URL}/dashboard/applicants/${APPLICANT_ID}?tab=risk"
agent-browser wait --load networkidle
agent-browser wait 2000
verify_no_error_overlay
verify_has_content

BODY_TEXT=$(agent-browser eval 'document.body.innerText.substring(0, 2000)')
if echo "$BODY_TEXT" | grep -qi "risk\|procurement\|ai analysis\|financial"; then
	echo "--- Stage 3 PASSED: Risk/AI tab rendered ---"
else
	echo "WARNING: Risk/AI content not found, background jobs may still be pending"
fi
browser_flow_shot "${SCREENSHOT_DIR}/stage3-risk.png"

echo "--- Pipeline dashboard ---"
agent-browser open "${BASE_URL}/dashboard"
agent-browser wait --load networkidle
agent-browser wait 2000
verify_no_error_overlay

PIPELINE_TEXT=$(agent-browser eval 'document.body.innerText.substring(0, 3000)')
if echo "$PIPELINE_TEXT" | grep -q "Lead Capture"; then
	echo "--- Pipeline view: stage names visible ---"
fi
browser_flow_shot "${SCREENSHOT_DIR}/stage1-3-pipeline.png"

verify_no_error_overlay
verify_has_content
browser_flow_capture_workflows "workflows-after-stage1-3.png"

echo ""
echo "=== Stage 1-3 COMPLETE ==="
echo "  APPLICANT_ID=${APPLICANT_ID} (saved to ${APPLICANT_ID_FILE})"
echo "  Screenshots in ${SCREENSHOT_DIR}/"
