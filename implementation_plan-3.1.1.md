# Implementation Plan - Standard Operating Procedure (SOP) v3.1.0

## Goal Description
Implement the new SOP v3.1.0 requirements for the Onboarding Control Tower. This includes a tiered escalation process for document collection, a strict sanctions clearance protocol, and the integration of a "Reporter Agent" for argumentative synthesis.

## User Review Required
> [!IMPORTANT]
> **Sanctions Clearance**: The "Retry" function is explicitly forbidden for Sanctions hits. A new `SANCTION_PAUSE` state and manual clearance workflow will be introduced.
> **Tiered Escalation**: The document collection phase will now strictly follow a 3-strike rule before escalating to human managers, eventually leading to a "Salvage State" and termination.

## Proposed Changes

### Database Schema Updates

#### [MODIFY] [db/schema.ts](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/db/schema.ts)
- **`applications` table**:
    - `escalationTier` (Int): Current tier (1=Normal, 2=Manager Alert, 3=Salvage).
    - `salvageDeadline` (Timestamp): The 48h cut-off for manual override.
    - `isSalvaged` (Boolean): If true, prevents future auto-termination.
    - `sanctionStatus` (Enum): `clear`, `flagged`, `confirmed_hit`.
- **`sanction_clearance` table (NEW)**:
    - [id](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/lib/services/agents/aggregated-analysis.service.ts#326-341) (UUID): Primary Key.
    - `applicationId` (UUID): FK to `applications`.
    - `sanctionListId` (String): External ID (e.g., "OFAC-12345").
    - `clearedBy` (UUID): User ID of Compliance Officer.
    - `clearanceReason` (Text): Mandatory legal justification.
    - `isFalsePositive` (Boolean): Explicit confirmation.
- **`ai_analysis` table (Updates)**:
    - `promptVersionId` (String): Git hash or SemVer of the prompt used.
    - `confidenceScore` (Int): 0-100 rating.
    - `humanOverrideReason` (Enum): `CONTEXT`, `HALLUCINATION`, `DATA_ERROR`.
    - `narrative` (Text): The AI's 2-paragraph summary.

### Workflow Updates ([inngest/functions/control-tower-workflow.ts](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/inngest/functions/control-tower-workflow.ts))

#### Phase 2: Document Collection (Tiered Escalation)
- **Logic**: Use a `step.sleep('7d')` loop for document reminders.
- **Tier 1 (Retry 4)**:
    - Trigger `notify.account_manager` event (Task: Phone Call).
    - Switch email template to `email_template_urgent`.
    - Update `escalationTier` to 2.
- **Tier 2 (Retry 7)**:
    - Send final warning email.
    - Flag as "High Risk of Termination".
- **Salvage State (Retry 8)**:
    - Update `escalationTier` to 3.
    - Wait 48 hours (`step.sleep('48h')`) for AM override.
    - Check for `isSalvaged` flag. If false -> Terminate.

#### Phase 3: Sanctions Clearance
- **Error Handling**: Catch `SanctionHitError` specifically to bypass standard retries.
- **Flow**: Redirect to `SANCTION_PAUSE` state.
- **UI**: Display side-by-side comparison with deep links to sanction sources (e.g., treasury.gov).
- **Adjudication**:
    - Form with `clearanceReason` and `confirmFalsePositive`.
    - Actions: "Clear & Resume" or "Confirm Hit & Terminate".

#### Phase 4: Reporter Agent (Argumentative Synthesis)
- **Input**: Outputs from Agents 1, 2, and 3.
- **Output Structure**:
    ```json
    {
      "recommendation": "APPROVE" | "DENY" | "REFER",
      "confidence_score": 0-100,
      "narrative": "...",
      "critical_flags": ["..."]
    }
    ```
- **System Learning**:
    - Pre-fill `risk_decision_notes` with AI `narrative` (Draft mode).
    - Log `promptVersionId`.

### Events
#### [MODIFY] [inngest/events.ts](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/inngest/events.ts)
- Add schemas for:
    - `sanction/cleared`: payload `{ workflowId, officerId, reason }`
    - `sanction/confirmed`: payload `{ workflowId, officerId }`
    - `escalation/tier.changed`: payload `{ workflowId, newTier }`

### UI/UX (Frontend)
- **Sanction Clearance Interface**:
    - New page/modal for Compliance Officer.
    - Display "Deep Links" from Sanctions Agent result.
    - Form to inputs "False Positive" reason and sign off.
- **Visual Hierarchy**:
    - Update Risk Review dashboard to collapse "green" sections and expand "red" flags.
    - Implement "Why" modal for Risk Manager overrides.

## Verification Plan

### Automated Tests
- **Workflow Tests**:
    - Create a new test file `e2e/sop-workflow.spec.ts` (or unit test `inngest/functions/control-tower-workflow.test.ts` if possible, but Inngest is hard to unit test without mocks).
    - We will simulate events to trigger the different tiers of escalation.
    - We will simulate a Sanctions hit and verify the workflow pauses.
    - We will simulate a Sanctions clearance and verifying resumption.

### Manual Verification
1.  **Tiered Escalation**:
    - Start a new onboarding.
    - Fast-forward time (or trigger retry events manually) to hit 4th retry.
    - Verify AM notification.
    - Hit 8th retry. Verify "Salvage State" and 48h timer.
2.  **Sanctions**:
    - Start onboarding with a name known to trigger mock sanctions hit (need to find one in [sanctions.agent.ts](file:///Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/lib/services/agents/sanctions.agent.ts) or force it).
    - Verify workflow status becomes `SANCTION_PAUSE`.
    - Use the new UI to "Clear" the sanction.
    - Verify workflow resumes.
