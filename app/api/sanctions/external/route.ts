import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { applicants, workflowEvents } from "@/db/schema";
import { requireAuthOrBearer } from "@/lib/auth/api-auth";
import { logWorkflowEvent } from "@/lib/services/notification-events.service";
import { updateRiskCheckMachineState } from "@/lib/services/risk-check.service";
import {
	ExternalSanctionsIngressSchema,
	ExternalSanctionsIngressCompatSchema,
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
			compatibilitySchema: ExternalSanctionsIngressCompatSchema,
		});

		// Handle validation warnings (warn mode)
		if (perimeterResult.ok && "warning" in perimeterResult) {
			const { warning } = perimeterResult;
			console.warn("[SanctionsIngress] Perimeter validation warning", {
				failedPaths: warning.failedPaths,
				messages: warning.messages,
				mode: "warn",
			});

			if (perimeterResult.data.workflowId > 0) {
				await logWorkflowEvent({
					workflowId: perimeterResult.data.workflowId,
					eventType: "warning",
					payload: {
						context: "sanctions_ingress_validation_warning",
						eventName: warning.eventName,
						sourceSystem: warning.sourceSystem,
						failedPaths: warning.failedPaths,
						messages: warning.messages,
						validationMode: "warn",
					},
				});
			}
		}

		// Handle validation failures (strict mode)
		if (!perimeterResult.ok) {
			const failure = perimeterResult.failure;
			console.error("[SanctionsIngress] Perimeter validation failed", {
				failedPaths: failure.failedPaths,
				messages: failure.messages,
				mode: failure.validationMode,
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
						validationMode: failure.validationMode,
					},
				});
			}

			return NextResponse.json(
				{
					error: "Validation failed",
					failedPaths: failure.failedPaths,
					messages: failure.messages,
					validationMode: failure.validationMode,
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

		const isBlockingOutcome = data.isBlocked || data.riskLevel === "BLOCKED";
		const requiresReview =
			!data.passed || data.riskLevel === "HIGH" || data.isPEP || data.requiresEDD;

		const machineState = isBlockingOutcome || requiresReview
			? ("manual_required" as const)
			: ("completed" as const);

		await updateRiskCheckMachineState(data.workflowId, "SANCTIONS", machineState, {
			provider: data.provider,
			externalCheckId: data.externalCheckId,
			payload: {
				passed: data.passed,
				isBlocked: data.isBlocked,
				riskLevel: data.riskLevel,
				isPEP: data.isPEP,
				requiresEDD: data.requiresEDD,
				adverseMediaCount: data.adverseMediaCount,
				matchDetails: data.matchDetails,
				checkedAt: data.checkedAt,
			},
			rawPayload: data.rawPayload ?? undefined,
		});

		await db
			.update(applicants)
			.set({
				sanctionStatus: machineState === "completed" ? "clear" : "flagged",
			})
			.where(eq(applicants.id, data.applicantId));

		const action = isBlockingOutcome
			? "blocked_for_review"
			: requiresReview
				? "flagged_for_review"
				: "cleared";

		return NextResponse.json({
			success: true,
			action,
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
