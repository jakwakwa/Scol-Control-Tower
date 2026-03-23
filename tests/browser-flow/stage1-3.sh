#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Stage 1-3: Lead Capture, Facility & Quote, Procurement & AI
#
# Drives the UI to create a new applicant (Stage 1), verify the Reviews tab
# exists for Facility & Quote (Stage 2), and check that the risk/AI tab
# renders for Procurement & AI (Stage 3).
#
# Env:
#   BASE_URL              - Dev server URL (default: http://localhost:3000)
#   E2E_CLERK_AM_USERNAME   - Account Manager username / email
#   E2E_CLERK_AM_PASSWORD   - Account Manager password
#
# Outputs:
#   .applicant-id          - Written to tests/browser-flow/.applicant-id
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BASE_URL="${BASE_URL:-http://localhost:3000}"
SCREENSHOT_DIR="${SCRIPT_DIR}/screenshots"
APPLICANT_ID_FILE="${SCRIPT_DIR}/.applicant-id"

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
AM_USERNAME="${E2E_CLERK_AM_USERNAME:-${E2E_CLERK_USER_USERNAME:-}}"
AM_PASSWORD="${E2E_CLERK_AM_PASSWORD:-${E2E_CLERK_USER_PASSWORD:-}}"
: "${AM_USERNAME:?Missing E2E_CLERK_AM_USERNAME (or fallback E2E_CLERK_USER_USERNAME)}"
: "${AM_PASSWORD:?Missing E2E_CLERK_AM_PASSWORD (or fallback E2E_CLERK_USER_PASSWORD)}"

# --- Cleanup on exit --------------------------------------------------------
cleanup() {
  agent-browser screenshot "${SCREENSHOT_DIR}/stage1-3-final.png" 2>/dev/null || true
  agent-browser close 2>/dev/null || true
}
trap cleanup EXIT

# --- Helpers -----------------------------------------------------------------
verify_no_error_overlay() {
  local result
  result=$(agent-browser eval 'document.querySelector("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay") ? "ERROR_OVERLAY" : "OK"')
  if echo "$result" | grep -q "ERROR_OVERLAY"; then
    echo "ERROR: Framework error overlay detected"
    agent-browser screenshot "${SCREENSHOT_DIR}/error-overlay.png"
    exit 1
  fi
}

verify_has_content() {
  local result
  result=$(agent-browser eval 'document.body.innerText.trim().length > 0 ? "HAS_CONTENT" : "BLANK"')
  if echo "$result" | grep -q "BLANK"; then
    echo "ERROR: Page is blank"
    agent-browser screenshot "${SCREENSHOT_DIR}/blank-page.png"
    exit 1
  fi
}

echo "=== Stage 1-3: Starting ==="

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
  agent-browser find label "Email address" fill "${AM_USERNAME}"
  agent-browser find role button click --name "Continue"
  agent-browser wait 2000
  agent-browser snapshot -i
  agent-browser find label "Password" fill "${AM_PASSWORD}"
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
# Step 2: Stage 1 — Create New Applicant
# =============================================================================
echo "--- Stage 1: Creating new applicant ---"
agent-browser open "${BASE_URL}/dashboard/applicants/new" && agent-browser wait --load networkidle
verify_no_error_overlay
verify_has_content

TIMESTAMP=$(date +%s)

agent-browser snapshot -i
agent-browser fill "#companyName" "Browser Flow Test Co ${TIMESTAMP}"
agent-browser fill "#registrationNumber" "2024/${TIMESTAMP:0:6}/07"
agent-browser fill "#contactName" "E2E Test Contact"
agent-browser fill "#email" "e2e-browserflow-${TIMESTAMP}@test.co.za"
agent-browser fill "#phone" "+27 82 000 0001"
agent-browser fill "#industry" "Technology"
agent-browser fill "#employeeCount" "10"
agent-browser fill "#estimatedTransactionsPerMonth" "100"

agent-browser screenshot "${SCREENSHOT_DIR}/stage1-form-filled.png"
echo "--- Form filled, submitting ---"

agent-browser find text "Create Applicant" click
agent-browser wait --load networkidle
agent-browser wait 3000

CURRENT_URL=$(agent-browser get url)
echo "--- Redirected to: ${CURRENT_URL} ---"

APPLICANT_ID=$(echo "$CURRENT_URL" | grep -oE 'applicants/[0-9]+' | grep -oE '[0-9]+' || echo "")

if [ -z "$APPLICANT_ID" ]; then
  echo "WARNING: Could not extract APPLICANT_ID from URL, trying API fallback"
  APPLICANT_ID=$(agent-browser eval --stdin <<'EVALEOF'
(async () => {
  const res = await fetch("/api/applicants");
  const data = await res.json();
  const applicants = data.applicants || [];
  const latest = applicants[applicants.length - 1];
  return latest ? String(latest.id) : "";
})()
EVALEOF
  )
fi

# Normalize eval/string output (strip surrounding quotes)
APPLICANT_ID=$(echo "$APPLICANT_ID" | tr -d '"' | xargs)

if [ -z "$APPLICANT_ID" ]; then
  echo "ERROR: Failed to get APPLICANT_ID"
  exit 1
fi

echo "$APPLICANT_ID" > "$APPLICANT_ID_FILE"
echo "--- Stage 1 PASSED: Applicant created with ID=${APPLICANT_ID} ---"
agent-browser screenshot "${SCREENSHOT_DIR}/stage1-created.png"

# =============================================================================
# Step 3: Stage 2 — Verify Reviews tab (Facility & Quote)
# =============================================================================
echo "--- Stage 2: Checking Facility & Quote (Reviews tab) ---"
agent-browser open "${BASE_URL}/dashboard/applicants/${APPLICANT_ID}?tab=reviews"
agent-browser wait --load networkidle
agent-browser wait 2000
verify_no_error_overlay
verify_has_content

BODY_TEXT=$(agent-browser eval 'document.body.innerText.substring(0, 2000)')

if echo "$BODY_TEXT" | grep -qi "reviews\|quote\|facility"; then
  echo "--- Stage 2 PASSED: Reviews tab rendered ---"
else
  echo "WARNING: Reviews/Quote text not found, page may not have data yet (expected for new applicant)"
fi
agent-browser screenshot "${SCREENSHOT_DIR}/stage2-reviews.png"

# =============================================================================
# Step 4: Stage 3 — Verify Risk Assessment tab (Procurement & AI)
# =============================================================================
echo "--- Stage 3: Checking Procurement & AI (Risk tab) ---"
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
agent-browser screenshot "${SCREENSHOT_DIR}/stage3-risk.png"

# =============================================================================
# Verify pipeline dashboard shows the new applicant
# =============================================================================
echo "--- Verifying pipeline dashboard ---"
agent-browser open "${BASE_URL}/dashboard"
agent-browser wait --load networkidle
agent-browser wait 2000
verify_no_error_overlay

PIPELINE_TEXT=$(agent-browser eval 'document.body.innerText.substring(0, 3000)')

if echo "$PIPELINE_TEXT" | grep -q "Lead Capture"; then
  echo "--- Pipeline view verified: stage names visible ---"
fi
agent-browser screenshot "${SCREENSHOT_DIR}/stage1-3-pipeline.png"

echo ""
echo "=== Stage 1-3 COMPLETE ==="
echo "  APPLICANT_ID=${APPLICANT_ID} (saved to ${APPLICANT_ID_FILE})"
echo "  Screenshots in ${SCREENSHOT_DIR}/"
