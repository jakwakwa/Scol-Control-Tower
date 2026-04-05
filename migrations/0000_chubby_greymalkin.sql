CREATE TABLE `activity_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`applicant_id` integer NOT NULL,
	`action` text NOT NULL,
	`description` text NOT NULL,
	`performed_by` text,
	`created_at` integer DEFAULT '"2026-04-04T16:29:52.265Z"',
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ai_analysis_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`applicant_id` integer NOT NULL,
	`workflow_id` integer NOT NULL,
	`agent_name` text NOT NULL,
	`prompt_version_id` text,
	`confidence_score` integer,
	`human_adjudication_reason` text,
	`narrative` text,
	`raw_output` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ai_feedback_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` integer NOT NULL,
	`applicant_id` integer NOT NULL,
	`ai_outcome` text NOT NULL,
	`ai_confidence` integer,
	`ai_check_type` text NOT NULL,
	`human_outcome` text NOT NULL,
	`adjudication_reason` text NOT NULL,
	`adjudication_detail` text,
	`adjudication_notes` text,
	`is_divergent` integer NOT NULL,
	`divergence_weight` integer,
	`divergence_type` text,
	`decided_by` text NOT NULL,
	`decided_at` integer NOT NULL,
	`related_failure_event_id` integer,
	`consumed_for_retraining` integer DEFAULT false,
	`consumed_at` integer,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`related_failure_event_id`) REFERENCES `workflow_events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `applicant_magiclink_forms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`applicant_id` integer NOT NULL,
	`workflow_id` integer,
	`form_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`token_hash` text NOT NULL,
	`token` text,
	`token_prefix` text,
	`sent_at` integer,
	`viewed_at` integer,
	`expires_at` integer,
	`submitted_at` integer,
	`decision_status` text,
	`decision_outcome` text,
	`decision_reason` text,
	`decision_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `applicant_magiclink_forms_token_hash_unique` ON `applicant_magiclink_forms` (`token_hash`);--> statement-breakpoint
