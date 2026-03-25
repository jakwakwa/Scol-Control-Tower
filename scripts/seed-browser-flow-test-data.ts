#!/usr/bin/env bun
import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { applicants, workflows } from "../db/schema";

config({ path: resolve(process.cwd(), ".env.local"), override: false, quiet: true });
config({ path: resolve(process.cwd(), ".env.test"), override: false, quiet: true });

const target = process.env.BROWSER_FLOW_SEED_TARGET || "test";
const isTestTarget = target === "test";

const url = isTestTarget
	? process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
	: process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;
const authToken = isTestTarget
	? process.env.TEST_TURSO_GROUP_AUTH_TOKEN || process.env.TURSO_GROUP_AUTH_TOKEN
	: process.env.TURSO_GROUP_AUTH_TOKEN || process.env.TEST_TURSO_GROUP_AUTH_TOKEN;

if (!url) {
	process.stderr.write(
		`Missing database URL for target=${target}. Expected ${
			isTestTarget ? "TEST_DATABASE_URL" : "DATABASE_URL"
		}.\n`
	);
	process.exit(1);
}

const client = createClient({ url, authToken });
const db = drizzle(client);

const now = Date.now();

async function seedBrowserFlowData() {
	// Stage 4 seed: pending human risk review
	const [stage4Applicant] = await db
		.insert(applicants)
		.values({
			companyName: `BrowserFlow Stage4 Co ${now}`,
			contactName: "Risk Review Candidate",
			email: `browserflow-stage4-${now}@example.com`,
			phone: "+27820000004",
			entityType: "company",
			productType: "standard",
			industry: "Technology",
			employeeCount: 10,
			status: "qualified",
		})
		.returning({ id: applicants.id });

	if (!stage4Applicant) {
		throw new Error("Failed to create stage4 applicant seed");
	}

	await db.insert(workflows).values({
		applicantId: stage4Applicant.id,
		stage: 4,
		status: "awaiting_human",
		stageName: "Risk Review",
		reviewType: "general",
		decisionType: "risk_review",
		targetResource: "/api/risk-decision",
	});

	// Stage 5/6 seed: contract/final-approval ready workflow
	const [stage56Applicant] = await db
		.insert(applicants)
		.values({
			companyName: `BrowserFlow Stage56 Co ${now}`,
			contactName: "Final Approval Candidate",
			email: `browserflow-stage56-${now}@example.com`,
			phone: "+27820000056",
			entityType: "company",
			productType: "standard",
			industry: "Finance",
			employeeCount: 25,
			status: "qualified",
		})
		.returning({ id: applicants.id });

	if (!stage56Applicant) {
		throw new Error("Failed to create stage5-6 applicant seed");
	}

	await db.insert(workflows).values({
		applicantId: stage56Applicant.id,
		stage: 5,
		status: "awaiting_human",
		stageName: "Contract",
		reviewType: "general",
		decisionType: "final_approval",
		targetResource: "/api/onboarding/approve",
	});

	const output = {
		createdAt: new Date().toISOString(),
		stage4ApplicantId: stage4Applicant.id,
		stage56ApplicantId: stage56Applicant.id,
	};

	const outputPath = resolve(
		process.cwd(),
		"tests/browser-flow/.seed-output.json"
	);
	writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

	process.stdout.write("Browser-flow seed complete:\n");
	process.stdout.write(`Target DB: ${target}\n`);
	process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
	process.stdout.write(`Seed output written to ${outputPath}\n`);
}

seedBrowserFlowData()
	.catch(err => {
		process.stderr.write(`Failed to seed browser-flow test data: ${String(err)}\n`);
		process.exit(1);
	})
	.finally(() => {
		client.close();
	});
