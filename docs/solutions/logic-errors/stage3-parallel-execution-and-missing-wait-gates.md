---
title: "Stage 3 Parallel Execution Broken — ITC and AI Analysis Running Sequentially with Missing Wait Gates"
date: 2026-02-25
category: logic-errors
severity: high
superseded: "2026-02-25 — Accountant letter refactored from required form to optional file upload. No longer a wait gate."
component: inngest/functions/control-tower-workflow.ts
tags:
  - workflow-orchestration
  - parallel-execution
  - event-waiting
  - inngest
  - stage-3
  - reporter-agent
  - document-verification
related_modules:
  - inngest/functions/control-tower-workflow.ts
  - lib/services/agents/aggregated-analysis.service.ts
  - inngest/functions/document-aggregator.ts
  - app/api/forms/submit/route.ts
  - db/schema.ts (applicantSubmissions)
symptoms:
  - AI analysis ran before applicant finished uploading all forms (accountant letter)
  - ITC checks and AI validation agent ran sequentially instead of in parallel
  - Accountant letter form data never reached the AI validation agent
  - Reporter Agent was embedded inside the AI step instead of synthesizing both paths
  - Stage 3 completed without all required inputs being present
---

## Problem

Stage 3 of the onboarding workflow had four structural issues that violated the SOP diagram:

1. **Missing wait gate for accountant letter** *(superseded)* — the workflow waited for FICA document uploads (`upload/fica.received`) and procurement decision (`risk/procurement.completed`), but never waited for the accountant letter form submission (`form/accountant-letter.submitted`). The AI analysis ran on incomplete data. *Note: Accountant letter is now an optional file upload, not a form; no wait gate.*

2. **Sequential ITC → AI instead of parallel** — the ITC/sanctions check (`run-main-itc-and-sanctions`) ran first, then the AI analysis (`run-ai-analysis`) ran after it completed. Per the SOP, these are two independent paths that should execute concurrently.

3. **Accountant letter data never queried** — the `run-ai-analysis` step queried `documents` and `documentUploads` tables but never queried `applicantSubmissions` where the accountant letter form data is stored. The validation agent never received this data.

4. **Reporter Agent not a separate step** — the Reporter Agent's event emissions (`reporter/analysis.completed`) were embedded inside the AI analysis step. It should be a distinct synthesis step that waits for both ITC and AI to complete ("both green") before combining results.

## Investigation

### Observed Behavior

The applicant uploaded 3 FICA documents (bank statement, ID, proof of residence) which triggered the document aggregator to emit `upload/fica.received`. The workflow immediately proceeded past the FICA wait gate. The accountant letter form was submitted 71 seconds later — but the workflow had already moved into ITC and AI analysis without it.

### Timeline (from debug logs)

| Time     | Event |
|----------|-------|
| 23:40:10 | Bank statement uploaded |
| 23:40:35 | ID document uploaded |
| 23:40:45 | Proof of residence uploaded |
| 23:40:48 | Document aggregator emits `upload/fica.received` → workflow proceeds |
| 23:41:59 | Accountant letter form submitted (too late — workflow already past the gate) |
| 23:43:49 | Procurement cleared → ITC runs → AI analysis runs (without accountant letter) |

### Root Cause

The `WorkflowContext` had no tracking for the accountant letter requirement. The Stage 3 parallel wait logic only included two waits:

```typescript
// BEFORE (broken)
const [procurementDecision, ficaDocsReceived] = await Promise.all([
    procurePromise,
    ficaPromise,
]);

// Then sequentially:
const itcAndSanctions = await step.run("run-main-itc-and-sanctions", ...);
const aiAnalysis = await step.run("run-ai-analysis", ...);  // waited for ITC first
```

## Solution

### 1. Track accountant letter requirement in context

Added `accountantLetterRequired` to `WorkflowContext`. Set in `send-mandate-request` when `productType !== "call_centre"`.

### 2. Three-way parallel wait gate

```typescript
const accountantLetterPromise = context.accountantLetterRequired
    ? step.waitForEvent("wait-accountant-letter", {
        event: "form/accountant-letter.submitted",
        timeout: STAGE_TIMEOUT,
        match: "data.workflowId",
    })
    : Promise.resolve(null);

const [procurementDecision, ficaDocsReceived, accountantLetterReceived] =
    await Promise.all([procurePromise, ficaPromise, accountantLetterPromise]);
```

### 3. Parallel ITC + AI execution

