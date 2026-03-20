# Inngest Perimeter Validation Rollout Plan

## Overview
This document outlines a low-risk rollout strategy for introducing strict Zod schema validation at the Inngest perimeter for the `onboarding/lead.created` and relevant sanctions events. This addresses Flag 1 from the Schema Enforcer Audit Trail: strict schemas for these events are breaking for existing loose payloads.

The goal is to ensure producer compatibility, minimize disruptions, and provide clear monitoring during transition.

**Date Created:** 2026-03-19  
**Owner:** [TBD - Risk Engineering Lead]  
**Linked Task:** [Link to original task or issue]

## Affected Events and Producers

### 1. onboarding/lead.created
- **Schema:** `LeadCreatedSchema` (defined in `lib/validations/control-tower/onboarding-schemas.ts`)
- **Validation Location:** Inngest workflow entrypoint (`inngest/functions/control-tower-workflow.ts`) via `validatePerimeter`.
- **Producers:**
  - **Internal:** POST `/api/applicants` (`app/api/applicants/route.ts`) – Applicant creation in the dashboard.
    - **Migration:** Update payload construction to match schema. High control; can be done immediately.
    - **Timeline:** Week 1.
    - **Owner:** Frontend/Backend Dev.
  - **External:** Webhook `/api/webhooks/lead-capture` (`app/api/webhooks/lead-capture/route.ts`) – Google Forms/Apps Script integration.
    - **Migration:** Update the Google Apps Script to send schema-compliant payload (add missing fields like `workflowId`, `applicantId`).
    - **Timeline:** Week 2 (coordinate with forms team).
    - **Owner:** Integration Team.
- **Compatibility Approach:** No versioning needed; update producers directly. Temporary loose mode if required.

### 2. Sanctions Events (e.g., `sanctions/external.received`, `sanctions_ingress_received`)
- **Schema:** `ExternalSanctionsIngressSchema` (defined in `lib/validations/control-tower/onboarding-schemas.ts`)
- **Validation Location:** API ingress (`app/api/sanctions/external/route.ts`) via `validatePerimeter`. Internal events like `sanctions_completed` are sent within Inngest (no external producer risk).
- **Producers:**
  - **External:** POST `/api/sanctions/external` – From sanctions providers (OpenSanctions API, manual compliance overrides).
    - **Migration:** Coordinate with providers to ensure payloads include required fields (e.g., `workflowId`, `applicantId`, `provider`, `passed`, etc.). For manual, update UI/form.
    - **Timeline:** Weeks 3-4 (requires external coordination).
    - **Owner:** Risk Ops + External Vendor Liaison.
  - **Internal:** Inngest helpers (`inngest/functions/control-tower/helpers.ts`) – `sanctions_completed` event; already schema-aware.
    - **Migration:** N/A – Internal and compliant.
- **Compatibility Approach:** Implement versioned endpoint (e.g., `/v1/sanctions/external`) for legacy, migrate to `/v2` with strict schema. Or use compatibility mode (warn + transform).

## Rollout Strategy

### Phases
1. **Preparation Phase (Week 1) – Observe & Prepare**
   - Enable \"warn-only\" mode in `validatePerimeter`: Log schema mismatches to a dedicated monitoring stream (e.g., Datadog/Sentry) without rejecting.
   - Collect baseline data: Sample 100+ payloads from each producer to identify common violations.
   - Update internal producers to strict compliance.
   - Confidence: 10/10 (Non-breaking).

2. **Internal Migration Phase (Week 2) – Test & Validate**
   - Enforce strict validation for internal producers (e.g., `/api/applicants`).
   - Run end-to-end tests with updated Google webhook.
   - Monitor for warnings; fix any issues.
   - If warnings > 0 after 48h, extend warn mode.
   - Confidence: 9/10 (Internal control high; external webhook moderate).

3. **External Coordination Phase (Weeks 3-4) – Gradual Enforcement**
   - Notify external teams (forms script owners, sanctions providers) with schema docs and migration guide.
   - For sanctions: Introduce optional `version` field; reject v1 if invalid, accept v2 strict.
   - Switch to hard reject only after 7 days of zero warnings in warn mode.
   - Rollback: Revert to loose schema if failure rate > 5%.
   - Confidence: 7/10 (Depends on external response time).

4. **Post-Rollout Phase (Week 5+) – Monitor & Optimize**
   - Full enforcement across all producers.
   - Continuous monitoring; deprecate legacy modes after 30 days.
   - Update Schema Enforcer Audit Trail to mark as executed.

