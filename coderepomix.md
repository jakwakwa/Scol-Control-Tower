This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.
The content has been processed where comments have been removed, empty lines have been removed, content has been compressed (code blocks are separated by ⋮---- delimiter), security check has been disabled.

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

# Directory Structure
```
.claude/
  skills/
    inngest
.github/
  dependabot.yml
app/
  (authenticated)/
    dashboard/
      agents/
        page.tsx
      applicants/
        [id]/
          contract/
            content.ts
            contract-review-client.tsx
            page.tsx
          quote/
            page.tsx
          page.tsx
        new/
          page.tsx
        page.tsx
      applications/
        [id]/
          forms/
            [formType]/
              page.tsx
            page.tsx
      notifications/
        page.tsx
      risk-review/
        page.tsx
      sanctions/
        page.tsx
      workflows/
        [id]/
          page.tsx
        page.tsx
      layout.tsx
      page.tsx
    header.tsx
    layout.tsx
    user-button.tsx
  (unauthenticated)/
    agreement/
      [token]/
        _components/
          form-signature-box.tsx
          form-term-box.tsx
        agreement-form.css
        agreement-form.tsx
        contract-form.css
        page.tsx
      layout.tsx
    dev/
      forms/
        page.tsx
    forms/
      [token]/
        content.ts
        form-view.tsx
        page.tsx
    sign-in/
      [[...sign-in]]/
        page.tsx
    sign-up/
      [[...sign-up]]/
        page.tsx
    uploads/
      [token]/
        page.tsx
        upload-view.tsx
    layout.tsx
  api/
    applicants/
      [id]/
        route.ts
      approval/
        route.ts
      route.ts
    callbacks/
      quotes/
        route.ts
    contract/
      review/
        route.ts
    dev/
      forms/
        generate-token/
          route.ts
    documents/
      download/
        route.ts
      upload/
        route.ts
    fica/
      upload/
        route.ts
    forms/
      [token]/
        decision/
          route.ts
        quote/
          route.ts
      submit/
        route.ts
    inngest/
      route.ts
    notifications/
      [id]/
        route.ts
      clear-all/
        route.ts
      mark-all-read/
        route.ts
    onboarding/
      approve/
        route.ts
      documents/
        [id]/
          route.ts
        upload/
          route.ts
      forms/
        [workflowId]/
          [formType]/
            route.ts
    quotes/
      [id]/
        approve/
          route.ts
        reject/
          route.ts
        route.ts
      route.ts
    risk-decision/
      pre/
        route.ts
      procurement/
        route.ts
      route.ts
    risk-review/
      route.ts
    sanctions/
      route.ts
    test/
      state-lock-collision/
        route.ts
    webhooks/
      contract-signed/
        route.ts
      lead-capture/
        route.ts
    workflows/
      [id]/
        absa/
          mock/
            route.ts
        contract/
          review/
            route.ts
        financial-statements/
          confirm/
            route.ts
        kill-switch/
          route.ts
        reject/
          route.ts
        resolve-error/
          route.ts
        signal/
          route.ts
      route.ts
  webhooks/
    clerk/
      route.ts
  globals.css
  layout.tsx
  page.tsx
  utils.ts
components/
  dashboard/
    risk-review/
      index.ts
      risk-review-detail.tsx
      risk-review-queue.tsx
    sanctions/
      sanction-adjudication.tsx
    activity-feed.tsx
    agent-status-card.tsx
    applicant-form.tsx
    applicants-table.tsx
    dashboard-layout.tsx
    dashboard-shell.tsx
    dynamic-components.tsx
    final-approval-card.tsx
    index.ts
    notifications-panel.tsx
    page-meta.tsx
    parallel-branch-status.tsx
    pipeline-view.tsx
    quote-approval-form.tsx
    sidebar.tsx
    skeleton-loaders.tsx
    stats-card.tsx
    workflow-progress-stepper.tsx
    workflow-table.tsx
  emails/
    ApplicantFormLinks.tsx
    EmailLayout.tsx
    InternalAlert.tsx
  forms/
    external/
      external-form-field.tsx
      external-form-section.tsx
      external-form-shell.tsx
      external-form-theme.module.css
      external-status-card.tsx
    decision-actions.tsx
    form-fields.tsx
    form-renderer.tsx
    form-shell.tsx
    form-status-message.tsx
    types.ts
  landing/
    features.tsx
    footer.tsx
    hero.tsx
    old-vs-new.tsx
    role-tabs.tsx
    technical-trust.tsx
    trusted-by.tsx
    workflow-steps.tsx
  layout/
    dotted-grid-height-sync.tsx
  onboarding-forms/
    absa-6995/
      index.tsx
    facility-application/
      index.tsx
    fica-upload/
      index.tsx
    stratcol-agreement/
      index.tsx
    form-wizard.tsx
    index.ts
    signature-canvas.tsx
  ui/
    alert-dialog.tsx
    badge.tsx
    button.tsx
    card.tsx
    checkbox.tsx
    combobox.tsx
    data-source-badge.tsx
    data-table.tsx
    dialog.tsx
    dropdown-menu.tsx
    field.tsx
    input-group.tsx
    input.tsx
    label.tsx
    popover.tsx
    select.tsx
    separator.tsx
    sheet.tsx
    status-badge.tsx
    table.tsx
    tabs.tsx
    textarea.tsx
config/
  document-requirements.ts
  mandates.ts
  navigation.ts
db/
  schema.ts
e2e/
  fixtures/
    auth.fixture.ts
    database.fixture.ts
    index.ts
  pages/
    dashboard.page.ts
  tests/
    auth/
      my-test.spec.ts
    dashboard/
      navigation.spec.ts
      new-applicant.spec.ts
    workflow/
      sop-stages.spec.ts
    app.spec.ts
    global.setup.ts
  .gitignore
inngest/
  data/
    mock_blacklist.json
  functions/
    control-tower-workflow.ts
    document-aggregator.ts
  steps/
    database.ts
  client.ts
  events.ts
  index.ts
lib/
  actions/
    workflow.actions.ts
  ai/
    models.ts
  auth/
    api-auth.ts
  constants/
    override-taxonomy.ts
  services/
    agents/
      contracts/
        firecrawl-check.contracts.ts
      aggregated-analysis.service.ts
      index.ts
      reporter.agent.ts
      risk.agent.ts
      sanctions.agent.ts
      validation.agent.ts
    firecrawl/
      checks/
        industry-regulator.check.ts
        sanctions-enrichment.check.ts
        sanctions-list-fic.ts
        sanctions-list-ofac.ts
        sanctions-list-search.ts
        sanctions-list-un.ts
        social-reputation.check.ts
      firecrawl.client.ts
      index.ts
      provider-registry.ts
    agent-stats.ts
    divergence.service.ts
    document-quality.service.ts
    document-requirements.service.ts
    email.service.tsx
    experian.types.ts
    fica-ai.service.ts
    form-link.service.ts
    form.service.ts
    itc.service.ts
    kill-switch.service.ts
    notification-events.service.ts
    notification.service.ts
    pdf-extract.service.ts
    quote.service.ts
    reporting.service.ts
    risk.service.ts
    state-lock.service.ts
    v24.service.ts
    workflow.service.ts
  validations/
    onboarding/
      absa-6995.ts
      common.ts
      facility-application.ts
      fica-documents.ts
      index.ts
      stratcol-agreement.ts
    forms.ts
    inngest-events.ts
    quotes.ts
  dashboard-store.ts
  procurecheck.ts
  types.ts
  utils.ts
  validations.ts
tests/
  decision-contracts.test.ts
  inngest-events-validation.test.ts
.env.example
.gitignore
components.json
drizzle.config.ts
envConfig.ts
next.config.mjs
package.json
playwright.config.ts
postcss.config.mjs
proxy.ts
tailwind.config.ts
tsconfig.json
```

# Files

## File: .claude/skills/inngest
```
../../.agents/skills/inngest
```

## File: .github/dependabot.yml
```yaml
version: 2
updates:
  - package-ecosystem: "bun"
    directory: "/"
    schedule:
      interval: "weekly"
    exclude-paths:
      - "vendor/**"
```

## File: app/(authenticated)/dashboard/agents/page.tsx
```typescript
import {
	RiAlertLine,
	RiCheckDoubleLine,
	RiRobot2Line,
	RiTimeLine,
} from "@remixicon/react";
import {
	AgentStatusCard,
	DashboardGrid,
	DashboardLayout,
	DashboardSection,
	StatsCard,
} from "@/components/dashboard";
import type { WorkflowNotification } from "@/components/dashboard/notifications-panel";
import { getQuoteAgentStats, getRiskAgentStats } from "@/lib/services/agent-stats";
```

## File: app/(authenticated)/dashboard/applicants/[id]/contract/content.ts
```typescript

```

## File: app/(authenticated)/dashboard/applicants/[id]/contract/contract-review-client.tsx
```typescript
import {
	RiArrowLeftLine,
	RiCheckLine,
	RiLoader4Line,
	RiSendPlaneLine,
} from "@remixicon/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DashboardLayout, GlassCard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { contractReviewContent } from "./content";
interface ApplicantSummary {
	id: number;
	companyName: string;
	registrationNumber?: string | null;
}
interface WorkflowSummary {
	id: number;
	stage?: number | null;
	status?: string | null;
}
interface ApplicantPayload {
	applicant: ApplicantSummary;
	workflow: WorkflowSummary | null;
}
type ActionLoadingState = "contract-review" | "absa-mock" | null;
interface ContractReviewClientProps {
	applicantId: string;
}
const ContractReviewClient = (
⋮----
const load = async () =>
⋮----
const handleContractDraftReviewed = async () =>
const handleMockAbsaSend = async () =>
```

## File: app/(authenticated)/dashboard/applicants/[id]/contract/page.tsx
```typescript
import ContractReviewClient from "./contract-review-client";
export default async function ApplicantAgreementContractPage({
	params,
}: {
	params: Promise<{ id: string }>;
})
```

## File: app/(authenticated)/dashboard/applicants/[id]/quote/page.tsx
```typescript
import { redirect } from "next/navigation";
export default async function ApplicantQuotePage({
	params,
}: {
	params: Promise<{ id: string }>;
})
```

## File: app/(authenticated)/dashboard/applicants/[id]/page.tsx
```typescript
import {
	RiAi,
	RiBuildingLine,
	RiCheckLine,
	RiCloseLine,
	RiDownloadLine,
	RiEditLine,
	RiFileTextLine,
	RiHashtag,
	RiLoader4Line,
	RiMailLine,
	RiMoneyDollarCircleLine,
	RiPencilLine,
	RiPhoneLine,
	RiSave3Line,
	RiShieldCheckLine,
	RiUploadCloud2Line,
} from "@remixicon/react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DashboardLayout, GlassCard } from "@/components/dashboard";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RiskBadge, StageBadge, StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { retryFacilitySubmission } from "@/lib/actions/workflow.actions";
interface ApplicantDetail {
	id: number;
	companyName: string;
	tradingName?: string | null;
	registrationNumber?: string | null;
	contactName: string;
	email: string;
	phone?: string | null;
	industry?: string | null;
	mandateType?: string | null;
	mandateVolume?: number | null;
	estimatedTransactionsPerMonth?: number | null;
	status: string;
	riskLevel?: string | null;
	itcScore?: number | null;
	sanctionStatus?: "clear" | "flagged" | "confirmed_hit" | null;
	accountExecutive?: string | null;
	createdAt?: string | number | Date | null;
}
interface ApplicantDocument {
	id: number;
	type: string;
	fileName?: string | null;
	status: string;
	uploadedAt?: string | number | Date | null;
	storageUrl?: string | null;
}
interface ApplicantFormSubmission {
	id: number;
	formType: string;
	data?: string | null;
	submittedAt?: string | number | Date | null;
	submittedBy?: string | null;
}
interface ApplicantFormInstance {
	id: number;
	formType: string;
	status: string;
	submittedAt?: string | number | Date | null;
	token?: string | null;
}
interface RiskAssessment {
	id: number;
	overallRisk?: string | null;
	cashFlowConsistency?: string | null;
	dishonouredPayments?: number | null;
	averageDailyBalance?: number | null;
	accountMatchVerified?: string | null;
	letterheadVerified?: string | null;
	aiAnalysis?: string | null;
	reviewedBy?: string | null;
	reviewedAt?: string | number | Date | null;
	notes?: string | null;
}
interface Quote {
	id: number;
	amount: number;
	baseFeePercent: number;
	adjustedFeePercent?: number | null;
	details?: string | null;
	rationale?: string | null;
	status: string;
	generatedBy: string;
	createdAt?: string | number | Date | null;
}
interface Workflow {
	id: number;
	stage?: number | null;
	status?: string | null;
	salesEvaluationStatus?: string | null;
	salesIssuesSummary?: string | null;
	issueFlaggedBy?: string | null;
	preRiskRequired?: number | boolean | null;
	preRiskOutcome?: string | null;
	applicantDecisionOutcome?: string | null;
	applicantDeclineReason?: string | null;
}
interface SanctionsCheckSnapshot {
	source: string;
	reused: boolean;
	checkedAt: string | null;
	riskLevel: string | null;
	isBlocked: boolean | null;
}
const formatDate = (value?: string | number | Date | null) =>
const formatDateTime = (value?: string | number | Date | null) =>
export default function ApplicantDetailPage()
⋮----
// Confirmation dialog state
⋮----
// Initialize edit values when quote loads or edit mode is enabled
⋮----
const handleSaveQuoteDraft = async () =>
const handleSaveAndApprove = async () =>
const handleDeclineQuote = async () =>
const handleApproveQuote = async () =>
const handleCopyMagicLink = async (instance: ApplicantFormInstance) =>
const handleRetrySubmission = async () =>
const handleFinancialStatementsConfirmed = async () =>
const handleKillSwitch = async () =>
const handleDownloadDocument = (doc: ApplicantDocument) =>
⋮----
const handlePreRiskDecision = async (outcome: "APPROVED" | "REJECTED") =>
⋮----
const fetchApplicant = async () =>
```

## File: app/(authenticated)/dashboard/applicants/new/page.tsx
```typescript
import { DashboardLayout } from "@/components/dashboard";
import { ApplicantForm } from "@/components/dashboard/applicant-form";
export default function NewApplicantPage()
```

## File: app/(authenticated)/dashboard/applicants/page.tsx
```typescript
import { RiUserAddLine } from "@remixicon/react";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { getDatabaseClient } from "@/app/utils";
import { DashboardLayout, DashboardSection } from "@/components/dashboard";
import {
	type ApplicantRow,
	ApplicantsTable,
} from "@/components/dashboard/applicants-table";
import { Button } from "@/components/ui/button";
import { applicants, quotes, workflows } from "@/db/schema";
import { cn } from "@/lib/utils";
⋮----
export default async function ApplicantsPage()
```

## File: app/(authenticated)/dashboard/applications/[id]/forms/[formType]/page.tsx
```typescript
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RiArrowLeftLine, RiLoader4Line } from "@remixicon/react";
import { DashboardLayout } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import {
	StratcolAgreementForm,
	FacilityApplicationForm,
	Absa6995Form,
	FicaUploadForm,
} from "@/components/onboarding-forms";
import { toast } from "sonner";
interface FormData {
	form: {
		id: number;
		status: string;
		currentStep: number;
		totalSteps: number;
	} | null;
	submission: {
		id: number;
		formData: string;
		version: number;
	} | null;
	status: string;
}
⋮----
export default function FormPage({
	params,
}: {
	params: Promise<{ id: string; formType: string }>;
})
⋮----
const fetchFormData = async () =>
⋮----
const handleSubmit = async (data: unknown) =>
const handleSaveDraft = async (data: unknown) =>
const renderForm = () =>
```

## File: app/(authenticated)/dashboard/applications/[id]/forms/page.tsx
```typescript
import {
	RiAlertLine,
	RiArrowLeftLine,
	RiCheckLine,
	RiEditLine,
	RiFileTextLine,
	RiTimeLine,
} from "@remixicon/react";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDatabaseClient } from "@/app/utils";
import { DashboardLayout } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { applicants, internalForms, workflows } from "@/db/schema";
import { cn } from "@/lib/utils";
type FormTypeKey =
	| "stratcol_agreement"
	| "facility_application"
	| "absa_6995"
	| "fica_documents";
interface FormConfig {
	type: FormTypeKey;
	title: string;
	description: string;
	stage: number;
	icon: typeof RiFileTextLine;
}
⋮----
Last saved:
```

## File: app/(authenticated)/dashboard/notifications/page.tsx
```typescript
import {
	RiAlertLine,
	RiCheckDoubleLine,
	RiCheckLine,
	RiDeleteBinLine,
	RiTimeLine,
} from "@remixicon/react";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDatabaseClient } from "@/app/utils";
import { DashboardLayout, DashboardSection, GlassCard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { applicants, notifications, workflows } from "@/db/schema";
interface NotificationRow {
	id: number;
	workflowId: number | null;
	type: string;
	message: string;
	read: boolean | null;
	actionable: boolean | null;
	createdAt: Date | null;
	clientName: string | null;
	severity: string | null;
	groupKey: string | null;
}
async function markAsRead(formData: FormData)
async function deleteNotification(formData: FormData)
async function clearAllNotifications()
async function markAllAsRead()
⋮----
function isManualFallbackNotification(message: string): boolean
function isManualSanctionsNotification(message: string): boolean
function formatNotificationMessage(message: string): string
```

## File: app/(authenticated)/dashboard/risk-review/page.tsx
```typescript
import {
	RiAlertLine,
	RiFilter3Line,
	RiRefreshLine,
	RiSearchLine,
	RiTimeLine,
} from "@remixicon/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard";
import {
	RiskReviewDetail,
	type RiskReviewItem,
	RiskReviewQueue,
} from "@/components/dashboard/risk-review";
import type { OverrideData } from "@/components/dashboard/risk-review/risk-review-queue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDecisionEndpoint } from "@/lib/utils";
export default function RiskReviewPage()
⋮----
const isProcurementReview = (item: RiskReviewItem): boolean
const normalizeProcurementRecommendation = (
		recommendation?: string
): "APPROVE" | "MANUAL_REVIEW" | "DECLINE" =>
const submitDecision = async (
		item: RiskReviewItem,
		action: "approve" | "reject",
		overrideData: OverrideData
) =>
⋮----
const handleApprove = async (id: number, overrideData: OverrideData) =>
const handleReject = async (id: number, overrideData: OverrideData) =>
const handleViewDetails = (item: RiskReviewItem) =>
⋮----
onApprove=
onReject=
```

## File: app/(authenticated)/dashboard/sanctions/page.tsx
```typescript
import { RiFilter3Line, RiRefreshLine } from "@remixicon/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard";
import {
	SanctionAdjudication,
	type SanctionItem,
} from "@/components/dashboard/sanctions/sanction-adjudication";
import { Button } from "@/components/ui/button";
export default function SanctionsPage()
⋮----
// Error state was in client.tsx, risk-review handles errors in catch blocks with toast.
// We can keep error state if we want to show a specific error UI,
// or switch to toast to match risk-review more closely if desired.
// risk-review uses toast.error("Failed to load risk review queue");
```

## File: app/(authenticated)/dashboard/workflows/[id]/page.tsx
```typescript
import {
	RiArrowLeftLine,
	RiBuildingLine,
	RiCheckLine,
	RiErrorWarningLine,
	RiFileTextLine,
	RiMailLine,
	RiPhoneLine,
	RiRobot2Line,
	RiTimeLine,
	RiUserLine,
} from "@remixicon/react";
import { formatDistanceToNow } from "date-fns";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDatabaseClient } from "@/app/utils";
import { DashboardLayout, DashboardSection } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { applicants, quotes, workflowEvents, workflows } from "@/db/schema";
import { cn } from "@/lib/utils";
type WorkflowStatus =
	| "pending"
	| "in_progress"
	| "awaiting_human"
	| "completed"
	| "failed"
	| "timeout";
⋮----
function StatusBadge(
function StageBadge(
⋮----
Created
```

## File: app/(authenticated)/dashboard/workflows/page.tsx
```typescript
import {
	RiDownloadLine,
	RiFilterLine,
	RiFlowChart,
	RiUserAddLine,
} from "@remixicon/react";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { getDatabaseClient } from "@/app/utils";
import {
	DashboardGrid,
	DashboardLayout,
	DashboardSection,
	STAGE_NAMES,
	StatsCard,
	WorkflowTable,
} from "@/components/dashboard";
import type { WorkflowRow } from "@/components/dashboard/workflow-table";
import { Button } from "@/components/ui/button";
import { applicants, quotes, workflows } from "@/db/schema";
export default async function WorkflowsPage()
⋮----
const normalizeStage = (
				stage: number | null | undefined
): 1 | 2 | 3 | 4 | 5 | 6 =>
const normalizeStatus = (
				status: string | null | undefined
): WorkflowRow["status"] =>
```

## File: app/(authenticated)/dashboard/layout.tsx
```typescript
import { getDatabaseClient } from "@/app/utils";
import { notifications, workflows, applicants } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { WorkflowNotification } from "@/components/dashboard/notifications-panel";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
⋮----
export default async function DashboardRootLayout({
	children,
}: {
	children: React.ReactNode;
})
```

## File: app/(authenticated)/dashboard/page.tsx
```typescript
import {
	RiCheckboxCircleLine,
	RiFileTextLine,
	RiShieldCheckLine,
	RiTimeLine,
	RiUserAddLine,
} from "@remixicon/react";
import { count, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { getDatabaseClient } from "@/app/utils";
import { DashboardGrid, DashboardLayout, StatsCard } from "@/components/dashboard";
import type { WorkflowNotification } from "@/components/dashboard/notifications-panel";
import {
	PipelineView,
	type PipelineWorkflow,
} from "@/components/dashboard/pipeline-view";
import { Button } from "@/components/ui/button";
import { applicants, notifications, quotes, workflows } from "@/db/schema";
```

## File: app/(authenticated)/header.tsx
```typescript
import { UserButton } from "./user-button";
export function Header()
```

