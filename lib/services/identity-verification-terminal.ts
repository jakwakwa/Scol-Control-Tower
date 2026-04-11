import { and, eq, inArray } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { documentUploads } from "@/db/schema";

export type TerminalIdentityVerificationStatus = "failed_ocr" | "failed_unprocessable";

export interface WriteTerminalVerificationStatusParams {
	documentId: number;
	status: TerminalIdentityVerificationStatus;
	reason: string;
	errorMessage?: string;
}

/**
 * Persists terminal Document AI identity verification outcomes on `document_uploads`.
 * Lives outside `"use server"` files so Inngest and other trusted server callers can update
 * rows without exposing a client-invokable Server Action.
 */
export async function writeTerminalVerificationStatus(
	params: WriteTerminalVerificationStatusParams
): Promise<void> {
	const { documentId, status, reason, errorMessage } = params;
	const db = getDatabaseClient();
	if (!db) {
		throw new Error(
			`writeTerminalVerificationStatus: getDatabaseClient() returned no client; refusing to leave document ${documentId} pending without terminal write (status=${status})`
		);
	}

	const verificationNotes = [reason, errorMessage].filter(Boolean).join(" — ");

	try {
		const _updated = await db
			.update(documentUploads)
			.set({
				verificationStatus: status,
				verificationNotes,
				verifiedAt: new Date(),
				verifiedBy: "Document AI",
			})
			.where(
				and(
					eq(documentUploads.id, documentId),
					inArray(documentUploads.verificationStatus, ["pending", status])
				)
			)
			.returning({ id: documentUploads.id });
	} catch (error) {
		console.error("[FIX] writeTerminalVerificationStatus failed", {
			documentId,
			status,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		throw error;
	}
}
