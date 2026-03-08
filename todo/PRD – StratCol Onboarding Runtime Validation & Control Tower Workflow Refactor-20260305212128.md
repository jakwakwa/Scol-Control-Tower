# PRD – StratCol Onboarding Runtime Validation & Control Tower Workflow Refactor

# PRD – StratCol Onboarding Runtime Validation & Control Tower Workflow Refactor
## 1\. Overview / Summary
This PRD defines a pair of tightly related technical resilience and maintainability initiatives for the StratCol onboarding platform:
1. **Runtime schema validation and active timeout enforcement** for the onboarding ingest perimeter and Stage 2 (Facility Application), eliminating malformed input–driven failures and long‑running "zombie" workflows.
2. **Refactor of** **`ControlTowerWorkflow.ts`** **into a modular composite architecture**, reducing cognitive load, enabling safer iteration, and supporting the timeout / kill-switch behaviors required by (1).

Together, these changes harden the `ingest-engine` / `onboarding-service` and `workflow-orchestration` components so that:
*   Malformed or unexpected JSON payloads are rejected at the perimeter with clear logging and deterministic termination.
*   Stage 2 applications and approvals are actively terminated after the configured windows, leaving no ambiguous or resource-draining zombies in the system.
*   The StratCol Control Tower workflow is split into clear, testable stage modules orchestrated by a thin "traffic director" or event-driven pattern.

Type:
*   **Ticket 1** – Bug / Technical Resilience (`ingest-engine` / `onboarding-service`)
*   **Ticket 2** – Refactor / Technical Debt (`workflow-orchestration`)

## 2\. Problem / Background
### 2.1 Ingest perimeter & Stage 2 timeouts
Current issues:
*   The onboarding monolith does **not enforce strict runtime validation** at the ingest perimeter for:
    *   `onboarding/lead.created` events.
    *   External sanctions events.
*   Malformed or unexpected JSON payloads can enter Stage 2 (Facility Application) and later stages, leading to:
    *   Downstream failures and brittle error handling.
    *   AI hallucinations in Stage 2 due to inconsistent or missing fields.
*   Stage 2 currently uses a **"passive" timeout model**:
    *   Runs that pass their 14‑day facility application or 30‑day approval windows are left in a **zombie state**.
    *   Zombies continue to occupy workflow slots and drain compute.
    *   Account managers see ambiguous statuses and cannot reliably distinguish between truly active vs. abandoned cases.

We already have a **Stage 4 Guard Kill Switch** mechanism that can deterministically kill a run and move it into a terminal state, but Stage 2 timeouts are not wired through it.
### 2.2 Monolithic `ControlTowerWorkflow.ts`
*   `ControlTowerWorkflow.ts` has grown to ~2,700 lines, with ~81 step operations and interleaved AI logic.
*   The file now exceeds reasonable cognitive limits for individual developers and reviewers, creating risk of:
    *   Variable shadowing and subtle bugs.
    *   High merge-conflict frequency.
    *   Fear of change, especially around shared helper functions and cross‑cutting logic.
*   The current structure makes it difficult to:
    *   Enforce strict event predicates (e.g. Stage 5 should only wake on `formType: STRT_CALL_CONTRACT`).
    *   Unit test specific stages in isolation using mocked events.
    *   Deploy changes to a single stage without touching the entire monolithic workflow.

The lack of modularity compounds the resilience problems from 2.1: hardening timeouts and validation becomes significantly harder while logic remains entangled.
## 3\. Goals & Non-Goals
### 3.1 Goals
**Ticket 1 – Runtime validation & active timeouts**
*   Introduce **strict, reusable Zod-based runtime validation** at the ingest perimeter for:
    *   `onboarding/lead.created` events.
    *   External sanctions events.
*   Define a clear pattern for **`safeParse`** **vs** **`parse`** and how validation errors are surfaced (logging, metrics, and control flow).
*   On validation failure or Stage 2 timeout:
    *   Short‑circuit the ingest pipeline **before** any stateful side‑effects or AI calls.
    *   Route the run into a deterministic **`TERMINATED`** state via the existing Stage 4 Guard Kill Switch mechanism (or equivalent guard path).
