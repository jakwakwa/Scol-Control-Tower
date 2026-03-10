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
CREATE TABLE `workflow_termination_deny_list` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` integer NOT NULL,
	`applicant_id` integer NOT NULL,
	`id_numbers` text NOT NULL,
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
DROP INDEX "agents_agent_id_unique";--> statement-breakpoint
DROP INDEX "applicant_magiclink_forms_token_hash_unique";--> statement-breakpoint
CREATE UNIQUE INDEX `agents_agent_id_unique` ON `agents` (`agent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `applicant_magiclink_forms_token_hash_unique` ON `applicant_magiclink_forms` (`token_hash`);