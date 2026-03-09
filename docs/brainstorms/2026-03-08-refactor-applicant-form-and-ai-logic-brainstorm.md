---
date: 2026-03-08
topic: refactor-applicant-form-and-ai-logic
---

# Refactoring Applicant Form & AI Service Decoupling

## What We're Building

We are executing a structural refactor on two key areas of the dashboard based on Kieran's TypeScript review suggestions. First, we are overhauling the `<ApplicantForm />` component to use `react-hook-form` coupled with `zod` schema validation for strong type inference and decoupling of validation logic from UI rendering. Second, we are isolating the `callGemini` execution logic currently hardcoded inside the `<RiskReviewDetail />` component by extracting it into a secure Next.js Server Action (`actions/ai.actions.ts`).

## Why This Approach

- **Form Refactor**: The explicit use of `react-hook-form` and `zod` promotes better component reusability, vastly reduces boilerplate DOM-state validations, ensures highly controlled renders, and directly resolves type-safety concerns on API submissions.
- **AI Logic Extraction**: Relying on a Server Action rather than a client-side execution or a route-handler allows the API key to remain completely guarded securely on the server environment. It simplifies the client-side footprint, natively integrates with Next.js architecture, and provides a clear module for future AI integrations that can be easily mocked during unit testing.

## Key Decisions

- **Zod for Validation**: Define a strict Zod schema mirroring the expected applicant payload.
- **Server Action over API Route**: Move `callGemini` into `actions/ai.actions.ts`, ensuring it runs purely on the server and accepts safely typed payloads.
- **Type Safety Checks**: Keep strictly typed interfaces across the `ApplicantForm` schema and the newly created AI Server Action arguments.

## Key Decisions Continued (From Open Questions)

- **Zod Schema Location**: The shared Zod schemas will be placed in `lib/validations/schemas/applicant.schema.ts` to ensure easy referencing and typing from both client form and server routines.
- **AI Server Action Resilience**: We will implement the following resilience layers on the Server Action:
  1. A strict timeout (e.g. 15 seconds) so requests don't hang indefinitely if the API stalls.
  2. Implement an exponential backoff retry mechanism (max 3 attempts) for `503 Service Unavailable` or `429 Too Many Requests` status codes from the Gemini API.
  3. Graceful fallback string returns on hard failures to ensure the dashboard never crashes, simply informing the user the AI service failed.

## Next Steps

→ `/workflows:plan` for implementation details
