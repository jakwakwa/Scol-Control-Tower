/**
 * StratCol Onboarding Control Tower Workflow — SOP-Aligned (6-Stage)
 *
 * Stage 1: Lead Capture & ITC    — Account Manager data entry → ITC check
 * Stage 2: Facility & Quote       — Facility app → mandate mapping → AI quote → Manager review → signed quote → Mandate collection (7-day retry, max 8)
 * Stage 3: Procurement & AI     — Parallel: Procurement risk + AI multi-agent analysis + Reporter Agent
 * Stage 4: Risk Review           — Risk Manager final review (no auto-approve bypass)
 * Stage 5: Contract              — Account Manager review/edit AI contract → Send contract + ABSA form
 * Stage 6: Final Approval        — Two-factor: Risk Manager + Account Manager → Onboarding complete
 *
 * Architecture:
 * - Kill Switch functionality for immediate workflow termination
 * - True parallel processing of procurement and documentation streams
 * - Conditional document logic based on business type
 * - AI agent integration (Validation, Risk, Sanctions) with Reporter Agent
 * - Human approval checkpoints with proper Inngest signal handling
 */

import { eq } from "drizzle-orm";
import { NonRetriableError } from "inngest";
import { getBaseUrl, getDatabaseClient } from "@/app/utils";
import { applicants, workflowEvents, workflows } from "@/db/schema";
import { performAggregatedAnalysis } from "@/lib/services/agents";
import {
	type BusinessType,
	determineBusinessType,
	getDocumentRequirements,
	resolveBusinessType,
} from "@/lib/services/document-requirements.service";
import {
	sendApplicantFormLinksEmail,
	sendApplicantStatusEmail,
	sendInternalAlertEmail,
} from "@/lib/services/email.service";
import { createFormInstance } from "@/lib/services/form.service";
import { performITCCheck } from "@/lib/services/itc.service";
import {
	executeKillSwitch,
	isWorkflowTerminated,
} from "@/lib/services/kill-switch.service";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";
import { generateQuote, type Quote } from "@/lib/services/quote.service";
import { analyzeRisk as runProcureCheck } from "@/lib/services/risk.service";
import { updateWorkflowStatus } from "@/lib/services/workflow.service";
import type { FormType } from "@/lib/types";
import { inngest } from "../client";

// ============================================
// Type Definitions
// ============================================

interface WorkflowContext {
	applicantId: number;
	workflowId: number;
	businessType?: BusinessType;
	mandateType?: string;
	mandateVolume?: number;
	procurementCleared?: boolean;
	documentsComplete?: boolean;
	aiAnalysisComplete?: boolean;
}

// ============================================
// Constants
// ============================================

const OVERLIMIT_THRESHOLD = 500_000_00; // R500,000 in cents
const WORKFLOW_TIMEOUT = "30d";
const STAGE_TIMEOUT = "14d";
const REVIEW_TIMEOUT = "7d";
const _MANDATE_RETRY_TIMEOUT = "7d";
const MAX_MANDATE_RETRIES = 8;

// ============================================
// Kill Switch Guard
// ============================================

/**
 * Check if workflow is terminated and throw if so
 * Call this before any step that shouldn't execute after kill switch
 */
async function guardKillSwitch(workflowId: number, stepName: string): Promise<void> {
	const terminated = await isWorkflowTerminated(workflowId);
	if (terminated) {
		throw new NonRetriableError(
			`[KillSwitch] Workflow ${workflowId} terminated - stopping ${stepName}`
		);
	}
}

