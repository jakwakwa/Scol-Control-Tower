---
name: inngest-workflow-audit
description: Analyze Inngest workflows deeply and produce a detailed markdown audit report. Use when auditing workflows, analyzing control tower steps, reviewing applicant checks, validations, AI agent tasks, or when the user requests an Inngest workflow analysis or audit report.
---

# Inngest Workflow Audit & Analysis

You are an expert senior software architect. Your goal is to analyze the codebase deeply and thoroughly in relation to the user's requests, then respond with detailed answers based on **verifiable truth** — no guesswork.

## Core Principles

1. **Ground truth only**: Every claim must be traceable to actual code, schema, or config. Never infer or assume.
2. **Exhaustive search**: Use grep, read_file, and glob to locate all relevant files before reporting.
3. **Explicit gaps**: If something is unclear or missing, state it explicitly rather than guessing.

## Audit Scope

When performing an Inngest workflow audit, systematically cover:

### 1. Workflow Functions

- **Location**: `inngest/functions/*.ts`, `inngest/index.ts`
- **Identify**: Each `inngest.createFunction()` — id, name, trigger event(s), `cancelOn` events
- **List**: All `step.run()` and `step.waitForEvent()` names and their purpose

### 2. Applicant Checks & Validations

- **Applicant existence**: Where `applicants` table is queried; guards for missing applicant
- **Workflow state**: Where `workflows` table is queried; status/stage checks
- **Kill switch guard**: Calls to `guardKillSwitch()` or `isWorkflowTerminated()`
- **State lock collision**: `getStateLockInfo()`, `handleStateCollision()` — Ghost Process Guard
- **Input validation**: Zod schemas, type guards, or explicit checks on event payloads

### 3. AI Agent Tasks

- **Agent invocations**: `performSanctionsCheck`, `performITCCheck`, `performAggregatedAnalysis`, `runProcureCheck` (or equivalent)
- **Agent events emitted**: `agent/sanctions.completed`, `agent/analysis.aggregated`, `reporter/analysis.completed`
- **Agent result handling**: How `isBlocked`, `passed`, `riskLevel`, `recommendation` drive branching

### 4. Human Approval Gates

- **waitForEvent** gates: Event name, timeout, match expression
- **Two-factor approvals**: Events like `approval/risk-manager.received`, `approval/account-manager.received`
- **Timeout handling**: What happens when `waitForEvent` returns `null` (timeout)

### 5. TODOs, FIXMEs, Incomplete Work

- **Search**: `TODO`, `FIXME`, `XXX`, `HACK` in `inngest/` and workflow-related files
- **Report**: File, line, and context for each

### 6. Event Flow

- **Trigger events**: What starts each workflow
- **Internal events**: `inngest.send()` calls — event name and typical `data` shape
- **Event definitions**: `inngest/events.ts` — ensure reported events match schema

## Output Format

Generate a markdown report with this structure:

```markdown
# Inngest Workflow Audit Report

**Generated**: [ISO date]
**Scope**: [Brief description of what was audited]

---

## 1. Workflow Functions Summary

| Function ID | Name | Trigger Event | cancelOn |
|-------------|------|---------------|----------|
| ... | ... | ... | ... |

---

## 2. Step Inventory

### [Function Name]

| Step Type | Step ID | Purpose |
|-----------|---------|---------|
| run | ... | ... |
| waitForEvent | ... | ... |

---

## 3. Applicant Checks & Validations

- **Applicant guards**: [List with file:line references]
- **Kill switch usage**: [List step names that call guardKillSwitch]
- **State lock / Ghost Process Guard**: [Where used, expected vs actual version logic]

---

## 4. AI Agent Tasks

| Step | Agent/Service | Event Emitted | Result Used For |
|------|---------------|---------------|-----------------|
| ... | ... | ... | ... |

---

## 5. Human Approval Gates

| Gate Step | Event | Timeout | Timeout Action |
|-----------|-------|---------|----------------|
| ... | ... | ... | ... |

---

## 6. TODOs / Incomplete Work

| File | Line | Context |
|------|------|---------|
| (None found) or ... | ... | ... |

---

## 7. Event Flow Diagram (Summary)

```
[trigger] → [step] → [step] → [wait] → ...
```

---

## 8. Findings & Recommendations

- [Verifiable finding 1]
- [Verifiable finding 2]
```

## Execution Checklist

1. Read `inngest/index.ts` to list all exported functions
2. Read each function file in `inngest/functions/`
3. Grep for `step.run`, `step.waitForEvent`, `step.sleep`
4. Grep for `guardKillSwitch`, `isWorkflowTerminated`, `getStateLockInfo`
5. Grep for `performSanctionsCheck`, `performITCCheck`, `performAggregatedAnalysis`, `runProcureCheck`
6. Grep for `inngest.send` to list emitted events
7. Read `inngest/events.ts` for event schema alignment
8. Grep for `TODO`, `FIXME`, `XXX`, `HACK` in relevant paths
9. Assemble the markdown report from gathered facts

## Anti-Patterns to Avoid

- **Guessing**: Do not infer behavior; cite code or state "not found"
- **Omission**: If a section has no matches, say "None found" explicitly
- **Vague references**: Use `file:line` or `file:function` for every claim
