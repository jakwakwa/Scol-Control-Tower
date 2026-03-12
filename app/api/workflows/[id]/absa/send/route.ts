import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { applicants, documentUploads, workflows } from "@/db/schema";
import { sendAbsaPacketEmail } from "@/lib/services/email.service";
import {
	createWorkflowNotification,
} from "@/lib/services/notification-events.service";
import {
	logWorkflowEventOnce,
	markStage5GateOnce,
} from "@/lib/services/workflow-command.service";

const SendAbsaSchema = z.object({
	applicantId: z.number().int().positive(),
	documentUploadId: z.number().int().positive(),
});

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		const workflowId = Number.parseInt(id, 10);
		if (Number.isNaN(workflowId)) {
			return NextResponse.json({ error: "Invalid workflow ID" }, { status: 400 });
		}

		const payload = await request.json();
		const parsed = SendAbsaSchema.safeParse(payload);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.flatten().fieldErrors },
				{ status: 400 }
			);
		}

		const { applicantId, documentUploadId } = parsed.data;
		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const [workflow] = await db
			.select()
			.from(workflows)
			.where(eq(workflows.id, workflowId));
		if (!workflow) {
			return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
		}
		if (workflow.applicantId !== applicantId) {
			return NextResponse.json({ error: "Applicant/workflow mismatch" }, { status: 409 });
		}

		const [doc] = await db
			.select()
			.from(documentUploads)
			.where(eq(documentUploads.id, documentUploadId));
		if (!doc || doc.workflowId !== workflowId) {
			return NextResponse.json({ error: "Document not found or workflow mismatch" }, {
				status: 404,
			});
		}
		if (doc.documentType !== "ABSA_6995_PDF") {
			return NextResponse.json({ error: "Document must be ABSA_6995_PDF type" }, {
				status: 400,
			});
		}
		if (!doc.fileContent) {
			return NextResponse.json({ error: "Document has no file content" }, { status: 400 });
		}

		const [applicant] = await db
			.select()
			.from(applicants)
			.where(eq(applicants.id, applicantId));
		const companyName = applicant?.companyName ?? "Unknown";

		const result = await sendAbsaPacketEmail({
			workflowId,
			applicantId,
			companyName,
			fileName: doc.fileName ?? "absa-6995.pdf",
			fileContentBase64: doc.fileContent,
			mimeType: doc.mimeType ?? undefined,
		});

		if (result.success === false) {
			return NextResponse.json(
				{ error: "Failed to send ABSA packet", message: result.error },
				{ status: 500 }
			);
		}

		const applied = await markStage5GateOnce({
			workflowId,
			gate: "absa_packet_sent",
			actorId: userId,
		});
		if (!applied) {
			return NextResponse.json({
				success: true,
				workflowId,
				applicantId,
				message: "ABSA packet was already sent for this workflow",
				alreadySent: true,
			});
		}

		const sentAt = new Date().toISOString();
		await logWorkflowEventOnce({
			workflowId,
			eventType: "absa_packet_sent",
			payload: {
				documentUploadId,
				sentBy: userId,
				sentAt,
				targetEmail: process.env.ABSA_TEST_EMAIL ?? "(configured)",
			},
			actorType: "user",
			actorId: userId,
		});

		await createWorkflowNotification({
			workflowId,
			applicantId,
			type: "success",
			title: "ABSA Packet Sent",
			message: `Prefilled ABSA 6995 PDF was sent to ${process.env.ABSA_TEST_EMAIL ?? "ABSA test address"}.`,
			actionable: false,
		});

		return NextResponse.json({
			success: true,
			workflowId,
			applicantId,
			message: "ABSA packet sent successfully",
			alreadySent: false,
		});
	} catch (error) {
		console.error("[AbsaSend] Error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
