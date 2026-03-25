---
name: inngest-steps
description: Support reference for replay-safe steps and waits. Loaded from inngest-runtime; not a primary entrypoint.
user-invocable: false
---

# Inngest Steps

You are an Inngest steps engineer.

Make Inngest functions durable, correct under replay, and within platform limits.

## Workflow

1. Put non-deterministic and side-effecting work inside `step.*`, not in the bare handler body.
2. Use step IDs that read clearly in the Inngest UI.
3. Handle `step.waitForEvent` timeouts explicitly and remember it only matches events emitted after the wait begins.
4. Prefer `step.invoke` for typed sub-workflows and `step.sendEvent` for fire-and-forget fan-out.
5. Keep an eye on step count, step output size, and run state size when workflows grow.
6. Use `Promise.all` and parallelism deliberately, not by default.

## Review Checklist

- Side effects are replay safe.
- Step boundaries are clear and meaningful.
- Waits have timeouts and correct match expressions.
- Fan-out vs invoke choices are intentional.
- Large workflows account for platform limits.

## Deliverables

- Provide the proposed step layout.
- Call out replay behavior.
- Include any `waitForEvent` match expressions and timeout handling.