## File: app/(authenticated)/layout.tsx
```typescript
export default function Layout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>)
```

## File: app/(authenticated)/user-button.tsx
```typescript
import { UserButton as ClerkUserButton } from "@clerk/nextjs";
const DownloadIcon = () =>
const GithubIcon = () =>
export function UserButton()
```

## File: app/(unauthenticated)/agreement/[token]/_components/form-signature-box.tsx
```typescript

```

## File: app/(unauthenticated)/agreement/[token]/_components/form-term-box.tsx
```typescript
function TermBlock(
```

## File: app/(unauthenticated)/agreement/[token]/agreement-form.css
```css
.contract-page {
.contract-header {
.contract-header-left {
.contract-header h1 {
.contract-header-meta {
.contract-logo-placeholder {
.contract-master-id {
.contract-master-id label {
.contract-master-id span {
.contract-part-banner {
.contract-part-banner .part-label {
.contract-part-banner .part-text {
.contract-card {
.contract-section-header {
.contract-section-body {
.contract-section-note {
.contract-grid {
⋮----
.contract-field-full {
.contract-field {
.contract-field label {
.contract-field label .required-star {
.contract-field input,
.contract-field input:focus,
.contract-field input::placeholder {
.contract-field-error {
.contract-entity-types {
.contract-entity-type {
.contract-entity-type input[type="radio"] {
.contract-consent {
.contract-consent input[type="checkbox"] {
.contract-consent label {
.contract-signature-row {
⋮----
.contract-resolution-box {
.contract-submit-area {
.contract-submit-btn {
.contract-submit-btn:hover {
.contract-submit-btn:active {
.contract-submit-btn:disabled {
.contract-error-banner {
.contract-success {
.contract-success h2 {
.contract-success p {
.contract-owner-card {
.contract-owner-remove {
.contract-owner-remove:hover {
.contract-add-btn {
.contract-add-btn:hover {
.contract-acceptance {
.contract-acceptance strong {
```

## File: app/(unauthenticated)/agreement/[token]/agreement-form.tsx
```typescript
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useState } from "react";
import type { FieldValues, Resolver } from "react-hook-form";
import { useFieldArray, useForm } from "react-hook-form";
import type { z } from "zod";
import sharedStyles from "@/components/forms/external/external-form-theme.module.css";
import ExternalStatusCard from "@/components/forms/external/external-status-card";
import { stratcolAgreementSchema } from "@/lib/validations/forms";
⋮----
type AgreementFormValues = z.infer<typeof stratcolAgreementSchema>;
interface AgreementFormProps {
	token: string;
	applicantId: number;
	workflowId: number | null;
}
⋮----
<input type=
⋮----
appendOwner(
⋮----
{/* ══════════════════════════════════════════
				    Banking & Mandates
				    ══════════════════════════════════════════ */}
```

## File: app/(unauthenticated)/agreement/[token]/contract-form.css
```css

```

## File: app/(unauthenticated)/agreement/[token]/page.tsx
```typescript
import ExternalStatusCard from "@/components/forms/external/external-status-card";
import {
	getFormInstanceByToken,
	markFormInstanceStatus,
} from "@/lib/services/form.service";
import AgreementForm from "./agreement-form";
interface ContractPageProps {
	params: Promise<{ token: string }>;
}
export default async function ContractPage(
```

## File: app/(unauthenticated)/agreement/layout.tsx
```typescript
export default function ContractLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>)
```

## File: app/(unauthenticated)/dev/forms/page.tsx
```typescript
import { useCallback, useState } from "react";
import ExternalFormShell from "@/components/forms/external/external-form-shell";
import styles from "@/components/forms/external/external-form-theme.module.css";
interface FormEntry {
	type: string;
	title: string;
	description: string;
	route: string;
	sections: number;
	color: string;
}
⋮----
interface GeneratedLink {
	type: string;
	url: string;
	token: string;
}
```

## File: app/(unauthenticated)/forms/[token]/content.ts
```typescript
import type { ZodTypeAny } from "zod";
import type { FormSectionDefinition } from "@/components/forms/types";
import type { FormType } from "@/lib/types";
import {
	absa6995Schema,
	callCentreApplicationSchema,
	facilityApplicationSchema,
	signedQuotationSchema,
	stratcolAgreementSchema,
} from "@/lib/validations/forms";
```

## File: app/(unauthenticated)/forms/[token]/form-view.tsx
```typescript
import { useEffect, useMemo, useState } from "react";
import DecisionActions from "@/components/forms/decision-actions";
import styles from "@/components/forms/external/external-form-theme.module.css";
import FormRenderer from "@/components/forms/form-renderer";
import FormStatusMessage from "@/components/forms/form-status-message";
import type { FormType } from "@/lib/types";
import { formContent } from "./content";
interface FormViewProps {
	token: string;
	formType: Exclude<FormType, "DOCUMENT_UPLOADS">;
	initialFormStatus: string;
	initialDecisionStatus: string | null;
	initialDecisionOutcome: string | null;
}
interface QuoteSummary {
	amount: number;
	baseFeePercent: number;
	adjustedFeePercent: number | null;
	rationale: string | null;
	status: string;
}
⋮----
const loadQuote = async () =>
⋮----
const callDecisionEndpoint = async (
		decision: "APPROVED" | "DECLINED",
		reason?: string
) =>
⋮----
onApprove=
```

## File: app/(unauthenticated)/forms/[token]/page.tsx
```typescript
import FormShell from "@/components/forms/form-shell";
import {
	getFormInstanceByToken,
	markFormInstanceStatus,
} from "@/lib/services/form.service";
import type { FormType } from "@/lib/types";
import { formContent } from "./content";
import FormView from "./form-view";
interface FormPageProps {
	params: Promise<{ token: string }>;
}
export default async function FormPage(
```

## File: app/(unauthenticated)/sign-in/[[...sign-in]]/page.tsx
```typescript
import { SignIn } from "@clerk/nextjs";
export default function Page()
```

## File: app/(unauthenticated)/sign-up/[[...sign-up]]/page.tsx
```typescript
import { SignUp } from "@clerk/nextjs";
export default function Page()
```

## File: app/(unauthenticated)/uploads/[token]/page.tsx
```typescript
import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import FormShell from "@/components/forms/form-shell";
import type { DocumentRequirement } from "@/config/document-requirements";
import {
	type DocumentRequirementContext,
	getDocumentRequirements as getConfigDocumentRequirements,
} from "@/config/document-requirements";
import { applicants } from "@/db/schema";
import type { BusinessType } from "@/lib/services/document-requirements.service";
import {
	getDocumentRequirements as getMandateDocumentRequirements,
	resolveBusinessType,
} from "@/lib/services/document-requirements.service";
import {
	getFormInstanceByToken,
	markFormInstanceStatus,
} from "@/lib/services/form.service";
import UploadView from "./upload-view";
interface UploadPageProps {
	params: Promise<{ token: string }>;
}
export default async function UploadPage(
```

## File: app/(unauthenticated)/uploads/[token]/upload-view.tsx
```typescript
import { useMemo, useState } from "react";
import styles from "@/components/forms/external/external-form-theme.module.css";
import type { DocumentRequirement } from "@/config/document-requirements";
interface UploadViewProps {
	token: string;
	requirements: DocumentRequirement[];
}
type UploadStatus = "idle" | "uploading" | "uploaded" | "error";
⋮----
const handleFilesChange = (type: string, files: FileList | null) =>
const uploadDocuments = async (requirement: DocumentRequirement) =>
⋮----
onChange=
```

## File: app/(unauthenticated)/layout.tsx
```typescript
export default async function Layout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>)
```

## File: app/api/applicants/[id]/route.ts
```typescript
import { and, desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import {
	applicantMagiclinkForms,
	applicantSubmissions,
	applicants,
	documents,
	quotes,
	riskAssessments,
	workflowEvents,
	workflows,
} from "@/db/schema";
import { updateApplicantSchema } from "@/lib/validations";
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
)
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
)
```

## File: app/api/applicants/approval/route.ts
```typescript
import { type NextRequest, NextResponse } from "next/server";
import { inngest } from "@/inngest";
import { getDatabaseClient } from "@/app/utils";
import { workflows } from "@/db/schema";
import { eq, type InferSelectModel } from "drizzle-orm";
import { z } from "zod";
import { acquireStateLock } from "@/lib/services/state-lock.service";
import { requireAuthOrBearer } from "@/lib/auth/api-auth";
⋮----
export async function POST(request: NextRequest)
```

## File: app/api/applicants/route.ts
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { applicants, workflows } from "@/db/schema";
import { createApplicantSchema } from "@/lib/validations";
import { inngest } from "@/inngest";
import { requireAuth } from "@/lib/auth/api-auth";
export async function GET()
export async function POST(request: NextRequest)
```

## File: app/api/callbacks/quotes/route.ts
```typescript
import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/inngest";
import { z } from "zod";
⋮----
export async function POST(request: NextRequest)
```

## File: app/api/contract/review/route.ts
```typescript
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inngest } from "@/inngest";
import {
	getFormInstanceByToken,
	recordFormSubmission,
} from "@/lib/services/form.service";
import { stratcolAgreementSchema } from "@/lib/validations/forms";
⋮----
export async function POST(request: NextRequest)
```

## File: app/api/dev/forms/generate-token/route.ts
```typescript
import { type NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { applicants } from "@/db/schema";
import { createFormInstance } from "@/lib/services/form.service";
import { FormTypeSchema } from "@/lib/types";
async function getOrCreateDevApplicant(): Promise<number>
export async function POST(request: NextRequest)
```

## File: app/api/documents/download/route.ts
```typescript
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { documents, documentUploads } from "@/db/schema";
export async function GET(request: NextRequest)
```

## File: app/api/documents/upload/route.ts
```typescript
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { documents } from "@/db/schema";
import { inngest } from "@/inngest/client";
import {
	getFormInstanceByToken,
	markFormInstanceStatus,
} from "@/lib/services/form.service";
import { evaluateDocumentQuality } from "@/lib/services/document-quality.service";
import { DocumentCategorySchema, DocumentTypeSchema } from "@/lib/types";
⋮----
export async function POST(request: NextRequest)
```

## File: app/api/fica/upload/route.ts
```typescript
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { documents, workflows } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { evaluateDocumentQuality } from "@/lib/services/document-quality.service";
⋮----
interface UploadedDocument {
	type: "BANK_STATEMENT" | "ACCOUNTANT_LETTER" | "ID_DOCUMENT" | "PROOF_OF_ADDRESS";
	filename: string;
	url: string;
	uploadedAt: string;
}
⋮----
export async function POST(request: NextRequest)
export async function GET(request: NextRequest)
```

## File: app/api/forms/[token]/decision/route.ts
```typescript
import { desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { quotes } from "@/db/schema";
import { inngest } from "@/inngest";
import { getFormInstanceByToken, recordFormDecision } from "@/lib/services/form.service";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";
import type { DecisionEnabledFormType, FormDecisionOutcome } from "@/lib/types";
⋮----
const isDecisionEnabledForm = (value: string): value is DecisionEnabledFormType
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ token: string }> }
)
```

## File: app/api/forms/[token]/quote/route.ts
```typescript
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { quotes } from "@/db/schema";
import { getFormInstanceByToken } from "@/lib/services/form.service";
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ token: string }> }
)
```

## File: app/api/forms/submit/route.ts
```typescript
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { inngest } from "@/inngest";
import {
	getFormInstanceByToken,
	recordFormSubmission,
} from "@/lib/services/form.service";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";
import type { FormType } from "@/lib/types";
import {
	absa6995Schema,
	callCentreApplicationSchema,
	type FacilityApplicationForm,
	facilityApplicationSchema,
	signedQuotationSchema,
	stratcolAgreementSchema,
} from "@/lib/validations/forms";
⋮----
const extractSubmittedBy = (formType: FormType, data: Record<string, unknown>) =>
export async function POST(request: NextRequest)
```

## File: app/api/inngest/route.ts
```typescript
import { serve } from "inngest/next";
import { functions, inngest } from "@/inngest";
```

## File: app/api/notifications/[id]/route.ts
```typescript
import { getDatabaseClient } from "@/app/utils";
import { notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
)
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
)
```

## File: app/api/notifications/clear-all/route.ts
```typescript
import { getDatabaseClient } from "@/app/utils";
import { notifications } from "@/db/schema";
import { NextResponse } from "next/server";
export async function DELETE()
```

## File: app/api/notifications/mark-all-read/route.ts
```typescript
import { getDatabaseClient } from "@/app/utils";
import { notifications } from "@/db/schema";
import { NextResponse } from "next/server";
export async function POST()
```

## File: app/api/onboarding/approve/route.ts
```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inngest } from "@/inngest/client";
import { getDatabaseClient } from "@/app/utils";
import { workflows, workflowEvents, applicants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { acquireStateLock } from "@/lib/services/state-lock.service";
⋮----
export async function POST(request: NextRequest)
export async function GET(request: NextRequest)
```

## File: app/api/onboarding/documents/[id]/route.ts
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { documentUploads } from "@/db/schema";
import { eq } from "drizzle-orm";
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
)
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
)
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
)
```

## File: app/api/onboarding/documents/upload/route.ts
```typescript
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { applicants, documentUploads, workflows } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { evaluateDocumentQuality } from "@/lib/services/document-quality.service";
export async function POST(request: NextRequest)
⋮----
// Get applicant mandate type to determine required docs
⋮----
export async function GET(request: NextRequest)
```

## File: app/api/onboarding/forms/[workflowId]/[formType]/route.ts
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { internalForms, internalSubmissions, workflows, FORM_TYPES } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { inngest } from "@/inngest/client";
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ workflowId: string; formType: string }> }
)
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ workflowId: string; formType: string }> }
)
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ workflowId: string; formType: string }> }
)
```

## File: app/api/quotes/[id]/approve/route.ts
```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { quotes, workflows } from "@/db/schema";
import { eq } from "drizzle-orm";
import { inngest } from "@/inngest";
import { acquireStateLock } from "@/lib/services/state-lock.service";
import { requireAuth } from "@/lib/auth/api-auth";
export async function POST(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
)
```

## File: app/api/quotes/[id]/reject/route.ts
```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { quotes, workflows } from "@/db/schema";
import { eq } from "drizzle-orm";
import { inngest } from "@/inngest";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { acquireStateLock } from "@/lib/services/state-lock.service";
⋮----
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
)
```

## File: app/api/quotes/[id]/route.ts
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { quotes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateQuoteSchema } from "@/lib/validations/quotes";
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
)
```

## File: app/api/quotes/route.ts
```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { quotes } from "@/db/schema";
import { createQuoteSchema } from "@/lib/validations/quotes";
export async function POST(request: NextRequest)
```

## File: app/api/risk-decision/pre/route.ts
```typescript
import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inngest } from "@/inngest/client";
⋮----
export async function POST(request: NextRequest)
```

## File: app/api/risk-decision/procurement/route.ts
```typescript
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { workflowEvents, workflows } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { OVERRIDE_CATEGORIES } from "@/lib/constants/override-taxonomy";
import { recordFeedbackLog } from "@/lib/services/divergence.service";
import { executeKillSwitch } from "@/lib/services/kill-switch.service";
import { acquireStateLock, markStaleData } from "@/lib/services/state-lock.service";
⋮----
export async function POST(request: NextRequest)
```

## File: app/api/risk-decision/route.ts
```typescript
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { aiAnalysisLogs, workflowEvents, workflows } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { OVERRIDE_CATEGORIES } from "@/lib/constants/override-taxonomy";
import { recordFeedbackLog } from "@/lib/services/divergence.service";
import { acquireStateLock } from "@/lib/services/state-lock.service";
⋮----
export async function POST(request: NextRequest)
export async function GET(_request: NextRequest)
```

## File: app/api/risk-review/route.ts
```typescript
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, gte } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { applicants, riskAssessments, workflowEvents, workflows } from "@/db/schema";
export async function GET(_request: NextRequest)
```

## File: app/api/sanctions/route.ts
```typescript
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { aiAnalysisLogs, applicants, sanctionClearance, workflows } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { executeKillSwitch } from "@/lib/services/kill-switch.service";
⋮----
export async function GET(_request: NextRequest)
export async function POST(request: NextRequest)
function buildDeepLinks(
	matchDetails: Record<string, unknown> | null
): Array<
```

## File: app/api/test/state-lock-collision/route.ts
```typescript
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { documents, workflowEvents } from "@/db/schema";
import {
	guardStateCollision,
	handleStateCollision,
	StateCollisionError,
} from "@/lib/services/state-lock.service";
⋮----
function ensureTestMode()
export async function POST(request: NextRequest)
export async function GET(request: NextRequest)
```

## File: app/api/webhooks/contract-signed/route.ts
```typescript
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inngest } from "@/inngest";
⋮----
export async function POST(request: NextRequest)
```

## File: app/api/webhooks/lead-capture/route.ts
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { applicants, workflows } from "@/db/schema";
import { inngest } from "@/inngest";
import { z } from "zod";
⋮----
export async function POST(request: NextRequest)
```

## File: app/api/workflows/[id]/absa/mock/route.ts
```typescript
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { workflows } from "@/db/schema";
import { inngest } from "@/inngest/client";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";
⋮----
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
)
```

## File: app/api/workflows/[id]/contract/review/route.ts
```typescript
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { workflowEvents, workflows } from "@/db/schema";
import { inngest } from "@/inngest/client";
⋮----
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
)
```

## File: app/api/workflows/[id]/financial-statements/confirm/route.ts
```typescript
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { workflowEvents, workflows } from "@/db/schema";
import { inngest } from "@/inngest/client";
⋮----
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
)
```

## File: app/api/workflows/[id]/kill-switch/route.ts
```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { getDatabaseClient } from "@/app/utils";
import { workflows } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
	executeKillSwitch,
	type KillSwitchReason,
} from "@/lib/services/kill-switch.service";
⋮----
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
)
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
)
```

## File: app/api/workflows/[id]/reject/route.ts
```typescript
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { workflows, workflowEvents, quotes, agentCallbacks, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
⋮----
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
)
```

## File: app/api/workflows/[id]/resolve-error/route.ts
```typescript
import { inngest } from "@/inngest/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-auth";
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
)
```

## File: app/api/workflows/[id]/signal/route.ts
```typescript
import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/inngest";
import { z } from "zod";
import { requireAuthOrBearer } from "@/lib/auth/api-auth";
⋮----
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
)
```

## File: app/api/workflows/route.ts
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { workflows } from "@/db/schema";
import { z } from "zod";
import { inngest } from "@/inngest";
import { requireAuth } from "@/lib/auth/api-auth";
⋮----
export async function GET()
export async function POST(request: NextRequest)
```

## File: app/webhooks/clerk/route.ts
```typescript
import type { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { Webhook } from "svix";
export async function POST(req: Request)
```

## File: app/globals.css
```css
@custom-variant dark (&:is(.dark *));
.dark {
@theme inline {
@layer components {
⋮----
.border-border {
⋮----
@apply border-border;
⋮----
.glass-card {
.card-form {
.dotted-grid-container {
.card-form::before {
⋮----
/* position: absolute; */
/* z-index: -12; */
⋮----
.card-form::after {
⋮----
/* -webkit-filter: url(#container-glass); */
/* filter: url(#container-glass); */
/* overflow: hidden; */
/* isolation: isolate; */
⋮----
.glass-card-container-form {
⋮----
/* width: 100vw; */
⋮----
/* padding: 15px; */
⋮----
/* z-index: -1; */
/* background: var(--background) !important; */
⋮----
/*  */
.dotted-grid-container-main {
⋮----
/* background-color: #56381c; */
/* background-image: radial-gradient(circle, rgba(37, 152, 152, 0.974) 1px, transparent 1px) !important; */
⋮----
label {
.dotted-grid {
.dotted-grid-main {
.glass-card::before {
.glass-card::after {
.glassBtn {
.glassBtn::before {
.glassBtn::after {
.border-input {
⋮----
*:autofill {
⋮----
.glassBtn svg {
⋮----
@layer base {
⋮----
* {
input:-webkit-autofill,
.override-padding-reset {
body {
```

## File: app/layout.tsx
```typescript
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import DottedGridHeightSync from "@/components/layout/dotted-grid-height-sync";
⋮----
import { getBaseUrl } from "@/lib/utils";
⋮----
export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>)
```

## File: app/page.tsx
```typescript
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { OldVsNew } from "@/components/landing/old-vs-new";
import { RoleTabs } from "@/components/landing/role-tabs";
import { TechnicalTrust } from "@/components/landing/technical-trust";
import { TrustedBy } from "@/components/landing/trusted-by";
import { WorkflowSteps } from "@/components/landing/workflow-steps";
export default function Page()
```

## File: app/utils.ts
```typescript
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
⋮----
export function getDatabaseClient()
```

## File: components/dashboard/risk-review/index.ts
```typescript

```

## File: components/dashboard/risk-review/risk-review-detail.tsx
```typescript
import {
	RiAlertLine,
	RiArrowDownSLine,
	RiArrowRightSLine,
	RiBankLine,
	RiBuilding2Line,
	RiCheckLine,
	RiCloseLine,
	RiExternalLinkLine,
	RiEyeLine,
	RiFileTextLine,
	RiHistoryLine,
	RiLoader4Line,
	RiPercentLine,
	RiQuestionLine,
	RiShieldCheckLine,
	RiShoppingBag3Line,
	RiUserLine,
} from "@remixicon/react";
⋮----
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataSourceBadge } from "@/components/ui/data-source-badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
	OVERRIDE_CATEGORIES,
	OVERRIDE_CATEGORY_LABELS,
	type OverrideCategory,
} from "@/lib/constants/override-taxonomy";
import { cn } from "@/lib/utils";
import type { RiskReviewItem } from "./risk-review-queue";
import type { OverrideData } from "./risk-review-queue";
interface RiskReviewDetailProps {
	item: RiskReviewItem | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onApprove: (id: number, overrideData: OverrideData) => Promise<void>;
	onReject: (id: number, overrideData: OverrideData) => Promise<void>;
}
interface TimelineEvent {
	id: string;
	type: "stage_change" | "agent_dispatch" | "agent_callback" | "human_override" | "error";
	title: string;
	description: string;
	timestamp: Date;
	actor?: string;
}
function getSeverityColor(severity: string): string
function formatDate(date: Date): string
⋮----
className=
⋮----
<div className=
⋮----
// Collapsible section state (SOP v3.1.0 — auto-collapse low-risk)
⋮----
/**
	 * Determine if a decision disagrees with the AI recommendation.
	 * If AI says APPROVE and user clicks Reject, or AI says DECLINE and user clicks Approve.
	 */
⋮----
const _getApiEndpoint = () =>
const handleApprove = async () =>
const handleReject = async () =>
const handleOverrideSubmit = async () =>
// Mock timeline events - in production, fetch from API
⋮----
onChange=
```

