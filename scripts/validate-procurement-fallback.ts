#!/usr/bin/env bun
/**
 * Manual validation script for procurement fallback visibility
 * Tests API endpoints and reports what would be visible in the UI
 */

const JWT_TOKEN = process.env.TEST_JWT_TOKEN || "";
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

interface RiskReviewItem {
	id: number;
	workflowId: number;
	companyName: string;
	clientName: string;
	procurementCheckFailed?: boolean;
	procurementFailureReason?: string;
	procurementFailureSource?: string;
	procurementFailureGuidance?: string;
	aiTrustScore?: number;
	reviewType?: string;
}

async function testEndpoint(url: string, name: string) {
	console.log(`\n${"=".repeat(60)}`);
	console.log(`Testing: ${name}`);
	console.log(`URL: ${url}`);
	console.log(`${"=".repeat(60)}`);

	try {
		const response = await fetch(url, {
			headers: {
				Cookie: `__session=${JWT_TOKEN}`,
			},
		});

		console.log(`Status: ${response.status} ${response.statusText}`);

		if (response.status === 200) {
			const contentType = response.headers.get("content-type");
			if (contentType?.includes("application/json")) {
				const data = await response.json();
				return { success: true, data };
			}
			const text = await response.text();
			return { success: true, html: text.substring(0, 500) };
		}

		console.log("❌ Request failed");
		return { success: false, status: response.status };
	} catch (error) {
		console.error("❌ Error:", error);
		return { success: false, error };
	}
}

async function validateProcurementFallback() {
	console.log("\n🔍 PROCUREMENT FALLBACK VALIDATION REPORT");
	console.log("=" + "=".repeat(59));
	console.log(`Base URL: ${BASE_URL}`);
	console.log(`Token length: ${JWT_TOKEN.length} chars`);

	// Test 1: Risk Review API
	const riskReviewResult = await testEndpoint(
		`${BASE_URL}/api/risk-review`,
		"/api/risk-review - Get workflows awaiting review"
	);

	if (riskReviewResult.success && riskReviewResult.data) {
		const items = riskReviewResult.data.items as RiskReviewItem[];
		console.log(`\n✅ Found ${items.length} risk review items`);

		const procurementFallbacks = items.filter((item) => item.procurementCheckFailed);
		console.log(
			`\n📋 Procurement Fallback Items: ${procurementFallbacks.length}/${items.length}`
		);

		if (procurementFallbacks.length > 0) {
			console.log("\n🚨 PROCUREMENT FALLBACK DETAILS:");
			for (const item of procurementFallbacks) {
				console.log(`\n  Workflow ID: ${item.workflowId}`);
				console.log(`  Company: ${item.companyName}`);
				console.log(`  Failed: ${item.procurementCheckFailed}`);
				console.log(`  Reason: ${item.procurementFailureReason || "N/A"}`);
				console.log(`  Source: ${item.procurementFailureSource || "N/A"}`);
				console.log(`  Guidance: ${item.procurementFailureGuidance || "N/A"}`);
				console.log(`  AI Trust Score: ${item.aiTrustScore || "N/A"}`);
			}
		} else {
			console.log("\n✅ No procurement fallbacks found (system healthy)");
		}
	}

	// Test 2: Workflows API
	await testEndpoint(
		`${BASE_URL}/api/workflows`,
		"/api/workflows - List all workflows"
	);

	// Test 3: Dashboard page (HTML)
	const dashboardResult = await testEndpoint(
		`${BASE_URL}/dashboard`,
		"/dashboard - Main dashboard page"
	);

	if (dashboardResult.success) {
		console.log("\n✅ Dashboard page loaded");
	}

	// Test 4: Risk Review page
	const riskReviewPageResult = await testEndpoint(
		`${BASE_URL}/dashboard/risk-review`,
		"/dashboard/risk-review - Risk review page"
	);

	if (riskReviewPageResult.success) {
		console.log("\n✅ Risk Review page loaded");
	}

	// Test 5: Notifications page
	const notificationsResult = await testEndpoint(
		`${BASE_URL}/dashboard/notifications`,
		"/dashboard/notifications - Notifications page"
	);

	if (notificationsResult.success) {
		console.log("\n✅ Notifications page loaded");
	}

	// Test 6: Specific workflow
	const workflowResult = await testEndpoint(
		`${BASE_URL}/dashboard/workflows/18`,
		"/dashboard/workflows/18 - Workflow detail page"
	);

	if (workflowResult.success) {
		console.log("\n✅ Workflow detail page loaded");
	}

	// Summary
	console.log("\n" + "=".repeat(60));
	console.log("📊 SUMMARY");
	console.log("=".repeat(60));
	console.log("\nExpected Procurement Fallback Indicators:");
	console.log("  1. /dashboard/workflows/[id]:");
	console.log('     - Event: "Procurement Automation Failed"');
	console.log(
		'     - Banner: "Automated procurement checks did not run..."'
	);
	console.log("\n  2. /dashboard/risk-review:");
	console.log('     - Badge: "Manual Procurement Check"');
	console.log('     - Warning: "Manual Procurement Check Required"');
	console.log("\n  3. /dashboard/notifications:");
	console.log('     - Message: "Automated procurement checks failed..."');
	console.log("\n  4. API response includes:");
	console.log("     - procurementCheckFailed: true");
	console.log("     - procurementFailureReason: <error detail>");
	console.log("     - procurementFailureGuidance: <manual check instruction>");

	console.log("\n✅ Validation complete");
}

// Run validation
validateProcurementFallback().catch(console.error);
