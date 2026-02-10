/**
 * Test Database Reset Script
 * Resets the local test SQLite database for E2E tests
 */
import { existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "../db/schema";

const TEST_DB_PATH = resolve(__dirname, "../e2e/test.db");
const MIGRATIONS_PATH = resolve(__dirname, "../migrations");

async function resetTestDatabase() {
	console.info("🧹 Resetting test database...");

	// Remove existing test database
	if (existsSync(TEST_DB_PATH)) {
		unlinkSync(TEST_DB_PATH);
		console.info("   Removed existing test.db");
	}

	// Create fresh database with migrations
	const client = createClient({
		url: `file:${TEST_DB_PATH}`,
	});

	const db = drizzle(client, { schema });

	// Run migrations
	console.info("   Running migrations...");
	await migrate(db, { migrationsFolder: MIGRATIONS_PATH });

	// Seed with test data
	console.info("   Seeding test data...");
	await seedTestData(db);

	console.info("✅ Test database ready!");
	client.close();
}

async function seedTestData(db: ReturnType<typeof drizzle>) {
	// Create test applicant
	const [applicant] = await db
		.insert(schema.applicants)
		.values({
			companyName: "Test Company Pty Ltd",
			tradingName: "TestCo",
			registrationNumber: "2024/123456/07",
			contactName: "John Test",
			email: "test@testco.co.za",
			phone: "+27821234567",
			status: "pending",
		})
		.returning();

	// Create workflow for the applicant
	await db.insert(schema.workflows).values({
		applicantId: applicant.id,
		status: "pending",
		stage: 1,
	});

	console.info(
		`   Created test applicant: ${applicant.companyName} (ID: ${applicant.id})`
	);
}

resetTestDatabase().catch(console.error);