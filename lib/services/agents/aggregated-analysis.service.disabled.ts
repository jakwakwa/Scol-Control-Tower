import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { aiAnalysisLogs, riskAssessments, workflowEvents } from "@/db/schema";
import { parseVatStatus } from "@/lib/risk-review/parsers/vat.parser";
import { isFirecrawlConfigured, runVatVerificationCheck } from "@/lib/services/firecrawl";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";
import { generateReporterAnalysis, type ReporterOutput } from "./reporter.agent";
import {
	analyzeFinancialRisk,
	canAutoApprove as canAutoApproveRisk,
	type RiskAnalysisResult,
	requiresManualReview as requiresManualRiskReview,
} from "./risk.agent";
import {
	canAutoApprove as canAutoApproveSanctions,
	isBlocked as isSanctionsBlocked,
	performSanctionsCheck,
	type SanctionsCheckResult,
} from "./sanctions.agent";
import { type BatchValidationResult, validateDocumentsBatch } from "./validation.agent";

// ============================================
// Types & Schemas
// ============================================
export interface AggregatedAnalysisInput {
	workflowId: number;
	applicantId: number;
	applicantData: {
		companyName: string;
		contactName?: string;
		registrationNumber?: string;
		industry?: string;
		countryCode?: string;
		address?: string;
		employeeCount?: number;
		vatNumber?: string;
	};
	documents?: Array<{
		id: string;
		type: string;
		content: string;
		contentType: "text" | "base64";
	}>;
	bankStatementText?: string;
	bankStatementBase64?: string;
	directors?: Array<{
		name: string;
		idNumber?: string;
		nationality?: string;
	}>;
	requestedAmount?: number;
	sanctionsOverride?: SanctionsCheckResult;
	facilityApplicationData?: Record<string, unknown>;
	ficaComparisonContext?: {
		companyName?: string;
		tradingName?: string;
		registrationNumber?: string;
		idNumber?: string;
		contactName?: string;
		email?: string;
		phone?: string;
		accountNumber?: string;
		bankName?: string;
		branchCode?: string;
		address?: string;
	};
}

export interface AggregatedAnalysisResult {
	// Individual Agent Results
	validation?: BatchValidationResult;
	risk?: RiskAnalysisResult;
	sanctions?: SanctionsCheckResult;

	// Reporter Agent consolidated agent outputs (for UI rendering)
	agents: {
		validation: Record<string, unknown>;
		risk: Record<string, unknown>;
		sanctions: Record<string, unknown>;
		reporter?: ReporterOutput;
	};

	// Aggregated Scores
	scores: {
		validationScore: number;
		riskScore: number;
		sanctionsScore: number;
		aggregatedScore: number;
	};

	// Overall Assessment
	overall: {
		canAutoApprove: boolean;
		requiresManualReview: boolean;
		isBlocked: boolean;
		recommendation:
			| "AUTO_APPROVE"
			| "PROCEED_WITH_CONDITIONS"
			| "MANUAL_REVIEW"
			| "BLOCK";
		reasoning: string;
		conditions?: string[];
		flags: string[];
	};

	// SOP External Check Stubs (feature-flagged)
	externalChecks: {
		xdsCreditCheck: { status: "offline" | "live"; result?: Record<string, unknown> };
		lexisNexisProcure: { status: "offline" | "live"; result?: Record<string, unknown> };
		bizPortalRegistration: {
			status: "offline" | "live";
			result?: Record<string, unknown>;
		};
		efs24IdAvsr: { status: "offline" | "live"; result?: Record<string, unknown> };
		sarsVatSearch: { status: "offline" | "live"; result?: Record<string, unknown> };
	};

	// Metadata
	metadata: {
		analysisId: string;
		analyzedAt: string;
		processingTimeMs: number;
		agentsRun: ("validation" | "risk" | "sanctions")[];
	};
}

// ============================================
// Aggregated Analysis Implementation
// ============================================

/**
 * Perform aggregated analysis using all AI agents
 */
