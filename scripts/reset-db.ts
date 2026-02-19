import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../db/schema";

async function reset() {
	const url = process.env.DATABASE_URL;
	const authToken = process.env.TURSO_GROUP_AUTH_TOKEN;

	if (!url) {
		console.error("DATABASE_URL is not defined in environment");
		process.exit(1);
	}

	const client = createClient({
		url,
		authToken,
	});

	const db = drizzle(client, { schema });

	try {
		await db.delete(schema.signatures);
		await db.delete(schema.internalSubmissions);
		await db.delete(schema.documentUploads);
		await db.delete(schema.internalForms);
		await db.delete(schema.agentCallbacks);
		await db.delete(schema.aiFeedbackLogs);
		await db.delete(schema.aiAnalysisLogs);
		await db.delete(schema.sanctionClearance);
		await db.delete(schema.workflowEvents);
		await db.delete(schema.quotes);
		await db.delete(schema.notifications);
		await db.delete(schema.applicantSubmissions);
		await db.delete(schema.applicantMagiclinkForms);
		await db.delete(schema.workflows);
		await db.delete(schema.documents);
		await db.delete(schema.riskAssessments);
		await db.delete(schema.activityLogs);
		await db.delete(schema.applicants);
		await db.delete(schema.agents);
		await db.delete(schema.todos);
	} catch (error) {
		console.error("Error resetting database:", error);
		process.exit(1);
	}
}

reset();
