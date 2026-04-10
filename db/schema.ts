import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ============================================
// Core Onboarding Tables
// ============================================

/**
 * Business Type enumeration for conditional document logic
 * Maps to document requirements in document-requirements.service.ts
 */
export const BUSINESS_TYPES = [
	"NPO",
	"PROPRIETOR",
	"COMPANY",
	"TRUST",
	"BODY_CORPORATE",
	"PARTNERSHIP",
	"CLOSE_CORPORATION",
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

/**
 * Applicants table - Central entity for onboarding
 */
export const applicants = sqliteTable("applicants", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),

	// Company Info
	companyName: text("company_name").notNull(),
	tradingName: text("trading_name"),
	registrationNumber: text("registration_number"),
	vatNumber: text("vat_number"),

	// Contact Info
	contactName: text("contact_name").notNull(),
	idNumber: text("id_number"),
	email: text("email").notNull(),
	phone: text("phone"),

	// Business Classification (PRD: Conditional Document Logic)
	businessType: text("business_type"), // NPO, PROPRIETOR, COMPANY, TRUST, etc.
	entityType: text("entity_type"), // company, close_corporation, proprietor, partnership, npo, trust, body_corporate, other
	productType: text("product_type"), // standard, premium_collections, call_centre
	industry: text("industry"),
	employeeCount: integer("employee_count"),

	// Mandate Info
	mandateType: text("mandate_type"), // EFT, DEBIT_ORDER, CASH, MIXED
	mandateVolume: integer("mandate_volume"), // Max amount in cents (from facility form)
	estimatedTransactionsPerMonth: integer("estimated_transactions_per_month"), // Transaction count per month (from applicant form)

	// Status & Risk
	status: text("status").notNull().default("new"),
	riskLevel: text("risk_level"), // green, amber, red
	itcScore: integer("itc_score"),
	itcStatus: text("itc_status"),

	// SOP v3.1.0: Tiered Escalation & Sanctions
	escalationTier: integer("escalation_tier").default(1), // 1=Normal, 2=Manager Alert, 3=Salvage
	salvageDeadline: integer("salvage_deadline", { mode: "timestamp" }),
	isSalvaged: integer("is_salvaged", { mode: "boolean" }).default(false),
	sanctionStatus: text("sanction_status", {
		enum: ["clear", "flagged", "confirmed_hit"],
	}).default("clear"),

	// System
	accountExecutive: text("account_executive"),
	notes: text("notes"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * Documents table - Dedicated document tracking
 */
export const documents = sqliteTable("documents", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),
	type: text("type").notNull(),
	status: text("status").notNull().default("pending"),
	category: text("category"),
	source: text("source"),
	fileName: text("file_name"),
	fileContent: text("file_content"),
	mimeType: text("mime_type"),
	storageUrl: text("storage_url"),
	uploadedBy: text("uploaded_by"),
	uploadedAt: integer("uploaded_at", { mode: "timestamp" }),
	verifiedAt: integer("verified_at", { mode: "timestamp" }),
	processedAt: integer("processed_at", { mode: "timestamp" }),
	processingStatus: text("processing_status"),
	processingResult: text("processing_result"),
	notes: text("notes"),
});

/**
 * Risk Assessments table - Application risk Profiles
 */
export const riskAssessments = sqliteTable("risk_assessments", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),
	overallScore: integer("overall_score"),
	overallStatus: text("overall_status"), // REVIEW REQUIRED, COMPLIANT, etc.
	overallRisk: text("overall_risk"), // green, amber, red

	procurementData: text("procurement_data"), // JSON
	itcData: text("itc_data"), // JSON
	sanctionsData: text("sanctions_data"), // JSON
	ficaData: text("fica_data"), // JSON

	// Specific risk factors from user schema
	cashFlowConsistency: text("cash_flow_consistency"),
	dishonouredPayments: integer("dishonoured_payments"),
	averageDailyBalance: integer("average_daily_balance"),
	accountMatchVerified: text("account_match_verified"), // yes/no or status
	letterheadVerified: text("letterhead_verified"),

	aiAnalysis: text("ai_analysis"), // JSON string, equivalent to jsonb
	reviewedBy: text("reviewed_by"),
	reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
	notes: text("notes"),
	createdAt: integer("created_at", { mode: "timestamp" }).default(new Date()),
});