export async function performAggregatedAnalysis(
	input: AggregatedAnalysisInput
): Promise<AggregatedAnalysisResult> {
	const startTime = Date.now();
	const analysisId = `AGG-${input.workflowId}-${Date.now()}`;

	const agentsRun: ("validation" | "risk" | "sanctions")[] = [];
	const flags: string[] = [];

	const fallbackValidation = createValidationFallback(input.documents ?? []);
	const fallbackRisk = createRiskFallback(
		"Risk agent failed. Insufficient data for automated risk decision."
	);
	const fallbackSanctions = createSanctionsFallback(
		"Sanctions providers unavailable. Manual sanctions review required."
	);

	const [validationSettled, riskSettled, sanctionsSettled] = await Promise.allSettled([
		input.documents && input.documents.length > 0
			? validateDocumentsBatch({
					documents: input.documents,
					applicantData: {
						companyName: input.applicantData.companyName,
						contactName: input.applicantData.contactName,
						registrationNumber: input.applicantData.registrationNumber,
						address: input.applicantData.address,
					},
					ficaComparisonContext: input.ficaComparisonContext,
					workflowId: input.workflowId,
				})
			: Promise.resolve(undefined),
		analyzeFinancialRisk({
			applicantId: input.applicantId,
			workflowId: input.workflowId,
			bankStatementText: input.bankStatementText,
			bankStatementBase64: input.bankStatementBase64,
			requestedAmount: input.requestedAmount,
			applicantData: {
				companyName: input.applicantData.companyName,
				industry: input.applicantData.industry,
				employeeCount: input.applicantData.employeeCount,
			},
		}),
		input.sanctionsOverride
			? Promise.resolve(input.sanctionsOverride)
			: performSanctionsCheck({
					applicantId: input.applicantId,
					workflowId: input.workflowId,
					entityName: input.applicantData.companyName,
					entityType: "COMPANY",
					countryCode: input.applicantData.countryCode || "ZA",
					contactName: input.applicantData.contactName,
					registrationNumber: input.applicantData.registrationNumber,
					directors: input.directors,
				}),
	]);

	const validationResult =
		validationSettled.status === "fulfilled"
			? validationSettled.value
			: input.documents && input.documents.length > 0
				? fallbackValidation
				: undefined;
	const riskResult =
		riskSettled.status === "fulfilled" ? riskSettled.value : fallbackRisk;
	const sanctionsResult =
		sanctionsSettled.status === "fulfilled" ? sanctionsSettled.value : fallbackSanctions;

	if (validationResult) agentsRun.push("validation");
	if (riskSettled.status === "fulfilled") agentsRun.push("risk");
	if (sanctionsSettled.status === "fulfilled") agentsRun.push("sanctions");

	if (validationSettled.status === "rejected") {
		flags.push("Validation agent unavailable - manual document review required");
	}
	if (riskSettled.status === "rejected") {
		flags.push("Risk agent unavailable - manual risk review required");
	}
	if (sanctionsSettled.status === "rejected") {
		flags.push("Sanctions providers unavailable - manual sanctions review required");
	}

	// Calculate scores
	const validationScore = validationResult
		? calculateValidationScore(validationResult)
		: 100;
	const riskScore = riskResult.overall.score;
	const sanctionsScore = calculateSanctionsScore(sanctionsResult);

	// Weighted aggregated score
	const aggregatedScore = Math.round(
		validationScore * 0.25 + riskScore * 0.45 + sanctionsScore * 0.3
	);

	// Determine overall status
	const isSanctionsBlock = isSanctionsBlocked(sanctionsResult);
	const canAutoApprove =
		!isSanctionsBlock &&
		canAutoApproveSanctions(sanctionsResult) &&
		canAutoApproveRisk(riskResult) &&
		(!validationResult || validationResult.summary.overallRecommendation === "PROCEED");

	const requiresManualReview =
		!(canAutoApprove || isSanctionsBlock) &&
		(requiresManualRiskReview(riskResult) ||
			sanctionsResult.overall.reviewRequired ||
			(validationResult &&
				validationResult.summary.overallRecommendation === "REVIEW_REQUIRED"));

	// Collect flags
	if (riskResult.stability.hasBounced) {
		flags.push("Bounced transactions detected");
	}
	if (riskResult.stability.gamblingIndicators.length > 0) {
		flags.push("Gambling-related transactions detected");
	}
	if (sanctionsResult.pepScreening.isPEP) {
		flags.push("PEP identified - Enhanced Due Diligence required");
	}
	if (sanctionsResult.adverseMedia.alertsFound > 0) {
		flags.push(`${sanctionsResult.adverseMedia.alertsFound} adverse media alert(s)`);
	}
	if (validationResult && validationResult.summary.failed > 0) {
		flags.push(`${validationResult.summary.failed} document(s) failed validation`);
	}

	// Determine recommendation
	let recommendation: AggregatedAnalysisResult["overall"]["recommendation"];
	if (isSanctionsBlock) {
		recommendation = "BLOCK";
	} else if (canAutoApprove) {
		recommendation = "AUTO_APPROVE";
	} else if (requiresManualReview) {
		recommendation = "MANUAL_REVIEW";
	} else {
		recommendation = "PROCEED_WITH_CONDITIONS";
	}

	// Generate reasoning
	const reasoning = generateAggregatedReasoning(
		recommendation,
		riskResult,
		sanctionsResult,
		validationResult,
		aggregatedScore
	);

	// Run Reporter Agent
	const validationFicaComparison = summarizeFicaComparisons(validationResult);
	const reporterResult = await generateReporterAnalysis({
		applicantData: {
			companyName: input.applicantData.companyName,
			industry: input.applicantData.industry,
		},
		aggregatedScore,
		validationSummary: validationResult
			? {
					passed: validationResult.summary.passed,
					failed: validationResult.summary.failed,
					total: validationResult.summary.totalDocuments,
				}
			: { passed: 0, failed: 0, total: 0 },
		ficaComparisonSummary: validationFicaComparison,
		riskSummary: {
			score: riskResult.overall.score,
			category: riskResult.creditRisk.riskCategory,
			flags: [
				...(riskResult.stability.hasBounced ? ["Bounced transactions"] : []),
				...(riskResult.stability.gamblingIndicators.length > 0
					? ["Gambling indicators"]
					: []),
			],
		},
		sanctionsSummary: {
			isBlocked: isSanctionsBlock,
			flags: [
				...(sanctionsResult.pepScreening.isPEP ? ["PEP Identified"] : []),
				...(sanctionsResult.adverseMedia.alertsFound > 0
					? [`${sanctionsResult.adverseMedia.alertsFound} Adverse Media Alerts`]
					: []),
			],
		},
	});

	// ProcureCheck live when enabled
	const externalChecks = await runExternalCheckStubs(input);

	// Build result
	const result: AggregatedAnalysisResult = {
		validation: validationResult,
		risk: riskResult,
		sanctions: sanctionsResult,
		agents: {
			validation: validationResult
				? {
						totalDocuments: validationResult.summary.totalDocuments,
						passed: validationResult.summary.passed,
						failed: validationResult.summary.failed,
						recommendation: validationResult.summary.overallRecommendation,
						dataSource: validationResult.results[0]?.validation?.dataSource || "skipped",
						ficaComparisonSummary: validationFicaComparison,
					}
				: { status: "skipped", reason: "No documents provided" },
			risk: {
				riskCategory: riskResult.creditRisk.riskCategory,
				score: riskResult.overall.score,
				recommendation: riskResult.overall.recommendation,
				hasBounced: riskResult.stability.hasBounced,
				gamblingIndicators: riskResult.stability.gamblingIndicators.length,
				dataSource: riskResult.dataSource,
			},
			sanctions: {
				riskLevel: sanctionsResult.overall.riskLevel,
				isPEP: sanctionsResult.pepScreening.isPEP,
				requiresEDD: sanctionsResult.overall.requiresEDD,
				adverseMediaAlerts: sanctionsResult.adverseMedia.alertsFound,
				dataSource: sanctionsResult.metadata?.dataSource || "unknown",
			},
			reporter: reporterResult,
		},
		scores: {
			validationScore,
			riskScore,
			sanctionsScore,
			aggregatedScore,
		},
		overall: {
			canAutoApprove,
			requiresManualReview,
			isBlocked: isSanctionsBlock,
			recommendation,
			reasoning,
			conditions:
				riskResult.overall.recommendation === "CONDITIONAL_APPROVE"
					? riskResult.overall.conditions
					: undefined,
			flags,
		},
		externalChecks,
		metadata: {
			analysisId,
			analyzedAt: new Date().toISOString(),
			processingTimeMs: Date.now() - startTime,
			agentsRun,
		},
	};

	// Store result in database
	await storeAnalysisResult(
		input.workflowId,
		input.applicantId,
		result,
		reporterResult.promptVersionId
	);
	return result;
}

