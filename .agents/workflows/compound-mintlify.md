---
description: 
---

# /compound-mintlify

Coordinate multiple subagents working in parallel to document a recently solved problem.

## Purpose

Captures problem solutions while context is fresh, creating structured documentation in `docs/issues/` with YAML frontmatter for searchability and future reference. Uses parallel subagents for maximum efficiency.

**Why "compound"?** Each documented solution compounds our team's knowledge. The first time you solve a problem takes research. Document it, and the next occurrence takes minutes. Knowledge compounds.

## Usage

```bash
/commands:compound-mintlify                    # Document the most recent fix
/commands:compound-mintlify [brief context]    # Provide additional context hint
```

## Execution Strategy: Multi-Phase Orchestration

<critical_requirement>
**Only ONE file gets written - the final documentation.**

Phase 1 subagents return TEXT DATA to the orchestrator. They must NOT use Write, Edit, or create any files. Only the orchestrator (Phase 2) writes the final documentation file.
</critical_requirement>

<critical_requirement>
**Phase 4 (ClickUp wiki) is mandatory** whenever the **`user-clickup`** MCP is available. Do **not** ask the user whether to sync to ClickUp after the workflow; run the **`clickup-wiki-stratcol`** subagent as part of this command. If the MCP is unavailable, report that the wiki step was skipped and include verbatim errors.
</critical_requirement>

<critical_requirement>
If this workflow creates or updates files under `docs/`, you **must** update `docs/docs.json` navigation in the same run so the new page is discoverable in Mintlify.
</critical_requirement>

### Phase 1: Parallel Research

<parallel_tasks>

Launch these subagents IN PARALLEL. Each returns text data to the orchestrator.

#### 1. **Context Analyzer**
   - Extracts conversation history
   - Identifies problem type, component, symptoms
   - Validates against schema
   - Returns: YAML frontmatter skeleton

#### 2. **Solution Extractor**
   - Analyzes all investigation steps
   - Identifies root cause
   - Extracts working solution with code examples
   - Returns: Solution content block

#### 3. **Related Docs Finder**
   - Searches `docs/issues/` for related documentation
   - Identifies cross-references and links
   - Finds related GitHub issues
   - Returns: Links and relationships

#### 4. **Prevention Strategist**
   - Develops prevention strategies
   - Creates best practices guidance
   - Generates test cases if applicable
   - Returns: Prevention/testing content

#### 5. **Category Classifier**
   - Determines optimal `docs/issues/` category
   - Validates category against schema
   - Suggests filename based on slug
   - Returns: Final path and filename

</parallel_tasks>

### Phase 2: Assembly & Write

<sequential_tasks>

**WAIT for all Phase 1 subagents to complete before proceeding.**

The orchestrating agent (main conversation) performs these steps:

1. Collect all text results from Phase 1 subagents
2. Assemble complete markdown file from the collected pieces
3. Validate YAML frontmatter against schema
4. Create directory if needed: `mkdir -p docs/issues/[category]/`
5. Write the SINGLE final file: `docs/issues/[category]/[filename].mdx`
6. Update `docs/docs.json` to include the new page path under the appropriate navigation group (usually `Issues`)
7. Verify `docs/docs.json` contains the new slug/path before moving to later phases

</sequential_tasks>

### Phase 3: Optional Enhancement

**WAIT for Phase 2 to complete before proceeding.**

<parallel_tasks>

Based on problem type, optionally invoke specialized agents to review the documentation:

- **performance_issue** → `performance-oracle`
- **database_issue** → `data-integrity-guardian`
- **inngest_issue** → `inngest-contracts` and `inngest-runtime` subagents
- Any code-heavy issue → `kieran-rails-reviewer` + `code-simplicity-reviewer`

If any reviewer feedback is **applied to the documentation file**, treat that version as the **final** body for Phase 4.

</parallel_tasks>

### Phase 4: StratCol AI Wiki (mandatory)

**WAIT for Phase 2 to complete before proceeding.** If Phase 3 ran and the orchestrator **edited** the written file, **WAIT for those edits** before this phase.

<sequential_tasks>

1. Read the **final** markdown from the path written in Phase 2 (after any Phase 3 edits).
2. Invoke the **`clickup-wiki-stratcol`** subagent (Task tool) with: finalized **content** (or path + contents), **page title** derived from the doc, and a **source** line (`Source: docs/issues/...`).
3. Do **not** prompt “Sync to ClickUp?” — publishing under **Control Tower Wiki ⭐️ → Table of Content → Issues [Compound Docs]** is part of `/compound-mintlify` when MCP works.
4. If **`user-clickup`** is unavailable or the subagent errors, report the failure explicitly; do not pretend the wiki step succeeded.

</sequential_tasks>

## What It Captures

