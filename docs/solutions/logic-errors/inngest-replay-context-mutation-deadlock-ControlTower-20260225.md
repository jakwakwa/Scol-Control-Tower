---
module: ControlTower Workflow
date: 2026-02-25
problem_type: logic_error
component: background_job
symptoms:
  - "Workflow permanently stuck at Stage 3 awaiting_human after procurement review manually CLEARED"
  - "No second upload/fica.received event ever fired — wait-fica-docs gate waited forever"
  - "WorkflowService logs showed Stage=3, Status=awaiting_human indefinitely after human approval"
root_cause: wrong_api
resolution_type: code_fix
severity: critical
tags: [inngest, replay-model, step-mutation, fica-gate, stage-3, workflow-stuck, mutable-context, documentsComplete]
---

# Troubleshooting: Workflow Stuck at Stage 3 — Inngest Replay Drops `context.documentsComplete`

## Problem

After a risk manager approved the procurement manual review (CLEARED), the Stage 3 workflow never advanced to Stage 4. The `wait-fica-docs` waitForEvent gate remained open indefinitely because `context.documentsComplete` was always `undefined` in Stage 3, causing the FICA promise to always register a new `waitForEvent` for a second `upload/fica.received` event that would never come.

## Environment

- Module: ControlTower Workflow (`inngest/functions/control-tower-workflow.ts`)
- Affected Component: Inngest workflow function — Stage 2 `mandate-verified` step and Stage 3 FICA gate
- Date: 2026-02-25

## Symptoms

- `[WorkflowService] Updating Workflow N: Status=awaiting_human, Stage=3` appears and never changes
- `risk/procurement.completed` event is published and received by Inngest
- `ai/feedback.divergence_detected` event fires correctly
- But no ITC check, sanctions check, or reporter agent runs after the procurement decision
- Inngest Dev Server shows the run is still "Running" indefinitely with `wait-fica-docs` as an open step
- Debug logs at Stage 3 `before-promise-all` showed `documentsComplete: false` (should have been `true`)

## What Didn't Work

**Attempted diagnosis 1:** Checking if `risk/procurement.completed` event was being emitted correctly
- **Why it failed:** The event was emitted and received correctly. The procurement gate was not the problem.

**Attempted diagnosis 2:** Checking if there was a race condition between event arrival and the waitForEvent registration
- **Why it failed:** Not a timing issue — the problem was structural and reproduced 100% of the time.

**Attempted diagnosis 3:** Sending a manual `upload/fica.received` event for the stuck workflow
- **Why it failed:** The existing Inngest run had `wait-fica-docs` registered as an active waitForEvent in its memoized step state. Sending the event unblocked that specific run, but new runs from fresh workflows would always be stuck — because the underlying code was wrong.

## Solution

**Root cause:** `context.documentsComplete = true` was set **inside** a `step.run("mandate-verified", ...)` callback. In Inngest's replay model, when a step's result is already memoized (i.e., the step completed in a prior execution), the callback function is **not re-invoked** — Inngest returns the cached result directly. This means any side effects inside the callback (like mutating `context`) are permanently lost on every replay after the initial run.

When Stage 3 re-evaluated `ficaPromise`, `context.documentsComplete` was always `undefined`, so the branch always created a `waitForEvent("wait-fica-docs", ...)` instead of a `Promise.resolve(...)`.

**Code changes:**

```typescript
// BEFORE (broken) — context mutation inside step callback is lost on replay
await step.run("mandate-verified", async () => {
    context.documentsComplete = true;  // ❌ LOST on every Inngest replay
    await inngest.send({ name: "mandate/verified", data: { ... } });
    await logWorkflowEvent({ ... });
});

// Stage 3 (always wrong after the first run):
const ficaPromise = context.documentsComplete   // ❌ always undefined on replay
    ? Promise.resolve({ data: { ... } })
    : step.waitForEvent("wait-fica-docs", { event: "upload/fica.received", ... });
```

```typescript
// AFTER (fixed) — use step return value, which IS memoized correctly
const mandateVerified = await step.run("mandate-verified", async () => {
    await inngest.send({ name: "mandate/verified", data: { ... } });
    await logWorkflowEvent({ ... });
    return { documentsComplete: true };  // ✅ memoized return value survives replay
});

// Stage 3 (always correct):
const ficaPromise = mandateVerified.documentsComplete  // ✅ always true from memoized return
    ? Promise.resolve({
          data: { workflowId, applicantId, source: "stage2_documents_already_complete" },
      })
    : step.waitForEvent("wait-fica-docs", { event: "upload/fica.received", ... });
```

The same dead-mutation pattern was also fixed for `context.mandateType` and `context.mandateVolume` (set inside `determine-mandate` step callback but already returned correctly via `mandateInfo`):

