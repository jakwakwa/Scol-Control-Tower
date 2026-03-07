import { and, desc, eq } from "drizzle-orm";
import { NonRetriableError } from "inngest";
import { getBaseUrl, getDatabaseClient } from "@/app/utils";
import { applicants, workflowEvents } from "@/db/schema";
import { SANCTIONS_RECHECK_WINDOW_MS } from "@/lib/constants/workflow-timeouts";
import {
	isSanctionsBlocked,
	performSanctionsCheck,
	type SanctionsCheckResult,
} from "@/lib/services/agents";
import {
	sendApplicantStatusEmail,
	sendInternalAlertEmail,
} from "@/lib/services/email.service";
import { isWorkflowTerminated } from "@/lib/services/kill-switch.service";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";
import { inngest } from "../../client";
import type {
	SanctionsCheckSource,
	SanctionsExecutionResult,
	StoredSanctionsPayload,
} from "./types";

export async function guardKillSwitch(
	workflowId: number,
	stepName: string
): Promise<void> {
	const terminated = await isWorkflowTerminated(workflowId);
	if (terminated) {
		throw new NonRetriableError(
			`[KillSwitch] Workflow ${workflowId} terminated - stopping ${stepName}`
		);
	}
}

export async function notifyApplicantDecline(options: {
	applicantId: number;
	workflowId: number;
	subject: string;
	heading: string;
	message: string;
}) {
	const db = getDatabaseClient();
	if (!db) return;
	const [applicant] = await db
		.select()
		.from(applicants)
		.where(eq(applicants.id, options.applicantId));
	if (!applicant) return;

	await sendApplicantStatusEmail({
		email: applicant.email,
		subject: options.subject,
		heading: options.heading,
		message: options.message,
	});

	await createWorkflowNotification({
		workflowId: options.workflowId,
		applicantId: options.applicantId,
		type: "error",
		title: options.heading,
		message: options.message,
		actionable: false,
	});
}

export function resolveSanctionsEntityType(
	entityType?: string | null
): "INDIVIDUAL" | "COMPANY" | "TRUST" | "OTHER" {
	const normalized = entityType?.toLowerCase().trim();
	if (!normalized) return "COMPANY";
	if (normalized.includes("trust")) return "TRUST";
	if (normalized.includes("proprietor") || normalized.includes("individual")) {
		return "INDIVIDUAL";
	}
	if (
		normalized.includes("company") ||
		normalized.includes("corporation") ||
		normalized.includes("close_corporation")
	) {
		return "COMPANY";
	}
	return "OTHER";
}

