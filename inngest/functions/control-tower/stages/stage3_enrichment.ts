import { eq } from "drizzle-orm";
import { getBaseUrl, getDatabaseClient } from "@/app/utils";
import { applicants, documents, documentUploads } from "@/db/schema";
import { WORKFLOW_TIMEOUTS } from "@/lib/constants/workflow-timeouts";
import {
	type AggregatedAnalysisResult,
	performAggregatedAnalysis,
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
import { analyzeRisk as runProcureCheck } from "@/lib/services/risk.service";
import {
	getStateLockInfo,
	handleStateCollision,
} from "@/lib/services/state-lock.service";
import { terminateRun } from "@/lib/services/terminate-run.service";
import { updateWorkflowStatus } from "@/lib/services/workflow.service";
import { inngest } from "../../../client";
import { guardKillSwitch, runSanctionsForWorkflow } from "../helpers";
import type { StageDependencies, StageResult } from "../types";

export async function executeStage3({
	step,
	context,
}: StageDependencies): Promise<StageResult> {
	const { workflowId, applicantId } = context;
	const mandateInfo = context.mandateInfo as any;
	const facilitySubmission = context.facilitySubmission as any;
	const mandateVerified = context.mandateVerified as any;
	// Stream A: Procurement Risk Assessment (can trigger kill switch)
	// Stream B: Document Collection & AI Analysis
	// ================================================================

	await step.run("stage-3-start", async () => {
		await guardKillSwitch(workflowId, "stage-3-start");
		return updateWorkflowStatus(workflowId, "processing", 3);
	});

	// Emit business type determined event
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

	// Phase 1: Capture the current state lock version before launching parallel streams.
	// This version is the "checkpoint" — if it changes during execution,
	// a human has finalized the record and background data must be discarded.
	const preLockState = await step.run("capture-state-lock-version", async () => {
		const lockInfo = await getStateLockInfo(workflowId);
		console.info(
			`[ControlTower] State lock checkpoint: workflow=${workflowId}, version=${lockInfo.version}`
		);
		return { version: lockInfo.version };
	});

	// ================================================================
	// PARALLEL STREAM A: Procurement Risk Assessment
	// ================================================================

	interface ProcurementStreamResult {
		cleared: boolean;
		requiresReview: boolean;
		killSwitchTriggered: boolean;
		stateLockCollision?: boolean;
		reason?: string;
		error?: string;
		result?: Awaited<ReturnType<typeof runProcureCheck>>;
	}

	const procurementStream = step.run(
		"stream-a-procurement",
		async (): Promise<ProcurementStreamResult> => {
			const terminated = await isWorkflowTerminated(workflowId);
			if (terminated) {
				return {
					cleared: false,
					reason: "Workflow terminated",
					killSwitchTriggered: true,
					requiresReview: false,
				};
			}

			// Phase 1: Ghost Process Guard — check if a human has finalized
			// this record since we started. If so, discard our results.
			const currentLock = await getStateLockInfo(workflowId);
			if (currentLock.version !== preLockState.version) {
				console.warn(
					`[ControlTower] Stream A: State collision detected — ` +
						`expected v${preLockState.version}, found v${currentLock.version}. ` +
						`Discarding procurement results.`
				);
				await handleStateCollision(workflowId, "stream-a-procurement", {
					stream: "procurement",
					expectedVersion: preLockState.version,
					actualVersion: currentLock.version,
					lockedBy: currentLock.lockedBy,
				});
				return {
					cleared: false,
					requiresReview: false,
					killSwitchTriggered: false,
					stateLockCollision: true,
					reason: `State lock collision: human decision (v${currentLock.version}) overrides background data`,
				};
			}

			try {
				const procureResult = await runProcureCheck(applicantId);

				await logWorkflowEvent({
					workflowId,
					eventType: "procurement_check_completed",
					payload: {
						riskScore: procureResult.riskScore,
						anomalies: procureResult.anomalies,
						recommendedAction: procureResult.recommendedAction,
					},
				});

				// Always require manual review per SOP
				return {
					cleared: false,
					result: procureResult,
					requiresReview: true,
					killSwitchTriggered: false,
				};
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				console.error("[ControlTower] Procurement check execution failed:", error);

				const manualReviewGuidance =
					"Automated ProcureCheck could not run. Risk Manager must perform a full manual procurement check.";

				await logWorkflowEvent({
					workflowId,
					eventType: "error",
					payload: {
						error: errorMessage,
						context: "procurement_check_failed",
						source: "procurecheck",
						stage: 3,
						manualReviewRequired: true,
						fallbackMode: "manual_human_procurement_check",
						failedAreas: [
							"Automated procurement vendor screening",
							"Automated procurement risk scoring",
						],
						guidance: manualReviewGuidance,
					},
				});

				return {
					cleared: false,
					requiresReview: true,
					error: errorMessage,
					killSwitchTriggered: false,
				};
			}
		}
	);

	// ================================================================
	// PARALLEL STREAM B: FICA Document Collection & AI Analysis
	// ================================================================

	const documentStream = step.run("stream-b-fica-and-ai", async () => {
		const terminated = await isWorkflowTerminated(workflowId);
		if (terminated) {
			return { requested: false, reason: "Workflow terminated" };
		}

		// Phase 1: Ghost Process Guard — check if a human has finalized
		// this record since we started. If so, don't request more documents.
		const currentLock = await getStateLockInfo(workflowId);
		if (currentLock.version !== preLockState.version) {
			console.warn(
				`[ControlTower] Stream B: State collision detected — ` +
					`expected v${preLockState.version}, found v${currentLock.version}. ` +
					`Skipping FICA document request.`
			);
			await handleStateCollision(workflowId, "stream-b-fica-and-ai", {
				stream: "fica_and_ai",
				expectedVersion: preLockState.version,
				actualVersion: currentLock.version,
				lockedBy: currentLock.lockedBy,
			});
			return {
				requested: false,
				reason: "State lock collision — human decision overrides",
			};
		}

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

	// Execute both streams in parallel
	// We use Promise.all to ensure both streams are started.
	// However, we need to handle the waiting logic carefully.
	// The original logic waited sequentially for procurement review THEN fica docs.
	// We need to wait for BOTH potential outcomes in parallel.

	const [procurementStreamResult, _documentStreamResult] = await Promise.all([
		procurementStream,
		documentStream,
	]);

	// Check if kill switch was triggered by procurement
	if (procurementStreamResult.killSwitchTriggered) {
		return {
			status: "terminated",
			stage: 3,
			reason: "Procurement check triggered kill switch",
		};
	}

	// Phase 1: Check if a state lock collision was detected in the parallel streams.
	// This means a human finalized the record while the background streams were running.
	// The stale data has already been handled — log and continue gracefully.
	if (procurementStreamResult.stateLockCollision) {
		console.info(
			`[ControlTower] State lock collision handled in Stream A for workflow ${workflowId}. ` +
				`Human decision takes precedence. Continuing with manual review path.`
		);

		await step.run("log-state-collision-handled", async () => {
			await logWorkflowEvent({
				workflowId,
				eventType: "stale_data_flagged",
				payload: {
					source: "parallel_stream_collision",
					resolution: "human_decision_preserved",
					collisionInStreams: ["stream-a-procurement"],
					detectedAt: new Date().toISOString(),
				},
			});
		});
	}

	// Stage 3 now has a single manual gate after reporter synthesis.
	// Procurement always contributes evidence but does not block downstream checks.
	if (procurementStreamResult.requiresReview) {
		await step.run("stage-3-log-procurement-result", async () => {
			if (procurementStreamResult.result) {
				const procureResult = procurementStreamResult.result;
				await createWorkflowNotification({
					workflowId,
					applicantId,
					type: "warning",
					title: "Procurement Result Added To Risk Review",
					message: `ProcureCheck score: ${procureResult.riskScore}. Action: ${procureResult.recommendedAction}. Included in final Stage 4 review bundle.`,
					actionable: false,
				});
			} else if (procurementStreamResult.error) {
				await createWorkflowNotification({
					workflowId,
					applicantId,
					type: "warning",
					title: "Procurement Automation Offline",
					message:
						"Automated ProcureCheck failed. Workflow continues with manual procurement evidence required at final risk review.",
					actionable: false,
				});
			}
		});
	}

	const ficaPromise = mandateVerified.documentsComplete
		? Promise.resolve({
				data: {
					workflowId,
					applicantId,
					source: "stage2_documents_already_complete",
				},
			})
		: step.waitForEvent("wait-fica-docs", {
				event: "upload/fica.received",
				timeout: WORKFLOW_TIMEOUTS.STAGE,
				match: "data.workflowId",
			});

	const ficaDocsReceived = await ficaPromise;

	// Handle FICA Docs
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

	// Update status to processing once the required human intervention is resolved
	await step.run("resume-processing-after-review", () =>
		updateWorkflowStatus(workflowId, "processing", 3)
	);

	// ================================================================
	// PARALLEL: ITC/Sanctions Check + AI Analysis (Validation Agent)
	// Per SOP diagram: these two paths run independently, both must
	// complete ("both green") before the Reporter Agent synthesizes.
	// ================================================================

	const itcStep = step.run("run-main-itc-and-sanctions", async () => {
		await guardKillSwitch(workflowId, "run-main-itc-and-sanctions");

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
				recommendation: itcResult.recommendation,
				passed: itcResult.passed,
				executedAt: new Date().toISOString(),
				stage: 3,
			},
		});

		const sanctions = await runSanctionsForWorkflow(applicantId, workflowId, "itc_main", {
			allowReuse: true,
		});

		await createWorkflowNotification({
			workflowId,
			applicantId,
			type: sanctions.isBlocked ? "warning" : "info",
			title: "ITC & Sanctions Check Complete",
			message: `ITC recommendation: ${itcResult.recommendation}. Sanctions risk: ${sanctions.riskLevel}${sanctions.reused ? " (reused within 7-day window)" : ""}.`,
			actionable: false,
		});

		return { itcResult, sanctions };
	});

	const aiStep = step.run("run-ai-analysis", async () => {
		await guardKillSwitch(workflowId, "run-ai-analysis");

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

		const bankStatementDoc = aiDocuments.find(doc =>
			/bank[_\s-]?statement/i.test(doc.type)
		);

		const result = await performAggregatedAnalysis({
			workflowId,
			applicantId,
			applicantData: {
				companyName: applicant?.companyName || "Unknown",
				contactName: applicant?.contactName,
				registrationNumber: applicant?.registrationNumber || undefined,
				industry: applicant?.industry || undefined,
				countryCode: "ZA",
			},
			documents: aiDocuments.length > 0 ? aiDocuments : undefined,
			bankStatementBase64: bankStatementDoc?.content,
			requestedAmount: mandateInfo.mandateVolume,
			facilityApplicationData: (
				facilitySubmission.data.formData as {
					facilityApplicationData?: Record<string, unknown>;
				}
			).facilityApplicationData,
			ficaComparisonContext: (
				facilitySubmission.data.formData as {
					ficaComparisonContext?: Record<string, unknown>;
				}
			).ficaComparisonContext,
		});

		return result;
	});

	// "Both green" — wait for ITC and AI analysis to complete in parallel
	const [itcAndSanctions, aiAnalysisResult] = await Promise.all([itcStep, aiStep]);

	// Reporter Agent: synthesize ITC + AI results into consolidated report
	const aiAnalysis = await step.run(
		"reporter-agent-synthesis",
		async (): Promise<AggregatedAnalysisResult> => {
			const combinedFlags = [
				...aiAnalysisResult.overall.flags,
				...(itcAndSanctions.sanctions.isBlocked ? ["ITC_SANCTIONS_BLOCKED"] : []),
				...(!itcAndSanctions.itcResult.passed ? ["ITC_CHECK_FAILED"] : []),
			];

			await inngest.send({
				name: "agent/analysis.aggregated",
				data: {
					workflowId,
					applicantId,
					aggregatedScore: aiAnalysisResult.scores.aggregatedScore,
					canAutoApprove: aiAnalysisResult.overall.canAutoApprove,
					requiresManualReview: aiAnalysisResult.overall.requiresManualReview,
					isBlocked:
						aiAnalysisResult.overall.isBlocked || itcAndSanctions.sanctions.isBlocked,
					recommendation: aiAnalysisResult.overall.recommendation,
					flags: combinedFlags,
				},
			});

			await inngest.send({
				name: "reporter/analysis.completed",
				data: {
					workflowId,
					applicantId,
					report: {
						validationSummary: aiAnalysisResult.agents.validation || {},
						riskSummary: aiAnalysisResult.agents.risk || {},
						sanctionsSummary: aiAnalysisResult.agents.sanctions || {},
						itcSummary: {
							creditScore: itcAndSanctions.itcResult.creditScore,
							recommendation: itcAndSanctions.itcResult.recommendation,
							passed: itcAndSanctions.itcResult.passed,
							sanctionsRiskLevel: itcAndSanctions.sanctions.riskLevel,
							sanctionsBlocked: itcAndSanctions.sanctions.isBlocked,
						},
						overallRecommendation:
							aiAnalysisResult.overall.recommendation === "AUTO_APPROVE"
								? "APPROVE"
								: aiAnalysisResult.overall.recommendation === "BLOCK"
									? "DECLINE"
									: aiAnalysisResult.overall.recommendation === "MANUAL_REVIEW"
										? "MANUAL_REVIEW"
										: "CONDITIONAL_APPROVE",
						aggregatedScore: aiAnalysisResult.scores.aggregatedScore,
						flags: combinedFlags,
					},
					completedAt: new Date().toISOString(),
				},
			});

			return {
				...aiAnalysisResult,
				overall: {
					...aiAnalysisResult.overall,
					isBlocked:
						aiAnalysisResult.overall.isBlocked || itcAndSanctions.sanctions.isBlocked,
					flags: combinedFlags,
				},
			} as AggregatedAnalysisResult;
		}
	);

	context.aiAnalysisComplete = true;

	// Check if blocked by sanctions (SOP v3.1.0) — from either AI agents or ITC path
	if (aiAnalysis.overall.isBlocked || itcAndSanctions.sanctions.isBlocked) {
		// Detect if it is specifically a sanctions hit
		const sanctionsResult = aiAnalysis.sanctions;
		const isSanctionHit =
			sanctionsResult?.overall.riskLevel === "BLOCKED" ||
			sanctionsResult?.unSanctions.matchFound === true;

		if (isSanctionHit) {
			// SANCTION PAUSE PROTOCOL
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

			// Wait for Clearance or Confirmation
			const clearanceEvent = await step.waitForEvent("wait-sanction-clearance", {
				event: "sanction/cleared",
				timeout: "30d", // Long timeout for compliance
				match: "data.workflowId",
			});

			// We also need to listen for "sanction/confirmed" but inngest waitForEvent is single event.
			// For now, we assume if "sanction/cleared" isn't fired, it might be terminated via other means (kill switch)
			// OR we can use race() if Inngest supports it (in current SDK it might not easily).
			// workaround: The "Confirm Hit" action in UI should probably trigger "workflow/terminated" event directly (Kill Switch) OR fire "sanction/confirmed".
			// IF we receive "sanction/cleared", we resume.
			// IF we don't, we time out or get killed.

			if (!clearanceEvent) {
				// Timeout or Killed
				return {
					status: "terminated",
					stage: 3,
					reason: "Sanction clearance timed out",
				};
			}

			// If Cleared
			await step.run("resume-from-sanction-pause", async () => {
				await updateWorkflowStatus(workflowId, "processing", 3);
				const db = getDatabaseClient();
				if (db) {
					await db
						.update(applicants)
						.set({ sanctionStatus: "clear" })
						.where(eq(applicants.id, applicantId));
				}

				await logWorkflowEvent({
					workflowId,
					eventType: "sanction_cleared",
					payload: {
						officerId: clearanceEvent.data.officerId,
						reason: clearanceEvent.data.reason,
						clearedAt: clearanceEvent.data.clearedAt,
					},
				});
			});

			// Continue normally...
		} else {
			// Other blocking reasons (Fraud, etc)
			await executeKillSwitch({
				workflowId,
				applicantId,
				reason: "COMPLIANCE_VIOLATION",
				decidedBy: "ai_sanctions_agent",
				notes: `Blocked by AI checks: ${aiAnalysis.overall.reasoning}`,
			});
			return {
				status: "terminated",
				stage: 3,
				reason: "Blocked by sanctions screening",
			};
		}
	}

	// ================================================================
	return {
		status: "completed",
		stage: 3,
		data: { aiAnalysis },
	};
}
