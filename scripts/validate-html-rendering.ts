#!/usr/bin/env bun
/**
 * Direct HTML validation for procurement fallback indicators
 */
import * as cheerio from "cheerio";

async function validateHTMLForProcurementIndicators() {
	const BASE_URL = "http://localhost:3000";
	const pages = [
		{ url: `${BASE_URL}/dashboard/workflows/18`, name: "Workflow Detail" },
		{ url: `${BASE_URL}/dashboard/notifications`, name: "Notifications" },
	];

	console.log("\n🔍 VALIDATING PROCUREMENT FALLBACK HTML RENDERING\n");

	for (const { url, name } of pages) {
		console.log(`\n${"=".repeat(60)}`);
		console.log(`Page: ${name}`);
		console.log(`URL: ${url}`);
		console.log(`${"=".repeat(60)}`);

		try {
			const response = await fetch(url);
			if (!response.ok) {
				console.log(`❌ Failed to load: ${response.status}`);
				continue;
			}

			const html = await response.text();

			// Check for key procurement indicators
			const indicators = [
				"Procurement Automation Failed",
				"procurement_check_failed",
				"Manual Procurement Check Required",
				"Automated procurement checks",
				"manual procurement check",
				"ProcureCheck",
			];

			console.log("\n📋 Procurement Indicators Found:");
			let foundAny = false;

			for (const indicator of indicators) {
				const found = html.toLowerCase().includes(indicator.toLowerCase());
				if (found) {
					console.log(`  ✅ "${indicator}"`);
					foundAny = true;

					// Extract context around the indicator
					const index = html.toLowerCase().indexOf(indicator.toLowerCase());
					const start = Math.max(0, index - 100);
					const end = Math.min(html.length, index + 200);
					const context = html.substring(start, end).replace(/\s+/g, " ");
					console.log(`     Context: ...${context}...`);
				}
			}

			if (!foundAny) {
				console.log("  ❌ No procurement indicators found");
			}
		} catch (error) {
			console.error(`❌ Error fetching ${name}:`, error);
		}
	}

	console.log("\n" + "=".repeat(60));
	console.log("✅ Validation complete");
	console.log("=".repeat(60) + "\n");
}

validateHTMLForProcurementIndicators().catch(console.error);
