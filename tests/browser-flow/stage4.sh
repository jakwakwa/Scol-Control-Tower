#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Stage 4: Risk Manager Review
#
# Env: BASE_URL (default http://127.0.0.1:3100), APPLICANT_ID optional
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
# shellcheck source=tests/browser-flow/_lib.sh
source "${SCRIPT_DIR}/_lib.sh"

SCREENSHOT_DIR="${SCRIPT_DIR}/screenshots"
APPLICANT_ID_FILE="${SCRIPT_DIR}/.applicant-id"
SEED_OUTPUT_FILE="${SCRIPT_DIR}/.seed-output.json"

mkdir -p "$SCREENSHOT_DIR"

browser_flow_load_env
browser_flow_resolve_base_url

RISK_USERNAME="${E2E_CLERK_RISKMANAGER_USERNAME:-${E2E_CLERK_RISK_MANAGER_USERNAME:-}}"
RISK_PASSWORD="${E2E_CLERK_RISKMANAGER_PASSWORD:-${E2E_CLERK_RISK_MANAGER_PASSWORD:-}}"
: "${RISK_USERNAME:?Missing E2E_CLERK_RISKMANAGER_USERNAME (or E2E_CLERK_RISK_MANAGER_USERNAME)}"
: "${RISK_PASSWORD:?Missing E2E_CLERK_RISKMANAGER_PASSWORD (or E2E_CLERK_RISK_MANAGER_PASSWORD)}"

if [ -z "${APPLICANT_ID:-}" ] && [ -f "$APPLICANT_ID_FILE" ]; then
	APPLICANT_ID=$(cat "$APPLICANT_ID_FILE")
	APPLICANT_ID=$(echo "$APPLICANT_ID" | tr -d '"' | xargs)
	echo "--- Loaded APPLICANT_ID=${APPLICANT_ID} from handoff file ---"
fi

if [ -z "${APPLICANT_ID:-}" ] && [ -f "$SEED_OUTPUT_FILE" ]; then
	APPLICANT_ID=$(bun -e "const fs=require('fs');const o=JSON.parse(fs.readFileSync('$SEED_OUTPUT_FILE','utf8'));process.stdout.write(String(o.stage4ApplicantId||''));")
	APPLICANT_ID=$(echo "$APPLICANT_ID" | tr -d '"' | xargs)
	if [ -n "$APPLICANT_ID" ]; then
		echo "--- Loaded APPLICANT_ID=${APPLICANT_ID} from seed output ---"
	fi
fi

cleanup() {
	browser_flow_shot "${SCREENSHOT_DIR}/stage4-final.png" 2>/dev/null || true
	agent-browser close 2>/dev/null || true
}
trap cleanup EXIT

verify_no_error_overlay() {
	local result
	result=$(agent-browser eval 'document.querySelector("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay") ? "ERROR_OVERLAY" : "OK"')
	if echo "$result" | grep -q "ERROR_OVERLAY"; then
		echo "ERROR: Framework error overlay detected"
		browser_flow_shot "${SCREENSHOT_DIR}/stage4-error-overlay.png"
		exit 1
	fi
}

verify_has_content() {
	local result
	result=$(agent-browser eval 'document.body.innerText.trim().length > 0 ? "HAS_CONTENT" : "BLANK"')
	if echo "$result" | grep -q "BLANK"; then
		echo "ERROR: Page is blank"
		browser_flow_shot "${SCREENSHOT_DIR}/stage4-blank-page.png"
		exit 1
	fi
}

echo "=== Stage 4: Risk Manager Review (BASE_URL=${BASE_URL}) ==="

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
	browser_flow_clerk_login "${RISK_USERNAME}" "${RISK_PASSWORD}"
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

echo "--- Risk Review index ---"
agent-browser open "${BASE_URL}/dashboard/risk-review"
agent-browser wait --load networkidle
agent-browser wait 2000
verify_no_error_overlay
verify_has_content

browser_flow_shot "${SCREENSHOT_DIR}/stage4-risk-review-page.png"

BODY_TEXT=$(agent-browser eval 'document.body.innerText.substring(0, 3000)')
if echo "$BODY_TEXT" | grep -qi "risk review"; then
	echo "--- Risk Review page loaded ---"
else
	echo "WARNING: Risk Review heading not found on page"
fi

echo "--- Pending risk review items ---"
ITEM_COUNT=$(agent-browser eval --stdin <<'EVALEOF'
(() => {
  const rows = document.querySelectorAll("table tbody tr, [role='row']");
  return String(rows.length);
})()
EVALEOF
)
echo "--- Found ${ITEM_COUNT} items in risk review table ---"
agent-browser snapshot -i
browser_flow_shot "${SCREENSHOT_DIR}/stage4-review-items.png"

if [ -n "${APPLICANT_ID:-}" ]; then
	echo "--- Risk report for applicant ${APPLICANT_ID} (all profile tabs) ---"
	agent-browser open "${BASE_URL}/dashboard/risk-review/reports/${APPLICANT_ID}"
	agent-browser wait --load networkidle
	agent-browser wait 2500
	verify_no_error_overlay
	verify_has_content

	REPORT_TEXT=$(agent-browser eval 'document.body.innerText.substring(0, 2000)')
	if echo "$REPORT_TEXT" | grep -qi "report\|risk\|review\|assessment\|procurement"; then
		echo "--- Risk report shell rendered ---"
	else
		echo "WARNING: Risk report content may be sparse for this applicant"
	fi

	click_risk_profile_tab() {
		local label="$1"
		local out="$2"
		agent-browser find role button click --name "${label}" || {
			echo "WARNING: Could not click tab: ${label}"
		}
		agent-browser wait 1500
		browser_flow_shot "${SCREENSHOT_DIR}/${out}"
	}

	click_risk_profile_tab "Procurement" "stage4-risk-report-procurement.png"
	click_risk_profile_tab "ITC Credit" "stage4-risk-report-itc.png"
	click_risk_profile_tab "Sanctions & AML" "stage4-risk-report-sanctions.png"
	click_risk_profile_tab "FICA / KYC" "stage4-risk-report-fica.png"
fi

echo "--- Risk review API ---"
API_RESULT=$(agent-browser eval --stdin <<'EVALEOF'
(async () => {
  try {
    const res = await fetch("/api/risk-review");
    const data = await res.json();
    return JSON.stringify({ status: res.status, count: data.count || 0, itemCount: (data.items || []).length });
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
})()
EVALEOF
)
echo "--- Risk review API response: ${API_RESULT} ---"

verify_no_error_overlay
verify_has_content
browser_flow_capture_workflows "workflows-after-stage4.png"

echo ""
echo "=== Stage 4 COMPLETE ==="
echo "  Screenshots in ${SCREENSHOT_DIR}/"
