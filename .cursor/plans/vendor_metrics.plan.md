# Vendor-Check Monitoring & Alerting

## Background

The previous task audited vendor-check failure handling and identified 5 gaps. This task instruments those checks — and the surrounding orchestration steps — with structured metrics and alerts so failures are visible and actionable in production.

## Existing Infrastructure

| Asset | Notes |
|---|---|
| `lib/posthog-server.ts` | `captureServerEvent()` fire-and-forget wrapper; already used in 12+ API routes |
| `lib/services/telemetry/perimeter-metrics.ts` | Pattern reference: structured log → PostHog event with sampling, env label, reason_code |
| `lib/services/notification-events.service.ts` | `logWorkflowEvent()` → `workflowEvents` DB table (internal audit trail) |
| PostHog project | Project ID `349918`; dashboards already exist for workflow events |

**Key insight:** PostHog is the single telemetry sink. The pattern from `perimeter-metrics.ts` is exactly what we need — structured console log + `captureServerEvent`. We replicate it for vendor checks.

---

## User Review Required

> [!IMPORTANT]
> **No changes to `stage3_enrichment.ts` production logic.** This task is instrumentation only. The retry hardening (Gap 1–4) is a separate task. Here we only add `captureServerEvent` calls and a new telemetry module.

> [!NOTE]
> **PostHog alerting** requires a PostHog subscription with Alert rules configured manually in the UI after the events start flowing (or via the PostHog API). This plan includes the event names and properties to look for so you can configure them either way.

---

## Proposed Changes

### New File

#### [NEW] `lib/services/telemetry/vendor-metrics.ts`

A single, reusable module that all vendor service wrappers and Inngest steps call. Mirrors the pattern from `perimeter-metrics.ts`:

- `recordVendorCheckAttempt(params)` — fires on every call (sampled on success, always on failure).
- `recordVendorCheckFailure(params)` — shorthand for error paths.
- `recordVendorCheckSuccess(params)` — shorthand for success paths.

**PostHog event:** `vendor_check_attempt`

**Properties:**
```
vendor:          "procurecheck" | "xds_itc" | "opensanctions" | "firecrawl_sanctions" 
                 | "document_ai_fica" | "firecrawl_vat" | "document_ai_identity"
stage:           2 | 3 | "async"
workflow_id:     number
applicant_id:    number
outcome:         "success" | "transient_failure" | "persistent_failure" | "business_denial"
failure_type:    "network" | "timeout" | "auth" | "schema_error" | "rate_limit" | "outage" | null
http_status:     number | null
duration_ms:     number
env:             "production" | "preview" | "development"
```

---

### Modified Files

#### [MODIFY] `lib/services/risk.service.ts` (ProcureCheck)
- Add `recordVendorCheckAttempt` around the `createTestVendor` + `getVendorResults` calls.
- Record `outcome: "transient_failure"` on network errors, `"persistent_failure"` on 401/403, `"success"` on result.
- Add `duration_ms` timing.

#### [MODIFY] `lib/services/itc.service.ts` (ITC / XDS)
- Add `recordVendorCheckAttempt` in `performProcureCheckCheck` and `performXDSCreditCheck` entry points.
- Record `outcome: "business_denial"` when recommendation is `AUTO_DECLINE`.
- Add `duration_ms` timing.
- **Bonus:** Add a structured `console.error` for the silent `createManualRequiredResult` paths that currently have no log.

#### [MODIFY] `lib/services/firecrawl/firecrawl.client.ts`
- Add `recordVendorCheckAttempt` around Firecrawl fetch calls.
- Tag `vendor: "firecrawl_sanctions"` or `"firecrawl_vat"` based on caller (pass via options).

#### [MODIFY] `inngest/functions/control-tower/stages/stage3_enrichment.ts`
- In the `catch` blocks for `check-procurement`, `check-itc`, `check-sanctions`, `check-fica-validation`, and `check-vat`:
  - Add `recordVendorCheckFailure(...)` **before** the existing `logWorkflowEvent` call.
  - This provides PostHog visibility even if the individual service files don't yet have instrumentation.
- This is **additive only** — no logic changes.

#### [MODIFY] `inngest/functions/id-verification.ts`
- Add `recordVendorCheckAttempt` around `processIdentityVerification`.
- Record `outcome: "transient_failure"` when result has `error`.

---

### New `LogEventParams` event types (additive)

#### [MODIFY] `lib/services/notification-events.service.ts`
Add to the `eventType` union (DB audit trail completeness):
```
| "vendor_check_failed"
| "vendor_check_succeeded"
```

---

## Alert Specification (PostHog)

Once events flow, configure these alerts in PostHog (Settings → Alerts, or `/api/alerts`):

| Alert Name | Query | Threshold | Severity |
|---|---|---|---|
| **Vendor Failure Spike** | `vendor_check_attempt` where `outcome IN (transient_failure, persistent_failure)` | > 5 failures in 15 min per vendor | 🔴 Critical |
| **Vendor Auth Failure** | `vendor_check_attempt` where `failure_type = auth` | ≥ 1 in any window | 🔴 Critical |
| **ITC Silent Failure** | `vendor_check_attempt` where `vendor = xds_itc AND outcome = transient_failure` | > 3 in 30 min | 🟡 Warning |
| **VAT Check Error Rate** | `vendor_check_attempt` where `vendor = firecrawl_vat AND outcome != success` | > 10% error rate over 1h | 🔵 Info |
| **Stage 3 Full Outage** | `vendor_check_attempt` where `stage = 3 AND outcome = persistent_failure` across ≥ 3 vendors | Any in 5 min | 🔴 Critical |

> [!TIP]
> These can be set up via the PostHog UI Alerts feature or POST'd via `POSTHOG_PERSONAL_API_KEY` + `/api/projects/:id/alerts`. We'll include a setup script.

---

## Open Questions

1. **Duration tracking:** Should `duration_ms` be measured at the service layer (inside `risk.service.ts`) or at the Inngest `step.run` boundary (in `stage3_enrichment.ts`)? Service layer is more precise; step boundary is simpler. **Recommendation:** Service layer.

2. **Sampling on success:** The perimeter telemetry samples pass events at 1-in-10 (configurable). Should vendor success events use the same config or always capture? Given vendor calls are infrequent (1 per workflow), **recommendation: always capture** (no sampling needed).

3. **Alert delivery:** PostHog can send alerts to email, Slack webhook, or PagerDuty. Which channel do you want for **Critical** vendor outage alerts? (Slack webhook is easiest to configure.)

---

## Verification Plan

### Automated Check
- `bun run lint` must pass (no new lint errors from additive calls).
- A lightweight unit test for `vendor-metrics.ts` that mocks `captureServerEvent` and verifies the correct event shape is captured.

### Manual Verification
- Trigger a workflow with a known-bad ProcureCheck config → verify `vendor_check_attempt` event appears in PostHog Live Events with `outcome: persistent_failure`.
- Confirm the structured console log appears in server logs with the correct JSON shape.
