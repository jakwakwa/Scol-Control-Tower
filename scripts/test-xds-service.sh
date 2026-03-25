#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${XDS_ENV_FILE:-$ROOT_DIR/.env.local}"
EXTERNAL_XDS_BASE_URL="${XDS_BASE_URL:-}"
EXTERNAL_XDS_PRODUCT_ID="${XDS_PRODUCT_ID:-}"
EXTERNAL_XDS_REPORT_ID="${XDS_REPORT_ID:-}"

if [[ -f "$ENV_FILE" ]]; then
	set -a
	# shellcheck disable=SC1090
	source "$ENV_FILE"
	set +a
fi

if [[ -n "$EXTERNAL_XDS_BASE_URL" ]]; then
	XDS_BASE_URL="$EXTERNAL_XDS_BASE_URL"
fi
if [[ -n "$EXTERNAL_XDS_PRODUCT_ID" ]]; then
	XDS_PRODUCT_ID="$EXTERNAL_XDS_PRODUCT_ID"
fi
if [[ -n "$EXTERNAL_XDS_REPORT_ID" ]]; then
	XDS_REPORT_ID="$EXTERNAL_XDS_REPORT_ID"
fi

XDS_BASE_URL="${XDS_BASE_URL:-http://www.web.xds.co.za/XDSConnectWS}"
XDS_PRODUCT_ID="${XDS_PRODUCT_ID:-41}"
XDS_REPORT_ID="${XDS_REPORT_ID:-18}"
REG_NO="${1:-}"

if [[ -z "${XDS_USERNAME:-}" || -z "${XDS_PASSWORD:-}" ]]; then
	echo "ERROR: XDS_USERNAME and XDS_PASSWORD must be set (via env or .env.local)." >&2
	exit 1
fi

ENDPOINT="${XDS_BASE_URL%\?wsdl}"

xml_escape() {
	local value="$1"
	value="${value//&/&amp;}"
	value="${value//</&lt;}"
	value="${value//>/&gt;}"
	value="${value//\"/&quot;}"
	value="${value//\'/&apos;}"
	printf "%s" "$value"
}

extract_tag() {
	local xml="$1"
	local tag="$2"
	XML_INPUT="$xml" python3 - "$tag" <<'PY'
import re
import sys
import os

tag = sys.argv[1]
xml = os.environ.get("XML_INPUT", "")
patterns = [
    rf"<{tag}>(.*?)</{tag}>",
    rf"<\w+:{tag}>(.*?)</\w+:{tag}>",
]
for pattern in patterns:
    match = re.search(pattern, xml, flags=re.I | re.S)
    if match:
        print(match.group(1).strip())
        raise SystemExit(0)
print("")
PY
}

call_xds() {
	local method="$1"
	local body="$2"
	curl -sS "$ENDPOINT" \
		-H "Content-Type: application/soap+xml; charset=utf-8; action=\"http://www.web.xds.co.za/XDSConnectWS/$method\"" \
		--data-binary "$body"
}

build_envelope() {
	local method="$1"
	local inner="$2"
	cat <<EOF
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:xds="http://www.web.xds.co.za/XDSConnectWS">
  <soap:Header/>
  <soap:Body>
    <xds:${method}>
${inner}
    </xds:${method}>
  </soap:Body>
</soap:Envelope>
EOF
}

echo "Testing XDS SOAP endpoint: $ENDPOINT"
echo "Using ProductID=$XDS_PRODUCT_ID ReportID=$XDS_REPORT_ID"
if [[ "$ENDPOINT" != *"XDSConnectWS"* ]]; then
	echo "WARN: XDS_BASE_URL does not look like SOAP endpoint (expected .../XDSConnectWS or .../XDSConnectWS?WSDL)." >&2
fi

LOGIN_BODY="$(build_envelope "Login" "      <xds:strUser>$(xml_escape "$XDS_USERNAME")</xds:strUser>
      <xds:strPwd>$(xml_escape "$XDS_PASSWORD")</xds:strPwd>")"
