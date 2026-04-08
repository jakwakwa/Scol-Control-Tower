import { executeStage1 } from "./stages/stage1_intake";
import { executeStage2 } from "./stages/stage2_facilityApplication";
import { executeStage3 } from "./stages/stage3_enrichment";
import { executeStage4 } from "./stages/stage4_guardKillSwitch";
import { executeStage5 } from "./stages/stage5_contractWait";
import { executeStage6 } from "./stages/stage6_activation";
import type { StageDependencies, StageResult } from "./types";
export async function runControlTowerOrchestrator(
	deps: StageDependencies
): Promise<StageResult> {
	const { workflowId } = deps.context;
	console.info(`[Orchestrator] Starting workflow execution for workflow ${workflowId}`);

	// Array of stage executions in sequence.
	// In an event-driven architecture, this could be replaced by looking up current
	// workflow state and jumping to the necessary stage. For now, it runs sequentially,
	// maintaining the SOP guarantees.
	const stages = [
		executeStage1,
		executeStage2,
		executeStage3,
		executeStage4,
		executeStage5,
		executeStage6,
	];

	let lastResult: StageResult = { status: "completed", stage: 0 };

	for (let i = 0; i < stages.length; i++) {
		const executeStage = stages[i];
		console.info(`[Orchestrator] Executing Stage ${i + 1}`);

		lastResult = await executeStage(deps);

		if (lastResult.status === "terminated" || lastResult.status === "failed") {
			console.warn(
				`[Orchestrator] Workflow ${workflowId} halted at stage ${i + 1} with status ${lastResult.status}. Reason: ${lastResult.reason}`
			);
			return lastResult; // Short-circuit further execution
		}

		// Merge output data into context for downstream stages if needed.
		if (lastResult.data) {
			deps.context = { ...deps.context, ...(lastResult.data as Record<string, unknown>) };
		}
	}

	console.info(`[Orchestrator] Workflow ${workflowId} completed successfully.`);
	return lastResult;
}
