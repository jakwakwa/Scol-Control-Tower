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

## References

- [PostHog API overview](https://posthog.com/docs/api)  
- [API queries / HogQL](https://posthog.com/docs/api/queries)
