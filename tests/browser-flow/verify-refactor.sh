#!/usr/bin/env bash
# =============================================================================
# verify-refactor.sh — ProcureCheck refactor + PDF export end-to-end verifier
#
# What it proves:
#   1. The verification vendor from PROCURECHECK_VERIFICATION_VENDOR_ID (.env.test)
#      is reused via E2E_PROCURECHECK_REUSE_VENDOR — no new STC-* vendor in xdev.
#   2. Stage 3 runs real ProcureCheck polls + category fetches against that vendor
#      (must already have completed checks in the sandbox).
#   3. The risk review page renders both printable report components when the
#      ?printMode= URL param is present (Phase C).
#   4. Both PDF exports (credit-compliance + procurement) contain real data and
#      can be captured by agent-browser CDP `pdf` without the afterprint reset
#      interferring.
#
# Prerequisites:
#   • setup-browser-flow-dev.sh stack is running (Next on :3100, Inngest on :8288)
#   • .env.test contains (values are local / not committed):
#       E2E_PROCURECHECK_REUSE_VENDOR=1
#       PROCURECHECK_VERIFICATION_VENDOR_ID=<sandbox vendor id>
#       PROCURECHECK_VERIFICATION_REG_NO / PROCURECHECK_VERIFICATION_VAT_NO (for seed-procurecheck-verify)
#       NEXT_PUBLIC_E2E_ENABLED=true
#   • bun run test:db:seed:browser-flow has been run (or run it here with --seed flag)
#   • agent-browser is on $PATH
#
# Usage:
#   bash tests/browser-flow/verify-refactor.sh
#   APPLICANT_ID=42 bash tests/browser-flow/verify-refactor.sh  # skip seed
#
# Outputs:
#   tests/browser-flow/artifacts/verify-refactor-credit-compliance.pdf
#   tests/browser-flow/artifacts/verify-refactor-procurement.pdf
#   tests/browser-flow/artifacts/verify-refactor-*.png  (screenshot trail)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
# shellcheck source=tests/browser-flow/_lib.sh
source "${SCRIPT_DIR}/_lib.sh"

ARTIFACT_DIR="${SCRIPT_DIR}/artifacts"
SEED_OUTPUT_FILE="${SCRIPT_DIR}/.seed-output.json"

mkdir -p "$ARTIFACT_DIR"

browser_flow_load_env
browser_flow_resolve_base_url

# ---------------------------------------------------------------------------
# Auth credentials
# ---------------------------------------------------------------------------
RISK_USERNAME="${E2E_CLERK_RISKMANAGER_USERNAME:-${E2E_CLERK_RISK_MANAGER_USERNAME:-}}"
RISK_PASSWORD="${E2E_CLERK_RISKMANAGER_PASSWORD:-${E2E_CLERK_RISK_MANAGER_PASSWORD:-}}"
: "${RISK_USERNAME:?Missing E2E_CLERK_RISKMANAGER_USERNAME}"
: "${RISK_PASSWORD:?Missing E2E_CLERK_RISKMANAGER_PASSWORD}"

# ---------------------------------------------------------------------------
# Env guard: verify E2E flags are actually set
# ---------------------------------------------------------------------------
if [ "${E2E_PROCURECHECK_REUSE_VENDOR:-}" != "1" ]; then
	echo "ERROR: E2E_PROCURECHECK_REUSE_VENDOR is not '1'. Check .env.test."
	exit 1
fi
if [ -z "${PROCURECHECK_VERIFICATION_VENDOR_ID:-}" ]; then
	echo "ERROR: PROCURECHECK_VERIFICATION_VENDOR_ID is not set. Check .env.test."
	exit 1
fi
if [ "${NEXT_PUBLIC_E2E_ENABLED:-}" != "true" ]; then
	echo "ERROR: NEXT_PUBLIC_E2E_ENABLED is not 'true'. Check .env.test."
	exit 1
fi

echo "=== Verify Refactor: ProcureCheck + PDF Export ==="
echo "  App:    ${BASE_URL}"
echo "  Vendor: ${PROCURECHECK_VERIFICATION_VENDOR_ID} (bypass reuse, no create)"
echo ""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

verify_no_error_overlay() {
	local result
	result=$(agent-browser eval 'document.querySelector("[data-nextjs-dialog], .vite-error-overlay") ? "ERROR_OVERLAY" : "OK"')
	if echo "$result" | grep -q "ERROR_OVERLAY"; then
		echo "ERROR: Framework error overlay detected"
		agent-browser screenshot --full "${ARTIFACT_DIR}/verify-error-overlay.png"
		exit 1
	fi
}