## File: components/dashboard/risk-review/risk-review-queue.tsx
```typescript
import {
	RiAlarmWarningLine,
	RiAlertLine,
	RiBuilding2Line,
	RiCheckLine,
	RiCloseLine,
	RiErrorWarningLine,
	RiEyeLine,
	RiPercentLine,
	RiRefreshLine,
	RiScalesLine,
	RiShieldCheckLine,
	RiTimeLine,
} from "@remixicon/react";
⋮----
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataSourceBadge } from "@/components/ui/data-source-badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	OVERRIDE_CATEGORIES,
	OVERRIDE_CATEGORY_LABELS,
	OVERRIDE_SUBCATEGORIES,
	type OverrideCategory,
} from "@/lib/constants/override-taxonomy";
import { cn } from "@/lib/utils";
export interface RiskReviewItem {
	id: number;
	workflowId: number;
	applicantId: number;
	clientName: string;
	companyName: string;
	stage: number;
	stageName: string;
	createdAt: Date;
	aiTrustScore?: number;
	riskFlags?: Array<{
		type: string;
		severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
		description: string;
		evidence?: string;
	}>;
	itcScore?: number;
	recommendation?: string;
	summary?: string;
	reasoning?: string;
	analysisConfidence?: number;
	bankStatementVerified?: boolean;
	accountantLetterVerified?: boolean;
	nameMatchVerified?: boolean;
	accountMatchVerified?: boolean;
	reviewType?: "procurement" | "general";
	decisionType?: string;
	targetResource?: string;
	procurementScore?: number;
	hasAnomalies?: boolean;
	anomalies?: string[];
	procurementCheckFailed?: boolean;
	procurementFailureReason?: string;
	procurementFailureSource?: string;
	procurementFailureGuidance?: string;
	procurementRecommendedAction?: string;
	sanctionStatus?: "clear" | "flagged" | "confirmed_hit";
	escalationTier?: number;
	dataSource?: string | null;
	checkStatuses?: {
		procurement: "available" | "manual_required";
		validation: "available" | "manual_required";
		risk: "available" | "manual_required";
		sanctions: "available" | "manual_required";
		itc: "available" | "manual_required";
	};
}
interface RiskReviewCardProps {
	item: RiskReviewItem;
	onApprove: (id: number, overrideData: OverrideData) => Promise<void>;
	onReject: (id: number, overrideData: OverrideData) => Promise<void>;
	onViewDetails: (item: RiskReviewItem) => void;
}
export interface OverrideData {
	overrideCategory: OverrideCategory;
	overrideSubcategory?: string;
	overrideDetails?: string;
}
interface RiskDecisionDialogProps {
	item: RiskReviewItem | null;
	action: "approve" | "reject" | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: (overrideData: OverrideData) => Promise<void>;
}
function getTrustScoreColor(score: number): string
function _getTrustScoreBg(score: number): string
function getSeverityColor(severity: string): string
function formatTimeAgo(date: Date): string
⋮----
<span className=
⋮----
const handleApproveClick = () =>
const handleRejectClick = () =>
const handleConfirmDecision = async (overrideData: OverrideData) =>
⋮----
className=
⋮----
// Get subcategories for selected category
⋮----
// Detect potential divergence with AI recommendation
⋮----
const handleSubmit = async () =>
⋮----
setOverrideSubcategory(""); // Reset subcategory on category change
```

## File: components/dashboard/sanctions/sanction-adjudication.tsx
```typescript
import {
	RiAlarmWarningLine,
	RiCheckLine,
	RiCloseLine,
	RiExternalLinkLine,
	RiLoader4Line,
	RiShieldCheckLine,
} from "@remixicon/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DataSourceBadge } from "@/components/ui/data-source-badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
interface DeepLink {
	label: string;
	url: string;
	source: string;
}
export interface SanctionItem {
	applicantId: number;
	companyName: string | null;
	tradingName: string | null;
	registrationNumber: string | null;
	contactName: string | null;
	email: string | null;
	phone: string | null;
	businessType: string | null;
	sanctionStatus: string | null;
	flaggedAt: string | null;
	workflowId: number | null;
	workflowStatus: string | null;
	workflowStage: number | null;
	sanctionListSource: string;
	matchConfidence?: number;
	matchedEntity?: string;
	matchedListId?: string;
	adverseMediaCount: number;
	isPEP: boolean;
	riskLevel: string;
	narrative?: string;
	dataSource?: string | null;
	deepLinks: DeepLink[];
}
interface SanctionAdjudicationProps {
	items: SanctionItem[];
	onRefresh: () => void;
}
⋮----
onChange=
```

## File: components/dashboard/activity-feed.tsx
```typescript
import {
	RiCheckLine,
	RiArrowRightLine,
	RiAlertLine,
	RiUserLine,
	RiRobot2Line,
	RiTimeLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";
type EventType =
	| "stage_change"
	| "agent_dispatch"
	| "agent_callback"
	| "human_override"
	| "timeout"
	| "error";
interface ActivityEvent {
	id: number;
	workflowId: number;
	clientName: string;
	eventType: EventType;
	description: string;
	timestamp: Date;
	actorType: "user" | "agent" | "platform";
	actorId?: string;
}
⋮----
interface ActivityFeedProps {
	events: ActivityEvent[];
	maxItems?: number;
}
⋮----
className=
```

## File: components/dashboard/agent-status-card.tsx
```typescript
import { RiAlertLine, RiCheckLine, RiRobot2Line, RiTimeLine } from "@remixicon/react";
import { cn } from "@/lib/utils";
interface Agent {
	id: string;
	agentId: string;
	name: string;
	taskType: string;
	status: "active" | "inactive" | "error";
	lastCallbackAt?: Date;
	callbackCount: number;
	errorCount: number;
	aiModel: string;
	provider: string;
	description: string;
}
⋮----
interface AgentStatusCardProps {
	agent: Agent;
	onClick?: () => void;
}
⋮----
className=
⋮----
Last callback:
⋮----
return (
			<button type="button" onClick={onClick} className={containerClasses}>
				{content}
			</button>
		);
⋮----
<span className=
```

## File: components/dashboard/applicant-form.tsx
```typescript
import { RiLoader4Line, RiTestTubeLine } from "@remixicon/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GlassCard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
interface ApplicantFormData {
	companyName: string;
	registrationNumber: string;
	contactName: string;
	idNumber: string;
	email: string;
	phone: string;
	entityType: string;
	productType: string;
	industry: string;
	employeeCount: string;
	estimatedTransactionsPerMonth: string;
	mandateType: string;
	notes: string;
}
interface ApplicantFormProps {
	initialData?: Partial<ApplicantFormData>;
	onSubmit?: (data: ApplicantFormData) => Promise<void>;
	isEditing?: boolean;
}
export function ApplicantForm({
	initialData,
	onSubmit,
	isEditing = false,
}: ApplicantFormProps)
⋮----
// Check if Mockaroo test mode is enabled
⋮----
const fillTestData = () =>
const updateField = (field: keyof ApplicantFormData, value: string) =>
const validateForm = (): boolean =>
const handleSubmit = async (e: React.FormEvent) =>
⋮----
onChange=
⋮----
onClick=
```

## File: components/dashboard/applicants-table.tsx
```typescript
import { RiArrowDownSLine, RiArrowUpSLine, RiMoreLine } from "@remixicon/react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
export interface ApplicantRow {
	id: number;
	companyName: string;
	contactName: string;
	email: string;
	status: string;
	industry: string;
	employeeCount: number;
	createdAt: Date;
	workflowId?: number | null;
	workflowStage?: number | null;
	hasQuote?: boolean;
}
⋮----
onClick=
⋮----
className=
```

## File: components/dashboard/dashboard-layout.tsx
```typescript
import type { WorkflowNotification } from "./notifications-panel";
import { PageMeta } from "./page-meta";
interface DashboardLayoutProps {
	children: React.ReactNode;
	title?: string;
	description?: string;
	actions?: React.ReactNode;
	notifications?: WorkflowNotification[];
}
export function DashboardLayout({
	children,
	title,
	description,
	actions,
}: DashboardLayoutProps)
interface DashboardGridProps {
	children: React.ReactNode;
	columns?: 1 | 2 | 3 | 4 | 5 | 6;
	className?: string;
}
export function DashboardGrid(
interface GlassCardProps {
	children: React.ReactNode;
	className?: string;
	hover?: boolean;
}
export function GlassCard({
	children,
	className,
	hover = false,
}: GlassCardProps): React.ReactNode
interface DashboardSectionProps {
	title: string;
	description?: string;
	children: React.ReactNode;
	action?: React.ReactNode;
	className?: string;
}
export function DashboardSection({
	title,
	description,
	children,
	action,
	className,
}: DashboardSectionProps)
```

## File: components/dashboard/dashboard-shell.tsx
```typescript
import { UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDashboardStore } from "@/lib/dashboard-store";
import { cn } from "@/lib/utils";
import { NotificationsPanel, type WorkflowNotification } from "./notifications-panel";
import { Sidebar } from "./sidebar";
interface DashboardShellProps {
	children: React.ReactNode;
	notifications?: WorkflowNotification[];
}
const getNotificationRoute = (notification: WorkflowNotification): string =>
⋮----
const startPolling = () =>
⋮----
const handleVisibility = () =>
⋮----
onMarkAllRead=
onAction=
```

## File: components/dashboard/dynamic-components.tsx
```typescript
import dynamic from "next/dynamic";
```

## File: components/dashboard/final-approval-card.tsx
```typescript
import { useState, useEffect } from "react";
import {
	RiCheckLine,
	RiCheckboxCircleLine,
	RiLoader4Line,
	RiCheckboxBlankCircleLine,
	RiFileTextLine,
	RiContractLine,
	RiShieldCheckLine,
	RiUserLine,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
interface ApprovalStatus {
	approvedBy: string;
	decision: "APPROVED" | "REJECTED";
	timestamp: string;
}
interface FinalApprovalProps {
	workflowId: number;
	applicantId: number;
	contractSigned: boolean;
	absaFormComplete: boolean;
	workflowStatus?: string;
	userRole?: "risk_manager" | "account_manager";
	onApprovalComplete?: () => void;
}
interface ChecklistItem {
	id: string;
	label: string;
	description: string;
	checked: boolean;
	icon: React.ElementType;
}
⋮----
className=
⋮----
const fetchApprovalStatus = async () =>
⋮----
const handleApprove = async (decision: "APPROVED" | "REJECTED") =>
```

## File: components/dashboard/index.ts
```typescript

```

## File: components/dashboard/notifications-panel.tsx
```typescript
import {
	RiAlertLine,
	RiCheckDoubleLine,
	RiCheckLine,
	RiCloseLine,
	RiNotification3Line,
	RiPauseCircleLine,
	RiTimeLine,
	RiUserLine,
} from "@remixicon/react";
import Link from "next/link";
import { type MouseEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
export interface WorkflowNotification {
	id: string;
	workflowId: number;
	applicantId: number;
	clientName: string;
	type:
		| "awaiting"
		| "completed"
		| "failed"
		| "timeout"
		| "paused"
		| "error"
		| "warning"
		| "info"
		| "success";
	message: string;
	timestamp: Date;
	read: boolean;
	actionable?: boolean;
	severity?: "low" | "medium" | "high" | "critical";
	groupKey?: string;
}
⋮----
function isManualFallbackNotification(message: string): boolean
function isManualSanctionsNotification(message: string): boolean
function formatNotificationMessage(message: string): string
interface NotificationsPanelProps {
	notifications: WorkflowNotification[];
	onMarkAllRead?: () => void;
	onNotificationClick?: (notification: WorkflowNotification) => void;
	onAction?: (
		notification: WorkflowNotification,
		action: "approve" | "reject" | "retry" | "cancel" | "view"
	) => void;
	onDelete?: (notification: WorkflowNotification) => void;
}
⋮----
const handleAction = async (
		e: MouseEvent,
		notification: WorkflowNotification,
		action: "approve" | "reject" | "retry" | "cancel" | "view"
) =>
⋮----
className=
```

## File: components/dashboard/page-meta.tsx
```typescript
import { useEffect } from "react";
import { useDashboardStore } from "@/lib/dashboard-store";
interface PageMetaProps {
	title?: string;
	description?: string;
	actions?: React.ReactNode;
}
export function PageMeta(
⋮----
// Cleanup not strictly necessary if every page sets it, but good practice
```

## File: components/dashboard/parallel-branch-status.tsx
```typescript
import {
	RiAlertLine,
	RiCheckLine,
	RiFileTextLine,
	RiGitBranchLine,
	RiLoader3Line,
	RiShieldCheckLine,
} from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
export interface BranchStatus {
	id: string;
	name: string;
	description: string;
	status: "pending" | "in_progress" | "completed" | "failed";
	riskScore?: number;
	documentsReceived?: number;
	documentsRequired?: number;
	completedAt?: Date;
	icon: React.ElementType;
}
interface ParallelBranchStatusProps {
	stage: number;
	branches: BranchStatus[];
	title?: string;
	requireAll?: boolean;
}
⋮----
className=
⋮----
<Badge variant="outline" className=
```

## File: components/dashboard/pipeline-view.tsx
```typescript
import {
	RiCheckboxCircleLine,
	RiCheckDoubleLine,
	RiCheckLine,
	RiContractLine,
	RiEditLine,
	RiFileTextLine,
	RiFlowChart,
	RiMenu3Line,
	RiRobot2Line,
	RiTimeLine,
	RiUserLine,
} from "@remixicon/react";
import Link from "next/link";
import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { RiskBadge } from "../ui/status-badge";
export type PipelineWorkflow = {
	id: number | string;
	stage: string;
	status?: string;
	clientName?: string;
	applicantId?: number;
	hasQuote?: boolean;
	payload?: {
		riskLevel?: string;
		registrationNumber?: string;
		mandateType?: string;
		procurementCleared?: boolean;
		documentsComplete?: boolean;
		aiAnalysisComplete?: boolean;
	};
	startedAt?: string | Date;
};
```

## File: components/dashboard/quote-approval-form.tsx
```typescript
import {
	RiAi,
	RiAlertLine,
	RiCloseLine,
	RiErrorWarningLine,
	RiLoader4Line,
} from "@remixicon/react";
import { useMemo, useState } from "react";
import { GlassCard } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
⋮----
interface QuoteApprovalFormProps {
	applicantId: number;
	workflowId: number;
	quoteId: number;
	status: string;
	initialAmount?: number | null;
	initialBaseFeePercent?: number | null;
	initialAdjustedFeePercent?: number | null;
	initialRationale?: string | null;
	details?: string | null;
}
interface QuoteFormErrors {
	amount?: string;
	baseFeePercent?: string;
	adjustedFeePercent?: string;
	rationale?: string;
}
⋮----
// --- Rejection State (Phase 2: Quote Rejection UI) ---
⋮----
/** Check if quote amount exceeds the overlimit threshold */
⋮----
const validate = () =>
const handleApprove = async () =>
const handleReject = async () =>
```

## File: components/dashboard/sidebar.tsx
```typescript
import {
	RiAlarmWarningLine,
	RiBarChartBoxAiFill,
	RiDashboardLine,
	RiMenuFoldLine,
	RiMenuUnfoldLine,
	RiRobot2Line,
	RiShieldCheckLine,
	RiUserAddLine,
} from "@remixicon/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
⋮----
<div className=
⋮----
className=
```

## File: components/dashboard/skeleton-loaders.tsx
```typescript
import { cn } from "@/lib/utils";
interface SkeletonProps {
	className?: string;
	animate?: boolean;
}
export function Skeleton(
⋮----
className=
⋮----
export function StatsCardSkeleton()
⋮----
<div className=
```

## File: components/dashboard/stats-card.tsx
```typescript
import type { RemixiconComponentType } from "@remixicon/react";
import { cn } from "@/lib/utils";
interface StatsCardProps {
	title: string;
	value: string | number;
	change?: {
		value: number;
		trend: "up" | "down" | "neutral";
	};
	icon: RemixiconComponentType;
	iconColor?: "amber" | "green" | "blue" | "purple" | "red";
	className?: string;
}
⋮----
className=
```

## File: components/dashboard/workflow-progress-stepper.tsx
```typescript
import {
	RiCheckboxCircleLine,
	RiCheckLine,
	RiContractLine,
	RiEditLine,
	RiFileTextLine,
	RiLoader3Line,
	RiRobot2Line,
	RiUserLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";
export interface WorkflowStep {
	stage: number;
	name: string;
	shortName: string;
	status: "completed" | "current" | "pending" | "error";
	completedAt?: Date;
	icon?: React.ElementType;
}
interface WorkflowProgressStepperProps {
	currentStage: 1 | 2 | 3 | 4 | 5 | 6;
	workflowStatus?: string;
	compact?: boolean;
	steps?: WorkflowStep[];
	className?: string;
}
⋮----
className=
```

## File: components/dashboard/workflow-table.tsx
```typescript
import {
	RiAlertFill,
	RiAlertLine,
	RiArrowDownSLine,
	RiArrowUpSLine,
	RiCheckLine,
	RiCloseLine,
	RiErrorWarningFill,
	RiFlowChart,
	RiMore2Fill,
	RiPauseCircleLine,
	RiThumbDownLine,
	RiThumbUpLine,
	RiTimeLine,
	RiUserLine,
} from "@remixicon/react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
⋮----
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
export interface WorkflowRow {
	id: number;
	applicantId: number;
	clientName: string;
	stage: 1 | 2 | 3 | 4 | 5 | 6;
	stageName: string;
	status:
		| "pending"
		| "in_progress"
		| "awaiting_human"
		| "completed"
		| "failed"
		| "timeout"
		| "paused";
	currentAgent?: string;
	startedAt: Date;
	payload?: Record<string, unknown>;
	hasQuote?: boolean;
	reviewType?: "procurement" | "general";
	alertSeverity?: "low" | "medium" | "high" | "critical";
	decisionType?: string;
	targetResource?: string;
}
⋮----
className=
⋮----
onClick=
⋮----
const handleConfirm = async () =>
```

## File: components/emails/ApplicantFormLinks.tsx
```typescript
import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";
export interface FormLink {
	formType: string;
	url: string;
}
export interface RequiredDocumentSummary {
	name: string;
	description?: string;
}
interface ApplicantFormLinksProps {
	contactName?: string;
	links: FormLink[];
	requiredDocuments?: RequiredDocumentSummary[];
}
⋮----
Complete:
⋮----
function formatFormType(type: string)
```

## File: components/emails/EmailLayout.tsx
```typescript
import {
	Body,
	Container,
	Head,
	Html,
	Img,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
⋮----
interface EmailLayoutProps {
	preview: string;
	children: React.ReactNode;
}
export const EmailLayout = (
```

## File: components/emails/InternalAlert.tsx
```typescript
import { Button, Heading, Hr, Section, Text } from "@react-email/components";
⋮----
import { EmailLayout } from "./EmailLayout";
interface QuoteDetails {
	amount?: number;
	baseFeePercent?: number;
	adjustedFeePercent?: number | null;
	rationale?: string | null;
	riskFactors?: string | string[] | null;
	generatedAt?: string | null;
}
interface InternalAlertProps {
	title: string;
	message: string;
	workflowId: number;
	applicantId: number;
	type?: "info" | "warning" | "error" | "success";
	details?: Record<string, unknown>;
	quoteDetails?: QuoteDetails;
	actionUrl?: string;
	approveUrl?: string;
}
⋮----
Generated at:
```

## File: components/forms/external/external-form-field.tsx
```typescript
import type React from "react";
import { cn } from "@/lib/utils";
import styles from "./external-form-theme.module.css";
interface ExternalFormFieldProps {
	label: string;
	required?: boolean;
	error?: string;
	className?: string;
	children: React.ReactNode;
	description?: string;
}
export default function ExternalFormField({
	label,
	required,
	error,
	className,
	children,
	description,
}: ExternalFormFieldProps)
⋮----
<div className=
```

## File: components/forms/external/external-form-section.tsx
```typescript
import type React from "react";
import { cn } from "@/lib/utils";
import styles from "./external-form-theme.module.css";
interface ExternalFormSectionProps {
	title: string;
	note?: string;
	children: React.ReactNode;
	bodyClassName?: string;
}
```

## File: components/forms/external/external-form-shell.tsx
```typescript
import type React from "react";
import styles from "./external-form-theme.module.css";
interface ExternalFormShellProps {
	title: string;
	description?: string;
	children: React.ReactNode;
}
export default function ExternalFormShell({
	title,
	description,
	children,
}: ExternalFormShellProps)
⋮----
```

## File: components/forms/external/external-form-theme.module.css
```css
.externalPage {
.externalHero {
.externalHero h1 {
.externalHeroDescription {
.externalCard {
.externalSectionHeader {
.externalSectionBody {
.externalSectionNote {
.externalGrid {
⋮----
.externalFieldFull {
.externalField {
.externalField label {
.requiredStar {
.externalInput,
.externalInput:focus,
.externalInput::placeholder,
.externalError {
.externalActions {
.primaryButton,
.primaryButton {
.secondaryButton {
.outlineButton {
.dangerButton {
.primaryButton:hover,
.primaryButton:disabled,
.errorBanner {
.successCard {
.successCard h2 {
.successCard p {
.statusIcon {
.statusIconError {
.statusIconSvgSuccess {
.statusIconSvgError {
.entityTypes {
.entityType {
.entityType input[type="radio"] {
.consent {
.consent input[type="checkbox"] {
.consent label {
.signatureRow {
⋮----
.resolutionBox {
.ownerCard {
.ownerRemove {
.ownerRemove:hover {
.addButton {
.addButton:hover {
.acceptance {
.acceptance strong {
.masterIdBar {
.masterIdValue {
.partBanner {
.partLabel {
.partText {
.testingBanner {
.testingTitle {
.testingText {
.historyList {
.historyItem {
```

