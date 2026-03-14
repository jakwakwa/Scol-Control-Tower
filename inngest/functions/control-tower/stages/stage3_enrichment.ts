import { eq } from "drizzle-orm";
import { getBaseUrl, getDatabaseClient } from "@/app/utils";
import { applicants, documents, documentUploads } from "@/db/schema";
import { WORKFLOW_TIMEOUTS } from "@/lib/constants/workflow-timeouts";
import { isMockEnvironmentEnabled } from "@/lib/mock-environment";
import { resolveWorkflowMockScenario } from "@/lib/mock-scenario-state.server";
import {
	type BatchValidationResult,
	validateDocumentsBatch,
} from "@/lib/services/agents";
import { getDocumentRequirements } from "@/lib/services/document-requirements.service";
import { sendInternalAlertEmail } from "@/lib/services/email.service";
import { performITCCheck } from "@/lib/services/itc.service";
import {
	executeKillSwitch,
	isWorkflowTerminated,
} from "@/lib/services/kill-switch.service";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";
import { updateRiskCheckMachineState } from "@/lib/services/risk-check.service";
import { analyzeRisk as runProcureCheck } from "@/lib/services/risk.service";
import {
	getStateLockInfo,
	handleStateCollision,
} from "@/lib/services/state-lock.service";
import { terminateRun } from "@/lib/services/terminate-run.service";
import { updateWorkflowStatus } from "@/lib/services/workflow.service";
import { inngest } from "../../../client";
import { guardKillSwitch, runSanctionsForWorkflow } from "../helpers";
import type { Stage2Output, StageDependencies, StageResult } from "../types";

