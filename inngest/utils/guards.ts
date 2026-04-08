import { isWorkflowTerminated } from "@/lib/services/kill-switch.service";
import { NonRetriableError } from "inngest";

export async function guardKillSwitch(
    workflowId: number,
    stepName: string
): Promise<void> {
    const terminated = await isWorkflowTerminated(workflowId);
    if (terminated) {
        throw new NonRetriableError(
            `[KillSwitch] Workflow ${workflowId} terminated - stopping ${stepName}`
        );
    }
}