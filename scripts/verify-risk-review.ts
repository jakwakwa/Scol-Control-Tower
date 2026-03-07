import "../envConfig";
import { createClient } from "@libsql/client";

const client = createClient({
	url: process.env.DATABASE_URL!,
	authToken: process.env.TURSO_GROUP_AUTH_TOKEN,
});

async function verify() {
	// 1. Check for workflows in 'awaiting_human' status at stage 3 or 4
	const workflows = await client.execute({
		sql: "SELECT id, status, stage, applicant_id FROM workflows WHERE status = ? AND (stage = 3 OR stage = 4)",
		args: ["awaiting_human"],
	});

	if (workflows.rows.length === 0) {
		console.error("❌ No workflows found for Risk Review!");
		return;
	}

	// 2. Check assessments
	for (const w of workflows.rows) {
		const assessment = await client.execute({
			sql: "SELECT ai_analysis FROM risk_assessments WHERE applicant_id = ?",
			args: [w.applicant_id],
		});

		if (assessment.rows.length > 0) {
			const raw = assessment.rows[0].ai_analysis;
			if (raw) {
			} else {
				console.warn(`⚠️ Workflow #${w.id}: Assessment exists but AI Analysis is null.`);
			}
		} else {
			console.warn(`❌ Workflow #${w.id}: Missing Risk Assessment.`);
		}
	}
}

verify().catch(console.error);
