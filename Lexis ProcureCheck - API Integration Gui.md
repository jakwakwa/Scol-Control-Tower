# **Lexis ProcureCheck \- API Integration Guide**

**Status:** CONFIDENTIAL

**Author:** Satish Kumar

**Version:** 7.0

**Updated date:** 08-01-2026

## **1\. Introduction**

This document provides comprehensive guidance for integrating with the ProcureCheck API. It outlines authentication processes, endpoints, payload structures, and examples for efficient interaction with the system.

**Key Features:**

* Vendor and employee management (create, update, and retrieve records).  
* Compliance and risk assessment checks.  
* Summary and detailed reporting capabilities.  
* Notifications management.

## **2\. Technical Details**

* **Base URL (XDev):** https://xdev.procurecheck.co.za/api/api/v1/  
* **Help Document URL:** https://xdev.procurecheck.co.za/api/Help  
* **Swagger URL:** https://xdev.procurecheck.co.za/api/swagger/ui/index

## **3\. Authentication**

JSON Web Tokens (JWT) are used for authentication.

* **Token Validity:** 30 minutes.  
* **Method:** POST  
* **Endpoint:** https://xdev.procurecheck.co.za/api/api/v1/authenticate  
* **Payload Type:** x-www-form-urlencoded

**Request Body:** | Key | Value | | :--- | :--- | | Username | Your Username | | Password | Your Password |

**Usage:** The returned JWT token must be included in the header of every subsequent request: Authorization: Bearer {token}

## **4\. Vendor Management**

### **4.1 Add Vendor**

* **Method:** POST  
* **Endpoint:** https://xdev.procurecheck.co.za/api/api/v1/vendors?processBeeInfo={true/false}  
* **Note:** Set processBeeInfo=true only if opted-in for BEE checks.

**Standard CIPC Vendor Payload:**

{  
  "vendor\_Name": "Demo",  
  "vendor\_Type": "4",  
  "vendor\_RegNum": "2024/000000/07",  
  "nationality\_Id": "153a0fb2-cc8d-4805-80d2-5f996720fed9",  
  "vendor\_VatNum": null,  
  "vendorExternalID": "Your\_Unique\_ID"  
}

**Sole Prop / Partnership Vendor Payload:** *Requires at least one director.*

{  
  "vendor\_Name": "Demo",  
  "vendor\_Type": "2",  
  "vendor\_RegNum": "",  
  "nationality\_id": "153a0fb2-cc8d-4805-80d2-5f996720fed9",  
  "VendorDirectors": \[  
    {  
      "director\_FirstName": "Firstname",  
      "director\_LastName": "Lastname",  
      "IsIdNumber": true,  
      "director\_IdNum": "ID\_NUMBER"  
    }  
  \]  
}

### **4.2 Update Vendor**

* **Method:** PUT  
* **Endpoint:** https://xdev.procurecheck.co.za/api/api/v1/vendors?processBeeInfo=false  
* **Note:** You must include the vendor\_Id (GUID) in the payload.

### **4.3 Get Vendors List (with Pagination)**

* **Method:** POST  
* **Endpoint:** https://xdev.procurecheck.co.za/api/api/v1/vendors/getlist

**Payload Example:**

{  
  "QueryParams": {  
    "Conditions": \[  
      { "ColumnName": "FullName", "Operator": "Contains", "Value": "" }  
    \],  
    "PageIndex": 0,  
    "PageSize": 10,  
    "SortColumn": "Created",  
    "SortOrder": "Descending"  
  }  
}

## **5\. Vendor Check Results**

Retrieve check statuses using the VendorID GUID.

| Check Type | Endpoint (GET) |
| :---- | :---- |
| **Summary** | .../vendorresults?id={VendorID} |
| **CIPC** | .../vendorresults/cipc?id={VendorID} |
| **Property** | .../vendorresults/property?id={VendorID} |
| **Restricted** | .../vendorresults/nonpreferred?id={VendorID} |
| **Judgement** | .../vendorresults/judgement?id={VendorID} |
| **SAFPS** | .../vendorresults/safps?id={VendorID} |
| **PERSAL** | .../vendorresults/persal?id={VendorID} |
| **Trust** | .../vendorresults/doj?id={VendorID} |