## File: components/forms/external/external-status-card.tsx
```typescript
import styles from "./external-form-theme.module.css";
interface ExternalStatusCardProps {
	title: string;
	description: string;
	variant?: "success" | "error";
}
```

## File: components/forms/decision-actions.tsx
```typescript
import { useState } from "react";
import styles from "./external/external-form-theme.module.css";
interface DecisionActionsProps {
	approveLabel: string;
	declineLabel: string;
	requiresDeclineReason?: boolean;
	disabled?: boolean;
	approveButtonType?: "submit" | "button";
	onApprove?: () => Promise<void>;
	onDecline: (reason?: string) => Promise<void>;
}
⋮----
setShowDeclineInput(false);
setReason("");
setError(null);
```

## File: components/forms/form-fields.tsx
```typescript
import { useMemo } from "react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import ExternalFormField from "./external/external-form-field";
import styles from "./external/external-form-theme.module.css";
import type { FieldDefinition, FieldOption } from "./types";
⋮----
const getOptionLabel = (option: FieldOption)
const getOptionValue = (option: FieldOption)
function FieldError(
⋮----
onClick=
```

## File: components/forms/form-renderer.tsx
```typescript
import { zodResolver } from "@hookform/resolvers/zod";
import { type ReactNode, useMemo, useState } from "react";
import type { FieldValues, Resolver } from "react-hook-form";
import { FormProvider, useForm } from "react-hook-form";
import type { ZodTypeAny } from "zod";
import ExternalFormSection from "./external/external-form-section";
import styles from "./external/external-form-theme.module.css";
import { FormField, RepeatableFieldGroup } from "./form-fields";
import type { FieldDefinition, FormSectionDefinition } from "./types";
interface FormRendererProps {
	sections: FormSectionDefinition[];
	schema: ZodTypeAny;
	defaultValues?: Record<string, unknown>;
	testData?: Record<string, unknown>;
	submitLabel?: string;
	onSubmit: (values: FieldValues) => Promise<void>;
	disabled?: boolean;
	renderActions?: ReactNode;
}
const isRepeatable = (
	field: FieldDefinition
): field is Extract<FieldDefinition,
```

## File: components/forms/form-shell.tsx
```typescript
import type React from "react";
import ExternalFormShell from "@/components/forms/external/external-form-shell";
import styles from "@/components/forms/external/external-form-theme.module.css";
interface FormShellProps {
	title: string;
	description?: string;
	children: React.ReactNode;
}
const FormShell = (
```

## File: components/forms/form-status-message.tsx
```typescript
import ExternalStatusCard from "@/components/forms/external/external-status-card";
interface FormStatusMessageProps {
	title: string;
	description: string;
}
export default function FormStatusMessage({
	title,
	description,
}: FormStatusMessageProps)
```

## File: components/forms/types.ts
```typescript
export type FieldOption = {
	label: string;
	value: string;
};
export type BaseFieldType =
	| "text"
	| "textarea"
	| "email"
	| "tel"
	| "number"
	| "date"
	| "select"
	| "checkbox"
	| "checkbox-group"
	| "signature";
export type FieldDefinition =
	| {
			name: string;
			label: string;
			type: BaseFieldType;
			required?: boolean;
			placeholder?: string;
			description?: string;
			options?: FieldOption[];
			colSpan?: 1 | 2;
	  }
	| {
			name: string;
			label: string;
			type: "repeatable";
			minItems?: number;
			maxItems?: number;
			addLabel?: string;
			fields: Array<Exclude<FieldDefinition, { type: "repeatable" }>>;
	  };
export interface FormSectionDefinition {
	title: string;
	description?: string;
	columns?: 1 | 2;
	fields: FieldDefinition[];
}
```

## File: components/landing/features.tsx
```typescript
import { motion } from "framer-motion";
import { Bot, Database, Globe, Layers, Lock, Zap } from "lucide-react";
export const Features = () =>
```

## File: components/landing/footer.tsx
```typescript
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export const Footer = () =>
```

## File: components/landing/hero.tsx
```typescript
import { motion } from "framer-motion";
import { ArrowRight, FileText } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
```

## File: components/landing/old-vs-new.tsx
```typescript
import { motion } from "framer-motion";
import { CheckCircle2, Clock, XCircle, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
```

## File: components/landing/role-tabs.tsx
```typescript
import { motion } from "framer-motion";
import { ArrowRight, Briefcase, Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
```

## File: components/landing/technical-trust.tsx
```typescript
import { motion } from "framer-motion";
import { FileSearch, Lock, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
```

## File: components/landing/trusted-by.tsx
```typescript
import { motion } from "framer-motion";
export const TrustedBy = () =>
```

## File: components/landing/workflow-steps.tsx
```typescript
import { motion } from "framer-motion";
import { FileSignature, Flag, ShieldCheck, User, Zap } from "lucide-react";
export function WorkflowSteps()
```

## File: components/layout/dotted-grid-height-sync.tsx
```typescript
import { useEffect, useRef } from "react";
const getDocumentHeight = (): number =>
export default function DottedGridHeightSync()
⋮----
const syncHeight = () =>
const scheduleSync = () =>
```

## File: components/onboarding-forms/absa-6995/index.tsx
```typescript
import { useForm, FormProvider, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormWizard, FormStep } from "../form-wizard";
import { SignatureCanvas } from "../signature-canvas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
	RiBuildingLine,
	RiUserLine,
	RiBankLine,
	RiShieldCheckLine,
	RiFileListLine,
	RiAddLine,
	RiDeleteBinLine,
} from "@remixicon/react";
import {
	absa6995Schema,
	ABSA_6995_STEP_TITLES,
	ApplicationType,
	SalesDistribution,
	ExitReason,
	getAbsa6995DefaultValues,
	type Absa6995FormData,
} from "@/lib/validations/onboarding";
interface Absa6995FormProps {
	workflowId: number;
	initialData?: Partial<Absa6995FormData>;
	onSubmit: (data: Absa6995FormData) => Promise<void>;
	onSaveDraft?: (data: Partial<Absa6995FormData>) => Promise<void>;
	readOnly?: boolean;
}
interface FormFieldProps {
	label: string;
	required?: boolean;
	error?: string;
	children: React.ReactNode;
	className?: string;
}
function FormField(
⋮----
<div className=
⋮----
interface CheckboxOption {
	value: string;
	label: string;
}
interface CheckboxGroupProps {
	options: CheckboxOption[];
	value: string[];
	onChange: (value: string[]) => void;
	disabled?: boolean;
	columns?: 2 | 3 | 4;
}
⋮----
const handleChange = (optionValue: string, checked: boolean) =>
⋮----
className=
⋮----
// ============================================
// Main Form Component
// ============================================
⋮----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
⋮----
const handleFormSubmit = async (data: Absa6995FormData) =>
const handleSaveDraft = async () =>
⋮----
<form onSubmit=
⋮----
onClick=
⋮----
setValue(
⋮----
setValue(item.field, checked as boolean)
```

## File: components/onboarding-forms/facility-application/index.tsx
```typescript
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormWizard, FormStep } from "../form-wizard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RiServiceLine, RiLineChartLine, RiCheckboxCircleLine } from "@remixicon/react";
import {
	facilityApplicationSchema,
	FACILITY_APPLICATION_STEP_TITLES,
	ServiceType,
	AdditionalService,
	type FacilityApplicationFormData,
} from "@/lib/validations/onboarding";
interface FacilityApplicationFormProps {
	workflowId: number;
	initialData?: Partial<FacilityApplicationFormData>;
	onSubmit: (data: FacilityApplicationFormData) => Promise<void>;
	onSaveDraft?: (data: Partial<FacilityApplicationFormData>) => Promise<void>;
	readOnly?: boolean;
}
interface FormFieldProps {
	label: string;
	required?: boolean;
	error?: string;
	children: React.ReactNode;
	className?: string;
	description?: string;
}
function FormField({
	label,
	required,
	error,
	children,
	className,
	description,
}: FormFieldProps)
⋮----
<div className=
⋮----
interface CheckboxOption {
	value: string;
	label: string;
	description?: string;
}
interface CheckboxGroupProps {
	options: CheckboxOption[];
	value: string[];
	onChange: (value: string[]) => void;
	disabled?: boolean;
	className?: string;
}
⋮----
const handleChange = (optionValue: string, checked: boolean) =>
⋮----
onCheckedChange=
⋮----
const handleFormSubmit = async (data: FacilityApplicationFormData) =>
const handleSaveDraft = async () =>
⋮----
<form onSubmit=
⋮----
onClick=
```

## File: components/onboarding-forms/fica-upload/index.tsx
```typescript
import { useForm, FormProvider, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormWizard, FormStep } from "../form-wizard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
	RiFolderLine,
	RiUserLine,
	RiBankLine,
	RiBriefcaseLine,
	RiGovernmentLine,
	RiUploadCloud2Line,
	RiCheckLine,
	RiCloseLine,
	RiFileTextLine,
	RiAddLine,
	RiDeleteBinLine,
} from "@remixicon/react";
import {
	ficaDocumentsSchema,
	FICA_DOCUMENTS_STEP_TITLES,
	DOCUMENT_REQUIREMENTS,
	DocumentCategory,
	getFicaDocumentsDefaultValues,
	type FicaDocumentsFormData,
	type DocumentUploadItem,
} from "@/lib/validations/onboarding";
interface FicaUploadFormProps {
	workflowId: number;
	initialData?: Partial<FicaDocumentsFormData>;
	onSubmit: (data: FicaDocumentsFormData) => Promise<void>;
	onSaveDraft?: (data: Partial<FicaDocumentsFormData>) => Promise<void>;
	onFileUpload?: (
		file: File,
		documentType: string
	) => Promise<{ uploadId: string; url: string }>;
	readOnly?: boolean;
	individuals?: Array<{
		name: string;
		role: "director" | "beneficial_owner" | "authorised_representative";
	}>;
}
interface DocumentUploadItemProps {
	label: string;
	description?: string;
	required?: boolean;
	isUploaded: boolean;
	fileName?: string;
	acceptedFormats: string[];
	maxSizeMb: number;
	onUpload: (file: File) => void;
	onRemove: () => void;
	disabled?: boolean;
	error?: string;
}
⋮----
const handleClick = () =>
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
⋮----
className=
⋮----
const handleFormSubmit = async (data: FicaDocumentsFormData) =>
const handleSaveDraft = async () =>
⋮----
<form onSubmit=
⋮----
onClick=
⋮----
setValue("acknowledgement", checked as boolean)
```

## File: components/onboarding-forms/stratcol-agreement/index.tsx
```typescript
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	RiAddLine,
	RiBankLine,
	RiBuildingLine,
	RiDeleteBinLine,
	RiUserLine,
} from "@remixicon/react";
⋮----
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { FormStep, FormWizard } from "../form-wizard";
import { SignatureCanvas } from "../signature-canvas";
import {
	EntityType,
	STRATCOL_AGREEMENT_STEP_TITLES,
	stratcolAgreementSchema,
	type StratcolAgreementFormData,
} from "@/lib/validations/onboarding";
interface StratcolAgreementFormProps {
	workflowId: number;
	initialData?: Partial<StratcolAgreementFormData>;
	onSubmit: (data: StratcolAgreementFormData) => Promise<void>;
	onSaveDraft?: (data: Partial<StratcolAgreementFormData>) => Promise<void>;
	readOnly?: boolean;
}
interface FormFieldProps {
	label: string;
	required?: boolean;
	error?: string;
	children: React.ReactNode;
	className?: string;
}
function FormField(
⋮----
<div className=
⋮----
value={entityType}
						onValueChange={value => setValue("entityDetails.entityType", value as any)}>
						<SelectTrigger>
							<SelectValue placeholder="Select entity type" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={EntityType.PROPRIETOR}>Proprietor</SelectItem>
							<SelectItem value={EntityType.COMPANY}>Company</SelectItem>
							<SelectItem value={EntityType.CLOSE_CORPORATION}>
								Close Corporation
							</SelectItem>
							<SelectItem value={EntityType.PARTNERSHIP}>Partnership</SelectItem>
							<SelectItem value={EntityType.OTHER}>Other</SelectItem>
						</SelectContent>
					</Select>
				</FormField>
				{entityType === EntityType.OTHER && (
					<FormField label="Specify Entity Type" required>
						<Input
							{...register("entityDetails.otherEntityType")}
							placeholder="Specify type"
						/>
					</FormField>
				)}
			</div>
			{}
			<div className="space-y-4">
				<h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
					Business Address
				</h4>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormField
						label="Address"
						required
						error={errors.entityDetails?.businessAddress?.address?.message}
						className="md:col-span-2">
						<Input
							{...register("entityDetails.businessAddress.address")}
							placeholder="Street address"
						/>
					</FormField>
					<FormField
						label="Suburb"
						required
						error={errors.entityDetails?.businessAddress?.suburb?.message}>
						<Input
							{...register("entityDetails.businessAddress.suburb")}
							placeholder="Suburb"
						/>
					</FormField>
					<FormField
						label="Town/City"
						required
						error={errors.entityDetails?.businessAddress?.townCity?.message}>
						<Input
							{...register("entityDetails.businessAddress.townCity")}
							placeholder="Town/City"
						/>
					</FormField>
					<FormField
						label="Postal Code"
						required
						error={errors.entityDetails?.businessAddress?.postalCode?.message}>
						<Input
							{...register("entityDetails.businessAddress.postalCode")}
							placeholder="0000"
							maxLength={4}
						/>
					</FormField>
				</div>
			</div>
			{}
			<div className="space-y-4">
				<h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
					Postal Address
				</h4>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormField
						label="Address"
						required
						error={errors.entityDetails?.postalAddress?.address?.message}
						className="md:col-span-2">
						<Input
							{...register("entityDetails.postalAddress.address")}
							placeholder="Postal address"
						/>
					</FormField>
					<FormField
						label="Suburb"
						required
						error={errors.entityDetails?.postalAddress?.suburb?.message}>
						<Input
							{...register("entityDetails.postalAddress.suburb")}
							placeholder="Suburb"
						/>
					</FormField>
					<FormField
						label="Town/City"
						required
						error={errors.entityDetails?.postalAddress?.townCity?.message}>
						<Input
							{...register("entityDetails.postalAddress.townCity")}
							placeholder="Town/City"
						/>
					</FormField>
					<FormField
						label="Postal Code"
						required
						error={errors.entityDetails?.postalAddress?.postalCode?.message}>
						<Input
							{...register("entityDetails.postalAddress.postalCode")}
							placeholder="0000"
							maxLength={4}
						/>
					</FormField>
				</div>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<FormField label="Duration at Address">
					<Input
						{...register("entityDetails.durationAtAddress")}
						placeholder="e.g., 5 years"
					/>
				</FormField>
				<FormField label="Industry Tenure">
					<Input
						{...register("entityDetails.industryTenure")}
						placeholder="e.g., 10 years"
					/>
				</FormField>
			</div>
		</div>
	);
⋮----
const handleFormSubmit = async (data: StratcolAgreementFormData) =>
const handleSaveDraft = async () =>
⋮----
<form onSubmit=
⋮----
onClick=
⋮----
addBeneficialOwner(
⋮----
setValue("declarationsAccepted", checked as boolean)
```

## File: components/onboarding-forms/form-wizard.tsx
```typescript
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
	RiArrowLeftLine,
	RiArrowRightLine,
	RiCheckLine,
	RiSaveLine,
	RiLoader4Line,
} from "@remixicon/react";
export interface FormWizardStep {
	id: string;
	title: string;
	description?: string;
	validate?: () => Promise<boolean> | boolean;
	optional?: boolean;
	shouldSkip?: () => boolean;
}
export interface FormWizardProps {
	steps: FormWizardStep[];
	currentStep?: number;
	onStepChange?: (step: number) => void;
	onSubmit: () => Promise<void> | void;
	onSaveDraft?: () => Promise<void> | void;
	children: (props: {
		currentStep: number;
		isFirstStep: boolean;
		isLastStep: boolean;
		goToStep: (step: number) => void;
	}) => React.ReactNode;
	storageKey?: string;
	title?: string;
	isLoading?: boolean;
	isSubmitting?: boolean;
	className?: string;
	showStepIndicator?: boolean;
	submitButtonText?: string;
}
interface StepIndicatorProps {
	steps: FormWizardStep[];
	currentStep: number;
	onStepClick?: (step: number) => void;
	className?: string;
}
⋮----
<div className=
⋮----
className=
⋮----
<Card className=
```

## File: components/onboarding-forms/index.ts
```typescript

```

## File: components/onboarding-forms/signature-canvas.tsx
```typescript
import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { RiEraserLine, RiCheckLine, RiRefreshLine } from "@remixicon/react";
interface SignatureCanvasProps {
	onSave: (dataUrl: string) => void;
	onClear?: () => void;
	width?: number;
	height?: number;
	strokeColour?: string;
	strokeWidth?: number;
	backgroundColour?: string;
	label?: string;
	required?: boolean;
	error?: string;
	initialValue?: string;
	disabled?: boolean;
	className?: string;
}
⋮----
const preventScroll = (e: TouchEvent) =>
⋮----
<div className=
⋮----
className=
```

## File: components/ui/alert-dialog.tsx
```typescript
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
⋮----
function AlertDialogTrigger({
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>)
function AlertDialogPortal({
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>)
⋮----
className=
⋮----
function AlertDialogCancel({
	className,
	variant = "outline",
	size = "default",
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel> &
Pick<React.ComponentProps<typeof Button>, "variant" | "size">)
```

## File: components/ui/badge.tsx
```typescript
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
⋮----
import { cn } from "@/lib/utils";
⋮----
function Badge({
	className,
	variant = "default",
	asChild = false,
	...props
}: React.ComponentProps<"span"> &
VariantProps<typeof badgeVariants> &
⋮----
className=
```

## File: components/ui/button.tsx
```typescript
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";
⋮----
className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
```

## File: components/ui/card.tsx
```typescript
import { cn } from "@/lib/utils";
⋮----
className=
⋮----
function CardDescription(
```

## File: components/ui/checkbox.tsx
```typescript
import { RiCheckLine } from "@remixicon/react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
⋮----
import { cn } from "@/lib/utils";
function Checkbox({
	className,
	...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>)
```

## File: components/ui/combobox.tsx
```typescript
import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@/components/ui/input-group";
import { RiArrowDownSLine, RiCloseLine, RiCheckLine } from "@remixicon/react";
⋮----
function ComboboxValue(
⋮----
function ComboboxTrigger({
	className,
	children,
	...props
}: ComboboxPrimitive.Trigger.Props)
function ComboboxClear(
⋮----
className=
⋮----
function ComboboxGroup(
function ComboboxLabel(
function ComboboxCollection(
function ComboboxEmpty(
function ComboboxChips({
	className,
	...props
}: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> &
ComboboxPrimitive.Chips.Props)
```

## File: components/ui/data-source-badge.tsx
```typescript
import { cn } from "@/lib/utils";
export function DataSourceBadge(
⋮----
className=
```

## File: components/ui/data-table.tsx
```typescript
import {
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, SortingState, Row } from "@tanstack/react-table";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	meta?: Record<string, any>;
}
```

## File: components/ui/dialog.tsx
```typescript
import { RiCloseLine } from "@remixicon/react";
import { Dialog as DialogPrimitive } from "radix-ui";
⋮----
import { cn } from "@/lib/utils";
⋮----
function DialogOverlay({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>)
⋮----
className=
⋮----
function DialogDescription({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Description>)
```

## File: components/ui/dropdown-menu.tsx
```typescript
import { RiArrowRightSLine, RiCheckLine } from "@remixicon/react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
⋮----
import { cn } from "@/lib/utils";
function DropdownMenu({
	modal = false,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>)
function DropdownMenuPortal({
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>)
function DropdownMenuTrigger({
	className,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>)
function DropdownMenuContent({
	className,
	align = "start",
	sideOffset = 4,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>)
function DropdownMenuItem({
	className,
	inset,
	variant = "default",
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
	inset?: boolean;
	variant?: "default" | "destructive";
})
⋮----
className=
⋮----
function DropdownMenuRadioGroup({
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>)
function DropdownMenuRadioItem({
	className,
	children,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>)
function DropdownMenuLabel({
	className,
	inset,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
	inset?: boolean;
})
⋮----
function DropdownMenuSubTrigger({
	className,
	inset,
	children,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
	inset?: boolean;
})
```

## File: components/ui/field.tsx
```typescript
import { cva, type VariantProps } from "class-variance-authority";
import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
⋮----
className=
```

## File: components/ui/input-group.tsx
```typescript
import { cva, type VariantProps } from "class-variance-authority";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
⋮----
className=
⋮----
data-align={align}
			className={cn(inputGroupAddonVariants({ align }), className)}
			onClick={e => {
if ((e.target as HTMLElement).closest("button"))
⋮----
className={cn(inputGroupAddonVariants({ align }), className)}
			onClick={e => {
if ((e.target as HTMLElement).closest("button"))
```

## File: components/ui/input.tsx
```typescript
import { cn } from "@/lib/utils";
function Input(
⋮----
className=
```

## File: components/ui/label.tsx
```typescript
import { Label as LabelPrimitive } from "radix-ui";
⋮----
import { cn } from "@/lib/utils";
function Label({
	className,
	...props
}: React.ComponentProps<typeof LabelPrimitive.Root>)
```

