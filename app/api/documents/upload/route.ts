import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { documents } from "@/db/schema";
import { inngest } from "@/inngest/client";
import {
	getFormInstanceByToken,
	markFormInstanceStatus,
} from "@/lib/services/form.service";
import { DocumentCategorySchema, DocumentTypeSchema } from "@/lib/types";

const UploadSchema = z.object({
	token: z.string().min(10),
	documentType: DocumentTypeSchema,
	category: DocumentCategorySchema.optional(),
});

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const token = formData.get("token");
		const documentType = formData.get("documentType");
		const category = formData.get("category");

		const validation = UploadSchema.safeParse({
			token,
			documentType,
			category,
		});

		if (!validation.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: validation.error.flatten() },
				{ status: 400 }
			);
		}

		const formInstance = await getFormInstanceByToken(validation.data.token);
		if (!formInstance || formInstance.formType !== "DOCUMENT_UPLOADS") {
			return NextResponse.json({ error: "Invalid upload link" }, { status: 404 });
		}

		if (formInstance.expiresAt && new Date(formInstance.expiresAt) < new Date()) {
			return NextResponse.json({ error: "Upload link has expired" }, { status: 410 });
		}

		if (formInstance.status === "revoked") {
			return NextResponse.json(
				{ error: "Upload link has been revoked" },
				{ status: 410 }
			);
		}

		const files = formData.getAll("files") as File[];
		if (files.length === 0) {
			return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
		}

		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const allowedTypes = [
			"application/pdf",
			"application/msword",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			"image/jpeg",
			"image/jpg",
			"image/png",
			"image/webp",
			"image/heic",
			"image/heif",
			"application/rtf",
		];

		const maxSize = 10 * 1024 * 1024;
		const uploadedDocuments = [];
		const rejected: { name: string; reason: string }[] = [];

		for (const file of files) {
			if (!allowedTypes.includes(file.type)) {
				rejected.push({ name: file.name, reason: "File type not allowed" });
				continue;
			}

			if (file.size > maxSize) {
				rejected.push({ name: file.name, reason: "File size exceeds 10MB limit" });
				continue;
			}

			const arrayBuffer = await file.arrayBuffer();
			const base64Content = Buffer.from(arrayBuffer).toString("base64");

			const storageUrl = `/api/documents/download?applicantId=${formInstance.applicantId}&type=${validation.data.documentType}&fileName=${encodeURIComponent(file.name)}`;

			const [inserted] = await db
				.insert(documents)
				.values([
					{
						applicantId: formInstance.applicantId,
						type: validation.data.documentType,
						category: validation.data.category,
						source: "client",
						status: "uploaded",
						fileName: file.name,
						fileContent: base64Content,
						mimeType: file.type,
						storageUrl,
						uploadedBy: "client",
						uploadedAt: new Date(),
					},
				])
				.returning();

			if (inserted) {
				uploadedDocuments.push(inserted);

				if (formInstance.workflowId) {
					await inngest.send({
						name: "document/uploaded",
						data: {
							workflowId: formInstance.workflowId,
							applicantId: formInstance.applicantId,
							documentId: inserted.id,
							documentType: validation.data.documentType,
							category: validation.data.category,
							uploadedAt: new Date().toISOString(),
						},
					});
				}
			}
		}

		if (uploadedDocuments.length === 0) {
			return NextResponse.json(
				{
					error: "No valid files were uploaded",
					rejected: rejected.length > 0 ? rejected : undefined,
				},
				{ status: 400 }
			);
		}

		if (formInstance.status !== "submitted") {
			await markFormInstanceStatus(formInstance.id, "submitted");
		}

		return NextResponse.json({
			success: true,
			message: `${uploadedDocuments.length} document(s) uploaded successfully`,
			documents: uploadedDocuments,
			...(rejected.length > 0 && { rejected }),
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
