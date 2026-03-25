#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Stage 5-6: Contract gates & two-factor final approval
#
# Env:
#   BROWSER_FLOW_UI_APPROVALS=1 — use "Approve as …" buttons (and toasts) instead
#   of fetch-only for RM/AM steps; API status check still runs at the end.
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

AM_USERNAME="${E2E_CLERK_AM_USERNAME:-${E2E_CLERK_USER_USERNAME:-}}"
AM_PASSWORD="${E2E_CLERK_AM_PASSWORD:-${E2E_CLERK_USER_PASSWORD:-}}"
RISK_USERNAME="${E2E_CLERK_RISKMANAGER_USERNAME:-${E2E_CLERK_RISK_MANAGER_USERNAME:-${E2E_CLERK_USER_USERNAME:-}}}"
RISK_PASSWORD="${E2E_CLERK_RISKMANAGER_PASSWORD:-${E2E_CLERK_RISK_MANAGER_PASSWORD:-${E2E_CLERK_USER_PASSWORD:-}}}"
: "${AM_USERNAME:?Missing E2E_CLERK_AM_USERNAME (or fallback E2E_CLERK_USER_USERNAME)}"
: "${AM_PASSWORD:?Missing E2E_CLERK_AM_PASSWORD (or fallback E2E_CLERK_USER_PASSWORD)}"
: "${RISK_USERNAME:?Missing E2E_CLERK_RISKMANAGER_USERNAME (or fallback vars)}"
: "${RISK_PASSWORD:?Missing E2E_CLERK_RISKMANAGER_PASSWORD (or fallback vars)}"

if [ -z "${APPLICANT_ID:-}" ] && [ -f "$APPLICANT_ID_FILE" ]; then
	APPLICANT_ID=$(cat "$APPLICANT_ID_FILE")
	APPLICANT_ID=$(echo "$APPLICANT_ID" | tr -d '"' | xargs)
	echo "--- Loaded APPLICANT_ID=${APPLICANT_ID} from handoff file ---"
fi

if [ -z "${APPLICANT_ID:-}" ] && [ -f "$SEED_OUTPUT_FILE" ]; then
	APPLICANT_ID=$(bun -e "const fs=require('fs');const o=JSON.parse(fs.readFileSync('$SEED_OUTPUT_FILE','utf8'));process.stdout.write(String(o.stage56ApplicantId||''));")
	APPLICANT_ID=$(echo "$APPLICANT_ID" | tr -d '"' | xargs)
	if [ -n "$APPLICANT_ID" ]; then
		echo "--- Loaded APPLICANT_ID=${APPLICANT_ID} from seed output ---"
	fi
fi

if [ -z "${APPLICANT_ID:-}" ]; then
	echo "ERROR: APPLICANT_ID is required for Stage 5-6."
	exit 1
fi

cleanup() {
	browser_flow_shot "${SCREENSHOT_DIR}/stage5-6-final.png" 2>/dev/null || true
	agent-browser close 2>/dev/null || true
}
trap cleanup EXIT

verify_no_error_overlay() {
	local result
	result=$(agent-browser eval 'document.querySelector("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay") ? "ERROR_OVERLAY" : "OK"')
	if echo "$result" | grep -q "ERROR_OVERLAY"; then
		echo "ERROR: Framework error overlay detected"
		browser_flow_shot "${SCREENSHOT_DIR}/stage5-6-error-overlay.png"
		exit 1
	fi
}

verify_has_content() {
	local result
	result=$(agent-browser eval 'document.body.innerText.trim().length > 0 ? "HAS_CONTENT" : "BLANK"')
	if echo "$result" | grep -q "BLANK"; then
		echo "ERROR: Page is blank"
		browser_flow_shot "${SCREENSHOT_DIR}/stage5-6-blank-page.png"
		exit 1
	fi
}