LOGIN_XML="$(call_xds "Login" "$LOGIN_BODY")"
TICKET="$(extract_tag "$LOGIN_XML" "LoginResult")"

if [[ -z "$TICKET" ]]; then
	echo "FAIL: LoginResult missing. Raw response follows:" >&2
	printf "%s\n" "$LOGIN_XML" >&2
	exit 1
fi

echo "PASS: Login returned ticket (length=${#TICKET})"

VALIDATE_BODY="$(build_envelope "IsTicketValid" "      <xds:XDSConnectTicket>$(xml_escape "$TICKET")</xds:XDSConnectTicket>")"
VALIDATE_XML="$(call_xds "IsTicketValid" "$VALIDATE_BODY")"
IS_VALID="$(extract_tag "$VALIDATE_XML" "IsTicketValidResult" | tr '[:upper:]' '[:lower:]')"

if [[ "$IS_VALID" != "true" ]]; then
	echo "FAIL: IsTicketValidResult=$IS_VALID" >&2
	printf "%s\n" "$VALIDATE_XML" >&2
	exit 1
fi

echo "PASS: Ticket validated"

if [[ -n "$REG_NO" ]]; then
	MATCH_BODY="$(build_envelope "ConnectBusinessMatch" "      <xds:XDSConnectTicket>$(xml_escape "$TICKET")</xds:XDSConnectTicket>
      <xds:ProductID>$(xml_escape "$XDS_PRODUCT_ID")</xds:ProductID>
      <xds:ReportID>$(xml_escape "$XDS_REPORT_ID")</xds:ReportID>
      <xds:RegistrationNumber>$(xml_escape "$REG_NO")</xds:RegistrationNumber>")"
	MATCH_XML="$(call_xds "ConnectBusinessMatch" "$MATCH_BODY")"
	MATCH_RESULT="$(extract_tag "$MATCH_XML" "ConnectBusinessMatchResult")"

	if [[ -z "$MATCH_RESULT" ]]; then
		echo "FAIL: ConnectBusinessMatchResult missing" >&2
		printf "%s\n" "$MATCH_XML" >&2
		exit 1
	fi

	echo "PASS: ConnectBusinessMatch returned payload (chars=${#MATCH_RESULT})"

	RESULT_ID="$(XML_INPUT="$MATCH_RESULT" python3 - <<'PY'
import re
import os
txt = os.environ.get("XML_INPUT", "")
patterns = [
    r"<(?:\w+:)?ResultId>(.*?)</(?:\w+:)?ResultId>",
    r"\bresult(?:\s|_)?id\b[^A-Za-z0-9]*([A-Za-z0-9-]{6,})",
]
for p in patterns:
    m = re.search(p, txt, flags=re.I|re.S)
    if m:
        print(m.group(1).strip())
        raise SystemExit(0)
print("")
PY
)"

	if [[ -z "$RESULT_ID" ]]; then
		echo "WARN: Could not extract ResultId from match payload. Skipping ConnectGetResult."
		exit 0
	fi

	GET_RESULT_BODY="$(build_envelope "ConnectGetResult" "      <xds:XDSConnectTicket>$(xml_escape "$TICKET")</xds:XDSConnectTicket>
      <xds:ResultID>$(xml_escape "$RESULT_ID")</xds:ResultID>")"
	GET_RESULT_XML="$(call_xds "ConnectGetResult" "$GET_RESULT_BODY")"
	FINAL_RESULT="$(extract_tag "$GET_RESULT_XML" "ConnectGetResultResult")"

	if [[ -z "$FINAL_RESULT" ]]; then
		echo "FAIL: ConnectGetResultResult missing" >&2
		printf "%s\n" "$GET_RESULT_XML" >&2
		exit 1
	fi

	echo "PASS: ConnectGetResult returned payload (chars=${#FINAL_RESULT})"
else
	echo "INFO: No registration number argument supplied; skipped ConnectBusinessMatch/ConnectGetResult."
	echo "Usage for full flow: scripts/test-xds-service.sh <registration_number>"
fi
