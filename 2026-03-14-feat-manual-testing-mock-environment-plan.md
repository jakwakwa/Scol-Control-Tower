---
title: "feat: Add feature-flagged manual-testing mock environment"
type: feat
status: active
date: 2026-03-14
---

# feat: Add feature-flagged manual-testing mock environment

## Overview

Add an opt-in manual-testing environment that uses a dedicated seeded mock database and mocked external verification providers while leaving the primary dev database, test database, schema, and existing runtime behavior unchanged by default.

## Problem Statement / Motivation

The repo currently has a primary development database and a separate E2E test database, but no safe third environment for client-facing manual QA with stable seeded data and deterministic provider responses. The new environment must:

- default to off when flags are absent
- isolate all seeded/mock data from the normal dev database
- support local Docker usage and Vercel preview deployments
- keep Gemini calls real while mocking ProcureCheck, ITC bureau-style checks, and FICA verification responses
- avoid any schema or migration changes

## Proposed Solution

- Add a dedicated mock-environment resolver that selects between primary dev DB, E2E test DB, and mock/manual-test DB.
- Gate the mock environment behind two env flags only: `ENABLE_LOCAL_MOCK_ENV` and `ENABLE_DEV_MOCK_ENV`, both defaulting to `false`.
- Introduce `MOCK_DATABASE_URL` for the dedicated manual-testing database. When set in Vercel Preview or Development environments, the app can use an external Postgres instance instead of the local Docker mock DB.
- Add a third Postgres container to `docker-compose.yml` for local manual testing.
- Add idempotent mock database reset and seed scripts that populate realistic applicant, workflow, risk, quote, form, document, and notification data without touching schema.
- Add provider mock adapters for ProcureCheck, ITC, and FICA service boundaries while keeping Gemini-powered AI paths real.
- Update docs and env examples so operators can choose between untouched dev DB behavior and explicit mock/manual-test mode.

## Technical Approach

### Phase 1: Environment Resolution

- [x] Add a shared mock-environment helper that resolves flag state and active database target.
- [x] Refactor database client selection to preserve E2E behavior first, then opt into the mock DB only when the new flags are enabled.
- [x] Keep primary `DATABASE_URL` behavior unchanged when neither flag is set.

### Phase 2: Local Infrastructure and Seed Tooling

- [x] Add a third `mock_db` Postgres container and volume to Docker Compose.
- [x] Add mock DB reset/bootstrap scripts that run migrations against `MOCK_DATABASE_URL` and seed complete manual-testing data.
- [x] Add package scripts for mock DB reset and seed workflows.

### Phase 3: Mock Provider Adapters

- [x] Route ProcureCheck calls through an adapter that returns deterministic mock responses in mock mode.
- [x] Route ITC checks through the same mock-mode gate with realistic seeded outcomes.
- [x] Route FICA verification-style service responses through mock-mode helpers while keeping Gemini analysis paths untouched.

### Phase 4: Docs and Verification

- [x] Update `.env.example`, `.env.test.example`, and `README.md` with the new flags and DB URLs.
- [ ] Verify unchanged default behavior with lint/build.
- [x] Verify seeded mock environment flows with targeted tests or script execution.

## Acceptance Criteria

- [x] When `ENABLE_LOCAL_MOCK_ENV` and `ENABLE_DEV_MOCK_ENV` are absent, the app behaves exactly as it does today.
- [x] The primary dev DB at `DATABASE_URL` remains unseeded and unaffected by mock-environment tooling.
- [x] A third local Postgres container exists for manual-testing seed data.
- [x] The app can use `MOCK_DATABASE_URL` for Vercel preview/development deployments without schema changes.
- [x] ProcureCheck, ITC, and FICA verification calls return deterministic mock responses only in mock mode.
- [x] Gemini-backed calls remain real in all environments.
- [ ] `bun run lint` and `bun run build` pass after the change.

## Dependencies & Risks

- DB target selection is the primary safety risk; the resolver must prioritize E2E isolation and explicit opt-in only.
- Seed data must be idempotent enough for repeated bootstrap runs in the mock DB.
- Existing direct service imports may require a thin adapter layer to avoid broad refactors.

## Test Strategy

- Run targeted unit coverage for environment resolution and mock provider behavior where practical.
- Run mock DB bootstrap scripts against the dedicated mock database only.
- Run `bun run lint`.
- Run `bun run build`.

## References & Research

- Current DB client: `app/utils.ts`
- Current Docker services: `docker-compose.yml`
- Current ITC integration: `lib/services/itc.service.ts`
- Current ProcureCheck integration: `lib/procurecheck.ts`
- Current FICA AI service: `lib/services/fica-ai.service.ts`
- Vercel preview and environment variable docs confirm per-environment and branch-specific DB URLs are supported for Preview and Development deployments.