"use server";

import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { documents, documentUploads, riskCheckResults } from "@/db/schema";

export async function verifyIdentity(applicantId: number) {
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

		// Try to find the latest ID-related document for the given applicant/workflow
		// We look for common ID types: ID_DOCUMENT, PROPRIETOR_ID, etc.
		const idTypes = ["ID_DOCUMENT", "PROPRIETOR_ID", "DIRECTOR_ID", "FICA_ID"];
		
		let doc = null;

		// 1. Check the 'documents' table first
		const docs = await db
			.select()
			.from(documents)
			.where(
				and(
					eq(documents.applicantId, applicantId),
					inArray(documents.type, idTypes)
				)
			)
			.orderBy(desc(documents.uploadedAt))
			.limit(1);

		if (docs.length > 0 && docs[0].fileContent) {
			doc = {
				id: docs[0].id,
				fileContent: docs[0].fileContent,
				mimeType: docs[0].mimeType || "application/pdf"
			};
		}

		// 2. Fallback to 'documentUploads' if not found or no content
		let foundIn: 'documents' | 'documentUploads' = 'documents';
		if (!doc) {
			const uploads = await db
				.select()
				.from(documentUploads)
				.where(
					and(
						eq(documentUploads.workflowId, applicantId), // In onboarding, workflowId often maps to applicantId or vice versa in simplistic queries
						inArray(documentUploads.documentType, idTypes)
					)
				)
				.orderBy(desc(documentUploads.uploadedAt))
				.limit(1);

			if (uploads.length > 0 && uploads[0].fileContent) {
				foundIn = 'documentUploads';
				doc = {
					id: uploads[0].id,
					workflowId: uploads[0].workflowId, // Add workflowId to documentUploads match
					fileContent: uploads[0].fileContent,
					mimeType: uploads[0].mimeType || "application/pdf"
				};
			}
		}

		if (!doc) {
			return { error: "No ID document found for this applicant." };
		}
		if (!processorId || !projectId) {
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
		if (foundIn === 'documentUploads') {
			await db.update(documentUploads).set({
				verificationStatus: "verified",
				metadata: JSON.stringify({ documentAiResult: entities }),
				verifiedAt: new Date(),
				verifiedBy: "Document AI"
			}).where(eq(documentUploads.id, doc.id));
		} else if (foundIn === 'documents') {
			await db.update(documents).set({
				processingStatus: "verified",
				processingResult: JSON.stringify({ documentAiResult: entities }),
				verifiedAt: new Date()
			}).where(eq(documents.id, doc.id));
		}

		// Look for workflow ID 
		const workflowId = doc.workflowId || applicantId; // Fallback to applicantId as workflowId 
		if (workflowId) {
			const ficaCheckRows = await db
				.select()
				.from(riskCheckResults)
				.where(
					and(
						eq(riskCheckResults.workflowId, workflowId),
						eq(riskCheckResults.checkType, "FICA")
					)
				);

			if (ficaCheckRows.length > 0) {
				const ficaCheck = ficaCheckRows[0];
				let payload: any = {};
				try {
					payload = ficaCheck.payload ? JSON.parse(ficaCheck.payload) : {};
				} catch (e) {}

				payload.documentAiResult = entities;

				await db.update(riskCheckResults).set({
					payload: JSON.stringify(payload),
					updatedAt: new Date()
				}).where(eq(riskCheckResults.id, ficaCheck.id));
			}
		}

		return { data: { entities } };
	} catch (error) {
		console.error("verifyIdentity error:", error);
		return { error: error instanceof Error ? error.message : "Verification failed." };
	}
}
