CREATE TABLE `workflow_termination_screening` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deny_list_id` integer NOT NULL,
	`value_type` text NOT NULL,
	`value` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`deny_list_id`) REFERENCES `workflow_termination_deny_list`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- Backfill screening from existing deny list (for deployments that had 0007 before 0008)
INSERT INTO workflow_termination_screening (deny_list_id, value_type, value, created_at)
SELECT d.id, 'id_number', json_each.value, d.created_at
FROM workflow_termination_deny_list d, json_each(d.id_numbers)
WHERE json_each.value IS NOT NULL AND json_each.value != '';
--> statement-breakpoint
INSERT INTO workflow_termination_screening (deny_list_id, value_type, value, created_at)
SELECT d.id, 'cellphone', json_each.value, d.created_at
FROM workflow_termination_deny_list d, json_each(d.cellphones)
WHERE json_each.value IS NOT NULL AND json_each.value != '';
--> statement-breakpoint
INSERT INTO workflow_termination_screening (deny_list_id, value_type, value, created_at)
SELECT d.id, 'bank_account', json_each.value, d.created_at
FROM workflow_termination_deny_list d, json_each(d.bank_accounts)
WHERE json_each.value IS NOT NULL AND json_each.value != '';
--> statement-breakpoint
-- Board member names: backfill all; matching normalizes (2+ words) when checking
INSERT INTO workflow_termination_screening (deny_list_id, value_type, value, created_at)
SELECT d.id, 'board_member_name', lower(trim(replace(json_each.value, '  ', ' '))), d.created_at
FROM workflow_termination_deny_list d, json_each(d.board_member_names)
WHERE json_each.value IS NOT NULL AND trim(json_each.value) != '';
--> statement-breakpoint
DROP INDEX "agents_agent_id_unique";--> statement-breakpoint
DROP INDEX "applicant_magiclink_forms_token_hash_unique";--> statement-breakpoint
CREATE UNIQUE INDEX `agents_agent_id_unique` ON `agents` (`agent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `applicant_magiclink_forms_token_hash_unique` ON `applicant_magiclink_forms` (`token_hash`);