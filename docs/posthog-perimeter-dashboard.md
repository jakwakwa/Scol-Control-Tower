# PostHog: perimeter validation dashboard

This project emits `perimeter_validation_attempt` with properties `env`, `perimeter_id`, `schema_version`, `result`, `reason_code`, and `sampling_weight`. The dashboard is created in PostHog via API so it is reproducible and versioned with the repo.

## One-time setup

1. **Two different keys (both can live in `.env` / `.env.local`):**
   - **`NEXT_PUBLIC_POSTHOG_KEY`** or **`NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`** — project API key (`phc_…`) for the app (posthog-js capture, flags). The bootstrap script does **not** use this for the REST API.
   - **`POSTHOG_PERSONAL_API_KEY`** — required for this script. In [PostHog](https://us.posthog.com), open **User settings → Personal API keys** and create a key with at least insight write, dashboard write, and query read (`phx_…`). Never commit it.

2. Optional: `POSTHOG_PROJECT_ID` if not using the default (`349918`). If `NEXT_PUBLIC_POSTHOG_HOST` points at the **ingest** host (`https://us.i.posthog.com` or similar), set **`POSTHOG_API_HOST=https://us.posthog.com`** so dashboard API calls hit the app host.

3. Run:

   ```bash
   bun run posthog:perimeter-dashboard
   ```

   The script loads `.env.local` / `.env`, finds or creates a dashboard named **Perimeter validation — Control Tower**, and attaches four insights:

   - **Estimated attempt volume (30d)** — HogQL; pass rows weighted by `sampling_weight`, fail rows count as `1`.
   - **Pass rate by env + perimeter (7d)** — HogQL table (interpret pass rate together with sampling).
   - **Top failure reasons (72h)** — HogQL; failures are unsampled.
   - **Pass vs fail trend** — Trends chart; raw counts (pass line is sampled).

4. Open the printed URL (`…/project/<id>/dashboard/<id>`).

### Re-runs

- If the dashboard already has four insight tiles, the script exits without duplicating. Set `POSTHOG_PERIMETER_FORCE_INSIGHTS=1` to force creating another full set (you may want to delete duplicates in PostHog afterward).

## Feature flag (same project)

Create flag key **`perimeter_validation_config`** (JSON / remote config payload) as described in [inngest-perimeter-validation-rollout.md](./rollout-plans/inngest-perimeter-validation-rollout.md). Target **preview** vs **production** using person properties: the app evaluates flags with `personProperties.deployment_env` derived from `VERCEL_ENV`.

## Alerts

PostHog “subscriptions” are attached to **insights**, not the dashboard shell.

1. Open each insight from the dashboard.  
2. Use **Subscribe** (email, Slack, webhooks per your workspace).  
3. For production-only alerts, duplicate an insight and add a filter `env` = `production`, then subscribe to that copy.

For “new `reason_code` spike”, subscribe to the **Top failure reasons** table insight or add a dedicated HogQL insight grouped by `reason_code` with a shorter window.

---

## LLM analytics (`$ai_generation`)

All five AI agents (validation, risk, sanctions, reporter, financial-risk) route through the centralized `getGenAIClient()` factory in `lib/ai/models.ts`. That factory now wraps `GoogleGenAI` with `@posthog/ai`, which auto-captures a `$ai_generation` event for every `models.generateContent()` call.

### What is captured automatically

| Property | Description |
|---|---|
| `$ai_model` | Model ID (e.g. `gemini-2.5-pro`) |
| `$ai_latency` | Wall-clock time in seconds |
| `$ai_input_tokens` | Prompt token count |
| `$ai_output_tokens` | Completion token count |
| `$ai_total_cost_usd` | Estimated cost (where pricing data exists) |

### Setup summary

1. **Package installed**: `@posthog/ai@7.12.2` (wraps `@google/genai`).
2. **`lib/ai/models.ts`** — import changed from `@google/genai` to `@posthog/ai`; `getOptionalPostHogClient()` passed as `posthog:` option to `GoogleGenAI` constructor.
3. No changes needed to individual agents — they all call `getGenAIClient()` which is now instrumented.

### Viewing LLM traces in PostHog

Navigate to **Product analytics → LLM observability** (or search for `$ai_generation` in Events).

To filter by agent type, add `posthogTraceId` per call. Update `getGenAIClient()` callers to pass:

```typescript
// In each agent — pass workflowId as trace ID
ai.models.generateContent({
  model: getHighStakesModel(),
  contents: [...],
  posthogDistinctId: `workflow-${workflowId}`,
  posthogTraceId: `wf-${workflowId}-risk`,
});
```

### Business events also captured (server-side)

These were added via `captureServerEvent()` in route handlers:

| Event | Route |
|---|---|
| `quote_created` | `POST /api/quotes` |
| `risk_decision_made` | `POST /api/risk-decision/pre` |
| `procurement_decision_made` | `POST /api/risk-decision/procurement` |
| `absa_packet_sent` | `POST /api/workflows/[id]/absa/send` |
| `green_lane_granted` | `POST /api/workflows/[id]/green-lane` |
| `approval_callback_received` | `POST /api/applicants/approval` |

Full event schema is in `.posthog-events.json` at the project root.

## References

- [PostHog API overview](https://posthog.com/docs/api)
- [API queries / HogQL](https://posthog.com/docs/api/queries)
- [PostHog LLM observability](https://posthog.com/docs/ai-engineering/llm-observability)
- [@posthog/ai SDK](https://posthog.com/docs/ai-engineering/llm-observability/node)
