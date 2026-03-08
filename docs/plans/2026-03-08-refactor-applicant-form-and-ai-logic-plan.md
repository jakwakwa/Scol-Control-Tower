---
title: Refactor Applicant Form and AI Logic
type: refactor
status: active
date: 2026-03-08
---

# Refactoring Applicant Form & AI Service Decoupling

## Overview

Based on the recent Kieran TypeScript code review, this task aims to restructure two critical parts of the application. First, migrating the existing `<ApplicantForm />` component away from manual DOM-state validations towards `react-hook-form` coupled with `@hookform/resolvers/zod`. Second, isolating the hardcoded `callGemini` execution logic from the UI inside `<RiskReviewDetail />` and encapsulating it within a secure Next.js Server Action (`actions/ai.actions.ts`).

## Problem Statement / Motivation


- **Applicant Form**: The component is overly large, mixing purely visual layout with complex state tracking and regex-based input validations. Moving to Hook Form + Zod significantly cuts boilerplate, enforces end-to-end type safety, and conforms to industry standards for scalable React component patterns.
- **AI Logic**: Running raw API fetch logic directly inside a client-side component breaks structural boundaries, complicates unit testing, forces complex state (retries, timeouts) to live in the UI tree, and poses potential security risks depending on how env variables are passed.

## Proposed Solution

1. **Shared Validation Schemas**: Introduce a strongly typed Zod schema in `lib/validations/schemas/applicant.schema.ts` defining the structure of the applicant body.
2. **Form Hook Integration**: Refactor `ApplicantForm` to use `useForm()` parsing the Zod schema and utilizing generic `Form` control patterns mapping to the existing Shadcn UI.
3. **AI Server Action**: Create a new file `actions/ai.actions.ts`. Expose a `generateRiskBriefing` and `analyzeMediaRisk` asynchronous function. Both functions must leverage the existing project SDK provided in `lib/ai/models.ts` (`getGenAIClient()`, `runStructuredInteraction()`, etc.).  These actions should implement a 3-attempt exponential backoff mechanism upon `503` or `429` responses (or rely on `AI_CONFIG.MAX_RETRIES` if applicable) and a strict execution time limit (e.g. 15-20s timeout).
4. **Client API Connection**: Update the `RiskReviewDetail` UI buttons to trigger these Server Actions directly while managing simple loading states on the client.

## Technical Considerations

- Use `react-hook-form` and `@hookform/resolvers/zod` (Verified active dependencies in repo).
- When modifying the form, maintain the current "Test Mode" button implementation safely plugging dummy data via the hook reset/setValue tools.
- AI Server Actions **MUST** utilize `lib/ai/models.ts` instead of directly implementing `fetch` calls. This ensures we adhere to the project's custom wrappers around the standard `@google/genai` SDK and its initialization.
- AI Action timeouts can be handled via standard `AbortController` signals passed to the underlying network request.

## Acceptance Criteria

- [ ] A Zod schema correctly representing the Applicant Form payload exists in `lib/validations/schemas/applicant.schema.ts`.
- [ ] `ApplicantForm` is fully integrated with `react-hook-form`. Forms gracefully reflect validation errors without manually managing `errors` state objects.
- [ ] Zod infers proper types on form submit (i.e. replacing the custom `ApplicantFormData` interface).
- [ ] `actions/ai.actions.ts` securely provides the logic wrapped inside discrete functions, strictly utilizing `lib/ai/models.ts` under the hood.
- [ ] `RiskReviewDetail` has the raw `callGemini` function completely removed and depends solely on imported Server Actions.
- [ ] The AI Server Action natively retries failed operations implicitly behind the scenes.
- [ ] All TypeScript types explicitly clear up any residual `any` castings found in previous edits.
- [ ] Clear all ai slop in the files you changed

## Remove AI Code Slop

Proactively review the specific files modified in this task and remove any AI-generated slop.

### Focus Areas

- Extra comments that are unnecessary or inconsistent with local style
- Defensive checks or try/catch blocks that are abnormal for trusted code paths
- Casts to `any` used only to bypass type issues
- Deeply nested code that should be simplified with early returns
- Other patterns inconsistent with the file and surrounding codebase

### Guardrails

- Keep behavior unchanged unless fixing a clear bug.
- Prefer minimal, focused edits over broad rewrites.

## Dependencies & Risks

- The `RiskReviewDetail` view requires the AI API Key. Ensure the server action has context variables available to cleanly fetch it without crashing locally if undefined (fallback gracefully).
- Test Mode (`fillTestData`) inside the form needs correctly adapting to `hook-form`'s `reset()` API so it doesn't break.

## References & Research

- Shared schema location: `lib/validations/schemas/applicant.schema.ts`
- Target form file: `components/dashboard/applicant-form.tsx`
- Target AI view file: `components/dashboard/risk-review/risk-review-detail.tsx`
- Project core AI utility: `lib/ai/models.ts`
- Brainstorm decision context: `docs/brainstorms/2026-03-08-refactor-applicant-form-and-ai-logic-brainstorm.md`
