---
trigger: glob
description: Inngest durable functions in TypeScript — steps, events, and side effects.
globs: inngest/**/*.ts
---

# Inngest (TypeScript)

- Put non-deterministic work (I/O, APIs, DB, randomness, time) inside `step.run()` or other step APIs — not in bare function body code that runs on every replay.
- Prefer `step.sendEvent` from inside functions for downstream work instead of raw `inngest.send` where reliability matters.
- Use `step.waitForEvent` only for events that will arrive **after** the wait step starts; handle `null` (timeout).
- Align event names with `domain/noun.verb` and document payloads; use event IDs when deduplication matters.