import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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

	// Contact Info
	contactName: text("contact_name").notNull(),
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
	mandateVolume: integer("mandate_volume"), // In cents

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
		.references(() => applicants.id), // Link to Applicant
	type: text("type").notNull(), // bank_statement, id_document, etc.
	status: text("status").notNull().default("pending"), // pending, uploaded, verified, rejected
	category: text("category"), // standard_application, fica_entity, etc.
	source: text("source"), // client, agent, internal, system
	fileName: text("file_name"),
	storageUrl: text("storage_url"),
	uploadedBy: text("uploaded_by"),
	uploadedAt: integer("uploaded_at", { mode: "timestamp" }),
	verifiedAt: integer("verified_at", { mode: "timestamp" }),
	processedAt: integer("processed_at", { mode: "timestamp" }),
	processingStatus: text("processing_status"), // pending, processed, failed
	processingResult: text("processing_result"), // JSON string
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
	overallRisk: text("overall_risk"), // green, amber, red

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

/**
 * Workflows table - Tracks onboarding workflow state
 * PRD: Kill switch sets status to 'terminated'
 */
export const workflows = sqliteTable("workflows", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	applicantId: integer("applicant_id")
		.notNull()
		.references(() => applicants.id),
	stage: integer("stage", { mode: "number" }).default(1),
	status: text("status").default("pending"),
	startedAt: integer("started_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
	completedAt: integer("completed_at", { mode: "timestamp" }),

	// Kill Switch tracking (PRD Critical)
	terminatedAt: integer("terminated_at", { mode: "timestamp" }),
	terminatedBy: text("terminated_by"),
	terminationReason: text("termination_reason"),

	// Parallel processing state
	procurementCleared: integer("procurement_cleared", { mode: "boolean" }),
	documentsComplete: integer("documents_complete", { mode: "boolean" }),
	aiAnalysisComplete: integer("ai_analysis_complete", { mode: "boolean" }),

	// Mandate retry tracking (SOP: 7-day timeout, max 8 retries)
	mandateRetryCount: integer("mandate_retry_count").default(0),
	mandateLastSentAt: integer("mandate_last_sent_at", { mode: "timestamp" }),

	// Two-factor approval tracking (Stage 6)
	riskManagerApproval: text("risk_manager_approval"), // JSON: { approvedBy, timestamp, decision }
	accountManagerApproval: text("account_manager_approval"), // JSON: { approvedBy, timestamp, decision }
	// Stage 2 sales/pre-risk + applicant decision tracking
	salesEvaluationStatus: text("sales_evaluation_status"), // pending, approved, issues_found
	salesIssuesSummary: text("sales_issues_summary"),
	issueFlaggedBy: text("issue_flagged_by"), // account_manager, ai, system
	preRiskRequired: integer("pre_risk_required", { mode: "boolean" }),
	preRiskOutcome: text("pre_risk_outcome"), // approved, rejected, skipped
	preRiskEvaluatedAt: integer("pre_risk_evaluated_at", { mode: "timestamp" }),
	applicantDecisionOutcome: text("applicant_decision_outcome"), // approved, declined
	applicantDeclineReason: text("applicant_decline_reason"),

	metadata: text("metadata"),
});

export const notifications = sqliteTable("notifications", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	workflowId: integer("workflow_id").references(() => workflows.id),
	applicantId: integer("applicant_id").references(() => applicants.id),
	type: text("type").notNull(),
	message: text("message").notNull(),
	read: integer("read", { mode: "boolean" }).default(false),
	createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
	actionable: integer("actionable", { mode: "boolean" }).default(false),
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
 * AI Feedback Logs - Structured override data for AI retraining
 *
 * Stores structured pairs: (AI said X, Human said Y because Z)
 * Every human override becomes a retrainable data point.
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
	overrideCategory: text("override_category").notNull(), // From OVERRIDE_CATEGORIES
	overrideSubcategory: text("override_subcategory"),
	overrideDetails: text("override_details"), // Optional free text for "OTHER"

	// Divergence metrics
	isDivergent: integer("is_divergent", { mode: "boolean" }).notNull(),
	divergenceWeight: integer("divergence_weight"), // 1-10 priority for retraining
	divergenceType: text("divergence_type"), // "false_positive" | "false_negative" | "severity_mismatch"

	// Actor
	decidedBy: text("decided_by").notNull(),
	decidedAt: integer("decided_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),

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
		references: [riskAssessments.applicantId], // One-to-one roughly
	}),
	activityLogs: many(activityLogs),
}));

