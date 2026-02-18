# Standard Operating Procedure (SOP): Financial Onboarding & Compliance

**Version:** 3.1.1
**Last Updated:** 15 February 2026
**Status:** Draft (Pending Engineering Review)
**Owner:** Risk & Compliance / Engineering Team

## 1\. Purpose

The purpose of this SOP is to mandate a **proactive, risk-aware** onboarding process. It shifts the system from a passive data collector to an active "Argumentative Synthesis" partner, ensuring that high-risk states (Sanctions) are handled with strict legal protocols and stagnant files ("Zombie Workflows") are escalated to human operators before failure.

## 2\. Scope

This procedure applies to:

* **Account Managers (AM):** Responsible for human intervention during escalation tiers.
* **Risk Managers:** Responsible for adjudicating AI recommendations and clearing sanctions.
* **Compliance Officers:** Sole authority for clearing true positive sanction alerts.
* **System Agents:** The "Reporter Agent" and underlying AI infrastructure.

## 3\. Definitions

* **Argumentative Synthesis:** The AI's requirement to provide a scored opinion (e.g., "Approve with Caution"), not just raw data.
* **Zombie State:** A file that has stalled in the document collection phase for >3 weeks.
* **Sanction Clearance:** A distinct legal process for verifying potential terror/laundering hits; distinct from a technical "Retry."
* **Deep Link:** A direct URL to the external source (e.g., OFAC list entry) enabling side-by-side verification.

## 4\. Process Workflow

### Phase 1: Initiation & Commercial Mandates

(Standard initiation and quote generation remains unchanged)

### Phase 2: Document Collection with Tiered Escalation

Instead of a passive 8-week loop, the system enforces a "Three-Strike" escalation rule.

1. **Standard Reminders (Retries 1-3):** System sends polite, dynamic email reminders to the applicant every 7 days.
2. **Tier 1 Escalation (Retry 4):**
    * **System Action:** Notifies the Account Manager (AM) via Slack/Dashboard.
    * **AM Action:** Mandatory personal phone call to the applicant.
    * **Email Content:** Shifts tone from polite to urgent.
3. **Tier 2 Escalation (Retry 7):**
    * **System Action:** Flags file as "At Risk of Termination." Final warning sent to applicant.
4. **Salvage State (Retry 8):**
    * **System Action:** Enters "Salvage State" (Pre-termination).
    * **AM Action:** Has 48 hours to override termination (e.g., if client is on holiday).
    * **Outcome:** If no override is logged, the file triggers `Final Termination`.

### Phase 3: Sanctions Clearance Protocol (CRITICAL)

**Strict Prohibition:** The "Retry" function is **forbidden** for Sanction Hits.

1. **Hit Detection:** Agent 3 identifies a potential match (OFAC/UN 1267/FIC).
2. **System Pause:** Workflow enters a dedicated `SANCTION_PAUSE` state.
3. **Compliance Review:**
    * The Compliance Officer accesses the **Sanction Clearance Interface**.
    * Officer uses **Deep Links** to compare the applicant against the official watchlist entry.
4. **Adjudication:**
    * **False Positive:** Officer ticks the "Verified False Positive" checkbox, provides a mandatory reason, and signs the digital clearance form. The workflow resumes.
    * **True Positive:** Officer confirms the hit. Workflow executes `Final Termination` and triggers Suspicious Transaction Report (STR) protocols.

### Phase 4: Multi-Agent Analysis & Argumentative Synthesis

The "Reporter Agent" acts as a lead analyst, not a data aggregator.

1. **Parallel Execution:** Agents 1 (Validation), 2 (Risk/Float), and 3 (Sanctions) run concurrently.
2. **Synthesis:** The Reporter Agent consumes these outputs to generate a **Weighted Recommendation**:
    * _Example:_ "Approve with Caution (Confidence: 85%). Strong financials (Agent 2) outweigh minor CIPC data mismatch (Agent 1)."
3. **Pre-filled Audit Log:** The system drafts the approval/denial rationale based on this synthesis for the Risk Manager.

### Phase 5: Human-in-the-Loop & System Learning

1. **Risk Manager Decision:**
    * The Manager reviews the synthesised narrative.
    * **Visual Hierarchy:** Critical red flags are expanded; "All Clear" green sections are collapsed to reduce cognitive load.
2. **Override Logic (The "Why" Modal):**
    * **IF** the Manager disagrees with the AI (e.g., AI says "Deny", Manager says "Approve"):
    * **THEN** the system forces a modal: _"Why are you overriding? \[Context / AI Hallucination / Data Error\]"_.
3. **Feedback Loop:** These decisions and override reasons are logged to generate a "Weekly Agent Agreement Report" to retrain the prompts.
