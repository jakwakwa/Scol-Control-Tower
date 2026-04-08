#!/usr/bin/env bun
/**
 * Test-DB seed: applicant + workflow + real ProcureCheck results for PDF export verification.
 * Usage: E2E_USE_TEST_DB=1 bun run scripts/seed-procurecheck-verify.ts
 * Writes tests/browser-flow/.seed-output.json (pcVerifyApplicantId, pcVerifyWorkflowId).
 *
 * Required env (set in .env.test — never commit real registration/VAT numbers):
 * E2E_PROCURECHECK_REUSE_VENDOR, PROCURECHECK_VERIFICATION_VENDOR_ID,
 * PROCURECHECK_VERIFICATION_REG_NO, PROCURECHECK_VERIFICATION_VAT_NO, TEST_DATABASE_URL
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

// Load env before any module imports that read process.env.
const root = process.cwd();
config({ path: resolve(root, ".env.test") });
config({ path: resolve(root, ".env.local"), override: true });

// Force test DB for getDatabaseClient() used by risk-check service and others.
process.env.E2E_USE_TEST_DB = "1";

// Validate required env vars.
const requiredVars = [
	"E2E_PROCURECHECK_REUSE_VENDOR",
	"PROCURECHECK_VERIFICATION_VENDOR_ID",
	"PROCURECHECK_VERIFICATION_REG_NO",
	"PROCURECHECK_VERIFICATION_VAT_NO",
	"TEST_DATABASE_URL",
] as const;
for (const v of requiredVars) {
	if (!process.env[v]) {
		console.error(`Missing required env var: ${v}`);
		process.exit(1);
	}
}
if (process.env.E2E_PROCURECHECK_REUSE_VENDOR !== "1") {
	console.error("E2E_PROCURECHECK_REUSE_VENDOR must be '1'. Check .env.test.");
	process.exit(1);
}

const { createClient } = await import("@libsql/client");
const { drizzle } = await import("drizzle-orm/libsql");
const { and, eq } = await import("drizzle-orm");
const { applicants, workflows, riskCheckResults } = await import("../db/schema");
const { resolveVendorStep, checkVendorReadiness, fetchAllCategoryResults } = await import(
	"../lib/services/procurecheck-steps"
);

// Direct LibSQL client; app code uses getDatabaseClient (E2E_USE_TEST_DB set above).
const url = process.env.TEST_DATABASE_URL as string;
const authToken = process.env.TEST_TURSO_GROUP_AUTH_TOKEN;
const client = createClient({ url, authToken });
const db = drizzle(client);

const pcRegNo = process.env.PROCURECHECK_VERIFICATION_REG_NO as string;
const pcVatNo = process.env.PROCURECHECK_VERIFICATION_VAT_NO as string;
const now = Date.now();
const [applicant] = await db
	.insert(applicants)
	.values({
		companyName: `ProcureCheck Verify Co ${now}`,
		contactName: "Verify Contact",
		email: `pc-verify-${now}@example.com`,
		phone: "+27820000099",
		entityType: "company",
		productType: "standard",
		industry: "Technology",
		employeeCount: 5,
		registrationNumber: pcRegNo,
		vatNumber: pcVatNo,
		status: "new",
	})
	.returning({ id: applicants.id });

if (!applicant) throw new Error("Failed to create applicant");
const applicantId = applicant.id;
const [workflow] = await db
	.insert(workflows)
	.values({
		applicantId,
		stage: 3,
		status: "pending",
	})
	.returning({ id: workflows.id });

if (!workflow) throw new Error("Failed to create workflow");
const workflowId = workflow.id;
await db.insert(riskCheckResults).values([
	{
		workflowId,
		applicantId,
		checkType: "PROCUREMENT",
		machineState: "pending",
		reviewState: "pending",
	},
	{
		workflowId,
		applicantId,
		checkType: "ITC",
		machineState: "pending",
		reviewState: "pending",
	},
	{
		workflowId,
		applicantId,
		checkType: "SANCTIONS",
		machineState: "pending",
		reviewState: "pending",
	},
	{
		workflowId,
		applicantId,
		checkType: "FICA",
		machineState: "pending",
		reviewState: "pending",
	},
]);

const vendorResolution = await resolveVendorStep({
	vendorName: `ProcureCheck Verify Co ${now}`,
	registrationNumber: pcRegNo,
	entityType: "company",
	idNumber: null,
	vatNumber: pcVatNo,
	applicantId,
});
const readiness = await checkVendorReadiness(vendorResolution.vendorId);

if (!readiness.ready) {
	const vid = process.env.PROCURECHECK_VERIFICATION_VENDOR_ID ?? "verification vendor";
	console.error(
		`ERROR: Verification vendor ${vid} is not ready in the sandbox (checks incomplete). Aborting.`
	);
	process.exit(1);
}
const categoryResults = await fetchAllCategoryResults(
	vendorResolution.vendorId,
	readiness.summaryItems,
	`ProcureCheck Verify Co ${now}`
);
await db
	.update(riskCheckResults)
	.set({
		machineState: "completed",
		provider: "procurecheck",
		externalCheckId: vendorResolution.vendorId,
		payload: JSON.stringify(categoryResults.payload),
		rawPayload: JSON.stringify(categoryResults.rawPayload),
		completedAt: new Date(),
		updatedAt: new Date(),
	})
	.where(
		and(
			eq(riskCheckResults.workflowId, workflowId),
			eq(riskCheckResults.checkType, "PROCUREMENT")
		)
	);
for (const checkType of ["ITC", "SANCTIONS", "FICA"] as const) {
	await db
		.update(riskCheckResults)
		.set({
			machineState: "manual_required",
			errorDetails:
				"Skipped in direct-seed shortcut — not required for PDF export verification",
			completedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(riskCheckResults.workflowId, workflowId),
				eq(riskCheckResults.checkType, checkType)
			)
		);
}
await db
	.update(workflows)
	.set({
		stage: 4,
		status: "awaiting_human",
		stageName: "Risk Review",
		reviewType: "procurement",
		decisionType: "procurement_adjudication",
		targetResource: "/api/risk-decision",
		procurementCleared: false,
	})
	.where(eq(workflows.id, workflowId));

const outputPath = resolve(root, "tests/browser-flow/.seed-output.json");
let existing: Record<string, unknown> = {};
try {
	existing = JSON.parse(readFileSync(outputPath, "utf8"));
} catch {
	// missing file
}
const output = {
	...existing,
	createdAt: new Date().toISOString(),
	pcVerifyApplicantId: applicantId,
	pcVerifyWorkflowId: workflowId,
};
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

client.close();
