/**
 * Aggregated Analysis Service - Control Tower
 *
 * This service orchestrates all AI agents (Validation, Risk, Sanctions)
 * and produces a unified analysis result for the workflow.
 *
 * The aggregated result is used by:
 * 1. Risk Manager for final review
 * 2. Workflow orchestrator for auto-approval decisions
 * 3. Audit trail for compliance
 */

import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { aiAnalysisLogs, riskAssessments, workflowEvents } from "@/db/schema";
import {
	isFirecrawlConfigured,
	runIndustryRegulatorCheck,
	runSanctionsEnrichmentCheck,
	runSocialReputationCheck,
} from "@/lib/services/firecrawl";
import { analyzeRisk as runProcureCheck } from "@/lib/services/risk.service";
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
	};
	documents?: Array<{
		id: string;
		type: string;
		content: string;
		contentType: "text" | "base64";
	}>;
	bankStatementText?: string;
	directors?: Array<{
		name: string;
		idNumber?: string;
		nationality?: string;
	}>;
	requestedAmount?: number;
	sanctionsOverride?: SanctionsCheckResult;
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
		xdsCreditCheck: { status: "mock" | "live"; result?: Record<string, unknown> };
		lexisNexisProcure: { status: "mock" | "live"; result?: Record<string, unknown> };
		bizPortalRegistration: { status: "mock" | "live"; result?: Record<string, unknown> };
		efs24IdAvsr: { status: "mock" | "live"; result?: Record<string, unknown> };
		sarsVatSearch: { status: "mock" | "live"; result?: Record<string, unknown> };
		industryRegulator: { status: "mock" | "live"; result?: Record<string, unknown> };
		sanctionsEvidenceEnrichment?: {
			status: "mock" | "live";
			result?: Record<string, unknown>;
		};
		socialReputation?: { status: "mock" | "live"; result?: Record<string, unknown> };
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

	// Run all agents in parallel
	const [validationResult, riskResult, sanctionsResult] = await Promise.all([
		// Validation Agent
		input.documents && input.documents.length > 0
			? validateDocumentsBatch({
					documents: input.documents,
					applicantData: {
						companyName: input.applicantData.companyName,
						contactName: input.applicantData.contactName,
						registrationNumber: input.applicantData.registrationNumber,
						address: input.applicantData.address,
					},
					workflowId: input.workflowId,
				}).then(r => {
					agentsRun.push("validation");
					return r;
				})
			: Promise.resolve(undefined),

		// Risk Agent
		analyzeFinancialRisk({
			applicantId: input.applicantId,
			workflowId: input.workflowId,
			bankStatementText: input.bankStatementText,
			requestedAmount: input.requestedAmount,
			applicantData: {
				companyName: input.applicantData.companyName,
				industry: input.applicantData.industry,
				employeeCount: input.applicantData.employeeCount,
			},
		}).then(r => {
			agentsRun.push("risk");
			return r;
		}),

		// Sanctions Agent (or pre-computed sanctions result)
		(input.sanctionsOverride
			? Promise.resolve(input.sanctionsOverride)
			: performSanctionsCheck({
					applicantId: input.applicantId,
					workflowId: input.workflowId,
					entityName: input.applicantData.companyName,
					entityType: "COMPANY",
					countryCode: input.applicantData.countryCode || "ZA",
					registrationNumber: input.applicantData.registrationNumber,
					directors: input.directors,
				})
		).then(r => {
			agentsRun.push("sanctions");
			return r;
		}),
	]);

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

	// Run SOP-required external checks (ProcureCheck live when enabled, rest mocked)
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
						dataSource: validationResult.results[0]?.dataSource || "skipped",
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
		const hasAnyMock = Object.values(dataSources).some(
			s => s.toLowerCase().includes("mock") || s === "unknown"
		);

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
			dataSource: hasAnyMock ? "Mock Data (partial or full)" : "Live",
		});

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
		console.error("[AggregatedAnalysis] Error storing result:", error);
	}
}

// ============================================
// SOP External Check Stubs (Feature-Flagged)
// ============================================

/**
 * Runs feature-flagged external checks per SOP requirements.
 *
 * Feature flags (env):
 *   ENABLE_PROCURECHECK_LIVE        – BizPortal via ProcureCheck
 *   ENABLE_FIRECRAWL_INDUSTRY_REG   – Industry regulator via Firecrawl
 *   ENABLE_FIRECRAWL_SANCTIONS_ENRICH – Sanctions evidence enrichment via Firecrawl
 *   ENABLE_FIRECRAWL_SOCIAL_REP     – Social reputation (HelloPeter) via Firecrawl
 *
 * All flags default to false; mock fallback is returned on failure.
 */
