# Fix `form/decision.responded` Type Discrimination in `waitForEvent` Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `waitForEvent("wait-contract-decision")` step for the STRATCOL_CONTRACT applicant signing — using an `if` CEL expression to filter on both `workflowId` and `formType`, so a `form/decision.responded` event for any other form type cannot prematurely advance (or error) this workflow run.

**Architecture:** The `form/decision.responded` Inngest event is emitted for three form types (`SIGNED_QUOTATION`, `STRATCOL_CONTRACT`, `CALL_CENTRE_APPLICATION`). After the final STRATCOL_CONTRACT is dispatched to the applicant (the `send-final-contract-to-applicant` step), the workflow must wait for the applicant to sign it. Without an explicit `formType` filter on the `waitForEvent`, any `form/decision.responded` event matching the same `workflowId` could satisfy the wait — causing wrong-event acceptance. Inngest's `if` CEL parameter (which replaces `match` when multi-field filtering is needed) resolves this at the source.

**Tech Stack:** Inngest TypeScript SDK (`step.waitForEvent` with `if` CEL expression), Next.js 15 App Router, Bun

---

## Background: Why the step is missing

The audit generated on 2026-03-02 found a `wait-contract-decision` step at line ~2430 of the workflow. The current file (2598 lines) is shorter than the audited version (2734 lines), indicating the step was removed in a recent edit. The plan below restores it — correctly, with the `if` filter from the start.

## Key Inngest API Fact

`match` and `if` are **mutually exclusive** in `step.waitForEvent`. For multi-field filtering use only `if` with a CEL expression:

```typescript
await step.waitForEvent("wait-contract-decision", {
  event: "form/decision.responded",
  timeout: REVIEW_TIMEOUT,
  if: "event.data.workflowId == async.data.workflowId && async.data.formType == 'STRATCOL_CONTRACT'",
});
```

- `event` = the workflow's trigger event
- `async` = the incoming waited event being evaluated

---

## Task 1: Locate the insertion point

**Files:**
- Read: `inngest/functions/control-tower-workflow.ts`

**Step 1: Identify the exact lines**

Open the file and confirm the current structure around the end of Stage 6:

```
"send-final-contract-to-applicant" step ends around line 2513
                   ↕  ← INSERT HERE
"workflow-complete" step starts around line 2519
```

Run:
```bash
grep -n "send-final-contract-to-applicant\|workflow-complete" inngest/functions/control-tower-workflow.ts
```

Expected: two lines showing the step IDs, confirming the gap where the new step will go.

**Step 2: Confirm `form/decision.responded` event shape**

The event shape is defined in `inngest/events.ts` around line 862:

```typescript
"form/decision.responded": {
  data: {
    workflowId: number;
    applicantId: number;
    formType: "SIGNED_QUOTATION" | "AGREEMENT_CONTRACT" | "CALL_CENTRE_APPLICATION";
    decision: "APPROVED" | "DECLINED";
    reason?: string;
    respondedAt: string;
  };
};
```

This confirms `async.data.formType == 'STRATCOL_CONTRACT'` is the correct filter value.

---

## Task 2: Add `wait-contract-decision` with `if` filter

**Files:**
- Modify: `inngest/functions/control-tower-workflow.ts` (between `send-final-contract-to-applicant` and `workflow-complete`)

**Step 1: Insert the waitForEvent block**

Immediately after the closing `});` of `send-final-contract-to-applicant` and before the `await step.run("workflow-complete"` line, add:

