import { eq } from "drizzle-orm";
import { getBaseUrl, getDatabaseClient } from "@/app/utils";
import { applicants, documents, documentUploads } from "@/db/schema";
import { WORKFLOW_TIMEOUTS } from "@/lib/constants/workflow-timeouts";
import { parseVatStatus } from "@/lib/risk-review/parsers/vat.parser";
import type { VatStatus } from "@/lib/risk-review/types";
import {
	type BatchValidationResult,
	validateDocumentsBatch,
} from "@/lib/services/agents";
import { getDocumentRequirements } from "@/lib/services/document-requirements.service";
import { sendInternalAlertEmail } from "@/lib/services/email.service";
import { runVatVerificationCheck } from "@/lib/services/firecrawl";
import { performITCCheck } from "@/lib/services/itc.service";
import {
	executeKillSwitch,
	isWorkflowTerminated,
} from "@/lib/services/kill-switch.service";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";
import { executeProcurementCheck } from "@/lib/services/procurecheck.service";
import { updateRiskCheckMachineState } from "@/lib/services/risk-check.service";
import {
	getStateLockInfo,
	handleStateCollision,
} from "@/lib/services/state-lock.service";
import { recordVendorCheckFailure } from "@/lib/services/telemetry/vendor-metrics";
import { terminateRun } from "@/lib/services/terminate-run.service";
import { updateWorkflowStatus } from "@/lib/services/workflow.service";
import { inngest } from "../../../client";
import { guardKillSwitch } from "../../../utils/guards";
import { runSanctionsForWorkflow } from "../../../utils/helpers";
import { handleWaitWithReminders } from "../../handlers/reminder-handler";
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

		const procurementStart = Date.now();
		try {
			const result = await executeProcurementCheck(applicantId, workflowId);

			await logWorkflowEvent({
				workflowId,
				eventType: "procurement_check_completed",
				payload: {
					vendorId: result.vendorId,
					provider: result.payload.provider,
					categoriesCount: result.payload.categories.length,
				},
			});

			await updateRiskCheckMachineState(workflowId, "PROCUREMENT", "completed", {
				externalCheckId: result.vendorId,
				payload: result.payload,
				rawPayload: result.rawPayload,
			});

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "warning",
				title: "Procurement Result Added To Risk Review",
				message: `ProcureCheck completed for vendor ${result.vendorId}. ${result.payload.categories.length} categories checked.`,
				actionable: false,
			});

			return { killSwitchTriggered: false, isBlocked: false };
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			const isAuthError = /\b(401|403)\b/.test(errorMessage);

			console.error("[ControlTower] Procurement check execution failed:", error);
			recordVendorCheckFailure({
				vendor: "procurecheck",
				stage: 3,
				workflowId,
				applicantId,
				durationMs: Date.now() - procurementStart,
				outcome: isAuthError ? "persistent_failure" : "transient_failure",
				error,
			});

			await logWorkflowEvent({
				workflowId,
				eventType: "error",
				payload: {
					error: errorMessage,
					context: "procurement_check_failed",
					source: "procurecheck",
					stage: 3,
					isAuthError,
				},
			});

			if (isAuthError) {
				await updateRiskCheckMachineState(workflowId, "PROCUREMENT", "manual_required", {
					errorDetails: `Auth failure: ${errorMessage}`,
				});

				await createWorkflowNotification({
					workflowId,
					applicantId,
					type: "warning",
					title: "ProcureCheck Authentication Failed",
					message:
						"ProcureCheck credentials are invalid. Manual procurement review required.",
					actionable: false,
				});

				return { killSwitchTriggered: false, isBlocked: false };
			}

			throw error;
		}
	});

	const itcCheck = step.run("check-itc", async () => {
		await guardKillSwitch(workflowId, "check-itc");

		await updateRiskCheckMachineState(workflowId, "ITC", "in_progress", {
			provider: "itc",
		});

		const itcStart = Date.now();
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
			recordVendorCheckFailure({
				vendor: "xds_itc",
				stage: 3,
				workflowId,
				applicantId,
				durationMs: Date.now() - itcStart,
				outcome: "persistent_failure",
				error,
			});

			await updateRiskCheckMachineState(workflowId, "ITC", "failed", {
				errorDetails: errorMessage,
			});

			return { killSwitchTriggered: false };
		}
	});

	const sanctionsCheck = step.run("check-sanctions", async () => {
		await guardKillSwitch(workflowId, "check-sanctions");

		await updateRiskCheckMachineState(workflowId, "SANCTIONS", "in_progress");

		const sanctionsStart = Date.now();
		try {
			const sanctions = await runSanctionsForWorkflow(
				applicantId,
				workflowId,
				"itc_main",
				{ allowReuse: true }
			);

			const machineState = sanctions.isBlocked
				? ("manual_required" as const)
				: ("completed" as const);
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
			recordVendorCheckFailure({
				vendor: "opensanctions",
				stage: 3,
				workflowId,
				applicantId,
				durationMs: Date.now() - sanctionsStart,
				outcome: "persistent_failure",
				error,
			});

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
		: await handleWaitWithReminders({
				step,
				workflowId,
				applicantId,
				stage: 3,
				waitStepId: "wait-fica-docs",
				eventName: "upload/fica.received",
				totalTimeout: WORKFLOW_TIMEOUTS.STAGE,
				terminationReason: "STAGE3_FICA_UPLOAD_TIMEOUT",
				reminderContext: {
					itemName: "FICA Documents",
					actionTab: "documents",
				},
			});
	const ficaDocsData = (
		ficaDocsReceived as {
			data?: {
				source?: string;
			};
		}
	).data;

	if (
		ficaDocsData?.source &&
		ficaDocsData.source !== "stage2_documents_already_complete"
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

		const ficaComparisonContext =
			facilitySubmission?.data?.formData?.ficaComparisonContext;

		const ficaValidationStart = Date.now();
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
			recordVendorCheckFailure({
				vendor: "document_ai_fica",
				stage: 3,
				workflowId,
				applicantId,
				durationMs: Date.now() - ficaValidationStart,
				outcome: "persistent_failure",
				error,
			});

			await updateRiskCheckMachineState(workflowId, "FICA", "manual_required", {
				errorDetails: errorMessage,
			});
		}
	});

	// -----------------------------------------------------------------------
	// VAT sub-agent: non-blocking, evidence-only peer check.
	//
	// Invariants:
	//   - Skipped when applicant.vatNumber is absent.
	//   - Failures set VAT evidence status only; they never mutate FICA
	//     machine state or trigger any kill-switch / terminate-run call.
	//   - The returned object is evidence metadata only — not a gate decision.
	// -----------------------------------------------------------------------
	await step.run("check-vat", async () => {
		const db = getDatabaseClient();
		const [applicant] = db
			? await db.select().from(applicants).where(eq(applicants.id, applicantId))
			: [];

		if (!applicant?.vatNumber) {
			return { status: "not_checked" satisfies VatStatus };
		}

		const vatNumber = applicant.vatNumber;

		// Format guard — runVatVerificationCheck will throw on invalid format;
		// surface as invalid_input without letting the exception propagate.
		if (!/^\d{10}$/.test(vatNumber)) {
			console.warn(
				`[ControlTower] VAT check skipped: invalid format for applicant ${applicantId}`
			);
			await logWorkflowEvent({
				workflowId,
				eventType: "vat_verification_completed",
				payload: {
					vatNumber,
					status: "invalid_input",
					reason: "VAT number does not match required 10-digit format",
				},
			});
			return { status: "invalid_input" satisfies VatStatus };
		}

		const vatStart = Date.now();
		try {
			const result = await runVatVerificationCheck({
				vatNumber,
				companyName: applicant.companyName ?? undefined,
				workflowId,
				applicantId,
			});

			const vatStatus = parseVatStatus(
				result.status,
				result.result?.runtimeState,
				result.result?.verified
			);

			await logWorkflowEvent({
				workflowId,
				eventType: "vat_verification_completed",
				payload: {
					vatNumber,
					status: vatStatus,
					verified: result.result?.verified ?? false,
					tradingName: result.result?.tradingName,
					runtimeState: result.result?.runtimeState,
				},
			});

			const notificationType =
				vatStatus === "verified"
					? ("success" as const)
					: vatStatus === "manual_review"
						? ("warning" as const)
						: vatStatus === "not_verified"
							? ("warning" as const)
							: ("info" as const);

			const notificationTitle =
				vatStatus === "verified"
					? "VAT Verification Passed"
					: vatStatus === "not_verified"
						? "VAT Verification: No Match Found"
						: vatStatus === "manual_review"
							? "VAT Verification: Manual Review Required"
							: "VAT Verification: Check Inconclusive";

			const notificationMessage =
				vatStatus === "verified"
					? `VAT number ${vatNumber} confirmed via SARS lookup.`
					: vatStatus === "not_verified"
						? `VAT number ${vatNumber} could not be confirmed. Manual review recommended.`
						: `VAT check returned status: ${vatStatus}. Evidence recorded for risk review.`;

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: notificationType,
				title: notificationTitle,
				message: notificationMessage,
				actionable: vatStatus !== "verified",
				severity: vatStatus === "verified" ? "low" : "medium",
			});

			return { status: vatStatus };
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error("[ControlTower] VAT check failed (non-blocking):", error);
			recordVendorCheckFailure({
				vendor: "firecrawl_vat",
				stage: 3,
				workflowId,
				applicantId,
				durationMs: Date.now() - vatStart,
				outcome: "persistent_failure",
				error,
			});

			await logWorkflowEvent({
				workflowId,
				eventType: "vat_verification_completed",
				payload: {
					vatNumber,
					status: "error",
					error: errorMessage,
				},
			});

			// Evidence-only: do not rethrow, do not call kill-switch or terminateRun.
			return { status: "error" satisfies VatStatus };
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
