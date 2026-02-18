# Product Requirements Document (PRD): Financial Onboarding Orchestration

**Project:** FICA & Facility Onboarding Workflow (Enhanced) **Version:** 3.1.0 **Date:** 15 February 2026 **Author:** Engineering Team **Stack:** TypeScript, Next.js, Inngest, PostgreSQL

## 1\. Introduction

This system automates financial onboarding with a focus on **active intelligence**. It replaces passive wait loops with tiered escalation and replaces data aggregation with "Argumentative Synthesis." It strictly bifurcates technical errors (retries) from legal blocks (sanctions).

## 2\. Functional Requirements

### 2.1. Escalation Logic (Replacing "Zombie Workflows")

* **FR-06 (Tiered Timeout):**
  * Use `step.sleep('7d')` within a loop.
  * **Logic:**
    * `retry_count <= 3`: Send `email_template_polite`.
    * `retry_count == 4`: Trigger event `notify.account_manager` (Task: Phone Call). Change email to `email_template_urgent`.
    * `retry_count == 8`: Transition to `SALVAGE_STATE`.
* **FR-07 (Salvage State):**
  * System waits 48 hours (`step.sleep('48h')`) for an AM Override signal.
  * **IF** signal received: Reset `retry_count` or extend deadline.
  * **ELSE**: Call `workflow.terminate`.

### 2.2. Sanctions Clearance (The "Red" Zone)

* **FR-08 (No Generic Retry):** The Inngest error handler must **catch** `SanctionHitError` and redirect to a specific flow branch, ensuring the standard retry mechanism is bypassed.
* **FR-09 (Clearance UI):**
  * Display side-by-side comparison: Applicant Data vs. Watchlist Data.
  * **Deep Linking:** Provide `<a>` tags linking directly to the source source (e.g., [`treasury.gov/.../id={sanction_id}`](http://treasury.gov/.../id={sanction_id})).
* **FR-10 (Adjudication Form):**
  * Input: `reason_for_clearance` (Text Area, Mandatory).
  * Input: `confirm_false_positive` (Checkbox, Mandatory).
  * Action: `Clear & Resume` or `Confirm Hit & Terminate`.

### 2.3. Reporter Agent (Argumentative Synthesis)

* **FR-11 (Synthesis):**
  * Input: Outputs from Agents 1, 2, and 3.
  * Process: LLM Chain-of-Thought reasoning to weigh conflicting evidence.
  * Output: JSON object containing:
    * `recommendation`: "APPROVE" | "DENY" | "REFER".
    * `confidence_score`: 0-100.
    * `narrative`: A 2-paragraph summary explaining the _why_.
    * `critical_flags`: Array of blocking issues (for UI highlighting).

### 2.4. System Learning Loop

* **FR-12 (Audit Draft):** System must insert the AI's `narrative` into the `risk_decision_notes` field as a draft before the Human opens the file.
* **FR-13 (Override Modal):**
  * **IF** `user_decision` != `ai_recommendation`:
  * **THEN** UI blocks submission until a "Deviation Reason" is selected (Context/Hallucination/Data Error).
* **FR-14 (Prompt Versioning):** Every AI request must log the `prompt_version_id` used at that moment.

## 3\. Data Model Enhancements

### `Applications` Table (Updates)

|
| **Column** | **Type** | **Description** | | `escalation_tier` | Int | Current tier (1=Normal, 2=Manager Alert, 3=Salvage) | | `salvage_deadline` | Timestamp | The 48h cut-off for manual override | | `is_salvaged` | Boolean | If true, prevents future auto-termination |

### `SanctionClearance` Table (New)

| **Column** | **Type** | **Description** | | `id` | UUID | Primary Key | | `application_id` | UUID | FK | | `sanction_list_id` | String | External ID (e.g., "OFAC-12345") | | `cleared_by` | UUID | User ID of Compliance Officer | | `clearance_reason` | Text | Mandatory legal justification | | `is_false_positive` | Boolean | Explicit confirmation |

### `AiAnalysis` Table (Updates)

| **Column** | **Type** | **Description** | | `prompt_version_id` | String | Git hash or SemVer of the prompt used | | `confidence_score` | Int | 0-100 rating of the finding | | `human_override_reason` | Enum | `CONTEXT`, `HALLUCINATION`, `DATA_ERROR` |

## 4\. UI/UX Requirements (Control Tower)

* **Visual Hierarchy:** The React component for the Reporter Agent must default to **Collapsed** for green/pass agents and **Expanded** for red/warn agents.
* **Escalation Tasks:** The Dashboard must have a specific "Call List" view for Account Managers showing files in `escalation_tier >= 2`.