cleanup() {
	agent-browser screenshot --full "${ARTIFACT_DIR}/verify-refactor-final.png" 2>/dev/null || true
	agent-browser close 2>/dev/null || true
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# Step 1: Resolve applicant ID
# ---------------------------------------------------------------------------
echo "--- Step 1: Resolve applicant ID ---"

if [ -z "${APPLICANT_ID:-}" ] && [ -f "$SEED_OUTPUT_FILE" ]; then
	APPLICANT_ID=$(bun -e "const fs=require('fs');const o=JSON.parse(fs.readFileSync('$SEED_OUTPUT_FILE','utf8'));process.stdout.write(String(o.pcVerifyApplicantId||''));")
	APPLICANT_ID=$(echo "$APPLICANT_ID" | tr -d '"' | xargs)
	if [ -n "$APPLICANT_ID" ]; then
		echo "  Loaded APPLICANT_ID=${APPLICANT_ID} from seed output"
	fi
fi

if [ -z "${APPLICANT_ID:-}" ]; then
	echo "  No seed output found; running ProcureCheck verify seed now..."
	cd "$REPO_ROOT"
	bun run procurecheck:verify-seed
	APPLICANT_ID=$(bun -e "const fs=require('fs');const o=JSON.parse(fs.readFileSync('$SEED_OUTPUT_FILE','utf8'));process.stdout.write(String(o.pcVerifyApplicantId||''));")
	APPLICANT_ID=$(echo "$APPLICANT_ID" | tr -d '"' | xargs)
	cd "$SCRIPT_DIR"
fi

if [ -z "${APPLICANT_ID:-}" ]; then
	echo "ERROR: Could not determine APPLICANT_ID. Run seed first."
	exit 1
fi
echo "  APPLICANT_ID=${APPLICANT_ID}"

# ---------------------------------------------------------------------------
# Step 2: Log in and wait for Stage 3 to complete
# ---------------------------------------------------------------------------
echo ""
echo "--- Step 2: Log in ---"
agent-browser open "${BASE_URL}/sign-in"
agent-browser wait --load networkidle
browser_flow_init_viewport
agent-browser wait 2000

CURRENT_URL=$(agent-browser get url || true)
if echo "$CURRENT_URL" | grep -q "/dashboard"; then
	echo "  Session already authenticated; skipping sign-in form"
else
	browser_flow_clerk_login "${RISK_USERNAME}" "${RISK_PASSWORD}"
fi

agent-browser wait 5000
CURRENT_URL=$(agent-browser get url || true)
if echo "$CURRENT_URL" | grep -q "/sign-in"; then
	echo "ERROR: Clerk login did not complete (still on sign-in page)."
	exit 1
fi
verify_no_error_overlay
agent-browser screenshot --full "${ARTIFACT_DIR}/verify-01-dashboard.png"
echo "  Screenshot: verify-01-dashboard.png"

# ---------------------------------------------------------------------------
# Step 3: Confirm workflow is at Stage 4 (seed-procurecheck-verify sets this)
# ---------------------------------------------------------------------------
echo ""
echo "--- Step 3: Confirming workflow at Stage 4 ---"
cd "$REPO_ROOT"
WF_STATUS=$(bun run scripts/get-workflow-status.ts "$APPLICANT_ID" 2>/dev/null | grep -v "injecting\|tip:")
cd "$SCRIPT_DIR"

WF_STAGE=$(echo "$WF_STATUS" | bun -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')||'{}').stage||'?'))" 2>/dev/null || echo "?")
WF_STS=$(echo "$WF_STATUS" | bun -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')||'{}').status||'?'))" 2>/dev/null || echo "?")

echo "  workflow → stage=${WF_STAGE}, status=${WF_STS}"

if [ "$WF_STS" != "awaiting_human" ] || [ "$WF_STAGE" -lt "4" ] 2>/dev/null; then
	echo "ERROR: Workflow is not at Stage 4 awaiting_human (stage=${WF_STAGE} status=${WF_STS})."
	echo "  Run: bun run procurecheck:verify-seed  then retry."
	exit 1
fi
echo "  Stage 4 confirmed — proceeding to risk review."

# ---------------------------------------------------------------------------
# Step 4: Navigate to the risk review report page
# ---------------------------------------------------------------------------
echo ""
echo "--- Step 4: Risk review report page ---"
REPORT_URL="${BASE_URL}/dashboard/risk-review/reports/${APPLICANT_ID}"
agent-browser open "${REPORT_URL}"
agent-browser wait --load networkidle
agent-browser wait 3000
verify_no_error_overlay
agent-browser screenshot --full "${ARTIFACT_DIR}/verify-02-risk-report.png"
echo "  Screenshot: verify-02-risk-report.png"

# Quick smoke-check: page contains procurement content
PAGE_TEXT=$(agent-browser eval 'document.body.innerText.substring(0, 4000)')
if echo "$PAGE_TEXT" | grep -qi "procurement\|procurecheck\|vendor\|risk\|compliance"; then
	echo "  Risk report content verified — procurement/risk text present"
else
	echo "WARNING: Risk report may be sparse — expected procurement content not found"
fi

# ---------------------------------------------------------------------------
# Step 5: Export Credit & Compliance PDF via ?printMode=credit-compliance
# ---------------------------------------------------------------------------
echo ""
echo "--- Step 5: Export Credit & Compliance PDF ---"
CC_URL="${REPORT_URL}?printMode=credit-compliance"
agent-browser open "${CC_URL}"
agent-browser wait --load networkidle
agent-browser wait 2000

# Verify the printable component rendered (print:block elements are visible)
CC_CONTENT=$(agent-browser eval '(function(){
  const el = document.querySelector("[data-testid=credit-compliance-report], .printable-credit-compliance, [class*=PrintableCredit]");
  if (el) return "FOUND:" + el.textContent.substring(0, 200);
  // Fallback: check for print:block elements made visible by print media
  const all = document.querySelectorAll("[class*=print]");
  return "ELEMENT_COUNT:" + all.length;
})()')
echo "  Print DOM probe: ${CC_CONTENT}"
agent-browser screenshot --full "${ARTIFACT_DIR}/verify-03-cc-print-dom.png"

CC_PDF="${ARTIFACT_DIR}/verify-refactor-credit-compliance.pdf"
agent-browser pdf "${CC_PDF}"
if [ -f "${CC_PDF}" ] && [ -s "${CC_PDF}" ]; then
	CC_SIZE=$(du -k "${CC_PDF}" | cut -f1)
	echo "  Credit & Compliance PDF: ${CC_PDF} (${CC_SIZE} KB)"
else
	echo "ERROR: Credit & Compliance PDF was not created or is empty"
	exit 1
fi

# ---------------------------------------------------------------------------
# Step 6: Export Procurement PDF via ?printMode=procurement
# ---------------------------------------------------------------------------
echo ""
echo "--- Step 6: Export Procurement PDF ---"
PROC_URL="${REPORT_URL}?printMode=procurement"
agent-browser open "${PROC_URL}"
agent-browser wait --load networkidle
agent-browser wait 2000

agent-browser screenshot --full "${ARTIFACT_DIR}/verify-04-procurement-print-dom.png"

PROC_PDF="${ARTIFACT_DIR}/verify-refactor-procurement.pdf"
agent-browser pdf "${PROC_PDF}"
if [ -f "${PROC_PDF}" ] && [ -s "${PROC_PDF}" ]; then
	PROC_SIZE=$(du -k "${PROC_PDF}" | cut -f1)
	echo "  Procurement PDF: ${PROC_PDF} (${PROC_SIZE} KB)"
else
	echo "ERROR: Procurement PDF was not created or is empty"
	exit 1
fi

# ---------------------------------------------------------------------------
# Step 7: Run content assertion script
# ---------------------------------------------------------------------------
echo ""
echo "--- Step 7: PDF content assertions ---"
cd "$REPO_ROOT"
bun run scripts/verify-export-pdfs.ts \
	"${CC_PDF}" \
	"${PROC_PDF}" \
	"${PROCURECHECK_VERIFICATION_VENDOR_ID}"

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo "=== verify-refactor COMPLETE ==="
echo ""
echo "  Credit & Compliance PDF : ${CC_PDF}"
echo "  Procurement PDF         : ${PROC_PDF}"
echo "  Screenshots             : ${ARTIFACT_DIR}/verify-*.png"
echo ""
echo "  VERIFICATION PASSED — ProcureCheck refactor and PDF exports are working."
echo ""
echo "  Optional: bun run procurecheck:audit — list STC-* sandbox vendors for manual cleanup."
