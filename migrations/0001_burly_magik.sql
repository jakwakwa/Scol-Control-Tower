DROP INDEX "agents_agent_id_unique";--> statement-breakpoint
DROP INDEX "applicant_magiclink_forms_token_hash_unique";--> statement-breakpoint
ALTER TABLE `activity_logs` ALTER COLUMN "created_at" TO "created_at" integer DEFAULT '"2026-02-24T23:26:38.412Z"';--> statement-breakpoint
CREATE UNIQUE INDEX `agents_agent_id_unique` ON `agents` (`agent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `applicant_magiclink_forms_token_hash_unique` ON `applicant_magiclink_forms` (`token_hash`);--> statement-breakpoint
ALTER TABLE `risk_assessments` ALTER COLUMN "created_at" TO "created_at" integer DEFAULT '"2026-02-24T23:26:38.412Z"';--> statement-breakpoint
ALTER TABLE `document_uploads` ADD `file_content` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `file_content` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `mime_type` text;