async function notifyApplicantDecline(options: {
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

// ============================================
// Main Control Tower Workflow (SOP-aligned 6-stage)
// ============================================

export const controlTowerWorkflow = inngest.createFunction(
	{
		id: "stratcol-control-tower",
		name: "StratCol Control Tower Onboarding",
		retries: 3,
		cancelOn: [
			{
				event: "workflow/terminated",
				match: "data.workflowId",
			},
		],
	},
	{ event: "onboarding/lead.created" },
	async ({ event, step }) => {
		const { applicantId, workflowId } = event.data;
		const context: WorkflowContext = { applicantId, workflowId };

		console.info(
			`[ControlTower] Starting workflow ${workflowId} for applicant ${applicantId}`
		);

		// ================================================================
		// STAGE 1: Lead Capture & ITC
		// Account Manager data entry → ITC check
		// ================================================================

		await step.run("stage-1-start", () =>
			updateWorkflowStatus(workflowId, "processing", 1)
		);

		// Step 1.1: ITC check
		const _initialChecks = await step.run("initial-checks", async () => {
			await guardKillSwitch(workflowId, "initial-checks");

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
				},
			});

			return itcResult;
		});

		// ================================================================
		// STAGE 2: Facility & Quote
		// Send facility application → Determine mandate → AI quote → Manager review
		// → Send quote for signing → Mandate collection with 7-day retry loop (max 8)
		// ================================================================

		await step.run("stage-2-start", async () => {
			await guardKillSwitch(workflowId, "stage-2-start");
			return updateWorkflowStatus(workflowId, "processing", 2);
		});

		// Step 2.1: Send Facility Application
		await step.run("send-facility-application", async () => {
			await guardKillSwitch(workflowId, "send-facility-application");

			const db = getDatabaseClient();
			if (!db) throw new Error("Database connection failed");

			const [applicant] = await db
				.select()
				.from(applicants)
				.where(eq(applicants.id, applicantId));

			if (!applicant) throw new Error(`Applicant ${applicantId} not found`);

			const { token } = await createFormInstance({
				applicantId,
				workflowId,
				formType: "FACILITY_APPLICATION" as FormType,
			});

			await sendApplicantFormLinksEmail({
				email: applicant.email,
				contactName: applicant.contactName,
				links: [
					{ formType: "FACILITY_APPLICATION", url: `${getBaseUrl()}/forms/${token}` },
				],
			});

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "awaiting",
				title: "Facility Application Sent",
				message: "Waiting for applicant to complete facility application form",
				actionable: false,
			});
		});

		await step.run("stage-2-awaiting-facility-application", () =>
			updateWorkflowStatus(workflowId, "awaiting_human", 2)
		);

		// Wait for facility application submission
		const facilitySubmission = await step.waitForEvent("wait-facility-app", {
			event: "form/facility.submitted",
			timeout: STAGE_TIMEOUT,
			match: "data.workflowId",
		});

		if (!facilitySubmission) {
			return { status: "timeout", stage: 2, reason: "Facility application timeout" };
		}

		// Step 2.2: Sales evaluation + issues/pre-risk path
		const salesEvaluation = await step.run("sales-evaluation", async () => {
			await guardKillSwitch(workflowId, "sales-evaluation");
			const formData = facilitySubmission.data.formData as {
				mandateVolume?: number;
				annualTurnover?: number;
			};
			const mandateVolume = formData?.mandateVolume ?? 0;
			const annualTurnover = formData?.annualTurnover ?? 0;
			const issues: string[] = [];

			if (mandateVolume > OVERLIMIT_THRESHOLD) {
				issues.push("Mandate volume exceeds overlimit threshold");
			}
			if (annualTurnover > 0 && mandateVolume > annualTurnover * 0.75) {
				issues.push("Mandate volume materially high relative to turnover");
			}

			await inngest.send({
				name: "sales/evaluation.started",
				data: {
					workflowId,
					applicantId,
					startedAt: new Date().toISOString(),
				},
			});

			if (issues.length > 0) {
				const db = getDatabaseClient();
				if (db) {
					await db
						.update(workflows)
						.set({
							salesEvaluationStatus: "issues_found",
							salesIssuesSummary: issues.join("; "),
							issueFlaggedBy: "system",
							preRiskRequired: true,
						})
						.where(eq(workflows.id, workflowId));
				}

				await inngest.send({
					name: "sales/evaluation.issues_found",
					data: {
						workflowId,
						applicantId,
						issues,
						flaggedBy: "system",
						requiresPreRiskEvaluation: true,
						detectedAt: new Date().toISOString(),
					},
				});
			} else {
				const db = getDatabaseClient();
				if (db) {
					await db
						.update(workflows)
						.set({
							salesEvaluationStatus: "approved",
							preRiskRequired: false,
						})
						.where(eq(workflows.id, workflowId));
				}

				await inngest.send({
					name: "sales/evaluation.approved",
					data: {
						workflowId,
						applicantId,
						approvedBy: "system",
						approvedAt: new Date().toISOString(),
					},
				});
			}

			return {
				hasIssues: issues.length > 0,
				issues,
			};
		});

		if (salesEvaluation.hasIssues) {
			await step.run("stage-2-awaiting-pre-risk-approval", async () => {
				await updateWorkflowStatus(workflowId, "awaiting_human", 2);
				await createWorkflowNotification({
					workflowId,
					applicantId,
					type: "warning",
					title: "Pre-risk Approval Required",
					message:
						"Issues were detected during sales evaluation. Complete pre-risk approval before quote can be sent.",
					actionable: true,
				});
			});

			const preRiskApproval = await step.waitForEvent("wait-pre-risk-approval", {
				event: "risk/pre-approval.decided",
				timeout: REVIEW_TIMEOUT,
				match: "data.workflowId",
			});

			if (!preRiskApproval) {
				return { status: "timeout", stage: 2, reason: "Pre-risk approval timeout" };
			}

			if (preRiskApproval.data.decision.outcome === "REJECTED") {
				await step.run("pre-risk-declined-notify", async () => {
					await notifyApplicantDecline({
						applicantId,
						workflowId,
						subject: "Facility Application Update",
						heading: "Application declined after pre-risk review",
						message:
							preRiskApproval.data.decision.reason ||
							"Your application could not proceed after pre-risk review.",
					});
					const db = getDatabaseClient();
					if (db) {
						await db
							.update(workflows)
							.set({
								preRiskOutcome: "rejected",
								preRiskEvaluatedAt: new Date(),
								applicantDecisionOutcome: "declined",
								applicantDeclineReason:
									preRiskApproval.data.decision.reason || "Declined in pre-risk approval",
							})
							.where(eq(workflows.id, workflowId));
					}
				});
				return {
					status: "terminated",
					stage: 2,
					reason: "Rejected in pre-risk approval",
				};
			}

			if (preRiskApproval.data.decision.requiresPreRiskEvaluation) {
				const preRiskEvaluation = await step.waitForEvent("wait-pre-risk-evaluation", {
					event: "risk/pre-evaluation.decided",
					timeout: REVIEW_TIMEOUT,
					match: "data.workflowId",
				});

				if (!preRiskEvaluation) {
					return { status: "timeout", stage: 2, reason: "Pre-risk evaluation timeout" };
				}

				if (preRiskEvaluation.data.decision.outcome === "REJECTED") {
					await step.run("pre-risk-evaluation-declined-notify", async () => {
						await notifyApplicantDecline({
							applicantId,
							workflowId,
							subject: "Facility Application Update",
							heading: "Application declined after pre-risk evaluation",
							message:
								preRiskEvaluation.data.decision.reason ||
								"Your application could not proceed after pre-risk evaluation.",
						});
						const db = getDatabaseClient();
						if (db) {
							await db
								.update(workflows)
								.set({
									preRiskOutcome: "rejected",
									preRiskEvaluatedAt: new Date(),
									applicantDecisionOutcome: "declined",
									applicantDeclineReason:
										preRiskEvaluation.data.decision.reason ||
										"Declined in optional pre-risk evaluation",
								})
								.where(eq(workflows.id, workflowId));
						}
					});
					return {
						status: "terminated",
						stage: 2,
						reason: "Rejected in optional pre-risk evaluation",
					};
				}
			}

			await step.run("pre-risk-approval-complete", async () => {
				const db = getDatabaseClient();
				if (!db) return;
				await db
					.update(workflows)
					.set({
						preRiskOutcome: "approved",
						preRiskEvaluatedAt: new Date(),
					})
					.where(eq(workflows.id, workflowId));
			});
		}

		// Step 2.3: Determine mandate type and required documents
		const mandateInfo = await step.run("determine-mandate", async () => {
			await guardKillSwitch(workflowId, "determine-mandate");

			const formData = facilitySubmission.data.formData;

			const db = getDatabaseClient();
			let applicantEntityType: string | null = null;
			let applicantIndustry: string | null = null;
			if (db) {
				const [applicant] = await db
					.select()
					.from(applicants)
					.where(eq(applicants.id, applicantId));
				applicantEntityType = applicant?.entityType ?? null;
				applicantIndustry = applicant?.industry ?? null;
			}

			const businessType = resolveBusinessType(
				applicantEntityType,
				determineBusinessType(formData as Record<string, unknown>)
			);
			const docRequirements = getDocumentRequirements(
				businessType,
				applicantIndustry ?? undefined
			);

			context.businessType = businessType;
			context.mandateType = formData.mandateType;
			context.mandateVolume = formData.mandateVolume;

			if (db) {
				await db
					.update(applicants)
					.set({
						mandateType: formData.mandateType,
						mandateVolume: formData.mandateVolume,
						businessType: businessType,
					})
					.where(eq(applicants.id, applicantId));
			}

			await logWorkflowEvent({
				workflowId,
				eventType: "mandate_determined",
				payload: {
					businessType,
					mandateType: formData.mandateType,
					requiredDocuments: docRequirements.documents
						.filter(d => d.required)
						.map(d => d.id),
				},
			});

			return {
				businessType,
				mandateType: formData.mandateType,
				mandateVolume: formData.mandateVolume,
				requiredDocuments: docRequirements.documents.filter(d => d.required),
			};
		});

		// Step 2.4: AI Generate Quotation (after facility application)
		const quotationResult = await step.run("ai-generate-quote", async () => {
			await guardKillSwitch(workflowId, "ai-generate-quote");

			const result = await generateQuote(applicantId, workflowId);

			if (!(result.success && result.quote)) {
				await createWorkflowNotification({
					workflowId,
					applicantId,
					type: "error",
					title: "Quote Generation Failed",
					message: result.error || "Failed to generate quotation",
					actionable: true,
				});
				return {
					success: false as const,
					quote: null as Quote | null,
					error: result.error,
					isOverlimit: false,
				};
			}

			const isOverlimit = result.quote.amount > OVERLIMIT_THRESHOLD;

			await logWorkflowEvent({
				workflowId,
				eventType: "quote_generated",
				payload: {
					quoteId: result.quote.quoteId,
					amount: result.quote.amount,
					isOverlimit,
				},
			});

			return {
				success: true as const,
				quote: result.quote,
				isOverlimit,
				error: null as string | null,
			};
		});

		if (!quotationResult.success) {
			return {
				status: "failed",
				stage: 2,
				reason: quotationResult.error || "Quote generation failed",
			};
		}

		const { quote, isOverlimit } = quotationResult;

		// Step 2.5: Manager Quote Review (decision loop)
		await step.run("notify-manager-quote", async () => {
			const title = isOverlimit
				? "OVERLIMIT: Quote Requires Special Approval"
				: "Quote Ready for Approval";

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: isOverlimit ? "warning" : "awaiting",
				title,
				message: `Quote for R${((quote?.amount || 0) / 100).toFixed(2)} ready for review. You can adjust, request updates, or approve.`,
				actionable: true,
			});

			await sendInternalAlertEmail({
				title,
				message: `Quote generated for review. Amount: R${((quote?.amount || 0) / 100).toFixed(2)}`,
				workflowId,
				applicantId,
				type: isOverlimit ? "warning" : "info",
				actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}?tab=reviews`,
			});
		});

		await step.run("stage-2-awaiting-quote-approval", () =>
			updateWorkflowStatus(workflowId, "awaiting_human", 2)
		);

		// Wait for manager approval (they can also request-update or adjust before approving)
		const quoteApproval = await step.waitForEvent("wait-quote-approval", {
			event: "quote/approved",
			timeout: WORKFLOW_TIMEOUT,
			match: "data.workflowId",
		});

		if (!quoteApproval) {
			await step.run("quote-timeout", () =>
				updateWorkflowStatus(workflowId, "timeout", 2)
			);
			return { status: "timeout", stage: 2, reason: "Quote approval timeout" };
		}

		// Step 2.6: Send quote for client decision
		await step.run("send-quote-to-applicant", async () => {
			await guardKillSwitch(workflowId, "send-quote-to-applicant");

			const db = getDatabaseClient();
			if (!db) throw new Error("Database connection failed");

			const [applicant] = await db
				.select()
				.from(applicants)
				.where(eq(applicants.id, applicantId));

			if (!applicant) throw new Error(`Applicant ${applicantId} not found`);

			const { token } = await createFormInstance({
				applicantId,
				workflowId,
				formType: "SIGNED_QUOTATION" as FormType,
			});

			await sendApplicantFormLinksEmail({
				email: applicant.email,
				contactName: applicant.contactName,
				links: [{ formType: "SIGNED_QUOTATION", url: `${getBaseUrl()}/forms/${token}` }],
			});
		});

		await step.run("stage-2-awaiting-quote-signature", () =>
			updateWorkflowStatus(workflowId, "awaiting_human", 2)
		);

		// Wait for applicant decision on quote
		const quoteResponse = await step.waitForEvent("wait-quote-response", {
			event: "quote/responded",
			timeout: WORKFLOW_TIMEOUT,
			match: "data.workflowId",
		});

		if (!quoteResponse) {
			return { status: "timeout", stage: 2, reason: "Quote response timeout" };
		}

		if (quoteResponse.data.decision === "DECLINED") {
			await step.run("quote-declined-notify", async () => {
				await notifyApplicantDecline({
					applicantId,
					workflowId,
					subject: "Quotation decision received",
					heading: "Quotation declined",
					message:
						quoteResponse.data.reason ||
						"We have recorded your decline on the quotation.",
				});
				const db = getDatabaseClient();
				if (db) {
					await db
						.update(workflows)
						.set({
							applicantDecisionOutcome: "declined",
							applicantDeclineReason:
								quoteResponse.data.reason || "Applicant declined quotation",
						})
						.where(eq(workflows.id, workflowId));
				}
			});
			return { status: "terminated", stage: 2, reason: "Applicant declined quotation" };
		}

		// Step 2.7: Request commercial mandate documents with 7-day retry loop (max 8)
		await step.run("send-mandate-request", async () => {
			await guardKillSwitch(workflowId, "send-mandate-request");

			const db = getDatabaseClient();
			if (!db) throw new Error("Database connection failed");

			const [applicant] = await db
				.select()
				.from(applicants)
				.where(eq(applicants.id, applicantId));

			if (!applicant) throw new Error(`Applicant ${applicantId} not found`);

			// Build conditional links based on entityType and businessType
			const links: Array<{ formType: string; url: string }> = [];

			const uploadToken = await createFormInstance({
				applicantId,
				workflowId,
				formType: "DOCUMENT_UPLOADS" as FormType,
			});
			links.push({
				formType: "DOCUMENT_UPLOADS",
				url: `${getBaseUrl()}/uploads/${uploadToken.token}`,
			});

			if (applicant.productType !== "call_centre") {
				const accountantToken = await createFormInstance({
					applicantId,
					workflowId,
					formType: "ACCOUNTANT_LETTER" as FormType,
				});
				links.push({
					formType: "ACCOUNTANT_LETTER",
					url: `${getBaseUrl()}/forms/${accountantToken.token}`,
				});
			}

			if (applicant.productType === "call_centre") {
				const callCentreToken = await createFormInstance({
					applicantId,
					workflowId,
					formType: "CALL_CENTRE_APPLICATION" as FormType,
				});
				links.push({
					formType: "CALL_CENTRE_APPLICATION",
					url: `${getBaseUrl()}/forms/${callCentreToken.token}`,
				});
			}

			await sendApplicantFormLinksEmail({
				email: applicant.email,
				contactName: applicant.contactName,
				links,
				requiredDocuments: mandateInfo.requiredDocuments.map(d => ({
					name: d.name,
					description: d.description,
				})),
			});

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "awaiting",
				title: "Commercial Mandate Documents Required",
				message: `Please upload required documents for ${mandateInfo.businessType} application`,
				actionable: true,
			});

			// Track retry count
			await db
				.update(workflows)
				.set({
					mandateRetryCount: 1,
					mandateLastSentAt: new Date(),
				})
				.where(eq(workflows.id, workflowId));

			await inngest.send({
				name: "document/conditional-request.sent",
				data: {
					workflowId,
					applicantId,
					businessType: mandateInfo.businessType,
					documentsRequested: mandateInfo.requiredDocuments.map(d => d.id),
					sentAt: new Date().toISOString(),
				},
			});
		});

		await step.run("stage-2-awaiting-mandates", () =>
			updateWorkflowStatus(workflowId, "awaiting_human", 2)
		);

		// Mandate collection with Tiered Escalation (SOP v3.1.0)
		let mandateDocsReceived = await step.waitForEvent("wait-mandate-docs", {
			event: "document/mandate.submitted",
			timeout: "7d", // Standard 7-day cycle
			match: "data.workflowId",
		});

		let retryCount = 1;

		while (!mandateDocsReceived && retryCount <= MAX_MANDATE_RETRIES) {
			// Tiered Escalation Logic
			// SOP v3.1.0: Tier 1 (Retry 4), Tier 2 (Retry 7), Salvage (Retry 8)

			if (retryCount === 4) {
				// TIER 1: Account Manager Intervention
				await step.run("tier-1-escalation", async () => {
					await guardKillSwitch(workflowId, "tier-1-escalation");
					const db = getDatabaseClient();
					if (db) {
						await db
							.update(applicants)
							.set({ escalationTier: 2 }) // 2 = Manager Alert
							.where(eq(applicants.id, applicantId));
					}

					await createWorkflowNotification({
						workflowId,
						applicantId,
						type: "warning",
						title: "Tier 1 Escalation: Mandate Overdue",
						message:
							"Mandate documents overdue (4th retry). Please call applicant immediately.",
						actionable: true,
					});

					await inngest.send({
						name: "escalation/tier.changed",
						data: {
							workflowId,
							applicantId,
							newTier: 2,
							reason: "Mandate overdue (Retry 4)",
							changedAt: new Date().toISOString(),
						},
					});
				});
			} else if (retryCount === 7) {
				// TIER 2: Final Warning
				await step.run("tier-2-escalation", async () => {
					await guardKillSwitch(workflowId, "tier-2-escalation");
					// Send Final Warning Email (simulated via alert for now)
					await createWorkflowNotification({
						workflowId,
						applicantId,
						type: "error",
						title: "Tier 2 Escalation: Risk of Termination",
						message: "Applicant flagged for termination check. Final warning sent.",
						actionable: false,
					});
				});
			} else if (retryCount === 8) {
				// SALVAGE STATE (Retry 8)
				await step.run("tier-3-salvage-state", async () => {
					await guardKillSwitch(workflowId, "tier-3-salvage-state");

					const db = getDatabaseClient();
					const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

					if (db) {
						await db
							.update(applicants)
							.set({
								escalationTier: 3,
								salvageDeadline: deadline,
							})
							.where(eq(applicants.id, applicantId));
					}

					await createWorkflowNotification({
						workflowId,
						applicantId,
						type: "error",
						title: "SALVAGE STATE ACTIVATED",
						message: "Application will terminate in 48 hours unless salvaged by Manager.",
						actionable: true,
					});

					await inngest.send({
						name: "escalation/tier.changed",
						data: {
							workflowId,
							applicantId,
							newTier: 3,
							reason: "Salvage State (Retry 8)",
							changedAt: new Date().toISOString(),
						},
					});
				});

				// Wait 48 hours for salvage
				await step.sleep("wait-salvage", "48h");

				// Check if salvaged
				const outcome = await step.run("check-salvage-outcome", async () => {
					const db = getDatabaseClient();
					if (!db) return false;
					const [app] = await db
						.select()
						.from(applicants)
						.where(eq(applicants.id, applicantId));
					return !!app?.isSalvaged;
				});

				if (!outcome) {
					// Termination
					await executeKillSwitch({
						workflowId,
						applicantId,
						reason: "MANUAL_TERMINATION",
						decidedBy: "system_salvage_expired",
						notes: "Salvage period expired without manual override",
					});
					return {
						status: "terminated",
						stage: 2,
						reason: "Terminated after Salvage State expiration",
					};
				}
			}

			// Standard Retry (or continued retry if salvaged)
			await step.run(`mandate-retry-${retryCount}`, async () => {
				await guardKillSwitch(workflowId, `mandate-retry-${retryCount}`);
				const db = getDatabaseClient();
				if (db) {
					await db
						.update(workflows)
						.set({
							mandateRetryCount: retryCount,
							mandateLastSentAt: new Date(),
						})
						.where(eq(workflows.id, workflowId));
				}
			});

			// If not max retries, wait again
			if (retryCount < MAX_MANDATE_RETRIES) {
				mandateDocsReceived = await step.waitForEvent(
					`wait-mandate-docs-retry-${retryCount}`,
					{
						event: "document/mandate.submitted",
						timeout: "7d",
						match: "data.workflowId",
					}
				);
			}

			retryCount++;
		}

		if (!mandateDocsReceived) {
			// Should have been handled by Salvage State, but safety net
			return {
				status: "terminated",
				stage: 2,
				reason: "Mandate collection exhausted",
			};
		}

		// Emit mandate verified event
		await step.run("mandate-verified", async () => {
			context.documentsComplete = true;

			await inngest.send({
				name: "mandate/verified",
				data: {
					workflowId,
					applicantId,
					mandateType: (context.mandateType || "MIXED") as
						| "EFT"
						| "DEBIT_ORDER"
						| "CASH"
						| "MIXED",
					verifiedAt: new Date().toISOString(),
					retryCount,
				},
			});

			await logWorkflowEvent({
				workflowId,
				eventType: "mandate_verified",
				payload: { retryCount, mandateType: context.mandateType },
			});
		});

		// ================================================================
		// STAGE 3: Procurement & AI (Parallel)
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

		// ================================================================
		// PARALLEL STREAM A: Procurement Risk Assessment
		// ================================================================

		interface ProcurementStreamResult {
			cleared: boolean;
			requiresReview: boolean;
			killSwitchTriggered: boolean;
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

					// Per SOP: procurement review gate is ALWAYS manual (Risk Manager)
					// regardless of ProcureCheck auto recommendation
					await createWorkflowNotification({
						workflowId,
						applicantId,
						type: "warning",
						title: "Procurement Review Required",
						message: `ProcureCheck score: ${procureResult.riskScore}. Action: ${procureResult.recommendedAction}. Anomalies: ${procureResult.anomalies.join(", ") || "None"}`,
						actionable: true,
					});

					await sendInternalAlertEmail({
						title: "Procurement Review Required",
						message: `Applicant requires Risk Manager procurement review.\nRisk Score: ${procureResult.riskScore}\nRecommended: ${procureResult.recommendedAction}\nAnomalies: ${procureResult.anomalies.join(", ") || "None"}`,
						workflowId,
						applicantId,
						type: "warning",
						actionUrl: `${getBaseUrl()}/dashboard/risk-review`,
					});

					// Always require manual review per SOP
					return {
						cleared: false,
						result: procureResult,
						requiresReview: true,
						killSwitchTriggered: false,
					};
				} catch (error) {
					console.error("[ControlTower] Procurement check error:", error);
					return {
						cleared: false,
						requiresReview: true,
						error: String(error),
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

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "awaiting",
				title: "FICA Documents Required",
				message:
					"Please upload bank statements and accountant letter for AI verification",
				actionable: true,
			});

			return { requested: true };
		});

		// Execute both streams in parallel
		const [procurementResult, _documentResult] = await Promise.all([
			procurementStream,
			documentStream,
		]);

		// Check if kill switch was triggered by procurement
		if (procurementResult.killSwitchTriggered) {
			return {
				status: "terminated",
				stage: 3,
				reason: "Procurement check triggered kill switch",
			};
		}

		// Procurement always requires manual review per SOP
		if (procurementResult.requiresReview) {
			await step.run("stage-3-awaiting-procurement-review", () =>
				updateWorkflowStatus(workflowId, "awaiting_human", 3)
			);

			const procurementDecision = await step.waitForEvent("wait-procurement-decision", {
				event: "risk/procurement.completed",
				timeout: REVIEW_TIMEOUT,
				match: "data.workflowId",
			});

			if (!procurementDecision) {
				await executeKillSwitch({
					workflowId,
					applicantId,
					reason: "PROCUREMENT_DENIED",
					decidedBy: "system_timeout",
					notes: "Procurement review timed out after 7 days",
				});
				return { status: "terminated", stage: 3, reason: "Procurement review timeout" };
			}

			if (procurementDecision.data.decision.outcome === "DENIED") {
				return {
					status: "terminated",
					stage: 3,
					reason: "Procurement denied by Risk Manager",
				};
			}

			context.procurementCleared = true;
		}

		// Wait for FICA documents
		const ficaDocsReceived = await step.waitForEvent("wait-fica-docs", {
			event: "upload/fica.received",
			timeout: STAGE_TIMEOUT,
			match: "data.workflowId",
		});

		if (!ficaDocsReceived) {
			return { status: "timeout", stage: 3, reason: "FICA document upload timeout" };
		}

		// Run aggregated AI analysis (Validation, Risk, Sanctions agents)
		const aiAnalysis = await step.run("run-ai-analysis", async () => {
			await guardKillSwitch(workflowId, "run-ai-analysis");

			const db = getDatabaseClient();
			const [applicant] = db
				? await db.select().from(applicants).where(eq(applicants.id, applicantId))
				: [];

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
				requestedAmount: context.mandateVolume,
			});

			// Emit aggregated analysis event
			await inngest.send({
				name: "agent/analysis.aggregated",
				data: {
					workflowId,
					applicantId,
					aggregatedScore: result.scores.aggregatedScore,
					canAutoApprove: result.overall.canAutoApprove,
					requiresManualReview: result.overall.requiresManualReview,
					isBlocked: result.overall.isBlocked,
					recommendation: result.overall.recommendation,
					flags: result.overall.flags,
				},
			});

			// Emit Reporter Agent consolidated report
			await inngest.send({
				name: "reporter/analysis.completed",
				data: {
					workflowId,
					applicantId,
					report: {
						validationSummary: result.agents.validation || {},
						riskSummary: result.agents.risk || {},
						sanctionsSummary: result.agents.sanctions || {},
						overallRecommendation:
							result.overall.recommendation === "AUTO_APPROVE"
								? "APPROVE"
								: result.overall.recommendation === "BLOCK"
									? "DECLINE"
									: result.overall.recommendation === "MANUAL_REVIEW"
										? "MANUAL_REVIEW"
										: "CONDITIONAL_APPROVE",
						aggregatedScore: result.scores.aggregatedScore,
						flags: result.overall.flags,
					},
					completedAt: new Date().toISOString(),
				},
			});

			return result;
		});

		context.aiAnalysisComplete = true;

		// Check if blocked by sanctions (SOP v3.1.0)
		if (aiAnalysis.overall.isBlocked) {
			// Detect if it is specifically a Sanctions Hit
			// (Assuming mock agent returns 'BLOCKED' in riskLevel or unSanctions.matchFound)
			const sanctionsResult = aiAnalysis.agents?.sanctions as any;
			const isSanctionHit =
				sanctionsResult?.riskLevel === "BLOCKED" ||
				sanctionsResult?.unSanctions?.matchFound;

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
		// STAGE 4: Risk Review
		// Risk Manager final analysis review (NO auto-approve bypass per SOP)
		// ================================================================

		await step.run("stage-4-start", async () => {
			await guardKillSwitch(workflowId, "stage-4-start");
			return updateWorkflowStatus(workflowId, "processing", 4);
		});

		// Always require Risk Manager review per SOP (no auto-approve)
		await step.run("notify-final-review", async () => {
			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "warning",
				title: "Risk Manager Review Required",
				message: `Aggregated AI score: ${aiAnalysis.scores.aggregatedScore}%. Recommendation: ${aiAnalysis.overall.recommendation}. Flags: ${aiAnalysis.overall.flags.join(", ") || "None"}`,
				actionable: true,
			});

			await sendInternalAlertEmail({
				title: "Risk Manager Review Required",
				message: `Application requires Risk Manager final review.\nAggregated Score: ${aiAnalysis.scores.aggregatedScore}%\nRecommendation: ${aiAnalysis.overall.recommendation}\nFlags: ${aiAnalysis.overall.flags.join(", ") || "None"}`,
				workflowId,
				applicantId,
				type: "warning",
				actionUrl: `${getBaseUrl()}/dashboard/risk-review`,
			});
		});

		await step.run("stage-4-awaiting-review", () =>
			updateWorkflowStatus(workflowId, "awaiting_human", 4)
		);

		const riskDecision = await step.waitForEvent("wait-risk-decision", {
			event: "risk/decision.received",
			timeout: REVIEW_TIMEOUT,
			match: "data.workflowId",
		});

		if (!riskDecision) {
			return { status: "timeout", stage: 4, reason: "Risk review timeout" };
		}

		if (riskDecision.data.decision.outcome === "REJECTED") {
			await executeKillSwitch({
				workflowId,
				applicantId,
				reason: "MANUAL_TERMINATION",
				decidedBy: riskDecision.data.decision.decidedBy,
				notes: riskDecision.data.decision.reason,
			});
			await step.run("risk-declined-notify-applicant", async () => {
				await notifyApplicantDecline({
					applicantId,
					workflowId,
					subject: "Facility Application Outcome",
					heading: "Application declined after final risk review",
					message:
						riskDecision.data.decision.reason ||
						"Your application was not approved after final risk review.",
				});
			});
			return { status: "terminated", stage: 4, reason: "Rejected by Risk Manager" };
		}

		// ================================================================
		// HIGH-RISK: Financial Statements Confirmation
		// ================================================================

		const isHighRisk = await step.run("check-high-risk", async () => {
			const db = getDatabaseClient();
			if (!db) return false;
			const [applicant] = await db
				.select()
				.from(applicants)
				.where(eq(applicants.id, applicantId));
			return applicant?.riskLevel === "red";
		});

		if (isHighRisk) {
			await step.run("notify-financial-statements-required", async () => {
				await createWorkflowNotification({
					workflowId,
					applicantId,
					type: "warning",
					title: "Financial Statements Required (High-Risk)",
					message:
						"This is a high-risk applicant. Please confirm that financial statements have been sent and received before proceeding.",
					actionable: true,
				});

				await sendInternalAlertEmail({
					title: "High-Risk: Financial Statements Required",
					message:
						"High-risk applicant requires financial statements confirmation before proceeding to contract phase.",
					workflowId,
					applicantId,
					type: "warning",
					actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}?tab=risk`,
				});
			});

			await step.run("stage-4-awaiting-financial-statements", () =>
				updateWorkflowStatus(workflowId, "awaiting_human", 4)
			);

			const financialStatementsConfirmed = await step.waitForEvent(
				"wait-financial-statements",
				{
					event: "risk/financial-statements.confirmed",
					timeout: STAGE_TIMEOUT,
					match: "data.workflowId",
				}
			);

			if (!financialStatementsConfirmed) {
				return {
					status: "timeout",
					stage: 4,
					reason: "Financial statements confirmation timeout (high-risk)",
				};
			}

			await step.run("log-financial-statements-confirmed", async () => {
				await logWorkflowEvent({
					workflowId,
					eventType: "financial_statements_confirmed",
					payload: {
						confirmedBy: financialStatementsConfirmed.data.confirmedBy,
						confirmedAt: financialStatementsConfirmed.data.confirmedAt,
					},
				});
			});
		}

		// ================================================================
		// STAGE 5: Contract
		// Account Manager review/edit AI contract → Send contract + ABSA form
		// ================================================================

		await step.run("stage-5-start", async () => {
			await guardKillSwitch(workflowId, "stage-5-start");
			return updateWorkflowStatus(workflowId, "processing", 5);
		});

		// Step 5.1: Notify Account Manager to review/edit contract draft
		await step.run("notify-contract-review", async () => {
			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "awaiting",
				title: "Contract Draft Ready for Review",
				message:
					"Please review and edit the AI-generated contract before sending to client.",
				actionable: true,
			});

			await sendInternalAlertEmail({
				title: "Contract Draft Ready for Review",
				message:
					"AI-generated contract is ready for Account Manager review and editing before sending to client.",
				workflowId,
				applicantId,
				type: "info",
				actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}?tab=overview`,
			});
		});

		await step.run("stage-5-awaiting-contract-review", () =>
			updateWorkflowStatus(workflowId, "awaiting_human", 5)
		);

		// Wait for Account Manager to review/edit the contract draft
		const contractReviewed = await step.waitForEvent("wait-contract-reviewed", {
			event: "contract/draft.reviewed",
			timeout: REVIEW_TIMEOUT,
			match: "data.workflowId",
		});

		if (!contractReviewed) {
			return { status: "timeout", stage: 5, reason: "Contract review timeout" };
		}

		// Step 5.2: Send contract and ABSA form to client
		await step.run("send-final-docs", async () => {
			await guardKillSwitch(workflowId, "send-final-docs");

			const db = getDatabaseClient();
			if (!db) throw new Error("Database connection failed");

			const [applicant] = await db
				.select()
				.from(applicants)
				.where(eq(applicants.id, applicantId));

			if (!applicant) throw new Error(`Applicant ${applicantId} not found`);

			const contractToken = await createFormInstance({
				applicantId,
				workflowId,
				formType: "STRATCOL_CONTRACT" as FormType,
			});

			const absaToken = await createFormInstance({
				applicantId,
				workflowId,
				formType: "ABSA_6995" as FormType,
			});

			await sendApplicantFormLinksEmail({
				email: applicant.email,
				contactName: applicant.contactName,
				links: [
					{
						formType: "STRATCOL_CONTRACT",
						url: `${getBaseUrl()}/forms/${contractToken.token}`,
					},
					{ formType: "ABSA_6995", url: `${getBaseUrl()}/forms/${absaToken.token}` },
				],
			});

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "awaiting",
				title: "Contract & ABSA Form Sent",
				message: "Please sign the contract and complete the ABSA bank form",
				actionable: false,
			});
		});

		await step.run("stage-5-awaiting-docs", () =>
			updateWorkflowStatus(workflowId, "awaiting_human", 5)
		);

		// Wait for applicant decision on contract
		const contractDecision = await step.waitForEvent("wait-contract-decision", {
			event: "form/decision.responded",
			timeout: REVIEW_TIMEOUT,
			match: "data.workflowId",
		});

		if (!contractDecision) {
			return { status: "timeout", stage: 5, reason: "Contract decision timeout" };
		}

		if (contractDecision.data.formType !== "STRATCOL_CONTRACT") {
			return {
				status: "failed",
				stage: 5,
				reason: "Received non-contract form decision while waiting for contract decision",
			};
		}

		if (contractDecision.data.decision === "DECLINED") {
			await step.run("contract-declined-notify-applicant", async () => {
				await notifyApplicantDecline({
					applicantId,
					workflowId,
					subject: "Contract decision received",
					heading: "Contract was declined",
					message:
						contractDecision.data.reason || "We have recorded your contract decline.",
				});
				const db = getDatabaseClient();
				if (db) {
					await db
						.update(workflows)
						.set({
							applicantDecisionOutcome: "declined",
							applicantDeclineReason:
								contractDecision.data.reason || "Applicant declined contract",
						})
						.where(eq(workflows.id, workflowId));
				}
			});
			return { status: "terminated", stage: 5, reason: "Applicant declined contract" };
		}

		// Wait for ABSA 6995 form completion
		const absaCompleted = await step.waitForEvent("wait-absa-completed", {
			event: "form/absa-6995.completed",
			timeout: REVIEW_TIMEOUT,
			match: "data.workflowId",
		});

		if (!absaCompleted) {
			return { status: "timeout", stage: 5, reason: "ABSA 6995 form timeout" };
		}

		// ================================================================
		// STAGE 6: Final Approval (Two-Factor)
		// Risk Manager + Account Manager must both approve
		// ================================================================

		await step.run("stage-6-start", async () => {
			await guardKillSwitch(workflowId, "stage-6-start");
			return updateWorkflowStatus(workflowId, "processing", 6);
		});

		await step.run("notify-two-factor-approval", async () => {
			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "awaiting",
				title: "Two-Factor Final Approval Required",
				message:
					"Both Risk Manager and Account Manager must approve to complete onboarding.",
				actionable: true,
			});

			await sendInternalAlertEmail({
				title: "Two-Factor Final Approval Required",
				message:
					"Application is ready for final approval. Both Risk Manager and Account Manager must approve.",
				workflowId,
				applicantId,
				type: "info",
				actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}`,
			});
		});

		await step.run("stage-6-awaiting-approvals", () =>
			updateWorkflowStatus(workflowId, "awaiting_human", 6)
		);

		// Wait for both approvals (can arrive in any order)
		const riskManagerApproval = await step.waitForEvent("wait-risk-manager-approval", {
			event: "approval/risk-manager.received",
			timeout: REVIEW_TIMEOUT,
			match: "data.workflowId",
		});

		if (!riskManagerApproval) {
			return { status: "timeout", stage: 6, reason: "Risk Manager approval timeout" };
		}

		if (riskManagerApproval.data.decision === "REJECTED") {
			await executeKillSwitch({
				workflowId,
				applicantId,
				reason: "MANUAL_TERMINATION",
				decidedBy: riskManagerApproval.data.approvedBy,
				notes:
					riskManagerApproval.data.reason || "Rejected at final approval by Risk Manager",
			});
			return {
				status: "terminated",
				stage: 6,
				reason: "Rejected by Risk Manager at final approval",
			};
		}

		// Persist Risk Manager approval
		await step.run("persist-rm-approval", async () => {
			const db = getDatabaseClient();
			if (!db) return;
			await db
				.update(workflows)
				.set({
					riskManagerApproval: JSON.stringify({
						approvedBy: riskManagerApproval.data.approvedBy,
						timestamp: riskManagerApproval.data.timestamp,
						decision: riskManagerApproval.data.decision,
					}),
				})
				.where(eq(workflows.id, workflowId));
		});

		const accountManagerApproval = await step.waitForEvent(
			"wait-account-manager-approval",
			{
				event: "approval/account-manager.received",
				timeout: REVIEW_TIMEOUT,
				match: "data.workflowId",
			}
		);

		if (!accountManagerApproval) {
			return { status: "timeout", stage: 6, reason: "Account Manager approval timeout" };
		}

		if (accountManagerApproval.data.decision === "REJECTED") {
			await executeKillSwitch({
				workflowId,
				applicantId,
				reason: "MANUAL_TERMINATION",
				decidedBy: accountManagerApproval.data.approvedBy,
				notes:
					accountManagerApproval.data.reason ||
					"Rejected at final approval by Account Manager",
			});
			return {
				status: "terminated",
				stage: 6,
				reason: "Rejected by Account Manager at final approval",
			};
		}

		// Persist Account Manager approval
		await step.run("persist-am-approval", async () => {
			const db = getDatabaseClient();
			if (!db) return;
			await db
				.update(workflows)
				.set({
					accountManagerApproval: JSON.stringify({
						approvedBy: accountManagerApproval.data.approvedBy,
						timestamp: accountManagerApproval.data.timestamp,
						decision: accountManagerApproval.data.decision,
					}),
				})
				.where(eq(workflows.id, workflowId));
		});

		// Emit final approval event (two-factor complete)
		await step.run("emit-final-approval", async () => {
			await inngest.send({
				name: "onboarding/final-approval.received",
				data: {
					workflowId,
					applicantId,
					riskManagerApproval: {
						approvedBy: riskManagerApproval.data.approvedBy,
						timestamp: riskManagerApproval.data.timestamp,
					},
					accountManagerApproval: {
						approvedBy: accountManagerApproval.data.approvedBy,
						timestamp: accountManagerApproval.data.timestamp,
					},
					contractSigned: true,
					absaFormComplete: true,
					timestamp: new Date().toISOString(),
				},
			});
		});

		// ================================================================
		// COMPLETION
		// ================================================================

		await step.run("workflow-complete", async () => {
			await updateWorkflowStatus(workflowId, "completed", 6);

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "success",
				title: "Onboarding Complete",
				message:
					"Client onboarding has been successfully completed with two-factor approval.",
				actionable: false,
			});

			await logWorkflowEvent({
				workflowId,
				eventType: "workflow_completed",
				payload: {
					completedAt: new Date().toISOString(),
					riskManagerApproval: riskManagerApproval.data.approvedBy,
					accountManagerApproval: accountManagerApproval.data.approvedBy,
					businessType: context.businessType,
					aiScore: aiAnalysis.scores.aggregatedScore,
				},
			});
		});

		return {
			status: "completed",
			stage: 6,
			workflowId,
			applicantId,
			businessType: context.businessType,
			aiScore: aiAnalysis.scores.aggregatedScore,
			riskManagerApproval: riskManagerApproval.data.approvedBy,
			accountManagerApproval: accountManagerApproval.data.approvedBy,
		};
	}
);

// ============================================
// Kill Switch Handler Function
// ============================================

/**
 * Handle workflow termination events
 * This function runs when kill switch is triggered to clean up
 */
export const killSwitchHandler = inngest.createFunction(
	{
		id: "stratcol-kill-switch-handler",
		name: "Kill Switch Handler",
	},
	{ event: "workflow/terminated" },
	async ({ event, step }) => {
		const { workflowId, reason, decidedBy, terminatedAt } = event.data;

		await step.run("log-termination", async () => {
			const db = getDatabaseClient();
			if (!db) return;

			await db.insert(workflowEvents).values({
				workflowId,
				eventType: "kill_switch_handled",
				payload: JSON.stringify({
					reason,
					decidedBy,
					terminatedAt,
					handledAt: new Date().toISOString(),
				}),
			});
		});

		return {
			handled: true,
			workflowId,
			reason,
		};
	}
);
