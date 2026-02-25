#!/usr/bin/env bun
/**
 * Seed a procurement fallback scenario for validation
 */
import { getDatabaseClient } from "../app/utils";
import { applicants, notifications, riskAssessments, workflowEvents, workflows } from "../db/schema";
import { eq } from "drizzle-orm";

const WORKFLOW_ID_TO_MODIFY = 18;

async function seedProcurementFallback() {
	const db = getDatabaseClient();
	if (!db) {
		throw new Error("Database connection failed");
	}

	console.log(`\n🌱 Seeding procurement fallback scenario for workflow ${WORKFLOW_ID_TO_MODIFY}...\n`);

	// 1. Update workflow to stage 3, awaiting_human
	await db
		.update(workflows)
		.set({
			stage: 3,
			status: "awaiting_human",
			procurementCleared: null,
		})
		.where(eq(workflows.id, WORKFLOW_ID_TO_MODIFY));
	console.log(`✅ Updated workflow ${WORKFLOW_ID_TO_MODIFY} to stage 3, awaiting_human`);

	// 2. Get applicant ID
	const wf = await db
		.select()
		.from(workflows)
		.where(eq(workflows.id, WORKFLOW_ID_TO_MODIFY))
		.limit(1);
	const applicantId = wf[0]?.applicantId;
	if (!applicantId) {
		throw new Error("Applicant not found for workflow");
	}

	// 3. Add procurement failure event
	const procurementErrorPayload = {
		error: "ProcureCheck API timeout - sandbox rate limit exceeded",
		context: "procurement_check_failed",
		source: "procurecheck",
		stage: 3,
		manualReviewRequired: true,
		fallbackMode: "manual_human_procurement_check",
		failedAreas: [
			"Automated procurement vendor screening",
			"Automated procurement risk scoring",
		],
		guidance:
			"Automated ProcureCheck could not run. Risk Manager must perform a full manual procurement check.",
	};

	await db.insert(workflowEvents).values({
		workflowId: WORKFLOW_ID_TO_MODIFY,
		eventType: "error",
		payload: JSON.stringify(procurementErrorPayload),
		actorType: "platform",
		actorId: "seed_script",
		timestamp: new Date(),
	});
	console.log("✅ Created procurement error event");

	// 4. Add risk assessment (if doesn't exist)
	const existingRiskAssessment = await db
		.select()
		.from(riskAssessments)
		.where(eq(riskAssessments.applicantId, applicantId))
		.limit(1);

	if (existingRiskAssessment.length === 0) {
		await db.insert(riskAssessments).values({
			applicantId,
			overallRisk: "amber",
			aiAnalysis: JSON.stringify({
				scores: { aggregatedScore: 68 },
				recommendation: "MANUAL_REVIEW",
				flags: [
					"Document verification completed",
					"Procurement automation failed - manual check required",
				],
				sanctionsLevel: "clear",
				validationSummary: { status: "complete" },
				riskDetails: { status: "complete" },
				dataSource: "mixed",
			}),
			reviewedBy: "seed-script",
		});
		console.log("✅ Created risk assessment");
	} else {
		console.log("ℹ️  Risk assessment already exists, skipping");
	}

	// 5. Add notification
	await db.insert(notifications).values({
		workflowId: WORKFLOW_ID_TO_MODIFY,
		applicantId,
		type: "error",
		message:
			"Manual Procurement Check Required: Automated ProcureCheck failed to execute. Continue reviewing available Stage 3 outputs and complete a full manual procurement check.",
		actionable: true,
		read: false,
		createdAt: new Date(),
	});
	console.log("✅ Created notification");

	console.log(
		`\n✅ Procurement fallback scenario seeded for workflow ${WORKFLOW_ID_TO_MODIFY}`
	);
	console.log(
		"\n📋 Next steps: Visit http://localhost:3000/dashboard/workflows/18 to see the fallback indicators\n"
	);
}

seedProcurementFallback().catch((error) => {
	console.error("❌ Seeding failed:", error);
	process.exit(1);
});