echo "=== Stage 5-6 (BASE_URL=${BASE_URL}) UI_APPROVALS=${BROWSER_FLOW_UI_APPROVALS:-0} ==="
echo "  APPLICANT_ID=${APPLICANT_ID}"

login_as() {
	local role="$1"
	local username="$2"
	local password="$3"

	agent-browser close 2>/dev/null || true
	echo "--- Logging in as ${role} ---"
	agent-browser open "${BASE_URL}/sign-in" && agent-browser wait --load networkidle
	browser_flow_init_viewport
	sleep 2
	verify_no_error_overlay

	CURRENT_URL=$(agent-browser get url || true)
	if echo "$CURRENT_URL" | grep -q "/dashboard"; then
		echo "--- ${role} session already authenticated ---"
	else
		agent-browser snapshot -i
		browser_flow_clerk_login "${username}" "${password}"
	fi

	agent-browser wait 5000
	CURRENT_URL=$(agent-browser get url || true)
	if echo "$CURRENT_URL" | grep -q "/sign-in"; then
		echo "ERROR: Clerk login did not complete for ${role} (still on sign-in)."
		exit 1
	fi
	verify_no_error_overlay
	verify_has_content
	echo "--- Logged in as ${role} ---"
}

login_as "Account Manager" "${AM_USERNAME}" "${AM_PASSWORD}"

echo "--- Stage 5: Applicant detail ---"
agent-browser open "${BASE_URL}/dashboard/applicants/${APPLICANT_ID}"
agent-browser wait --load networkidle
agent-browser wait 2000
verify_no_error_overlay
verify_has_content

browser_flow_shot "${SCREENSHOT_DIR}/stage5-applicant-detail.png"

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
WORKFLOW_ID=$(echo "$WORKFLOW_ID" | tr -d '"' | xargs)
if [ -z "$WORKFLOW_ID" ]; then
	echo "ERROR: Could not resolve workflow ID for applicant ${APPLICANT_ID}"
	exit 1
fi
echo "--- Resolved WORKFLOW_ID=${WORKFLOW_ID} ---"

CONTRACT_REVIEW_RESULT=$(agent-browser eval --stdin <<EVALEOF
(async () => {
  try {
    const res = await fetch("/api/workflows/${WORKFLOW_ID}/contract/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicantId: ${APPLICANT_ID},
        reviewNotes: "browser-flow stage5 contract review"
      }),
    });
    const body = await res.json().catch(() => ({}));
    return JSON.stringify({ status: res.status, body });
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
})()
EVALEOF
)
echo "--- Contract review API result: ${CONTRACT_REVIEW_RESULT} ---"

ABSA_CONFIRM_RESULT=$(agent-browser eval --stdin <<EVALEOF
(async () => {
  try {
    const res = await fetch("/api/workflows/${WORKFLOW_ID}/absa/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicantId: ${APPLICANT_ID},
        notes: "browser-flow stage5 absa confirm"
      }),
    });
    const body = await res.json().catch(() => ({}));
    return JSON.stringify({ status: res.status, body });
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
})()
EVALEOF
)
echo "--- ABSA confirm API result: ${ABSA_CONFIRM_RESULT} ---"

agent-browser open "${BASE_URL}/dashboard/applicants/${APPLICANT_ID}?tab=reviews"
agent-browser wait --load networkidle
agent-browser wait 2000
browser_flow_shot "${SCREENSHOT_DIR}/stage5-after-contract.png"

echo "--- Stage 6: Two-factor final approval ---"
login_as "Risk Manager" "${RISK_USERNAME}" "${RISK_PASSWORD}"

agent-browser open "${BASE_URL}/dashboard/applicants/${APPLICANT_ID}?tab=reviews"
agent-browser wait --load networkidle
agent-browser wait 2000
verify_no_error_overlay

BODY_TEXT=$(agent-browser eval 'document.body.innerText.substring(0, 4000)')

