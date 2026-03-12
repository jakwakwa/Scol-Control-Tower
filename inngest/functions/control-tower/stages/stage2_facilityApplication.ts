import { eq } from "drizzle-orm";
import { getBaseUrl, getDatabaseClient } from "@/app/utils";
import { applicants, workflows } from "@/db/schema";
import {
	MAX_MANDATE_RETRIES,
	OVERLIMIT_THRESHOLD,
	WORKFLOW_TIMEOUTS,
} from "@/lib/constants/workflow-timeouts";
import {
	determineBusinessType,
	getDocumentRequirements,
	resolveBusinessType,
} from "@/lib/services/document-requirements.service";
import {
	sendApplicantFormLinksEmail,
	sendInternalAlertEmail,
} from "@/lib/services/email.service";
import { createFormInstance } from "@/lib/services/form.service";
import { executeKillSwitch } from "@/lib/services/kill-switch.service";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";
import { generateQuote } from "@/lib/services/quote.service";
import { updateWorkflowStatus } from "@/lib/services/workflow.service";
import type { FormType } from "@/lib/types";
import { inngest } from "../../../client";
import {
	guardKillSwitch,
	notifyApplicantDecline,
	runSanctionsForWorkflow,
} from "../helpers";
import { handleWaitTimeout } from "../timeout-handler";
import type { StageDependencies, StageResult } from "../types";

