### Route Architecture

The frontend utilizes the Next.js App Router with two route groups:

*   **(authenticated)/dashboard/**: Internal staff UI (Clerk authentication via layout-level `auth()` check)
*   **(unauthenticated)/forms/\[token\]/** and **(unauthenticated)/uploads/\[token\]/**: Public applicant-facing pages (token-based, no login required)

**app/(authenticated)/dashboard/**

*   **page.tsx**: Pipeline view (6-stage Kanban)
*   **applicants/**
    *   **page.tsx**: Applicant list
    *   **new/page.tsx**: Create applicant
    *   **\[id\]/page.tsx**: Applicant detail (main workflow UI)
    *   **\[id\]/quote/page.tsx**
*   **workflows/**
    *   **page.tsx**: Workflows table
    *   **\[id\]/page.tsx**: Workflow detail and timeline
*   **applications/\[id\]/forms/**
    *   **page.tsx**: Forms hub (progress)
    *   **\[formType\]/page.tsx**: Form editor
*   **risk-review/page.tsx**: Risk review queue
*   **sanctions/page.tsx**: Sanctions adjudication
*   **agents/page.tsx**: Agent stats
*   **notifications/page.tsx**

**app/(unauthenticated)/**

*   **forms/\[token\]/**: Magic link forms (facility, contract, ABSA, etc.)
*   **uploads/\[token\]/**: Document upload portal
*   **agreement/\[token\]/**: Contract agreement
* * *

### How the UI Maps to Each Workflow Stage

#### Stage 1: Lead Capture

| UI Action | Component | API Route | Inngest Event |
| ---| ---| ---| --- |
| Create applicant | applicants/new/page.tsx | POST /api/applicants | onboarding/lead.created |
| External lead webhook | N/A | POST /api/webhooks/lead-capture | onboarding/lead.created |

#### Stage 2: Facility, Pre-Risk, and Quote

| UI Action | Component | API Route | Inngest Event | Workflow Gate |
| ---| ---| ---| ---| --- |
| Submit facility form | forms/\[token\]/form-view.tsx | POST /api/forms/submit | form/facility.submitted | wait-facility-app |
| Retry facility | applicants/\[id\]/page.tsx | Server action retryFacilitySubmission | form/facility.submitted | wait-facility-app |
| Pre-risk approve/decline | applicants/\[id\]/page.tsx | POST /api/risk-decision/pre | risk/pre-approval.decided | wait-pre-risk-approval |
| Approve quote | quote-approval-form.tsx | POST /api/quotes/\[id\]/approve | quote/approved | wait-quote-approval |
| Reject quote | quote-approval-form.tsx | POST /api/quotes/\[id\]/reject | quote/rejected | None (workflow times out) |
| Applicant signs quote | forms/\[token\]/form-view.tsx | POST /api/forms/\[token\]/decision | quote/responded + quote/signed | wait-quote-response |
| Upload mandate docs | uploads/\[token\]/upload-view.tsx | POST /api/documents/upload | document/uploaded | triggers aggregator -> upload/fica.received -> wait-mandate-docs |

#### Stage 3: Procurement and AI

| UI Action | Component | API Route | Inngest Event | Workflow Gate |
| ---| ---| ---| ---| --- |
| Procurement approve/deny | risk-review-queue.tsx | POST /api/risk-decision/procurement | risk/procurement.completed | wait-procurement-decision |
| Upload FICA docs | uploads/\[token\]/upload-view.tsx or internal | POST /api/fica/upload | upload/fica.received | wait-fica-docs |
| Clear sanction | sanction-adjudication.tsx | POST /api/sanctions {action: "clear"} | sanction/cleared | wait-sanction-clearance |
| Confirm sanction | sanction-adjudication.tsx | POST /api/sanctions {action: "confirm"} | sanction/confirmed | cancelOn (terminates) |

#### Stage 4: Risk Review

| UI Action | Component | API Route | Inngest Event | Workflow Gate |
| ---| ---| ---| ---| --- |
| Risk decision | risk-review-detail.tsx | POST /api/risk-decision | risk/decision.received | wait-risk-decision |
| Confirm financial statements | MISSING UI | No API route | risk/financial-statements.confirmed | wait-financial-statements |

#### Stage 5: Contract

| UI Action | Component | API Route | Inngest Event | Workflow Gate |
| ---| ---| ---| ---| --- |
| AM reviews contract draft | MISSING UI | No API route | contract/draft.reviewed | wait-contract-reviewed |
| Applicant signs contract | forms/\[token\]/form-view.tsx | POST /api/forms/\[token\]/decision | form/decision.responded + contract/signed | wait-contract-decision |
| Complete ABSA form | MISSING UI | No API route | form/absa-6995.completed | wait-absa-completed |

#### Stage 6: Final Approval

| UI Action | Component | API Route | Inngest Event | Workflow Gate |
| ---| ---| ---| ---| --- |
| Risk Manager approve | final-approval-card.tsx | POST /api/onboarding/approve | approval/risk-manager.received | wait-risk-manager-approval |
| Account Manager approve | final-approval-card.tsx | POST /api/onboarding/approve | approval/account-manager.received | wait-account-manager-approval |

* * *

### Workflow Status Display

The UI displays workflow states through several components:

| Component | File | What It Shows |
| ---| ---| --- |
| PipelineView | components/dashboard/pipeline-view.tsx | 6-stage Kanban board; cards placed by currentStage |
| WorkflowProgressStepper | components/dashboard/workflow-progress-stepper.tsx | Horizontal stepper (1-6), completed/current/pending/error states |
| WorkflowTable | components/dashboard/workflow-table.tsx | Data table with StatusBadge, WorkflowStageIndicator (6 dots) |
| StatusBadge / StageBadge / RiskBadge | components/ui/status-badge.tsx | Color-coded badges for status/stage/risk |
| ActivityFeed / CompactTimeline | components/dashboard/activity-feed.tsx | Event timeline (stage\_change, agent\_dispatch, timeout, error) |
| NotificationsPanel | components/dashboard/notifications-panel.tsx | Real-time-ish notifications (awaiting, completed, failed, etc.) |
| ParallelBranchStatus | components/dashboard/parallel-branch-status.tsx | Stage 3 parallel stream status (procurement vs documents) |

Real-time updates: Only mechanism is a 30-second polling interval via `router.refresh()` in DashboardShell. No WebSockets, SSE, or SWR/React Query.
* * *

### Auth on API Routes

| Auth Type | Routes | Notes |
| ---| ---| --- |
| Clerk (auth()) | risk-decision/pre, risk-decision, risk-decision/procurement, sanctions, quotes/reject, onboarding/documents/upload, onboarding/approve, kill-switch | Staff actions |
| Shared secret | webhooks/lead-capture, webhooks/contract-signed | External system callbacks |
| Token-based | forms/submit, forms/\[token\]/decision, documents/upload, contract/review | Applicant magic links |
| None | applicants (POST), workflows (POST), callbacks/quotes, applicants/approval, workflows/signal, workflows/resolve-error, quotes/approve | Potential security concern |

* * *

### Critical Findings: UI/Workflow Gaps

#### 3 Workflow Gates With No UI or API Emitter

These are events the workflow `waitForEvent` listens for, but no code in the entire codebase emits them. This means the workflow will always time out at these gates:

1. **contract/draft.reviewed** (Stage 5, wait-contract-reviewed): The workflow expects the Account Manager to review/edit the AI-generated contract before it's sent to the client. There is no UI page or API endpoint for this action. The workflow will time out after 7 days at this gate.
2. **form/absa-6995.completed** (Stage 5, wait-absa-completed): The workflow expects notification that the ABSA 6995 form is completed. The magic link form submission emits `form/submitted` and the dashboard emits `onboarding/form-submitted`, but neither emits `form/absa-6995.completed`. The workflow will time out after 7 days.
3. **risk/financial-statements.confirmed** (Stage 4, wait-financial-statements): For high-risk applicants, the workflow waits for confirmation that financial statements have been received. No UI or API provides this action. High-risk applicants will always time out at this gate after 14 days.

#### Kill Switch UI Gap

*   The POST /api/workflows/\[id\]/kill-switch endpoint exists and is fully functional, but no direct "Terminate Workflow" button exists in the dashboard UI.
*   The workflow table has a "Reject Workflow" action that calls DELETE /api/workflows/\[id\]/reject—a different endpoint that does not trigger the Inngest kill switch.
*   The only UI path to the kill switch is through sanctions confirmation ("Confirm & Terminate" in the sanctions adjudication page).

#### Unauthenticated API Routes

Several API routes that emit workflow-critical events have no authentication:

*   POST /api/applicants: creates applicants and starts workflows
*   POST /api/workflows: creates workflows
*   POST /api/quotes/\[id\]/approve: approves quotes (critical financial action)
*   POST /api/applicants/approval: emits various approval events
*   POST /api/workflows/\[id\]/signal: sends arbitrary signals to workflows
*   POST /api/workflows/\[id\]/resolve-error: resolves workflow errors

#### Middleware Configuration

The Clerk middleware in proxy.ts only protects routes matching /protected(.\*). The dashboard lives under (authenticated)/dashboard/, which does not match this pattern. Auth is enforced at the layout level instead (dashboard/layout.tsx checks `auth()` and redirects). This means:

*   Dashboard pages are protected via the layout auth check
*   API routes under /api/ that don't explicitly call `auth()` are fully open

#### 30s Polling Only

The dashboard refreshes via `router.refresh()` every 30 seconds. For a workflow system with real-time human approval gates, this means:

*   Users may wait up to 30 seconds to see status changes after an action
*   No push notifications for urgent actions (sanctions hits, timeouts, escalations)
* * *

### Summary: What Works Well

*   Stages 1-3 have comprehensive UI coverage: applicant creation, facility forms, quote approval, pre-risk decisions, procurement review, sanctions adjudication, and document uploads all have working UI paths.
*   Stage 6 two-factor approval has a dedicated FinalApprovalCard with proper role-based approval.
*   The PipelineView Kanban and WorkflowProgressStepper provide clear visual status.
*   The notifications system surfaces workflow events to staff in real-time-ish (30s).
*   Token-based magic links for applicant-facing forms are well-implemented.

### Summary: What Needs Attention

1. Three dead-end workflow gates—contract/draft.reviewed, form/absa-6995.completed, risk/financial-statements.confirmed—have no emitters; workflows will time out at these points.
2. Kill switch not exposed in UI—only accessible through sanctions confirmation.
3. Six unauthenticated API routes that emit workflow-critical events.
4. No real-time updates—30s polling only.
5. quote/rejected has no workflow gate—the workflow only waits for quote/approved; rejections cause a 30-day timeout rather than immediate termination.