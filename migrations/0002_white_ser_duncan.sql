DROP INDEX "applicant_magiclink_forms_token_hash_unique";--> statement-breakpoint
DROP INDEX "workflow_termination_screening_value_type_value_idx";--> statement-breakpoint
DROP INDEX "workflow_termination_screening_deny_list_id_idx";--> statement-breakpoint
ALTER TABLE `activity_logs` ALTER COLUMN "created_at" TO "created_at" integer DEFAULT '"2026-04-11T06:41:02.666Z"';--> statement-breakpoint
CREATE UNIQUE INDEX `applicant_magiclink_forms_token_hash_unique` ON `applicant_magiclink_forms` (`token_hash`);--> statement-breakpoint
CREATE INDEX `workflow_termination_screening_value_type_value_idx` ON `workflow_termination_screening` (`value_type`,`value`);--> statement-breakpoint
CREATE INDEX `workflow_termination_screening_deny_list_id_idx` ON `workflow_termination_screening` (`deny_list_id`);--> statement-breakpoint
ALTER TABLE `risk_assessments` ALTER COLUMN "created_at" TO "created_at" integer DEFAULT '"2026-04-11T06:41:02.665Z"';