---
name: vercel-env-preview
description: Add, update, remove, and manage environment variables in Vercel's preview environment using the Vercel CLI. Use when deploying to Vercel preview, configuring preview env vars, syncing env to preview, or when the user mentions Vercel preview environment variables.
---

# Vercel CLI: Preview Environment Variables

Manages environment variables for Vercel's **preview** environment (PR deployments, non-production branches) via the CLI.

## Prerequisites

- Project linked to Vercel: `vercel link` (if not already linked)
- Vercel CLI installed: `bun add -g vercel` or `npm i -g vercel`

## Add Variable to Preview

**Interactive (prompts for value):**
```bash
vercel env add [NAME] preview
```

**From file (recommended for secrets):**
```bash
vercel env add [NAME] preview < path/to/file
```

**From stdin (avoid for secrets; value may appear in shell history):**
```bash
echo "value" | vercel env add [NAME] preview
```

**Branch-specific preview:**
```bash
vercel env add [NAME] preview [git-branch]
```

**Options:**
- `--sensitive` — Hides value in dashboard, adds security
- `--force` — Overwrites existing without confirmation
- `--yes` — Skips confirmation prompts

## Update Existing Variable

```bash
vercel env update [NAME] preview
```

From file:
```bash
cat .env.example | vercel env update MY_VAR preview
```

## List Preview Variables

```bash
vercel env ls preview
```

Branch-specific:
```bash
vercel env ls preview [git-branch]
```

## Remove Variable

```bash
vercel env rm [NAME] preview
```

Use `--yes` to skip confirmation.

## Pull Preview Variables Locally

Download preview env vars to `.env.local`:
```bash
vercel env pull --environment=preview
```

To a specific file:
```bash
vercel env pull .env.preview --environment=preview
```

Branch-specific:
```bash
vercel env pull --environment=preview --git-branch=feature-x
```

## Run Command with Preview Env

Use preview vars without writing to disk:
```bash
vercel env run -e preview -- npm run build
```

## Workflow Checklist

When adding new preview env vars:

- [ ] Ensure project is linked: `vercel link`
- [ ] Add variable: `vercel env add VAR_NAME preview`
- [ ] For secrets, use file input: `vercel env add VAR_NAME preview < .env.secret`
- [ ] Mark sensitive vars: `vercel env add API_KEY preview --sensitive`
- [ ] Redeploy or trigger new preview for changes to apply

## Notes

- Changes apply only to **new** deployments; existing previews keep old values.
- Environment options: `development`, `preview`, `production`.
- Total env vars per deployment: 64 KB limit.
