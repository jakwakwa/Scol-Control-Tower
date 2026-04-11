/**
 * Manual verification script: exercises the autoVerifyIdentity pipeline end-to-end.
 *
 * 1. Inserts a test ID document into documentUploads (using a minimal PNG as content).
 * 2. Sends a "document/uploaded" event to the local Inngest dev server.
 * 3. Polls for the Inngest function run to complete.
 * 4. Reads back the document's verificationStatus from the DB.
 *
 * Run:  (set -a; source .env.test; source .env.local; set +a; E2E_USE_TEST_DB=1 bun run scripts/verify-id-verification-flow.ts)
 *
 * Expected: Document AI will attempt to process the tiny PNG. It will either:
 *   - Succeed (rare with a 1x1 PNG) → status = "verified"
 *   - Return INVALID_ARGUMENT / unprocessable → status = "failed_unprocessable" (immediate, no retries)
 *   - Fail transiently (network/auth) → retries up to 4, then onFailure → status = "failed_ocr"
 *   - Credentials missing → returns { error } → transient path → retries → "failed_ocr"
 */

import { eq } from "drizzle-orm";
import { getDatabaseClient } from "../app/utils";
import { documentUploads } from "../db/schema";

// Minimal 1x1 red PNG (67 bytes) — valid image, but Document AI will reject it
const TINY_PNG_BASE64 =
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==";

const INNGEST_DEV_URL = "http://127.0.0.1:8288";
const WORKFLOW_ID = 1; // from seed data
const APPLICANT_ID = 1;

async function main() {
	const db = getDatabaseClient();
	if (!db) {
		console.error(
			"❌ No database client — check E2E_USE_TEST_DB=1 and TEST_DATABASE_URL"
		);
		process.exit(1);
	}
	const [doc] = await db
		.insert(documentUploads)
		.values({
			workflowId: WORKFLOW_ID,
			category: "individual",
			documentType: "ID_DOCUMENT",
			fileName: "test-id.png",
			fileSize: 67,
			fileContent: TINY_PNG_BASE64,
			mimeType: "image/png",
			storageKey: `${WORKFLOW_ID}/individual/test-id-verification.png`,
			verificationStatus: "pending",
			uploadedBy: "verification-script",
		})
		.returning();

	if (!doc) {
		console.error("❌ Failed to insert document");
		process.exit(1);
	}
	const eventPayload = {
		name: "document/uploaded",
		data: {
			workflowId: WORKFLOW_ID,
			applicantId: APPLICANT_ID,
			documentId: doc.id,
			documentType: "ID_DOCUMENT",
			category: "individual",
			uploadedAt: new Date().toISOString(),
		},
	};

	const sendRes = await fetch(
		`${INNGEST_DEV_URL}/e/${encodeURIComponent("document/uploaded")}`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(eventPayload),
		}
	);

	if (!sendRes.ok) {
		console.error(
			`❌ Inngest event send failed: ${sendRes.status} ${await sendRes.text()}`
		);
		process.exit(1);
	}
	const startTime = Date.now();
	const maxWaitMs = 90_000;
	let lastStatus = "unknown";
	let runCompleted = false;

	while (Date.now() - startTime < maxWaitMs) {
		try {
			const runsRes = await fetch(
				`${INNGEST_DEV_URL}/v1/events/${encodeURIComponent("document/uploaded")}/runs`
			);
			if (runsRes.ok) {
				const runsData = await runsRes.json();
				const runs = runsData?.data || [];
				// Find the most recent run
				if (runs.length > 0) {
					const latestRun = runs[0];
					lastStatus = latestRun.status;
					const elapsed = Math.round((Date.now() - startTime) / 1000);
					process.stdout.write(
						`\r   ⏳ Run status: ${lastStatus} (${elapsed}s elapsed)     `
					);

					if (
						lastStatus === "Completed" ||
						lastStatus === "Failed" ||
						lastStatus === "Cancelled"
					) {
						runCompleted = true;
						break;
					}
				}
			}
		} catch {
			// Inngest API might not have the exact endpoint; try alternative
		}

		await new Promise(r => setTimeout(r, 3000));
	}

	if (!runCompleted) {
	}
	const [finalDoc] = await db
		.select({
			id: documentUploads.id,
			verificationStatus: documentUploads.verificationStatus,
			verificationNotes: documentUploads.verificationNotes,
			verifiedBy: documentUploads.verifiedBy,
			verifiedAt: documentUploads.verifiedAt,
		})
		.from(documentUploads)
		.where(eq(documentUploads.id, doc.id));

	if (!finalDoc) {
		console.error("❌ Document not found in DB!");
		process.exit(1);
	}

	// Evaluate result
	const status = finalDoc.verificationStatus;
	if (status === "verified") {
	} else if (status === "failed_unprocessable") {
	} else if (status === "failed_ocr") {
	} else if (status === "pending") {
	} else {
	}

	process.exit(0);
}

main().catch(err => {
	console.error("Script failed:", err);
	process.exit(1);
});
