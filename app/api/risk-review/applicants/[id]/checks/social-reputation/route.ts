import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { riskAssessments } from "@/db/schema";
import { hasPermissionOrAdmin, PERMISSIONS } from "@/lib/auth/permissions";
import {
	applicantRowToApplicantData,
	assertManualFirecrawlAllowed,
	loadApplicantAndWorkflowId,
	mergeExternalCheckIntoAiAnalysisJson,
	persistMergedAiAnalysis,
	socialResultToExternalSlot,
} from "@/lib/risk-review/manual-firecrawl-checks";
import { runSocialReputationCheck } from "@/lib/services/firecrawl";

/**
 * POST /api/risk-review/applicants/[id]/checks/social-reputation
 *
 * Runs the Firecrawl-backed HelloPeter social reputation check on demand and merges
 * the result into risk_assessments.aiAnalysis.externalChecks.socialReputation.
 */
export async function POST(
	_request: NextRequest,
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

		const gate = assertManualFirecrawlAllowed("social");
		if (!gate.ok) {
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

		const { applicant, workflowId } = await loadApplicantAndWorkflowId(db, applicantId);
		if (!applicant) {
			return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
		}

		const applicantData = applicantRowToApplicantData(applicant);

		let fcResult;
		try {
			fcResult = await runSocialReputationCheck({
				applicantId,
				workflowId,
				applicantData,
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : "Social reputation check failed";
			return NextResponse.json({ error: message }, { status: 400 });
		}

		const slot = socialResultToExternalSlot(fcResult);

		const latestRows = await db
			.select({ aiAnalysis: riskAssessments.aiAnalysis })
			.from(riskAssessments)
			.where(eq(riskAssessments.applicantId, applicantId))
			.orderBy(desc(riskAssessments.createdAt))
			.limit(1);

		const mergedJson = mergeExternalCheckIntoAiAnalysisJson(
			latestRows[0]?.aiAnalysis ?? null,
			"socialReputation",
			slot
		);
		await persistMergedAiAnalysis(db, applicantId, mergedJson);

		return NextResponse.json({
			check: fcResult,
			externalCheck: slot,
		});
	} catch (error) {
		console.error("[API] Social reputation check error:", error);
		return NextResponse.json(
			{
				error: "Failed to run social reputation check",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
