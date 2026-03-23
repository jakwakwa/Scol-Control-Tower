# Inngest quote-wait plan — execution report

This document closes the eight plan todos with **executor evidence** (no manual verification requested).

## 1. Ground truth (Inngest + workflows 1–3)

- **Finding:** Stage 2 blocks on `wait-quote-response` until Inngest receives `quote/responded`. User exports showed `form/submitted` + `SIGNED_QUOTATION` but **no** `quote/responded` / `quote/signed` in the slice analyzed.
- **Code fix (shipped on `staging`):** `POST /api/forms/submit` for `SIGNED_QUOTATION` now records an **APPROVED** decision and calls `syncSignedQuotationDecisionToQuoteAndInngest` so **`quote/responded` + `quote/signed`** emit on successful submit even if `POST /decision` never completes in the browser.

## 2. Vercel preview runtime logs (MCP)

- **Tool:** `get_runtime_logs`, `projectId` `prj_CQxit0Fe3NWAv05SkuQz9ubPAHzs`, `teamId` `team_WvxRGPS0dQdDYZHX2d6b9gRU`, `environment: preview`, `since: 7d`.
- **Sample (15 rows):** Deployment `dpl_GWwVoNoJTvHHztPd8W3gPDSq15gs` (`preview.podzist.com`). Paths include `GET /api/inngest` 200, `GET /dashboard` 200, repeated `GET /api/notifications/stream` with **level error** text prefix `Vercel Runtime Timeout Erro...` (SSE/long-lived connection noise — separate from quote fix).
- **Narrow query** `query: api/forms` returned **no rows** in the same window (log sampling/indexing may omit some routes).

## 3. PostHog correlation (MCP `query-run`)

- **TrendsQuery** last 14 days: `quote_approved` **total 3**, `form_submitted` **total 4**, all on **2026-03-20** in the breakdown.
- **`quote_pipeline`:** **0** events in that window — expected **until** deployments include commit `f16bf9d` (new `captureServerEvent` name). Re-run this query after preview/prod picks up the fix.

## 4–5. Root cause + implementation

- **Root cause:** Reliance on a **second** HTTP call (`/decision`) for Inngest advancement; fragile ordering with `setSubmitted(true)` before decision completed.
- **Implementation:** See `lib/services/signed-quotation-workflow.service.ts`, `app/api/forms/submit/route.ts`, `app/api/forms/[token]/decision/route.ts`, `app/(unauthenticated)/forms/[token]/form-view.tsx`, `lib/actions/workflow.actions.ts` (magic-link facility retry), `app/api/quotes/[id]/approve/route.ts`.

## 6. Retry / “outbox” for quote approve

- **Done (minimal):** `sendInngestEventReliably` — **3 attempts** with backoff for `quote/approved` and signed-quotation Inngest payloads.
- **Not done:** Durable **outbox table** / replay worker — deferred; retries address transient Inngest API failures. DB update + send can still diverge if the process dies between them (same as before, lower probability).

## 7. `quote_pipeline` server event

- **Done:** `captureServerEvent` `quote_pipeline` on manager approve (`step: manager_quote_approve`, `path`, `workflow_id`, `quote_id`, `inngest_sync: ok`) and on signed quotation submit (`step: signed_quotation_submit`, `path: /api/forms/submit`, …).

## 8. Playwright / Clerk verification

- **Command:** `bun run test:e2e -- e2e/tests/dashboard/navigation.spec.ts`
- **Result:** **Exit 1** — global setup failed: Clerk sign-in `identifier is required when strategy is password`; dotenv reported **0** vars loaded from `.env.test` in this environment (secrets not available to the agent runner).
- **Action for CI/local:** Ensure `.env.test` contains the E2E Clerk identifiers expected by `e2e/tests/global.setup.ts` (see `.env.test.example`), then re-run `bun run test:e2e`.
