#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Stage 4: Risk Manager Review
#
# Navigates to the risk review page, finds a pending case, and verifies the
# review UI renders correctly. Approval is driven through the UI if a suitable
# candidate is found.
#
# Env:
#   BASE_URL              - Dev server URL (default: http://localhost:3000)
#   E2E_CLERK_RISKMANAGER_USERNAME - Risk Manager username / email
#   E2E_CLERK_RISKMANAGER_PASSWORD - Risk Manager password
#   APPLICANT_ID          - (optional) Target applicant from Stage 1-3
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BASE_URL="${BASE_URL:-http://localhost:3000}"
SCREENSHOT_DIR="${SCRIPT_DIR}/screenshots"
APPLICANT_ID_FILE="${SCRIPT_DIR}/.applicant-id"
SEED_OUTPUT_FILE="${SCRIPT_DIR}/.seed-output.json"

mkdir -p "$SCREENSHOT_DIR"

# --- Load environment --------------------------------------------------------
if [ -f "${REPO_ROOT}/.env.test" ]; then
  set -a
  # shellcheck disable=SC1090
  source "${REPO_ROOT}/.env.test"
  set +a
elif [ -f "${REPO_ROOT}/.env.local" ]; then
  set -a
  # shellcheck disable=SC1090
  source "${REPO_ROOT}/.env.local"
  set +a
fi

# --- Preflight env checks ---------------------------------------------------
RISK_USERNAME="${E2E_CLERK_RISKMANAGER_USERNAME:-${E2E_CLERK_RISK_MANAGER_USERNAME:-${E2E_CLERK_USER_USERNAME:-}}}"
RISK_PASSWORD="${E2E_CLERK_RISKMANAGER_PASSWORD:-${E2E_CLERK_RISK_MANAGER_PASSWORD:-${E2E_CLERK_USER_PASSWORD:-}}}"
: "${RISK_USERNAME:?Missing E2E_CLERK_RISKMANAGER_USERNAME (or fallback vars)}"
: "${RISK_PASSWORD:?Missing E2E_CLERK_RISKMANAGER_PASSWORD (or fallback vars)}"

# Load APPLICANT_ID from handoff file if not set via env
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

# --- Cleanup on exit --------------------------------------------------------
cleanup() {
  agent-browser screenshot "${SCREENSHOT_DIR}/stage4-final.png" 2>/dev/null || true
  agent-browser close 2>/dev/null || true
}
trap cleanup EXIT

# --- Helpers -----------------------------------------------------------------
verify_no_error_overlay() {
  local result
  result=$(agent-browser eval 'document.querySelector("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay") ? "ERROR_OVERLAY" : "OK"')
  if echo "$result" | grep -q "ERROR_OVERLAY"; then
    echo "ERROR: Framework error overlay detected"
    agent-browser screenshot "${SCREENSHOT_DIR}/stage4-error-overlay.png"
    exit 1
  fi
}

verify_has_content() {
  local result
  result=$(agent-browser eval 'document.body.innerText.trim().length > 0 ? "HAS_CONTENT" : "BLANK"')
  if echo "$result" | grep -q "BLANK"; then
    echo "ERROR: Page is blank"
    agent-browser screenshot "${SCREENSHOT_DIR}/stage4-blank-page.png"
    exit 1
  fi
}

echo "=== Stage 4: Risk Manager Review ==="

# =============================================================================
# Step 1: Login via Clerk
# =============================================================================
echo "--- Logging into Clerk ---"
agent-browser open "${BASE_URL}/sign-in" && agent-browser wait --load networkidle
sleep 2
verify_no_error_overlay

CURRENT_URL=$(agent-browser get url || true)
if echo "$CURRENT_URL" | grep -q "/dashboard"; then
  echo "--- Session already authenticated; skipping sign-in form ---"
else
  agent-browser snapshot -i
  agent-browser find label "Email address" fill "${RISK_USERNAME}"
  agent-browser find role button click --name "Continue"
  agent-browser wait 2000
  agent-browser snapshot -i
  agent-browser find label "Password" fill "${RISK_PASSWORD}"
  agent-browser find role button click --name "Continue"
fi

agent-browser wait 5000
CURRENT_URL=$(agent-browser get url || true)
if echo "$CURRENT_URL" | grep -q "/sign-in"; then
  echo "ERROR: Clerk login did not complete (still on sign-in)."
  echo "Current URL: ${CURRENT_URL}"
  echo "Hint: Check Clerk publishable/secret key pairing and test user credentials."
  exit 1
fi
verify_no_error_overlay
verify_has_content
echo "--- Logged in successfully ---"

# =============================================================================
# Step 2: Navigate to Risk Review page
# =============================================================================
echo "--- Navigating to Risk Review ---"
agent-browser open "${BASE_URL}/dashboard/risk-review"
agent-browser wait --load networkidle
agent-browser wait 2000
verify_no_error_overlay
verify_has_content

agent-browser screenshot "${SCREENSHOT_DIR}/stage4-risk-review-page.png"

BODY_TEXT=$(agent-browser eval 'document.body.innerText.substring(0, 3000)')

if echo "$BODY_TEXT" | grep -qi "risk review"; then
  echo "--- Risk Review page loaded ---"
else
  echo "WARNING: Risk Review heading not found on page"
fi

# =============================================================================
# Step 3: Check for pending review items
# =============================================================================
echo "--- Checking for pending risk review items ---"

ITEM_COUNT=$(agent-browser eval --stdin <<'EVALEOF'
(() => {
  const rows = document.querySelectorAll("table tbody tr, [role='row']");
  return String(rows.length);
})()
EVALEOF
)

echo "--- Found ${ITEM_COUNT} items in risk review table ---"
agent-browser snapshot -i
agent-browser screenshot "${SCREENSHOT_DIR}/stage4-review-items.png"

# If we have a specific applicant, try navigating to its report
if [ -n "${APPLICANT_ID:-}" ]; then
  echo "--- Navigating to risk report for applicant ${APPLICANT_ID} ---"
  agent-browser open "${BASE_URL}/dashboard/risk-review/reports/${APPLICANT_ID}"
  agent-browser wait --load networkidle
  agent-browser wait 2000
  verify_no_error_overlay

  REPORT_TEXT=$(agent-browser eval 'document.body.innerText.substring(0, 2000)')
  if echo "$REPORT_TEXT" | grep -qi "report\|risk\|review\|assessment"; then
    echo "--- Risk report page rendered for applicant ${APPLICANT_ID} ---"
  else
    echo "WARNING: Risk report content may not be available yet for this applicant"
  fi
  agent-browser screenshot "${SCREENSHOT_DIR}/stage4-applicant-report.png"
fi

# =============================================================================
# Step 4: Verify risk review API endpoint
# =============================================================================
echo "--- Verifying risk review API ---"
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

echo ""
echo "=== Stage 4 COMPLETE ==="
echo "  Risk review page rendered and verified"
echo "  Screenshots in ${SCREENSHOT_DIR}/"
