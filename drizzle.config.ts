import "./envConfig";

import { defineConfig } from "drizzle-kit";


const hasCredentials =
	process.env.TURSO_DATABASE_NAME &&
	process.env.TURSO_ORG &&
	process.env.TURSO_GROUP_AUTH_TOKEN;

export default defineConfig({
	schema: "./db/schema.ts",
	out: "./migrations",
	dialect: "turso",
	...(hasCredentials
		? {
				dbCredentials: {
					url: process.env.DATABASE_URL!,
					authToken: process.env.TURSO_GROUP_AUTH_TOKEN,
				},
			}
		: {}),
});