export async function runSanctionsForWorkflow(
	applicantId: number,
	workflowId: number,
	source: SanctionsCheckSource,
	options?: { allowReuse?: boolean }
): Promise<SanctionsExecutionResult> {
	const allowReuse = options?.allowReuse ?? false;
	const db = getDatabaseClient();
	if (!db) throw new Error("Database connection failed");

	const [applicant] = await db
		.select()
		.from(applicants)
		.where(eq(applicants.id, applicantId));
	if (!applicant) throw new Error(`Applicant ${applicantId} not found`);

	if (allowReuse) {
		const [latestSanctionsEvent] = await db
			.select()
			.from(workflowEvents)
			.where(
				and(
					eq(workflowEvents.workflowId, workflowId),
					eq(workflowEvents.eventType, "sanctions_completed")
				)
			)
			.orderBy(desc(workflowEvents.timestamp))
			.limit(1);

		if (latestSanctionsEvent) {
			let payload: StoredSanctionsPayload | null = null;
			if (latestSanctionsEvent.payload) {
				try {
					payload = JSON.parse(latestSanctionsEvent.payload) as StoredSanctionsPayload;
				} catch {
					payload = null;
				}
			}

			const fallbackCheckedAt = latestSanctionsEvent.timestamp
				? new Date(latestSanctionsEvent.timestamp).toISOString()
				: undefined;
			const checkedAtRaw = payload?.checkedAt || fallbackCheckedAt;
			const parsedCheckedAt = checkedAtRaw ? new Date(checkedAtRaw) : null;
			const reusableResult = payload?.sanctionsResult;
			const isFresh =
				!!parsedCheckedAt &&
				!Number.isNaN(parsedCheckedAt.getTime()) &&
				Date.now() - parsedCheckedAt.getTime() <= SANCTIONS_RECHECK_WINDOW_MS;

			if (isFresh && reusableResult) {
				const checkedAt = parsedCheckedAt.toISOString();
				const isBlocked = isSanctionsBlocked(reusableResult);

				await db
					.update(applicants)
					.set({ sanctionStatus: isBlocked ? "flagged" : "clear" })
					.where(eq(applicants.id, applicantId));

				await logWorkflowEvent({
					workflowId,
					eventType: "sanctions_completed",
					payload: {
						source,
						reused: true,
						reusedFrom: payload?.source || "unknown",
						checkedAt,
						riskLevel: reusableResult.overall.riskLevel,
						isBlocked,
						passed: reusableResult.overall.passed,
						isPEP: reusableResult.pepScreening.isPEP,
						requiresEDD: reusableResult.overall.requiresEDD,
						adverseMediaCount: reusableResult.adverseMedia.alertsFound,
						sanctionsResult: reusableResult,
					},
				});

				return {
					source,
					reused: true,
					checkedAt,
					riskLevel: reusableResult.overall.riskLevel,
					isBlocked,
					result: reusableResult,
				};
			}
		}
	}

	let sanctionsResult: SanctionsCheckResult;
	let checkedAt: string;
	let isBlocked: boolean;

	try {
		sanctionsResult = await performSanctionsCheck({
			applicantId,
			workflowId,
			entityName:
				applicant.companyName || applicant.contactName || `Applicant ${applicantId}`,
			entityType: resolveSanctionsEntityType(applicant.entityType),
			countryCode: "ZA",
			registrationNumber: applicant.registrationNumber || undefined,
		});
		checkedAt = sanctionsResult.metadata.checkedAt || new Date().toISOString();
		isBlocked = isSanctionsBlocked(sanctionsResult);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const workflowStage = source === "pre_risk" ? 2 : 3;
		const manualReviewGuidance =
			"Automated sanctions checks could not run to completion. Risk Manager must perform a full manual sanctions screening before final approval.";

		console.error("[ControlTower] Sanctions check execution failed:", error);

		await logWorkflowEvent({
			workflowId,
			eventType: "error",
			payload: {
				error: errorMessage,
				context: "sanctions_check_failed",
				source: "opensanctions_with_firecrawl_fallback",
				stage: workflowStage,
				manualReviewRequired: true,
				fallbackMode: "manual_human_sanctions_check",
				failedAreas: [
					"OpenSanctions primary match API",
					"Firecrawl sanctions list crawling",
				],
				guidance: manualReviewGuidance,
			},
		});

		await createWorkflowNotification({
			workflowId,
			applicantId,
			type: "error",
			title: "Manual Sanctions Check Required",
			message:
				"Automated sanctions checks failed. Continue the workflow, but complete a full manual sanctions check in Risk Review.",
			actionable: true,
			severity: "high",
		});

		await sendInternalAlertEmail({
			title: "Manual Sanctions Check Required",
			message: `Automated sanctions checks failed for this workflow.\nError: ${errorMessage}\nRequired Action: Complete a full manual sanctions check and record the outcome in Risk Review.`,
			workflowId,
			applicantId,
			type: "error",
			details: {
				context: "sanctions_check_failed",
				stage: workflowStage,
				manualReviewRequired: true,
			},
			actionUrl: `${getBaseUrl()}/dashboard/risk-review`,
		});

		const fallbackCheckedAt = new Date().toISOString();
		sanctionsResult = {
			unSanctions: {
				checked: false,
				matchFound: false,
				matchDetails: [],
				lastChecked: fallbackCheckedAt,
			},
			pepScreening: {
				checked: false,
				isPEP: false,
				familyAssociates: [],
			},
			adverseMedia: {
				checked: false,
				alertsFound: 0,
				alerts: [],
			},
			watchLists: {
				checked: false,
				listsChecked: [],
				matchesFound: 0,
				matches: [],
			},
			overall: {
				riskLevel: "HIGH",
				passed: false,
				requiresEDD: true,
				recommendation: "MANUAL_REVIEW",
				reasoning: `Automated sanctions checks failed. Manual sanctions review required. Error: ${errorMessage}`,
				reviewRequired: true,
			},
			metadata: {
				checkId: `SCK-MANUAL-${workflowId}-${Date.now()}`,
				checkedAt: fallbackCheckedAt,
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
				dataSource: "Manual Fallback (OpenSanctions + Firecrawl failed)",
			},
		};
		checkedAt = fallbackCheckedAt;
		isBlocked = false;
	}

	await db
		.update(applicants)
		.set({
			sanctionStatus:
				isBlocked || sanctionsResult.overall.reviewRequired ? "flagged" : "clear",
		})
		.where(eq(applicants.id, applicantId));
	await logWorkflowEvent({
		workflowId,
		eventType: "sanctions_completed",
		payload: {
			source,
			reused: false,
			checkedAt,
			riskLevel: sanctionsResult.overall.riskLevel,
			isBlocked,
			manualFallback:
				sanctionsResult.metadata.dataSource ===
				"Manual Fallback (OpenSanctions + Firecrawl failed)",
			passed: sanctionsResult.overall.passed,
			isPEP: sanctionsResult.pepScreening.isPEP,
			requiresEDD: sanctionsResult.overall.requiresEDD,
			adverseMediaCount: sanctionsResult.adverseMedia.alertsFound,
			sanctionsResult,
		},
	});

	await inngest.send({
		name: "agent/sanctions.completed",
		data: {
			workflowId,
			applicantId,
			riskLevel: sanctionsResult.overall.riskLevel,
			passed: sanctionsResult.overall.passed,
			isPEP: sanctionsResult.pepScreening.isPEP,
			requiresEDD: sanctionsResult.overall.requiresEDD,
			adverseMediaCount: sanctionsResult.adverseMedia.alertsFound,
		},
	});

	return {
		source,
		reused: false,
		checkedAt,
		riskLevel: sanctionsResult.overall.riskLevel,
		isBlocked,
		result: sanctionsResult,
	};
}
