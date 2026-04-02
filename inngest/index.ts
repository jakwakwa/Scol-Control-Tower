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
export { autoVerifyIdentity } from "./functions/services/id-verification";
export { controlTowerWorkflow } from "./functions/workflow-coordinator";

import { documentAggregator } from "./functions/handlers/document-handler";
import { killSwitchHandler } from "./functions/handlers/kill-switch-handler";
import { zombieReconciler } from "./functions/handlers/zombie-reconciler";
// Export all functions as array for serve()
import { autoVerifyIdentity } from "./functions/services/id-verification";

export const functions = [
	controlTowerWorkflow,
	killSwitchHandler,
	documentAggregator,
	zombieReconciler,
	autoVerifyIdentity,
];