## File: components/ui/popover.tsx
```typescript
import { Popover as PopoverPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
⋮----
function PopoverTrigger({
	...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>)
function PopoverContent({
	className,
	align = "center",
	sideOffset = 4,
	...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>)
function PopoverHeader(
⋮----
className=
⋮----
function PopoverTitle(
function PopoverDescription(
```

## File: components/ui/select.tsx
```typescript
import { RiArrowDownSLine, RiArrowUpSLine, RiCheckLine } from "@remixicon/react";
import { Select as SelectPrimitive } from "radix-ui";
⋮----
import { cn } from "@/lib/utils";
⋮----
function SelectGroup({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Group>)
⋮----
function SelectTrigger({
	className,
	size = "default",
	children,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
	size?: "sm" | "default";
})
```

## File: components/ui/separator.tsx
```typescript
import { Separator as SeparatorPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
function Separator({
	className,
	orientation = "horizontal",
	decorative = true,
	...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>)
```

## File: components/ui/sheet.tsx
```typescript
import { RiCloseCircleFill } from "@remixicon/react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
⋮----
className=
```

## File: components/ui/status-badge.tsx
```typescript
import { RiAlertFill, RiCheckFill } from "@remixicon/react";
import type React from "react";
import { cn } from "@/lib/utils";
export type StatusType = "success" | "warning" | "error" | "info" | "neutral" | "brand";
⋮----
interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
	status?: StatusType;
	icon?: React.ReactNode;
}
⋮----
className=
```

## File: components/ui/table.tsx
```typescript
import { cn } from "@/lib/utils";
⋮----
className=
⋮----
function TableBody(
```

## File: components/ui/tabs.tsx
```typescript
import { cva, type VariantProps } from "class-variance-authority";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
⋮----
className=
```

## File: components/ui/textarea.tsx
```typescript
import { cn } from "@/lib/utils";
⋮----
className=
```

## File: config/document-requirements.ts
```typescript
import type { DocumentCategory, DocumentType } from "@/lib/types";
export interface DocumentRequirement {
	type: DocumentType;
	label: string;
	category: DocumentCategory;
	required: boolean;
	description?: string;
}
export interface DocumentRequirementContext {
	entityType?:
		| "company"
		| "close_corporation"
		| "proprietor"
		| "partnership"
		| "trust"
		| "npo"
		| "body_corporate"
		| "other";
	productType?: "standard" | "premium_collections" | "call_centre";
	industry?: string;
	productTypes?: string[];
	isExistingUser?: boolean;
	saleOfBusiness?: boolean;
	needsBankGuarantee?: boolean;
	isHighRisk?: boolean;
	riskBased?: boolean;
}
⋮----
const hasIndustry = (industry: string | undefined, token: string) =>
export function getDocumentRequirements(context: DocumentRequirementContext)
export function getAllDocumentRequirements()
```

## File: config/mandates.ts
```typescript
import {
	RiBankCardLine,
	RiExchangeDollarLine,
	RiSecurePaymentLine,
	RiHandCoinLine,
} from "@remixicon/react";
```

## File: config/navigation.ts
```typescript
import {
	RiDashboardLine,
	RiFileList3Line,
	RiShieldCheckLine,
	RiTeamLine,
	RiSettings4Line,
	RiQuestionLine,
	RiLogoutBoxLine,
	RiSignalTowerFill,
} from "@remixicon/react";
```

## File: db/schema.ts
```typescript
import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
⋮----
export type BusinessType = (typeof BUSINESS_TYPES)[number];
⋮----
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];
⋮----
export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number];
⋮----
export type FormType = (typeof FORM_TYPES)[number];
```

## File: e2e/fixtures/auth.fixture.ts
```typescript
import { test as base, type Page } from "@playwright/test";
export type AuthFixtures = {
	authenticatedPage: Page;
};
```

## File: e2e/fixtures/database.fixture.ts
```typescript
import { test as base } from "@playwright/test";
import { exec } from "node:child_process";
import { promisify } from "node:util";
⋮----
export type DatabaseFixtures = {
	resetDatabase: () => Promise<void>;
};
⋮----
const reset = async () =>
```

## File: e2e/fixtures/index.ts
```typescript
import { mergeTests } from "@playwright/test";
import { test as authTest, expect } from "./auth.fixture";
import { test as dbTest } from "./database.fixture";
```

## File: e2e/pages/dashboard.page.ts
```typescript
import type { Locator, Page } from "@playwright/test";
export class DashboardPage
⋮----
constructor(page: Page)
async goto()
async navigateToApplicants()
async navigateToWorkflows()
async navigateToRiskReview()
async getApplicantCount(): Promise<number>
```

## File: e2e/tests/auth/my-test.spec.ts
```typescript
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test } from "@playwright/test";
```

## File: e2e/tests/dashboard/navigation.spec.ts
```typescript
import { test, expect } from "../../fixtures";
import { DashboardPage } from "../../pages/dashboard.page";
```

## File: e2e/tests/dashboard/new-applicant.spec.ts
```typescript
import { test, expect } from "@playwright/test";
```

## File: e2e/tests/workflow/sop-stages.spec.ts
```typescript
import { expect, test } from "../../fixtures";
import { DashboardPage } from "../../pages/dashboard.page";
```

## File: e2e/tests/app.spec.ts
```typescript
import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
```

## File: e2e/tests/global.setup.ts
```typescript
import { clerkSetup, clerk } from "@clerk/testing/playwright";
import { test as setup, expect } from "@playwright/test";
import path from "node:path";
```

## File: e2e/.gitignore
```
# Playwright
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/
e2e/.auth/
e2e/test.db
e2e/test.db-journal

# Screenshots and run artifacts — do not commit
*.png
```

## File: inngest/data/mock_blacklist.json
```json
[1000, 2000, 3000, 4000, 5000]
```

## File: inngest/functions/control-tower-workflow.ts
```typescript
import { and, desc, eq } from "drizzle-orm";
import { NonRetriableError } from "inngest";
import { getBaseUrl, getDatabaseClient } from "@/app/utils";
import {
	applicants,
	documents,
	documentUploads,
	workflowEvents,
	workflows,
} from "@/db/schema";
import {
	type AggregatedAnalysisResult,
	isSanctionsBlocked,
	performAggregatedAnalysis,
	performSanctionsCheck,
	type SanctionsCheckResult,
} from "@/lib/services/agents";
import {
	determineBusinessType,
	getDocumentRequirements,
	resolveBusinessType,
} from "@/lib/services/document-requirements.service";
import {
	sendApplicantFormLinksEmail,
	sendApplicantStatusEmail,
	sendInternalAlertEmail,
} from "@/lib/services/email.service";
import { createFormInstance } from "@/lib/services/form.service";
import { performITCCheck } from "@/lib/services/itc.service";
import {
	executeKillSwitch,
	isWorkflowTerminated,
} from "@/lib/services/kill-switch.service";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";
import { generateQuote, type Quote } from "@/lib/services/quote.service";
import { analyzeRisk as runProcureCheck } from "@/lib/services/risk.service";
import {
	getStateLockInfo,
	handleStateCollision,
} from "@/lib/services/state-lock.service";
import { updateWorkflowStatus } from "@/lib/services/workflow.service";
import type { FormType } from "@/lib/types";
import { inngest } from "../client";
interface WorkflowContext {
	applicantId: number;
	workflowId: number;
	procurementCleared?: boolean;
	aiAnalysisComplete?: boolean;
}
type SanctionsCheckSource = "pre_risk" | "itc_main";
interface SanctionsExecutionResult {
	source: SanctionsCheckSource;
	reused: boolean;
	checkedAt: string;
	riskLevel: SanctionsCheckResult["overall"]["riskLevel"];
	isBlocked: boolean;
	result: SanctionsCheckResult;
}
interface StoredSanctionsPayload {
	source?: SanctionsCheckSource;
	reused?: boolean;
	checkedAt?: string;
	riskLevel?: SanctionsCheckResult["overall"]["riskLevel"];
	isBlocked?: boolean;
	sanctionsResult?: SanctionsCheckResult;
}
⋮----
async function guardKillSwitch(workflowId: number, stepName: string): Promise<void>
async function notifyApplicantDecline(options: {
	applicantId: number;
	workflowId: number;
	subject: string;
	heading: string;
	message: string;
})
function resolveSanctionsEntityType(
	entityType?: string | null
): "INDIVIDUAL" | "COMPANY" | "TRUST" | "OTHER"
⋮----
const runSanctionsForWorkflow = async (
			source: SanctionsCheckSource,
			options?: { allowReuse?: boolean }
): Promise<SanctionsExecutionResult> =>
⋮----
interface ProcurementStreamResult {
			cleared: boolean;
			requiresReview: boolean;
			killSwitchTriggered: boolean;
			stateLockCollision?: boolean;
			reason?: string;
			error?: string;
			result?: Awaited<ReturnType<typeof runProcureCheck>>;
		}
```

## File: inngest/functions/document-aggregator.ts
```typescript
import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import {
	getDocumentRequirements,
	resolveBusinessType,
} from "@/lib/services/document-requirements.service";
import { DocumentTypeSchema } from "@/lib/types";
import { applicants, documents } from "@/db/schema";
import { inngest } from "../client";
```

## File: inngest/steps/database.ts
```typescript
import { updateWorkflowStatus } from "@/lib/services/workflow.service";
import type { WorkflowStatus } from "@/db/schema";
```

## File: inngest/client.ts
```typescript
import { EventSchemas, Inngest } from "inngest";
import type { Events } from "./events";
```

## File: inngest/events.ts
```typescript
import type { DocumentType } from "@/lib/types";
export type FormSubmissionType =
	| "stratcol_agreement"
	| "facility_application"
	| "absa_6995"
	| "fica_documents";
export type DocumentVerificationResult = {
	documentId: number;
	documentType: string;
	status: "verified" | "rejected" | "pending";
	reason?: string;
};
export type Events = {
	"onboarding/lead.created": {
		data: {
			applicantId: number;
			workflowId: number;
		};
	};
	"onboarding/quality-gate-passed": {
		data: {
			workflowId: number;
			approverId: string;
			timestamp: string;
		};
	};
	"onboarding/agent-callback": {
		data: {
			workflowId: number;
			decision: {
				agentId: string;
				outcome: "APPROVED" | "REJECTED";
				reason?: string;
				timestamp: string;
			};
		};
	};
	"onboarding/timeout-resolved": {
		data: {
			workflowId: number;
			action: "retry" | "cancel" | "continue";
			decision?: {
				agentId: string;
				outcome: "APPROVED" | "REJECTED";
				reason?: string;
				timestamp: string;
			};
		};
	};
	"onboarding/quote-generated": {
		data: {
			workflowId: number;
			applicantId: number;
			quote: {
				quoteId: string;
				amount: number;
				terms: string;
			};
		};
	};
	"quote/approved": {
		data: {
			workflowId: number;
			applicantId: number;
			quoteId: number;
			approvedAt: string;
		};
	};
	"quote/rejected": {
		data: {
			workflowId: number;
			applicantId: number;
			quoteId: number;
			reason: string;
			isOverlimit: boolean;
			rejectedBy: string;
			rejectedAt: string;
		};
	};
	"quote/signed": {
		data: {
			workflowId: number;
			applicantId: number;
			quoteId: number;
			signedAt: string;
		};
	};
	"quote/responded": {
		data: {
			workflowId: number;
			applicantId: number;
			quoteId: number;
			decision: "APPROVED" | "DECLINED";
			reason?: string;
			respondedAt: string;
		};
	};
	"quote/feedback.received": {
		data: {
			workflowId: number;
			applicantId: number;
			quoteId: number;
			feedback: {
				accepted: boolean;
				comments?: string;
				requestedChanges?: string[];
			};
			receivedAt: string;
		};
	};
	"workflow/error-resolved": {
		data: {
			workflowId: number;
			action: "retry" | "cancel" | "continue";
			resolvedBy?: string;
		};
	};
	"contract/signed": {
		data: {
			workflowId: number;
			contractUrl?: string;
			signedAt: string;
		};
	};
	"form/submitted": {
		data: {
			workflowId: number;
			applicantId: number;
			formType: string;
			applicantMagiclinkFormId: number;
			submittedAt: string;
		};
	};
	"form/call-centre.submitted": {
		data: {
			workflowId: number;
			applicantId: number;
			submissionId: number;
			submittedAt: string;
		};
	};
	"risk/financial-statements.confirmed": {
		data: {
			workflowId: number;
			applicantId: number;
			confirmedBy: string;
			confirmedAt: string;
		};
	};
	"form/facility.submitted": {
		data: {
			workflowId: number;
			applicantId: number;
			submissionId: number;
			formData: {
				mandateVolume: number;
				mandateType: "EFT" | "DEBIT_ORDER" | "CASH" | "MIXED";
				businessType: string;
				annualTurnover?: number;
			};
			submittedAt: string;
		};
	};
	"sales/evaluation.started": {
		data: {
			workflowId: number;
			applicantId: number;
			startedAt: string;
		};
	};
	"sales/evaluation.issues_found": {
		data: {
			workflowId: number;
			applicantId: number;
			issues: string[];
			flaggedBy: "account_manager" | "ai" | "system";
			requiresPreRiskEvaluation: boolean;
			detectedAt: string;
		};
	};
	"sales/evaluation.approved": {
		data: {
			workflowId: number;
			applicantId: number;
			approvedBy: string;
			approvedAt: string;
		};
	};
	"document/uploaded": {
		data: {
			workflowId: number;
			applicantId: number;
			documentId: number;
			documentType: string;
			category?: string;
			uploadedAt: string;
		};
	};
	"document/processed": {
		data: {
			workflowId: number;
			applicantId: number;
			documentId: number;
			documentType: string;
			status: "processed" | "failed";
			processedAt: string;
		};
	};
	"itc/check.completed": {
		data: {
			workflowId: number;
			applicantId: number;
			result: {
				creditScore: number;
				riskCategory: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
				passed: boolean;
				recommendation:
					| "AUTO_APPROVE"
					| "MANUAL_REVIEW"
					| "AUTO_DECLINE"
					| "ENHANCED_DUE_DILIGENCE";
				referenceNumber?: string;
			};
			timestamp: string;
		};
	};
	"upload/fica.received": {
		data: {
			workflowId: number;
			applicantId: number;
			documents: Array<{
				type: DocumentType;
				filename: string;
				url: string;
				uploadedAt: string;
			}>;
			uploadedBy?: string;
		};
	};
	"fica/analysis.completed": {
		data: {
			workflowId: number;
			applicantId: number;
			analysis: {
				aiTrustScore: number;
				recommendation:
					| "APPROVE"
					| "APPROVE_WITH_CONDITIONS"
					| "MANUAL_REVIEW"
					| "REQUEST_ADDITIONAL_DOCS"
					| "DECLINE";
				riskFlagsCount: number;
				nameMatchVerified: boolean;
				accountMatchVerified: boolean;
				summary: string;
			};
			timestamp: string;
		};
	};
	"risk/decision.received": {
		data: {
			workflowId: number;
			applicantId: number;
			decision: {
				outcome: "APPROVED" | "REJECTED" | "REQUEST_MORE_INFO";
				decidedBy: string;
				reason?: string;
				conditions?: string[];
				timestamp: string;
			};
		};
	};
	"risk/pre-approval.decided": {
		data: {
			workflowId: number;
			applicantId: number;
			decision: {
				outcome: "APPROVED" | "REJECTED";
				decidedBy: string;
				reason?: string;
				requiresPreRiskEvaluation?: boolean;
				timestamp: string;
			};
		};
	};
	"risk/pre-evaluation.decided": {
		data: {
			workflowId: number;
			applicantId: number;
			decision: {
				outcome: "APPROVED" | "REJECTED";
				decidedBy: string;
				reason?: string;
				timestamp: string;
			};
		};
	};
	"risk/procurement.completed": {
		data: {
			workflowId: number;
			applicantId: number;
			procureCheckResult: {
				riskScore: number;
				anomalies: string[];
				recommendedAction: "APPROVE" | "MANUAL_REVIEW" | "DECLINE";
				rawData?: Record<string, unknown>;
			};
			decision: {
				outcome: "CLEARED" | "DENIED";
				decidedBy: string;
				reason?: string;
				timestamp: string;
			};
		};
	};
	"mandate/determined": {
		data: {
			workflowId: number;
			applicantId: number;
			mandateType: "EFT" | "DEBIT_ORDER" | "CASH" | "MIXED";
			requiredDocuments: string[];
			requiresProcurementCheck: boolean;
		};
	};
	"document/mandate.submitted": {
		data: {
			workflowId: number;
			applicantId: number;
			mandateType: "EFT" | "DEBIT_ORDER" | "CASH" | "MIXED";
			documents: Array<{
				documentId: number;
				documentType: string;
				fileName: string;
				uploadedAt: string;
			}>;
			allRequiredDocsReceived: boolean;
		};
	};
	"v24/client.created": {
		data: {
			workflowId: number;
			applicantId: number;
			v24Response: {
				success: boolean;
				clientId?: string;
				v24Reference?: string;
				error?: string;
			};
			timestamp: string;
		};
	};
	"v24/training.scheduled": {
		data: {
			workflowId: number;
			applicantId: number;
			session: {
				sessionId: string;
				scheduledDate: string;
				meetingLink?: string;
			};
		};
	};
	"v24/welcome.sent": {
		data: {
			workflowId: number;
			applicantId: number;
			sentTo: string;
			timestamp: string;
		};
	};
	"onboarding/form-submitted": {
		data: {
			workflowId: number;
			formType: FormSubmissionType;
			submissionId: number;
		};
	};
	"onboarding/forms-complete": {
		data: {
			workflowId: number;
			stage: number;
			formTypes: FormSubmissionType[];
		};
	};
	"onboarding/form-approved": {
		data: {
			workflowId: number;
			formType: FormSubmissionType;
			reviewerId: string;
			timestamp: string;
		};
	};
	"onboarding/form-rejected": {
		data: {
			workflowId: number;
			formType: FormSubmissionType;
			reviewerId: string;
			reason: string;
			timestamp: string;
		};
	};
	"onboarding/documents-submitted": {
		data: {
			workflowId: number;
			documentIds: number[];
		};
	};
	"onboarding/documents-verified": {
		data: {
			workflowId: number;
			verificationResults: DocumentVerificationResult[];
			allPassed: boolean;
		};
	};
	"onboarding/validation-complete": {
		data: {
			workflowId: number;
			applicantId: number;
			validationType: "identity" | "entity" | "risk" | "social";
			passed: boolean;
			details: Record<string, unknown>;
		};
	};
	"onboarding/final-approval.received": {
		data: {
			workflowId: number;
			applicantId: number;
			riskManagerApproval: {
				approvedBy: string;
				timestamp: string;
			};
			accountManagerApproval: {
				approvedBy: string;
				timestamp: string;
			};
			contractSigned: boolean;
			absaFormComplete: boolean;
			notes?: string;
			timestamp: string;
		};
	};
	"onboarding/ai-analysis.completed": {
		data: {
			workflowId: number;
			applicantId: number;
			analysis: {
				bankValidation: {
					verified: boolean;
					accountHolder?: string;
					accountNumber?: string;
					flags: string[];
				};
				sanctionsCheck: {
					passed: boolean;
					matchesFound: number;
					details?: string;
				};
				riskAnalysis: {
					overallScore: number;
					category: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
					flags: string[];
				};
			};
			aggregatedScore: number;
			recommendation: "APPROVE" | "MANUAL_REVIEW" | "DECLINE";
			timestamp: string;
		};
	};
	"workflow/terminated": {
		data: {
			workflowId: number;
			applicantId: number;
			reason:
				| "PROCUREMENT_DENIED"
				| "COMPLIANCE_VIOLATION"
				| "FRAUD_DETECTED"
				| "TIMEOUT_TERMINATION"
				| "MANUAL_TERMINATION";
			decidedBy: string;
			terminatedAt: string;
			notes?: string;
		};
	};
	"workflow/termination-check": {
		data: {
			workflowId: number;
			checkingProcess: string;
		};
	};
	"onboarding/business-type.determined": {
		data: {
			workflowId: number;
			applicantId: number;
			businessType:
				| "NPO"
				| "PROPRIETOR"
				| "COMPANY"
				| "TRUST"
				| "BODY_CORPORATE"
				| "PARTNERSHIP"
				| "CLOSE_CORPORATION";
			requiredDocuments: string[];
			optionalDocuments: string[];
		};
	};
	"document/conditional-request.sent": {
		data: {
			workflowId: number;
			applicantId: number;
			businessType: string;
			documentsRequested: string[];
			sentAt: string;
		};
	};
	"sanction/cleared": {
		data: {
			workflowId: number;
			applicantId: number;
			officerId: string;
			reason: string;
			clearedAt: string;
		};
	};
	"sanction/confirmed": {
		data: {
			workflowId: number;
			applicantId: number;
			officerId: string;
			confirmedAt: string;
		};
	};
	"escalation/tier.changed": {
		data: {
			workflowId: number;
			applicantId: number;
			newTier: number;
			reason: string;
			changedAt: string;
		};
	};
	"agent/validation.completed": {
		data: {
			workflowId: number;
			applicantId: number;
			validationScore: number;
			documentsValidated: number;
			passed: number;
			failed: number;
			recommendation: "PROCEED" | "REVIEW_REQUIRED" | "STOP";
		};
	};
	"agent/risk.completed": {
		data: {
			workflowId: number;
			applicantId: number;
			riskScore: number;
			riskCategory: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
			recommendation: "APPROVE" | "CONDITIONAL_APPROVE" | "MANUAL_REVIEW" | "DECLINE";
			flags: string[];
		};
	};
	"agent/sanctions.completed": {
		data: {
			workflowId: number;
			applicantId: number;
			riskLevel: "CLEAR" | "LOW" | "MEDIUM" | "HIGH" | "BLOCKED";
			passed: boolean;
			isPEP: boolean;
			requiresEDD: boolean;
			adverseMediaCount: number;
		};
	};
	"agent/analysis.aggregated": {
		data: {
			workflowId: number;
			applicantId: number;
			aggregatedScore: number;
			canAutoApprove: boolean;
			requiresManualReview: boolean;
			isBlocked: boolean;
			recommendation:
				| "AUTO_APPROVE"
				| "PROCEED_WITH_CONDITIONS"
				| "MANUAL_REVIEW"
				| "BLOCK";
			flags: string[];
		};
	};
	"quote/needs-update": {
		data: {
			workflowId: number;
			applicantId: number;
			quoteId: number;
			requestedBy: string;
			reason: string;
			requestedAt: string;
		};
	};
	"quote/adjusted": {
		data: {
			workflowId: number;
			applicantId: number;
			quoteId: number;
			adjustedBy: string;
			adjustedAt: string;
		};
	};
	"mandate/verified": {
		data: {
			workflowId: number;
			applicantId: number;
			mandateType: "EFT" | "DEBIT_ORDER" | "CASH" | "MIXED";
			verifiedAt: string;
			retryCount: number;
		};
	};
	"mandate/collection.expired": {
		data: {
			workflowId: number;
			applicantId: number;
			retryCount: number;
			reason: "timeout" | "max_retries";
			expiredAt: string;
		};
	};
	"reporter/analysis.completed": {
		data: {
			workflowId: number;
			applicantId: number;
			report: {
				validationSummary: Record<string, unknown>;
				riskSummary: Record<string, unknown>;
				sanctionsSummary: Record<string, unknown>;
				overallRecommendation:
					| "APPROVE"
					| "CONDITIONAL_APPROVE"
					| "MANUAL_REVIEW"
					| "DECLINE";
				aggregatedScore: number;
				flags: string[];
			};
			completedAt: string;
		};
	};
	"approval/risk-manager.received": {
		data: {
			workflowId: number;
			applicantId: number;
			approvedBy: string;
			decision: "APPROVED" | "REJECTED";
			reason?: string;
			timestamp: string;
		};
	};
	"approval/account-manager.received": {
		data: {
			workflowId: number;
			applicantId: number;
			approvedBy: string;
			decision: "APPROVED" | "REJECTED";
			reason?: string;
			timestamp: string;
		};
	};
	"contract/draft.reviewed": {
		data: {
			workflowId: number;
			applicantId: number;
			reviewedBy: string;
			reviewedAt: string;
			changes?: Record<string, unknown>;
		};
	};
	"form/absa-6995.completed": {
		data: {
			workflowId: number;
			applicantId: number;
			completedAt: string;
		};
	};
	"form/decision.responded": {
		data: {
			workflowId: number;
			applicantId: number;
			formType: "SIGNED_QUOTATION" | "AGREEMENT_CONTRACT" | "CALL_CENTRE_APPLICATION";
			decision: "APPROVED" | "DECLINED";
			reason?: string;
			respondedAt: string;
		};
	};
	"procurement/docs.complete": {
		data: {
			workflowId: number;
			applicantId: number;
			documentsVerified: string[];
			completedAt: string;
		};
	};
	"ai/feedback.divergence_detected": {
		data: {
			workflowId: number;
			applicantId: number;
			feedbackLogId: number;
			divergenceType: "false_positive" | "false_negative" | "severity_mismatch";
			divergenceWeight: number;
			overrideCategory: string;
			overrideSubcategory?: string;
			aiOutcome: string;
			humanOutcome: string;
		};
	};
};
```

