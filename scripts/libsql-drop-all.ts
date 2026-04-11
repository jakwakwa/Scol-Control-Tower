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

	try {
		await client.execute("PRAGMA foreign_keys = OFF");

		// Drop views first, then iteratively drop tables until FK graph is exhausted.
		const views = await client.execute(
			"SELECT name FROM sqlite_master WHERE type = 'view' AND name NOT LIKE 'sqlite_%'"
		);
		for (const row of views.rows) {
			if (typeof row.name === "string") {
				await client.execute(`DROP VIEW IF EXISTS "${row.name}"`);
			}
		}

		let pendingTableNames = await getUserTableNames(client);
		let previousPendingCount = -1;
		while (
			pendingTableNames.length > 0 &&
			pendingTableNames.length !== previousPendingCount
		) {
			previousPendingCount = pendingTableNames.length;
			for (const tableName of pendingTableNames) {
				try {
					await client.execute(`DROP TABLE IF EXISTS "${tableName}"`);
				} catch {
					// Ignore transient FK-order failures; remaining tables are retried next pass.
				}
			}
			pendingTableNames = await getUserTableNames(client);
		}

		if (pendingTableNames.length > 0) {
			throw new Error(
				`Failed to drop all tables (${label}). Remaining: ${pendingTableNames.join(", ")}`
			);
		}
	} finally {
		await client.execute("PRAGMA foreign_keys = ON");
		client.close();
	}
}

async function getUserTableNames(
	client: ReturnType<typeof createClient>
): Promise<string[]> {
	const rows = await client.execute(
		"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
	);
	return rows.rows
		.map(row => (typeof row.name === "string" ? row.name : null))
		.filter((name): name is string => name !== null);
}
