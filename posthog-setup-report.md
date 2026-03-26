<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the StratCol Onboard Control Tower project. The integration covers the full onboarding lifecycle — from the initial applicant form submission through quote decisions, risk assessments, two-factor approvals, contract signing, and workflow termination. Both client-side (posthog-js) and server-side (posthog-node) tracking are set up, with events correlated by user ID (Clerk `userId`) on authenticated routes and by applicant/workflow ID on unauthenticated external routes.

**Files created:**
- `instrumentation-client.ts` — Initializes posthog-js for the browser using the Next.js 15.3+ instrumentation pattern. Enables session replay and automatic exception capture.
- `lib/posthog-server.ts` — Singleton PostHog Node.js client for server-side event capture.
- `.env.local` — `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` added.

**Files modified:**
- `next.config.mjs` — Added PostHog reverse-proxy rewrites (`/ingest/*` → `us.i.posthog.com`) and CSP `connect-src` entries for PostHog hosts.
- `app/api/applicants/route.ts` — Server-side `applicant_created` event.
- `app/api/quotes/[id]/approve/route.ts` — Server-side `quote_approved` event.
- `app/api/quotes/[id]/reject/route.ts` — Server-side `quote_rejected` event.
- `app/api/risk-decision/route.ts` — Server-side `risk_decision_submitted` event with outcome and override category.
- `app/api/onboarding/approve/route.ts` — Server-side `onboarding_approval_submitted` event for two-factor approvals.
- `app/api/workflows/[id]/reject/route.ts` — Server-side `workflow_terminated` event.
- `app/api/webhooks/contract-signed/route.ts` — Server-side `contract_signed` event.
- `app/api/forms/submit/route.ts` — Server-side `form_submitted` event with form type.
- `components/dashboard/applicant-form.tsx` — Client-side `applicant_form_submitted` event.
- `app/(unauthenticated)/agreement/[token]/agreement-form.tsx` — Client-side `agreement_contract_submitted` event.

> **Note:** Run `bun add posthog-js posthog-node` to install the PostHog packages (the sandbox prevented automatic installation during this session).

| Event | Description | File |
|---|---|---|
| `applicant_created` | New applicant record created and onboarding workflow started | `app/api/applicants/route.ts` |
| `applicant_form_submitted` | New-applicant form submitted from the dashboard | `components/dashboard/applicant-form.tsx` |
| `quote_approved` | Quote approved by an account manager | `app/api/quotes/[id]/approve/route.ts` |
| `quote_rejected` | Quote rejected by an account manager | `app/api/quotes/[id]/reject/route.ts` |
| `risk_decision_submitted` | Risk manager submits APPROVED / REJECTED / REQUEST_MORE_INFO decision | `app/api/risk-decision/route.ts` |
| `onboarding_approval_submitted` | Two-factor approval decision recorded (risk_manager or account_manager) | `app/api/onboarding/approve/route.ts` |
| `workflow_terminated` | Workflow manually terminated via the kill-switch | `app/api/workflows/[id]/reject/route.ts` |
| `contract_signed` | Signed contract webhook received from Google Apps Script | `app/api/webhooks/contract-signed/route.ts` |
| `form_submitted` | External applicant form submitted (facility, quotation, call-centre, or agreement) | `app/api/forms/submit/route.ts` |
| `agreement_contract_submitted` | StratCol agreement contract form submitted by an external applicant | `app/(unauthenticated)/agreement/[token]/agreement-form.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics:** https://us.posthog.com/project/349918/dashboard/1380897
- **Onboarding Conversion Funnel:** https://us.posthog.com/project/349918/insights/mwUK6Ft5
- **Applicant Pipeline Volume:** https://us.posthog.com/project/349918/insights/BnOPmRb9
- **Quote Decision Rate:** https://us.posthog.com/project/349918/insights/kRBtOa46
- **Risk Decisions by Outcome:** https://us.posthog.com/project/349918/insights/Vtk3zo9r
- **Workflow Terminations & Churn:** https://us.posthog.com/project/349918/insights/teogvSYt

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

---

## Supplemental Integration (2026-03-20)

Additional events and a second dashboard were added in a follow-up integration pass.

**Files modified:**

- `app/api/workflows/route.ts` — Server-side `workflow_started` event after workflow creation.
- `app/api/workflows/[id]/kill-switch/route.ts` — Server-side `workflow_kill_switch_activated` event.
- `app/(unauthenticated)/uploads/[token]/upload-view.tsx` — Client-side `document_uploaded` event per file upload.
- `components/dashboard/dashboard-shell.tsx` — `posthog.identify()` wired to Clerk `useUser()` for user identity correlation.

**New events:**

| Event | Description | File |
|---|---|---|
| `workflow_started` | Workflow record created and Inngest pipeline triggered | `app/api/workflows/route.ts` |
| `workflow_kill_switch_activated` | Emergency kill switch executed by a staff member | `app/api/workflows/[id]/kill-switch/route.ts` |
| `document_uploaded` | External applicant uploads a document via magic link | `app/(unauthenticated)/uploads/[token]/upload-view.tsx` |

**Dashboard — Analytics basics (updated):** https://us.posthog.com/project/349918/dashboard/1381296

| Insight | URL |
|---------|-----|
| Onboarding Pipeline Activity | https://us.posthog.com/project/349918/insights/48GUcTg1 |
| Onboarding Conversion Funnel | https://us.posthog.com/project/349918/insights/YnwJkcZj |
| Quote Decision Outcomes | https://us.posthog.com/project/349918/insights/tR9W6Jik |
| Workflow Terminations & Kill Switch | https://us.posthog.com/project/349918/insights/91m328Jt |

</wizard-report>
