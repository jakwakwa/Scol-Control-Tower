import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { applicants, documentUploads, workflows } from "@/db/schema";
import { inngest } from "@/inngest/client";

/**
 * POST /api/onboarding/documents/upload
 * Upload a document for FICA verification
 *
 * Note: This is a simplified implementation. In production, you would:
 * 1. Use a proper file storage service (S3, R2, etc.)
 * 2. Implement virus scanning
 * 3. Add file validation
 */
export async function POST(request: NextRequest) {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const db = getDatabaseClient();
	if (!db) {
		return NextResponse.json({ error: "Database not available" }, { status: 500 });
	}

	try {
		const formData = await request.formData();

		const file = formData.get("file") as File | null;
		const workflowId = formData.get("workflowId") as string | null;
		const internalFormId = formData.get("internalFormId") as string | null;
		const category = formData.get("category") as string | null;
		const documentType = formData.get("documentType") as string | null;
		const metadata = formData.get("metadata") as string | null;

		// Validate required fields
		if (!(file && workflowId && category && documentType)) {
			return NextResponse.json(
				{
					error: "Missing required fields: file, workflowId, category, documentType",
				},
				{ status: 400 }
			);
		}

		const workflowIdNum = parseInt(workflowId);

		// Verify workflow exists
		const workflow = await db
			.select()
			.from(workflows)
			.where(eq(workflows.id, workflowIdNum))
			.limit(1);

		if (workflow.length === 0) {
			return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
		}

		// Validate file size (max 10MB)
		const maxSize = 10 * 1024 * 1024; // 10MB
		if (file.size > maxSize) {
			return NextResponse.json(
				{ error: "File size exceeds 10MB limit" },
				{ status: 400 }
			);
		}

		// Validate file type
		const allowedTypes = [
			"application/pdf",
			"image/jpeg",
			"image/png",
			"image/jpg",
			"application/msword",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		];

		if (!allowedTypes.includes(file.type)) {
			return NextResponse.json(
				{ error: "File type not allowed. Accepted: PDF, JPG, PNG, DOC, DOCX" },
				{ status: 400 }
			);
		}

		// Generate unique storage key
		const fileExtension = file.name.split(".").pop() || "bin";
		const storageKey = `${workflowId}/${category}/${crypto.randomUUID()}.${fileExtension}`;

		const fileBuffer = await file.arrayBuffer();
		const base64Content = Buffer.from(fileBuffer).toString("base64");

		const document = await db.transaction(async tx => {
			const [inserted] = await tx
				.insert(documentUploads)
				.values({
					workflowId: workflowIdNum,
					internalFormId: internalFormId ? parseInt(internalFormId) : null,
					category: category as
						| "standard"
						| "individual"
						| "financial"
						| "professional"
						| "industry",
					documentType,
					fileName: file.name,
					fileSize: file.size,
					fileContent: base64Content,
					mimeType: file.type,
					storageKey,
					storageUrl: `/api/documents/download?documentUploadId=PLACEHOLDER&storageKey=${encodeURIComponent(storageKey)}`,
					verificationStatus: "pending",
					metadata: metadata || undefined,
					uploadedBy: userId || undefined,
				})
				.returning();

			if (!inserted) return null;

			const actualStorageUrl = `/api/documents/download?documentUploadId=${inserted.id}&storageKey=${encodeURIComponent(storageKey)}`;
			await tx
				.update(documentUploads)
				.set({ storageUrl: actualStorageUrl })
				.where(eq(documentUploads.id, inserted.id));

			return { ...inserted, storageUrl: actualStorageUrl };
		});

		if (!document) {
			return NextResponse.json(
				{ error: "Failed to create document record" },
				{ status: 500 }
			);
		}

		// Send document uploaded event for aggregation
		await inngest.send({
			name: "document/uploaded",
			data: {
				workflowId: workflowIdNum,
				applicantId: workflow[0].applicantId,
				documentId: document.id,
				documentType: documentType,
				category: category,
				uploadedAt: new Date().toISOString(),
			},
		});

		// Check if this is a mandate document and trigger mandate submission check
		const mandateDocTypes = [
			"BANK_CONFIRMATION",
			"MANDATE_FORM",
			"DEBIT_ORDER_MANDATE",
			"PROOF_OF_REGISTRATION",
		];

		if (mandateDocTypes.includes(documentType.toUpperCase())) {
			// Fetch all mandate documents for this workflow
			const allMandateDocs = await db
				.select()
				.from(documentUploads)
				.where(eq(documentUploads.workflowId, workflowIdNum));

			const uploadedMandateTypes = allMandateDocs
				.filter(d => mandateDocTypes.includes(d.documentType?.toUpperCase() || ""))
				.map(d => d.documentType?.toUpperCase() || "");

			// Get applicant mandate type to determine required docs
			const applicantResult = await db
				.select()
				.from(applicants)
				.where(eq(applicants.id, workflow[0].applicantId));

			const applicant = applicantResult[0];
			const mandateType = applicant?.mandateType || "EFT";

			// Determine required documents based on mandate type
			const requiredDocs: Record<string, string[]> = {
				EFT: ["BANK_CONFIRMATION", "MANDATE_FORM"],
				DEBIT_ORDER: ["DEBIT_ORDER_MANDATE", "BANK_CONFIRMATION"],
				CASH: ["PROOF_OF_REGISTRATION"],
				MIXED: ["BANK_CONFIRMATION", "MANDATE_FORM", "DEBIT_ORDER_MANDATE"],
			};

			const required = requiredDocs[mandateType] || ["MANDATE_FORM"];
			const allReceived = required.every(doc => uploadedMandateTypes.includes(doc));

			// Send mandate document submitted event
			await inngest.send({
				name: "document/mandate.submitted",
				data: {
					workflowId: workflowIdNum,
					applicantId: workflow[0].applicantId,
					mandateType: mandateType as "EFT" | "DEBIT_ORDER" | "CASH" | "MIXED",
					documents: allMandateDocs
						.filter(d => mandateDocTypes.includes(d.documentType?.toUpperCase() || ""))
						.map(d => ({
							documentId: d.id,
							documentType: d.documentType || "",
							fileName: d.fileName || "",
							uploadedAt: d.uploadedAt?.toISOString() || new Date().toISOString(),
						})),
					allRequiredDocsReceived: allReceived,
				},
			});
		}

		return NextResponse.json({
			success: true,
			document: {
				id: document.id,
				fileName: document.fileName,
				fileSize: document.fileSize,
				mimeType: document.mimeType,
				storageUrl: document.storageUrl,
				verificationStatus: document.verificationStatus,
			},
		});
	} catch (error) {
		console.error("Failed to upload document:", error);
		return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
	}
}

/**
 * GET /api/onboarding/documents/upload
 * List all documents for a workflow
 */
export async function GET(request: NextRequest) {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const db = getDatabaseClient();
	if (!db) {
		return NextResponse.json({ error: "Database not available" }, { status: 500 });
	}

	const { searchParams } = new URL(request.url);
	const workflowId = searchParams.get("workflowId");

	if (!workflowId) {
		return NextResponse.json({ error: "workflowId is required" }, { status: 400 });
	}

	try {
		const documents = await db
			.select()
			.from(documentUploads)
			.where(eq(documentUploads.workflowId, parseInt(workflowId)));

		return NextResponse.json({ documents });
	} catch (error) {
		console.error("Failed to fetch documents:", error);
		return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
	}
}