function createValidationFallback(
	documents: Array<{ id: string; type: string }>
): BatchValidationResult {
	return {
		results: documents.map(doc => ({
			documentId: doc.id,
			documentType: doc.type,
			validation: {
				isAuthentic: false,
				authenticityScore: 0,
				authenticityFlags: ["Validation service unavailable"],
				dataIntegrityPassed: false,
				dataIntegrityIssues: ["Validation service unavailable"],
				dateValid: false,
				dateIssues: ["Could not validate document date"],
				crossReferenceVerified: false,
				crossReferenceDetails: {
					nameMatch: false,
					addressMatch: false,
				},
				overallValid: false,
				overallScore: 0,
				recommendation: "REVIEW",
				reasoning:
					"Validation service unavailable. Manual review is required for this document.",
				ficaComparison: {
					documentType: doc.type,
					fields: {},
					summary: {
						overallStatus: "INSUFFICIENT_DATA",
						mismatchCount: 0,
						criticalMismatchCount: 0,
						keyDiscrepancies: ["Validation service unavailable"],
					},
				},
				dataSource: "Validation Error - Manual Escalation",
			},
		})),
		summary: {
			totalDocuments: documents.length,
			passed: 0,
			requiresReview: documents.length,
			failed: 0,
			overallRecommendation: "REVIEW_REQUIRED",
		},
	};
}

