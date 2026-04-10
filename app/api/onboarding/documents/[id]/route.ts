import { type NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { documentUploads } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/onboarding/documents/[id]
 * Get a specific document by ID
 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;

	const db = getDatabaseClient();
	if (!db) {
		return NextResponse.json({ error: "Database not available" }, { status: 500 });
	}

	try {
		const document = await db
			.select()
			.from(documentUploads)
			.where(eq(documentUploads.id, parseInt(id, 10)))
			.limit(1);

		if (document.length === 0) {
			return NextResponse.json({ error: "Document not found" }, { status: 404 });
		}

		return NextResponse.json({ document: document[0] });
	} catch (error) {
		console.error("Failed to fetch document:", error);
		return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
	}
}

/**
 * PUT /api/onboarding/documents/[id]
 * Update document verification status
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;

	const db = getDatabaseClient();
	if (!db) {
		return NextResponse.json({ error: "Database not available" }, { status: 500 });
	}

	try {
		const body = await request.json();
		const { verificationStatus, verificationNotes, verifiedBy, expiresAt } = body;

		if (!verificationStatus) {
			return NextResponse.json(
				{ error: "verificationStatus is required" },
				{ status: 400 }
			);
		}

		const validStatuses = [
			"pending",
			"verified",
			"rejected",
			"expired",
			"failed_ocr",
			"failed_unprocessable",
		];
		if (!validStatuses.includes(verificationStatus)) {
			return NextResponse.json(
				{
					error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
				},
				{ status: 400 }
			);
		}

		// Update document
		const [updated] = await db
			.update(documentUploads)
			.set({
				verificationStatus,
				verificationNotes,
				verifiedBy,
				verifiedAt: new Date(),
				expiresAt: expiresAt ? new Date(expiresAt) : undefined,
			})
			.where(eq(documentUploads.id, parseInt(id, 10)))
			.returning();

		if (!updated) {
			return NextResponse.json({ error: "Document not found" }, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			document: updated,
		});
	} catch (error) {
		console.error("Failed to update document:", error);
		return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
	}
}

/**
 * DELETE /api/onboarding/documents/[id]
 * Delete a document
 */
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;

	const db = getDatabaseClient();
	if (!db) {
		return NextResponse.json({ error: "Database not available" }, { status: 500 });
	}

	try {
		// Get document first to check if it exists and get storage key
		const document = await db
			.select()
			.from(documentUploads)
			.where(eq(documentUploads.id, parseInt(id, 10)))
			.limit(1);

		if (document.length === 0) {
			return NextResponse.json({ error: "Document not found" }, { status: 404 });
		}

		// In production, delete from S3/R2 here
		// await deleteFromStorage(document[0].storageKey);

		// Delete from database
		await db.delete(documentUploads).where(eq(documentUploads.id, parseInt(id, 10)));

		return NextResponse.json({
			success: true,
			message: "Document deleted successfully",
		});
	} catch (error) {
		console.error("Failed to delete document:", error);
		return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
	}
}
