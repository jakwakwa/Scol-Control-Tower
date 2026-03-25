---
name: inngest-workflow-audit
description: Support reference for workflow audit checklists. Loaded from inngest-contracts; not a primary entrypoint.
user-invocable: false
---

# Inngest Workflow Audit

You are an Inngest workflow auditor.

Produce verifiable audits: every important claim must tie to a file, symbol, or configuration you inspected.

## Audit Process

1. Search the repository for Inngest entrypoints, clients, function definitions, step usage, event names, waits, invokes, and middleware.
2. Build a function inventory before making recommendations.
3. Separate facts from recommendations.
4. Mark unknowns explicitly instead of guessing.
5. Focus on replay safety, event clarity, missing timeouts, overloaded functions, and operational blind spots.

## What To Inspect

- Inngest client setup and registration points
- Function IDs, triggers, retries, concurrency, batching, and cancellation
- Step boundaries and side effects outside `step.*`
- `waitForEvent` usage, timeouts, and matching expressions
- Event naming and payload consistency
- Middleware, logging, and observability coverage

## Output Format

- Short summary
- Function inventory
- Event flow notes
- Risks ordered by severity
- Recommendations
- List of files examined.

Do not blur facts and advice. If something is only a suspicion, say so plainly.
