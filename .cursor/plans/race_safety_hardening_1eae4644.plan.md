---
name: Race safety hardening
overview: Harden stage workflow and ID verification flows against timing/order races and duplicate processing. Prioritize critical Stage 5 termination control-flow bug, then add idempotency and event-correlation safeguards.
todos:
  - id: fix-stage5-terminal-flow
    content: Return immediately after Stage 5 termination paths and prevent post-termination execution
    status: pending
  - id: harden-wait-ordering
    content: Add durable pre-check-before-wait and stronger event correlation in Stage 5/6
    status: pending
  - id: idempotent-stage6-send
    content: Make final approval emission replay-safe with deterministic event identity
    status: pending
  - id: dedupe-id-verification
    content: Add document-level dedupe/claiming and safe workflow mapping in ID verification
    status: pending
  - id: concurrency-safe-fica-update
    content: Protect FICA payload updates from lost writes under concurrent completions
    status: pending
  - id: add-race-regression-tests
    content: Add tests for timeout exits, pre-wait events, stale decisions, duplicate uploads, and concurrent writes
    status: pending
  - id: verify-build-and-runtime
    content: Run targeted tests plus bun build and confirm end-to-end behavior
    status: pending
isProject: false
---

# Race-condition hardening plan

## Goals
- Guarantee single terminal outcome for Stage 5 and Stage 6 workflows.
- Prevent missed-event timeouts caused by event-before-wait ordering.
- Make ID verification and FICA updates safe under duplicate/concurrent deliveries.

## Proposed changes
- Fix termination control flow in [`/Users/jakwakwa/Repos/stratcol-apps/Scol-Control-Tower/inngest/functions/control-tower/stages/stage5_contractWait.ts`](/Users/jakwakwa/Repos/stratcol-apps/Scol-Control-Tower/inngest/functions/control-tower/stages/stage5_contractWait.ts):
  - Return immediately after each `terminateRun(...)` branch.
  - Add guardrails so no downstream waits/notifications execute after termination.
- Add pre-check-before-wait pattern in Stage 5 and Stage 6:
  - In [`/Users/jakwakwa/Repos/stratcol-apps/Scol-Control-Tower/inngest/functions/control-tower/stages/stage5_contractWait.ts`](/Users/jakwakwa/Repos/stratcol-apps/Scol-Control-Tower/inngest/functions/control-tower/stages/stage5_contractWait.ts) and [`/Users/jakwakwa/Repos/stratcol-apps/Scol-Control-Tower/inngest/functions/control-tower/stages/stage6_activation.ts`](/Users/jakwakwa/Repos/stratcol-apps/Scol-Control-Tower/inngest/functions/control-tower/stages/stage6_activation.ts), first read durable state in `step.run`; only call `step.waitForEvent` if state is incomplete.
  - Correlate wait filters with a unique form/instance token (not only `workflowId`).
- Make Stage 6 final event emission idempotent:
  - In [`/Users/jakwakwa/Repos/stratcol-apps/Scol-Control-Tower/inngest/functions/control-tower/stages/stage6_activation.ts`](/Users/jakwakwa/Repos/stratcol-apps/Scol-Control-Tower/inngest/functions/control-tower/stages/stage6_activation.ts), replace raw `inngest.send` with replay-safe event sending and deterministic event ID.
  - Ensure consumers handle duplicate event IDs safely.
- Harden ID verification dedupe and state updates:
  - In [`/Users/jakwakwa/Repos/stratcol-apps/Scol-Control-Tower/inngest/functions/id-verification.ts`](/Users/jakwakwa/Repos/stratcol-apps/Scol-Control-Tower/inngest/functions/id-verification.ts), add per-`documentId` processing gate (already-processed/in-progress check and atomic claim).
  - In [`/Users/jakwakwa/Repos/stratcol-apps/Scol-Control-Tower/app/actions/verify-id.ts`](/Users/jakwakwa/Repos/stratcol-apps/Scol-Control-Tower/app/actions/verify-id.ts), remove unsafe `workflowId || applicantId` fallback and use authoritative relation mapping.
  - Convert JSON read-modify-write to optimistic concurrency or transactional update to prevent lost writes.
- Add targeted regression tests for race-sensitive flows:
  - Stage 5 timeout terminates once and exits.
  - Event-before-wait does not false-timeout.
  - Stage 6 ignores stale contract-instance decisions.
  - Rejection matrix (risk/account permutations) is deterministic.
  - Duplicate `document/uploaded` and concurrent FICA writes remain consistent.

## Validation steps
- Run unit/integration tests covering Stage 5/6 and ID verification flows.
- Execute `bun run build` to confirm compile-time safety.
- (If available) run browser/E2E path that exercises approvals and ID verification to validate runtime behavior.