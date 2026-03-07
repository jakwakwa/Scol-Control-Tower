/**
 * Risk service - AI risk analysis operations
 */

import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { applicants } from "@/db/schema";

import { createTestVendor, getVendorResults } from "@/lib/procurecheck";

export interface RiskResult {
	riskScore: number;
	anomalies: string[];
	recommendedAction: string;
	procureCheckId?: string;
	procureCheckData?: Record<string, unknown>;
}

/**
 * Perform Risk Analysis using ProcureCheck (Sandbox)
 */
export async function analyzeRisk(applicantId: number): Promise<RiskResult> {
	// Fetch applicant data
	const db = getDatabaseClient();
	let applicantData = null;
	if (db) {
		try {
			const applicantResults = await db
				.select()
				.from(applicants)
				.where(eq(applicants.id, applicantId));
			if (applicantResults.length > 0) {
				applicantData = applicantResults[0];
			}
		} catch (err) {
			console.error("[RiskService] Failed to fetch applicant:", err);
			throw err;
		}
	}

	if (!applicantData) {
		throw new Error(`[RiskService] Applicant ${applicantId} not found`);
	}

	// 1. Initiate Check
	let checkResult: Record<string, unknown> | undefined;
	try {
		checkResult = await createTestVendor({
			applicantId,
			vendorName: applicantData.companyName,
			registrationNumber: applicantData.registrationNumber,
		});
	} catch (error) {
		console.error("[RiskService] ProcureCheck creation failed:", error);
		throw error;
	}

	// 2. Poll for Results (Short wait in sandbox, real world might be async job)
	// For this synchronous/blocking step, we'll wait 2 seconds then fetch.
	await new Promise(resolve => setTimeout(resolve, 2000));

	const vendorId = (checkResult?.ProcureCheckVendorID || checkResult?.id) as
		| string
		| undefined; // Adjust based on actual response key
	if (!vendorId) {
		throw new Error("ProcureCheck did not return a Vendor ID");
	}

	let results: any = null; // Ideally type this fully based on API docs, but explicit any/unknown is better than implicit
	try {
		results = await getVendorResults(vendorId);
	} catch (error) {
		console.error("[RiskService] Failed to fetch results:", error);
	}

	// 3. Parse Results (Mock logic for sandbox response parsing)
	// "Failed" checks in response usually indicate risk.
	const failures = results?.RiskSummary?.FailedChecks || 0;
	// Unused variable 'passed' removed to fix lint warning if any

	let riskScore = 100; // Start perfect
	const anomalies: string[] = [];

	if (failures > 0) {
		riskScore -= failures * 20; // Deduction per failure
		anomalies.push(`${failures} compliance checks failed in ProcureCheck`);
	} else if (!results) {
		throw new Error("No results returned from ProcureCheck");
	}

	if (results?.JudgementCheck?.Failed) {
		anomalies.push("Judgement Check Failed");
		riskScore -= 30;
	}

	// Cap score
	riskScore = Math.max(0, riskScore);

	let recommendedAction = "APPROVE";
	if (riskScore < 60) recommendedAction = "REJECT";
	else if (riskScore < 80) recommendedAction = "MANUAL_REVIEW";

	return {
		riskScore,
		anomalies,
		recommendedAction,
		procureCheckId: vendorId,
		procureCheckData: results || undefined,
	};
}
