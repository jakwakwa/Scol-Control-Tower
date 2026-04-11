import { and, desc, eq, like } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { documentUploads, workflowEvents } from "@/db/schema";
import {
	guardStateCollision,
	handleStateCollision,
	StateCollisionError,
} from "@/lib/services/state-lock.service";

const CollisionSchema = z.object({
	workflowId: z.number().int().positive(),
	expectedVersion: z.number().int().nonnegative(),
	delayMs: z.number().int().min(0).max(30_000).default(1000),
	source: z.string().min(1).max(100).default("e2e-stream-b"),
});

function ensureTestMode(request: NextRequest) {
	if (process.env.NODE_ENV === "test") {
		return true;
	}

	const requestSecret = request.headers.get("x-watchtower-test-secret");
	const expectedSecret = process.env.PLAYWRIGHT_TEST_SECRET;

	if (!expectedSecret) {
		return false;
	}

	return requestSecret === expectedSecret;
}

export async function POST(request: NextRequest) {
	if (!ensureTestMode(request)) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	try {
		const body = await request.json();
		const parsed = CollisionSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.flatten().fieldErrors },
				{ status: 400 }
			);
		}

		const { workflowId, expectedVersion, delayMs, source } = parsed.data;
		await new Promise(resolve => setTimeout(resolve, delayMs));

		try {
			await guardStateCollision(workflowId, expectedVersion);
			return NextResponse.json({
				success: true,
				collision: false,
				workflowId,
				expectedVersion,
			});
		} catch (error) {
			if (error instanceof StateCollisionError) {
				await handleStateCollision(workflowId, source, {
					stream: source,
					expectedVersion,
					actualVersion: error.actualVersion,
					trigger: "playwright_e2e_collision_simulation",
				});

				return NextResponse.json({
					success: true,
					collision: true,
					workflowId,
					expectedVersion,
					actualVersion: error.actualVersion,
				});
			}
			throw error;
		}
	} catch (error) {
		return NextResponse.json(
			{
				error: "Failed to simulate collision",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

export async function GET(request: NextRequest) {
	if (!ensureTestMode(request)) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const workflowId = Number(request.nextUrl.searchParams.get("workflowId") || "0");
	const applicantId = Number(request.nextUrl.searchParams.get("applicantId") || "0");
	if (
		Number.isNaN(workflowId) ||
		Number.isNaN(applicantId) ||
		workflowId <= 0 ||
		applicantId <= 0
	) {
		return NextResponse.json(
			{ error: "workflowId and applicantId are required query params" },
			{ status: 400 }
		);
	}

	const db = getDatabaseClient();
	if (!db) {
		return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
	}

	const staleEvents = await db
		.select({ id: workflowEvents.id })
		.from(workflowEvents)
		.where(
			and(
				eq(workflowEvents.workflowId, workflowId),
				eq(workflowEvents.eventType, "stale_data_flagged")
			)
		)
		.orderBy(desc(workflowEvents.timestamp));

	const staleDocs = await db
		.select({ id: documentUploads.id })
		.from(documentUploads)
		.where(
			and(
				eq(documentUploads.workflowId, workflowId),
				like(documentUploads.verificationNotes, "%[STALE]%")
			)
		);

	return NextResponse.json({
		workflowId,
		applicantId,
		staleDataFlaggedCount: staleEvents.length,
		staleDocumentCount: staleDocs.length,
	});
}