export async function executeStage2({
	step,
	context,
}: StageDependencies): Promise<StageResult> {
	const { workflowId, applicantId } = context;
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
		timeout: WORKFLOW_TIMEOUTS.STAGE,
		match: "data.workflowId",
	});

	if (!facilitySubmission) {
		await handleWaitTimeout({
			step,
			workflowId,
			applicantId,
			stage: 2,
			reason: "STAGE2_FACILITY_TIMEOUT",
			notifyStepId: "notify-am-facility-timeout",
			terminateStepId: "terminate-facility-timeout",
			title: "Facility Application",
			message: "Applicant failed to submit the facility application within the expected timeframe.",
			timeoutWindow: WORKFLOW_TIMEOUTS.STAGE,
		});
	}

	await step.run("notify-am-facility-submitted", async () => {
		await guardKillSwitch(workflowId, "notify-am-facility-submitted");
		await createWorkflowNotification({
			workflowId,
			applicantId,
			type: "success",
			title: "Facility Application Submitted",
			message: "Applicant has successfully submitted the facility application.",
			actionable: false,
		});
		await sendInternalAlertEmail({
			title: "Facility Application Submitted",
			message:
				"The facility application has been submitted by the applicant and is proceeding to sales evaluation.",
			workflowId,
			applicantId,
			type: "info",
			actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}`,
		});
	});

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
		const preRiskSanctions = await step.run("pre-risk-sanctions-check", async () => {
			await guardKillSwitch(workflowId, "pre-risk-sanctions-check");
			return runSanctionsForWorkflow(applicantId, workflowId, "pre_risk", {
				allowReuse: false,
			});
		});

		await step.run("stage-2-awaiting-pre-risk-approval", async () => {
			await updateWorkflowStatus(workflowId, "awaiting_human", 2);
			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "warning",
				title: "Pre-risk Approval Required",
				message: `Issues were detected during sales evaluation. Sanctions check: ${preRiskSanctions.riskLevel}${preRiskSanctions.reused ? " (reused)" : ""}. Complete pre-risk approval before quote can be sent.`,
				actionable: true,
			});
		});

		const preRiskApproval = await step.waitForEvent("wait-pre-risk-approval", {
			event: "risk/pre-approval.decided",
			timeout: WORKFLOW_TIMEOUTS.REVIEW,
			match: "data.workflowId",
		});

		if (!preRiskApproval) {
			await handleWaitTimeout({
				step,
				workflowId,
				applicantId,
				stage: 2,
				reason: "STAGE2_PRE_RISK_APPROVAL_TIMEOUT",
				notifyStepId: "notify-am-pre-risk-approval-timeout",
				terminateStepId: "terminate-pre-risk-approval-timeout",
				title: "Pre-risk Approval",
				message: "Pre-risk approval timed out.",
				timeoutWindow: WORKFLOW_TIMEOUTS.REVIEW,
			});
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
				timeout: WORKFLOW_TIMEOUTS.REVIEW,
				match: "data.workflowId",
			});

			if (!preRiskEvaluation) {
				await handleWaitTimeout({
					step,
					workflowId,
					applicantId,
					stage: 2,
					reason: "STAGE2_PRE_RISK_EVAL_TIMEOUT",
					notifyStepId: "notify-am-pre-risk-eval-timeout",
					terminateStepId: "terminate-pre-risk-eval-timeout",
					title: "Pre-risk Evaluation",
					message: "Pre-risk evaluation timed out.",
					timeoutWindow: WORKFLOW_TIMEOUTS.REVIEW,
				});
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
		const facilityApplicationData = (formData as { facilityApplicationData?: unknown })
			.facilityApplicationData as Record<string, unknown> | undefined;
		const facilityFormData =
			facilityApplicationData ?? (formData as Record<string, unknown>);

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
			determineBusinessType(facilityFormData)
		);
		const docRequirements = getDocumentRequirements(
			businessType,
			applicantIndustry ?? undefined
		);

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

	// Step 2.3: AI Generate Quotation (after facility application)
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
				quote: null as any,
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

	const quote = quotationResult.quote as any;
	const isOverlimit = quotationResult.isOverlimit;

	// Step 2.4: Manager Quote Review (decision loop)
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

		// Parse quote details for structured email rendering
		let riskFactors: string | string[] | null = null;
		let generatedAt: string | null = null;
		if (quote?.details) {
			try {
				const parsed = JSON.parse(quote.details);
				riskFactors = parsed.riskFactors ?? null;
				generatedAt = parsed.generatedAt ?? null;
			} catch {
				// Ignore parse errors
			}
		}

		await sendInternalAlertEmail({
			title,
			message: `Quote generated for review. Amount: R${((quote?.amount || 0) / 100).toFixed(2)}`,
			workflowId,
			applicantId,
			type: isOverlimit ? "warning" : "info",
			actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}?tab=reviews`,
			approveUrl: quote?.quoteId
				? `${getBaseUrl()}/api/quotes/${quote.quoteId}/approve`
				: undefined,
			quoteDetails: quote
				? {
						amount: quote.amount,
						baseFeePercent: quote.baseFeePercent,
						adjustedFeePercent: quote.adjustedFeePercent,
						rationale: quote.rationale,
						riskFactors,
						generatedAt,
					}
				: undefined,
		});
	});

	await step.run("stage-2-awaiting-quote-approval", () =>
		updateWorkflowStatus(workflowId, "awaiting_human", 2)
	);

	// Wait for manager approval (they can also request-update or adjust before approving)
	const quoteApproval = await step.waitForEvent("wait-quote-approval", {
		event: "quote/approved",
		timeout: WORKFLOW_TIMEOUTS.WORKFLOW,
		match: "data.workflowId",
	});

	if (!quoteApproval) {
		await handleWaitTimeout({
			step,
			workflowId,
			applicantId,
			stage: 2,
			reason: "STAGE2_QUOTE_APPROVAL_TIMEOUT",
			notifyStepId: "notify-am-quote-timeout",
			terminateStepId: "terminate-quote-approval-timeout",
			title: "Quote Approval",
			message: "The quote is stalled awaiting manager approval.",
			timeoutWindow: WORKFLOW_TIMEOUTS.WORKFLOW,
			actionTab: "reviews",
		});
	}

	// Step 2.5: Send quote for client signature
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
		timeout: WORKFLOW_TIMEOUTS.WORKFLOW,
		match: "data.workflowId",
	});

	if (!quoteResponse) {
		await handleWaitTimeout({
			step,
			workflowId,
			applicantId,
			stage: 2,
			reason: "STAGE2_QUOTE_RESPONSE_TIMEOUT",
			notifyStepId: "notify-am-quote-response-timeout",
			terminateStepId: "terminate-quote-response-timeout",
			title: "Quote Signature",
			message: "Applicant failed to sign the quote within the expected timeframe.",
			timeoutWindow: WORKFLOW_TIMEOUTS.WORKFLOW,
		});
	}

	if (quoteResponse.data.decision === "DECLINED") {
		await step.run("quote-declined-notify", async () => {
			await notifyApplicantDecline({
				applicantId,
				workflowId,
				subject: "Quotation decision received",
				heading: "Quotation declined",
				message:
					quoteResponse.data.reason || "We have recorded your decline on the quotation.",
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

	// Step 2.6: Request commercial mandate documents with 7-day retry loop (max 8)
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

	// Mandate/FICA collection with Tiered Escalation (SOP v3.1.0)
	// NOTE: The active document upload path emits `upload/fica.received`.
	let mandateDocsReceived = await step.waitForEvent("wait-mandate-docs", {
		event: "upload/fica.received",
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
					event: "upload/fica.received",
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
	// NOTE: We return documentsComplete from this step so Stage 3 can use the
	// step's memoized return value instead of mutating context (which is lost on replay).
	const _mandateVerified = await step.run("mandate-verified", async () => {
		await inngest.send({
			name: "mandate/verified",
			data: {
				workflowId,
				applicantId,
				mandateType: (mandateInfo.mandateType || "MIXED") as
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
			payload: { retryCount, mandateType: mandateInfo.mandateType },
		});

		return { documentsComplete: true };
	});

	await step.run("notify-am-mandate-docs-uploaded", async () => {
		await guardKillSwitch(workflowId, "notify-am-mandate-docs-uploaded");
		await createWorkflowNotification({
			workflowId,
			applicantId,
			type: "success",
			title: "Mandate Documents Uploaded",
			message: "All required mandate documents have been uploaded successfully.",
			actionable: false,
		});
		await sendInternalAlertEmail({
			title: "Mandate Documents Uploaded",
			message: "The applicant has completed uploading all required mandate documents.",
			workflowId,
			applicantId,
			type: "info",
			actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}`,
		});
	});

	return {
		status: "completed",
		stage: 2,
		data: {
			facilitySubmission,
			mandateInfo,
			mandateVerified: { documentsComplete: true },
		},
	};
}
