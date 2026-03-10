ALTER TABLE `workflow_termination_deny_list` ADD `board_member_ids` text NOT NULL DEFAULT '[]';
--> statement-breakpoint
-- Backfill screening with board_member_id type for existing deny list entries
INSERT INTO workflow_termination_screening (deny_list_id, value_type, value, created_at)
SELECT d.id, 'board_member_id', json_each.value, d.created_at
FROM workflow_termination_deny_list d, json_each(d.board_member_ids)
WHERE json_each.value IS NOT NULL AND json_each.value != '';