*   Replace passive Stage 2 timeouts with **active enforcement**:
    *   Facility application window: 14 days from Stage 2 start.
    *   Approval window: 30 days from the relevant decision point.
    *   On expiry, execute a kill‑switch path with clear termination reason.
*   Achieve **queue hygiene** by ensuring terminated / expired runs are removed from active execution queues (no long‑lived zombies).

**Ticket 2 – Modular workflow architecture**
*   Refactor `ControlTowerWorkflow.ts` into a **composite of stage-specific modules**, each responsible for a bounded portion of the workflow (Stages 1–6).
*   Introduce a lean **orchestration layer** ("Traffic Director") that:
    *   Is ~100 lines of code (order of magnitude, not a hard cap).
    *   Delegates to the appropriate stage module based on workflow state and events.
*   Optionally prepare for an **event-driven architecture**, where stages emit `stageN.completed` events that trigger subsequent stages independently.
*   Update Stage 5 `wait_for_event` logic to include a **strict predicate filter** (e.g. `formType: STRT_CALL_CONTRACT`) to avoid waking on unrelated form submissions (e.g. banking forms).
*   Enable **stage-specific unit tests** with mocked event triggers and state.
*   Support **targeted deployments** where one stage can be updated without re‑deploying the entire workflow monolith.

### 3.2 Non-Goals
*   Redesigning the full end‑to‑end onboarding business process or product UX.
*   Changing external APIs / contracts with upstream or downstream systems (unless required for validation correctness and explicitly agreed).
*   Replatforming the workflow engine or orchestration infrastructure.
*   Introducing a full self‑serve configuration UI for workflows or timeouts (this can be a follow‑up initiative).
*   Implementing every possible future stage modularization at once; focus is on core stages 1–6 relevant to current onboarding and facility workflows.

## 4\. Users / Personas
Primary users and stakeholders impacted:
*   **Account Managers / Relationship Managers**
    *   Need clear, deterministic statuses for onboarding workflows.
    *   Must avoid chasing leads that are effectively dead due to timeout or invalid data.
*   **Onboarding Operations / Support**
    *   Monitor queues and SLAs for facility applications and approvals.
    *   Need to identify stuck or zombie workflows quickly and act (e.g. re‑trigger, close, or escalate).
*   **Risk / Compliance Analysts**
    *   Rely on accurate and complete data from sanctions and KYC events.
    *   Need confidence that malformed or incomplete events are not silently driving AI or decision logic.
*   **Engineering (Onboarding / Workflow teams)**
    *   Own the `ingest-engine`, `onboarding-service`, and `workflow-orchestration` code.
    *   Need modular, testable code to iterate on AI logic, stages, and predicates without fear.
*   **SRE / Platform / Observability**
    *   Responsible for infrastructure health and cost.
    *   Need the system to avoid zombie workloads and provide clear signals when validation or timeout logic fires.

## 5\. User Stories / Use Cases
### 5.1 Ingest validation
*   **US1 – Fail fast on malformed payloads**
    *   As the **ingest engine**, when I receive a malformed or schema‑incompatible `onboarding/lead.created` or sanctions event,
    *   I want to **validate the payload at the perimeter** and short‑circuit the run,
    *   So that no downstream stages or AI calls are triggered and the run is cleanly terminated with a logged reason.
*   **US2 – Structured error signals**
    *   As a **developer or SRE**, when a payload fails schema validation,
    *   I want to see a clear, structured error (including reason, event type, and key identifiers) in logs and metrics,
    *   So that I can debug integrations, update schemas, and ensure external partners fix their payloads.

### 5.2 Active Stage 2 timeouts
*   **US3 – Facility application expiry**
    *   As an **account manager**, when a facility application has been pending for more than 14 days without required actions,
    *   I want the workflow to automatically move into a **`TERMINATED`** state with a clear timeout reason,
    *   So that my pipeline reflects reality and I can decide whether to re‑engage or close out the relationship.
