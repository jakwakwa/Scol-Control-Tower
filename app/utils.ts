import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";

export function getDatabaseClient() {
	const useTestDatabase = process.env.E2E_USE_TEST_DB === "1";
	const url = useTestDatabase ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
	const authToken = useTestDatabase
		? process.env.TEST_TURSO_GROUP_AUTH_TOKEN
		: process.env.TURSO_GROUP_AUTH_TOKEN;

	if (!url) {
		console.error(
			useTestDatabase ? "TEST_DATABASE_URL is not defined" : "DATABASE_URL is not defined"
		);
		return null;
	}

	try {
		const client = createClient({
			url,
			authToken,
		});

		return drizzle(client, { schema });
	} catch (error) {
		console.error("Failed to create database client:", error);
	}
}

export { getBaseUrl } from "@/lib/utils";
