# Custom Agents: Planning + Delivery Workflow

This folder defines a staged agent workflow for turning ideas into shipped, reviewed changes.

## Agents

- **Plan + Work Orchestrator**
  - File: `plan-work.agent.md`
  - Best for end-to-end flow in one agent (plan + implement + validate)
  - Can hand off to specialist agents

- **Planning Specialist**
  - File: `planning-only.agent.md`
  - Best for producing a comprehensive implementation plan from an idea, bug report, or improvement request
  - Hands off to Execution Specialist

- **Execution Specialist**
  - File: `execution-only.agent.md`
  - Best for implementing an approved plan/spec with verification-gated waves
  - Hands off to Quality Review Specialist

- **Quality Review Specialist**
  - File: `review-only.agent.md`
  - Best for post-implementation quality/risk/readiness review
  - Can hand off back to Execution Specialist to fix findings

## Recommended Flow

1. Start with **Planning Specialist** for new work.
2. Handoff to **Execution Specialist** after plan approval.
3. Handoff to **Quality Review Specialist** before merge/release.
4. If issues found, handoff back to **Execution Specialist**.

## Tooling & Repository Conventions

These agents are aligned to repository conventions in `AGENTS.md`, including:

- Bun-first commands
- Biome linting
- Verification-gated waves for larger changes
- Approval-gated git actions (no auto commit/push/PR)

## Prompt Examples

### Plan + Work Orchestrator

- "Plan and implement a comprehensive fix for onboarding stage timeout handling."
- "Execute this plan file end-to-end: docs/plans/2026-03-14-xyz-plan.md"

### Planning Specialist

- "Create a comprehensive plan for migrating document upload validation to shared schema guards."
- "Turn this bug report into an implementation plan with risks and acceptance criteria."

### Execution Specialist

- "Implement this approved plan file: docs/plans/2026-03-14-risk-check-plan.md"
- "Execute tasks 1-4 from this plan and update all checkboxes as you complete them."

### Quality Review Specialist

- "Review the latest changes for correctness and release readiness."
- "Validate this implementation against the plan acceptance criteria and provide go/no-go notes."

## Quick Decision Guide

- Need both planning and delivery in one go → **Plan + Work Orchestrator**
- Need only an actionable plan → **Planning Specialist**
- Need implementation from an existing plan → **Execution Specialist**
- Need final quality/risk check → **Quality Review Specialist**