function summarizeFicaComparisons(validation: BatchValidationResult | undefined): {
	totalMismatches: number;
	criticalMismatches: number;
	documentsWithMismatches: number;
	keyDiscrepancies: string[];
} {
	if (!validation) {
		return {
			totalMismatches: 0,
			criticalMismatches: 0,
			documentsWithMismatches: 0,
			keyDiscrepancies: [],
		};
	}

	let totalMismatches = 0;
	let criticalMismatches = 0;
	let documentsWithMismatches = 0;
	const keyDiscrepancies = new Set<string>();

	for (const result of validation.results) {
		const summary = result.validation.ficaComparison?.summary;
		if (!summary) continue;

		totalMismatches += summary.mismatchCount;
		criticalMismatches += summary.criticalMismatchCount;
		if (summary.mismatchCount > 0) {
			documentsWithMismatches += 1;
		}
		for (const discrepancy of summary.keyDiscrepancies) {
			keyDiscrepancies.add(discrepancy);
		}
	}

	return {
		totalMismatches,
		criticalMismatches,
		documentsWithMismatches,
		keyDiscrepancies: Array.from(keyDiscrepancies).slice(0, 8),
	};
}

function createRiskFallback(reason: string): RiskAnalysisResult {
	return {
		bankAnalysis: {
			accountType: "UNKNOWN",
			bankName: "UNKNOWN",
			averageBalance: 0,
			minimumBalance: 0,
			maximumBalance: 0,
			volatilityScore: 0,
		},
		cashFlow: {
			totalCredits: 0,
			totalDebits: 0,
			netCashFlow: 0,
			regularIncomeDetected: false,
			incomeFrequency: "UNKNOWN",
			consistencyScore: 0,
		},
		stability: {
			overallScore: 0,
			debtIndicators: [],
			gamblingIndicators: [],
			loanRepayments: 0,
			hasBounced: false,
			bouncedCount: 0,
			bouncedAmount: 0,
		},
		creditRisk: {
			riskCategory: "HIGH",
			riskScore: 95,
			affordabilityRatio: 0,
			redFlags: [reason],
			positiveIndicators: [],
		},
		overall: {
			score: 10,
			recommendation: "MANUAL_REVIEW",
			reasoning: reason,
			conditions: [
				"Manual risk-manager verification required due to unavailable automated risk analysis",
			],
		},
		dataSource: "Risk Error - Manual Escalation",
	};
}

function createSanctionsFallback(reason: string): SanctionsCheckResult {
	const now = new Date();
	return {
		unSanctions: {
			checked: false,
			matchFound: false,
			matchDetails: [],
			lastChecked: now.toISOString(),
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
			riskLevel: "MEDIUM",
			passed: false,
			requiresEDD: true,
			recommendation: "MANUAL_REVIEW",
			reasoning: reason,
			reviewRequired: true,
		},
		metadata: {
			checkId: `SCK-FALLBACK-${Date.now()}`,
			checkedAt: now.toISOString(),
			expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
			dataSource: "Sanctions Error - Manual Escalation",
		},
	};
}

/**
 * Calculate validation score from batch results
 */
function calculateValidationScore(result: BatchValidationResult): number {
	if (result.summary.totalDocuments === 0) return 100;

	const passRate = (result.summary.passed / result.summary.totalDocuments) * 100;

	// Penalize for review required or failed
	const penalty = result.summary.requiresReview * 5 + result.summary.failed * 15;

	return Math.max(0, Math.round(passRate - penalty));
}

