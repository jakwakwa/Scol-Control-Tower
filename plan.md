n Documents Migration Plan, your original request explicitly said:

migrate to document_uploads
update all write paths
update all read paths
after QA sign-off, drop or archive documents
remove schema/import references across the codebase
But when the assistant delegated the backend work, it changed the scope to:

“scope to implement now”
“code changes, not production execution”
That narrower subtask is the important part. It explains why you ended up with:

a migration script
some touched read/write paths
no actual table drop
no full repo-wide removal of documents
You can see the artifact of that narrowed approach in scripts/migrate-documents-to-document-uploads.ts, which is only a copy script from documents to document_uploads:


migrate-documents-to-document-uploads.ts
Lines 1-13
#!/usr/bin/env bun
/**
 * One-time migration: copy legacy `documents` rows into `document_uploads`.
 *
 * Usage:
 *   bun run scripts/migrate-documents-to-document-uploads.ts --dry-run
 *   bun run scripts/migrate-documents-to-document-uploads.ts
 */
That script is consistent with “prepare migration tooling,” not “retire the old system.”

The bigger problem is that the cleanup was not completed in code either. documents is still in the schema:


schema.ts
Lines 79-87
/**
 * Documents table - Dedicated document tracking
 */
export const documents = sqliteTable("documents", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	applicantId: integer("applicant_id")
		.notNull()
And there are still live references across the repo. The ones that matter most for your current bug include:

inngest/functions/handlers/document-handler.ts
app/api/documents/download/route.ts
app/actions/verify-id.ts
app/api/applicants/[id]/route.ts
lib/services/agent-stats.ts
lib/services/state-lock.service.ts
app/api/test/state-lock-collision/route.ts
The critical one for the stuck workflow is still reading the legacy table:


document-handler.ts
Lines 26-35
const applicantDocs = await step.run("fetch-all-documents", async () => {
	const db = getDatabaseClient();
	if (!db) throw new Error("Database connection failed");
	return await db
		.select()
		.from(documents)
		.where(eq(documents.applicantId, applicantId));
});
So the honest answer is:

the migration was only partially implemented
the “drop documents completely” phase never happened
the “remove all references from the codebase” phase also never happened
because the legacy table stayed in db/schema.ts, old reads kept compiling and this exact class of regression remained possible
I’d separate the failure into two parts.

Execution scope drift
The session began as a full retirement plan, but the backend work was reframed into a smaller, safer “code changes only” task. That removed the hardest part: actually deleting the old source of truth.

Verification gap
There was no final repo-wide proof step like “rg for documents must return zero production references before this is done.” If that check had been treated as a hard gate, this would have been caught immediately.

So this was not just “someone forgot to run the drop.” It was an incomplete migration boundary:

migration tooling added
some consumers moved
legacy schema preserved
old readers left behind
