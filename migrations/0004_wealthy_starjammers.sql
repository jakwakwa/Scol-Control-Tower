DROP INDEX "agents_agent_id_unique";--> statement-breakpoint
DROP INDEX "applicant_magiclink_forms_token_hash_unique";--> statement-breakpoint
ALTER TABLE `activity_logs` ALTER COLUMN "created_at" TO "created_at" integer DEFAULT '"2026-03-01T11:07:55.813Z"';--> statement-breakpoint
CREATE UNIQUE INDEX `agents_agent_id_unique` ON `agents` (`agent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `applicant_magiclink_forms_token_hash_unique` ON `applicant_magiclink_forms` (`token_hash`);--> statement-breakpoint
ALTER TABLE `risk_assessments` ALTER COLUMN "created_at" TO "created_at" integer DEFAULT '"2026-03-01T11:07:55.813Z"';--> statement-breakpoint
ALTER TABLE `workflows` ADD `state_lock_version` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `workflows` ADD `state_locked_at` integer;--> statement-breakpoint
ALTER TABLE `workflows` ADD `state_locked_by` text;