## **6\. Employee Management**

### **6.1 Add Employee**

* **Method:** POST  
* **Endpoint:** https://xdev.procurecheck.co.za/api/api/v1/employees

**Payload Example:**

{  
  "employee\_FirstName": "Demo",  
  "employee\_LastName": "Employee",  
  "nationality\_Id": "153a0fb2-cc8d-4805-80d2-5f996720fed9",  
  "IsIdNumber": true,  
  "employee\_IdNum": "0000000000000",  
  "employee\_Designation": "API Test",  
  "employee\_DOB": "1920-04-03",  
  "employee\_Uniqueld": "External\_Ref\_ID"  
}

### **6.2 Update Employee**

* **Method:** PUT  
* **Endpoint:** https://xdev.procurecheck.co.za/api/api/v1/employees  
* **Note:** Requires employee\_Id (GUID) in the payload.

## **7\. Employee Check Results**

Retrieve check statuses using the EmployeeID GUID.

| Check Type | Endpoint (GET) |
| :---- | :---- |
| **Summary** | .../employeeresults?id={EmployeeID} |
| **CIPC** | .../employeeresults/cipc?id={EmployeeID} |
| **Property** | .../employeeresults/property?id={EmployeeID} |
| **Restricted** | .../employeeresults/nonpreferred?id={EmployeeID} |
| **SAFPS** | .../employeeresults/safps?id={EmployeeID} |
| **PERSAL** | .../employeeresults/persal?id={EmployeeID} |
| **Bank** | .../employeeresults/bank?id={EmployeeID} |

## **8\. Summary Reports**

All report endpoints use POST and require a pagination payload: {"PageIndex": 0, "PageSize": 10}.

### **8.1 Vendor Reports**

* **Directors on other Vendors:** .../detailedreports?id=5  
* **Not 'In Business' Status:** .../detailedreports?id=3  
* **CIPC Alerts (Name Mismatch):** .../detailedreports?id=4  
* **Conflicts with Employees:** .../detailedreports?id=6  
* **Failed Restricted List:** .../detailedreports?id=2  
* **Failed SAFPS:** .../detailedreports?id=8  
* **Shared Bank Accounts:** .../detailedreports?id=12  
* **Audit Report:** .../detailedreports?id=31

### **8.2 Employee Reports**

* **Co-directors (same company):** .../detailedreports?id=21  
* **With Business Interests:** .../detailedreports?id=1  
* **Failed Property Checks:** .../detailedreports?id=11  
* **Failed Bank Verification:** .../detailedreports?id=18  
* **Next of Kin Details:** .../detailedreports?id=27

## **9\. Notifications**

* **Get Unread:** POST .../notifications/getlist (Payload: IsActive: false)  
* **Get Read History:** POST .../notifications/getlist (Payload: IsActive: true)  
* **Mark Specific as Read:** GET .../notifications/updateNotificationById?Id={NotificationID}  
* **Mark All as Read:** GET .../notifications/updateAllNotificationStatus

## **10\. Reference Data**

### **Vendor Types (vendor\_Type)**

| ID | Type | ID | Type |
| :---- | :---- | :---- | :---- |
| 1 | Partnership | 10 | Personal Liability Company |
| 2 | Sole Proprietary | 15 | State Owned Company |
| 4 | Private | 17 | Trust |

### **Bank IDs (vendor\_BankAccountTypeID)**

| ID | Account Type |
| :---- | :---- |
| 2 | CURRENT |
| 3 | SAVINGS |
| 4 | TRANSMISSION |

### **Common Constants**

* **South Africa Nationality ID:** 153A0FB2-CC8D-4805-80D2-5F996720FED9