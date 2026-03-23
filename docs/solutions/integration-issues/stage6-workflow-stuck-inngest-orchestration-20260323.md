---
module: Inngest Workflow Orchestration
date: 2026-03-23
problem_type: integration_issue
component: service_object
symptoms:
  - "Workflow stuck at Stage 6 awaiting dual approval despite both approvals submitted"
  - "Workflow stuck after contract signed — waitForEvent silently drops form/decision.responded event"
  - "Runtime crash when approval waitForEvent times out — execution continues past terminateRun"
root_cause: async_timing
resolution_type: code_fix
severity: critical
tags: [inngest, waitforevent, cel-expression, race-condition, stage-6, workflow-stuck]
---

# Stage 6 Workflow Stuck — Inngest Orchestration Bugs (3 Interconnected)

## Symptom

Three interrelated bugs in Stage 6 (`stage6_activation.ts`) caused the Inngest-driven onboarding workflow to stall at different points:

1. **Bug 1 — Approval race condition**: Both Risk Manager and Account Manager approvals were submitted via the UI, but the workflow remained stuck at "awaiting dual approval". Inngest showed no incoming events.
2. **Bug 2 — Missing return after timeout**: If either approval `waitForEvent` timed out, the function would crash with a null-access error instead of terminating cleanly.
3. **Bug 3 — Broken CEL expression for contract signature**: After fixing Bug 1, the workflow progressed past approvals and sent the contract to the applicant. The applicant completed and signed the form, but the workflow stuck again — the `form/decision.responded` event was silently dropped.

## Environment

- **Framework**: Next.js 15 + Inngest SDK
- **Stage**: Stage 6 — Two-Factor Final Approval & Contract Signature
- **Files affected**:
  - `app/api/onboarding/approve/route.ts`
  - `inngest/functions/control-tower/stages/stage6_activation.ts`

---

## Investigation

### Bug 1 — Approval Events Never Re-sent

**Hypothesis**: The approval API endpoint sends Inngest events correctly.

**Finding**: The `inngest.send()` call was inside the `if (!approvalState.alreadyRecorded)` guard. If the user approved before the orchestrator reached Stage 6's `waitForEvent`, the approval was persisted to the database (marking `alreadyRecorded = true`). When the user re-approved after Stage 6 was ready, the guard prevented the Inngest event from being sent, leaving `waitForEvent` indefinitely waiting.

### Bug 2 — No Return After terminateRun

**Hypothesis**: Timeout paths terminate the workflow cleanly.

**Finding**: After calling `terminateRun()` in the approval-timeout branch, there was no `return` statement. Execution fell through to code that accessed `riskManagerApproval.data.decision` — which was `null` because the event timed out — causing a runtime crash.

### Bug 3 — CEL Expression Referenced Wrong Data

**Hypothesis**: The `form/decision.responded` event should match the contract form.

**Finding**: The CEL expression on the `wait-contract-decision` step was:

```
event.data.workflowId == async.data.workflowId && async.data.formType == 'AGREEMENT_CONTRACT'
```

The second condition `async.data.formType` references the *trigger event's* data (the `onboarding/lead.created` event that started the orchestrator). That event has no `formType` field, so the condition always evaluates to `false`. The incoming `form/decision.responded` event was silently discarded.

---

## What Didn't Work

- **Re-approving via the UI**: The `alreadyRecorded` guard blocked the Inngest event from being re-sent.
- **Hot-reloading the dev server after code fix**: Next.js hot-reload updates the function code, but already-running Inngest function instances retain the old `waitForEvent` CEL expressions. The stuck workflow instance continued using the broken expression.

---

## Solution

### Fix 1 — Move `inngest.send()` Outside the Guard

**File**: `app/api/onboarding/approve/route.ts`

**Before:**
```typescript
if (!approvalState.alreadyRecorded) {
    await db.insert(workflowEvents).values({ /* ... */ });

    await inngest.send({
        name: eventName,
        data: { workflowId, applicantId, approvedBy: userId, decision, reason, timestamp },
    });
}
```

**After:**
```typescript
if (!approvalState.alreadyRecorded) {
    await db.insert(workflowEvents).values({ /* ... */ });
}

// Always send the Inngest event regardless of alreadyRecorded.
// waitForEvent may not have been active when the first approval was recorded,
// so re-sending is necessary to unblock a waiting orchestrator. Duplicate
// events are harmless — waitForEvent consumes only the first match.
await inngest.send({
    name: eventName,
    data: { workflowId, applicantId, approvedBy: userId, decision, reason, timestamp },
});
```

**Why it works**: `waitForEvent` is idempotent — it consumes only the first matching event and ignores duplicates. Sending the event unconditionally ensures it arrives whether `waitForEvent` was ready on the first attempt or not.

### Fix 2 — Add Return After terminateRun

**File**: `inngest/functions/control-tower/stages/stage6_activation.ts`

**Before:**
```typescript
await step.run("terminate-approval-timeout", () =>
    terminateRun({ workflowId, applicantId, stage: 6, reason: terminationReason, notes })
);
// execution falls through — crashes on null access
```

**After:**
```typescript
await step.run("terminate-approval-timeout", () =>
    terminateRun({ workflowId, applicantId, stage: 6, reason: terminationReason, notes })
);

return {
    status: "terminated" as const,
    stage: 6,
    reason: `Approval timeout: ${terminationReason}`,
};
```

Same pattern applied to the contract-signature timeout path.

### Fix 3 — Correct the CEL Expression

**File**: `inngest/functions/control-tower/stages/stage6_activation.ts`

**Before:**
```
event.data.workflowId == async.data.workflowId && async.data.formType == 'AGREEMENT_CONTRACT'
```

**After:**
```
event.data.workflowId == async.data.workflowId && event.data.formType == 'AGREEMENT_CONTRACT'
```

**Why it works**: `event.data` refers to the incoming event (the `form/decision.responded` payload which carries `formType`). `async.data` refers to the orchestrator's trigger event (`onboarding/lead.created`) which does not carry `formType`.

---

## Prevention

1. **Always send Inngest events unconditionally** when the intent is to signal a `waitForEvent`. Use the database for deduplication of *persistence*, not for gating *event dispatch*.
2. **Always return after terminateRun** in timeout/error branches. Consider a lint rule or code review checklist item for Inngest stage functions.
3. **In CEL expressions, verify which side (`event.data` vs `async.data`) owns each field.** `event.data` = incoming event, `async.data` = trigger event. Misreferencing is silent — the condition simply evaluates to `false` and the event is dropped.
4. **Hot-reloading does not fix already-running Inngest instances.** After fixing a CEL expression or `waitForEvent` condition, stuck workflow runs must be manually recovered (cancelled and re-triggered, or completed via an admin endpoint).

---

## Key Inngest Concepts Referenced

| Concept | Description |
|---------|-------------|
| `step.waitForEvent` | Pauses execution until a matching event arrives or timeout expires |
| `match` | Shorthand for matching a single field between incoming and trigger events |
| `if` (CEL) | Full CEL expression for multi-field matching — `event.data.*` = incoming, `async.data.*` = trigger |
| Idempotency | `waitForEvent` consumes only the first matching event; duplicates are harmless |
| Hot-reload limitation | Code changes via hot-reload do not retroactively update running function instances |