## File: inngest/index.ts
```typescript
import { documentAggregator } from "./functions/document-aggregator";
import { controlTowerWorkflow, killSwitchHandler } from "./functions/control-tower-workflow";
```

## File: lib/actions/workflow.actions.ts
```typescript
import { inngest } from "@/inngest/client";
import { getDatabaseClient } from "@/app/utils";
import { internalForms, internalSubmissions, workflows } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { FacilityApplicationForm } from "@/lib/validations/forms";
export async function retryFacilitySubmission(workflowId: number)
```

## File: lib/ai/models.ts
```typescript
import { gateway } from "@ai-sdk/gateway";
export function getThinkingModel()
export function getHighStakesModel()
export function getFastModel()
export function getModel(complexity: "fast" | "thinking" = "thinking")
export function isAIConfigured(): boolean
```

## File: lib/auth/api-auth.ts
```typescript
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
type AuthSuccess = { userId: string };
type BearerAuthSuccess = {
	source: "bearer";
};
type ClerkAuthSuccess = {
	source: "clerk";
	userId: string;
};
export type RequireAuthResult = AuthSuccess | NextResponse;
export type RequireAuthOrBearerResult =
	| ClerkAuthSuccess
	| BearerAuthSuccess
	| NextResponse;
const getAuthTokenFromHeader = (request: Request): string | null =>
const getExpectedToken = (): string | null
export async function requireAuth(): Promise<RequireAuthResult>
export function validateBearerToken(request: Request): boolean
export async function requireAuthOrBearer(
	request: Request
): Promise<RequireAuthOrBearerResult>
```

## File: lib/constants/override-taxonomy.ts
```typescript
export type OverrideCategory = (typeof OVERRIDE_CATEGORIES)[number];
⋮----
export type DivergenceType = (typeof DIVERGENCE_TYPES)[number];
⋮----
export type AiCheckType = (typeof AI_CHECK_TYPES)[number];
export function formatSubcategoryLabel(
	category: OverrideCategory,
	subcategoryValue: string
): string
```

## File: lib/services/agents/contracts/firecrawl-check.contracts.ts
```typescript
import { z } from "zod";
⋮----
export type CheckStatus = z.infer<typeof CheckStatusSchema>;
⋮----
export type RuntimeState = z.infer<typeof RuntimeStateSchema>;
⋮----
export type ConfidenceTier = z.infer<typeof ConfidenceTierSchema>;
⋮----
export type RetryPolicy = z.infer<typeof RetryPolicySchema>;
⋮----
export type MatchType = z.infer<typeof MatchTypeSchema>;
⋮----
export type ApplicantData = z.infer<typeof ApplicantDataSchema>;
⋮----
export type CheckMetadata = z.infer<typeof CheckMetadataSchema>;
⋮----
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;
⋮----
export type FailureDetail = z.infer<typeof FailureDetailSchema>;
⋮----
export type CheckRequestBase = z.infer<typeof CheckRequestBaseSchema>;
⋮----
export type IndustryRegulatorProvider = z.infer<typeof IndustryRegulatorProviderSchema>;
⋮----
export type SanctionsProvider = z.infer<typeof SanctionsProviderSchema>;
⋮----
export type SocialReputationProvider = z.infer<typeof SocialReputationProviderSchema>;
⋮----
export type MediumConfidenceRegulatorProvider = z.infer<
	typeof MediumConfidenceRegulatorProviderSchema
>;
⋮----
export type IndustryRegulatorCheckRequest = z.infer<
	typeof IndustryRegulatorCheckRequestSchema
>;
⋮----
export type IndustryRegulatorCheckResultPayload = z.infer<
	typeof IndustryRegulatorCheckResultPayloadSchema
>;
⋮----
export type IndustryRegulatorCheckResult = z.infer<
	typeof IndustryRegulatorCheckResultSchema
>;
⋮----
export type SanctionsEvidenceEnrichmentRequest = z.infer<
	typeof SanctionsEvidenceEnrichmentRequestSchema
>;
⋮----
export type SanctionsEvidenceEnrichmentResultPayload = z.infer<
	typeof SanctionsEvidenceEnrichmentResultPayloadSchema
>;
⋮----
export type SanctionsEvidenceEnrichmentResult = z.infer<
	typeof SanctionsEvidenceEnrichmentResultSchema
>;
⋮----
export type SocialReputationCheckRequest = z.infer<
	typeof SocialReputationCheckRequestSchema
>;
⋮----
export type SocialReputationCheckResultPayload = z.infer<
	typeof SocialReputationCheckResultPayloadSchema
>;
⋮----
export type SocialReputationCheckResult = z.infer<
	typeof SocialReputationCheckResultSchema
>;
⋮----
export type MediumConfidenceRegulatorCheckRequest = z.infer<
	typeof MediumConfidenceRegulatorCheckRequestSchema
>;
⋮----
export type MediumConfidenceRegulatorCheckResult = z.infer<
	typeof MediumConfidenceRegulatorCheckResultSchema
>;
⋮----
export type ExternalCheckResult = z.infer<typeof ExternalCheckResultSchema>;
```

## File: lib/services/agents/aggregated-analysis.service.ts
```typescript
import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { aiAnalysisLogs, riskAssessments, workflowEvents } from "@/db/schema";
import {
	isFirecrawlConfigured,
	runIndustryRegulatorCheck,
	runSanctionsEnrichmentCheck,
	runSocialReputationCheck,
} from "@/lib/services/firecrawl";
import { generateReporterAnalysis, type ReporterOutput } from "./reporter.agent";
import {
	analyzeFinancialRisk,
	canAutoApprove as canAutoApproveRisk,
	type RiskAnalysisResult,
	requiresManualReview as requiresManualRiskReview,
} from "./risk.agent";
import {
	canAutoApprove as canAutoApproveSanctions,
	isBlocked as isSanctionsBlocked,
	performSanctionsCheck,
	type SanctionsCheckResult,
} from "./sanctions.agent";
import { type BatchValidationResult, validateDocumentsBatch } from "./validation.agent";
export interface AggregatedAnalysisInput {
	workflowId: number;
	applicantId: number;
	applicantData: {
		companyName: string;
		contactName?: string;
		registrationNumber?: string;
		industry?: string;
		countryCode?: string;
		address?: string;
		employeeCount?: number;
	};
	documents?: Array<{
		id: string;
		type: string;
		content: string;
		contentType: "text" | "base64";
	}>;
	bankStatementText?: string;
	directors?: Array<{
		name: string;
		idNumber?: string;
		nationality?: string;
	}>;
	requestedAmount?: number;
	sanctionsOverride?: SanctionsCheckResult;
}
export interface AggregatedAnalysisResult {
	validation?: BatchValidationResult;
	risk?: RiskAnalysisResult;
	sanctions?: SanctionsCheckResult;
	agents: {
		validation: Record<string, unknown>;
		risk: Record<string, unknown>;
		sanctions: Record<string, unknown>;
		reporter?: ReporterOutput;
	};
	scores: {
		validationScore: number;
		riskScore: number;
		sanctionsScore: number;
		aggregatedScore: number;
	};
	overall: {
		canAutoApprove: boolean;
		requiresManualReview: boolean;
		isBlocked: boolean;
		recommendation:
			| "AUTO_APPROVE"
			| "PROCEED_WITH_CONDITIONS"
			| "MANUAL_REVIEW"
			| "BLOCK";
		reasoning: string;
		conditions?: string[];
		flags: string[];
	};
	externalChecks: {
		xdsCreditCheck: { status: "offline" | "live"; result?: Record<string, unknown> };
		lexisNexisProcure: { status: "offline" | "live"; result?: Record<string, unknown> };
		bizPortalRegistration: {
			status: "offline" | "live";
			result?: Record<string, unknown>;
		};
		efs24IdAvsr: { status: "offline" | "live"; result?: Record<string, unknown> };
		sarsVatSearch: { status: "offline" | "live"; result?: Record<string, unknown> };
		industryRegulator: { status: "offline" | "live"; result?: Record<string, unknown> };
		sanctionsEvidenceEnrichment?: {
			status: "offline" | "live";
			result?: Record<string, unknown>;
		};
		socialReputation?: { status: "offline" | "live"; result?: Record<string, unknown> };
	};
	metadata: {
		analysisId: string;
		analyzedAt: string;
		processingTimeMs: number;
		agentsRun: ("validation" | "risk" | "sanctions")[];
	};
}
export async function performAggregatedAnalysis(
	input: AggregatedAnalysisInput
): Promise<AggregatedAnalysisResult>
function createValidationFallback(
	documents: Array<{ id: string; type: string }>
): BatchValidationResult
function createRiskFallback(reason: string): RiskAnalysisResult
function createSanctionsFallback(reason: string): SanctionsCheckResult
function calculateValidationScore(result: BatchValidationResult): number
function calculateSanctionsScore(result: SanctionsCheckResult): number
function generateAggregatedReasoning(
	recommendation: AggregatedAnalysisResult["overall"]["recommendation"],
	risk: RiskAnalysisResult,
	sanctions: SanctionsCheckResult,
	validation: BatchValidationResult | undefined,
	aggregatedScore: number
): string
async function storeAnalysisResult(
	workflowId: number,
	applicantId: number,
	result: AggregatedAnalysisResult,
	promptVersionId: string = "unknown"
): Promise<void>
async function runExternalCheckStubs(
	input: AggregatedAnalysisInput
): Promise<AggregatedAnalysisResult["externalChecks"]>
export async function performQuickCheck(
	applicantId: number,
	workflowId: number,
	companyName: string,
	countryCode: string = "ZA"
): Promise<
```

## File: lib/services/agents/index.ts
```typescript

```

## File: lib/services/agents/reporter.agent.ts
```typescript
import { execSync } from "node:child_process";
import { generateObject } from "ai";
import { z } from "zod";
import { getThinkingModel } from "@/lib/ai/models";
export interface ReporterInput {
	applicantData: {
		companyName: string;
		industry?: string;
	};
	validationSummary: {
		passed: number;
		failed: number;
		total: number;
	};
	riskSummary: {
		score: number;
		category: string;
		flags: string[];
	};
	sanctionsSummary: {
		isBlocked: boolean;
		flags: string[];
	};
	aggregatedScore: number;
}
⋮----
export type ReporterOutput = z.infer<typeof ReporterOutputSchema> & {
	dataSource: string;
};
function getPromptVersionId(): string
export async function generateReporterAnalysis(
	input: ReporterInput
): Promise<ReporterOutput &
```

## File: lib/services/agents/risk.agent.ts
```typescript
import { generateObject } from "ai";
import { z } from "zod";
import { getHighStakesModel } from "@/lib/ai/models";
⋮----
export type RiskAnalysisResult = z.infer<typeof RiskAnalysisResultSchema>;
export interface RiskAnalysisInput {
	bankStatementText?: string;
	applicantId: number;
	workflowId: number;
	requestedAmount?: number;
	applicantData?: {
		companyName?: string;
		industry?: string;
		employeeCount?: number;
		yearsInBusiness?: number;
	};
}
export async function analyzeFinancialRisk(
	input: RiskAnalysisInput
): Promise<RiskAnalysisResult>
function buildRiskPrompt(input: RiskAnalysisInput): string
⋮----
export function canAutoApprove(result: RiskAnalysisResult): boolean
export function requiresManualReview(result: RiskAnalysisResult): boolean
```

## File: lib/services/agents/sanctions.agent.ts
```typescript
import { z } from "zod";
import {
	isFirecrawlConfigured,
	mapCombinedToSanctionsCheckResult,
	runFirecrawlSanctionsSearch,
} from "@/lib/services/firecrawl";
⋮----
function isFirecrawlSanctionsFallbackConfigured(): boolean
interface OpenSanctionsMatchResult {
	id: string;
	caption: string;
	schema: string;
	properties: Record<string, string[]>;
	datasets: string[];
	referents: string[];
	target: boolean;
	first_seen: string;
	last_seen: string;
	last_change: string;
	score: number;
	features: Record<string, number>;
	match: boolean;
}
interface OpenSanctionsQueryResponse {
	status: number;
	results: OpenSanctionsMatchResult[];
	total: { value: number; relation: string };
	query: Record<string, unknown>;
}
interface OpenSanctionsMatchResponse {
	responses: Record<string, OpenSanctionsQueryResponse>;
}
⋮----
export type SanctionsCheckResult = z.infer<typeof SanctionsCheckResultSchema>;
export interface SanctionsCheckInput {
	applicantId: number;
	workflowId: number;
	entityName: string;
	entityType: "INDIVIDUAL" | "COMPANY" | "TRUST" | "OTHER";
	countryCode: string;
	contactName?: string;
	directors?: Array<{
		name: string;
		idNumber?: string;
		nationality?: string;
	}>;
	registrationNumber?: string;
}
export async function performSanctionsCheck(
	input: SanctionsCheckInput
): Promise<SanctionsCheckResult>
⋮----
const formatError = (err: Error | unknown): string
⋮----
function buildOpenSanctionsQueries(
	input: SanctionsCheckInput
): Record<string, Record<string, unknown>>
function scoreToMatchType(score: number): "EXACT" | "PARTIAL" | "FUZZY"
function datasetToFriendlyName(dataset: string): string
function isUnSanctionsDataset(dataset: string): boolean
function isPepDataset(dataset: string): boolean
async function performOpenSanctionsCheck(
	input: SanctionsCheckInput
): Promise<SanctionsCheckResult>
function mapOpenSanctionsResponseToResult(
	input: SanctionsCheckInput,
	data: OpenSanctionsMatchResponse
): SanctionsCheckResult
function generateSanctionsReasoning(
	riskLevel: string,
	unSanctionsMatch: boolean,
	isPEP: boolean,
	hasAdverseMedia: boolean,
	hasWatchListMatch: boolean,
	isHighRiskCountry: boolean
): string
export interface BatchSanctionsInput {
	workflowId: number;
	entities: Array<{
		name: string;
		type: "INDIVIDUAL" | "COMPANY" | "TRUST" | "OTHER";
		idNumber?: string;
	}>;
	countryCode: string;
}
export interface BatchSanctionsResult {
	results: Array<{
		entityName: string;
		result: SanctionsCheckResult;
	}>;
	summary: {
		totalChecked: number;
		cleared: number;
		flagged: number;
		blocked: number;
		overallPassed: boolean;
	};
}
export async function performBatchSanctionsCheck(
	input: BatchSanctionsInput
): Promise<BatchSanctionsResult>
export function canAutoApprove(result: SanctionsCheckResult): boolean
export function isBlocked(result: SanctionsCheckResult): boolean
```

## File: lib/services/agents/validation.agent.ts
```typescript
import { generateObject } from "ai";
import { z } from "zod";
import { AI_CONFIG, getHighStakesModel, isAIConfigured } from "@/lib/ai/models";
⋮----
export type ValidationResult = z.infer<typeof ValidationResultSchema> & {
	dataSource: string;
};
export interface ValidationInput {
	documentType: string;
	documentContent: string;
	contentType: "text" | "base64";
	applicantData?: {
		companyName?: string;
		contactName?: string;
		idNumber?: string;
		registrationNumber?: string;
		address?: string;
		accountNumber?: string;
	};
	workflowId: number;
}
export async function validateDocument(
	input: ValidationInput
): Promise<ValidationResult>
function buildValidationPrompt(input: ValidationInput): string
// ============================================
// Batch Validation
// ============================================
export interface BatchValidationInput {
	documents: Array<{
		id: string;
		type: string;
		content: string;
		contentType: "text" | "base64";
	}>;
	applicantData?: ValidationInput["applicantData"];
	workflowId: number;
}
export interface BatchValidationResult {
	results: Array<{
		documentId: string;
		documentType: string;
		validation: ValidationResult;
	}>;
	summary: {
		totalDocuments: number;
		passed: number;
		requiresReview: number;
		failed: number;
		overallRecommendation: "PROCEED" | "REVIEW_REQUIRED" | "STOP";
	};
}
export async function validateDocumentsBatch(
	input: BatchValidationInput
): Promise<BatchValidationResult>
```

## File: lib/services/firecrawl/checks/industry-regulator.check.ts
```typescript
import type {
	ApplicantData,
	EvidenceItem,
	IndustryRegulatorCheckResult,
	IndustryRegulatorProvider,
} from "@/lib/services/agents/contracts/firecrawl-check.contracts";
import { scrapeWithSchema } from "../firecrawl.client";
import { INDUSTRY_REGULATOR_PROVIDERS, type QueryParams } from "../provider-registry";
⋮----
function resolveProvider(
	industry?: string,
	providerOverride?: IndustryRegulatorProvider
): IndustryRegulatorProvider | null
export interface IndustryRegulatorCheckInput {
	applicantId: number;
	workflowId: number;
	applicantData: ApplicantData;
	industry?: string;
	provider?: IndustryRegulatorProvider;
}
export async function runIndustryRegulatorCheck(
	input: IndustryRegulatorCheckInput
): Promise<IndustryRegulatorCheckResult>
```

## File: lib/services/firecrawl/checks/sanctions-enrichment.check.ts
```typescript
import type {
	ApplicantData,
	EvidenceItem,
	SanctionsEvidenceEnrichmentResult,
	SanctionsProvider,
} from "@/lib/services/agents/contracts/firecrawl-check.contracts";
import { scrapeWithSchema } from "../firecrawl.client";
import { type QueryParams, SANCTIONS_PROVIDERS } from "../provider-registry";
type DeepLink = { label: string; url: string; source: string };
⋮----
export interface SanctionsEnrichmentCheckInput {
	applicantId: number;
	workflowId: number;
	applicantData: ApplicantData;
	entityName: string;
	entityType: "INDIVIDUAL" | "COMPANY" | "TRUST" | "OTHER";
	countryCode: string;
	registrationNumber?: string;
}
export async function runSanctionsEnrichmentCheck(
	input: SanctionsEnrichmentCheckInput
): Promise<SanctionsEvidenceEnrichmentResult>
```

## File: lib/services/firecrawl/checks/sanctions-list-fic.ts
```typescript
import { z } from "zod";
import { agentWithSchema } from "../firecrawl.client";
⋮----
export type FICTFSMatch = z.infer<typeof FICTFSMatchSchema>;
export type FICTFSSanctionsSearchResult = z.infer<typeof FICTFSSanctionsSearchSchema>;
⋮----
export async function searchFICTFSSanctionsList(
	searchTerms: string[]
): Promise<FICTFSSanctionsSearchResult>
```

## File: lib/services/firecrawl/checks/sanctions-list-ofac.ts
```typescript
import { z } from "zod";
import { agentWithSchema } from "../firecrawl.client";
⋮----
export type OFACMatch = z.infer<typeof OFACMatchSchema>;
export type OFACSanctionsSearchResult = z.infer<typeof OFACSanctionsSearchSchema>;
⋮----
export async function searchOFACSanctionsList(
	searchTerms: string[]
): Promise<OFACSanctionsSearchResult>
```