/**
 * Activity Logs - General audits
 */
export const activityLogs = sqliteTable("activity_logs", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),
	action: text("action").notNull(),
	description: text("description").notNull(),
	performedBy: text("performed_by"),
	createdAt: integer("created_at", { mode: "timestamp" }).default(new Date()),
});

// ============================================
// Workflow Engine Tables (Keeping these for Inngest compatibility)
// ============================================

/**
 * Workflow status enumeration
 * Includes 'terminated' status for kill switch functionality
 */
export const WORKFLOW_STATUSES = [
	"pending",
	"processing",
	"awaiting_human",
	"paused",
	"completed",
	"failed",
	"timeout",
	"terminated",
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const workflows = sqliteTable("workflows", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),
	stage: integer("stage", { mode: "number" }).default(1),
	status: text("status").default("pending"),
	startedAt: integer("started_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
	completedAt: integer("completed_at", { mode: "timestamp" }),
	terminatedAt: integer("terminated_at", { mode: "timestamp" }),
	terminatedBy: text("terminated_by"),
	terminationReason: text("termination_reason"),
	procurementCleared: integer("procurement_cleared", { mode: "boolean" }),
	documentsComplete: integer("documents_complete", { mode: "boolean" }),
	aiAnalysisComplete: integer("ai_analysis_complete", { mode: "boolean" }),
	mandateRetryCount: integer("mandate_retry_count").default(0),
	mandateLastSentAt: integer("mandate_last_sent_at", { mode: "timestamp" }),
	riskManagerApproval: text("risk_manager_approval"),
	accountManagerApproval: text("account_manager_approval"),
	contractDraftReviewedAt: integer("contract_draft_reviewed_at", {
		mode: "timestamp",
	}),
	contractDraftReviewedBy: text("contract_draft_reviewed_by"),
	absaPacketSentAt: integer("absa_packet_sent_at", { mode: "timestamp" }),
	absaPacketSentBy: text("absa_packet_sent_by"),
	absaApprovalConfirmedAt: integer("absa_approval_confirmed_at", {
		mode: "timestamp",
	}),
	absaApprovalConfirmedBy: text("absa_approval_confirmed_by"),
	salesEvaluationStatus: text("sales_evaluation_status"),
	salesIssuesSummary: text("sales_issues_summary"),
	issueFlaggedBy: text("issue_flagged_by"),
	preRiskRequired: integer("pre_risk_required", { mode: "boolean" }),
	preRiskOutcome: text("pre_risk_outcome"),
	preRiskEvaluatedAt: integer("pre_risk_evaluated_at", { mode: "timestamp" }),
	applicantDecisionOutcome: text("applicant_decision_outcome"),
	applicantDeclineReason: text("applicant_decline_reason"),
	stageName: text("stage_name"),
	currentAgent: text("current_agent"),
	reviewType: text("review_type"),
	decisionType: text("decision_type"),
	targetResource: text("target_resource"),
	stateLockVersion: integer("state_lock_version").default(0),
	stateLockedAt: integer("state_locked_at", { mode: "timestamp" }),
	stateLockedBy: text("state_locked_by"),
	greenLaneRequestedAt: integer("green_lane_requested_at", { mode: "timestamp" }),
	greenLaneRequestedBy: text("green_lane_requested_by"),
	greenLaneRequestNotes: text("green_lane_request_notes"),
	greenLaneRequestSource: text("green_lane_request_source"),
	greenLaneConsumedAt: integer("green_lane_consumed_at", { mode: "timestamp" }),
	metadata: text("metadata"),
});

