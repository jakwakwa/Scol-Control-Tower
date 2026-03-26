DROP INDEX "agents_agent_id_unique";--> statement-breakpoint
DROP INDEX "applicant_magiclink_forms_token_hash_unique";--> statement-breakpoint
DROP INDEX "workflow_termination_screening_value_type_value_idx";--> statement-breakpoint
DROP INDEX "workflow_termination_screening_deny_list_id_idx";--> statement-breakpoint
ALTER TABLE `activity_logs` ALTER COLUMN "created_at" TO "created_at" integer DEFAULT '"2026-03-19T16:47:08.120Z"';--> statement-breakpoint
CREATE UNIQUE INDEX `agents_agent_id_unique` ON `agents` (`agent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `applicant_magiclink_forms_token_hash_unique` ON `applicant_magiclink_forms` (`token_hash`);--> statement-breakpoint
CREATE INDEX `workflow_termination_screening_value_type_value_idx` ON `workflow_termination_screening` (`value_type`,`value`);--> statement-breakpoint
CREATE INDEX `workflow_termination_screening_deny_list_id_idx` ON `workflow_termination_screening` (`deny_list_id`);--> statement-breakpoint
ALTER TABLE `risk_assessments` ALTER COLUMN "created_at" TO "created_at" integer DEFAULT '"2026-03-19T16:47:08.118Z"';--> statement-breakpoint
ALTER TABLE `workflows` ADD `green_lane_requested_at` integer;--> statement-breakpoint
ALTER TABLE `workflows` ADD `green_lane_requested_by` text;--> statement-breakpoint
ALTER TABLE `workflows` ADD `green_lane_request_notes` text;--> statement-breakpoint
ALTER TABLE `workflows` ADD `green_lane_request_source` text;--> statement-breakpoint
ALTER TABLE `workflows` ADD `green_lane_consumed_at` integer;