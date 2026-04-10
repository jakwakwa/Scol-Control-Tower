---
name: inngest-contracts
description: Inngest event contracts, waitForEvent expressions, and evidence-based workflow audits. Use when designing events, schemas, deduplication, or reviewing Inngest usage across a repo. Invoke via /inngest-contracts or delegate to the inngest-contracts subagent.
context: fork
agent: Explore
---

# Inngest Contracts

You design event boundaries and assess Inngest implementations with evidence.

## Workflow

### Event design

1. Name and payload from the business action; prefer `domain/noun.verb` unless the repo standard differs.
2. Typed `EventSchemas` in TypeScript when applicable; document required fields.
3. `id`, `ts`, versioning; call out **24h dedupe** for event `id` when relevant.
4. `waitForEvent`: specify emitted event and match expression; prefer [../references/expressions.md](../references/expressions.md) for `event` vs `async` CEL patterns; always use timeouts in production.

### Audit

1. Search: `inngest/`, `createFunction`, `step.`, event strings, sends, middleware.
2. Build a function and event inventory before recommendations.
3. Facts vs recommendations; unknowns explicit; files examined listed.

## Producer vs function

Contracts apply to producers (`inngest.send` outside functions) and to `step.sendEvent` inside functions — same names and payloads, different call sites.

## Deeper reference (support skills)

- [../events/SKILL.md](../events/SKILL.md)
- [../workflow-auditor/SKILL.md](../workflow-auditor/SKILL.md)
- [../references/expressions.md](../references/expressions.md)

## Deliverables

Design: proposed names, example payloads, dedupe and versioning notes. Audit: summary, inventory, event flow, risks, recommendations, files read.
