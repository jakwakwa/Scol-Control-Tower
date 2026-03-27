---
title: "refactor: Add Stratcol logo to external magic-link forms"
type: refactor
status: active
date: 2026-03-27
---

# refactor: Add Stratcol logo to external magic-link forms

## Overview

External applicants receive tokenised magic links that open forms for facility applications, document uploads, and contract signing. These pages currently have no Stratcol branding — only a text title and description. Adding the Stratcol logo establishes trust and professionalism for external users.

## Problem Frame

When an applicant clicks a magic link they land on a plain page with no visual identity. There is no logo or brand mark to reassure them they are on a legitimate Stratcol page. Internal staff see the logo everywhere in the dashboard; external applicants see none of it.

## Requirements Trace

- R1. The Stratcol logo must appear on all external token-based form pages (facility application, document uploads, agreement/contract).
- R2. The logo must appear on status/error screens shown to external users (link invalid, link expired, contract submitted, etc.).
- R3. Logo presentation must be consistent across all external surfaces.

## Scope Boundaries

- This change is limited to external-facing components; internal dashboard components are not touched.
- No changes to Clerk-hosted sign-in/sign-up pages (those are hosted by Clerk and require Clerk appearance API, which is a separate task).
- No layout restructuring — only logo insertion into existing header/card areas.

## Context & Research

### Relevant Code and Patterns

- **`ExternalFormShell`** (`components/forms/external/external-form-shell.tsx`) — wraps all external form pages via `FormShell`. Contains an `.externalHero` header that renders only a `<h1>` title and description. This is the single point of entry for `forms/[token]` and `uploads/[token]`.
- **`FormShell`** (`components/forms/form-shell.tsx`) — thin wrapper that delegates to `ExternalFormShell`; no modification needed here.
- **`ExternalStatusCard`** (`components/forms/external/external-status-card.tsx`) — standalone card used for agreement success/error states and form link-invalid/expired states. Has its own `successCard` layout with no logo.
- **`AgreementForm`** (`app/(unauthenticated)/agreement/[token]/agreement-form.tsx`) — the agreement/contract page uses its own heading block (`STRATCOL AGREEMENT` h1 + company details). Does not go through `ExternalFormShell`. Has a `submitted` state that renders `ExternalStatusCard`.
- **Logo assets in `public/`:**
  - `stratcol-corporate-logo-external.svg` (35 KB SVG, named explicitly for external use)
  - `control_tower_logo.png` (4.3 MB PNG — too heavy for public pages)
  - `control_tower_logo1.svg` (lightweight SVG alternative)
- **Existing logo usage pattern** (from `components/landing/hero.tsx`): Next.js `<Image>` component, `src="/control_tower_logo.png"`, dimensions 400×135, `className="h-26 w-auto"`, `priority` prop.

### Institutional Learnings

- No directly relevant `docs/solutions/` entries for logo/branding work.

## Key Technical Decisions

- **Use `stratcol-corporate-logo-external.svg`**: Named explicitly for external contexts; SVG is lightweight and resolution-independent — appropriate for external applicant-facing pages where bandwidth matters.
- **Use Next.js `<Image>` component**: Consistent with the landing hero pattern; provides automatic optimisation and lazy loading. Since all these pages are Server Components (or RSC-rendered shells), `<Image>` works without any client boundary.
- **Add logo to `ExternalFormShell` header only** (not `FormShell`): `ExternalFormShell` is the canonical shell for all external forms. Adding the logo there covers the two main external page types (forms and uploads) without touching intermediate wrappers.
- **Add logo to `ExternalStatusCard`** separately: It has its own isolated layout and is rendered independently of `ExternalFormShell` (used directly on the agreement page and by agreement error/success states).
- **Add logo to `AgreementForm` header**: The agreement page bypasses `ExternalFormShell` entirely — it renders its own heading block. The logo should appear above the `STRATCOL AGREEMENT` heading.

## Open Questions

### Resolved During Planning

- **Which logo file?** `stratcol-corporate-logo-external.svg` — it is specifically named for external use and SVG is optimal for public-facing pages.
- **Where exactly in `ExternalFormShell`?** Above the `<h1>` inside `.externalHero`, matching the visual hierarchy of title-below-logo used in the landing hero.
- **Where in `ExternalStatusCard`?** Above the status icon circle, so the brand mark anchors the top of the card before the result icon.
- **Where in `AgreementForm`?** Above the `STRATCOL AGREEMENT` h1 in the existing heading block.

