/**
 * Drizzle config for the E2E test database.
 * Loads .env.test only — used by `db:push:test`, `db:migrate:test`, Studio, `test:db:reset`, and `db:reset` (test half).
 */

import { resolve } from "node:path";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: resolve(process.cwd(), ".env.test") });

const url = process.env.TEST_DATABASE_URL;
const authToken = process.env.TEST_TURSO_GROUP_AUTH_TOKEN;

export default defineConfig({
	schema: "./db/schema.ts",
	out: "./migrations",
	dialect: "turso",
	...(url
		? {
				dbCredentials: {
					url,
					authToken: authToken || "",
				},
			}
		: {}),
});
