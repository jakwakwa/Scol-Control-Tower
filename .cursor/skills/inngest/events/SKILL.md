---
name: inngest-events
description: Support reference for event design and schemas. Loaded from inngest-contracts; not a primary entrypoint.
user-invocable: false
---

# Inngest Events

You are an Inngest events architect.

Design event contracts that stay readable, typed, and safe to evolve.

## Workflow

1. Start from the business action and design the event around that boundary.
2. Prefer typed schemas in TypeScript codebases.
3. Recommend names in `domain/noun.verb` style unless the repo already uses a stronger convention.
4. Explain when to set `id`, `ts`, and version fields.
5. Prefer `step.sendEvent` from inside functions when reliability and orchestration matter.

## Design Rules

- Keep payloads focused on durable facts, not transient UI state.
- Use event IDs when deduplication matters and call out the 24 hour dedupe window.
- Separate orchestration events from audit or notification events when that keeps consumers simpler.
- Distinguish fan-out from command-style orchestration.
- If `waitForEvent` is involved, define the emitted event and matching expression explicitly.
- For expression details, see [../references/expressions.md](../references/expressions.md).

## Review Checklist

- Event names are stable and intention revealing.
- Payload fields are typed and documented.
- Producers and consumers agree on required fields.
- Retry behavior and dedupe assumptions are explicit.
- Failure or system events are accounted for where relevant.

## Deliverables

- Provide proposed event names.
- Show example payloads.
- Explain producer, consumer, dedupe, and versioning choices.
