import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { riskAssessments } from "@/db/schema";
import { hasPermissionOrAdmin, PERMISSIONS } from "@/lib/auth/permissions";
import {
	applicantRowToApplicantData,
	assertManualFirecrawlAllowed,
	industryResultToExternalSlot,
	loadApplicantAndWorkflowId,
	mergeExternalCheckIntoAiAnalysisJson,
	persistMergedAiAnalysis,
} from "@/lib/risk-review/manual-firecrawl-checks";
import {
	type IndustryRegulatorCheckResult,
	IndustryRegulatorProviderSchema,
} from "@/lib/services/agents/contracts/firecrawl-check.contracts";
import { runIndustryRegulatorCheck } from "@/lib/services/firecrawl";

const PostBodySchema = z
	.object({
		provider: IndustryRegulatorProviderSchema.optional(),
	})
	.optional()
	.default({});

/**
 * POST /api/risk-review/applicants/[id]/checks/industry-regulator
 *
 * Runs the Firecrawl-backed industry regulator check on demand and merges the result
 * into risk_assessments.aiAnalysis.externalChecks.industryRegulator.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { userId, has, orgRole } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		if (!hasPermissionOrAdmin(has, orgRole, PERMISSIONS.RISK_ASSESSMENT_APPROVE)) {
			return NextResponse.json(
				{ error: "Forbidden — org:risk_assessment:approve required" },
				{ status: 403 }
			);
		}

		const gate = assertManualFirecrawlAllowed("industry");
		if (gate.ok === false) {
			return NextResponse.json({ error: gate.error }, { status: gate.status });
		}

		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const resolvedParams = await params;
		const applicantId = Number.parseInt(resolvedParams.id, 10);
		if (Number.isNaN(applicantId) || applicantId <= 0) {
			return NextResponse.json({ error: "Invalid applicant ID" }, { status: 400 });
		}

		let body: z.infer<typeof PostBodySchema> = {};
		try {
			const raw = await request.json();
			const parsed = PostBodySchema.safeParse(raw);
			body = parsed.success ? parsed.data : {};
		} catch {
			body = {};
		}

		const { applicant, workflowId } = await loadApplicantAndWorkflowId(db, applicantId);
		if (!applicant) {
			return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
		}

		const applicantData = applicantRowToApplicantData(applicant);

		let fcResult: IndustryRegulatorCheckResult;
		try {
			fcResult = await runIndustryRegulatorCheck({
				applicantId,
				workflowId,
				applicantData,
				industry: applicant.industry ?? undefined,
				provider: body.provider,
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : "Industry regulator check failed";
			return NextResponse.json({ error: message }, { status: 400 });
		}

		const slot = industryResultToExternalSlot(fcResult);

		const latestRows = await db
			.select({ aiAnalysis: riskAssessments.aiAnalysis })
			.from(riskAssessments)
			.where(eq(riskAssessments.applicantId, applicantId))
			.orderBy(desc(riskAssessments.createdAt))
			.limit(1);

		const mergedJson = mergeExternalCheckIntoAiAnalysisJson(
			latestRows[0]?.aiAnalysis ?? null,
			"industryRegulator",
			slot
		);
		await persistMergedAiAnalysis(db, applicantId, mergedJson);

		return NextResponse.json({
			check: fcResult,
			externalCheck: slot,
		});
	} catch (error) {
		console.error("[API] Industry regulator check error:", error);
		return NextResponse.json(
			{
				error: "Failed to run industry regulator check",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
