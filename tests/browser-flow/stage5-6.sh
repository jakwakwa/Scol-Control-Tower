#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Stage 5-6: Contract & Two-Factor Final Approval
#
# Navigates to the applicant detail page, verifies contract/workflow gates UI
# (Stage 5), and drives the two-factor approval buttons (Stage 6) if the
# workflow has reached the appropriate stage.
#
# Env:
#   BASE_URL              - Dev server URL (default: http://localhost:3000)
#   E2E_CLERK_USER_USERNAME - Clerk username / email
#   E2E_CLERK_USER_PASSWORD - Clerk password
#   APPLICANT_ID          - (optional) Target applicant from Stage 1-3
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_URL="${BASE_URL:-http://localhost:3000}"
SCREENSHOT_DIR="${SCRIPT_DIR}/screenshots"
APPLICANT_ID_FILE="${SCRIPT_DIR}/.applicant-id"

mkdir -p "$SCREENSHOT_DIR"

# --- Preflight env checks ---------------------------------------------------
: "${E2E_CLERK_USER_USERNAME:?Missing E2E_CLERK_USER_USERNAME}"
: "${E2E_CLERK_USER_PASSWORD:?Missing E2E_CLERK_USER_PASSWORD}"

# Load APPLICANT_ID from handoff file if not set via env
if [ -z "${APPLICANT_ID:-}" ] && [ -f "$APPLICANT_ID_FILE" ]; then
  APPLICANT_ID=$(cat "$APPLICANT_ID_FILE")
  echo "--- Loaded APPLICANT_ID=${APPLICANT_ID} from handoff file ---"
fi

if [ -z "${APPLICANT_ID:-}" ]; then
  echo "ERROR: APPLICANT_ID is required for Stage 5-6."
  echo "  Run stage1-3.sh first or set APPLICANT_ID env var."
  exit 1
fi

# --- Cleanup on exit --------------------------------------------------------
cleanup() {
  agent-browser screenshot "${SCREENSHOT_DIR}/stage5-6-final.png" 2>/dev/null || true
  agent-browser close 2>/dev/null || true
}
trap cleanup EXIT

# --- Helpers -----------------------------------------------------------------
verify_no_error_overlay() {
  local result
  result=$(agent-browser eval 'document.querySelector("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay") ? "ERROR_OVERLAY" : "OK"')
  if echo "$result" | grep -q "ERROR_OVERLAY"; then
    echo "ERROR: Framework error overlay detected"
    agent-browser screenshot "${SCREENSHOT_DIR}/stage5-6-error-overlay.png"
    exit 1
  fi
}

verify_has_content() {
  local result
  result=$(agent-browser eval 'document.body.innerText.trim().length > 0 ? "HAS_CONTENT" : "BLANK"')
  if echo "$result" | grep -q "BLANK"; then
    echo "ERROR: Page is blank"
    agent-browser screenshot "${SCREENSHOT_DIR}/stage5-6-blank-page.png"
    exit 1
  fi
}

echo "=== Stage 5-6: Contract & Final Approval ==="
echo "  APPLICANT_ID=${APPLICANT_ID}"

# =============================================================================
# Step 1: Login via Clerk
# =============================================================================
echo "--- Logging into Clerk ---"
agent-browser open "${BASE_URL}/sign-in" && agent-browser wait --load networkidle
sleep 2
verify_no_error_overlay

agent-browser snapshot -i
agent-browser find label "Email address" fill "${E2E_CLERK_USER_USERNAME}"
agent-browser find role button click --name "Continue"
agent-browser wait 2000
agent-browser snapshot -i
agent-browser find label "Password" fill "${E2E_CLERK_USER_PASSWORD}"
agent-browser find role button click --name "Continue"

agent-browser wait --url "**/dashboard" || agent-browser wait 5000
verify_no_error_overlay
verify_has_content
echo "--- Logged in successfully ---"

# =============================================================================
# Step 2: Stage 5 — Navigate to applicant detail for contract review
# =============================================================================
echo "--- Stage 5: Checking applicant detail for contract gates ---"
agent-browser open "${BASE_URL}/dashboard/applicants/${APPLICANT_ID}"
agent-browser wait --load networkidle
agent-browser wait 2000
verify_no_error_overlay
verify_has_content

agent-browser screenshot "${SCREENSHOT_DIR}/stage5-applicant-detail.png"

# Check for workflow gates (Contract Draft Review / ABSA Confirm)
BODY_TEXT=$(agent-browser eval 'document.body.innerText.substring(0, 4000)')

if echo "$BODY_TEXT" | grep -qi "Workflow Gates\|Contract Draft Review\|Mark Contract Reviewed"; then
  echo "--- Stage 5: Workflow Gates card visible ---"

  # Try to click "Mark Contract Reviewed" and confirm in the drawer
  agent-browser snapshot -i
  HAS_CONTRACT_BTN=$(agent-browser eval --stdin <<'EVALEOF'
(() => {
  const btns = Array.from(document.querySelectorAll("button"));
  const contractBtn = btns.find(b => b.textContent.includes("Mark Contract Reviewed"));
  return contractBtn ? "FOUND" : "NOT_FOUND";
})()
EVALEOF
  )

  if echo "$HAS_CONTRACT_BTN" | grep -q "FOUND"; then
    echo "--- Clicking 'Mark Contract Reviewed' ---"
    agent-browser find text "Mark Contract Reviewed" click
    agent-browser wait 1000
    agent-browser snapshot -i
    agent-browser screenshot "${SCREENSHOT_DIR}/stage5-contract-drawer.png"

    # Try to confirm in the drawer
    HAS_CONFIRM=$(agent-browser eval --stdin <<'EVALEOF'
(() => {
  const btns = Array.from(document.querySelectorAll("button"));
  const confirmBtn = btns.find(b => b.textContent.includes("Yes, approve review"));
  return confirmBtn ? "FOUND" : "NOT_FOUND";
})()
EVALEOF
    )
    if echo "$HAS_CONFIRM" | grep -q "FOUND"; then
      agent-browser find text "Yes, approve review" click
      agent-browser wait 2000
      echo "--- Contract review approved ---"
    fi
  else
    echo "--- Contract review button not available (workflow may not be at this stage) ---"
  fi