## File: lib/services/firecrawl/checks/sanctions-list-search.ts
```typescript
import type {
	SanctionsCheckInput,
	SanctionsCheckResult,
} from "@/lib/services/agents/sanctions.agent";
import { searchFICTFSSanctionsList } from "./sanctions-list-fic";
import { searchOFACSanctionsList } from "./sanctions-list-ofac";
import { searchUNSanctionsList } from "./sanctions-list-un";
export interface FirecrawlSanctionsSearchInput {
	entityName: string;
	contactName?: string;
	directors?: Array<{ name: string }>;
}
export interface CombinedSanctionsResult {
	un: { individuals: unknown[]; entities: unknown[] };
	ofac: { matchesFound: boolean; matches: unknown[] };
	fic: { matchesFound: boolean; matches: unknown[] };
	hasBlockingMatch: boolean;
}
function buildSearchTerms(input: FirecrawlSanctionsSearchInput): string[]
export async function runFirecrawlSanctionsSearch(
	input: FirecrawlSanctionsSearchInput
): Promise<CombinedSanctionsResult>
export function mapCombinedToSanctionsCheckResult(
	combined: CombinedSanctionsResult,
	input: SanctionsCheckInput
): SanctionsCheckResult
```

## File: lib/services/firecrawl/checks/sanctions-list-un.ts
```typescript
import { z } from "zod";
import { agentWithSchema } from "../firecrawl.client";
⋮----
export type UNIndividualMatch = z.infer<typeof UNIndividualSchema>;
export type UNEntityMatch = z.infer<typeof UNEntitySchema>;
export type UNSanctionsSearchResult = z.infer<typeof UNSanctionsSearchSchema>;
⋮----
export async function searchUNSanctionsList(
	searchTerms: string[]
): Promise<UNSanctionsSearchResult>
```

## File: lib/services/firecrawl/checks/social-reputation.check.ts
```typescript
import type {
	ApplicantData,
	EvidenceItem,
	SocialReputationCheckResult,
} from "@/lib/services/agents/contracts/firecrawl-check.contracts";
import { scrapeWithSchema } from "../firecrawl.client";
import { type QueryParams, SOCIAL_REPUTATION_PROVIDERS } from "../provider-registry";
export interface SocialReputationCheckInput {
	applicantId: number;
	workflowId: number;
	applicantData: ApplicantData;
}
export async function runSocialReputationCheck(
	input: SocialReputationCheckInput
): Promise<SocialReputationCheckResult>
```

## File: lib/services/firecrawl/firecrawl.client.ts
```typescript
import Firecrawl from "@mendable/firecrawl-js";
import type { z } from "zod";
import type {
	FailureDetail,
	RuntimeState,
} from "@/lib/services/agents/contracts/firecrawl-check.contracts";
⋮----
export interface ScrapeOptions<T extends z.ZodType> {
	url: string;
	schema: T;
	prompt?: string;
	timeoutMs?: number;
}
export interface ScrapeResult<T> {
	success: boolean;
	data: T | null;
	runtimeState: RuntimeState;
	failureDetail?: FailureDetail;
	latencyMs: number;
	sourceUrl: string;
}
⋮----
function getClient(): Firecrawl
export async function scrapeWithSchema<T extends z.ZodType>(
	options: ScrapeOptions<T>
): Promise<ScrapeResult<z.infer<T>>>
export interface AgentOptions<T extends z.ZodType> {
	prompt: string;
	schema: T;
	urls?: string[];
	model?: "spark-1-mini" | "spark-1-pro";
	timeoutMs?: number;
}
export async function agentWithSchema<T extends z.ZodType>(
	options: AgentOptions<T>
): Promise<ScrapeResult<z.infer<T>>>
export function isFirecrawlConfigured(): boolean
```

## File: lib/services/firecrawl/index.ts
```typescript

```

## File: lib/services/firecrawl/provider-registry.ts
```typescript
import { z } from "zod";
import type {
	IndustryRegulatorProvider,
	SanctionsProvider,
	SocialReputationProvider,
} from "@/lib/services/agents/contracts/firecrawl-check.contracts";
export interface ProviderConfig {
	buildUrl: (params: QueryParams) => string;
	extractionSchema: z.ZodType;
	prompt: string;
	ttlDays: number;
}
export interface QueryParams {
	companyName: string;
	registrationNumber?: string;
	contactName?: string;
	industry?: string;
}
⋮----
function enc(s: string): string
```

## File: lib/services/agent-stats.ts
```typescript
import { and, desc, eq, like, sql } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { quotes, workflowEvents } from "@/db/schema";
export interface AgentStats {
	callbackCount: number;
	errorCount: number;
	lastCallbackAt?: Date;
}
export async function getRiskAgentStats(): Promise<AgentStats>
export async function getQuoteAgentStats(): Promise<AgentStats>
```

## File: lib/services/divergence.service.ts
```typescript
import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { aiFeedbackLogs, riskAssessments } from "@/db/schema";
import { inngest } from "@/inngest/client";
import type {
	AiCheckType,
	DivergenceType,
	OverrideCategory,
} from "@/lib/constants/override-taxonomy";
interface DivergenceResult {
	isDivergent: boolean;
	divergenceWeight: number;
	divergenceType: DivergenceType | null;
}
interface RecordFeedbackInput {
	workflowId: number;
	applicantId: number;
	humanOutcome: "APPROVED" | "REJECTED" | "REQUEST_MORE_INFO";
	overrideCategory: OverrideCategory;
	overrideSubcategory?: string;
	overrideDetails?: string;
	decidedBy: string;
	relatedFailureEventId?: number;
}
interface AiAnalysisSnapshot {
	aiOutcome: string;
	aiConfidence: number | null;
	aiCheckType: AiCheckType;
}
export function computeDivergence(
	aiOutcome: string,
	humanOutcome: string,
	aiConfidence: number | null
): DivergenceResult
export async function recordFeedbackLog(input: RecordFeedbackInput): Promise<
function normalizeOutcome(outcome: string): "approve" | "reject" | "review"
async function getAiAnalysisSnapshot(
	db: ReturnType<typeof getDatabaseClient>,
	applicantId: number
): Promise<AiAnalysisSnapshot>
```

## File: lib/services/document-quality.service.ts
```typescript
export interface DocumentQualityResult {
	ok: boolean;
	reasons: string[];
	warnings: string[];
}
export function evaluateDocumentQuality(
	fileName: string,
	mimeType: string,
	buffer: Buffer,
	options?: { enforceRecency?: boolean }
): DocumentQualityResult
function estimateEntropy(buffer: Buffer): number
function getImageDimensions(
	mimeType: string,
	buffer: Buffer
):
function getPngDimensions(buffer: Buffer):
function getJpegDimensions(buffer: Buffer):
function getWebpDimensions(buffer: Buffer):
function extractDateFromFileName(fileName: string): Date | null
```

## File: lib/services/document-requirements.service.ts
```typescript
import { z } from "zod";
⋮----
export type BusinessType = z.infer<typeof BusinessTypeSchema>;
⋮----
export type DocumentCategory = z.infer<typeof DocumentCategorySchema>;
export interface DocumentRequirement {
	id: string;
	name: string;
	description: string;
	category: DocumentCategory;
	required: boolean;
	acceptedFormats: string[];
	maxSizeMB: number;
	expiryMonths?: number;
}
export interface MandateDocumentRequirements {
	businessType: BusinessType;
	totalRequired: number;
	totalOptional: number;
	documents: DocumentRequirement[];
}
⋮----
export function resolveBusinessType(
	entityType?: string | null,
	businessType?: BusinessType | string | null
): BusinessType
export function getDocumentRequirements(
	businessType: BusinessType,
	industry?: string
): MandateDocumentRequirements
function getBusinessTypeRequirements(
	businessType: BusinessType
): DocumentRequirement[]
export function validateDocumentCompleteness(
	businessType: BusinessType,
	uploadedDocumentIds: string[],
	industry?: string
):
export function getRequirementsSummary(businessType: BusinessType):
export function determineBusinessType(
	facilityData: Record<string, unknown>
): BusinessType
```

## File: lib/services/email.service.tsx
```typescript
import { render } from "@react-email/render";
import { Resend } from "resend";
import ApplicantFormLinks, {
	type FormLink,
	type RequiredDocumentSummary,
} from "@/components/emails/ApplicantFormLinks";
import InternalAlert from "@/components/emails/InternalAlert";
⋮----
type EmailResult =
	| { success: true; messageId: string }
	| { success: false; error: string };
export async function sendInternalAlertEmail(params: {
	title: string;
	message: string;
	workflowId: number;
	applicantId: number;
	type?: "info" | "warning" | "error" | "success";
	details?: Record<string, unknown>;
	quoteDetails?: {
		amount?: number;
		baseFeePercent?: number;
		adjustedFeePercent?: number | null;
		rationale?: string | null;
		riskFactors?: string | string[] | null;
		generatedAt?: string | null;
	};
	actionUrl?: string;
	approveUrl?: string;
}): Promise<EmailResult>
export async function sendApplicantFormLinksEmail(params: {
	email: string;
	contactName?: string;
	links: FormLink[];
	requiredDocuments?: RequiredDocumentSummary[];
}): Promise<EmailResult>
export async function sendApplicantStatusEmail(params: {
	email: string;
	subject: string;
	heading: string;
	message: string;
}): Promise<EmailResult>
```

## File: lib/services/experian.types.ts
```typescript
export interface ExperianTokenResponse {
	access_token: string;
	token_type: "Bearer";
	expires_in: number;
	scope: string;
}
export interface ExperianBusinessCreditRequest {
	registrationNumber: string;
	country: "ZA";
	companyName?: string;
}
export interface ExperianBusinessCreditResponse {
	requestId: string;
	business: ExperianBusinessInfo;
	creditProfile: ExperianCreditProfile;
	adverseListings: ExperianAdverseListing[];
	tradePayments?: ExperianTradePayment[];
	generatedAt: string;
}
export interface ExperianBusinessInfo {
	registrationNumber: string;
	name: string;
	tradingName?: string;
	registrationDate?: string;
	status: "Active" | "Deregistered" | "In Liquidation" | "Unknown";
	industryCode?: string;
	vatNumber?: string;
}
export interface ExperianCreditProfile {
	score: number;
	scoreBand: "Very Low" | "Low" | "Medium" | "Good" | "Excellent";
	riskCategory: "Very High" | "High" | "Medium" | "Low" | "Very Low";
	probabilityOfDefault: number;
	recommendedCreditLimit?: number;
	avgDaysBeyondTerms?: number;
	scoreFactors?: ExperianScoreFactor[];
}
export interface ExperianScoreFactor {
	code: string;
	description: string;
	impact: "positive" | "negative" | "neutral";
}
export interface ExperianAdverseListing {
	type: "Judgment" | "Default" | "Administration" | "Sequestration" | "Deregistration";
	amount: number;
	date: string;
	creditor?: string;
	referenceNumber?: string;
	status: "Active" | "Paid" | "Rescinded";
}
export interface ExperianTradePayment {
	creditor: string;
	creditLimit: number;
	currentBalance: number;
	paymentStatus: "Current" | "30 Days" | "60 Days" | "90 Days" | "120+ Days";
	lastPaymentDate?: string;
}
export interface ExperianErrorResponse {
	error: {
		code: string;
		message: string;
		details?: string;
	};
}
export function mapExperianScore(experianScore: number): number
export function mapExperianRiskCategory(
	category: ExperianCreditProfile["riskCategory"]
): "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH"
```

## File: lib/services/fica-ai.service.ts
```typescript
import { generateText, Output } from "ai";
import { AI_CONFIG, getThinkingModel, isAIConfigured } from "@/lib/ai/models";
import {
	type AccountantLetterAnalysis,
	AccountantLetterAnalysisSchema,
	AI_TRUST_THRESHOLDS,
	type FacilityApplication,
	type FicaDocumentAnalysis,
	FicaDocumentAnalysisSchema,
} from "@/lib/types";
export interface AnalyzeBankStatementOptions {
	content: string;
	contentType: "base64" | "text";
	facilityApplication?: Partial<FacilityApplication>;
	workflowId: number;
}
export interface AnalyzeAccountantLetterOptions {
	content: string;
	contentType: "base64" | "text";
	facilityApplication?: Partial<FacilityApplication>;
	workflowId: number;
}
export async function analyzeBankStatement(
	options: AnalyzeBankStatementOptions
): Promise<FicaDocumentAnalysis>
async function analyzeWithAI(
	content: string,
	contentType: "base64" | "text",
	facilityApplication?: Partial<FacilityApplication>
): Promise<FicaDocumentAnalysis>
// ============================================
// Accountant Letter Analysis
// ============================================
/**
 * Analyze an accountant letter using AI
 */
export async function analyzeAccountantLetter(
	options: AnalyzeAccountantLetterOptions
): Promise<AccountantLetterAnalysis>
/**
 * Analyze accountant letter with real AI
 */
async function analyzeAccountantLetterWithAI(
	content: string,
	contentType: "base64" | "text",
	facilityApplication?: Partial<FacilityApplication>
): Promise<AccountantLetterAnalysis>
export function canAutoApprove(_analysis: FicaDocumentAnalysis): boolean
export function requiresManualReview(analysis: FicaDocumentAnalysis): boolean
export function calculateCombinedRiskScore(
	bankAnalysis: FicaDocumentAnalysis,
	accountantAnalysis?: AccountantLetterAnalysis
): number
```

## File: lib/services/form-link.service.ts
```typescript
import { createFormInstance } from "@/lib/services/form.service";
import { sendApplicantFormLinksEmail } from "@/lib/services/email.service";
import type { FormType } from "@/lib/types";
export interface FormLink {
	formType: FormType;
	url: string;
}
export interface FormLinkBundle {
	links: FormLink[];
}
export async function generateFormLinks(options: {
	applicantId: number;
	workflowId: number;
})
export async function sendFormLinksEmail(options: {
	email: string;
	contactName?: string;
	links: FormLink[];
})
```

## File: lib/services/form.service.ts
```typescript
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { applicantMagiclinkForms, applicantSubmissions } from "@/db/schema";
import type { FormDecisionOutcome, FormInstanceStatus, FormType } from "@/lib/types";
interface CreateFormInstanceOptions {
	applicantId: number;
	workflowId?: number;
	formType: FormType;
	expiresInDays?: number;
}
interface CreateFormInstanceResult {
	id: number;
	token: string;
}
⋮----
export function hashToken(token: string)
export async function createFormInstance(
	options: CreateFormInstanceOptions
): Promise<CreateFormInstanceResult>
export async function getFormInstanceByToken(token: string)
export async function markFormInstanceStatus(
	formInstanceId: number,
	status: FormInstanceStatus
)
export async function recordFormSubmission(options: {
	applicantMagiclinkFormId: number;
	applicantId: number;
	workflowId?: number | null;
	formType: FormType;
	data: Record<string, unknown>;
	submittedBy?: string;
})
export async function recordFormDecision(options: {
	formInstanceId: number;
	outcome: FormDecisionOutcome;
	reason?: string;
})
```

## File: lib/services/itc.service.ts
```typescript
import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { applicants } from "@/db/schema";
import { ITC_THRESHOLDS, type ITCCheckResult } from "@/lib/types";
import {
	type ExperianBusinessCreditResponse,
	type ExperianTokenResponse,
	mapExperianRiskCategory,
	mapExperianScore,
} from "./experian.types";
⋮----
export interface ITCCheckOptions {
	applicantId: number;
	workflowId: number;
	registrationNumber?: string;
}
export async function performITCCheck(options: ITCCheckOptions): Promise<ITCCheckResult>
function createManualRequiredResult(
	applicantId: number,
	reason: string,
	source: "experian" | "configuration" | "registration_data"
): ITCCheckResult
function isExperianConfigured(): boolean
async function getExperianToken(): Promise<string>
async function performExperianCheck(
	registrationNumber: string,
	applicantId: number
): Promise<ITCCheckResult>
function extractRegistrationNumber(applicantData: {
	registrationNumber?: string | null;
	notes?: string | null;
}): string | null
function _categorizeRisk(score: number): "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH"
function getRecommendation(
	score: number
): "AUTO_APPROVE" | "MANUAL_REVIEW" | "AUTO_DECLINE" | "ENHANCED_DUE_DILIGENCE"
type SerializedITCResult = {
	creditScore: number;
	recommendation:
		| "AUTO_APPROVE"
		| "MANUAL_REVIEW"
		| "AUTO_DECLINE"
		| "ENHANCED_DUE_DILIGENCE";
};
export function canAutoApprove(result: SerializedITCResult): boolean
export function requiresManualReview(result: SerializedITCResult): boolean
export function shouldAutoDecline(result: SerializedITCResult): boolean
```

## File: lib/services/kill-switch.service.ts
```typescript
import { and, eq, inArray } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import {
	applicantMagiclinkForms,
	applicants,
	notifications,
	workflowEvents,
	workflows,
} from "@/db/schema";
import { inngest } from "@/inngest/client";
import { sendInternalAlertEmail } from "./email.service";
import { escalateToManagement } from "./notification.service";
import { acquireStateLock } from "./state-lock.service";
export type KillSwitchReason =
	| "PROCUREMENT_DENIED"
	| "COMPLIANCE_VIOLATION"
	| "FRAUD_DETECTED"
	| "TIMEOUT_TERMINATION"
	| "MANUAL_TERMINATION";
export interface KillSwitchResult {
	success: boolean;
	workflowId: number;
	terminatedAt: Date;
	reason: KillSwitchReason;
	affectedResources: {
		formsRevoked: number;
		notificationsSent: number;
	};
	error?: string;
}
export interface KillSwitchInput {
	workflowId: number;
	applicantId: number;
	reason: KillSwitchReason;
	decidedBy: string;
	notes?: string;
}
export async function executeKillSwitch(
	input: KillSwitchInput
): Promise<KillSwitchResult>
export async function isWorkflowTerminated(workflowId: number): Promise<boolean>
async function revokeAllPendingForms(
	db: NonNullable<ReturnType<typeof getDatabaseClient>>,
	applicantId: number,
	_workflowId: number
): Promise<number>
function getReasonMessage(reason: KillSwitchReason): string
⋮----
export interface WorkflowTerminatedEventData {
	workflowId: number;
	applicantId: number;
	reason: KillSwitchReason;
	decidedBy: string;
	terminatedAt: string;
}
```

## File: lib/services/notification-events.service.ts
```typescript
import { and, eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { notifications, workflowEvents } from "@/db/schema";
import type { NotificationSeverity } from "@/db/schema";
export interface CreateNotificationParams {
	workflowId: number;
	applicantId: number;
	type:
		| "awaiting"
		| "completed"
		| "failed"
		| "timeout"
		| "paused"
		| "error"
		| "warning"
		| "success"
		| "info"
		| "terminated";
	title: string;
	message: string;
	actionable?: boolean;
	errorDetails?: object;
	severity?: NotificationSeverity;
	groupKey?: string;
}
export interface LogEventParams {
	workflowId: number;
	eventType:
		| "stage_change"
		| "agent_dispatch"
		| "agent_callback"
		| "human_override"
		| "timeout"
		| "error"
		| "risk_check_completed"
		| "itc_check_completed"
		| "quote_generated"
		| "quote_sent"
		| "quote_adjusted"
		| "quote_needs_update"
		| "mandate_determined"
		| "mandate_verified"
		| "mandate_retry"
		| "mandate_collection_expired"
		| "procurement_check_completed"
		| "procurement_decision"
		| "ai_analysis_completed"
		| "reporter_analysis_completed"
		| "v24_integration_completed"
		| "workflow_completed"
		| "kill_switch_executed"
		| "kill_switch_handled"
		| "business_type_determined"
		| "documents_requested"
		| "validation_completed"
		| "sanctions_completed"
		| "sanction_cleared"
		| "risk_analysis_completed"
		| "risk_manager_review"
		| "financial_statements_confirmed"
		| "contract_draft_reviewed"
		| "contract_signed"
		| "absa_form_completed"
		| "two_factor_approval_risk_manager"
		| "two_factor_approval_account_manager"
		| "final_approval"
		| "management_escalation"
		| "stale_data_flagged"
		| "state_lock_acquired";
	payload: object;
	actorType?: "user" | "agent" | "platform";
	actorId?: string;
}
export async function createWorkflowNotification(
	params: CreateNotificationParams
): Promise<void>
export async function logWorkflowEvent(params: LogEventParams): Promise<void>
```

## File: lib/services/notification.service.ts
```typescript
import { getDatabaseClient } from "@/app/utils";
import { applicants, notifications, workflowEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendInternalAlertEmail } from "./email.service";
export interface DispatchPayload {
	applicantId: number;
	workflowId: number;
	riskScore: number;
	anomalies: string[];
	documentLinks?: string[];
}
export async function dispatchToPlatform(
	payload: DispatchPayload,
): Promise<void>
export interface EscalationPayload {
	workflowId: number;
	applicantId: number;
	reason: string;
	escalationType?: "kill_switch" | "timeout" | "compliance" | "manual" | "retry_exhausted";
	severity?: "info" | "warning" | "critical";
}
export async function escalateToManagement(
	payload: EscalationPayload,
): Promise<void>
```

## File: lib/services/pdf-extract.service.ts
```typescript
export interface PDFExtractionResult {
	text: string;
	pages: number;
	metadata?: {
		title?: string;
		author?: string;
		creationDate?: string;
	};
	success: boolean;
	error?: string;
}
export function preparePDFForAI(pdfBuffer: Buffer): PDFExtractionResult
export function extractTextFromBase64PDF(
	base64Content: string,
): PDFExtractionResult
export function cleanExtractedText(text: string): string
⋮----
// Normalize line breaks
⋮----
export function extractBankStatementSections(text: string):
```

