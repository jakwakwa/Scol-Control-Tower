import { updateWorkflowStatus } from "@/lib/services/workflow.service";
import type { StageDependencies, StageResult } from "../types";

export async function executeStage1({
	step,
	context,
}: StageDependencies): Promise<StageResult> {
	const { workflowId } = context;

	await step.run("stage-1-start", () =>
		updateWorkflowStatus(workflowId, "processing", 1)
	);

	return {
		status: "completed",
		stage: 1,
	};
}