// ==================================================================
// Risk Check Results — Source of truth for per-check lifecycle
// ==================================================================

export const RISK_CHECK_TYPES = ["PROCUREMENT", "ITC", "SANCTIONS", "FICA"] as const;

export type RiskCheckType = (typeof RISK_CHECK_TYPES)[number];

export const RISK_CHECK_MACHINE_STATES = [
	"pending",
	"in_progress",
	"completed",
	"failed",
	"manual_required",
] as const;

export type RiskCheckMachineState = (typeof RISK_CHECK_MACHINE_STATES)[number];

export const RISK_CHECK_REVIEW_STATES = [
	"pending",
	"acknowledged",
	"approved",
	"rejected",
	"not_required",
] as const;

export type RiskCheckReviewState = (typeof RISK_CHECK_REVIEW_STATES)[number];

export const riskCheckResults = sqliteTable("risk_check_results", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),
	checkType: text("check_type").notNull(),
	machineState: text("machine_state").notNull().default("pending"),
	reviewState: text("review_state").notNull().default("pending"),
	provider: text("provider"),
	externalCheckId: text("external_check_id"),
	payload: text("payload"),
	rawPayload: text("raw_payload"),
	errorDetails: text("error_details"),
	startedAt: integer("started_at", { mode: "timestamp" }),
	completedAt: integer("completed_at", { mode: "timestamp" }),
	reviewedBy: text("reviewed_by"),
	reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
	reviewNotes: text("review_notes"),
	createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
	updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const NOTIFICATION_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number];

export const notifications = sqliteTable("notifications", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	workflowId: integer("workflow_id").references(() => workflows.id),
	applicantId: integer("applicant_id").references(() => applicants.id),
	type: text("type").notNull(),
	message: text("message").notNull(),
	read: integer("read", { mode: "boolean" }).default(false),
	createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
	actionable: integer("actionable", { mode: "boolean" }).default(false),
	severity: text("severity").default("medium"),
	groupKey: text("group_key"),
	/** Workflow event type that produced this notification; used for routing without matching user-facing copy */
	sourceEventType: text("source_event_type"),
});

export const workflowEvents = sqliteTable("workflow_events", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	workflowId: integer("workflow_id").references(() => workflows.id),
	eventType: text("event_type").notNull(),
	payload: text("payload"),
	timestamp: integer("timestamp", { mode: "timestamp" }).$defaultFn(() => new Date()),
	actorType: text("actor_type").default("platform"),
	actorId: text("actor_id"),
});

/**
 * AI Feedback Logs - Structured adjudication data for AI retraining
 *
 * Stores structured pairs: (AI said X, Human said Y because Z)
 * Every human adjudication becomes a retrainable data point.
 * Divergence metrics enable prioritized retraining queues.
 */
export const aiFeedbackLogs = sqliteTable("ai_feedback_logs", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),

	// What the AI said
	aiOutcome: text("ai_outcome").notNull(), // "APPROVE" | "MANUAL_REVIEW" | "DECLINE"
	aiConfidence: integer("ai_confidence"), // 0-100
	aiCheckType: text("ai_check_type").notNull(), // "validation" | "risk" | "sanctions" | "aggregated"

	// What the human said
	humanOutcome: text("human_outcome").notNull(), // "APPROVED" | "REJECTED" | "REQUEST_MORE_INFO"
	adjudicationReason: text("adjudication_reason").notNull(), // From ADJUDICATION_CATEGORIES
	adjudicationDetail: text("adjudication_detail"),
	adjudicationNotes: text("adjudication_notes"), // Optional free text for "OTHER"

	// Divergence metrics
	isDivergent: integer("is_divergent", { mode: "boolean" }).notNull(),
	divergenceWeight: integer("divergence_weight"), // 1-10 priority for retraining
	divergenceType: text("divergence_type"), // "false_positive" | "false_negative" | "severity_mismatch"

	// Actor
	decidedBy: text("decided_by").notNull(),
	decidedAt: integer("decided_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),

	// Data lineage: links this decision to the specific failure event that triggered manual review
	relatedFailureEventId: integer("related_failure_event_id").references(
		() => workflowEvents.id
	),

	// Retraining status
	consumedForRetraining: integer("consumed_for_retraining", { mode: "boolean" }).default(
		false
	),
	consumedAt: integer("consumed_at", { mode: "timestamp" }),
});

