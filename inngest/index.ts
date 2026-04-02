/**
 * Inngest exports - Control Tower Workflow
 *
 * This is the PRD-aligned onboarding workflow with:
 * - Kill switch functionality
 * - Parallel processing streams
 * - Conditional document logic
 * - AI agent integration
 */
export { inngest } from "./client";
export {
	controlTowerWorkflow,
} from "./functions/workflow-coordinator";
export { autoVerifyIdentity } from "./functions/services/id-verification";

import {
	controlTowerWorkflow,
} from "./functions/control-tower-workflow";
// Export all functions as array for serve()
import { autoVerifyIdentity } from "./functions/id-verification";
import { documentAggregator } from "./functions/document-aggregator";
import { zombieReconciler } from "./functions/zombie-reconciler";
import { killSwitchHandler } from "./functions/handlers/kill-switch-handler";





export const functions = [
	controlTowerWorkflow,
	killSwitchHandler,
	documentAggregator,
	zombieReconciler,
	autoVerifyIdentity,
];
