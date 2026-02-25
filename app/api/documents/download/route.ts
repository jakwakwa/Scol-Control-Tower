import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { documents, documentUploads } from "@/db/schema";

/**
 * GET /api/documents/download
 *
 * Serves document file content stored as base64 in the database.
 * Supports both `documents` table (by applicantId + type + fileName)
 * and `documentUploads` table (by documentUploadId).
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

		if (documentId) {
			const [doc] = await db
				.select()
				.from(documents)
				.where(eq(documents.id, parseInt(documentId)));

			if (!doc?.fileContent) {
				return NextResponse.json(
					{ error: "Document not found or has no content" },
					{ status: 404 }
				);
			}

			fileContent = doc.fileContent;
			mimeType = doc.mimeType || "application/octet-stream";
			resolvedFileName = doc.fileName || "document";
		} else if (documentUploadId) {
			const [doc] = await db
				.select()
				.from(documentUploads)
				.where(eq(documentUploads.id, parseInt(documentUploadId)));

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
				.from(documents)
				.where(
					and(
						eq(documents.applicantId, parseInt(applicantId)),
						eq(documents.type, type),
						eq(documents.fileName, fileName)
					)
				);

			if (!doc?.fileContent) {
				return NextResponse.json(
					{ error: "Document not found or has no content" },
					{ status: 404 }
				);
			}

			fileContent = doc.fileContent;
			mimeType = doc.mimeType || "application/octet-stream";
			resolvedFileName = doc.fileName || "document";
		} else {
			return NextResponse.json(
				{
					error:
						"Provide documentId, documentUploadId, or (applicantId + type + fileName)",
				},
				{ status: 400 }
			);
		}

		const buffer = Buffer.from(fileContent, "base64");

		return new NextResponse(buffer, {
			status: 200,
			headers: {
				"Content-Type": mimeType,
				"Content-Disposition": `inline; filename="${resolvedFileName}"`,
				"Content-Length": buffer.length.toString(),
			},
		});
	} catch {
		return NextResponse.json({ error: "Failed to download document" }, { status: 500 });
	}
}