async function runExternalCheckStubs(
	input: AggregatedAnalysisInput
): Promise<AggregatedAnalysisResult["externalChecks"]> {
	const mockResult = (name: string) => ({
		status: "mock" as const,
		result: {
			checked: true,
			passed: true,
			mockReason: `${name} check is mocked in Phase 1`,
			checkedAt: new Date().toISOString(),
		},
	});

	// --- BizPortal / ProcureCheck ---
	let bizPortalResult: AggregatedAnalysisResult["externalChecks"]["bizPortalRegistration"] =
		mockResult("BizPortal Company Registration");

	if (process.env.ENABLE_PROCURECHECK_LIVE === "true") {
		try {
			const pcResult = await runProcureCheck(input.applicantId);
			bizPortalResult = {
				status: "live" as const,
				result: {
					riskScore: pcResult.riskScore,
					anomalies: pcResult.anomalies,
					recommendedAction: pcResult.recommendedAction,
					procureCheckId: pcResult.procureCheckId,
					checkedAt: new Date().toISOString(),
				},
			};
		} catch (err) {
			console.error(
				"[AggregatedAnalysis] ProcureCheck failed, using mock fallback:",
				err
			);
		}
	}

	// --- Industry Regulator (Firecrawl) ---
	let industryRegulatorResult: AggregatedAnalysisResult["externalChecks"]["industryRegulator"] =
		mockResult("Industry Regulator Confirmation");

	if (process.env.ENABLE_FIRECRAWL_INDUSTRY_REG === "true" && isFirecrawlConfigured()) {
		try {
			const fcResult = await runIndustryRegulatorCheck({
				applicantId: input.applicantId,
				workflowId: input.workflowId,
				applicantData: {
					companyName: input.applicantData.companyName,
					contactName: input.applicantData.contactName,
					registrationNumber: input.applicantData.registrationNumber,
					industry: input.applicantData.industry,
					countryCode: input.applicantData.countryCode,
					address: input.applicantData.address,
				},
				industry: input.applicantData.industry,
			});
			industryRegulatorResult = {
				status: fcResult.status,
				result: fcResult.result as unknown as Record<string, unknown>,
			};
		} catch (err) {
			console.error(
				"[AggregatedAnalysis] Firecrawl industry regulator failed, using mock fallback:",
				err
			);
		}
	}

	// --- Sanctions Evidence Enrichment (Firecrawl) ---
	let sanctionsEnrichmentResult:
		| AggregatedAnalysisResult["externalChecks"]["sanctionsEvidenceEnrichment"]
		| undefined;

	if (
		process.env.ENABLE_FIRECRAWL_SANCTIONS_ENRICH === "true" &&
		isFirecrawlConfigured()
	) {
		try {
			const fcResult = await runSanctionsEnrichmentCheck({
				applicantId: input.applicantId,
				workflowId: input.workflowId,
				applicantData: {
					companyName: input.applicantData.companyName,
					contactName: input.applicantData.contactName,
					registrationNumber: input.applicantData.registrationNumber,
					industry: input.applicantData.industry,
					countryCode: input.applicantData.countryCode,
					address: input.applicantData.address,
				},
				entityName: input.applicantData.companyName,
				entityType: "COMPANY",
				countryCode: input.applicantData.countryCode ?? "ZA",
				registrationNumber: input.applicantData.registrationNumber,
			});
			sanctionsEnrichmentResult = {
				status: fcResult.status,
				result: fcResult.result as unknown as Record<string, unknown>,
			};
		} catch (err) {
			console.error(
				"[AggregatedAnalysis] Firecrawl sanctions enrichment failed, skipping:",
				err
			);
		}
	}

	// --- Social Reputation / HelloPeter (Firecrawl) ---
	let socialReputationResult:
		| AggregatedAnalysisResult["externalChecks"]["socialReputation"]
		| undefined;

	if (process.env.ENABLE_FIRECRAWL_SOCIAL_REP === "true" && isFirecrawlConfigured()) {
		try {
			const fcResult = await runSocialReputationCheck({
				applicantId: input.applicantId,
				workflowId: input.workflowId,
				applicantData: {
					companyName: input.applicantData.companyName,
					contactName: input.applicantData.contactName,
					registrationNumber: input.applicantData.registrationNumber,
					industry: input.applicantData.industry,
					countryCode: input.applicantData.countryCode,
					address: input.applicantData.address,
				},
			});
			socialReputationResult = {
				status: fcResult.status,
				result: fcResult.result as unknown as Record<string, unknown>,
			};
		} catch (err) {
			console.error(
				"[AggregatedAnalysis] Firecrawl social reputation failed, skipping:",
				err
			);
		}
	}

	return {
		xdsCreditCheck: mockResult("XDS Credit Check"),
		lexisNexisProcure: mockResult("LexisNexis Procure Upload"),
		bizPortalRegistration: bizPortalResult,
		efs24IdAvsr: mockResult("EFS24 ID/AVSR Verification"),
		sarsVatSearch: mockResult("SARS VAT Search"),
		industryRegulator: industryRegulatorResult,
		sanctionsEvidenceEnrichment: sanctionsEnrichmentResult,
		socialReputation: socialReputationResult,
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
