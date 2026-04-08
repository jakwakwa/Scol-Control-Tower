// Dashboard components barrel export
export { Sidebar } from "./sidebar";
export {
	DashboardLayout,
	DashboardGrid,
	GlassCard,
	DashboardSection,
} from "./dashboard-layout";
export { SearchInput } from "./search-input";
export { StatsCard, StatsCardCompact } from "./stats-card";
export {
	WorkflowTable,
	WorkflowStageIndicator,
	StatusBadge,
	STAGE_NAMES,
} from "./workflow-table";
export { AgentStatusCard, AgentStatusRow } from "./agent-status-card";
export { ActivityFeed, CompactTimeline } from "./activity-feed";
export { WorkflowActivityTimeline } from "./workflow-activity-timeline";
export { ApplicantsTable } from "./applicants-table";
export { FinalApprovalCard } from "./final-approval-card";
export {
	ParallelBranchStatus,
	createStage3Branches,
} from "./parallel-branch-status";
export type { BranchStatus } from "./parallel-branch-status";

// V2 Workflow UX Components (Phase 6)
export { WorkflowProgressStepper } from "./workflow-progress-stepper";
export type { WorkflowStep } from "./workflow-progress-stepper";
export {
	Skeleton,
	StatsCardSkeleton,
	TableRowSkeleton,
	TableSkeleton,
	WorkflowCardSkeleton,
	RiskReviewCardSkeleton,
	PipelineColumnSkeleton,
	DashboardGridSkeleton,
	ActivityFeedSkeleton,
	TextSkeleton,
} from "./skeleton-loaders";
