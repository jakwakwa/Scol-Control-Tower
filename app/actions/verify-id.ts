"use server";

import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { documentUploads, workflows } from "@/db/schema";

export type IdentityVerificationDocumentAiEntity = {
	type?: string | null;
	value?: string | null;
};

export type IdentityVerificationProcessResult =
	| { data: { entities: IdentityVerificationDocumentAiEntity[] } }
	| { error: string };

export async function writeTerminalVerificationStatus({
	documentId,
	status,
	reason,
	errorMessage,
}: {
	documentId: number;
	status: "failed_ocr" | "failed_unprocessable";
	reason: string;
	errorMessage?: string;
}): Promise<void> {
	const db = getDatabaseClient();
	if (!db) return;

	const notes = [reason, errorMessage].filter(Boolean).join(" | ");

	// Idempotent: only update if the row is still pending or already carries the
	// same terminal status. Protects "verified" rows from being overwritten by a
	// duplicate onFailure event.
	await db
		.update(documentUploads)
		.set({
			verificationStatus: status,
			verificationNotes: notes,
			verifiedAt: new Date(),
			verifiedBy: "auto-verify-identity",
		})
		.where(
			and(
				eq(documentUploads.id, documentId),
				inArray(documentUploads.verificationStatus, ["pending", status])
			)
		);
}
export async function verifyIdentity(applicantId: number) {
	return processIdentityVerification(applicantId);
}

export async function processIdentityVerification(
	applicantId: number,
	documentId?: number
): Promise<IdentityVerificationProcessResult> {
	try {
		if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
			return { error: "Google Cloud credentials not configured." };
		}

		const credentialsEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
		const isJson = credentialsEnv?.trim().startsWith("{");

		const processorId = process.env.GOOGLE_CLOUD_PROCESSOR_ID;
		const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
		const location = process.env.GOOGLE_CLOUD_LOCATION || "us";

		const client = new DocumentProcessorServiceClient({
			...(isJson
				? { credentials: JSON.parse(credentialsEnv!) }
				: { keyFilename: credentialsEnv }),
			apiEndpoint: `${location}-documentai.googleapis.com`,
		});

		const db = getDatabaseClient();
		if (!db) {
			return { error: "Database not available." };
		}

		const idTypes = ["ID_DOCUMENT", "PROPRIETOR_ID", "DIRECTOR_ID", "FICA_ID"];
		let doc: {
			id: number;
			fileContent: string;
			mimeType: string;
		} | null = null;

		if (documentId) {
			const uploads = await db
				.select({
					id: documentUploads.id,
					fileContent: documentUploads.fileContent,
					mimeType: documentUploads.mimeType,
				})
				.from(documentUploads)
				.innerJoin(workflows, eq(documentUploads.workflowId, workflows.id))
				.where(
					and(eq(documentUploads.id, documentId), eq(workflows.applicantId, applicantId))
				)
				.limit(1);

			if (uploads.length > 0 && uploads[0].fileContent) {
				doc = {
					id: uploads[0].id,
					fileContent: uploads[0].fileContent,
					mimeType: uploads[0].mimeType || "application/pdf",
				};
			}
		} else {
			const latestWorkflow = await db
				.select({ id: workflows.id })
				.from(workflows)
				.where(eq(workflows.applicantId, applicantId))
				.orderBy(desc(workflows.startedAt))
				.limit(1);

			const workflowId = latestWorkflow[0]?.id;
			if (workflowId) {
				const uploads = await db
					.select({
						id: documentUploads.id,
						fileContent: documentUploads.fileContent,
						mimeType: documentUploads.mimeType,
					})
					.from(documentUploads)
					.where(
						and(
							eq(documentUploads.workflowId, workflowId),
							inArray(documentUploads.documentType, idTypes)
						)
					)
					.orderBy(desc(documentUploads.uploadedAt))
					.limit(1);

				if (uploads.length > 0 && uploads[0].fileContent) {
					doc = {
						id: uploads[0].id,
						fileContent: uploads[0].fileContent,
						mimeType: uploads[0].mimeType || "application/pdf",
					};
				}
			}
		}

		if (!doc) {
			return { error: "No ID document found." };
		}
		if (!(processorId && projectId)) {
			return { error: "Google Cloud Document AI is not fully configured." };
		}

		const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

		// Attempt to parse base64. Sometimes UI stores it with data URI prefix, remove it if present.
		const base64Content = doc.fileContent.replace(/^data:.*?;base64,/, "").trim();

		const [result] = await client.processDocument({
			name,
			rawDocument: {
				content: base64Content,
				mimeType: doc.mimeType || "application/pdf",
			},
		});

		const { document } = result;

		if (!document?.entities) {
			return { data: { entities: [] } };
		}

		// The ID Proofing parser returns proofing entities like 'fraud_signals_is_identity_document'
		const entities = document.entities.map(e => ({
			type: e.type,
			value: e.mentionText,
		}));

		// Persist the results
		await db
			.update(documentUploads)
			.set({
				verificationStatus: "verified",
				metadata: JSON.stringify({ documentAiResult: entities }),
				verifiedAt: new Date(),
				verifiedBy: "Document AI",
			})
			.where(eq(documentUploads.id, doc.id));

		return { data: { entities } };
	} catch (error) {
		console.error("processIdentityVerification error:", error);
		return { error: error instanceof Error ? error.message : "Verification failed." };
	}
}
