#!/bin/bash

USERNAME="jakwakwa@gmail.com"
PASSWORD="9GtQqDT2gK84P@Py"
BASE_URL="https://xdev.procurecheck.co.za/api/api/v1"

echo "Authenticating..."
AUTH_RES=$(curl -s -X POST "$BASE_URL/authenticate" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$AUTH_RES" | tr -d '"')

if [ -z "$TOKEN" ] || [[ "$TOKEN" == *"<"* ]]; then
  echo "Failed to get token!"
  echo "$AUTH_RES"
  exit 1
fi

echo "Successfully authenticated."

VENDOR_ID="faee6332-6364-4973-adca-cd20e75149bd"
echo -e "\n--- Running Verification on Test Vendor ID: $VENDOR_ID ---"
curl -s -X POST "$BASE_URL/vendorverification" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"VendorID\": \"$VENDOR_ID\",
    \"CheckTypes\": [\"CIPC\", \"SAFPS\", \"Bank\", \"PropertyOwnership\", \"NonPreferred\", \"Judgement\", \"Persal\"],
    \"Notes\": \"Test manual curl check\"
  }" | jq .