```typescript
// BEFORE (dead mutations inside step callback):
const mandateInfo = await step.run("determine-mandate", async () => {
    context.mandateType = formData.mandateType;    // ❌ dead — never survives replay
    context.mandateVolume = formData.mandateVolume; // ❌ dead — never survives replay
    return { mandateType: formData.mandateType, mandateVolume: formData.mandateVolume, ... };
});

// AFTER (removed dead mutations, use mandateInfo return value directly):
const mandateInfo = await step.run("determine-mandate", async () => {
    // No context mutations
    return { mandateType: formData.mandateType, mandateVolume: formData.mandateVolume, ... };
});
// mandateInfo.mandateType and mandateInfo.mandateVolume used everywhere downstream
```

**`WorkflowContext` interface simplified** (removed fields that are no longer tracked via context):

```typescript
// BEFORE:
interface WorkflowContext {
    applicantId: number;
    workflowId: number;
    businessType?: BusinessType;
    mandateType?: string;
    mandateVolume?: number;
    procurementCleared?: boolean;
    documentsComplete?: boolean;   // ❌ was set via dead mutation
    aiAnalysisComplete?: boolean;
}

// AFTER:
interface WorkflowContext {
    applicantId: number;
    workflowId: number;
    procurementCleared?: boolean;  // ✅ set outside steps — survives replay
    aiAnalysisComplete?: boolean;  // ✅ set outside steps — survives replay
}
```

## Why This Works

**Inngest's replay model:** When an Inngest function is interrupted (e.g., by a `waitForEvent` or a sleep), it saves the current state and stops. When it is resumed (the awaited event arrives), the function **restarts from the beginning**. For all previously completed steps, Inngest returns the **memoized result** without re-executing the callback. This means:

1. `step.run("mandate-verified", async () => { context.documentsComplete = true; ... })` — on the initial run, the callback fires and `context.documentsComplete` is set. **On every subsequent replay, the callback is skipped** and `context.documentsComplete` is never set.

2. Step **return values** are part of the memoized result and are always restored correctly on replay. So `mandateVerified.documentsComplete` is always `true` after the step first completes.

3. Fields on `context` are only safe to read during replay if they were set **outside** of step callbacks (directly in the function handler). Fields set inside step callbacks are effectively write-once during the first run only.

**After the fix:** Stage 3's `ficaPromise` always evaluates to `Promise.resolve(...)` because `mandateVerified.documentsComplete` is always `true` from the memoized step return. `Promise.all([procurePromise, ficaPromise])` only needs to wait for the procurement decision. Once procurement is CLEARED, both promises resolve immediately and the workflow advances to ITC/Sanctions/Reporter/Stage 4.

## Prevention

**The golden rule for Inngest step callbacks:**

> **NEVER rely on side effects from inside `step.run()` callbacks after the initial run. They are not replayed. Use the step's return value instead.**

Specific rules:
- **Return state, don't mutate context** — any data needed downstream from a step must be in the step's return value, not set on a shared `context` object.
- **Context mutations are only safe outside steps** — mutations like `context.procurementCleared = true` are safe because they occur in the function handler body (not inside a step callback) and re-execute on every replay.
- **Watch for the pattern:** `await step.run("step-name", async () => { someObject.field = value; ... })` — this is almost always a bug.
- **Add linting/review rule:** Any `context.X = Y` inside a `step.run(...)` callback should be flagged in code review as a likely Inngest replay bug.

### Code Review Checklist

- [ ] Are any `context.field = value` mutations inside `step.run()` callbacks? (❌ always a bug)
- [ ] Does downstream code rely on context fields set inside step callbacks? (❌ will fail on replay)
- [ ] Do all step callbacks return the values they compute? (✅ required for safe replay)
- [ ] Are `WorkflowContext` fields only mutated outside of step callbacks? (✅ required)

## Runtime Evidence (Debug Log Proof)

The fix was verified with runtime instrumentation. Before `Promise.all`, the log showed:

```json
// BEFORE fix — documentsComplete was always false/undefined:
{ "documentsComplete": false }

// AFTER fix — mandateVerified.documentsComplete is always true:
{ "documentsComplete": true }
```

After procurement CLEARED, Stage 3 fully resolved:

```json
{
  "procurementDecisionReceived": true,
  "procurementOutcome": "CLEARED",
  "ficaEventReceived": true,
  "ficaSource": "stage2_documents_already_complete"
}
```

And the server logs confirmed the workflow advanced:

```
[WorkflowService] Updating Workflow 26: Status=processing, Stage=3
[ITCService] Performing credit check for Applicant 26, Workflow 26
[reporter/analysis.completed emitted]
[WorkflowService] Updating Workflow 26: Status=processing, Stage=4
[WorkflowService] Updating Workflow 26: Status=awaiting_human, Stage=4
```

## Related Issues

- See also: [stage3-parallel-execution-and-missing-wait-gates.md](./stage3-parallel-execution-and-missing-wait-gates.md) — prior Stage 3 fix for sequential ITC/AI execution and missing accountant letter wait gate. Different root cause (missing `Promise.all` parallelism) but same stage.
