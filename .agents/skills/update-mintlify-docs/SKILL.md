---
name: update-mintlify-docs
description: Update Mintlify documentation when features are created or updated, significant fixes are applied, or bugs are solved. Applies to user-facing and internal changes. Trigger phrases include "update docs", "document this feature", "add to docs", "feature complete", "bug fixed", "fix applied".
---

# Update Mintlify Docs Skill

Use this skill when features have been created or updated, significant fixes have been applied, or bugs have been solved. Keep the Mintlify documentation in sync with the codebase.

## When to Invoke

- **New features:** API endpoints, workflows, UI flows, capabilities, or internal systems added
- **Feature updates:** Behavior changes, new parameters, deprecated options, or architectural changes
- **Significant fixes:** Fixes that correct documented behavior, resolve bugs, or change how the system works (user-facing or internal)
- **Bug resolutions:** Bugs that affect documented flows, internal behavior, or require changes to how the system is used or integrated

## Doc Structure

Docs live in `docs/` with `docs.json` as the navigation config:

- **User guides:** `user-guides/*.mdx` — workflows, applicants, risk-review, agents, etc.
- **API reference:** `api-reference/endpoint/*.mdx` — Control Tower API; `api-reference/external_apis/*` — external APIs (e.g. ProcureCheck)
- **Project:** `project/*.mdx` — exec summary, changelogs, testing
- **Agent contracts:** `agent-contracts/*.mdx` — AI agent contracts
- **Issues:** `issues/*.mdx` — design docs, plans

## Mintlify Standards

- **Frontmatter:** `title`, `description` on every page
- **Components:** Use `<Segment>`, `<SegmentTitle>`, `<SegmentDescription>` for endpoints; `<ParamField>` for request bodies
- **Style:** Second person, active voice, skimmable (headlines, bullets, short paragraphs)
- **No manual TOC:** Mintlify generates sidebar from `docs.json`

## Update Checklist

1. **Identify affected docs** — Which user guide, API page, or project doc is impacted?
2. **Create or update content** — Add new sections, update existing copy, fix outdated examples
3. **Register new pages** — Add entries to `docs.json` under the correct group
4. **Verify locally** — Run `bun run docs:dev` and open http://localhost:8001

## Common Updates

| Change type | Doc location | Action |
|-------------|--------------|--------|
| New API endpoint | `api-reference/endpoint/*.mdx` | Add `<Segment>` block; add `<ParamField>` for body params |
| New user flow | `user-guides/*.mdx` | Add or update section; link from overview if needed |
| Workflow change | `user-guides/workflows.mdx` | Update stage/step descriptions |
| External API | `api-reference/external_apis/*` | Add new MDX; add group/page in `docs.json` |
| Changelog | `project/changelog-*.mdx` | Add entry with date and changes |
| Bug fix or internal change | Relevant page | Correct inaccurate steps, examples, or behavior; document new internal flows |

## Commands

```bash
# Preview docs locally (port 8001)
bun run docs:dev
```

Docs use an isolated `docs/package.json` to avoid dependency conflicts with the main app.

## Usage Guidelines for Agents

- Invoke this skill proactively after implementing features or fixes that change behavior (user-facing or internal)
- Prefer updating existing pages over creating new ones when content fits
- Keep `docs.json` navigation consistent with existing group structure
- Run `bun run docs:dev` to confirm changes render correctly before finishing
