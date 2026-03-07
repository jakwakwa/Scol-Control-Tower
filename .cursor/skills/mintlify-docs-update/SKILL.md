---
name: mintlify-docs-update
description: Add or update completed work in the Mintlify documentation at docs/. Use when features are done, APIs change, contracts are finalized, or user guides need updates. Triggers on "document this", "add to docs", "update mintlify", "docs for [feature]", or after completing implementation work.
disable-model-invocation: true
allowed-tools: Read, Write, StrReplace, Grep, Glob
---

# Mintlify Docs Update

Add or update completed work in the StratCol Control Tower Mintlify documentation.

## Quick Start

1. **Identify scope**: New page vs update existing vs navigation change
2. **Match content type** to the right folder and format
3. **Update `docs/docs.json`** if adding a new page or section
4. **Verify** with `mint dev` (run from `docs/`)

## Docs Structure

```
docs/
├── docs.json              # Navigation, theme, config (MUST update when adding pages)
├── user-guides/           # User-facing guides (.mdx)
├── api-reference/        # API docs (.mdx)
│   ├── introduction.mdx
│   └── endpoint/          # Per-endpoint pages
├── agent-contracts/       # Technical specs, contracts (.md)
├── solutions/             # Logic/architecture solutions (.md)
├── project/               # Project-level docs (.mdx)
└── snippets/              # Reusable MDX snippets
```

## Page Types and Conventions

### User guides (`user-guides/*.mdx`)

- **When**: New user-facing feature, workflow, or capability
- **Frontmatter**:
  ```yaml
  ---
  title: "Page title"
  description: "Brief description for SEO and nav."
  ---
  ```
- **Content**: Clear headings, bullet lists, links to related guides
- **Example**: `docs/user-guides/overview.mdx`

### API reference (`api-reference/endpoint/*.mdx`)

- **When**: New endpoint, changed request/response, auth changes
- **Frontmatter**:
  ```yaml
  ---
  title: 'Endpoint name'
  description: 'What it does'
  api: 'METHOD /path'   # Optional, for API playground
  ---
  ```
- **Content**: Base URL, auth, request/response examples, error handling
- **Example**: `docs/api-reference/endpoint/applicants.mdx`

### Agent contracts (`agent-contracts/*.md`)

- **When**: New or updated agent contracts, check specs, external integrations
- **Format**: Markdown (no MDX required)
- **Content**: Tables, TypeScript snippets, mermaid diagrams
- **Example**: `docs/agent-contracts/firecrawl-check-contracts.md`

### Solutions / project (`solutions/*.md`, `project/*.mdx`)

- **When**: Architecture decisions, logic fixes, testing notes
- **Format**: Markdown or MDX depending on needs

## Workflow: Add New Page

### Step 1: Create the page file

- Choose folder: `user-guides/`, `api-reference/endpoint/`, `agent-contracts/`, etc.
- Use `.mdx` for user-facing or API docs, `.md` for contracts/solutions
- Add YAML frontmatter with `title` and `description`

### Step 2: Update `docs/docs.json` navigation

Navigation is defined in `docs.json` under `navigation.dropdowns[].groups[].pages`. Add the new page path **without** extension:

```json
"pages": [
  "user-guides/existing-page",
  "user-guides/new-page"   // Add here
]
```

Path format: `folder/subfolder/filename` (no `.mdx` or `.md`)

### Step 3: Link from related pages

Add cross-references where relevant, e.g.:

```md
For details, see [New feature](/user-guides/new-page).
```

## Workflow: Update Existing Page

1. **Read** the current page to preserve structure and tone
2. **Update** only the sections that changed
3. **Preserve** frontmatter; adjust `description` if the page purpose changed
4. **Check** internal links still resolve

## Workflow: Add New Section to Navigation

Add a new group under a dropdown in `docs.json`:

```json
{
  "group": "Section name",
  "pages": ["path/to/page1", "path/to/page2"]
}
```

## Mintlify Conventions

- **Frontmatter**: `title`, `description` required; `sidebarTitle`, `icon`, `tag`, `hidden`, `noindex` optional
- **Mode**: Default layout unless `mode: "wide"` or `mode: "center"` for special layouts
- **Links**: Use `[text](/path)` format; paths are relative to docs root
- **Code blocks**: Use ` ```bash `, ` ```json `, ` ```ts ` with language tags

## Success Criteria

- [ ] New/updated pages have correct frontmatter
- [ ] `docs.json` navigation includes new pages
- [ ] No broken internal links
- [ ] Content matches completed work (no placeholders)
- [ ] `mint dev` runs without errors (if `mint` CLI available)

## Reference Files

- `docs/docs.json` – Navigation and config
- `docs/user-guides/overview.mdx` – User guide example
- `docs/api-reference/introduction.mdx` – API intro example
- `docs/agent-contracts/firecrawl-check-contracts.md` – Contract example
