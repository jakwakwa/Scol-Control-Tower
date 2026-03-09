# Connect Risk Review Detail to Real Data

## Goal Description
The objective is to connect the newly added static [risk-review-detail.tsx](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/components/dashboard/risk-review/risk-review-detail.tsx) component to real data flowing from the applicant creation form through the background workflows (ProcureCheck and Sanctions). This involves database schema redesign, conditional form logic for Proprietor vs Company identifiers, and updating the API integrations to handle these identifiers correctly.

## User Review Required

> [!IMPORTANT]
> **ProcureCheck API for Proprietors:** The current [lib/procurecheck.ts](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/lib/procurecheck.ts) sends `vendor_RegNum`. When dealing with a Proprietor (using an ID Number instead of a Registration Number), what is the correct field name expected by the ProcureCheck API in the payload? Is it `vendor_IdNumber`, `idNumber`, or does it reuse `vendor_RegNum`?

> [!WARNING]
> We will be adding multiple JSON-structured text columns to the `risk_assessments` table to store the complex hierarchical data expected by [risk-review-detail.tsx](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/components/dashboard/risk-review/risk-review-detail.tsx) (e.g., directors, riskAlerts, ficaData). Please confirm this approach aligns with your database design preferences, or if you prefer strict normalized tables for these entities.

## Proposed Changes

### Database Schema Updates
---
#### [MODIFY] [db/schema.ts](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/db/schema.ts)
- Update the `riskAssessments` table to include fields mapping directly to the data structures required by [risk-review-detail.tsx](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/components/dashboard/risk-review/risk-review-detail.tsx).
- Add overall fields: `overallScore` (integer), `overallStatus` (text).
- Add specific JSON document fields: `procurementData` (text), `itcData` (text), `sanctionsData` (text), `ficaData` (text).
- Update `applicants` table logic if needed to ensure `entityType` cleanly separates 'proprietor' from companies.

### Frontend Forms and Validation
---
#### [MODIFY] [components/dashboard/applicant-form.tsx](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/components/dashboard/applicant-form.tsx)
- Implement dynamic toggling: If `entityType === "proprietor"`, show and require "SA ID Number", hide "CIPC Registration Number". Let it be either ID number OR Reg number.
- Update [validateForm](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/components/dashboard/applicant-form.tsx#102-123) to conditionally enforce validation based on the `entityType`.
- Update the component state [fillTestData](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/components/dashboard/applicant-form.tsx#75-93) to mock correctly based on the selected type.

#### [MODIFY] [app/api/applicants/route.ts](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/app/api/applicants/route.ts) (or relevant submit handlers)
- Ensure the backend validation correctly accepts the conditionally provided ID or Registration number based on the `entityType`.

### End-to-End Tests
---
#### [MODIFY] [e2e/tests/dashboard/new-applicant.spec.ts](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/e2e/tests/dashboard/new-applicant.spec.ts)
- Update the test to handle the new conditionally rendered form fields. If it tests a 'Company', ensure it doesn't look for the ID number field unless intended.

### API Integrations (ProcureCheck & Sanctions)
---
#### [MODIFY] [lib/procurecheck.ts](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/lib/procurecheck.ts)
- Update [createTestVendor](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/lib/procurecheck.ts#69-112) to accept either `registrationNumber` or `idNumber`.
- Adapt the payload sent to ProcureCheck depending on whether the entity is a Proprietor (using ID) or a Company (using Reg No).

#### [MODIFY] [lib/services/itc.service.ts](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/lib/services/itc.service.ts)
- Update [performITCCheck](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/lib/services/itc.service.ts#54-120) to extract the correct identifier (ID or Reg No) based on the applicant's `entityType`.
- Pass the correct identifier to [performProcureCheckCheck](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/lib/services/itc.service.ts#190-240).

#### [MODIFY] [lib/services/risk.service.ts](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/lib/services/risk.service.ts)
- Enhance the risk analysis parser to generate the structured data expected by `procurementData` and `itcData` in the new [risk-review-detail.tsx](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/components/dashboard/risk-review/risk-review-detail.tsx) format.

### UI Integration
---
#### [MODIFY] [components/dashboard/risk-review/risk-review-detail.tsx](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/components/dashboard/risk-review/risk-review-detail.tsx)
- Modularize the component by splitting it into smaller, manageable sub-components (e.g., `RiskScoreGauge`, `RiskAlertsList`, `DetailTabs`).
- Remove the hardcoded `globalData`, `procurementData`, `sanctionsData`, `itcData`, `ficaData` mocks.
- Accept these data structures as props from the parent page.

#### [MODIFY] [app/(authenticated)/dashboard/risk-review/page.tsx](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/app/%28authenticated%29/dashboard/risk-review/page.tsx)
- Fetch the applicant, their associated `riskAssessments` data, and pass it down to the [RiskReviewDetail](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/components/dashboard/risk-review/risk-review-detail.tsx#533-1211) component.

## Verification Plan

### Automated Tests
- Run `bun test e2e/tests/dashboard/new-applicant.spec.ts` to ensure the form toggling and applicant creation logic is unbroken.
- Run any existing ProcureCheck tests (e.g. `bun run scripts/test-procurecheck.ts`) with updated parameters to verify the API integrations.

### Manual Verification
- Manually create a new applicant of type "Company" and verify that only the Registration Number is asked for.
- Manually create a new applicant of type "Proprietor" and verify that only the ID Number is asked for.
- View the "Risk Review" dashboard for these applicants to ensure the details load correctly from the database instead of the static mock data.
