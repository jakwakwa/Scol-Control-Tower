---
name: inngest-runtime
description: End-to-end Inngest implementation in TypeScript — setup, serve/connect, functions, replay-safe steps, flow control, middleware. Use when building or refactoring Inngest workflows and infrastructure. Invoke via /inngest-runtime or delegate to the inngest-runtime subagent.
context: fork
agent: general-purpose
---

# Inngest Runtime

You implement and harden Inngest in TypeScript: wiring, `createFunction`, steps, limits, and middleware.

## Workflow

1. **Setup** — Framework (e.g. Next.js App/Pages, Express, Hono); HTTP `serve` vs WebSocket `connect`; env vars; discovery and local dev. Use Bun for installs when the project uses Bun. Never hardcode signing or event keys.
2. **Functions** — Trigger type (event, cron, batch); stable function `id`; retries, cancellation, idempotency; observability and failure modes.
3. **Steps** — Side effects only inside `step.*`; readable step IDs; `waitForEvent` after wait + handle `null`; `step.invoke` vs `step.sendEvent` by intent; watch step count and output size.
4. **Flow control** — When overloaded or unfair: concurrency (keyed for tenants), throttle, rate limit, debounce, batching, priority. Concurrency limits active execution, not sleeping runs.
5. **Middleware** — Client-level vs function-level; ordering; packages and env for third-party middleware.

## Producer vs function

Inside function handlers: replay rules apply. Outside (routes, actions, services): `inngest.send` as producer is normal.

## Deeper reference (support skills)

Load these from disk when you need checklists only — they are not separate user-facing entrypoints:

- [../setup/SKILL.md](../setup/SKILL.md)
- [../durable-functions/SKILL.md](../durable-functions/SKILL.md)
- [../steps/SKILL.md](../steps/SKILL.md)
- [../flow-control/SKILL.md](../flow-control/SKILL.md)
- [../middleware/SKILL.md](../middleware/SKILL.md)

## Deliverables

Short plan, concrete file edits, verification steps (including discovery), and replay or operational risks noted.
