## Learned User Preferences

- Browser-flow and similar UI verification with agent-browser is required before claiming a feature or fix is done—not optional when the work touches the dashboard or dev server behavior.
- Do not run `git commit` or `git push` unless the user explicitly asks.
- For narrow test-fix or debugging tasks, do not change production application code without explicit permission; prefer tests, scripts, env, or docs unless the user expands scope.
- When editing applicant intake (`app/api/applicants`, applicant forms, validations), treat registration and mandate-related API behavior as contractual unless the user approves a breaking change.

## Learned Workspace Facts

- Cursor agent transcripts for this repo may live under the multi-root workspace project `Users-jakwakwa-Documents-code-workspaces-Scol-Control-Tower-code-workspace` rather than under `Repos/.../Scol-Control-Tower` alone.
- `getDatabaseClient()` uses `TEST_DATABASE_URL` only when `E2E_USE_TEST_DB` equals `1`; Playwright’s web server already sets this for E2E runs.
- Browser-flow automation should target the dedicated stack (`bun run dev:browser-flow` / `setup-browser-flow-dev.sh`): load `.env.test` test DB vars, set `E2E_USE_TEST_DB=1`, default `BROWSER_FLOW_PORT` 3100, and point Inngest dev’s app URL at the same port as Next.
- Browser-flow seeding defaults to the test database via `BROWSER_FLOW_SEED_TARGET=test` in `scripts/seed-browser-flow-test-data.ts` so seeded applicants match the test-backed server (override with `app` only when intentionally seeding the dev database).
- Applicant detail URLs support `?tab=` values `overview`, `documents`, `forms`, `risk`, and `reviews` for automation that needs explicit tab state.
- `/dashboard/risk-review/reports/[id]` uses four client-side primary tabs (Procurement, ITC Credit, Sanctions & AML, FICA / KYC) without URL parameters; capture evidence by clicking each tab and using full-page screenshots.
- Shell scripts under `tests/browser-flow/` share `tests/browser-flow/_lib.sh` for env loading, base URL resolution, viewport sizing, `agent-browser screenshot --full`, Clerk login via `input[name="identifier"]` / `input[name="password"]`, and optional `BROWSER_FLOW_UI_APPROVALS=1` for button-driven Stage 5–6 approvals alongside API assertions.