/**
 * Applicant Magic Link Forms - Magic link tracking
 */
export const applicantMagiclinkForms = sqliteTable("applicant_magiclink_forms", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),
	workflowId: integer("workflow_id").references(() => workflows.id),
	formType: text("form_type").notNull(), // FACILITY_APPLICATION, SIGNED_QUOTATION, etc.
	status: text("status").notNull().default("pending"), // pending, sent, viewed, submitted, expired, revoked
	tokenHash: text("token_hash").notNull().unique(),
	token: text("token"),
	tokenPrefix: text("token_prefix"),
	sentAt: integer("sent_at", { mode: "timestamp" }),
	viewedAt: integer("viewed_at", { mode: "timestamp" }),
	expiresAt: integer("expires_at", { mode: "timestamp" }),
	submittedAt: integer("submitted_at", { mode: "timestamp" }),
	decisionStatus: text("decision_status"), // pending, responded
	decisionOutcome: text("decision_outcome"), // approved, declined
	decisionReason: text("decision_reason"),
	decisionAt: integer("decision_at", { mode: "timestamp" }),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * Applicant Submissions - Stored form payloads
 */
export const applicantSubmissions = sqliteTable("applicant_submissions", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	applicantMagiclinkFormId: integer("applicant_magiclink_form_id")
		.notNull()
		.references(() => applicantMagiclinkForms.id),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),
	workflowId: integer("workflow_id").references(() => workflows.id),
	formType: text("form_type").notNull(),
	data: text("data").notNull(), // JSON string
	submittedBy: text("submitted_by"),
	version: integer("version").default(1),
	submittedAt: integer("submitted_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * Workflow Termination Deny List - Scenario 2b: Post-Workflow Termination Ruleset
 *
 * Captures board member names and ID numbers from Risk Manager declined applicants
 * (sanction list / procurement denied). Used to detect re-applicants who reapply
 * under a different business or director's name. Matching is by ID, bank account,
 * or cellphone number — no AI, only a smart algorithm.
 */
export const workflowTerminationDenyList = sqliteTable("workflow_termination_deny_list", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),

	// Identifiers for re-applicant matching (normalized for comparison)
	idNumbers: text("id_numbers").notNull(), // JSON array: applicant/contact ID only
	boardMemberIds: text("board_member_ids").notNull(), // JSON array: directors/beneficial owners IDs
	cellphones: text("cellphones").notNull(), // JSON array
	bankAccounts: text("bank_accounts").notNull(), // JSON array: accountNumber + branchCode
	boardMemberNames: text("board_member_names").notNull(), // JSON array: full names

	// Metadata
	terminationReason: text("termination_reason").notNull(),
	terminatedAt: integer("terminated_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * Workflow Termination Screening - Separate table for Turso FTS/vector search
 *
 * Stores each screening value (id_number, cellphone, bank_account, board_member_name)
 * as a separate row for easy querying and Turso full-text/vector search.
 * Populated when adding to workflow_termination_deny_list.
 */
export const SCREENING_VALUE_TYPES = [
	"id_number",
	"board_member_id",
	"cellphone",
	"bank_account",
	"board_member_name",
] as const;

export type ScreeningValueType = (typeof SCREENING_VALUE_TYPES)[number];

export const workflowTerminationScreening = sqliteTable(
	"workflow_termination_screening",
	{
		id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
		denyListId: integer("deny_list_id")
			.notNull()
			.references(() => workflowTerminationDenyList.id, { onDelete: "cascade" }),
		valueType: text("value_type", {
			enum: SCREENING_VALUE_TYPES,
		}).notNull(),
		value: text("value").notNull(), // Normalized value for exact match and FTS indexing
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	table => ({
		valueTypeValueIdx: index("workflow_termination_screening_value_type_value_idx").on(
			table.valueType,
			table.value
		),
		denyListIdIdx: index("workflow_termination_screening_deny_list_id_idx").on(
			table.denyListId
		),
	})
);

/**
 * Re-Applicant Attempt Log - Records when a re-applicant is detected and denied
 */
export const reApplicantAttempts = sqliteTable("re_applicant_attempts", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	matchedDenyListId: integer("matched_deny_list_id")
		.notNull()
		.references(() => workflowTerminationDenyList.id),
	matchedOn: text("matched_on").notNull(),
	matchedValue: text("matched_value").notNull(),
	deniedAt: integer("denied_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

// ============================================
// Relations
// ============================================

export const applicantsRelations = relations(applicants, ({ many, one }) => ({
	workflows: many(workflows),
	documents: many(documents),
	applicantMagiclinkForms: many(applicantMagiclinkForms),
	applicantSubmissions: many(applicantSubmissions),
	riskAssessment: one(riskAssessments, {
		fields: [applicants.id],
		references: [riskAssessments.applicantId],
	}),
	activityLogs: many(activityLogs),
}));

/**
 * Quotes table - Generated fee structures
 */
export const quotes = sqliteTable("quotes", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	applicantId: integer("applicant_id").references(() => applicants.id),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	amount: integer("amount").notNull(), // Cents
	baseFeePercent: integer("base_fee_percent").notNull(), // Basis points (e.g. 150 = 1.5%)
	adjustedFeePercent: integer("adjusted_fee_percent"), // Basis points
	details: text("details"), // JSON string with AI quote details
	rationale: text("rationale"), // AI reasoning for the fee
	status: text("status", {
		enum: ["draft", "pending_approval", "pending_signature", "approved", "rejected"],
	})
		.notNull()
		.default("draft"),
	generatedBy: text("generated_by").notNull().default("platform"), // 'system' or 'gemini'
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export const documentsRelations = relations(documents, ({ one }) => ({
	applicant: one(applicants, {
		fields: [documents.applicantId],
		references: [applicants.id],
	}),
}));

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
	applicant: one(applicants, {
		fields: [workflows.applicantId],
		references: [applicants.id],
	}),
	quotes: many(quotes),
	events: many(workflowEvents),
	internalForms: many(internalForms),
	documentUploads: many(documentUploads),
	signatures: many(signatures),
	aiFeedbackLogs: many(aiFeedbackLogs),
	denyListEntries: many(workflowTerminationDenyList),
}));

export const workflowTerminationDenyListRelations = relations(
	workflowTerminationDenyList,
	({ one, many }) => ({
		workflow: one(workflows, {
			fields: [workflowTerminationDenyList.workflowId],
			references: [workflows.id],
		}),
		applicant: one(applicants, {
			fields: [workflowTerminationDenyList.applicantId],
			references: [applicants.id],
		}),
		reApplicantAttempts: many(reApplicantAttempts),
		screeningValues: many(workflowTerminationScreening),
	})
);

export const workflowTerminationScreeningRelations = relations(
	workflowTerminationScreening,
	({ one }) => ({
		denyList: one(workflowTerminationDenyList, {
			fields: [workflowTerminationScreening.denyListId],
			references: [workflowTerminationDenyList.id],
		}),
	})
);

export const reApplicantAttemptsRelations = relations(reApplicantAttempts, ({ one }) => ({
	applicant: one(applicants, {
		fields: [reApplicantAttempts.applicantId],
		references: [applicants.id],
	}),
	workflow: one(workflows, {
		fields: [reApplicantAttempts.workflowId],
		references: [workflows.id],
	}),
	matchedDenyList: one(workflowTerminationDenyList, {
		fields: [reApplicantAttempts.matchedDenyListId],
		references: [workflowTerminationDenyList.id],
	}),
}));

export const applicantMagiclinkFormsRelations = relations(
	applicantMagiclinkForms,
	({ one, many }) => ({
		applicant: one(applicants, {
			fields: [applicantMagiclinkForms.applicantId],
			references: [applicants.id],
		}),
		workflow: one(workflows, {
			fields: [applicantMagiclinkForms.workflowId],
			references: [workflows.id],
		}),
		submissions: many(applicantSubmissions),
	})
);

export const applicantSubmissionsRelations = relations(
	applicantSubmissions,
	({ one }) => ({
		applicant: one(applicants, {
			fields: [applicantSubmissions.applicantId],
			references: [applicants.id],
		}),
		workflow: one(workflows, {
			fields: [applicantSubmissions.workflowId],
			references: [workflows.id],
		}),
		applicantMagiclinkForm: one(applicantMagiclinkForms, {
			fields: [applicantSubmissions.applicantMagiclinkFormId],
			references: [applicantMagiclinkForms.id],
		}),
	})
);

export const riskAssessmentsRelations = relations(riskAssessments, ({ one }) => ({
	applicant: one(applicants, {
		fields: [riskAssessments.applicantId],
		references: [applicants.id],
	}),
}));

export const quotesRelations = relations(quotes, ({ one }) => ({
	workflow: one(workflows, {
		fields: [quotes.workflowId],
		references: [workflows.id],
	}),
}));

export const aiFeedbackLogsRelations = relations(aiFeedbackLogs, ({ one }) => ({
	workflow: one(workflows, {
		fields: [aiFeedbackLogs.workflowId],
		references: [workflows.id],
	}),
	applicant: one(applicants, {
		fields: [aiFeedbackLogs.applicantId],
		references: [applicants.id],
	}),
	relatedFailureEvent: one(workflowEvents, {
		fields: [aiFeedbackLogs.relatedFailureEventId],
		references: [workflowEvents.id],
	}),
}));

// ============================================
// Internal Forms Tables
// ============================================

/**
 * Form types enum for internal forms
 */
export const FORM_TYPES = [
	"stratcol_agreement",
	"facility_application",
	"absa_6995",
	"fica_documents",
] as const;

export type FormType = (typeof FORM_TYPES)[number];

/**
 *  Track form submission status per workflow
 */
export const internalForms = sqliteTable("internal_forms", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	formType: text("form_type", {
		enum: ["stratcol_agreement", "facility_application", "absa_6995", "fica_documents"],
	}).notNull(),
	status: text("status", {
		enum: [
			"not_started",
			"in_progress",
			"submitted",
			"approved",
			"rejected",
			"revision_required",
		],
	})
		.notNull()
		.default("not_started"),
	currentStep: integer("current_step").notNull().default(1),
	totalSteps: integer("total_steps").notNull().default(1),
	lastSavedAt: integer("last_saved_at", { mode: "timestamp" }),
	submittedAt: integer("submitted_at", { mode: "timestamp" }),
	reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
	reviewedBy: text("reviewed_by"), // Clerk user ID
	reviewNotes: text("review_notes"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * Internal Submissions - Store form data with versioning
 */
export const internalSubmissions = sqliteTable("internal_submissions", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	internalFormId: integer("internal_form_id")
		.notNull()
		.references(() => internalForms.id),
	version: integer("version").notNull().default(1),
	formData: text("form_data").notNull(), // JSON string of form values
	isDraft: integer("is_draft", { mode: "boolean" }).notNull().default(true),
	submittedBy: text("submitted_by"), // Clerk user ID
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * Document Uploads - FICA document metadata and verification status
 */
export const documentUploads = sqliteTable("document_uploads", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	internalFormId: integer("internal_form_id").references(() => internalForms.id),
	category: text("category", {
		enum: ["standard", "individual", "financial", "professional", "industry"],
	}).notNull(),
	documentType: text("document_type").notNull(),
	fileName: text("file_name").notNull(),
	fileSize: integer("file_size").notNull(),
	fileContent: text("file_content"),
	mimeType: text("mime_type").notNull(),
	storageKey: text("storage_key").notNull(),
	storageUrl: text("storage_url"),
	verificationStatus: text("verification_status", {
		enum: [
			"pending",
			"verified",
			"rejected",
			"expired",
			"failed_ocr",
			"failed_unprocessable",
		],
	})
		.notNull()
		.default("pending"),
	verificationNotes: text("verification_notes"),
	verifiedBy: text("verified_by"),
	verifiedAt: integer("verified_at", { mode: "timestamp" }),
	expiresAt: integer("expires_at", { mode: "timestamp" }),
	metadata: text("metadata"),
	uploadedBy: text("uploaded_by"),
	uploadedAt: integer("uploaded_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * Signatures - Canvas signature data with timestamps
 */
export const signatures = sqliteTable("signatures", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	internalFormId: integer("internal_form_id")
		.notNull()
		.references(() => internalForms.id),
	signatoryName: text("signatory_name").notNull(),
	signatoryRole: text("signatory_role"),
	signatoryIdNumber: text("signatory_id_number"),
	signatureData: text("signature_data").notNull(), // Base64 PNG data URL
	signatureHash: text("signature_hash").notNull(), // SHA-256 hash for integrity
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	signedAt: integer("signed_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

// ============================================
// Internal Forms Relations
// ============================================

export const internalFormsRelations = relations(internalForms, ({ one, many }) => ({
	workflow: one(workflows, {
		fields: [internalForms.workflowId],
		references: [workflows.id],
	}),
	submissions: many(internalSubmissions),
	documents: many(documentUploads),
	signatures: many(signatures),
}));

export const internalSubmissionsRelations = relations(internalSubmissions, ({ one }) => ({
	internalForm: one(internalForms, {
		fields: [internalSubmissions.internalFormId],
		references: [internalForms.id],
	}),
}));

export const documentUploadsRelations = relations(documentUploads, ({ one }) => ({
	workflow: one(workflows, {
		fields: [documentUploads.workflowId],
		references: [workflows.id],
	}),
	internalForm: one(internalForms, {
		fields: [documentUploads.internalFormId],
		references: [internalForms.id],
	}),
}));

export const signaturesRelations = relations(signatures, ({ one }) => ({
	workflow: one(workflows, {
		fields: [signatures.workflowId],
		references: [workflows.id],
	}),
	internalForm: one(internalForms, {
		fields: [signatures.internalFormId],
		references: [internalForms.id],
	}),
}));

/**
 * Sanction Clearance Table - Track manual clearance of sanction hits
 */
export const sanctionClearance = sqliteTable("sanction_clearance", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	sanctionListId: text("sanction_list_id"),
	clearedBy: text("cleared_by").notNull(),
	clearanceReason: text("clearance_reason").notNull(),
	isFalsePositive: integer("is_false_positive", { mode: "boolean" }).notNull(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * AI Analysis Logs - Detailed AI outputs
 */
export const aiAnalysisLogs = sqliteTable("ai_analysis_logs", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	agentName: text("agent_name").notNull(),
	promptVersionId: text("prompt_version_id"),
	confidenceScore: integer("confidence_score"), // 0-100
	humanAdjudicationReason: text("human_adjudication_reason", {
		enum: [
			"AI_ALIGNED",
			"MISSING_CONTEXT",
			"INCORRECT_RISK_SCORING",
			"FALSE_POSITIVE_FLAG",
			"FALSE_NEGATIVE_MISS",
			"POLICY_EXCEPTION",
			"DATA_QUALITY_ISSUE",
			"OTHER",
			"CONTEXT",
			"HALLUCINATION",
			"DATA_ERROR",
		],
	}),
	narrative: text("narrative"),
	rawOutput: text("raw_output"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});