CREATE TABLE `applicant_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`applicant_magiclink_form_id` integer NOT NULL,
	`applicant_id` integer NOT NULL,
	`workflow_id` integer,
	`form_type` text NOT NULL,
	`data` text NOT NULL,
	`submitted_by` text,
	`version` integer DEFAULT 1,
	`submitted_at` integer NOT NULL,
	FOREIGN KEY (`applicant_magiclink_form_id`) REFERENCES `applicant_magiclink_forms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `applicants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_name` text NOT NULL,
	`trading_name` text,
	`registration_number` text,
	`vat_number` text,
	`contact_name` text NOT NULL,
	`id_number` text,
	`email` text NOT NULL,
	`phone` text,
	`business_type` text,
	`entity_type` text,
	`product_type` text,
	`industry` text,
	`employee_count` integer,
	`mandate_type` text,
	`mandate_volume` integer,
	`estimated_transactions_per_month` integer,
	`status` text DEFAULT 'new' NOT NULL,
	`risk_level` text,
	`itc_score` integer,
	`itc_status` text,
	`escalation_tier` integer DEFAULT 1,
	`salvage_deadline` integer,
	`is_salvaged` integer DEFAULT false,
	`sanction_status` text DEFAULT 'clear',
	`account_executive` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `document_uploads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` integer NOT NULL,
	`internal_form_id` integer,
	`category` text NOT NULL,
	`document_type` text NOT NULL,
	`file_name` text NOT NULL,
	`file_size` integer NOT NULL,
	`file_content` text,
	`mime_type` text NOT NULL,
	`storage_key` text NOT NULL,
	`storage_url` text,
	`verification_status` text DEFAULT 'pending' NOT NULL,
	`verification_notes` text,
	`verified_by` text,
	`verified_at` integer,
	`expires_at` integer,
	`metadata` text,
	`uploaded_by` text,
	`uploaded_at` integer NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`internal_form_id`) REFERENCES `internal_forms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`applicant_id` integer NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`category` text,
	`source` text,
	`file_name` text,
	`file_content` text,
	`mime_type` text,
	`storage_url` text,
	`uploaded_by` text,
	`uploaded_at` integer,
	`verified_at` integer,
	`processed_at` integer,
	`processing_status` text,
	`processing_result` text,
	`notes` text,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `internal_forms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` integer NOT NULL,
	`form_type` text NOT NULL,
	`status` text DEFAULT 'not_started' NOT NULL,
	`current_step` integer DEFAULT 1 NOT NULL,
	`total_steps` integer DEFAULT 1 NOT NULL,
	`last_saved_at` integer,
	`submitted_at` integer,
	`reviewed_at` integer,
	`reviewed_by` text,
	`review_notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `internal_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`internal_form_id` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`form_data` text NOT NULL,
	`is_draft` integer DEFAULT true NOT NULL,
	`submitted_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`internal_form_id`) REFERENCES `internal_forms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` integer,
	`applicant_id` integer,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`read` integer DEFAULT false,
	`created_at` integer,
	`actionable` integer DEFAULT false,
	`severity` text DEFAULT 'medium',
	`group_key` text,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`applicant_id` integer,
	`workflow_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`base_fee_percent` integer NOT NULL,
	`adjusted_fee_percent` integer,
	`details` text,
	`rationale` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`generated_by` text DEFAULT 'platform' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `re_applicant_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`applicant_id` integer NOT NULL,
	`workflow_id` integer NOT NULL,
	`matched_deny_list_id` integer NOT NULL,
	`matched_on` text NOT NULL,
	`matched_value` text NOT NULL,
	`denied_at` integer NOT NULL,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`matched_deny_list_id`) REFERENCES `workflow_termination_deny_list`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `risk_assessments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`applicant_id` integer NOT NULL,
	`overall_score` integer,
	`overall_status` text,
	`overall_risk` text,
	`procurement_data` text,
	`itc_data` text,
	`sanctions_data` text,
	`fica_data` text,
	`cash_flow_consistency` text,
	`dishonoured_payments` integer,
	`average_daily_balance` integer,
	`account_match_verified` text,
	`letterhead_verified` text,
	`ai_analysis` text,
	`reviewed_by` text,
	`reviewed_at` integer,
	`notes` text,
	`created_at` integer DEFAULT '"2026-04-04T16:29:52.264Z"',
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `risk_check_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` integer NOT NULL,
	`applicant_id` integer NOT NULL,
	`check_type` text NOT NULL,
	`machine_state` text DEFAULT 'pending' NOT NULL,
	`review_state` text DEFAULT 'pending' NOT NULL,
	`provider` text,
	`external_check_id` text,
	`payload` text,
	`raw_payload` text,
	`error_details` text,
	`started_at` integer,
	`completed_at` integer,
	`reviewed_by` text,
	`reviewed_at` integer,
	`review_notes` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sanction_clearance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`applicant_id` integer NOT NULL,
	`workflow_id` integer NOT NULL,
	`sanction_list_id` text,
	`cleared_by` text NOT NULL,
	`clearance_reason` text NOT NULL,
	`is_false_positive` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `signatures` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` integer NOT NULL,
	`internal_form_id` integer NOT NULL,
	`signatory_name` text NOT NULL,
	`signatory_role` text,
	`signatory_id_number` text,
	`signature_data` text NOT NULL,
	`signature_hash` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`signed_at` integer NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`internal_form_id`) REFERENCES `internal_forms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workflow_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` integer,
	`event_type` text NOT NULL,
	`payload` text,
	`timestamp` integer,
	`actor_type` text DEFAULT 'platform',
	`actor_id` text,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workflow_termination_deny_list` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` integer NOT NULL,
	`applicant_id` integer NOT NULL,
	`id_numbers` text NOT NULL,
	`board_member_ids` text NOT NULL,
	`cellphones` text NOT NULL,
	`bank_accounts` text NOT NULL,
	`board_member_names` text NOT NULL,
	`termination_reason` text NOT NULL,
	`terminated_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workflow_termination_screening` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deny_list_id` integer NOT NULL,
	`value_type` text NOT NULL,
	`value` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`deny_list_id`) REFERENCES `workflow_termination_deny_list`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workflow_termination_screening_value_type_value_idx` ON `workflow_termination_screening` (`value_type`,`value`);--> statement-breakpoint
CREATE INDEX `workflow_termination_screening_deny_list_id_idx` ON `workflow_termination_screening` (`deny_list_id`);--> statement-breakpoint
CREATE TABLE `workflows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`applicant_id` integer NOT NULL,
	`stage` integer DEFAULT 1,
	`status` text DEFAULT 'pending',
	`started_at` integer,
	`completed_at` integer,
	`terminated_at` integer,
	`terminated_by` text,
	`termination_reason` text,
	`procurement_cleared` integer,
	`documents_complete` integer,
	`ai_analysis_complete` integer,
	`mandate_retry_count` integer DEFAULT 0,
	`mandate_last_sent_at` integer,
	`risk_manager_approval` text,
	`account_manager_approval` text,
	`contract_draft_reviewed_at` integer,
	`contract_draft_reviewed_by` text,
	`absa_packet_sent_at` integer,
	`absa_packet_sent_by` text,
	`absa_approval_confirmed_at` integer,
	`absa_approval_confirmed_by` text,
	`sales_evaluation_status` text,
	`sales_issues_summary` text,
	`issue_flagged_by` text,
	`pre_risk_required` integer,
	`pre_risk_outcome` text,
	`pre_risk_evaluated_at` integer,
	`applicant_decision_outcome` text,
	`applicant_decline_reason` text,
	`stage_name` text,
	`current_agent` text,
	`review_type` text,
	`decision_type` text,
	`target_resource` text,
	`state_lock_version` integer DEFAULT 0,
	`state_locked_at` integer,
	`state_locked_by` text,
	`green_lane_requested_at` integer,
	`green_lane_requested_by` text,
	`green_lane_request_notes` text,
	`green_lane_request_source` text,
	`green_lane_consumed_at` integer,
	`metadata` text,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE no action
);