export async function executeStage3({
	step,
	context,
}: StageDependencies): Promise<StageResult> {
	const { workflowId, applicantId } = context;
	const mandateInfo = context.mandateInfo as Stage2Output["mandateInfo"];
	const facilitySubmission = context.facilitySubmission as
		| {
				data?: {
					formData?: {
						ficaComparisonContext?: Record<string, unknown>;
					};
				};
		  }
		| undefined;
	const mandateVerified = context.mandateVerified as Stage2Output["mandateVerified"];

	await step.run("stage-3-start", async () => {
		await guardKillSwitch(workflowId, "stage-3-start");
		return updateWorkflowStatus(workflowId, "processing", 3);
	});

	await step.run("emit-business-type-event", async () => {
		const docRequirements = getDocumentRequirements(mandateInfo.businessType);
		await inngest.send({
			name: "onboarding/business-type.determined",
			data: {
				workflowId,
				applicantId,
				businessType: mandateInfo.businessType,
				requiredDocuments: docRequirements.documents
					.filter(d => d.required)
					.map(d => d.id),
				optionalDocuments: docRequirements.documents
					.filter(d => !d.required)
					.map(d => d.id),
			},
		});
	});

	const preLockState = await step.run("capture-state-lock-version", async () => {
		const lockInfo = await getStateLockInfo(workflowId);
		console.info(
			`[ControlTower] State lock checkpoint: workflow=${workflowId}, version=${lockInfo.version}`
		);
		return { version: lockInfo.version };
	});

	const procurementCheck = step.run("check-procurement", async () => {
		const terminated = await isWorkflowTerminated(workflowId);
		if (terminated) {
			return { killSwitchTriggered: true, isBlocked: false };
		}

		const currentLock = await getStateLockInfo(workflowId);
		if (currentLock.version !== preLockState.version) {
			console.warn(
				`[ControlTower] Procurement: State collision detected — ` +
					`expected v${preLockState.version}, found v${currentLock.version}`
			);
			await handleStateCollision(workflowId, "check-procurement", {
				stream: "procurement",
				expectedVersion: preLockState.version,
				actualVersion: currentLock.version,
				lockedBy: currentLock.lockedBy,
			});
			await updateRiskCheckMachineState(workflowId, "PROCUREMENT", "manual_required", {
				errorDetails: "State lock collision — human decision overrides automated check",
			});
			return { killSwitchTriggered: false, isBlocked: false };
		}

		await updateRiskCheckMachineState(workflowId, "PROCUREMENT", "in_progress", {
			provider: "procurecheck",
		});

		try {
			const result = await runProcureCheck(applicantId, workflowId);

			await logWorkflowEvent({
				workflowId,
				eventType: "procurement_check_completed",
				payload: {
					riskScore: result.riskScore,
					anomalies: result.anomalies,
					recommendedAction: result.recommendedAction,
				},
			});

			await updateRiskCheckMachineState(workflowId, "PROCUREMENT", "completed", {
				payload: {
					riskScore: result.riskScore,
					anomalies: result.anomalies,
					recommendedAction: result.recommendedAction,
					procureCheckId: result.procureCheckId,
				},
				rawPayload: result.procureCheckData,
			});

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "warning",
				title: "Procurement Result Added To Risk Review",
				message: `ProcureCheck score: ${result.riskScore}. Action: ${result.recommendedAction}.`,
				actionable: false,
			});

			return { killSwitchTriggered: false, isBlocked: false };
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error("[ControlTower] Procurement check execution failed:", error);

			await logWorkflowEvent({
				workflowId,
				eventType: "error",
				payload: {
					error: errorMessage,
					context: "procurement_check_failed",
					source: "procurecheck",
					stage: 3,
					manualReviewRequired: true,
				},
			});

			await updateRiskCheckMachineState(workflowId, "PROCUREMENT", "manual_required", {
				errorDetails: errorMessage,
			});

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "warning",
				title: "Procurement Automation Offline",
				message:
					"Automated ProcureCheck failed. Manual procurement evidence required at risk review.",
				actionable: false,
			});

			return { killSwitchTriggered: false, isBlocked: false };
		}
	});

	const itcCheck = step.run("check-itc", async () => {
		await guardKillSwitch(workflowId, "check-itc");

		await updateRiskCheckMachineState(workflowId, "ITC", "in_progress", {
			provider: "itc",
		});

		try {
			const itcResult = await performITCCheck({ applicantId, workflowId });

			const db = getDatabaseClient();
			if (db) {
				await db
					.update(applicants)
					.set({
						itcScore: itcResult.creditScore,
						itcStatus: itcResult.recommendation,
					})
					.where(eq(applicants.id, applicantId));
			}

			await logWorkflowEvent({
				workflowId,
				eventType: "itc_check_completed",
				payload: {
					creditScore: itcResult.creditScore,
					riskCategory: itcResult.riskCategory,
					recommendation: itcResult.recommendation,
					passed: itcResult.passed,
					executedAt: new Date().toISOString(),
					stage: 3,
				},
			});

			const rawPayload =
				itcResult.rawResponse &&
				typeof itcResult.rawResponse === "object" &&
				!Array.isArray(itcResult.rawResponse)
					? (itcResult.rawResponse as Record<string, unknown>)
					: undefined;

			await updateRiskCheckMachineState(workflowId, "ITC", "completed", {
				payload: {
					creditScore: itcResult.creditScore,
					riskCategory: itcResult.riskCategory,
					recommendation: itcResult.recommendation,
					passed: itcResult.passed,
					adverseListings: itcResult.adverseListings ?? [],
					checkedAt: itcResult.checkedAt.toISOString(),
				},
				rawPayload,
			});

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "info",
				title: "ITC Check Complete",
				message: `ITC recommendation: ${itcResult.recommendation}. Credit score: ${itcResult.creditScore}.`,
				actionable: false,
			});

			return { killSwitchTriggered: false };
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error("[ControlTower] ITC check execution failed:", error);

			await updateRiskCheckMachineState(workflowId, "ITC", "failed", {
				errorDetails: errorMessage,
			});

			return { killSwitchTriggered: false };
		}
	});

	const sanctionsCheck = step.run("check-sanctions", async () => {
		await guardKillSwitch(workflowId, "check-sanctions");

		await updateRiskCheckMachineState(workflowId, "SANCTIONS", "in_progress");

		try {
			const sanctions = await runSanctionsForWorkflow(
				applicantId,
				workflowId,
				"itc_main",
				{ allowReuse: true }
			);

			const machineState = sanctions.isBlocked ? "manual_required" as const : "completed" as const;
			await updateRiskCheckMachineState(workflowId, "SANCTIONS", machineState, {
				provider: sanctions.result.metadata.dataSource || "opensanctions+firecrawl",
				payload: {
					riskLevel: sanctions.riskLevel,
					isBlocked: sanctions.isBlocked,
					passed: sanctions.result.overall.passed,
					isPEP: sanctions.result.pepScreening.isPEP,
					requiresEDD: sanctions.result.overall.requiresEDD,
					adverseMediaCount: sanctions.result.adverseMedia.alertsFound,
					reused: sanctions.reused,
					checkedAt: sanctions.checkedAt,
				},
				rawPayload: sanctions.result as unknown as object,
			});

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: sanctions.isBlocked ? "warning" : "info",
				title: "Sanctions Check Complete",
				message: `Sanctions risk: ${sanctions.riskLevel}${sanctions.reused ? " (reused within 7-day window)" : ""}.`,
				actionable: false,
			});

			return {
				killSwitchTriggered: false,
				isBlocked: sanctions.isBlocked,
				isSanctionHit:
					sanctions.result.overall.riskLevel === "BLOCKED" ||
					sanctions.result.unSanctions.matchFound === true,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error("[ControlTower] Sanctions check execution failed:", error);

			await updateRiskCheckMachineState(workflowId, "SANCTIONS", "manual_required", {
				errorDetails: errorMessage,
			});

			return { killSwitchTriggered: false, isBlocked: false, isSanctionHit: false };
		}
	});

	const ficaDocRequest = step.run("fica-request-docs", async () => {
		const terminated = await isWorkflowTerminated(workflowId);
		if (terminated) return { requested: false };

		const currentLock = await getStateLockInfo(workflowId);
		if (currentLock.version !== preLockState.version) {
			console.warn(
				`[ControlTower] FICA: State collision detected — ` +
					`expected v${preLockState.version}, found v${currentLock.version}`
			);
			await handleStateCollision(workflowId, "fica-request-docs", {
				stream: "fica",
				expectedVersion: preLockState.version,
				actualVersion: currentLock.version,
				lockedBy: currentLock.lockedBy,
			});
			return { requested: false };
		}

		await updateRiskCheckMachineState(workflowId, "FICA", "in_progress");

		await createWorkflowNotification({
			workflowId,
			applicantId,
			type: "awaiting",
			title: "FICA Documents Required",
			message: "Please upload bank statements and required documents for AI verification",
			actionable: true,
		});

		return { requested: true };
	});

	const [procResult, , sanctionsResult] = await Promise.all([
		procurementCheck,
		itcCheck,
		sanctionsCheck,
		ficaDocRequest,
	]);

	if (procResult.killSwitchTriggered) {
		return { status: "terminated", stage: 3, reason: "Kill switch triggered" };
	}

	const ficaDocsReceived = mandateVerified.documentsComplete
		? { data: { workflowId, applicantId, source: "stage2_documents_already_complete" } }
		: await step.waitForEvent("wait-fica-docs", {
				event: "upload/fica.received",
				timeout: WORKFLOW_TIMEOUTS.STAGE,
				match: "data.workflowId",
			});

	if (!ficaDocsReceived) {
		await step.run("notify-am-fica-timeout", async () => {
			await guardKillSwitch(workflowId, "notify-am-fica-timeout");
			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "warning",
				title: "Delay: FICA Documents",
				message:
					"Applicant failed to upload FICA documents within the expected timeframe.",
				actionable: true,
			});
			await sendInternalAlertEmail({
				title: "Delay: FICA Documents",
				message: `Applicant has not uploaded FICA documents within the ${WORKFLOW_TIMEOUTS.STAGE} timeout window. Please follow up.`,
				workflowId,
				applicantId,
				type: "warning",
				actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}`,
			});
		});

		await step.run("fica-timeout-update-row", () =>
			updateRiskCheckMachineState(workflowId, "FICA", "failed", {
				errorDetails: "FICA document upload timed out",
			})
		);

		await step.run("terminate-fica-timeout", () =>
			terminateRun({
				workflowId,
				applicantId,
				stage: 3,
				reason: "STAGE3_FICA_UPLOAD_TIMEOUT",
			})
		);
	}

	if (
		"source" in ficaDocsReceived.data &&
		ficaDocsReceived.data.source !== "stage2_documents_already_complete"
	) {
		await step.run("notify-am-fica-docs-uploaded", async () => {
			await guardKillSwitch(workflowId, "notify-am-fica-docs-uploaded");
			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "success",
				title: "FICA Documents Uploaded",
				message: "Applicant has successfully uploaded FICA documents.",
				actionable: false,
			});
			await sendInternalAlertEmail({
				title: "FICA Documents Uploaded",
				message: "The applicant has uploaded FICA documents and processing continues.",
				workflowId,
				applicantId,
				type: "info",
				actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}`,
			});
		});
	}

	await step.run("check-fica-validation", async () => {
		await guardKillSwitch(workflowId, "check-fica-validation");
		const mockScenario = isMockEnvironmentEnabled()
			? await resolveWorkflowMockScenario({ workflowId, applicantId })
			: null;

		const db = getDatabaseClient();
		const [applicant] = db
			? await db.select().from(applicants).where(eq(applicants.id, applicantId))
			: [];

		const docsInDocumentsTable = db
			? await db.select().from(documents).where(eq(documents.applicantId, applicantId))
			: [];
		const docsInUploadsTable = db
			? await db
					.select()
					.from(documentUploads)
					.where(eq(documentUploads.workflowId, workflowId))
			: [];

		const aiDocuments: Array<{
			id: string;
			type: string;
			content: string;
			contentType: "text" | "base64";
		}> = [];

		for (const doc of docsInDocumentsTable) {
			if (doc.fileContent) {
				aiDocuments.push({
					id: String(doc.id),
					type: doc.type,
					content: doc.fileContent,
					contentType: "base64",
				});
			}
		}

		for (const doc of docsInUploadsTable) {
			if (doc.fileContent) {
				aiDocuments.push({
					id: String(doc.id),
					type: doc.documentType,
					content: doc.fileContent,
					contentType: "base64",
				});
			}
		}

		if (aiDocuments.length === 0) {
			await updateRiskCheckMachineState(workflowId, "FICA", "manual_required", {
				errorDetails: "No documents available for automated FICA validation",
			});
			return;
		}

		if (mockScenario) {
			const isRejected = mockScenario.definition.fica === "rejected";
			await updateRiskCheckMachineState(
				workflowId,
				"FICA",
				isRejected ? "manual_required" : "completed",
				{
					provider: "validation-agent-mock",
					payload: {
						summary: {
							overallRecommendation: isRejected ? "STOP" : "PROCEED",
							status: isRejected ? "manual_required" : "verified",
						},
						documentCount: aiDocuments.length,
						scenarioId: mockScenario.persisted.id,
					},
					rawPayload: {
						source: "mock-scenario",
						scenarioId: mockScenario.persisted.id,
					},
				}
			);

			await logWorkflowEvent({
				workflowId,
				eventType: "fica_check_completed",
				payload: {
					documentCount: aiDocuments.length,
					overallRecommendation: isRejected ? "STOP" : "PROCEED",
					hasCriticalFailures: isRejected,
					scenarioId: mockScenario.persisted.id,
				},
			});
			return;
		}

		const ficaComparisonContext = facilitySubmission?.data?.formData?.ficaComparisonContext;

		try {
			const validationResult: BatchValidationResult = await validateDocumentsBatch({
				documents: aiDocuments,
				applicantData: {
					companyName: applicant?.companyName || "Unknown",
					contactName: applicant?.contactName,
					registrationNumber: applicant?.registrationNumber || undefined,
				},
				ficaComparisonContext,
				workflowId,
			});

			const ficaComparisons = validationResult.results
				.map(r => r.validation.ficaComparison)
				.filter(Boolean);

			const hasCriticalFailures = ficaComparisons.some(
				fc => fc?.summary?.overallStatus === "MISMATCHED"
			);

			const machineState =
				validationResult.summary.overallRecommendation === "STOP" || hasCriticalFailures
					? ("manual_required" as const)
					: ("completed" as const);

			await updateRiskCheckMachineState(workflowId, "FICA", machineState, {
				provider: "validation-agent",
				payload: {
					summary: validationResult.summary,
					ficaComparisons,
					documentCount: validationResult.results.length,
					overallRecommendation: validationResult.summary.overallRecommendation,
				},
				rawPayload: validationResult as unknown as object,
			});

			await logWorkflowEvent({
				workflowId,
				eventType: "fica_check_completed",
				payload: {
					documentCount: validationResult.results.length,
					overallRecommendation: validationResult.summary.overallRecommendation,
					hasCriticalFailures,
				},
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error("[ControlTower] FICA validation failed:", error);

			await updateRiskCheckMachineState(workflowId, "FICA", "manual_required", {
				errorDetails: errorMessage,
			});
		}
	});

	if (sanctionsResult.isBlocked && sanctionsResult.isSanctionHit) {
		await step.run("enter-sanction-pause", async () => {
			await updateWorkflowStatus(workflowId, "paused", 3);

			const db = getDatabaseClient();
			if (db) {
				await db
					.update(applicants)
					.set({ sanctionStatus: "flagged" })
					.where(eq(applicants.id, applicantId));
			}

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "error",
				title: "CRITICAL: Sanction Hit Detected",
				message:
					"Workflow PAUSED. Compliance Officer clearance required. 'Retry' is forbidden.",
				actionable: true,
			});

			await sendInternalAlertEmail({
				title: "CRITICAL: Sanction Hit Paused Workflow",
				message:
					"A potential sanction hit has paused the workflow. Compliance Officer must adjudicate via Sanction Clearance Interface.",
				workflowId,
				applicantId,
				type: "error",
				actionUrl: `${getBaseUrl()}/dashboard/compliance/sanctions/${applicantId}`,
			});
		});

		const adjudicationEvent = await step.waitForEvent("wait-sanction-adjudication", {
			event: "sanction/adjudicated",
			timeout: "30d",
			match: "data.workflowId",
		});

		if (!adjudicationEvent) {
			return {
				status: "terminated",
				stage: 3,
				reason: "Sanction adjudication timed out",
			};
		}

		if (adjudicationEvent.data.action === "confirm") {
			await step.run("sanction-confirmed-cleanup", async () => {
				await logWorkflowEvent({
					workflowId,
					eventType: "sanctions_confirmed",
					payload: {
						officerId: adjudicationEvent.data.officerId,
						reason: adjudicationEvent.data.reason,
						confirmedAt: adjudicationEvent.data.timestamp,
					},
				});

				// Perform any other cleanup here if needed
				// e.g. Notify account manager, update internal audit logs, etc.
			});

			return terminateRun({
				workflowId,
				applicantId,
				stage: 3,
				reason: "COMPLIANCE_VIOLATION",
				notes: `Sanction hit confirmed by officer ${adjudicationEvent.data.officerId}: ${adjudicationEvent.data.reason}`,
			});
		}

		await step.run("resume-from-sanction-pause", async () => {
			await updateWorkflowStatus(workflowId, "processing", 3);
			const db = getDatabaseClient();
			if (db) {
				await db
					.update(applicants)
					.set({ sanctionStatus: "clear" })
					.where(eq(applicants.id, applicantId));
			}

			await updateRiskCheckMachineState(workflowId, "SANCTIONS", "completed", {
				payload: {
					clearedBy: adjudicationEvent.data.officerId,
					clearedAt: adjudicationEvent.data.timestamp,
					clearanceReason: adjudicationEvent.data.reason,
				},
			});

			await logWorkflowEvent({
				workflowId,
				eventType: "sanction_cleared",
				payload: {
					officerId: adjudicationEvent.data.officerId,
					reason: adjudicationEvent.data.reason,
					clearedAt: adjudicationEvent.data.timestamp,
				},
			});
		});
	} else if (sanctionsResult.isBlocked) {
		await executeKillSwitch({
			workflowId,
			applicantId,
			reason: "COMPLIANCE_VIOLATION",
			decidedBy: "ai_sanctions_agent",
			notes: "Blocked by sanctions screening (non-sanctions block)",
		});
		return {
			status: "terminated",
			stage: 3,
			reason: "Blocked by sanctions screening",
		};
	}

	return { status: "completed", stage: 3 };
}