```typescript
const itcStep = step.run("run-main-itc-and-sanctions", async () => { /* ... */ });
const aiStep = step.run("run-ai-analysis", async () => { /* ... */ });

// "Both green" — wait for both paths
const [itcAndSanctions, aiAnalysisResult] = await Promise.all([itcStep, aiStep]);
```

The AI analysis no longer depends on ITC completing first — it runs its own internal sanctions check.

### 4. Query accountant letter form data

Added import for `applicantSubmissions` from schema. In `run-ai-analysis`:

```typescript
let accountantLetterData: string | undefined;
if (context.accountantLetterRequired && db) {
    const [submission] = await db
        .select()
        .from(applicantSubmissions)
        .where(and(
            eq(applicantSubmissions.applicantId, applicantId),
            eq(applicantSubmissions.formType, "ACCOUNTANT_LETTER"),
        ))
        .limit(1);
    if (submission) accountantLetterData = submission.data;
}

if (accountantLetterData) {
    aiDocuments.push({
        id: `accountant-letter-${applicantId}`,
        type: "ACCOUNTANT_LETTER",
        content: accountantLetterData,
        contentType: "text",
    });
}
```

### 5. Reporter Agent as separate synthesis step

```typescript
const aiAnalysis = await step.run("reporter-agent-synthesis", async () => {
    const combinedFlags = [
        ...aiAnalysisResult.overall.flags,
        ...(itcAndSanctions.sanctions.isBlocked ? ["ITC_SANCTIONS_BLOCKED"] : []),
        ...(!itcAndSanctions.itcResult.passed ? ["ITC_CHECK_FAILED"] : []),
    ];

    // Emit consolidated report with itcSummary
    await inngest.send({ name: "reporter/analysis.completed", data: { /* ... */ } });

    return { ...aiAnalysisResult, overall: { ...aiAnalysisResult.overall, isBlocked: /* merged */, flags: combinedFlags } };
});
```

## Correct Flow (After Fix)

```
                    ┌─ Stream A: Procurement → manual review ─┐
Wait FICA docs  ─┬──┤                                          ├── all 3 resolve
Wait acct letter ─┘  └─────────────────────────────────────────┘
                      ┌─ Path 1: ITC + Sanctions check ────────┐
                      │                                         ├── "both green"
                      └─ Path 2: AI Validation Agent ──────────┘
                                        │
                              Reporter Agent synthesizes
                              ITC + AI results → Stage 4
```

## Prevention

### Workflow Orchestration Rules

- **Map every human-facing form/upload to a `waitForEvent`** — if the workflow sends a form link, it must wait for the corresponding submission event.
- **Independent steps must use `Promise.all`** — if two steps don't share data dependencies, they should run in parallel.
- **Synthesis steps must be separate** — never embed Reporter/synthesis logic inside an analysis step.
- **Query all data sources** — if a step needs form data, it must query the correct table (`applicantSubmissions` for forms, `documents`/`documentUploads` for files).

### Code Review Checklist

- [ ] Every `createFormInstance` call has a matching `step.waitForEvent` downstream
- [ ] Steps without data dependencies use `Promise.all`, not sequential `await`
- [ ] Synthesis steps only combine outputs; they don't run analysis
- [ ] The implementation matches the SOP diagram for parallelism and gate logic
- [ ] Each analysis step documents which DB tables it queries

### Testing Suggestions

- Assert ITC and AI analysis run in parallel (total time ≈ max, not sum)
- Assert AI analysis does not start until accountant letter is received (when required)
- Assert Reporter Agent output includes both `itcSummary` and validation/risk/sanctions from AI
- Assert `applicantSubmissions` is queried when `accountantLetterRequired` is true

## Cross-References

- **Event definitions:** `inngest/events.ts` — `form/accountant-letter.submitted` (line 174), `upload/fica.received` (line 303), `reporter/analysis.completed` (line 846)
- **Document aggregator:** `inngest/functions/document-aggregator.ts` — triggers `upload/fica.received` when all required FICA docs are present
- **Form submission handler:** `app/api/forms/submit/route.ts` — emits `form/accountant-letter.submitted`
- **AI agents:** `lib/services/agents/aggregated-analysis.service.ts` — runs validation, risk, sanctions agents in parallel internally
- **Workflow user guide:** `docs/user-guides/workflows.mdx`
- **Related report:** `PROCUREMENT_FALLBACK_VALIDATION_REPORT.md`
