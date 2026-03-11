DROP INDEX "agents_agent_id_unique";--> statement-breakpoint
DROP INDEX "applicant_magiclink_forms_token_hash_unique";--> statement-breakpoint
DROP INDEX "workflow_termination_screening_value_type_value_idx";--> statement-breakpoint
DROP INDEX "workflow_termination_screening_deny_list_id_idx";--> statement-breakpoint
ALTER TABLE `activity_logs` ALTER COLUMN "created_at" TO "created_at" integer DEFAULT '"2026-03-11T14:35:14.487Z"';--> statement-breakpoint
CREATE UNIQUE INDEX `agents_agent_id_unique` ON `agents` (`agent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `applicant_magiclink_forms_token_hash_unique` ON `applicant_magiclink_forms` (`token_hash`);--> statement-breakpoint
CREATE INDEX `workflow_termination_screening_value_type_value_idx` ON `workflow_termination_screening` (`value_type`,`value`);--> statement-breakpoint
CREATE INDEX `workflow_termination_screening_deny_list_id_idx` ON `workflow_termination_screening` (`deny_list_id`);--> statement-breakpoint
ALTER TABLE `risk_assessments` ALTER COLUMN "created_at" TO "created_at" integer DEFAULT '"2026-03-11T14:35:14.487Z"';--> statement-breakpoint
ALTER TABLE `workflows` ADD `contract_draft_reviewed_at` integer;--> statement-breakpoint
ALTER TABLE `workflows` ADD `contract_draft_reviewed_by` text;--> statement-breakpoint
ALTER TABLE `workflows` ADD `absa_packet_sent_at` integer;--> statement-breakpoint
ALTER TABLE `workflows` ADD `absa_packet_sent_by` text;--> statement-breakpoint
ALTER TABLE `workflows` ADD `absa_approval_confirmed_at` integer;--> statement-breakpoint
ALTER TABLE `workflows` ADD `absa_approval_confirmed_by` text;