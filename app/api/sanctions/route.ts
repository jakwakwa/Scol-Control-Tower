/**
 * Sanctions API - Compliance Officer Endpoint
 *
 * GET  /api/sanctions — Fetch all applicants with sanctionStatus='flagged'
 * POST /api/sanctions — Clear or confirm a sanction hit
 *
 * Body (POST):
 *   { applicantId, workflowId, action: 'clear' | 'confirm', reason, isFalsePositive }
 */

import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { aiAnalysisLogs, applicants, sanctionClearance, workflows } from "@/db/schema";
import { inngest } from "@/inngest/client";

// ============================================
// Schemas
// ============================================

const SanctionActionSchema = z.object({
	applicantId: z.number().int().positive(),
	workflowId: z.number().int().positive(),
	action: z.enum(["clear", "confirm"]),
	reason: z.string().min(1, "A reason is required for sanction clearance"),
	isFalsePositive: z.boolean().optional().default(false),
});

// ============================================
// GET — Fetch flagged applicants
// ============================================

export async function GET(_request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// Fetch applicants with sanctionStatus = 'flagged'
		const flaggedApplicants = await db
			.select({
				applicantId: applicants.id,
				companyName: applicants.companyName,
				tradingName: applicants.tradingName,
				registrationNumber: applicants.registrationNumber,
				contactName: applicants.contactName,
				email: applicants.email,
				phone: applicants.phone,
				businessType: applicants.businessType,
				sanctionStatus: applicants.sanctionStatus,
				createdAt: applicants.createdAt,
				workflowId: workflows.id,
				workflowStatus: workflows.status,
				workflowStage: workflows.stage,
			})
			.from(applicants)
			.leftJoin(workflows, eq(workflows.applicantId, applicants.id))
			.where(eq(applicants.sanctionStatus, "flagged"))
			.orderBy(desc(applicants.createdAt));

		// For each flagged applicant, fetch the sanctions agent analysis
		const itemsWithDetails = await Promise.all(
			flaggedApplicants.map(async app => {
				// Get the sanctions agent output
				const sanctionsAnalysis = await db
					.select()
					.from(aiAnalysisLogs)
					.where(
						and(
							eq(aiAnalysisLogs.applicantId, app.applicantId),
							eq(aiAnalysisLogs.agentName, "sanctions")
						)
					)
					.orderBy(desc(aiAnalysisLogs.createdAt))
					.limit(1);

				const analysis = sanctionsAnalysis[0];
				let parsedOutput: Record<string, unknown> | null = null;
				if (analysis?.rawOutput) {
					try {
						parsedOutput = JSON.parse(analysis.rawOutput);
					} catch {
						// Ignore parse errors
					}
				}

				// Extract sanction match details from agent output
				const matchDetails = parsedOutput as Record<string, unknown> | null;

				return {
					applicantId: app.applicantId,
					companyName: app.companyName,
					tradingName: app.tradingName,
					registrationNumber: app.registrationNumber,
					contactName: app.contactName,
					email: app.email,
					phone: app.phone,
					businessType: app.businessType,
					sanctionStatus: app.sanctionStatus,
					flaggedAt: app.createdAt ? new Date(app.createdAt).toISOString() : null,
					workflowId: app.workflowId,
					workflowStatus: app.workflowStatus,
					workflowStage: app.workflowStage,
					// Sanctions agent details
					sanctionListSource:
						(matchDetails?.sanctionList as string) || "OFAC/UN 1267/FIC",
					matchConfidence: (matchDetails?.matchConfidence as number) || undefined,
					matchedEntity: (matchDetails?.matchedEntity as string) || undefined,
					matchedListId: (matchDetails?.listEntryId as string) || undefined,
					adverseMediaCount: (matchDetails?.adverseMediaCount as number) || 0,
					isPEP: matchDetails?.isPEP as boolean,
					riskLevel: (matchDetails?.riskLevel as string) || "BLOCKED",
					narrative: analysis?.narrative || undefined,
					dataSource:
						((matchDetails?.metadata as Record<string, unknown>)?.dataSource as string) ||
						null,
					deepLinks: buildDeepLinks(matchDetails),
				};
			})
		);

		return NextResponse.json({
			items: itemsWithDetails,
			count: itemsWithDetails.length,
		});
	} catch (error) {
		console.error("[Sanctions API] GET error:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch sanctioned applicants",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

// ============================================
// POST — Clear or Confirm sanction hit
// ============================================

export async function POST(request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const validation = SanctionActionSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json(
				{
					error: "Validation failed",
					details: validation.error.flatten().fieldErrors,
				},
				{ status: 400 }
			);
		}

		const { applicantId, workflowId, action, reason, isFalsePositive } = validation.data;

		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// Verify applicant exists and is flagged
		const applicantResult = await db
			.select()
			.from(applicants)
			.where(eq(applicants.id, applicantId));

		const applicant = applicantResult[0];
		if (!applicant) {
			return NextResponse.json(
				{ error: `Applicant ${applicantId} not found` },
				{ status: 404 }
			);
		}

		if (applicant.sanctionStatus !== "flagged") {
			return NextResponse.json(
				{
					error: `Applicant is not in 'flagged' state (current: ${applicant.sanctionStatus})`,
				},
				{ status: 409 }
			);
		}

		if (action === "clear") {
			// Insert clearance record
			await db.insert(sanctionClearance).values({
				applicantId,
				workflowId,
				clearedBy: userId,
				clearanceReason: reason,
				isFalsePositive,
			});

			// Update applicant status
			await db
				.update(applicants)
				.set({ sanctionStatus: "clear" })
				.where(eq(applicants.id, applicantId));

			// Send Inngest event to resume workflow
			await inngest.send({
				name: "sanction/cleared",
				data: {
					workflowId,
					applicantId,
					officerId: userId,
					reason,
					clearedAt: new Date().toISOString(),
				},
			});

			return NextResponse.json({
				success: true,
				message: "Sanction cleared — workflow will resume",
				applicantId,
				workflowId,
			});
		}

		// action === "confirm"
		// Update applicant status to confirmed_hit
		await db
			.update(applicants)
			.set({ sanctionStatus: "confirmed_hit" })
			.where(eq(applicants.id, applicantId));

		// Send Inngest event to terminate workflow
		await inngest.send({
			name: "sanction/confirmed",
			data: {
				workflowId,
				applicantId,
				officerId: userId,
				confirmedAt: new Date().toISOString(),
			},
		});

		return NextResponse.json({
			success: true,
			message: "Sanction confirmed — workflow terminated",
			applicantId,
			workflowId,
		});
	} catch (error) {
		console.error("[Sanctions API] POST error:", error);
		return NextResponse.json(
			{
				error: "Failed to process sanction action",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

// ============================================
// Helpers
// ============================================

/**
 * Build deep links to external sanction sources for side-by-side verification
 */
function buildDeepLinks(
	matchDetails: Record<string, unknown> | null
): Array<{ label: string; url: string; source: string }> {
	const links: Array<{ label: string; url: string; source: string }> = [];

	// OFAC SDN Search
	links.push({
		label: "OFAC Sanctions Search",
		url: "https://sanctionssearch.ofac.treas.gov/",
		source: "US Treasury / OFAC",
	});

	// UN Security Council 1267 list
	links.push({
		label: "UN 1267 Sanctions List",
		url: "https://www.un.org/securitycouncil/sanctions/1267/aq_sanctions_list",
		source: "United Nations",
	});

	// South Africa FIC
	links.push({
		label: "SA Financial Intelligence Centre",
		url: "https://www.fic.gov.za/",
		source: "RSA FIC",
	});

	// EU Sanctions Map
	links.push({
		label: "EU Sanctions Map",
		url: "https://www.sanctionsmap.eu/",
		source: "European Union",
	});

	// If there's a specific list entry ID, build a direct link
	const listEntryId = matchDetails?.listEntryId as string | undefined;
	if (listEntryId) {
		links.unshift({
			label: `Direct Match: ${listEntryId}`,
			url: `https://sanctionssearch.ofac.treas.gov/Details.aspx?id=${encodeURIComponent(listEntryId)}`,
			source: "OFAC Direct",
		});
	}

	return links;
}