/**
 * Calculate sanctions score from result
 */
function calculateSanctionsScore(result: SanctionsCheckResult): number {
	if (result.overall.riskLevel === "BLOCKED") return 0;
	if (result.overall.riskLevel === "HIGH") return 30;
	if (result.overall.riskLevel === "MEDIUM") return 60;
	if (result.overall.riskLevel === "LOW") return 80;
	return 100; // CLEAR
}

/**
 * Generate aggregated reasoning text
 */
function generateAggregatedReasoning(
	recommendation: AggregatedAnalysisResult["overall"]["recommendation"],
	risk: RiskAnalysisResult,
	sanctions: SanctionsCheckResult,
	validation: BatchValidationResult | undefined,
	aggregatedScore: number
): string {
	const parts: string[] = [];

	parts.push(
		`Aggregated analysis completed with overall score of ${aggregatedScore}/100.`
	);

	switch (recommendation) {
		case "AUTO_APPROVE":
			parts.push(
				"All checks passed with satisfactory results. Automatic approval recommended."
			);
			break;
		case "PROCEED_WITH_CONDITIONS":
			parts.push("Checks passed with some conditions. May proceed with monitoring.");
			if (risk.overall.conditions) {
				parts.push(`Conditions: ${risk.overall.conditions.join("; ")}`);
			}
			break;
		case "MANUAL_REVIEW":
			parts.push("One or more checks require human review before proceeding.");
			break;
		case "BLOCK":
			parts.push(
				"CRITICAL: Sanctions screening identified blocking issues. Application cannot proceed."
			);
			break;
	}

	// Risk summary
	parts.push(
		`Risk assessment: ${risk.creditRisk.riskCategory} (${risk.overall.recommendation})`
	);

	// Sanctions summary
	parts.push(
		`Sanctions check: ${sanctions.overall.riskLevel}${sanctions.overall.requiresEDD ? " - EDD required" : ""}`
	);

	// Validation summary
	if (validation) {
		parts.push(
			`Document validation: ${validation.summary.passed}/${validation.summary.totalDocuments} passed`
		);
	}

	return parts.join(" ");
}

/**
 * Store analysis result in database
 */
async function storeAnalysisResult(
	workflowId: number,
	applicantId: number,
	result: AggregatedAnalysisResult,
	promptVersionId: string = "unknown"
): Promise<void> {
	const db = getDatabaseClient();
	if (!db) {
		console.warn("[AggregatedAnalysis] Could not store result - no database connection");
		return;
	}

	try {
		// Update or create risk assessment
		const existing = await db
			.select()
			.from(riskAssessments)
			.where(eq(riskAssessments.applicantId, applicantId));

		// Build per-agent dataSource map for the UI
		const dataSources = {
			risk: result.risk?.dataSource || "unknown",
			sanctions: result.sanctions?.metadata?.dataSource || "unknown",
			validation: result.validation?.results[0]?.validation?.dataSource || "skipped",
			reporter: result.agents.reporter?.dataSource || "unknown",
		};
		const aiAnalysisJson = JSON.stringify({
			analysisId: result.metadata.analysisId,
			scores: result.scores,
			recommendation: result.overall.recommendation,
			reasoning: result.overall.reasoning,
			flags: result.overall.flags,
			agents: result.agents,
			riskDetails: result.risk?.creditRisk,
			sanctionsLevel: result.sanctions?.overall.riskLevel,
			validationSummary: result.validation?.summary,
			externalChecks: result.externalChecks,
			dataSources,
			dataSource: "Live",
		});

		const vatCheck = result.externalChecks.sarsVatSearch;
		const vatCheckResult = vatCheck.result as
			| {
					verified?: boolean;
					vatNumber?: string;
					tradingName?: string;
					runtimeState?: string;
			  }
			| undefined;
		const derivedVatStatus = parseVatStatus(
			vatCheck.status,
			vatCheckResult?.runtimeState,
			vatCheckResult?.verified
		);

		if (existing.length > 0) {
			await db
				.update(riskAssessments)
				.set({
					aiAnalysis: aiAnalysisJson,
					overallRisk:
						result.overall.recommendation === "AUTO_APPROVE"
							? "green"
							: result.overall.recommendation === "BLOCK"
								? "red"
								: "amber",
				})
				.where(eq(riskAssessments.applicantId, applicantId));
		} else {
			await db.insert(riskAssessments).values({
				applicantId,
				aiAnalysis: aiAnalysisJson,
				overallRisk:
					result.overall.recommendation === "AUTO_APPROVE"
						? "green"
						: result.overall.recommendation === "BLOCK"
							? "red"
							: "amber",
			});
		}

		// Log workflow event
		await db.insert(workflowEvents).values({
			workflowId,
			eventType: "ai_analysis_completed",
			payload: JSON.stringify({
				analysisId: result.metadata.analysisId,
				aggregatedScore: result.scores.aggregatedScore,
				recommendation: result.overall.recommendation,
				processingTimeMs: result.metadata.processingTimeMs,
			}),
		});

		if (vatCheck.status === "live" && vatCheckResult?.vatNumber) {
			await logWorkflowEvent({
				workflowId,
				eventType: "vat_verification_completed",
				payload: {
					verified: derivedVatStatus === "verified",
					vatNumber: vatCheckResult.vatNumber,
					tradingName: vatCheckResult.tradingName,
					status: derivedVatStatus,
				},
			});

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: derivedVatStatus === "verified" ? "success" : "warning",
				title: "VAT Verification",
				message:
					derivedVatStatus === "verified"
						? `VAT number check passed for ${vatCheckResult.vatNumber}.`
						: `VAT number check requires manual review for ${vatCheckResult.vatNumber}.`,
				actionable: true,
				severity: "medium",
			});
		}

		// Log Reporter Agent output to ai_analysis_logs
		if (result.agents.reporter) {
			await db.insert(aiAnalysisLogs).values({
				applicantId,
				workflowId,
				agentName: "reporter",
				promptVersionId,
				confidenceScore: result.agents.reporter.confidence_score,
				narrative: result.agents.reporter.narrative,
				rawOutput: JSON.stringify(result.agents.reporter),
				createdAt: new Date(),
			});
		}
	} catch (error) {
		console.error("[Aggregated Analysis] Error storing result:", error);
	}
}

