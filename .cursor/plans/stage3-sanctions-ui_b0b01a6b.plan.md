---
name: stage3-sanctions-ui
overview: "Plan the next verification-gated slice after the runtime hardening work: make the four Stage 3 risk checks fully independent with `riskCheckResults` as the canonical write target, wire the UN sanctions source as the first live producer for the `SANCTIONS` row, and finish per-section state rendering in the risk review detail UI without any combined AI overview in the critical path."
todos:
  - id: wave1-stage3-canonical
    content: Map each Stage 3 check stream to explicit `riskCheckResults` machine-state transitions and choose the exact write points for PROCUREMENT, ITC, SANCTIONS, and FICA.
    status: completed
  - id: wave2-un-ingress
    content: Design the UN provider -> external sanctions ingress -> SANCTIONS row flow with feature-flag, idempotency, and provenance boundaries.
    status: completed
  - id: wave3-risk-ui
    content: Plan the smallest UI/server-page changes needed to surface sectionStatuses in the risk review detail tabs without expanding scope.
    status: completed
isProject: false
---

# Independent Risk Checks And UN Sanctions

## Goal

Make `PROCUREMENT`, `ITC`, `SANCTIONS`, and `FICA` fully independent Stage 3 streams that each write their own canonical `riskCheckResults` row, then plug the UN sanctions source into that model, then expose those per-section lifecycle states directly in the detail UI. Keep combined AI synthesis and reporter-style rollups out of the critical path.

## Current Ground Truth

- Stage 3 orchestration still writes to mixed legacy targets in `[/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/inngest/functions/control-tower/stages/stage3_enrichment.ts](/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/inngest/functions/control-tower/stages/stage3_enrichment.ts)` and `[/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/inngest/functions/control-tower/helpers.ts](/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/inngest/functions/control-tower/helpers.ts)`, not to `riskCheckResults`.
- The canonical service layer already exists in `[/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/lib/services/risk-check.service.ts](/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/lib/services/risk-check.service.ts)`.
- The UN source is already live-capable in `[/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/lib/services/firecrawl/checks/sanctions-list-un.ts](/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/lib/services/firecrawl/checks/sanctions-list-un.ts)`.
- FICA validation currently exists, but it is buried inside aggregated analysis and does not surface as its own transparent lifecycle row or UI state.
- The current aggregated/reporter path in `[/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/lib/services/agents/aggregated-analysis.service.ts](/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/lib/services/agents/aggregated-analysis.service.ts)` acts as a brittle combined bottleneck and should be removed from gating responsibilities for this slice.
- The detail UI defines `sectionStatuses` but does not render them in `[/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/components/dashboard/risk-review/risk-review-detail.tsx](/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/components/dashboard/risk-review/risk-review-detail.tsx)`, and the server page currently builds report data without risk-check rows in `[/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/app/(authenticated)/dashboard/risk-review/reports/[id]/page.tsx](/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/app/(authenticated)`/dashboard/risk-review/reports/[id]/page.tsx).

## Wave 1: Canonical Stage 3 Writes

- Seed all four rows once per workflow using `ensureRiskChecksExist()` at the workflow entry or earliest guaranteed orchestration boundary in `[/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/inngest/functions/control-tower-workflow.ts](/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/inngest/functions/control-tower-workflow.ts)`.
- Refactor Stage 3 so each check family runs as its own independent `step.run()` and updates only its own `riskCheckResults` row via `[/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/lib/services/risk-check.service.ts](/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/lib/services/risk-check.service.ts)`:
  - `PROCUREMENT` from `[/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/inngest/functions/control-tower/stages/stage3_enrichment.ts](/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/inngest/functions/control-tower/stages/stage3_enrichment.ts)`
  - `ITC` from the same stage file and `[/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/lib/services/itc.service.ts](/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/lib/services/itc.service.ts)`
  - `SANCTIONS` through the shared helper in `[/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/inngest/functions/control-tower/helpers.ts](/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/inngest/functions/control-tower/helpers.ts)`
  - `FICA` with evidence arrival tracked from `[/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/app/api/fica/upload/route.ts](/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/app/api/fica/upload/route.ts)` and final readiness/result written independently from a dedicated FICA validation boundary rather than the aggregated-analysis bottleneck.
- Remove bundled Stage 3 steps such as `run-main-itc-and-sanctions` so machine state transitions remain one-check-at-a-time and retry-safe.
- Remove combined AI/reporter gating from Stage 3. If any legacy `riskAssessments` or `aiAnalysis` writes are kept temporarily, treat them as transitional or derived-only and never as readiness authority.
- Gate progression on the hybrid rule only: all four machine states are terminal and the required human review states are complete.

