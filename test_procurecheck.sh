#!/bin/bash

USERNAME="jakwakwa@gmail.com"
PASSWORD="9GtQqDT2gK84P@Py"
BASE_URL="https://xdev.procurecheck.co.za/api/api/v1"
TIMESTAMP=$(date +%s)

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

echo -e "\n--- Test 1: Sole Prop with Test ID 2011115800083 ---"
RES1=$(curl -s -X POST "$BASE_URL/vendors?processBeeInfo=false&runInitialChecks=false" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vendor_Name": "Demo",
    "vendor_Type": "2",
    "vendor_RegNum": "",
    "nationality_Id": "153a0fb2-cc8d-4805-80d2-5f996720fed9",
    "vendorExternalID": "STC-TEST-SOLEPROP-'$TIMESTAMP'",
    "VendorDirectors": [
      {
        "IsIdNumber": true,
        "director_IdNum": "2011115800083"
      }
    ]
  }')
echo "Raw Response 1: $RES1"
VENDOR_ID1=$(echo "$RES1" | tr -d '"')

echo -e "\n--- Test 2: Trust with dummy Reg Num IT000000/2024(E) ---"
RES2=$(curl -s -X POST "$BASE_URL/vendors?processBeeInfo=false&runInitialChecks=false" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vendor_Name": "Demo",
    "vendor_Type": "17",
    "vendor_RegNum": "IT000000/2024(E)",
    "nationality_Id": "153a0fb2-cc8d-4805-80d2-5f996720fed9",
    "vendorExternalID": "STC-TEST-TRUST-'$TIMESTAMP'"
  }')
echo "Raw Response 2: $RES2"

echo -e "\n--- Test 3: Company with empty Reg Num ---"
RES3=$(curl -s -X POST "$BASE_URL/vendors?processBeeInfo=false&runInitialChecks=false" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vendor_Name": "Demo",
    "vendor_Type": "4",
    "vendor_RegNum": "",
    "nationality_Id": "153a0fb2-cc8d-4805-80d2-5f996720fed9",
    "vendorExternalID": "STC-TEST-COMPANY-'$TIMESTAMP'"
  }')
echo "Raw Response 3: $RES3"

if [[ "$VENDOR_ID1" != \{* ]]; then
  echo -e "\n--- Test 4: Run Verification on Test 1 Vendor ID: $VENDOR_ID1 ---"
  RES4=$(curl -s -X POST "$BASE_URL/vendorverification" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"VendorID\": \"$VENDOR_ID1\",
      \"CheckTypes\": [\"CIPC\", \"SAFPS\", \"Bank\", \"PropertyOwnership\", \"NonPreferred\", \"Judgement\", \"Persal\"],
      \"Notes\": \"Test manual curl check\"
    }")
  echo "Raw Response 4: $RES4"
else
  echo -e "\n--- Test 4: Skipped, VENDOR_ID1 was not a valid GUID: $VENDOR_ID1 ---"
fi