### Deferred to Implementation

- Exact pixel dimensions for the logo within each surface — implementer should choose values that look balanced (roughly 120–180 px wide) and verify visually.
- Whether `priority` prop is appropriate for the status card (likely not needed since it is below the fold on agreement pages).

## Implementation Units

- [ ] **Unit 1: Add logo to `ExternalFormShell` and `ExternalStatusCard`**

**Goal:** Add the Stratcol logo to the two shared external-facing shell components so all external forms and status screens show branding.

**Requirements:** R1, R2, R3

**Dependencies:** None

**Files:**
- Modify: `components/forms/external/external-form-shell.tsx`
- Modify: `components/forms/external/external-status-card.tsx`

**Approach:**
- In `ExternalFormShell`: import Next.js `Image` and render `<Image src="/stratcol-corporate-logo-external.svg" …>` as the first child of the `.externalHero` `<header>`, before the `<h1>`.
- In `ExternalStatusCard`: render the same `<Image>` above the `.statusIcon` circle, centred with `mx-auto block`.
- Sizing: `h-auto w-auto` with explicit `width` and `height` props on `<Image>` in the 140–180 px range (implementer to verify visually).

**Patterns to follow:**
- `components/landing/hero.tsx` — Next.js `Image` usage pattern, `priority`, `h-26 w-auto` sizing convention.
- `components/emails/EmailLayout.tsx` — centred logo approach with margin classes.

**Test scenarios:**
- Navigate to a valid `forms/[token]` URL — logo appears above the form title.
- Navigate to a valid `uploads/[token]` URL — logo appears above the upload title.
- Navigate to an expired or invalid `forms/[token]` URL — logo appears on the error shell above the "Form link invalid" heading.
- Navigate to a submitted agreement URL — logo appears in the `ExternalStatusCard` above the success icon.

**Verification:**
- Logo renders at the top of every external form page and every status card without layout overflow or broken image.
- No console errors for missing image src.

---

- [ ] **Unit 2: Add logo to `AgreementForm` header**

**Goal:** Add the Stratcol logo to the agreement/contract page, which bypasses `ExternalFormShell` and renders its own heading.

**Requirements:** R1, R3

**Dependencies:** Unit 1 (establishes the logo pattern)

**Files:**
- Modify: `app/(unauthenticated)/agreement/[token]/agreement-form.tsx`

**Approach:**
- In the existing heading block (the `<div className="mb-6 …">` that contains `STRATCOL AGREEMENT`), add the `<Image>` as the first element, before the `<h1>`.
- This is a client component (`"use client"`), so `next/image` is still available — no change needed.

**Patterns to follow:**
- Unit 1 logo implementation in `ExternalFormShell`.

**Test scenarios:**
- Navigate to a valid `agreement/[token]` URL — logo appears above the "STRATCOL AGREEMENT" heading.
- Submit the agreement — `ExternalStatusCard` (already updated in Unit 1) shows the logo on the success screen.

**Verification:**
- Logo is visible at the top of the agreement form above the company heading block.
- Success and error state cards show logo (covered by Unit 1).

## System-Wide Impact

- **Interaction graph:** Only three component files are touched. No API routes, server actions, database, or Inngest functions are affected.
- **Error propagation:** N/A — purely presentational change.
- **Integration coverage:** Browser-flow tests (stages 1–6) pass through external forms; visual inspection of those pages post-change is the main verification path.

## Risks & Dependencies

- The `stratcol-corporate-logo-external.svg` file is currently present in `public/` but was recently deleted from the git index (appears in `git status` as `D public/control_tower_logo.svg`). Confirm the SVG file is present on disk before implementation begins. If it has been removed, use `control_tower_logo1.svg` as a fallback or restore the file.
- `ExternalFormShell` does not currently import Next.js `Image` — the import must be added.
- `AgreementForm` is a client component; `next/image` works in client components, but confirm no SSR/hydration issues if the image is above the fold on first render.

## Sources & References

- Related code: `components/forms/external/external-form-shell.tsx`
- Related code: `components/forms/external/external-status-card.tsx`
- Related code: `app/(unauthenticated)/agreement/[token]/agreement-form.tsx`
- Logo pattern reference: `components/landing/hero.tsx`
- Logo assets: `public/stratcol-corporate-logo-external.svg`, `public/control_tower_logo1.svg`
