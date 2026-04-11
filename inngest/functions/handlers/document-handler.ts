import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { applicants, documentUploads } from "@/db/schema";
import { inngest } from "@/inngest/client";
import {
	getDocumentRequirements,
	resolveBusinessType,
} from "@/lib/services/document-requirements.service";
import { DocumentTypeSchema } from "@/lib/types";

/**
 * FICA Document Aggregator
 *
 * Listens for individual document uploads and checks if the full set
 * of required FICA documents is present for an applicant.
 *
 * If all required documents are found, it gathers them and emits
 * 'upload/fica.received' to wake up the main onboarding workflow.
 */
export const documentAggregator = inngest.createFunction(
	{ id: "fica-document-aggregator", name: "FICA Document Aggregator" },
	{ event: "document/uploaded" },
	async ({ event, step }) => {
		const { applicantId, workflowId } = event.data;

		// 1. Fetch all uploaded documents for this workflow
		const applicantDocs = await step.run("fetch-all-documents", async () => {
			const db = getDatabaseClient();
			if (!db) throw new Error("Database connection failed");

			return await db
				.select()
				.from(documentUploads)
				.where(eq(documentUploads.workflowId, workflowId));
		});

		// 1.5 Fetch the applicant details to determine requirements
		const applicantInfo = await step.run("fetch-applicant-info", async () => {
			const db = getDatabaseClient();
			if (!db) throw new Error("Database connection failed");
			const result = await db
				.select()
				.from(applicants)
				.where(eq(applicants.id, applicantId))
				.limit(1);
			return result[0];
		});

		// 2. Guard: applicant must exist to determine requirements
		if (!applicantInfo) {
			throw new Error(
				`Applicant record not found for applicantId=${applicantId}. Cannot determine document requirements.`
			);
		}

		// 3. Resolve requirements from applicant context
		const businessType = resolveBusinessType(
			applicantInfo.entityType,
			applicantInfo.businessType
		);

		const docReqs = getDocumentRequirements(
			businessType,
			applicantInfo.industry ?? undefined
		);

		const requirements = docReqs.documents.filter(req => req.required).map(req => req.id);

		// 4. Filter documents to only those with complete required metadata
		// (valid type, non-empty fileName, non-empty storageUrl, and uploadedAt)
		const validDocs = applicantDocs.flatMap(d => {
			const parsedType = DocumentTypeSchema.safeParse(d.documentType);
			if (!parsedType.success) return [];
			if (!d.fileName || d.fileName.trim() === "") return [];
			if (!d.storageUrl || d.storageUrl.trim() === "") return [];
			if (d.uploadedAt == null) return [];

			return [
				{
					rawType: d.documentType,
					parsedType: parsedType.data,
					fileName: d.fileName,
					storageUrl: d.storageUrl,
					uploadedAt: d.uploadedAt,
				},
			];
		});

		// 5. Determine uploaded document types from valid documents only
		const uploadedTypes = validDocs.map(d => d.rawType);

		// 6. Check for any missing required documents
		const missing = requirements.filter(req => !uploadedTypes.includes(req));

		if (missing.length > 0) {
			return {
				status: "pending",
				missing,
				uploadedCount: validDocs.length,
			};
		}

		// 7. Build payload documents (no fallbacks; guaranteed valid)
		const payloadDocuments = validDocs.map(d => ({
			type: d.parsedType,
			filename: d.fileName,
			url: d.storageUrl,
			uploadedAt: new Date(d.uploadedAt).toISOString(),
		}));

		await step.run("emit-fica-received", async () => {
			await inngest.send({
				name: "upload/fica.received",
				data: {
					workflowId,
					applicantId,
					documents: payloadDocuments,
					uploadedBy: "client", // or system/aggregator
				},
			});
		});

		return {
			status: "complete",
			emittedEvent: "upload/fica.received",
			documentCount: payloadDocuments.length,
		};
	}
);
