CREATE TABLE `ai_analysis_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`applicant_id` integer NOT NULL,
	`workflow_id` integer NOT NULL,
	`agent_name` text NOT NULL,
	`prompt_version_id` text,
	`confidence_score` integer,
	`human_override_reason` text,
	`narrative` text,
	`raw_output` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`applicant_id`) REFERENCES `applicants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE no action
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
DROP INDEX "agents_agent_id_unique";--> statement-breakpoint
DROP INDEX "applicant_magiclink_forms_token_hash_unique";--> statement-breakpoint
ALTER TABLE `activity_logs` ALTER COLUMN "created_at" TO "created_at" integer DEFAULT '"2026-02-15T15:07:12.749Z"';--> statement-breakpoint
CREATE UNIQUE INDEX `agents_agent_id_unique` ON `agents` (`agent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `applicant_magiclink_forms_token_hash_unique` ON `applicant_magiclink_forms` (`token_hash`);--> statement-breakpoint
ALTER TABLE `risk_assessments` ALTER COLUMN "created_at" TO "created_at" integer DEFAULT '"2026-02-15T15:07:12.749Z"';--> statement-breakpoint
ALTER TABLE `applicants` ADD `escalation_tier` integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE `applicants` ADD `salvage_deadline` integer;--> statement-breakpoint
ALTER TABLE `applicants` ADD `is_salvaged` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `applicants` ADD `sanction_status` text DEFAULT 'clear';