if echo "$BODY_TEXT" | grep -qi "Two-Factor Final Approval"; then
	echo "--- Two-Factor Final Approval section visible ---"
	browser_flow_shot "${SCREENSHOT_DIR}/stage6-before-rm-approval.png"

	if [ "${BROWSER_FLOW_UI_APPROVALS:-0}" = "1" ]; then
		agent-browser find role button click --name "Approve as Risk Manager"
		agent-browser wait 4000
		browser_flow_shot "${SCREENSHOT_DIR}/stage6-rm-approved.png"
	else
		RM_APPROVAL_RESULT=$(agent-browser eval --stdin <<EVALEOF
(async () => {
  try {
    const res = await fetch("/api/onboarding/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workflowId: Number(${WORKFLOW_ID}),
        applicantId: Number(${APPLICANT_ID}),
        role: "risk_manager",
        decision: "APPROVED"
      }),
    });
    const body = await res.json().catch(() => ({}));
    return JSON.stringify({ status: res.status, body });
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
})()
EVALEOF
		)
		echo "--- RM approval API result: ${RM_APPROVAL_RESULT} ---"
		agent-browser wait 2000
		browser_flow_shot "${SCREENSHOT_DIR}/stage6-rm-approved.png"
	fi

	login_as "Account Manager" "${AM_USERNAME}" "${AM_PASSWORD}"
	agent-browser open "${BASE_URL}/dashboard/applicants/${APPLICANT_ID}?tab=reviews"
	agent-browser wait --load networkidle
	agent-browser wait 2000
	browser_flow_shot "${SCREENSHOT_DIR}/stage6-before-am-approval.png"

	if [ "${BROWSER_FLOW_UI_APPROVALS:-0}" = "1" ]; then
		agent-browser find role button click --name "Approve as Account Manager"
		agent-browser wait 4000
		browser_flow_shot "${SCREENSHOT_DIR}/stage6-am-approved.png"
	else
		AM_APPROVAL_RESULT=$(agent-browser eval --stdin <<EVALEOF
(async () => {
  try {
    const res = await fetch("/api/onboarding/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workflowId: Number(${WORKFLOW_ID}),
        applicantId: Number(${APPLICANT_ID}),
        role: "account_manager",
        decision: "APPROVED"
      }),
    });
    const body = await res.json().catch(() => ({}));
    return JSON.stringify({ status: res.status, body });
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
})()
EVALEOF
		)
		echo "--- AM approval API result: ${AM_APPROVAL_RESULT} ---"
		agent-browser wait 2000
		browser_flow_shot "${SCREENSHOT_DIR}/stage6-am-approved.png"
	fi

	agent-browser wait 2000
	FINAL_TEXT=$(agent-browser eval 'document.body.innerText.substring(0, 3000)')
	if echo "$FINAL_TEXT" | grep -qi "Onboarding Complete\|completed"; then
		echo "--- WORKFLOW COMPLETED! Both approvals recorded ---"
	fi
else
	echo "--- Two-Factor Approval not visible (workflow stage < 5 or gates incomplete) ---"
fi

browser_flow_shot "${SCREENSHOT_DIR}/stage6-final-state.png"

if [ -n "$WORKFLOW_ID" ] && [ "$WORKFLOW_ID" != "undefined" ] && [ "$WORKFLOW_ID" != "null" ]; then
	set +e
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
	APPROVAL_STATUS_EXIT=$?
	set -e
	if [ "$APPROVAL_STATUS_EXIT" -eq 0 ] && [ -n "${APPROVAL_STATUS:-}" ]; then
		echo "--- Approval API status: ${APPROVAL_STATUS} ---"
	fi
fi

verify_no_error_overlay
verify_has_content
browser_flow_capture_workflows "workflows-after-stage5-6.png"

echo ""
echo "=== Stage 5-6 COMPLETE ==="
echo "  Screenshots in ${SCREENSHOT_DIR}/"
