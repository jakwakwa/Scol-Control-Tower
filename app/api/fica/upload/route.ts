/**
 * FICA Upload API
 *
 * Handles file uploads for FICA documents (bank statements, accountant letters).
 * Stores file content as base64 in the database for AI verification.
 * Triggers the 'upload/fica.received' event to resume the workflow.
 *
 * POST /api/fica/upload
 * Body: FormData with files and metadata
 */

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { documents, workflows } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { evaluateDocumentQuality } from "@/lib/services/document-quality.service";

const UploadMetadataSchema = z.object({
	workflowId: z.coerce.number().int().positive("Workflow ID is required"),
	applicantId: z.coerce.number().int().positive("Applicant ID is required"),
	documentType: z.enum([
		"BANK_STATEMENT",
		"ACCOUNTANT_LETTER",
		"ID_DOCUMENT",
		"PROOF_OF_ADDRESS",
	]),
});

interface UploadedDocument {
	type: "BANK_STATEMENT" | "ACCOUNTANT_LETTER" | "ID_DOCUMENT" | "PROOF_OF_ADDRESS";
	filename: string;
	url: string;
	uploadedAt: string;
}

const documentCategoryMap: Record<UploadedDocument["type"], string> = {
	BANK_STATEMENT: "fica_business",
	ACCOUNTANT_LETTER: "fica_business",
	ID_DOCUMENT: "fica_individual",
	PROOF_OF_ADDRESS: "fica_individual",
};

export async function POST(request: NextRequest) {
	try {
		const { userId } = await auth();

		const formData = await request.formData();

		const workflowId = formData.get("workflowId");
		const applicantId = formData.get("applicantId");
		const documentType = formData.get("documentType");

		const metadataResult = UploadMetadataSchema.safeParse({
			workflowId,
			applicantId,
			documentType,
		});

		if (!metadataResult.success) {
			return NextResponse.json(
				{
					error: "Validation failed",
					details: metadataResult.error.flatten().fieldErrors,
				},
				{ status: 400 }
			);
		}

		const metadata = metadataResult.data;

		const files = formData.getAll("files") as File[];

		if (files.length === 0) {
			return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
		}

		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const workflowResult = await db
			.select()
			.from(workflows)
			.where(eq(workflows.id, metadata.workflowId));

		if (workflowResult.length === 0) {
			return NextResponse.json(
				{ error: `Workflow ${metadata.workflowId} not found` },
				{ status: 404 }
			);
		}

		const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

		const uploadedDocuments: UploadedDocument[] = [];

		for (const file of files) {
			if (!allowedTypes.includes(file.type)) {
				return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
			}

			const maxSize = (metadata.documentType === "ID_DOCUMENT" || metadata.documentType === "PROOF_OF_ADDRESS") 
				? 5 * 1024 * 1024 
				: 10 * 1024 * 1024;
				
			if (file.size > maxSize) {
				return NextResponse.json({ error: `File size exceeds the limit of ${maxSize / (1024 * 1024)}MB for ${metadata.documentType}` }, { status: 400 });
			}

			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);
			const quality = evaluateDocumentQuality(
				file.name,
				file.type,
				buffer,
				{
					enforceRecency: metadata.documentType === "PROOF_OF_ADDRESS",
				}
			);
			if (!quality.ok) {
				continue;
			}
			const base64Content = Buffer.from(arrayBuffer).toString("base64");

			const storageUrl = `/api/documents/download?applicantId=${metadata.applicantId}&type=${metadata.documentType}&fileName=${encodeURIComponent(file.name)}`;

			const uploadedDocument: UploadedDocument = {
				type: metadata.documentType,
				filename: file.name,
				url: storageUrl,
				uploadedAt: new Date().toISOString(),
			};

			uploadedDocuments.push(uploadedDocument);

			const [inserted] = await db
				.insert(documents)
				.values([
					{
						applicantId: metadata.applicantId,
						type: metadata.documentType,
						status: "uploaded",
						category: documentCategoryMap[metadata.documentType],
						source: "client",
						fileName: file.name,
						fileContent: base64Content,
						mimeType: file.type,
						storageUrl,
						uploadedBy: userId || "client",
						uploadedAt: new Date(),
						notes:
							quality.warnings.length > 0
								? `[QUALITY_WARNING] ${quality.warnings.join("; ")}`
								: undefined,
					},
				])
				.returning();

			if (inserted) {
				await inngest.send({
					name: "document/uploaded",
					data: {
						workflowId: metadata.workflowId,
						applicantId: metadata.applicantId,
						documentId: inserted.id,
						documentType: metadata.documentType,
						category: documentCategoryMap[metadata.documentType],
						uploadedAt: uploadedDocument.uploadedAt,
					},
				});
			}
		}

		if (uploadedDocuments.length === 0) {
			return NextResponse.json(
				{ error: "No valid files were uploaded" },
				{ status: 400 }
			);
		}

		await inngest.send({
			name: "upload/fica.received",
			data: {
				workflowId: metadata.workflowId,
				applicantId: metadata.applicantId,
				documents: uploadedDocuments,
				uploadedBy: userId || "client",
			},
		});

		return NextResponse.json({
			success: true,
			message: `${uploadedDocuments.length} document(s) uploaded successfully`,
			workflowId: metadata.workflowId,
			documents: uploadedDocuments,
		});
	} catch (error) {
		return NextResponse.json(
			{
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const workflowId = searchParams.get("workflowId");

	if (!workflowId) {
		return NextResponse.json({ error: "workflowId is required" }, { status: 400 });
	}

	const db = getDatabaseClient();
	if (!db) {
		return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
	}

	const [workflow] = await db
		.select({ applicantId: workflows.applicantId })
		.from(workflows)
		.where(eq(workflows.id, parseInt(workflowId, 10)))
		.limit(1);

	if (!workflow) {
		return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
	}

	const docs = await db
		.select({
			id: documents.id,
			type: documents.type,
			fileName: documents.fileName,
			status: documents.status,
			mimeType: documents.mimeType,
			uploadedAt: documents.uploadedAt,
			storageUrl: documents.storageUrl,
		})
		.from(documents)
		.where(eq(documents.applicantId, workflow.applicantId));

	return NextResponse.json({
		workflowId: parseInt(workflowId, 10),
		status: docs.length > 0 ? "uploaded" : "pending",
		documents: docs,
	});
}
