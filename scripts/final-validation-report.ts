#!/usr/bin/env bun
/**
 * Final comprehensive procurement fallback validation report
 */
import { getDatabaseClient } from "../app/utils";
import { applicants, notifications, workflowEvents, workflows } from "../db/schema";
import { desc, eq, sql } from "drizzle-orm";

const WORKFLOW_ID = 18;

async function generateValidationReport() {
	console.log("\n" + "=".repeat(70));
	console.log("🔍 PROCUREMENT FALLBACK VALIDATION REPORT");
	console.log("=".repeat(70));
	console.log(`\nWorkflow ID: ${WORKFLOW_ID}`);
	console.log(`Timestamp: ${new Date().toISOString()}`);

	const db = getDatabaseClient();
	if (!db) {
		throw new Error("Database connection failed");
	}

	// 1. Workflow Status
	console.log("\n" + "-".repeat(70));
	console.log("📊 WORKFLOW STATUS");
	console.log("-".repeat(70));

	const wfResults = await db
		.select({
			workflow: workflows,
			applicant: applicants,
		})
		.from(workflows)
		.leftJoin(applicants, eq(workflows.applicantId, applicants.id))
		.where(eq(workflows.id, WORKFLOW_ID))
		.limit(1);

	if (wfResults.length === 0) {
		console.log("❌ Workflow not found");
		return;
	}

	const { workflow, applicant } = wfResults[0]!;
	console.log(`\nCompany: ${applicant?.companyName || "Unknown"}`);
	console.log(`Stage: ${workflow.stage}`);
	console.log(`Status: ${workflow.status}`);
	console.log(`Procurement Cleared: ${workflow.procurementCleared ?? "null"}`);

	// 2. Events - Check for procurement error
	console.log("\n" + "-".repeat(70));
	console.log("🔴 PROCUREMENT ERROR EVENTS");
	console.log("-".repeat(70));

	const events = await db
		.select()
		.from(workflowEvents)
		.where(eq(workflowEvents.workflowId, WORKFLOW_ID))
		.orderBy(desc(workflowEvents.timestamp));

	const errorEvents = events.filter((e) => e.eventType === "error");

	if (errorEvents.length === 0) {
		console.log("\n❌ No error events found");
	} else {
		for (const event of errorEvents) {
			const payload = JSON.parse(event.payload || "{}");
			console.log(`\nEvent ID: ${event.id}`);
			console.log(`Type: ${event.eventType}`);
			console.log(`Timestamp: ${event.timestamp?.toISOString()}`);
			console.log(`Actor: ${event.actorType} (${event.actorId})`);
			console.log("\nPayload:");
			console.log(`  Error: ${payload.error || "N/A"}`);
			console.log(`  Context: ${payload.context || "N/A"}`);
			console.log(`  Source: ${payload.source || "N/A"}`);
			console.log(`  Manual Review Required: ${payload.manualReviewRequired || false}`);
			console.log(`  Fallback Mode: ${payload.fallbackMode || "N/A"}`);
			console.log(`  Guidance: ${payload.guidance || "N/A"}`);

			if (payload.context === "procurement_check_failed") {
				console.log("\n✅ PROCUREMENT FALLBACK CONFIRMED IN DATABASE");
			}
		}
	}

	// 3. Notifications
	console.log("\n" + "-".repeat(70));
	console.log("📬 NOTIFICATIONS");
	console.log("-".repeat(70));

	const notifs = await db
		.select()
		.from(notifications)
		.where(eq(notifications.workflowId, WORKFLOW_ID))
		.orderBy(desc(notifications.createdAt));

	if (notifs.length === 0) {
		console.log("\n❌ No notifications found");
	} else {
		for (const notif of notifs) {
			console.log(`\nNotification ID: ${notif.id}`);
			console.log(`Type: ${notif.type}`);
			console.log(`Message: ${notif.message}`);
			console.log(`Actionable: ${notif.actionable}`);
			console.log(`Read: ${notif.read}`);

			if (
				notif.message?.toLowerCase().includes("procurement") ||
				notif.message?.toLowerCase().includes("manual check")
			) {
				console.log("✅ PROCUREMENT NOTIFICATION FOUND");
			}
		}
	}

	// 4. Expected UI Indicators
	console.log("\n" + "-".repeat(70));
	console.log("🎨 EXPECTED UI INDICATORS");
	console.log("-".repeat(70));

	const hasProcurementError = errorEvents.some((e) => {
		const payload = JSON.parse(e.payload || "{}");
		return payload.context === "procurement_check_failed";
	});

	if (hasProcurementError) {
		console.log("\n✅ Database contains procurement fallback data");
		console.log("\n📋 Expected visibility on pages:");
		console.log(
			"\n  1️⃣  /dashboard/workflows/18 should show:"
		);
		console.log('     - Event title: "Procurement Automation Failed"');
		console.log(
			'     - Red banner: "Automated procurement checks did not run. Continue with'
		);
		console.log('       available Stage 3 outputs and complete a full manual procurement');
		console.log('       check in Risk Review."');
		console.log("\n  2️⃣  /dashboard/risk-review should show:");
		console.log('     - Badge: "Manual Procurement Check"');
		console.log('     - Warning: "Manual Procurement Check Required"');
		console.log('     - Failure reason: "ProcureCheck API timeout..."');
		console.log("\n  3️⃣  /dashboard/notifications should show:");
		console.log('     - Notification: "Manual Procurement Check Required: Automated');
		console.log('       ProcureCheck failed to execute..."');
		console.log('     - Category badge: "Manual Check"');
	} else {
		console.log("\n❌ No procurement fallback data in database");
		console.log(
			"\nRun: bun scripts/seed-procurement-fallback.ts to create test data"
		);
	}

	// 5. HTTP Accessibility Check
	console.log("\n" + "-".repeat(70));
	console.log("🌐 HTTP ACCESSIBILITY CHECK");
	console.log("-".repeat(70));

	const urls = [
		`http://localhost:3000/dashboard/workflows/${WORKFLOW_ID}`,
		"http://localhost:3000/dashboard/risk-review",
		"http://localhost:3000/dashboard/notifications",
	];

	for (const url of urls) {
		try {
			const response = await fetch(url, { method: "HEAD" });
			console.log(`\n${response.ok ? "✅" : "❌"} ${url}`);
			console.log(`   Status: ${response.status} ${response.statusText}`);
		} catch (error) {
			console.log(`\n❌ ${url}`);
			console.log(`   Error: ${error}`);
		}
	}

	// 6. Summary
	console.log("\n" + "=".repeat(70));
	console.log("📊 SUMMARY");
	console.log("=".repeat(70));

	const checks = {
		"Workflow at Stage 3": workflow.stage === 3,
		"Workflow awaiting human": workflow.status === "awaiting_human",
		"Procurement error event exists": hasProcurementError,
		"Notification exists": notifs.length > 0,
	};

	for (const [check, passed] of Object.entries(checks)) {
		console.log(`${passed ? "✅" : "❌"} ${check}`);
	}

	if (Object.values(checks).every((v) => v)) {
		console.log(
			"\n✅ ALL CHECKS PASSED - Procurement fallback scenario is correctly seeded"
		);
		console.log(
			"\n📌 Next step: Open http://localhost:3000/dashboard/workflows/18 in browser"
		);
		console.log("   to visually confirm the procurement fallback indicators render.");
	} else {
		console.log(
			"\n⚠️  Some checks failed - data may need reseeding"
		);
	}

	console.log("\n" + "=".repeat(70) + "\n");
}

generateValidationReport().catch((error) => {
	console.error("❌ Validation failed:", error);
	process.exit(1);
});
