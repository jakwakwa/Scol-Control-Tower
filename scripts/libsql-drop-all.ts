import { createClient } from "@libsql/client";

/**
 * Drops every user table and view in a LibSQL/Turso database, including
 * Drizzle's migration tracking table.
 */
export async function dropAllLibsqlObjects(
	url: string,
	authToken: string | undefined,
	label: string
): Promise<void> {
	console.info(`🧹 Dropping all tables and views (${label})...`);

	const client = createClient({ url, authToken });

	await client.execute("PRAGMA foreign_keys = OFF");

	const objects = await client.execute(
		"SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'"
	);

	for (const row of objects.rows) {
		if (typeof row.name !== "string" || typeof row.type !== "string") {
			continue;
		}

		const keyword = row.type === "view" ? "VIEW" : "TABLE";
		await client.execute(`DROP ${keyword} IF EXISTS "${row.name}"`);
	}

	await client.execute("PRAGMA foreign_keys = ON");
	client.close();
}
