1. Gemini Date Grounding (foundational backend fix) 

2. Full migration to document_uploads


3. Explicit UI states for the bank-statement panel, queue, and details screens (Problem 2) 

## Surfacing the full rich FICA validation payload as a supplemental first-class section in the risk-review details screen (turns invisible compliance data into a visible, auditable artifact)

### Sub Agents:
 - Sub Agent A (Backend focus): Owns Gemini Date Grounding + the entire migration (Problem 3) 
- Sub Agent B (Frontend focus): Owns explicit UI states (Problem 2) + FICA enrichment UI (rich payload surfacing)

Overall Order (strict – migration must finish before any UI work)

- Problem 1: Gemini Date Grounding (Sub Agent A) 
- Problem 3: Full migration to document_uploads (Sub Agent A) Problem 2 + Problem 4: Explicit UI states + FICA enrichment UI (Sub Agent B)


## Problem 1: Gemini Date Grounding 

**Goal**: Eliminate hallucinated temporal judgments by giving the AI a deterministic reference date and moving all date math to the server.


1. Update the validation input types in `lib/services/agents/validation.agent.ts` to accept an optional referenceDate. Modify `buildValidationPrompt()` to destructure the reference date and inject it at the top of every prompt with explicit instructions that all date evaluations must use this value only. 

2. Completely rewrite the `DATE VALIDATION` section of the prompt to instruct the model to extract dates only (never evaluate them) and to treat the supplied reference date as the single source of truth for “today”, “within 3 months”, expiry checks, etc. 

3. After parsing the Gemini response, add a server-side sanity check that overrides any remaining hallucinated “future dated” flags when the extracted document date is valid relative to the reference date. 

4. Thread the referenceDate through `validateDocumentsBatch()` and all downstream calls. 

5. In the **Inngest Stage 3 enrichment function**, pass today’s date (in `YYYY-MM-DD`format) when calling the batch validator.

### Verification:

 - Re-run FICA validation against a document dated 2026-02-02 (or any date within the last three months). 
 - Confirm Gemini no longer flags it as future-dated. Confirm the server-side override catches any residual hallucinations.

## Problem 3. Full Migration : Make `document_uploads` the Single Source of Truth 

**Backend:**

**Goal**: Retire the old documents table completely so there is only one canonical place for all documents.

1. Create and test a one-time migration script that safely copies all relevant legacy rows (bank-statement types and any others still in use) from the documents table into document_uploads, mapping columns, types, timestamps, and workflow IDs correctly. Include a dry-run mode. 
2. Execute the migration first on staging, verify data integrity and row counts, then run it on production. Update every write path in the codebase (onboarding uploads, legacy routes, background jobs) to insert exclusively into document_uploads using the new document-type constants. 
3. Update every read path (especially the Stage 4 financial-risk agent) to query document_uploads only; remove every reference to the old documents table and delete all legacy query logic. After QA sign-off, update the database schema and drop or archive the old documents table. Remove its import/schema references from the entire codebase.
4. Verification Bank statements uploaded via any route are stored only in document_uploads. 
5. Stage 4 agent always locates the document and creates a successful ai_analysis_logs row. No code anywhere still references the old documents table.

## Problem 2: Explicit UI States for Bank-Statement Analysis 

**Goal:** The ITC / bank-statement panel, risk-review queue screen, and risk-review details sections must never hide or disappear. Users always see a clear, actionable status.

**Steps**

1. Remove all “latest-log-wins” hiding logic across the three screens so the panel always renders. Implement the four explicit states with consistent styling: Analysis in progress (while job is running) 

2. Analysis unavailable – document unreadable or API timeout (when latest job failed) No bank statement uploaded yet (when no row exists) Success (keep all existing successful analysis cards unchanged) 

3. Update the data-fetch queries on all three screens to retrieve the latest successful analysis while still detecting in-progress and error states. 

4. Add real-time reactivity (React Query / SWR / Inngest listeners) so the panel updates live when new log rows appear.

5. Verification Successful analysis from an hour ago remains visible even if a later background job fails. 

6. Error states show the clear “Analysis unavailable” message instead of a blank panel. All three screens behave identically and update in real time.

## Problem 4: FICA Enrichment UI – Surface Full Rich Validation Payload 

**Goal:** Turn the invisible rich **Stage 3 FICA data** (authenticity flags, date issues, ficaComparison, per-document recommendation, reasoning) stored in riskCheckResults , rawPayload into a visible, auditable supplemental section in the risk-review details screen.

- Extend the report data shape in `lib/risk-review/types.ts` to include the full FICA validation result (summary + array of per-document results). 

- In `build-report-data.ts`, extract the complete raw payload from the FICA entry in riskCheckResults (where checkType === "FICA") and merge it into the report data without altering the existing curated summary. 

- In `fica-section.tsx`, add a new supplemental panel below the existing Document AI Identity Proofing section. Show one card per document type (BANK_STATEMENT_3_MONTH, PROPRIETOR_ID, PROPRIETOR_RESIDENCE). 

- Display authenticity flags, date issues, recommendation badge, FICA comparison summary, and reasoning text. Use the same styling and accordion pattern as the existing fraud-signal cards. 

- The new panel is purely supplemental and does not override or replace any current content.

- Verification Navigate to any risk report that has completed FICA validation. Confirm the new “Document Validation” supplemental section appears with per-document cards containing the full rich payload. 

- Reports without FICA raw payload continue to render exactly as before (no regression).

## **Final Testing & Rollout Checklist (All Sub Agents Together)**

- After Problem 1: Test date grounding end-to-end with future-dated and valid documents.

- After Problem 3: Confirm single source of truth and successful Stage 4 runs for all upload routes. 

- After Problem 2 + Problem 4: Test every UI state and the new FICA panel on all screens; trigger background errors and verify previous successes remain visible. 

- Run full regression of the FICA/risk-review flow. 

### Deploy in strict order: 


- Problem 1 → Problem 3 → Problem 2 + Problem 4. 

- Monitor logs and UI for 24 hours post-deployment.

### Success Criteria:

- Deterministic date validation with zero temporal hallucinations.

- Single canonical document table (document_uploads only). 

- Bank-statement analysis never disappears; users always see clear status. 

- Full rich FICA validation data is now a visible, auditable part of every risk-review details screen.

