import { getBaseUrl } from "@/app/utils";
import type { KillSwitchReason } from "@/lib/services/kill-switch.service";
import { sendInternalAlertEmail } from "@/lib/services/email.service";
import { createWorkflowNotification } from "@/lib/services/notification-events.service";
import { terminateRun } from "@/lib/services/terminate-run.service";
import type { ControlTowerStepTools } from "../control-tower/types";
import { guardKillSwitch } from "@/inngest/utils/guards";

interface HandleWaitTimeoutInput {
	step: ControlTowerStepTools;
	workflowId: number;
	applicantId: number;
	stage: number;
	reason: KillSwitchReason;
	notifyStepId: string;
	terminateStepId: string;
	title: string;
	message: string;
	timeoutWindow: string;
	actionTab?: string;
}

/**
 * Shared handler for waitForEvent timeout paths.
 *
 * Encapsulates the repeating pattern: guard kill switch → notify AM →
 * send internal email → terminate run. Every timeout in the workflow
 * should go through this helper so audit payloads, notification
 * structure, and termination flow are consistent.
 *
 * @throws {NonRetriableError} Always — terminateRun never returns.
 */
export async function handleWaitTimeout({
	step,
	workflowId,
	applicantId,
	stage,
	reason,
	notifyStepId,
	terminateStepId,
	title,
	message,
	timeoutWindow,
	actionTab,
}: HandleWaitTimeoutInput): Promise<never> {
	await step.run(notifyStepId, async () => {
		await guardKillSwitch(workflowId, notifyStepId);
		await createWorkflowNotification({
			workflowId,
			applicantId,
			type: "warning",
			title: `Delay: ${title}`,
			message,
			actionable: true,
		});
		await sendInternalAlertEmail({
			title: `Delay: ${title}`,
			message: `${message} Timeout window: ${timeoutWindow}.`,
			workflowId,
			applicantId,
			type: "warning",
			actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}${actionTab ? `?tab=${actionTab}` : ""}`,
		});
	});

	await step.run(terminateStepId, () =>
		terminateRun({
			workflowId,
			applicantId,
			stage,
			reason,
		})
	);

	throw new Error("unreachable: terminateRun always throws");
}
