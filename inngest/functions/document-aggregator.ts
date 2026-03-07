import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import {
	getDocumentRequirements,
	resolveBusinessType,
} from "@/lib/services/document-requirements.service";
import { DocumentTypeSchema } from "@/lib/types";
import { applicants, documents } from "@/db/schema";
import { inngest } from "../client";

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

		// 1. Fetch all documents for this applicant
		const applicantDocs = await step.run("fetch-all-documents", async () => {
			const db = getDatabaseClient();
			if (!db) throw new Error("Database connection failed");

			return await db
				.select()
				.from(documents)
				.where(eq(documents.applicantId, applicantId));
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

		const requirements = docReqs.documents
			.filter(req => req.required)
			.map(req => req.id);

		const uploadedTypes = applicantDocs.map(d => d.type);

		const missing = requirements.filter(req => !uploadedTypes.includes(req));

		if (missing.length > 0) {
			return {
				status: "pending",
				missing,
				uploadedCount: applicantDocs.length,
			};
		}

		// 3. Emit the bundle event expected by onboarding.ts
		// Map db documents to the shape expected by onboarding.ts event; validate type with Zod
		const payloadDocuments = applicantDocs
			.map(d => {
				const parsed = DocumentTypeSchema.safeParse(d.type);
				if (!parsed.success) return null;
				return {
					type: parsed.data,
					filename: d.fileName || "unknown",
					url: d.storageUrl || "",
					uploadedAt: d.uploadedAt
						? new Date(d.uploadedAt).toISOString()
						: new Date().toISOString(),
				};
			})
			.filter((doc): doc is NonNullable<typeof doc> => doc !== null);

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
