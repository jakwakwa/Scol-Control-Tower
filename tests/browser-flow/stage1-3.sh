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
echo "--- Identity Verification: Upload test ID document and verify pipeline ---"

# Step 1: Get the workflow ID for this applicant from the API (authenticated fetch inside browser)
WORKFLOW_ID=$(agent-browser eval --stdin <<EVALEOF
(async () => {
  const res = await fetch("/api/applicants/${APPLICANT_ID}");
  if (!res.ok) return "";
  const data = await res.json();
  return data.workflow ? String(data.workflow.id) : "";
})()
EVALEOF
)
WORKFLOW_ID=$(echo "$WORKFLOW_ID" | tr -d '"' | xargs)

if [ -z "$WORKFLOW_ID" ]; then
	echo "ERROR: Could not retrieve workflow ID for applicant ${APPLICANT_ID}"
	exit 1
fi
echo "--- Identity Verification: workflow ID=${WORKFLOW_ID} ---"

# Step 2: Upload an ID_DOCUMENT via the authenticated onboarding upload API.
# Use the browser canvas to generate a 900×900 random-noise PNG:
#   - Size >> 30 KB  (passes MIN_IMAGE_BYTES quality check)
#   - 900×900 px     (passes MIN_IMAGE_WIDTH/HEIGHT quality check)
#   - Entropy >> 3.8 (random noise has max entropy ~8; passes MIN_ENTROPY check)
# Document AI will reject this as non-real content → non-retriable or transient failure.
UPLOAD_DOC_ID=$(agent-browser eval --stdin <<EVALEOF
(async () => {
  // Generate 900×900 random-noise PNG via canvas
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 900;
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(900, 900);
  // Deterministic pseudo-noise (xorshift32) — fast, reproducible, high entropy
  let seed = 0xdeadbeef;
  for (let i = 0; i < imageData.data.length; i += 4) {
    seed = (seed ^ (seed << 13)) >>> 0;
    seed = (seed ^ (seed >>> 17)) >>> 0;
    seed = (seed ^ (seed << 5)) >>> 0;
    imageData.data[i]   = seed & 0xff;
    imageData.data[i+1] = (seed >> 8) & 0xff;
    imageData.data[i+2] = (seed >> 16) & 0xff;
    imageData.data[i+3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  if (!blob) { console.error("canvas.toBlob returned null"); return ""; }

  const file = new File([blob], "test-id-browserflow.png", { type: "image/png" });

  const fd = new FormData();
  fd.append("file", file);
  fd.append("workflowId", "${WORKFLOW_ID}");
  fd.append("category", "individual");
  fd.append("documentType", "ID_DOCUMENT");

  const res = await fetch("/api/onboarding/documents/upload", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok || !data.document?.id) {
    console.error("Upload failed:", JSON.stringify(data));
    return "";
  }
  return String(data.document.id);
})()
EVALEOF
)
UPLOAD_DOC_ID=$(echo "$UPLOAD_DOC_ID" | tr -d '"' | xargs)

if [ -z "$UPLOAD_DOC_ID" ]; then
	echo "ERROR: Document upload failed — cannot test identity verification pipeline"
	exit 1
fi
echo "--- Identity Verification: document ID=${UPLOAD_DOC_ID} uploaded, polling for status ---"

# Step 3: Poll the onboarding documents API until verificationStatus leaves "pending".
# With the non-retriable patterns for Document AI content errors, this resolves to
# "failed_unprocessable" within ~10s (no retry cycle).
# "api_error" is treated as retryable — may occur during a brief Next.js hot-reload.
ID_VERIFY_STATUS="pending"
CONSECUTIVE_API_ERRORS=0
for attempt in $(seq 1 40); do
	ID_VERIFY_STATUS=$(agent-browser eval --stdin <<EVALEOF
(async () => {
  const res = await fetch("/api/onboarding/documents/upload?workflowId=${WORKFLOW_ID}");
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return "api_error:" + res.status + ":" + text.substring(0, 80);
  }
  const data = await res.json();
  const docs = data.documents || [];
  const doc = docs.find(d => d.id === ${UPLOAD_DOC_ID});
  return doc ? (doc.verificationStatus || "pending") : "not_found";
})()
EVALEOF
	)
	ID_VERIFY_STATUS=$(echo "$ID_VERIFY_STATUS" | tr -d '"' | xargs)

	# api_error is retryable (brief server reload / transient); don't break the loop
	if echo "$ID_VERIFY_STATUS" | grep -q "^api_error"; then
		CONSECUTIVE_API_ERRORS=$((CONSECUTIVE_API_ERRORS + 1))
		echo "--- Poll ${attempt}/40: api error (${CONSECUTIVE_API_ERRORS} consecutive) — ${ID_VERIFY_STATUS} ---"
		if [ "$CONSECUTIVE_API_ERRORS" -ge 5 ]; then
			echo "ERROR: 5 consecutive API errors — aborting poll"
			ID_VERIFY_STATUS="api_error"
			break
		fi
		sleep 3
		continue
	fi

	CONSECUTIVE_API_ERRORS=0
	echo "--- Poll ${attempt}/40: verificationStatus=${ID_VERIFY_STATUS} ---"

	if [ "$ID_VERIFY_STATUS" != "pending" ]; then
		break
	fi
	sleep 2
done

browser_flow_shot "${SCREENSHOT_DIR}/stage1-3-id-verification.png"

# Step 4: Assert the terminal status is one of the expected values.
# "failed_unprocessable" = non-retriable content error (expected for noise images after adding patterns).
# "failed_ocr"           = transient failures exhausted retry budget (acceptable if Document AI
#                          credentials are not configured in this environment).
# "verified"             = Document AI accepted the document (rare with noise images).
if [ "$ID_VERIFY_STATUS" = "failed_unprocessable" ]; then
	echo "--- Identity Verification PASSED: status=failed_unprocessable (non-retriable content error, immediate — correct behavior) ---"
elif [ "$ID_VERIFY_STATUS" = "failed_ocr" ]; then
	echo "--- Identity Verification PASSED: status=failed_ocr (transient failures exhausted retry budget — acceptable if Document AI credentials are not configured) ---"
elif [ "$ID_VERIFY_STATUS" = "verified" ]; then
	echo "--- Identity Verification PASSED: status=verified (Document AI accepted document) ---"
elif [ "$ID_VERIFY_STATUS" = "pending" ]; then
	echo "ERROR: Identity verification still 'pending' after 80s — Inngest function may not have run (check Inngest dashboard at http://127.0.0.1:8288)"
	exit 1
elif echo "$ID_VERIFY_STATUS" | grep -q "^api_error"; then
	echo "ERROR: Could not read verification status — API consistently unavailable: ${ID_VERIFY_STATUS}"
	exit 1
else
	echo "ERROR: Unexpected identity verification status: ${ID_VERIFY_STATUS}"
	exit 1
fi

echo ""
echo "=== Stage 1-3 COMPLETE ==="
echo "  APPLICANT_ID=${APPLICANT_ID} (saved to ${APPLICANT_ID_FILE})"
echo "  WORKFLOW_ID=${WORKFLOW_ID}"
echo "  ID_VERIFY_STATUS=${ID_VERIFY_STATUS}"
echo "  Screenshots in ${SCREENSHOT_DIR}/"