// ============================================
// SOP External Check Stubs (Feature-Flagged)
// ============================================

/**
 * Runs feature-flagged external checks per SOP requirements.
 *
 * Feature flags (env):
 *   ENABLE_FIRECRAWL_VAT_VERIFICATION – VAT verification via vatsearch.co.za
 *
 * Industry regulator, sanctions enrichment, and social reputation
 * Firecrawl checks have been deprecated and removed.
 */
async function runExternalCheckStubs(
	input: AggregatedAnalysisInput
): Promise<AggregatedAnalysisResult["externalChecks"]> {
	let sarsVatSearchResult: {
		status: "live" | "offline";
		result: Record<string, unknown> | undefined;
	} = { status: "offline", result: undefined };

	if (
		process.env.ENABLE_FIRECRAWL_VAT_VERIFICATION === "true" &&
		isFirecrawlConfigured() &&
		input.applicantData.vatNumber
	) {
		try {
			const fcResult = await runVatVerificationCheck({
				vatNumber: input.applicantData.vatNumber,
				companyName: input.applicantData.companyName,
				workflowId: input.workflowId,
				applicantId: input.applicantId,
			});
			sarsVatSearchResult = {
				status: fcResult.status,
				result: (fcResult.result as unknown as Record<string, unknown>) || undefined,
			};
		} catch (err) {
			console.error(
				"[AggregatedAnalysis] Firecrawl VAT verification failed, using mock fallback:",
				err
			);
		}
	}

	return {
		xdsCreditCheck: { status: "offline", result: undefined },
		lexisNexisProcure: { status: "offline", result: undefined },
		bizPortalRegistration: { status: "offline", result: undefined },
		efs24IdAvsr: { status: "offline", result: undefined },
		sarsVatSearch: sarsVatSearchResult,
	};
}

// ============================================
// Quick Check Functions
// ============================================

/**
 * Perform a quick pre-screening check (minimal analysis)
 */
export async function performQuickCheck(
	applicantId: number,
	workflowId: number,
	companyName: string,
	countryCode: string = "ZA"
): Promise<{
	passed: boolean;
	riskLevel: string;
	recommendation: string;
}> {
	const sanctionsResult = await performSanctionsCheck({
		applicantId,
		workflowId,
		entityName: companyName,
		entityType: "COMPANY",
		countryCode,
	});

	return {
		passed: !isSanctionsBlocked(sanctionsResult),
		riskLevel: sanctionsResult.overall.riskLevel,
		recommendation: sanctionsResult.overall.recommendation,
	};
}