*   **US4 – Approval window expiry**
    *   As an **operations lead**, when an approval has remained incomplete for more than 30 days,
    *   I want the system to actively trigger the Guard Kill Switch and terminate the run,
    *   So that there are no ambiguous, long‑running approvals consuming compute or attention.

### 5.3 Modular workflow operation
*   **US5 – Safer stage iteration**
    *   As an **engineer**, when I need to change the logic for a specific stage (e.g. Stage 3 AI enrichment),
    *   I want to work in a **small, isolated module** with dedicated tests,
    *   So that I can ship changes without touching unrelated stages or risking regressions.
*   **US6 – Predicate‑safe document waits**
    *   As an **engineer**, when Stage 5 is waiting for a signed contract,
    *   I want the `wait_for_event` logic to only wake on events explicitly matching `formType: STRT_CALL_CONTRACT` (and other required fields),
    *   So that the workflow never advances due to irrelevant documents (e.g. banking forms).
*   **US7 – Targeted deployments**
    *   As a **tech lead**, when I roll out a Stage 2 timeout change or Stage 5 predicate tweak,
    *   I want to deploy just the affected module and a thin orchestrator,
    *   So that releases are smaller, safer, and easier to roll back.

## 6\. UX / UI Notes
> Note: UI specifics depend on existing StratCol dashboards and workflow views; details below assume standard internal tooling and may need alignment with official UX docs.
*   **Status representation**
    *   Introduce or confirm a dedicated **`TERMINATED`** status, distinct from `TIMEOUT` or `FAILED`.
    *   For terminated runs, display a **termination reason** (e.g. `VALIDATION_ERROR`, `FACILITY_TIMEOUT_14D`, `APPROVAL_TIMEOUT_30D`).
    *   Ensure pipeline and case-management views reflect TERMINATED runs clearly and are easy to filter out or in.
*   **Timeout annotations**
    *   When a run is terminated due to timeout, store and surface:
        *   Original stage and step where the timeout was enforced.
        *   Duration configuration (14 days, 30 days) for auditability.
*   **Operational visibility**
    *   Add views or filters enabling Ops / AMs to:
        *   See **upcoming** timeouts (e.g. runs approaching 14 days) where proactive action might save a deal.
        *   Review recently terminated runs with their reasons.
*   **Error surfacing (optional / future)**
    *   Where appropriate, provide human-readable explanations for TERMINATED runs in any customer‑facing or partner dashboards, without leaking low‑level validation internals.

## 7\. Technical Notes
### 7.1 Runtime schema validation (Ticket 1)
**Entry point & scope**
*   Add a **perimeter validation layer**Add a **perimeter validation layer** at the start of the StratCol Control Tower function (or equivalent ingest entrypoint) for:
    *   `onboarding/lead.created` events.
    *   External sanctions events.
*   Use **Zod** to define schemas for each event type, encapsulated in a reusable validation module, e.g.:
    *   `schemas/onboardingLead.ts`
    *   `schemas/sanctionsEvent.ts`

**Validation pattern**
*   Prefer `safeParse` for most ingress flows to avoid unhandled exceptions, with a centralised error-return type, e.g.:
    *   `Result<ValidatedPayload, ValidationError[]>`.
*   Use `parse` selectively in internal, trusted contexts where a hard failure is desired.
*   On validation failure:
    *   Log a **structured error** with:
        *   Event type, source system, key IDs (e.g. lead ID, customer ID).
        *   List of failed paths and messages.
    *   Increment relevant **metrics** (e.g. `ingest.validation_failures_total` by type).
    *   **Do not** call downstream services or AI functions.
    *   Invoke the Guard Kill Switch (see below) to move the workflow to `TERMINATED`.

**Integration with Guard Kill Switch / TERMINATED path**
*   Reuse the existing **Stage 4 Guard Kill Switch** mechanism where possible:
    *   Introduce a new guard reason code for validation failures (e.g. `VALIDATION_ERROR_INGEST`).
    *   Map this to a **`TERMINATED`** workflow state.