Essential seam:

```227:236:inngest/functions/control-tower/stages/stage3_enrichment.ts
const [procurementStreamResult, _documentStreamResult] = await Promise.all([
	procurementStream,
	documentStream,
]);
```

```382:505:inngest/functions/control-tower/stages/stage3_enrichment.ts
const itcStep = step.run("run-main-itc-and-sanctions", async () => {
	// ITC and SANCTIONS are still bundled here today.
});
const [itcAndSanctions, aiAnalysisResult] = await Promise.all([itcStep, aiStep]);
```

## Wave 2: UN Sanctions As First Live Producer

- Use `[/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/lib/services/firecrawl/checks/sanctions-list-un.ts](/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/lib/services/firecrawl/checks/sanctions-list-un.ts)` as the first live source and normalize its output into the existing external ingress contract in `[/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/app/api/sanctions/external/route.ts](/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/app/api/sanctions/external/route.ts)`.
- Feature-flag provider activation with `SANCTIONS_ENABLED_PROVIDERS`, enabling only `firecrawl_un` for the first live rollout.
- Change the ingress route so it updates only the `SANCTIONS` row in `riskCheckResults` and records provenance (`provider`, `externalCheckId`, normalized payload, raw payload, error details).
- Preserve the hybrid gate as the only progression authority; do not let the ingress route advance the workflow directly.
- Review compatibility readers like `[/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/app/api/sanctions/route.ts](/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/app/api/sanctions/route.ts)` so adjudication views can see row-based sanctions evidence without depending on old AI-analysis logs as the canonical source.

Essential seam:

```59:75:lib/services/firecrawl/checks/sanctions-list-un.ts
export async function searchUNSanctionsList(
	searchTerms: string[]
): Promise<UNSanctionsSearchResult> {
	// ...
	const result = await agentWithSchema({
		prompt,
		schema: UNSanctionsSearchSchema,
		urls: [UN_CONSOLIDATED_XML_URL],
```

## Wave 3: Risk Review Detail Section States

- Update the server page in `[/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/app/(authenticated)/dashboard/risk-review/reports/[id]/page.tsx](/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/app/(authenticated)`/dashboard/risk-review/reports/[id]/page.tsx) to fetch `riskCheckResults` before calling `buildReportData()`.
- Add small, typed section-level status banners/badges in `[/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/components/dashboard/risk-review/risk-review-detail.tsx](/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/components/dashboard/risk-review/risk-review-detail.tsx)` for `pending`, `in_progress`, `completed`, `failed`, and `manual_required`, plus review-state messaging where relevant.
- Keep this UI scope intentionally narrow: no tab hiding, no large skeleton system, no combined overview, just visible per-section state and sensible placeholder copy when final data is absent.
- Reuse existing badge/status semantics from `[/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/components/dashboard/risk-entities-table.tsx](/Users/jacobkotzee/Projects/REPOS/ai-webapps/sc-onboard-controltower/components/dashboard/risk-entities-table.tsx)` where possible.

Essential seam:

```32:58:components/dashboard/risk-review/risk-review-detail.tsx
export interface RiskReviewData {
	// ...
	sectionStatuses?: {
		procurement: SectionStatus;
		itc: SectionStatus;
		sanctions: SectionStatus;
		fica: SectionStatus;
	};
```

## Verification Gates Per Wave

- Wave 1:
  - Stage 3 creates or updates all four rows deterministically.
  - `PROCUREMENT`, `ITC`, `SANCTIONS`, and `FICA` each have their own independent execution and lifecycle transitions.
  - Risk review APIs continue to read coherent states from `riskCheckResults`.
  - No Stage 3 path depends on legacy applicant status fields, aggregated AI output, or reporter synthesis for correctness.
- Wave 2:
  - A UN sanctions result can be ingested idempotently.
  - The `SANCTIONS` row reflects provider, lifecycle state, and evidence without directly advancing workflow state.
  - Provider flagging cleanly disables the live source when needed.
- Wave 3:
  - The report page receives real section states.
  - Each tab communicates partial progress without breaking when payload data is incomplete.
  - Existing risk review flows remain readable for already-completed workflows without requiring a combined AI overview.

## Suggested Order Of Execution

1. Finish Wave 1 first and verify it in isolation.
2. Layer Wave 2 on top of the canonical SANCTIONS row contract.
3. Finish Wave 3 after the backend contract is stable so the UI is not built on transitional semantics.

