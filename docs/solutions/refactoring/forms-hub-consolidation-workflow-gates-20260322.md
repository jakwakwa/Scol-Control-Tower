---
module: Internal Forms Hub & Applicant Detail
date: 2026-03-22
problem_type: architecture_issue
component: react_component
symptoms:
  - "Forms Hub page orphaned — not linked from any UI, listing 4 form types when only 2 are internal"
  - "ABSA 6995 form duplicated between Forms Hub and Contract Review page with divergent implementations"
  - "Workflow gate buttons (Contract Draft Review, Confirm ABSA Approved) buried on a separate contract route instead of the Applicant Detail page"
  - "Applicant Detail page cramped with all internal activity but missing key actions"
root_cause: poor_separation_of_concerns
resolution_type: refactor
severity: medium
tags: [forms-hub, internal-forms, workflow-gates, absa, contract-review, tdd, refactoring, applicant-detail]
---

# Forms Hub Consolidation & Workflow Gates Relocation

## Symptom

The internal forms management was scattered across multiple pages with overlapping, divergent implementations:

1. **Orphaned Forms Hub** (`/dashboard/applications/[id]/forms`) — a well-designed page listing all 4 form types, but never linked from the UI. Two of the four forms (`facility_application`, `fica_documents`) were external-only and should not appear for internal users.
2. **Duplicate ABSA form** — the `[formType]/page.tsx` had inline ABSA PDF upload/send logic that duplicated what `AbsaPacketSection` already handled.
3. **Misplaced workflow gates** — the Contract Draft Review and Confirm ABSA Approved gates lived on `/dashboard/applicants/[id]/contract`, a page that bundled unrelated concerns (form + gates).
4. **Cramped Applicant Detail page** — the primary internal activity hub lacked direct access to forms or gates.

## Environment

- **Framework**: Next.js 16 + React 19
- **Testing**: bun:test (TDD approach for non-UI logic)
- **Files affected**:
  - `app/(authenticated)/dashboard/applications/[id]/forms/page.tsx`
  - `app/(authenticated)/dashboard/applications/[id]/forms/[formType]/page.tsx`
  - `app/(authenticated)/dashboard/applicants/[id]/page.tsx`
  - `app/(authenticated)/dashboard/applicants/[id]/contract/contract-review-client.tsx`
  - `lib/config/internal-forms.ts` (new)
  - `lib/config/workflow-gates.ts` (new)
  - `components/dashboard/applicants/workflow-gates-card.tsx` (new)
  - `tests/internal-forms-config.test.ts` (new)
  - `tests/workflow-gates-contract.test.ts` (new)

---

## Investigation

### Forms Hub Content Audit

The Forms Hub page defined `FORM_CONFIGS` inline with 4 form types. Cross-referencing with the `internalForms` DB schema (`db/schema.ts`) confirmed that `facility_application` and `fica_documents` are used exclusively by external magic-link forms (`/forms/[token]`). Only `stratcol_agreement` and `absa_6995` are internal.

### ABSA Duplication Analysis

The `[formType]/page.tsx` case for `absa_6995` had ~70 lines of inline state management (`absaFileInputRef`, `absaSending`, `handleAbsaPdfUpload`, `handleSendToAbsa`) that replicated what `AbsaPacketSection` already encapsulates. The component accepts `workflowId`, `applicantId`, `initialFormData`, `absaDocuments`, `disabled`, and `onRefresh` — covering all the inline logic.

### Gate Placement Decision

The contract review page (`contract-review-client.tsx`) bundled three unrelated concerns:
- Contract Draft Review Gate (Inngest workflow signal)
- ABSA 6995 form + PDF upload
- Confirm ABSA Approved Gate (Inngest workflow signal)

The gates are workflow signals — they don't need to live alongside forms. The Applicant Detail page is where internal users spend most time, making it the natural home for gates.

### Data Availability Check