- **Problem symptom**: Exact error messages, observable behavior
- **Investigation steps tried**: What didn't work and why
- **Root cause analysis**: Technical explanation
- **Working solution**: Step-by-step fix with code examples
- **Prevention strategies**: How to avoid in future
- **Cross-references**: Links to related issues and docs

## Preconditions

<preconditions enforcement="advisory">
  <check condition="problem_solved">
    Problem has been solved (not in-progress)
  </check>
  <check condition="solution_verified">
    Solution has been verified working
  </check>
  <check condition="non_trivial">
    Non-trivial problem (not simple typo or obvious error)
  </check>
</preconditions>

## What It Creates

**Organized documentation:**

- File: `docs/issues/[category]/[filename].md`

**Categories auto-detected from problem:**

- build-errors/
- test-failures/
- runtime-errors/
- performance-issues/
- database-issues/
- security-issues/
- ui-bugs/
- integration-issues/
- logic-errors/

## Common Mistakes to Avoid

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| Subagents write files like `context-analysis.md`, `solution-draft.md` | Subagents return text data; orchestrator writes one final file |
| Research and assembly run in parallel | Research completes → then assembly runs |
| Multiple files created during workflow | Single file: `docs/issues/[category]/[filename].md` |
| New docs page is written but missing from Mintlify nav | Update `docs/docs.json` in the same workflow run |
| Asking “Sync to ClickUp?” after the run | Phase 4 runs **`clickup-wiki-stratcol`** automatically when MCP is available |

## Success Output

```
✓ Documentation complete

Subagent Results:
  ✓ Context Analyzer: Identified performance_issue in brief_system
  ✓ Solution Extractor: 3 code fixes
  ✓ Related Docs Finder: 2 related issues
  ✓ Prevention Strategist: Prevention strategies, test suggestions
  ✓ Category Classifier: `performance-issues`

Specialized Agent Reviews (Auto-Triggered):
  ✓ performance-oracle: Validated query optimization approach
  ✓ kieran-rails-reviewer: Code examples meet Rails standards
  ✓ code-simplicity-reviewer: Solution is appropriately minimal
  ✓ mintlify-style-editor: Mintlify Documentation style verified

File created:
- docs/issues/performance-issues/n-plus-one-brief-generation.md

StratCol AI Wiki (Control Tower Wiki ⭐️ → Table of Content → Issues [Compound Docs]):
  ✓ clickup-wiki-stratcol: page_id … (new child page under Issues)

This documentation will be searchable for future reference when similar
issues occur in the Email Processing or Brief System modules.

What's next?
1. Continue workflow (recommended)
2. Link related documentation
3. Update other references
4. View documentation
5. Other
```

## The Compounding Philosophy

This creates a compounding knowledge system:

1. First time you solve "N+1 query in brief generation" → Research (30 min)
2. Document the solution → docs/issues/performance-issues/n-plus-one-briefs.md (5 min)
3. Next time similar issue occurs → Quick lookup (2 min)
4. Knowledge compounds → Team gets smarter

The feedback loop:

```
Build → Test → Find Issue → Research → Improve → Document → Validate → Deploy
    ↑                                                                      ↓
    └──────────────────────────────────────────────────────────────────────┘
```

**Each unit of engineering work should make subsequent units of work easier—not harder.**

## Auto-Invoke

<auto_invoke> <trigger_phrases> - "that worked" - "it's fixed" - "working now" - "problem solved" </trigger_phrases>

<manual_override> Use /commands:compound-mintlify [context] to document immediately without waiting for auto-detection. </manual_override> </auto_invoke>

## Routes To

`compound-docs` skill

## Applicable Specialized Agents

Based on problem type, these agents can enhance documentation:

### Code Quality & Review
- **kieran-rails-reviewer**: Reviews code examples for Rails best practices
- **code-simplicity-reviewer**: Ensures solution code is minimal and clear
- **pattern-recognition-specialist**: Identifies anti-patterns or repeating issues

### Specific Domain Experts
- **performance-oracle**: Analyzes performance_issue category solutions
- **security-sentinel**: Reviews security_issue solutions for vulnerabilities
- **jaco-test-reviewer**: Creates test cases for prevention strategies
- **data-integrity-guardian**: Reviews database_issue migrations and queries

### Enhancement & Documentation
- **best-practices-researcher**: Enriches solution with industry best practices
- **mitlify-style-editor**: Reviews documentation style and clarity

### When to Invoke
- **Auto-triggered** (optional): Agents can run post-documentation for enhancement
- **Manual trigger**: User can invoke agents after /workflows:compound completes for deeper review

### Wiki publish (always with this workflow)
- **`clickup-wiki-stratcol`**: Invoked in **Phase 4** after the doc file is final — not optional when **`user-clickup`** MCP is available (see Phase 4 above).

## Related Workflows
- `/superpowers:writing-plans` - Planning workflow (references documented solutions)
