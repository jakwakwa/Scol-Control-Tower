/**
 * External Sanctions Ingress
 *
 * POST /api/sanctions/external
 *
 * Provider-agnostic ingress for sanctions check results.
 * Validates against the canonical schema, deduplicates by externalCheckId,
 * logs structured failures, and routes blocking outcomes through the
 * kill-switch path.
 *
 * Feature-flagged by provider: only enabled providers are accepted.
 * The manual compliance route at /api/sanctions remains the fallback.
 */

import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { applicants, workflowEvents } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { executeKillSwitch } from "@/lib/services/kill-switch.service";
import { logWorkflowEvent } from "@/lib/services/notification-events.service";
import { requireAuthOrBearer } from "@/lib/auth/api-auth";
import {
	ExternalSanctionsIngressSchema,
	type SanctionsProvider,
} from "@/lib/validations/control-tower/onboarding-schemas";
import { validatePerimeter } from "@/lib/validations/control-tower/perimeter-validation";

const ENABLED_PROVIDERS: SanctionsProvider[] = (() => {
	const raw = process.env.SANCTIONS_ENABLED_PROVIDERS;
	if (!raw) return ["manual"] as SanctionsProvider[];
	return raw.split(",").map(s => s.trim()) as SanctionsProvider[];
})();

export async function POST(request: NextRequest) {
	try {
		const authResult = await requireAuthOrBearer(request);
		if (authResult instanceof NextResponse) {
			return authResult;
		}

		const body = await request.json();

		const perimeterResult = validatePerimeter({
			schema: ExternalSanctionsIngressSchema,
			data: body,
			eventName: "sanctions/external.received",
			sourceSystem: "sanctions-ingress",
			terminationReason: "VALIDATION_ERROR_SANCTIONS",
		});

		if (!perimeterResult.ok) {
			const failure = perimeterResult.failure;
			console.error("[SanctionsIngress] Perimeter validation failed", {
				failedPaths: failure.failedPaths,
				messages: failure.messages,
			});

			if (failure.workflowId > 0) {
				await logWorkflowEvent({
					workflowId: failure.workflowId,
					eventType: "error",
					payload: {
						context: "sanctions_ingress_validation_failed",
						eventName: failure.eventName,
						sourceSystem: failure.sourceSystem,
						failedPaths: failure.failedPaths,
						messages: failure.messages,
					},
				});
			}

			return NextResponse.json(
				{
					error: "Validation failed",
					failedPaths: failure.failedPaths,
					messages: failure.messages,
				},
				{ status: 400 }
			);
		}

		const data = perimeterResult.data;

		if (!ENABLED_PROVIDERS.includes(data.provider)) {
			return NextResponse.json(
				{
					error: `Provider '${data.provider}' is not enabled. Enabled: ${ENABLED_PROVIDERS.join(", ")}`,
				},
				{ status: 403 }
			);
		}

		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json(
				{ error: "Database connection failed" },
				{ status: 500 }
			);
		}

		// Idempotency: dedupe by externalCheckId stored in event payload
		const existing = await db
			.select({ id: workflowEvents.id })
			.from(workflowEvents)
			.where(
				and(
					eq(workflowEvents.workflowId, data.workflowId),
					eq(workflowEvents.eventType, "sanctions_ingress_received"),
					eq(workflowEvents.actorId, data.externalCheckId),
				)
			)
			.limit(1);

		if (existing.length > 0) {
			return NextResponse.json({
				success: true,
				deduplicated: true,
				message: `Check ${data.externalCheckId} already processed`,
				workflowId: data.workflowId,
			});
		}

		await logWorkflowEvent({
			workflowId: data.workflowId,
			eventType: "sanctions_ingress_received",
			payload: {
				provider: data.provider,
				externalCheckId: data.externalCheckId,
				checkedAt: data.checkedAt,
				passed: data.passed,
				isBlocked: data.isBlocked,
				riskLevel: data.riskLevel,
				isPEP: data.isPEP,
				requiresEDD: data.requiresEDD,
				adverseMediaCount: data.adverseMediaCount,
				matchCount: data.matchDetails.length,
				matchDetails: data.matchDetails,
			},
			actorType: "platform",
			actorId: data.externalCheckId,
		});

		if (data.isBlocked) {
			await db
				.update(applicants)
				.set({ sanctionStatus: "flagged" })
				.where(eq(applicants.id, data.applicantId));

			await executeKillSwitch({
				workflowId: data.workflowId,
				applicantId: data.applicantId,
				reason: "SANCTIONS_EXTERNAL_BLOCKED",
				decidedBy: `system:${data.provider}`,
				notes: `External sanctions check blocked. Provider: ${data.provider}, Check ID: ${data.externalCheckId}`,
			});

			return NextResponse.json({
				success: true,
				action: "blocked_and_terminated",
				workflowId: data.workflowId,
				provider: data.provider,
				externalCheckId: data.externalCheckId,
			});
		}

		if (!data.passed || data.riskLevel === "HIGH" || data.riskLevel === "BLOCKED") {
			await db
				.update(applicants)
				.set({ sanctionStatus: "flagged" })
				.where(eq(applicants.id, data.applicantId));

			return NextResponse.json({
				success: true,
				action: "flagged_for_adjudication",
				workflowId: data.workflowId,
				provider: data.provider,
				externalCheckId: data.externalCheckId,
			});
		}

		await db
			.update(applicants)
			.set({ sanctionStatus: "clear" })
			.where(eq(applicants.id, data.applicantId));

		await inngest.send({
			name: "sanction/cleared",
			data: {
				workflowId: data.workflowId,
				applicantId: data.applicantId,
				officerId: `system:${data.provider}`,
				reason: `Automated clearance via ${data.provider} (check: ${data.externalCheckId})`,
				clearedAt: data.checkedAt,
			},
		});

		return NextResponse.json({
			success: true,
			action: "cleared",
			workflowId: data.workflowId,
			provider: data.provider,
			externalCheckId: data.externalCheckId,
		});
	} catch (error) {
		console.error("[SanctionsIngress] POST error:", error);
		return NextResponse.json(
			{
				error: "Failed to process sanctions ingress",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