The `absaPacketSent` field needed by the ABSA Confirm gate was already returned by the `/api/applicants/[id]` endpoint but not consumed by the Applicant Detail page. No API changes required.

---

## What Stayed Untouched (Zero Risk)

- All external magic-link forms (`/forms/[token]`, `/agreement/[token]`)
- All form submission APIs
- All Inngest event flows
- The `AbsaPacketSection` component itself (reused as-is)
- The hub page's visual design (cards, badges, progress bar)
- The applicant page's existing tabs (Forms, Documents, Risk)

---

## Solution

### 1. Extract & Filter Internal Forms Config (TDD)

**New file**: `lib/config/internal-forms.ts`

Extracted `FORM_CONFIGS` from the page component into a shared, testable config. Filtered to only `stratcol_agreement` and `absa_6995`.

```typescript
export const INTERNAL_FORM_CONFIGS: FormConfig[] = [
    {
        type: "stratcol_agreement",
        title: "StratCol Agreement",
        description: "Core contract establishing legal relationship and entity data",
        stage: 2,
    },
    {
        type: "absa_6995",
        title: "Absa 6995 Pre-screening",
        description: "Mandatory bank assessment for collection facilities",
        stage: 3,
    },
];
```

**Tests** (`tests/internal-forms-config.test.ts`): 3 assertions — allowed types, subset of DB enum, excludes external-only types.

### 2. Replace Inline ABSA With AbsaPacketSection

Replaced ~70 lines of inline state/handlers in `[formType]/page.tsx` with a single `<AbsaPacketSection>` call. Removed the `facility_application` and `fica_documents` switch cases entirely.

### 3. Create Workflow Gates Utility (TDD)

**New file**: `lib/config/workflow-gates.ts`

Extracted gate logic into testable functions:

```typescript
export function buildContractReviewEndpoint(workflowId: number): string
export function buildAbsaConfirmEndpoint(workflowId: number): string
export function canPerformGateActions(stage, status): boolean
export function canConfirmAbsa(stage, status, absaPacketSent): boolean
```

**Tests** (`tests/workflow-gates-contract.test.ts`): 6 assertions — endpoint construction, request body shapes, conditional gate activation.

### 4. Create WorkflowGatesCard Component

**New file**: `components/dashboard/applicants/workflow-gates-card.tsx`

Self-contained card with:
- Contract Draft Review gate with notes textarea and `ConfirmActionDrawer`
- ABSA Confirm gate with conditional enable based on `absaPacketSent`
- Both gates conditionally rendered when `stage === 5` and status is not `terminated`

### 5. Update Applicant Detail Page

- Added "Internal Forms" link button in header actions
- Integrated `WorkflowGatesCard` in the left sidebar
- Added `absaPacketSent` state from API response
- Removed duplicate "Mark Contract Reviewed" button from Reviews tab
- Removed the "Contract Review" header button (gates are now inline)

### 6. Deprecate Contract Route

Added a visible deprecation banner to `contract-review-client.tsx` informing users that gates have moved to the Applicant Detail sidebar and the ABSA form to the Internal Forms hub.

---

## Prevention

1. **Extract shared config early** — inline config arrays in page components are untestable and drift when duplicated. Use `lib/config/` for any data shared between UI and tests.
2. **Reuse existing components** — before writing inline state management, check if a component already encapsulates the logic (e.g., `AbsaPacketSection`).
3. **Colocate related actions** — workflow gates (signals) belong near the workflow's primary activity page, not alongside forms they don't interact with.
4. **TDD for data contracts** — even in a UI-heavy refactor, extracting logic into pure functions enables unit tests that guard against regressions without flaky E2E.

---

## Metrics

| Metric | Value |
|--------|-------|
| Net lines removed | ~211 |
| New test assertions | 9 (across 2 test files) |
| Components created | 2 (WorkflowGatesCard, internal-forms config) |
| Duplicated code eliminated | ~70 lines (ABSA inline logic) |
| Pages deprecated | 1 (`/dashboard/applicants/[id]/contract`) |