```typescript
		// Wait for applicant to sign the STRATCOL_CONTRACT.
		// Uses `if` CEL expression (not `match`) to filter on both workflowId and formType,
		// preventing a form/decision.responded for a different form type (e.g. CALL_CENTRE_APPLICATION)
		// from prematurely advancing or erroring this workflow run.
		await step.run("stage-6-awaiting-contract-signature", () =>
			updateWorkflowStatus(workflowId, "awaiting_human", 6)
		);

		const contractDecision = await step.waitForEvent("wait-contract-decision", {
			event: "form/decision.responded",
			timeout: REVIEW_TIMEOUT,
			if: "event.data.workflowId == async.data.workflowId && async.data.formType == 'STRATCOL_CONTRACT'",
		});

		if (!contractDecision) {
			await step.run("notify-am-contract-signature-timeout", async () => {
				await guardKillSwitch(workflowId, "notify-am-contract-signature-timeout");
				await createWorkflowNotification({
					workflowId,
					applicantId,
					type: "warning",
					title: "Delay: Contract Signature",
					message: "Applicant has not signed the final contract within the expected timeframe.",
					actionable: true,
				});
				await sendInternalAlertEmail({
					title: "Delay: Contract Signature",
					message: `Applicant has not signed the STRATCOL_CONTRACT within the ${REVIEW_TIMEOUT} timeout window. Please follow up.`,
					workflowId,
					applicantId,
					type: "warning",
					actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}`,
				});
			});
			return { status: "timeout", stage: 6, reason: "Contract signature timeout" };
		}

		if (contractDecision.data.decision === "DECLINED") {
			await step.run("contract-declined-notify", async () => {
				await createWorkflowNotification({
					workflowId,
					applicantId,
					type: "warning",
					title: "Contract Declined by Applicant",
					message: contractDecision.data.reason || "Applicant declined to sign the final contract.",
					actionable: true,
				});
				await sendInternalAlertEmail({
					title: "Contract Declined by Applicant",
					message: `Applicant declined the final STRATCOL_CONTRACT${contractDecision.data.reason ? `: ${contractDecision.data.reason}` : "."}`,
					workflowId,
					applicantId,
					type: "warning",
					actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}`,
				});
			});
			return { status: "terminated", stage: 6, reason: "Applicant declined contract" };
		}
```

**Step 2: Verify the `workflow-complete` step follows immediately after**

Confirm the next line after the inserted block is the `await step.run("workflow-complete", ...` call. No other steps should be between them.

**Step 3: Commit**

```bash
git add inngest/functions/control-tower-workflow.ts
git commit -m "fix(workflow): add wait-contract-decision with formType CEL filter

Adds missing waitForEvent step for STRATCOL_CONTRACT applicant signing.
Uses 'if' CEL expression to filter on both workflowId AND formType,
preventing form/decision.responded events from other form types from
prematurely advancing or erroring the workflow run."
```

---

## Task 3: Build verification

**Files:**
- No changes — verification only

**Step 1: Run the build**

```bash
bun run build
```

Expected: Build completes with zero errors. TypeScript is happy with the new `contractDecision` variable typed from the Inngest event registry.

**Step 2: If there are type errors**

The most likely type issue is that `contractDecision.data` may not be narrowed. The `form/decision.responded` event type in `inngest/events.ts` (line 862) already types `decision` as `"APPROVED" | "DECLINED"` and `formType` as the union — so no casting should be needed.

If TypeScript complains that `contractDecision` might be `null` on the `.data.decision` access: this is guarded by the `if (!contractDecision)` early return above.

**Step 3: Confirm no pre-existing lints were introduced**

```bash
bun run build
```

Re-run to confirm zero errors. Only then proceed to commit (see Task 2 Step 3).

---

## Task 4: Push

**Step 1: Push to remote branch**

```bash
git push
```

---

## Acceptance checklist

- [ ] `waitForEvent("wait-contract-decision")` exists in the workflow after `send-final-contract-to-applicant`
- [ ] It uses `if:` (not `match:`) to filter on `workflowId` AND `formType == 'STRATCOL_CONTRACT'`
- [ ] Timeout path returns `{ status: "timeout", stage: 6, reason: "Contract signature timeout" }`
- [ ] DECLINED path returns `{ status: "terminated", stage: 6, reason: "Applicant declined contract" }` and sends notifications
- [ ] No `formType` guard needed after the `waitForEvent` (the CEL filter handles it)
- [ ] `bun run build` passes with zero errors
- [ ] Committed and pushed