else
  echo "--- Workflow Gates not visible (applicant may not be at Stage 5 yet) ---"
fi

agent-browser screenshot "${SCREENSHOT_DIR}/stage5-after-contract.png"

# =============================================================================
# Step 3: Stage 6 — Two-Factor Final Approval
# =============================================================================
echo "--- Stage 6: Checking Two-Factor Final Approval ---"

# Navigate to reviews tab where the approval section lives
agent-browser open "${BASE_URL}/dashboard/applicants/${APPLICANT_ID}?tab=reviews"
agent-browser wait --load networkidle
agent-browser wait 2000
verify_no_error_overlay

BODY_TEXT=$(agent-browser eval 'document.body.innerText.substring(0, 4000)')

if echo "$BODY_TEXT" | grep -qi "Two-Factor Final Approval"; then
  echo "--- Two-Factor Final Approval section visible ---"

  # Drive RM Approve
  HAS_RM=$(agent-browser eval --stdin <<'EVALEOF'
(() => {
  const btns = Array.from(document.querySelectorAll("button"));
  const rmBtn = btns.find(b => b.textContent.includes("RM Approve"));
  return rmBtn && !rmBtn.disabled ? "FOUND" : "NOT_FOUND";
})()
EVALEOF
  )

  if echo "$HAS_RM" | grep -q "FOUND"; then
    echo "--- Clicking 'RM Approve' ---"
    agent-browser find text "RM Approve" click
    agent-browser wait 2000
    agent-browser screenshot "${SCREENSHOT_DIR}/stage6-rm-approved.png"
    echo "--- RM Approval submitted ---"
  else
    echo "--- RM Approve button not available or disabled ---"
  fi

  # Drive AM Approve
  HAS_AM=$(agent-browser eval --stdin <<'EVALEOF'
(() => {
  const btns = Array.from(document.querySelectorAll("button"));
  const amBtn = btns.find(b => b.textContent.includes("AM Approve"));
  return amBtn && !amBtn.disabled ? "FOUND" : "NOT_FOUND";
})()
EVALEOF
  )

  if echo "$HAS_AM" | grep -q "FOUND"; then
    echo "--- Clicking 'AM Approve' ---"
    agent-browser find text "AM Approve" click
    agent-browser wait 2000
    agent-browser screenshot "${SCREENSHOT_DIR}/stage6-am-approved.png"
    echo "--- AM Approval submitted ---"
  else
    echo "--- AM Approve button not available or disabled ---"
  fi

  # Check for completion
  agent-browser wait 2000
  FINAL_TEXT=$(agent-browser eval 'document.body.innerText.substring(0, 3000)')
  if echo "$FINAL_TEXT" | grep -qi "Onboarding Complete\|completed"; then
    echo "--- WORKFLOW COMPLETED! Both approvals recorded ---"
  else
    echo "--- Approval actions attempted; workflow may need both factors from different sessions ---"
  fi
else
  echo "--- Two-Factor Approval not visible (workflow stage < 5) ---"
  echo "    This is expected for a freshly created applicant that hasn't progressed through stages."
fi

agent-browser screenshot "${SCREENSHOT_DIR}/stage6-final-state.png"

# =============================================================================
# Step 4: Verify approval API endpoint
# =============================================================================
echo "--- Verifying approval API ---"

# Get a workflow ID for this applicant
WORKFLOW_ID=$(agent-browser eval --stdin <<EVALEOF
(async () => {
  try {
    const res = await fetch("/api/applicants/${APPLICANT_ID}");
    const data = await res.json();
    const wf = data.applicant?.workflows?.[0] || data.workflow;
    return wf ? String(wf.id) : "";
  } catch (e) { return ""; }
})()
EVALEOF
)

if [ -n "$WORKFLOW_ID" ] && [ "$WORKFLOW_ID" != "undefined" ] && [ "$WORKFLOW_ID" != "null" ]; then
  APPROVAL_STATUS=$(agent-browser eval --stdin <<EVALEOF
(async () => {
  try {
    const res = await fetch("/api/onboarding/approve?workflowId=${WORKFLOW_ID}");
    const data = await res.json();
    return JSON.stringify({
      stage: data.stage,
      bothApproved: data.bothApproved,
      rmApproval: data.riskManagerApproval ? "yes" : "no",
      amApproval: data.accountManagerApproval ? "yes" : "no"
    });
  } catch (e) { return JSON.stringify({ error: e.message }); }
})()
EVALEOF
  )
  echo "--- Approval API status: ${APPROVAL_STATUS} ---"
else
  echo "--- Could not determine workflow ID for approval API check ---"
fi

echo ""
echo "=== Stage 5-6 COMPLETE ==="
echo "  Contract review and final approval flows exercised"
echo "  Screenshots in ${SCREENSHOT_DIR}/"