*   For timeouts, define separate guard reasons (e.g. `STAGE2_TIMEOUT_FACILITY`, `STAGE2_TIMEOUT_APPROVAL`).
*   Ensure **idempotency**: repeated validation failures or timeout checks for the same run should not create duplicate effects.

### 7.2 Active timeout enforcement for Stage 2
*   Represent Stage 2 timeout configuration in a central place (e.g. constants or config table):
    *   `FACILITY_APPLICATION_TIMEOUT_DAYS = 14`.
    *   `APPROVAL_TIMEOUT_DAYS = 30`.
*   Add a **timeout evaluation mechanism** (cron, scheduled jobs, or event-based) that:
    *   Scans Stage 2 runs and computes elapsed time since relevant start markers.
    *   For expired runs, invokes the Guard Kill Switch with the correct reason code.
*   When a run is terminated due to timeout:
    *   Update status to `TERMINATED` and persist the reason.
    *   Remove the run from any **active execution queues** so it cannot be resumed accidentally.
*   Ensure resilience to clock skew and retries; timeouts should be **at-least-once** but **idempotent**.

### 7.3 Modular workflow architecture (Ticket 2)
**Module structure**
*   Split `ControlTowerWorkflow.ts` into stage modules, e.g.:
    *   `stages/stage1_intake.ts`
    *   `stages/stage2_facilityApplication.ts`
    *   `stages/stage3_enrichment.ts`
    *   `stages/stage4_guardKillSwitch.ts`
    *   `stages/stage5_contractWait.ts`
    *   `stages/stage6_activation.ts`
*   Each stage module should:
    *   Expose a clear interface, e.g. `executeStageN(context: WorkflowContext): Promise<StageResult>`.
    *   Contain only logic relevant to that stage plus local helpers.
    *   Be independently unit‑testable.

**Thin orchestrator / traffic director**
*   Replace monolithic orchestration with a lean controller, e.g. `ControlTowerOrchestrator.ts`, responsible for:
    *   Determining the **current stage and step** from persisted workflow state.
    *   Delegating to the appropriate stage module.
    *   Applying standard cross‑cutting concerns (logging, metrics, error handling, retries).
*   Aim for a small, comprehensible file (~100 LOC) with minimal branching.

**Event-driven option (future-friendly)**
*   Design stage interfaces so they can be triggered either:
    *   Synchronously by the orchestrator, or
    *   As consumers of **`stageN.completed`** events emitted to an event bus.
*   Avoid coupling stage modules to specific transport or event-bus libraries so that a future event-driven migration is largely orchestration-level work.

**Stage 5 predicate filtering**
*   Update `wait_for_event` logic in Stage 5 to enforce a strict predicate, including but not limited to:
    *   `formType === 'STRT_CALL_CONTRACT'`.
    *   Matching customer / workflow IDs.
    *   Optional versioning or schema fields as required.
*   Ensure that **non-matching events are ignored**, not treated as soft failures.
*   Add metrics/logging to detect spurious events that nearly match but are discarded.

**Unit testing**
*   Introduce or extend **stage-specific unit tests**:
    *   For each stage, tests that validate correct behavior given various inputs, including error and edge cases.
    *   Mock event and context inputs rather than spinning up full workflows.
*   Ensure CI includes coverage gates for these stage modules.

**Deployment and migration**
*   Plan an incremental rollout:
    *   Step 1: Introduce stage modules while keeping old orchestrator behavior functionally equivalent.
    *   Step 2: Switch orchestrator to call new modules while monitoring metrics.
    *   Step 3: Remove legacy inlined logic once stability is confirmed.
*   Ensure feature flags or environment switches are available if rollback is needed.

## 8\. Risks, Assumptions & Dependencies
### 8.1 Risks
*   **Overly strict schemas** could reject currently tolerated but messy payloads:
    *   Risk of sudden spike in validation failures affecting partners or upstream systems.
*   **Hidden dependencies on** **`TIMEOUT`** **semantics**:
    *   Other systems may currently interpret `TIMEOUT` differently; moving to `TERMINATED` might have unintended side‑effects.
