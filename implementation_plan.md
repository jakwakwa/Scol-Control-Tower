# Plan: Agent-Browser Automated E2E Flow

**Generated**: 2026-03-23
**Estimated Complexity**: Medium

## Overview
This plan outlines the implementation of an automated end-to-end testing suite for the SOP-aligned onboarding workflow (Stages 1-6) using the `agent-browser` CLI instead of heavy Playwright scripts. 

The tests will drive the UI directly using browser automation for UI interactions (filling forms, clicking buttons), mock necessary human approvals via the UI or test API routes, and be split across distinct bash scripts that run in isolation. Lastly, a complete stacked workflow will be added to [package.json](file:///Users/jakwakwa/Repos/stratcol-apps/Scol-Control-Tower/package.json) (`bun run test:browser-flow-full`), accompanied by an audit using the `inngest-contracts` subagent to verify events.

## Prerequisites
- `bunx agent-browser` available in the project environment.
- Dev server running (`bun run dev`).
- Local or preview database ready for mocked workflows.
- [inngest-contracts.md](file:///Users/jakwakwa/Repos/stratcol-apps/Scol-Control-Tower/.agent/agents/inngest-contracts.md) subagent for pipeline/event audits.

---

## Sprint 1: Stage 1-3 (Phase 1)
**Goal**: Automate Lead Capture, Facility & Quote, and Procurement & AI stages.
**Demo/Validation**:
- Run `bun run test:browser:stage1-3`.
- Verify a new applicant is captured, quote is generated, and state hits Stage 4 correctly.

### Task 1.1: Create Phase 1 Script
- **Location**: `tests/browser-flow/stage1-3.sh`
- **Description**: Create a bash script that uses `agent-browser` to:
  1. Open `/dashboard/applicants/new` and submit a new applicant (Stage 1).
  2. Wait for applicant detail view and navigate the Facility & Quote UX (Stage 2).
  3. Drive the UI to trigger the AI analysis and wait for the pipeline state to show Stage 3 complete/Stage 4 pending.
  4. Snapshot state via `agent-browser screenshot` and `agent-browser eval` for verification.
- **Dependencies**: None.

---

## Sprint 2: Stage 4 (Phase 2)
**Goal**: Automate Risk Manager Review (Stage 4).
**Demo/Validation**:
- Run `bun run test:browser:stage4`.
- Script successfully loads the Risk Review page, approves a risk case via mocked flow, and progresses to Contract stage.

### Task 2.1: Create Phase 2 Script
- **Location**: `tests/browser-flow/stage4.sh`
- **Description**: Create a bash script that:
  1. Assumes a pending Stage 4 applicant (or can mock one if running in isolation via an API seed).
  2. Navigates to `/dashboard/risk-review`.
  3. Finds the pending test record and clicks the "Approve" button, confirming the risk review via the UI.
  4. Waits until the UI indicates progression to Stage 5.
- **Dependencies**: Sprint 1 (for stacked execution), or a mock seed route for isolated execution.

---

## Sprint 3: Stage 5-6 (Phase 3)
**Goal**: Automate Contract and Two-Factor Final Approval.
**Demo/Validation**:
- Run `bun run test:browser:stage5-6`.
- Verify final contract dispatch and 2FA approvals mocked and cleared.

### Task 3.1: Create Phase 3 Script
- **Location**: `tests/browser-flow/stage5-6.sh`
- **Description**: Create a bash script that:
  1. Navigates to the Contract review tab for the applicant.
  2. Triggers contract dispatch (Stage 5).
  3. Mocks the two-factor human approvals required in Stage 6 via UI controls or evaluating `agent-browser` fetch calls directly from the browser context since we need to simulate both Risk Manager and Account Manager.
  4. Confirms Workflow Completed.
- **Dependencies**: Sprints 1 & 2.

---

## Sprint 4: Stacked Execution & Inngest Audit
**Goal**: Connect the distinct tests and run a contracts audit.
**Demo/Validation**:
- Run `bun run test:browser-flow-full` successfully, running entirely sequentially.
- View Inngest subagent audit report to ensure events are tracked accurately.

### Task 4.1: Configure Package Stack
- **Location**: [package.json](file:///Users/jakwakwa/Repos/stratcol-apps/Scol-Control-Tower/package.json)
- **Description**: Add scripts:
  - `"test:browser:stage1-3": "bash tests/browser-flow/stage1-3.sh"`
  - `"test:browser:stage4": "bash tests/browser-flow/stage4.sh"`
  - `"test:browser:stage5-6": "bash tests/browser-flow/stage5-6.sh"`
  - `"test:browser-flow-full": "bun run test:browser:stage1-3 && bun run test:browser:stage4 && bun run test:browser:stage5-6"`
- **Dependencies**: Sprints 1-3.

### Task 4.2: Inngest Contracts Audit (Subagent)
- **Location**: Subagent interaction.
- **Description**: Invoke the `inngest-contracts` subagent ([.agent/agents/inngest-contracts.md](file:///Users/jakwakwa/Repos/stratcol-apps/Scol-Control-Tower/.agent/agents/inngest-contracts.md)) in read-only audit mode to trace the events fired by the UI during stages 1-6 (e.g. `onboarding/lead.created`, approval events) and ensure they match our system payload contracts. Present the result to the user.

---

## Testing Strategy
- Tests will rely on `agent-browser open`, `wait`, `eval`, and `snapshot` strictly over HTTP localhost.
- Any hanging UI will be caught via step timeouts within the bash scripts.

## Potential Risks & Gotchas
- **UI Lags:** Inngest backgrounds jobs (Stage 3) may take longer than standard assertions, requiring dynamic `agent-browser wait` delays.
  - *Mitigation*: Introduce `agent-browser eval` polling loops for DOM state rather than simple arbitrary sleeps.
- **Isolated vs Stacked Mode:** If stage 4 runs in isolation, it won't have the applicant data from stage 1-3.
  - *Mitigation*: The scripts for stage 4 and 5-6 will accept an optional `APPLICANT_ID` env variable. We will document that running in isolated mode strictly requires the user to manually provide a valid, pre-seeded `APPLICANT_ID`.
