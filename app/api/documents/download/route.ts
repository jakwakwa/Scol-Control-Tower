import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { documentUploads, workflows } from "@/db/schema";

/**
 * GET /api/documents/download
 *
 * Serves document file content stored as base64 in `document_uploads`.
 * Supports lookup by documentUploadId/documentId, or legacy applicantId+type+fileName.
 */
export async function GET(request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const documentUploadId = searchParams.get("documentUploadId");
		const documentId = searchParams.get("documentId");
		const applicantId = searchParams.get("applicantId");
		const type = searchParams.get("type");
		const fileName = searchParams.get("fileName");

		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		let fileContent: string | null = null;
		let mimeType = "application/octet-stream";
		let resolvedFileName = "document";

		const resolvedUploadId = documentUploadId ?? documentId;
		if (resolvedUploadId) {
			const [doc] = await db
				.select()
				.from(documentUploads)
				.where(eq(documentUploads.id, parseInt(resolvedUploadId, 10)));

			if (!doc?.fileContent) {
				return NextResponse.json(
					{ error: "Document not found or has no content" },
					{ status: 404 }
				);
			}

			fileContent = doc.fileContent;
			mimeType = doc.mimeType || "application/octet-stream";
			resolvedFileName = doc.fileName || "document";
		} else if (applicantId && type && fileName) {
			const [doc] = await db
				.select()
				.from(documentUploads)
				.leftJoin(workflows, eq(documentUploads.workflowId, workflows.id))
				.where(
					and(
						eq(workflows.applicantId, parseInt(applicantId, 10)),
						eq(documentUploads.documentType, type),
						eq(documentUploads.fileName, fileName)
					)
				)
				.orderBy(desc(documentUploads.uploadedAt))
				.limit(1);

			const upload = doc?.document_uploads;
			if (!upload?.fileContent) {
				return NextResponse.json(
					{ error: "Document not found or has no content" },
					{ status: 404 }
				);
			}

			fileContent = upload.fileContent;
			mimeType = upload.mimeType || "application/octet-stream";
			resolvedFileName = upload.fileName || "document";
		} else {
			return NextResponse.json(
				{
					error:
						"Provide documentUploadId/documentId, or (applicantId + type + fileName)",
				},
				{ status: 400 }
			);
		}

		const buffer = Buffer.from(fileContent, "base64");

		const safeFilename =
			(resolvedFileName || "document").replace(/[\r\n"]/g, "_").slice(0, 255) ||
			"document";

		return new NextResponse(buffer, {
			status: 200,
			headers: {
				"Content-Type": mimeType,
				"Content-Disposition": `inline; filename="${safeFilename}"`,
				"Content-Length": buffer.length.toString(),
			},
		});
	} catch {
		return NextResponse.json({ error: "Failed to download document" }, { status: 500 });
	}
}