## File: lib/services/quote.service.ts
```typescript
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { applicants, quotes } from "@/db/schema";
import { AI_CONFIG, getThinkingModel, isAIConfigured } from "@/lib/ai/models";
import type { QuoteGenerationResult } from "@/lib/validations/quotes";
import { quoteGenerationSchema } from "@/lib/validations/quotes";
type ApplicantRow = typeof applicants.$inferSelect;
export interface Quote {
	quoteId: string;
	amount: number;
	baseFeePercent: number;
	adjustedFeePercent?: number | null;
	rationale?: string | null;
	details?: string | null;
	terms?: string;
}
export interface QuoteResult {
	success: boolean;
	quote?: Quote;
	error?: string;
	recoverable?: boolean;
	async?: boolean;
}
export async function generateQuote(
	applicantId: number,
	workflowId: number
): Promise<QuoteResult>
async function generateQuoteWithAI(
	applicantData: ApplicantRow,
	_workflowId: number
): Promise<QuoteGenerationResult>
async function notifyQuoteGenerated({
	applicantId,
	workflowId,
	companyName,
	quote,
}: {
	applicantId: number;
	workflowId: number;
	companyName: string;
	quote: Quote;
})
```

## File: lib/services/reporting.service.ts
```typescript
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { aiAnalysisLogs } from "@/db/schema";
export interface AgreementReport {
	period: {
		start: Date;
		end: Date;
	};
	summary: {
		totalEvaluations: number;
		totalOverrides: number;
		agreementRate: number;
	};
	overridesByReason: {
		context: number;
		hallucination: number;
		dataError: number;
	};
	promptPerformance: Record<
		string,
		{
			evaluations: number;
			overrides: number;
			agreementRate: number;
		}
	>;
	detailedOverrides: Array<{
		workflowId: number;
		applicantId: number;
		promptVersionId: string | null;
		overrideReason: string | null;
		confidenceScore: number | null;
		createdAt: Date;
	}>;
}
export async function generateWeeklyAgreementReport(
	startDate: Date,
	endDate: Date
): Promise<AgreementReport>
```

## File: lib/services/risk.service.ts
```typescript
import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { applicants } from "@/db/schema";
import { createTestVendor, getVendorResults } from "@/lib/procurecheck";
export interface RiskResult {
	riskScore: number;
	anomalies: string[];
	recommendedAction: string;
	procureCheckId?: string;
	procureCheckData?: Record<string, unknown>;
}
export async function analyzeRisk(applicantId: number): Promise<RiskResult>
```

## File: lib/services/state-lock.service.ts
```typescript
import { eq, sql } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { documents, workflows } from "@/db/schema";
import { type LogEventParams, logWorkflowEvent } from "./notification-events.service";
export class StateCollisionError extends Error
⋮----
constructor(workflowId: number, expectedVersion: number, actualVersion: number)
⋮----
export interface StateLockInfo {
	isLocked: boolean;
	version: number;
	lockedAt: Date | null;
	lockedBy: string | null;
}
export interface StaleDataRecord {
	workflowId: number;
	source: string;
	reason: string;
	purgedDocumentIds?: number[];
	markedStaleAt: string;
}
export async function acquireStateLock(
	workflowId: number,
	actor: string
): Promise<number>
export async function getStateLockInfo(workflowId: number): Promise<StateLockInfo>
export async function guardStateCollision(
	workflowId: number,
	expectedVersion: number
): Promise<void>
export async function markStaleData(
	workflowId: number,
	source: string,
	reason: string
): Promise<StaleDataRecord>
export async function handleStateCollision(
	workflowId: number,
	source: string,
	discardedData: Record<string, unknown>
): Promise<void>
```

## File: lib/services/v24.service.ts
```typescript
import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { applicants } from "@/db/schema";
import {
	type MandateType,
	type TrainingSession,
	type V24Response,
	V24ResponseSchema,
} from "@/lib/types";
export interface CreateClientOptions {
	applicantId: number;
	workflowId: number;
	mandateType: MandateType;
	approvedVolume: number;
	feePercent: number;
}
export interface ScheduleTrainingOptions {
	email: string;
	clientName: string;
	preferredDate?: Date;
}
export interface WelcomePackOptions {
	email: string;
	clientName: string;
	v24Reference: string;
	portalUrl: string;
	temporaryPassword?: string;
}
export async function createV24ClientProfile(
	options: CreateClientOptions
): Promise<V24Response>
export async function scheduleTrainingSession(
	options: ScheduleTrainingOptions
): Promise<TrainingSession>
export async function sendWelcomePack(
	options: WelcomePackOptions
): Promise<
function generateWelcomeEmailHtml(options: {
	clientName: string;
	v24Reference: string;
	portalUrl: string;
	temporaryPassword?: string;
}): string
function _getNextBusinessDay(): Date
export function generateTemporaryPassword(): string
```

## File: lib/services/workflow.service.ts
```typescript
import { getDatabaseClient } from "@/app/utils";
import { workflows, type WorkflowStatus } from "@/db/schema";
import { eq } from "drizzle-orm";
export async function updateWorkflowStatus(
	workflowId: number,
	status: WorkflowStatus,
	stage: number,
): Promise<void>
```

## File: lib/validations/onboarding/absa-6995.ts
```typescript
import { z } from "zod";
import {
	addressSchema,
	directorSchema,
	referenceSchema,
	phoneNumberSchema,
	emailSchema,
	websiteSchema,
	registrationNumberSchema,
	branchCodeSchema,
	accountNumberSchema,
	percentageSchema,
	signatureSchema,
	optionalString,
} from "./common";
⋮----
export type ApplicationTypeValue = (typeof ApplicationType)[keyof typeof ApplicationType];
⋮----
export type SalesDistributionValue =
	(typeof SalesDistribution)[keyof typeof SalesDistribution];
⋮----
export type ExitReasonValue = (typeof ExitReason)[keyof typeof ExitReason];
⋮----
export type SectionA = z.infer<typeof sectionASchema>;
⋮----
export type ComplianceHistory = z.infer<typeof complianceHistorySchema>;
⋮----
export type BureauDetails = z.infer<typeof bureauDetailsSchema>;
⋮----
export type SectionC = z.infer<typeof sectionCSchema>;
⋮----
export type Absa6995FormData = z.infer<typeof absa6995Schema>;
⋮----
export const getAbsa6995DefaultValues = (): Partial<Absa6995FormData> => (
```

## File: lib/validations/onboarding/common.ts
```typescript
import { z } from "zod";
⋮----
export type Address = z.infer<typeof addressSchema>;
⋮----
export type Director = z.infer<typeof directorSchema>;
⋮----
export type BankingDetails = z.infer<typeof bankingDetailsSchema>;
⋮----
export type Signature = z.infer<typeof signatureSchema>;
⋮----
export type Reference = z.infer<typeof referenceSchema>;
export function optionalString()
/**
 * Create a percentage field (0-100)
 */
export function percentageSchema(fieldName: string)
/**
 * Create a currency amount field
 */
export function currencySchema(fieldName: string)
```

## File: lib/validations/onboarding/facility-application.ts
```typescript
import { z } from "zod";
import { currencySchema, optionalString, saIdNumberSchema } from "./common";
⋮----
export type ServiceTypeValue = (typeof ServiceType)[keyof typeof ServiceType];
⋮----
export type AdditionalServiceValue =
	(typeof AdditionalService)[keyof typeof AdditionalService];
⋮----
export type FacilitySelection = z.infer<typeof facilitySelectionSchema>;
⋮----
export type VolumeMetrics = z.infer<typeof volumeMetricsSchema>;
⋮----
export type FacilityApplicationFormData = z.infer<typeof facilityApplicationSchema>;
```

## File: lib/validations/onboarding/fica-documents.ts
```typescript
import { z } from "zod";
⋮----
export type DocumentCategoryValue =
	(typeof DocumentCategory)[keyof typeof DocumentCategory];
⋮----
export type DocumentType =
	| (typeof StandardDocumentType)[keyof typeof StandardDocumentType]
	| (typeof IndividualDocumentType)[keyof typeof IndividualDocumentType]
	| (typeof FinancialDocumentType)[keyof typeof FinancialDocumentType]
	| (typeof ProfessionalDocumentType)[keyof typeof ProfessionalDocumentType]
	| (typeof IndustryDocumentType)[keyof typeof IndustryDocumentType];
⋮----
export type DocumentUploadItem = z.infer<typeof documentUploadItemSchema>;
⋮----
export type FicaDocumentsFormData = z.infer<typeof ficaDocumentsSchema>;
⋮----
export interface DocumentRequirement {
	type: DocumentType;
	label: string;
	description: string;
	category: DocumentCategoryValue;
	required: boolean;
	acceptedFormats: string[];
	maxSizeMb: number;
}
⋮----
export const getFicaDocumentsDefaultValues = (): Partial<FicaDocumentsFormData> => (
```

## File: lib/validations/onboarding/index.ts
```typescript

```

## File: lib/validations/onboarding/stratcol-agreement.ts
```typescript
import { z } from "zod";
import {
	addressSchema,
	bankingDetailsSchema,
	registrationNumberSchema,
	saIdNumberSchema,
	signatureSchema,
} from "./common";
⋮----
export type EntityTypeValue = (typeof EntityType)[keyof typeof EntityType];
⋮----
export type BeneficialOwner = z.infer<typeof beneficialOwnerSchema>;
⋮----
export type AuthorisedRepresentative = z.infer<typeof authorisedRepresentativeSchema>;
⋮----
export type EntityDetails = z.infer<typeof entityDetailsSchema>;
⋮----
export type SignatoryAndOwners = z.infer<typeof signatoryAndOwnersSchema>;
⋮----
export type BankingAndMandates = z.infer<typeof bankingAndMandatesSchema>;
⋮----
export type StratcolAgreementFormData = z.infer<typeof stratcolAgreementSchema>;
```

## File: lib/validations/forms.ts
```typescript
import { z } from "zod";
⋮----
export type FacilityApplicationForm = z.infer<typeof facilityApplicationSchema>;
⋮----
export type StratcolAgreementForm = z.infer<typeof stratcolAgreementSchema>;
⋮----
export type SignedQuotationForm = z.infer<typeof signedQuotationSchema>;
⋮----
export type Absa6995Form = z.infer<typeof absa6995Schema>;
⋮----
export type CallCentreApplicationForm = z.infer<typeof callCentreApplicationSchema>;
```

## File: lib/validations/inngest-events.ts
```typescript
import { z } from "zod";
⋮----
export type OnboardingLeadCreated = z.infer<typeof OnboardingLeadCreatedSchema>;
⋮----
export type WorkflowTerminated = z.infer<typeof WorkflowTerminatedSchema>;
⋮----
export type DocumentUploaded = z.infer<typeof DocumentUploadedSchema>;
⋮----
export type FormFacilitySubmitted = z.infer<typeof FormFacilitySubmittedSchema>;
⋮----
export type RiskPreApprovalDecided = z.infer<typeof RiskPreApprovalDecidedSchema>;
⋮----
export type RiskPreEvaluationDecided = z.infer<typeof RiskPreEvaluationDecidedSchema>;
⋮----
export type QuoteApproved = z.infer<typeof QuoteApprovedSchema>;
⋮----
export type QuoteResponded = z.infer<typeof QuoteRespondedSchema>;
⋮----
export type UploadFicaReceived = z.infer<typeof UploadFicaReceivedSchema>;
⋮----
export type RiskProcurementCompleted = z.infer<typeof RiskProcurementCompletedSchema>;
⋮----
export type SanctionCleared = z.infer<typeof SanctionClearedSchema>;
⋮----
export type RiskDecisionReceived = z.infer<typeof RiskDecisionReceivedSchema>;
⋮----
export type RiskFinancialStatementsConfirmed = z.infer<
	typeof RiskFinancialStatementsConfirmedSchema
>;
⋮----
export type ContractDraftReviewed = z.infer<typeof ContractDraftReviewedSchema>;
⋮----
export type FormAbsa6995Completed = z.infer<typeof FormAbsa6995CompletedSchema>;
⋮----
export type FormDecisionResponded = z.infer<typeof FormDecisionRespondedSchema>;
⋮----
export type ApprovalRiskManagerReceived = z.infer<
	typeof ApprovalRiskManagerReceivedSchema
>;
⋮----
export type ApprovalAccountManagerReceived = z.infer<
	typeof ApprovalAccountManagerReceivedSchema
>;
⋮----
export type StoredSanctionsPayload = z.infer<typeof StoredSanctionsPayloadSchema>;
⋮----
export type QuoteDetails = z.infer<typeof QuoteDetailsSchema>;
```

## File: lib/validations/quotes.ts
```typescript
import { z } from "zod";
⋮----
export type QuoteGenerationResult = z.infer<typeof quoteGenerationSchema>;
```

## File: lib/dashboard-store.ts
```typescript
import type { ReactNode } from "react";
import { create } from "zustand";
interface DashboardState {
	title: string | null;
	description: string | null;
	actions: ReactNode | null;
	setMeta: (meta: { title?: string; description?: string; actions?: ReactNode }) => void;
}
```

## File: lib/procurecheck.ts
```typescript
interface ProcureCheckConfig {
	baseUrl: string;
	username: string;
	password?: string;
}
⋮----
async function getJwt(): Promise<string>
export async function createTestVendor(vendorData: {
	vendorName: string;
	registrationNumber: string | null;
	applicantId: number;
})
export async function getVendorResults(vendorId: string | number)
```

## File: lib/types.ts
```typescript
import { z } from "zod";
⋮----
export type MandateType = z.infer<typeof MandateTypeSchema>;
⋮----
export type FormType = z.infer<typeof FormTypeSchema>;
⋮----
export type FormInstanceStatus = z.infer<typeof FormInstanceStatusSchema>;
⋮----
export type FormDecisionOutcome = z.infer<typeof FormDecisionOutcomeSchema>;
⋮----
export type DecisionEnabledFormType = z.infer<typeof DecisionEnabledFormTypeSchema>;
⋮----
export type DocumentCategory = z.infer<typeof DocumentCategorySchema>;
⋮----
export type DocumentSource = z.infer<typeof DocumentSourceSchema>;
⋮----
export type DocumentType = z.infer<typeof DocumentTypeSchema>;
⋮----
export type DirectorInfo = z.infer<typeof DirectorInfoSchema>;
⋮----
export type FacilityApplication = z.infer<typeof FacilityApplicationSchema>;
⋮----
export type ITCCheckResult = z.infer<typeof ITCCheckResultSchema>;
⋮----
export type FicaRiskFlag = z.infer<typeof FicaRiskFlagSchema>;
⋮----
export type FicaDocumentAnalysis = z.infer<typeof FicaDocumentAnalysisSchema>;
⋮----
export type AccountantLetterAnalysis = z.infer<typeof AccountantLetterAnalysisSchema>;
⋮----
export type V24ClientProfile = z.infer<typeof V24ClientProfileSchema>;
⋮----
export type V24Response = z.infer<typeof V24ResponseSchema>;
⋮----
export type TrainingSession = z.infer<typeof TrainingSessionSchema>;
export interface OnboardingWorkflowContext {
	applicantId: number;
	workflowId: number;
	facilityApplication?: FacilityApplication;
	itcResult?: ITCCheckResult;
	ficaAnalysis?: FicaDocumentAnalysis;
	accountantAnalysis?: AccountantLetterAnalysis;
	riskDecision?: {
		outcome: "APPROVED" | "REJECTED";
		decidedBy: string;
		decidedAt: Date;
		reason?: string;
	};
	v24Result?: V24Response;
}
```

## File: lib/utils.ts
```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[])
export function getBaseUrl()
interface DecisionRoutingInput {
	decisionType?: string | null;
	targetResource?: string | null;
	reviewType?: string | null;
	stage?: number | null;
}
⋮----
export function getDecisionEndpoint(input: DecisionRoutingInput): string
```

## File: lib/validations.ts
```typescript
import { z } from "zod";
⋮----
export type CreateApplicantInput = z.infer<typeof createApplicantSchema>;
export type UpdateApplicantInput = z.infer<typeof updateApplicantSchema>;
// ============================================
// Workflow Schemas
// ============================================
⋮----
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
⋮----
export type agentCallbackInput = z.infer<typeof agentCallbackSchema>;
⋮----
export type DispatchPayload = z.infer<typeof dispatchPayloadSchema>;
⋮----
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
```


## File: .env.example
```
# Sign up to Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Create a new Clerk webhook (user.created event) with your app URL and append /webhooks/clerk
# Set the webhook secret below provided by Clerk
CLERK_WEBHOOK_SECRET=

# turso auth api-tokens mint clerk
TURSO_API_TOKEN=

# your personal or organization name
TURSO_ORG=

# turso db create [database-name]
TURSO_DATABASE_NAME=

# turso group tokens create <group-name>
TURSO_GROUP_AUTH_TOKEN=

# OpenSanctions hosted sanctions matching (primary)
OPENSANCTIONS_API_URL=https://api.opensanctions.org
OPENSANCTIONS_API_KEY=
OPENSANCTIONS_MATCH_DATASET=sanctions
OPENSANCTIONS_MATCH_ALGORITHM=best

# ProcureCheck entity verification (sandbox defaults are hardcoded)
ENABLE_PROCURECHECK_LIVE=false
PROCURECHECK_BASE_URL=https://xdev.procurecheck.co.za/api/api/v1/

# Firecrawl – web scraping for verification checks
# Get an API key at https://firecrawl.dev
FIRECRAWL_API_KEY=

# Feature flags – Firecrawl-backed checks (set to "true" to enable)
ENABLE_FIRECRAWL_INDUSTRY_REG=false
ENABLE_FIRECRAWL_SANCTIONS_ENRICH=false
ENABLE_FIRECRAWL_SOCIAL_REP=false

# Shared secret for external API callbacks and webhook-style routes
# Used by routes like /api/applicants/approval and /api/workflows/[id]/signal
GAS_WEBHOOK_SECRET=
CRON_SECRET=
```


## File: components.json
```json
{
	"$schema": "https://ui.shadcn.com/schema.json",
	"style": "radix-maia",
	"rsc": true,
	"tsx": true,
	"tailwind": {
		"config": "tailwind.config.ts",
		"css": "app/globals.css",
		"baseColor": "zinc",
		"cssVariables": true,
		"prefix": ""
	},
	"iconLibrary": "remixicon",
	"aliases": {
		"components": "@/components",
		"utils": "@/lib/utils",
		"ui": "@/components/ui",
		"lib": "@/lib",
		"hooks": "@/hooks"
	},
	"menuColor": "default",
	"menuAccent": "bold",
	"registries": {}
}
```

## File: drizzle.config.ts
```typescript
import { defineConfig } from "drizzle-kit";
```



## File: package.json
```json
{
	"name": "stratcol-onboard-ai",
	"version": "0.0.0",
	"private": false,
	"scripts": {
		"dev": "next dev --turbo",
		"build": "next build",
		"start": "next start",
		"lint": "next lint",
		"db:generate": "drizzle-kit generate",
		"db:migrate": "drizzle-kit migrate",
		"db:studio": "drizzle-kit studio",
		"test:e2e": "playwright test",
		"test:e2e:ui": "playwright test --ui",
		"test:e2e:headed": "playwright test --headed",
		"test:e2e:debug": "playwright test --debug",
		"test:db:reset": "bun run scripts/reset-test-db.ts",
		"dev:all": "./setup-dev.sh"
	},
	"dependencies": {
		"@ai-sdk/google-vertex": "^4.0.45",
		"@base-ui/react": "^1.1.0",
		"@clerk/nextjs": "^6.37.1",
		"@clerk/themes": "^2.4.51",
		"@clerk/types": "^4.101.14",
		"@hello-pangea/dnd": "^18.0.1",
		"@hookform/resolvers": "^5.2.2",
		"@libsql/client": "^0.17.0",
		"@mendable/firecrawl-js": "^4.13.0",
		"@next/env": "^16.1.6",
		"@react-email/components": "^1.0.6",
		"@react-email/render": "^2.0.4",
		"@remixicon/react": "^4.9.0",
		"@tailwindcss/postcss": "^4.1.18",
		"@tanstack/react-table": "^8.21.3",
		"@tursodatabase/api": "^1.9.2",
		"ai": "^6.0.62",
		"class-variance-authority": "^0.7.1",
		"clsx": "^2.1.1",
		"date-fns": "^4.1.0",
		"drizzle-orm": "^0.45.1",
		"framer-motion": "^12.29.2",
		"inngest": "^3.49.3",
		"lucide-react": "^0.563.0",
		"md5": "^2.3.0",
		"mint": "^4.2.309",
		"next": "^16.1.6",
		"pdf-parse": "^2.4.5",
		"postcss": "^8.5.6",
		"radix-ui": "^1.4.3",
		"react": "19.2.3",
		"react-day-picker": "^9.13.1",
		"react-dom": "19.2.3",
		"react-hook-form": "^7.71.1",
		"react-markdown": "^10.1.0",
		"react-resizable-panels": "^4.5.5",
		"recharts": "^3.7.0",
		"remark-gfm": "^4.0.1",
		"resend": "^6.9.1",
		"shadcn": "^3.7.0",
		"sonner": "^2.0.7",
		"svix": "^1.85.0",
		"swr": "^2.3.8",
		"tailwind-merge": "^3.4.0",
		"tailwindcss": "^4.1.18",
		"tailwindcss-animate": "^1.0.7",
		"tw-animate-css": "^1.4.0",
		"use-debounce": "^10.1.0",
		"uuid": "^13.0.0",
		"zod": "^4.3.6",
		"zustand": "^5.0.10"
	},
	"devDependencies": {
		"@biomejs/biome": "2.3.14",
		"@clerk/testing": "^1.13.35",
		"@playwright/test": "^1.58.2",
		"@types/md5": "^2.3.6",
		"@types/node": "^25.2.2",
		"@types/react": "^19.2.3",
		"@types/react-dom": "^19.2.3",
		"drizzle-kit": "^0.31.8",
		"typescript": "^5.9.3"
	},
	"overrides": {
		"express": "4.20.0",
		"body-parser": "1.20.3",
		"qs": "6.14.1",
		"tar": "7.5.3",
		"axios": "1.12.0"
	}
}
```

## File: playwright.config.ts
```typescript
import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
```

## File: postcss.config.mjs
```javascript

```

## File: proxy.ts
```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
```

## File: tailwind.config.ts
```typescript
import type { Config } from "tailwindcss";
```

