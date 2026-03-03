DROP INDEX "agents_agent_id_unique";--> statement-breakpoint
DROP INDEX "applicant_magiclink_forms_token_hash_unique";--> statement-breakpoint
ALTER TABLE `activity_logs` ALTER COLUMN "created_at" TO "created_at" integer DEFAULT '"2026-03-03T00:51:58.265Z"';--> statement-breakpoint
CREATE UNIQUE INDEX `agents_agent_id_unique` ON `agents` (`agent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `applicant_magiclink_forms_token_hash_unique` ON `applicant_magiclink_forms` (`token_hash`);--> statement-breakpoint
ALTER TABLE `risk_assessments` ALTER COLUMN "created_at" TO "created_at" integer DEFAULT '"2026-03-03T00:51:58.265Z"';--> statement-breakpoint
ALTER TABLE `ai_feedback_logs` ADD `related_failure_event_id` integer REFERENCES workflow_events(id);--> statement-breakpoint
ALTER TABLE `notifications` ADD `severity` text DEFAULT 'medium';--> statement-breakpoint
ALTER TABLE `notifications` ADD `group_key` text;--> statement-breakpoint
ALTER TABLE `workflows` ADD `decision_type` text;--> statement-breakpoint
ALTER TABLE `workflows` ADD `target_resource` text;