### Risk Mitigation
- **Rollback Plan:** Toggle `ENFORCE_STRICT_SCHEMAS` env var to false; reverts to loose Zod .passthrough().
- **Fallback:** If external producers can't update quickly, implement payload transformation in the API route.
- **Testing:** See below.

## Contract Tests & Monitoring

### Contract Tests
- Add integration tests in `tests/integration/`:
  - `test-lead-created-validation.ts`: Mock inngest.send from producers; assert schema compliance and workflow progression.
  - `test-sanctions-ingress-validation.ts`: POST to `/api/sanctions/external` with valid/invalid payloads; assert 400 on invalid.
- Use Playwright E2E: Simulate full onboarding flow with lead capture → workflow → sanctions check.
- Pact or similar for external contracts if providers support.

## PostHog Flag-Driven Runtime Configuration

### Feature flag key

- `perimeter_validation_config`

### Payload shape

```json
{
  "globalMode": "warn",
  "eventOverrides": {
    "onboarding/lead.created": "strict",
    "sanctions/external.received": "warn"
  },
  "telemetryEnabled": true,
  "passSamplingWeight": 20
}
```

### Runtime behavior

- `globalMode` + `eventOverrides` control strictness by perimeter without a deploy.
- `telemetryEnabled` controls whether `perimeter_validation_attempt` is emitted.
- `passSamplingWeight` controls sampled pass telemetry (failures always emit at weight `1`).
- Env fallback remains active when PostHog config is unavailable or invalid:
  - `ENFORCE_STRICT_SCHEMAS`
  - `PERIMETER_VALIDATION_OVERRIDES`
  - `PERIMETER_TELEMETRY_ENABLED`
  - Optional: `POSTHOG_PERIMETER_CONFIG_ENABLED=true` to turn on PostHog flag loading.

### Local dev performance

- Server captures batch by default (`POSTHOG_FLUSH_AT`, `POSTHOG_FLUSH_INTERVAL_MS` in `.env.example`). Per-event flushing was hammering the network and CPU.
- Browser: PostHog debug mode, exception capture, and session recording are **off** unless you opt in via `NEXT_PUBLIC_POSTHOG_*` env vars (see `.env.example`).
- Perimeter success logs are suppressed in `development` unless `PERIMETER_TELEMETRY_VERBOSE_LOG=true`.

### Dashboard and alert requirements

- **Create the dashboard in PostHog** (insights + layout) by running `bun run posthog:perimeter-dashboard` with `POSTHOG_PERSONAL_API_KEY` set; see [posthog-perimeter-dashboard.md](../posthog-perimeter-dashboard.md).
- Success rate trend by `env` + `perimeter_id` over time.
- Top `reason_code` for failures over 24h and 72h.
- Estimated pass volume using sampled events and `sampling_weight`.
- Alerts:
  - Production success rate drops below threshold with minimum traffic.
  - New or rapidly rising `reason_code` spikes in production.

### Monitoring & Alerting
- **Metrics:** Track `perimeter_validation_failures` (count, by event/producer), `payload_violations` (by field).
- **Tools:** Datadog for logs; alert on >0 failures/day post-enforcement.
- **Dashboards:** Add to Risk Review dashboard: Validation health widget.
- **Alerts:** PagerDuty for critical failures (e.g., >10% rejection rate).

## Communication & Ownership

### Ownership
- **Overall Owner:** Risk Engineering Lead (e.g., [Name]).
- **Technical Implementation:** Backend Dev (internal updates, tests).
- **External Coordination:** Integration Specialist (webhook, providers).
- **Monitoring:** DevOps (alerts, dashboards).

### Communication
- **Internal:** Slack #risk-engineering channel; weekly standup updates.
- **External:** Email to forms team and sanctions providers with schema spec (JSON example, migration deadline).
- **Documentation:** Link this plan in README.md and Schema Enforcer Audit Trail.
- **Notifications:** Post-PR approval, notify stakeholders via GitHub discussion or email.

## Success Criteria
- Zero validation failures in production for 7 days post-full enforcement.
- All producers updated and compliant.
- Audit Trail flag updated to 'Executed with Plan'.
- No workflow terminations due to validation errors.

## Appendix: Schema Summaries
- **LeadCreatedSchema:** Requires `applicantId`, `workflowId`, `contactName`, `companyName`, etc.
- **ExternalSanctionsIngressSchema:** Requires `provider`, `externalCheckId`, `passed`, `riskLevel`, `matchDetails[]`, etc.

For questions, contact the owner.

