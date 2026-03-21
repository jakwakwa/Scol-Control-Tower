# AGENTS.md

## Learned User Preferences

- Every/Any update or fix requires using Vercel's Agent Browser tool targeting exact ui area related to the problem, or worflow stage. 
- verify e2e using agent skills agent browser. use E2E_CLERK_RISK_MANAGER_PASSWORD E2E_CLERK_RISK_MANAGER_USERNAME, IF they dont work try any other *CLERK* _PASSWORD  or _USERNAME or _EMAIL in .env (IGNORE .env.test and .env.local)
- Use bun as the preferred package manager and command runner; do not use bunx
- Implement large refactors as verification-gated waves, not one large parallel change; prove each wave before starting the next
- Each wave should be small enough to fit inside an agent context window
- Prefer safe, slower rollout cadence over maximum throughput; pause and verify ground truth when uncertainty arises
- Split Inngest `step.run` blocks so each step contains only one side effect (email, notification, DB write) to avoid duplicate side effects on retries
- For human-driven dev scenarios and straight-through flows, do not add or leave an automatic scenario runner in parallel with manual steps unless the user explicitly asked for that automation
- Do not treat Drizzle Studio relation or graph extraction as the primary proof that a schema or migration change is correct; verify with migrations, application behavior, or tests

## Learned Workspace Facts

- `bun run lint` runs Biome (not next lint)
- The repo uses Drizzle ORM with Turso (libSQL/SQLite), not Prisma; schema lives in `db/schema.ts`
- Inngest is the workflow orchestration engine; `cancelOn` only interrupts between steps, not mid-step
- The onboarding workflow has exactly 4 risk check families: PROCUREMENT, ITC, SANCTIONS, and FICA — stored in `risk_check_results`; they must run 100% independently with no bundling in shared step.run or Promise.all pairs
- The Stage 6 `AGREEMENT_CONTRACT` predicate is the canonical contract signature gate (not Stage 5)
- `terminateRun()` wraps `executeKillSwitch()` and always throws `NonRetriableError` to exit Inngest runs cleanly
- Manually-created migration SQL files must be registered in `migrations/meta/_journal.json`; `drizzle-kit migrate` silently skips unregistered files
- For E2E Clerk auth, document both `E2E_CLERK_***_USERNAME` and `E2E_CLERK_***_EMAIL` in `.env.test.example`; they are distinct (username vs email for sign-in)
- Manual Green Lane actions from the dashboard are gated in code on the Clerk organization permission `org:green_lane:approve`
- Do not describe local dev scenarios or human straight-through flows as `mock tests`; that label does not match how this project refers to those flows

---
alwaysApply: true
---

---
name: vercel-composition-patterns
description:
  React composition patterns that scale. Use when refactoring components with
  boolean prop proliferation, building flexible component libraries, or
  designing reusable APIs. Triggers on tasks involving compound components,
  render props, context providers, or component architecture. Includes React 19
  API changes.
license: MIT
metadata:
  author: vercel
  version: '1.0.0'
---

# React Composition Patterns

Composition patterns for building flexible, maintainable React components. Avoid
boolean prop proliferation by using compound components, lifting state, and
composing internals. These patterns make codebases easier for both humans and AI
agents to work with as they scale.

## When to Apply

Reference these guidelines when:

- Refactoring components with many boolean props
- Building reusable component libraries
- Designing flexible component APIs
- Reviewing component architecture
- Working with compound components or context providers

## Rule Categories by Priority

| Priority | Category                | Impact | Prefix          |
| -------- | ----------------------- | ------ | --------------- |
| 1        | Component Architecture  | HIGH   | `architecture-` |
| 2        | State Management        | MEDIUM | `state-`        |
| 3        | Implementation Patterns | MEDIUM | `patterns-`     |
| 4        | React 19 APIs           | MEDIUM | `react19-`      |

## Quick Reference

### 1. Component Architecture (HIGH)

- `architecture-avoid-boolean-props` - Don't add boolean props to customize
  behavior; use composition
- `architecture-compound-components` - Structure complex components with shared
  context

### 2. State Management (MEDIUM)

- `state-decouple-implementation` - Provider is the only place that knows how
  state is managed
- `state-context-interface` - Define generic interface with state, actions, meta
  for dependency injection
- `state-lift-state` - Move state into provider components for sibling access

### 3. Implementation Patterns (MEDIUM)

- `patterns-explicit-variants` - Create explicit variant components instead of
  boolean modes
- `patterns-children-over-render-props` - Use children for composition instead
  of renderX props

### 4. React 19 APIs (MEDIUM)

> **⚠️ React 19+ only.** Skip this section if using React 18 or earlier.

- `react19-no-forwardref` - Don't use `forwardRef`; use `use()` instead of `useContext()`

## How to Use

Read individual rule files for detailed explanations and code examples:

```
rules/architecture-avoid-boolean-props.md
rules/state-context-interface.md
```

Each rule file contains:

- Brief explanation of why it matters
- Incorrect code example with explanation
- Correct code example with explanation
- Additional context and references

## Full Compiled Document

For the complete guide with all rules expanded: `AGENTS.md`
