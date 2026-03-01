---
title: Harden the Procurement Fallback Framework
type: feat
status: active
date: 2026-03-01
---

# Harden the Procurement Fallback Framework

## Overview

The current procurement framework utilizes a "fail open" workflow designed to prioritize operational continuity by triggering manual review gates when automation layers encounter errors. While this ensures that the system does not block parallel API processes, the existing implementation plan focuses almost exclusively on "happy path" validation—simply confirming that a fallback path exists.

As we move toward a production-grade environment, Architecture mandates a shift from passive validation to adversarial stress testing. The core objective of this issue is to evolve the procurement fallback from a functional prototype into a resilient, production-ready architecture. By identifying and mitigating latent vulnerabilities in asynchronous execution and data integrity, we ensure the system does not merely "function" during a crisis but maintains absolute state consistency. Addressing these architectural gaps is a prerequisite for moving beyond the prototype phase, specifically regarding the risks inherent in the parallel execution model.

## Problem Statement

The Stage 3 implementation involves parallel branches—such as document verification and sanctions checks—that execute concurrently with primary procurement logic. This asynchronous complexity introduces critical vulnerabilities:
1. **Unsynchronized threads ("Ghost Process" Scenario):** A background thread (e.g., hanging on an API timeout) could return a rejection status *after* a human has already manually approved a record, overwriting the human approval and corrupting the state.
2. **Alert Fatigue ("Car Alarm Problem"):** The current plan risks undifferentiated alert volume, where every minor data mismatch triggers high-priority notifications, causing operational desensitization.
3. **Brittle Routing Logic:** Front-end navigation is hard-coded to back-end business stages (e.g., hard-coding Stage 3 to procurement endpoints), creating technical debt if business stages evolve.
4. **Insufficient Data Lineage:** Simple logging of human "approvals" is insufficient for auditability and compliance; we lack programmatic links between automated failures and human overrides.

## Proposed Solution

To resolve these vulnerabilities, we must implement rigorous synchronicity controls, a tiered notification system, decoupled routing logic, and enhanced data schema structures for better audit integrity.

---

## Technical Approach

### Architecture

#### Phase 1: Resolving Parallel Execution Risks (Synchronicity Controls)
- Implement state-locking mechanisms to prevent "Ghost Processes" from overwriting finalized records.
- If a manual review creates a finalized record, any late-arriving background data must be explicitly blocked, queued, or discarded.
- Ensure stale data from failed automation attempts (e.g., truncated vendor names) is purged or marked "stale" when a manual review is triggered.

#### Phase 2: Notification Tiering and Alert Fatigue Mitigation
Transition from individual pings to summary cards/grouped alerts for batch failures. Implement the following tiered logic based on the Architectural Review:
- **Systemic/API 500:** High Severity -> Email + Dashboard (Red Banner / Immediate Alert)
- **Timeout/Service Failure:** High Severity -> Dashboard + Internal Alert (Red Visual Cue)
- **Data Mismatch/Missing ID:** Low Severity -> Dashboard Only (Yellow Visual Cue)
- **Repeated Failures (Batch):** Medium Severity -> Summary Notification (Grouped Alert Card)

#### Phase 3: Decoupling Routing Logic
- The `stageName` or `status` fields currently tightly couple front-end views to the `stage` integer in DB.
- Abstract routing logic into a `getDecisionEndpoint` helper method, determining destinations based on "Decision Type" (e.g., `is_procurement_item`) rather than stage numbers.
- Update payload definitions to include "Target Resource" metadata for dynamic backend routing.

#### Phase 4: Strengthening Data Lineage and Audit Integrity
Modify the database schema in `db/schema.ts` to support detailed failure resolution paths:
1.  **Foreign Key Requirement:** Update decision payloads (e.g., `aiFeedbackLogs` or `workflowEvents`) to include `related_failure_event_id` linking manual decisions to specific automation failures.
2.  **Categorized Rationales:** Require UX implementations to use a dropdown for overrides (e.g., "False Positive," "Data Corrected," "Exception Granted").
3.  **Contextual Auto-fill:** Automatically populate the decision log with the failure context (e.g., "Timeout Error").

---

## Acceptance Criteria

### Functional Requirements

- [ ] **Synchronized Collision Control:** The system correctly blocks a background process (e.g., document verification returning late) from overwriting a record that has already been manually acted upon.
- [ ] **Double Failure Handling:** The system can recover from simultaneous failures (e.g., procurement automation *and* document verification failing) without locking the entire workflow.
- [ ] **Stale Data Purging:** Corrupted/partial data from failed automated attempts is successfully purged when falling back to manual review.
- [ ] **Tiered Notifications:** Batch errors group into a single summary notification instead of spamming 10+ alerts. Low severity errors display yellow cues; high severity displays red.
- [ ] **Decoupled Routing:** Routing logic utilizes a `getDecisionEndpoint` helper based on Decision Type, not numeric stage constraints.
- [ ] **Data Lineage:** Schema allows linking an approval directly to its triggering automated failure via `related_failure_event_id`.

### Required Stress Test Suite

Engineering must implement and document the following specialized stress test suite during the Verification phase:
- [ ] **The Synchronized Collision Test:** Force a manual submission while the document verification branch is set to a 10-second sleep to prove late background data is rejected.
- [ ] **The Double Failure Test:** Simulate simultaneous failure of procurement automation and document verification branches.

## Success Metrics
- 0% incidence of state corruption caused by background 'ghost processes'.
- Measurable reduction in low-level notification volume for risk managers.
- Clear audit trails mapping 100% of human approvals back to their triggering failure IDs.

## Dependencies & Risks
- **Risk:** Implementing strict locks on Workflow/Applicant state transitions may block legitimate retries.
- **Dependency:** Next.js Router modifications must coordinate with existing UI Dashboard implementations.

## Documentation Plan
- Update `docs/api-reference` to reflect new dynamic routing payloads.
- Document the new Notification Tiering matrix in `docs/user-guides`.
- Update `db/schema.ts` comments regarding `related_failure_event_id` and audit integrity.
