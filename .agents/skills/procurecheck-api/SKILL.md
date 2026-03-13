---
name: procurecheck-api
description: Guides the agent on how to integrate with the ProcureCheck XDev Web API version 5.0 to manage vendors, employees, retrieve detailed reports, and handle notifications. Trigger phrases include "Integrate Procurecheck", "Write API calls for Procurecheck", etc.
---

# ProcureCheck Web API Integration Skill (v5.0)

This skill provides the required knowledge for any AI coding agent to integrate deeply with the ProcureCheck XDev Web API (v5.0).

## How It Works

1. **Authentication:** Obtain a JSON Web Token (JWT) from the auth endpoint using POST. It is valid for 30 minutes and must be included as an authorization header in authenticated requests.
2. **Entities:** The API allows CRUD operations on "Vendors" and "Employees".
3. **Results & Reports:** Query general results for an entity, specific verification results (CIPC, Property, Bank, etc.), or structural detailed reports and risk matrices.
4. **Notifications:** Manage application-level notifications through the API.

## Base Configuration

*   **BASE_URL:** `https://xdev.procurecheck.co.za/api/api/v1/`
*   **Authentication Endpoint:** POST `${BASE_URL}authenticate`

---

## Vendor Management

### 1. Add Vendor
**Endpoint:** POST `${BASE_URL}vendors?processBeeInfo={true|false}`

*   **CIPC Vendor (`vendor_Type`: "4"):**
```json
{
  "vendor_Name": "Demo",
  "vendor_Type": "4",
  "vendor_RegNum": "",
  "nationality_Id": "153a0fb2-cc8d-4805-80d2-5f996720fed9",
  "vendor_VatNum": null,
  "vendorExternalID": null
}
```

*   **Trust Vendor (`vendor_Type`: "17"):** Requires `vendor_RegNum` (e.g., "IT000000/2024(E)"), `vendor_AuthorizationDate`, and `vendor_MasterOffice`.
*   **Sole Prop/Partnership Vendor (`vendor_Type`: "2"):** Must have an empty `vendor_RegNum` and include at least one director in a `VendorDirectors` array. Note the `IsIdNumber` boolean flag for directors to differentiate between ID Numbers and Passports.

### 2. Update Vendor
**Endpoint:** PUT `${BASE_URL}vendors?processBeeInfo={true|false}`
Requirement: Include `vendor_Id` in the payload.

### 3. Get Vendors List
**Endpoint:** POST `${BASE_URL}vendors/getlist`
Payload requires a `QueryParams` object (Conditions, PageIndex, PageSize, SortColumn, SortOrder).

---

## Employee Management

### 1. Add Employee
**Endpoint:** POST `${BASE_URL}employees`
```json
{
  "employee_FirstName": "Demo",
  "employee_LastName": "Employee",
  "nationality_Id": "153a0fb2-cc8d-4805-80d2-5f996720fed9",
  "IsIdNumber": true,
  "employee_IdNum": "0000000000000",
  "employee_Designation": "API Test",
  "employee_DOB": "1920-04-03",
  "employee_UniqueId": null
}
```
*Note: If `IsIdNumber` is false, `employee_IdNum` becomes the passport number, and `employee_DOB`, `employee_PassportIssueDate`, `employee_PassportExpiryDate`, and `PassportIssueCountryId` become required.*

### 2. Update Employee
**Endpoint:** PUT `${BASE_URL}employees`
Requirement: Include `employee_Id` in the payload.

---

## Retrieving Results

### Employee Results
*   **Summary:** GET `${BASE_URL}employeeresults?id={EmployeeID}`
*   **Specific Verifications:**
    *   CIPC: `/employeeresults/cipc?id={EmployeeID}`
    *   Property: `/employeeresults/property?id={EmployeeID}`
    *   Restricted List: `/employeeresults/nonpreferred?id={EmployeeID}`
    *   Persal: `/employeeresults/persal?id={EmployeeID}`
    *   SAFPS: `/employeeresults/safps?id={EmployeeID}`
    *   Bank: `/employeeresults/bank?id={EmployeeID}`

### Vendor Results
*   **Summary:** GET `${BASE_URL}vendorresults?id={VendorID}`
*   **Specific Verifications:**
    *   CIPC: `/vendorresults/cipc?id={VendorID}`
    *   Property: `/vendorresults/property?id={VendorID}`
    *   Restricted List: `/vendorresults/nonpreferred?id={VendorID}`
    *   Persal: `/vendorresults/persal?id={VendorID}`
    *   SAFPS: `/vendorresults/safps?id={VendorID}`
    *   Judgement: `/vendorresults/judgement?id={VendorID}`
    *   Trust (DOJ): `/vendorresults/doj?id={VendorID}`

---

## Detailed Reports & Risk Matrices

**Endpoint:** GET `${BASE_URL}detailedreports?id={ReportID}`

**Common Report IDs:**
*   **Vendor Reports:**
    *   **2**: Vendors who failed Restricted List Checks
    *   **3**: Vendors with business status other than 'In Business'
    *   **4**: CIPC alert (name mismatch)
    *   **5**: Vendor directors are directors of other active Vendors
    *   **6**: Vendors with conflicts with Employees
    *   **8**: Failed SAFPS checks
    *   **9**: Failed Property checks
    *   **12**: Share the same bank account
    *   **14**: Share the same VAT number
    *   **16**: Vendor Persal List
    *   **19**: Failed Bank Verification checks
    *   **20**: Failed Legal Judgment checks
    *   **31**: Vendor Audit Report
*   **Employee Reports:**
    *   **1**: Employees with business interests
    *   **10**: Failed SAFPS checks
    *   **11**: Failed Property checks
    *   **13**: Share bank account with vendors
    *   **15**: Employee Persal List
    *   **18**: Failed Bank Verification Checks
    *   **21**: Co-directors of the same companies
    *   **22**: Failed Restricted List Checks
    *   **32**: Employee Audit Report
*   **Risk Matrices & Other:**
    *   **23**: Employee Risk Rankings
    *   **24**: Vendor Risk Rankings
    *   **25**: Usage Report
    *   **33**: World Compliance Report

---

## Notifications

*   **List Notifications:** POST `${BASE_URL}notifications/getlist`
    Payload requires `QueryParams` and `IsActive` (`false` for unread, `true` for history).
*   **Mark as Read (Single):** GET `${BASE_URL}notifications/updateNotificationById?Id={NotificationID}`
*   **Mark as Read (All):** GET `${BASE_URL}notifications/updateAllNotificationStatus`

---

## Usage Guidelines for Agents

*   Cache the JWT token for up to 30 minutes to minimize `/authenticate` requests.
*   Log IDs returned upon creation (`vendor_Id`, `employee_Id`) to use for subsequent updates or queries.
*   Ensure the correct flags (`IsIdNumber`, `processBeeInfo`) dictate the appropriate required payload fields.