/**
 * Agent Registry - Track available external agents
 */
export const agents = sqliteTable("agents", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	agentId: text("agent_id").notNull().unique(), // e.g., "xt_risk_agent_v2"
	name: text("name").notNull(),
	description: text("description"),
	webhookUrl: text("webhook_url"),
	taskType: text("task_type", {
		enum: [
			"document_generation",
			"electronic_signature",
			"risk_verification",
			"data_sync",
			"notification",
		],
	}).notNull(),
	status: text("status", { enum: ["active", "inactive", "error"] })
		.notNull()
		.default("active"),
	lastCallbackAt: integer("last_callback_at", { mode: "timestamp" }),
	callbackCount: integer("callback_count").notNull().default(0),
	errorCount: integer("error_count").notNull().default(0),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

/**
 * external Callbacks - Agent callback records
 */
export const agentCallbacks = sqliteTable("xt_callbacks", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	workflowId: integer("workflow_id")
		.notNull()
		.references(() => workflows.id),
	eventId: text("event_id").notNull(), // From incoming webhook
	agentId: text("agent_id").notNull(), // e.g., "xt_risk_agent_v2"
	status: text("status", {
		enum: ["received", "validated", "processed", "rejected", "error"],
	})
		.notNull()
		.default("received"),
	decision: text("decision", {
		enum: ["approved", "rejected", "pending_info"],
	}),
	outcome: text("outcome"), // Full decision JSON
	rawPayload: text("raw_payload").notNull(), // Complete incoming JSON
	validationErrors: text("validation_errors"), // Any Zod errors
	humanActor: text("human_actor"), // Email of human who made decision
	processedAt: integer("processed_at", { mode: "timestamp" }),
	receivedAt: integer("received_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

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
	callbacks: many(agentCallbacks),
	internalForms: many(internalForms),
	documentUploads: many(documentUploads),
	signatures: many(signatures),
	aiFeedbackLogs: many(aiFeedbackLogs),
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

export const agentCallbacksRelations = relations(agentCallbacks, ({ one }) => ({
	workflow: one(workflows, {
		fields: [agentCallbacks.workflowId],
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
}));

// ============================================
// Legacy table (kept for compatibility)
// ============================================

export const todos = sqliteTable("todos", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	description: text("description").notNull(),
	completed: integer("completed", { mode: "boolean" }).notNull().default(false),
});

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
 * Internal Forms - Track form submission status per workflow
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
	documentType: text("document_type").notNull(), // e.g., "cipc_registration", "director_id", "bank_statement"
	fileName: text("file_name").notNull(),
	fileSize: integer("file_size").notNull(), // bytes
	mimeType: text("mime_type").notNull(),
	storageKey: text("storage_key").notNull(), // S3/R2 key or local path
	storageUrl: text("storage_url"), // Public or signed URL
	verificationStatus: text("verification_status", {
		enum: ["pending", "verified", "rejected", "expired"],
	})
		.notNull()
		.default("pending"),
	verificationNotes: text("verification_notes"),
	verifiedBy: text("verified_by"), // Clerk user ID or "system"
	verifiedAt: integer("verified_at", { mode: "timestamp" }),
	expiresAt: integer("expires_at", { mode: "timestamp" }), // For documents with expiry
	metadata: text("metadata"), // JSON for additional document-specific data
	uploadedBy: text("uploaded_by"), // Clerk user ID
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
	signatoryRole: text("signatory_role"), // e.g., "Director", "Authorised Representative"
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

// ============================================
// SOP v3.1.0: New Tables
// ============================================

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
	sanctionListId: text("sanction_list_id"), // External ID (e.g. OFAC-123)
	clearedBy: text("cleared_by").notNull(), // User ID
	clearanceReason: text("clearance_reason").notNull(), // Mandatory justification
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
	agentName: text("agent_name").notNull(), // 'risk', 'sanctions', 'reporter'
	promptVersionId: text("prompt_version_id"), // Git hash or SemVer
	confidenceScore: integer("confidence_score"), // 0-100
	humanOverrideReason: text("human_override_reason", {
		enum: ["CONTEXT", "HALLUCINATION", "DATA_ERROR"],
	}),
	narrative: text("narrative"), // The structured output or summary
	rawOutput: text("raw_output"), // Full JSON output
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});
