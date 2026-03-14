import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";
import { resolveDatabaseConfig } from "@/lib/mock-environment";

export function getDatabaseClient() {
	const databaseConfig = resolveDatabaseConfig();
	const { url } = databaseConfig;

	if (!url) {
		console.error(databaseConfig.error ?? "Database URL is not defined");
		return null;
	}

	try {
		const pool = new Pool({
			connectionString: url,
		});

		return drizzle(pool, { schema });
	} catch (error) {
		console.error("Failed to create database client:", error);
	}
}

export { getBaseUrl } from "@/lib/utils";