*   **Partial refactor risk**:
    *   Stopping mid‑refactor could leave logic split between monolithic and modular structures, increasing confusion.
*   **Predicate misconfiguration**:
    *   Incorrect Stage 5 filters might cause genuine contract events to be ignored or misrouted.
*   **Operational noise**:
    *   Initial rollout of strict validation and timeouts may increase alert volume until upstream issues are addressed.

### 8.2 Assumptions
*   Official StratCol onboarding and workflow documentation accurately reflects the intended stage semantics and timeouts.
*   The existing Stage 4 Guard Kill Switch is robust and can be safely reused for new termination pathways.
*   There is a single, well‑defined ingest entrypoint where Zod validation can be centralized.
*   Engineering teams agree that splitting into stage modules and a traffic director is the preferred first step, with event‑driven architecture as an optional evolution.

### 8.3 Dependencies
*   **Onboarding / Workflow Engineering** for implementation ownership and refactor strategy.
*   **SRE / Observability** for metrics, logging standards, dashboards, and alerting on validation failures and timeouts.
*   **Risk / Compliance / Product** to:
    *   Confirm timeout windows (14 days, 30 days) and any exceptions.
    *   Decide how TERMINATED states should appear in internal tools.
*   **Upstream Integrations / Partners** may need to adjust payloads to comply with stricter schemas.

## 9\. Metrics / Success Criteria
### 9.1 Resilience & correctness
*   **Validation coverage**
    *   100% of `onboarding/lead.created` and external sanctions events pass through Zod validation.
    *   0 incidents in Stage 2 attributable to malformed or missing fields over a 30‑day period post‑launch.
*   **Timeout enforcement**
    *   0 workflows in Stage 2 with last‑activity older than their configured timeout window that remain in a non‑terminal state.
    *   Measurable reduction in average number and lifetime of zombie workflows.

### 9.2 Operational & developer experience
*   **File size & structure**
    *   `ControlTowerWorkflow.ts` reduced by **\>80%** in line count.
    *   New stage modules each remain under an agreed LOC threshold (e.g. 300–400 LOC).
*   **Testing & deployment**
    *   Stage modules achieve agreed unit test coverage (e.g. ≥80%).
    *   Ability to deploy a change affecting only one stage without touching others, validated by at least one such deployment in production.
*   **Incident & on‑call metrics**
    *   Reduction in incidents related to zombie workflows and ambiguous timeouts.
    *   No net increase in Sev‑1/Sev‑2 incidents directly attributable to the refactor and validation changes after stabilization window.

## 10\. Open Questions
1. **Validation schemas**
    *   What are the canonical field definitions for `onboarding/lead.created` and external sanctions events (types, required vs optional, enums)?
    *   Are there legacy payloads we must support temporarily, and how should we handle them (e.g. soft‑validation with warnings vs hard failure)?
2. **Timeout semantics**
    *   Are 14 days (facility application) and 30 days (approval) final, or should they be configurable per product / customer segment?
    *   Should terminated runs due to timeout be easily re‑activated, or should they always require a fresh workflow run?
3. **Status model & UX**
    *   How should `TERMINATED` be surfaced alongside existing statuses (`PENDING`, `RUNNING`, `TIMEOUT`, etc.) in account manager and ops tools?
    *   Do we need to migrate existing `TIMEOUT` runs to `TERMINATED` with a reason code, or only apply the new semantics going forward?
4. **Architecture choice**
    *   Is the target architecture for the next 6–12 months the thin traffic‑director pattern, or should we invest directly in a fully event‑driven "stage.completed" model?
    *   Are there any platform constraints (e.g. existing event bus, latency, or cost) we must account for when choosing between these options?
5. **Ownership & interfaces**
    *   Which team owns the Zod schemas and their evolution (onboarding vs shared platform)?
    *   Who approves breaking schema changes that may reject currently accepted payloads?
6. **Rollout strategy**
    *   What is the preferred rollout plan (e.g. env‑flagged, canary, product slice) for both validation and timeouts to minimize risk?
    *   Do we need a bulk clean‑up / backfill task to handle currently zombie workflows when the new termination logic is enabled?