import { getDatabaseClient } from "@/app/utils";
import { workflowEvents } from "@/db/schema";
import { inngest } from "@/inngest/client";

export const killSwitchHandler = inngest.createFunction(
	{
		id: "stratcol-kill-switch-handler",
		name: "Kill Switch Handler",
	},
	{ event: "workflow/terminated" },
	async ({ event, step }) => {
		const { workflowId, reason, decidedBy, terminatedAt } = event.data;

		await step.run("log-termination", async () => {
			const db = getDatabaseClient();
			if (!db) return;

			await db.insert(workflowEvents).values({
				workflowId,
				eventType: "kill_switch_handled",
				payload: JSON.stringify({
					reason,
					decidedBy,
					terminatedAt,
					handledAt: new Date().toISOString(),
				}),
			});
		});

		return {
			handled: true,
			workflowId,
			reason,
		};
	}
);