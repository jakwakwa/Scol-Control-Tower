import { type ProcurementData, ProcurementDataSchema } from "@/lib/procurecheck/types";
import {
	parseAiAnalysisSnapshot,
	parseMachineState,
	parseReviewState,
	parseVatStatus,
} from "@/lib/risk-review/parsers/vat.parser";
import type { RiskReviewData, SectionStatus } from "@/lib/risk-review/types";
import type { FinancialRiskAgentResult } from "@/lib/services/agents/financial-risk.agent";
import type { RiskCheckRow } from "@/lib/services/risk-check.service";

type ApplicantRow = {
	id: number;
	companyName: string;
	tradingName: string | null;
	registrationNumber: string | null;
	contactName: string;
	entityType: string | null;
};

type WorkflowRow = {
	id: number;
	applicantId: number;
	startedAt: Date | null;
};

type RiskAssessmentSnapshot = {
	overallScore?: number | null;
	overallStatus?: string | null;
	aiAnalysis?: string | null;
};

const DEFAULT_SECTION_STATUS: SectionStatus = {
	machineState: "pending",
	reviewState: "pending",
};

const DEFAULT_PROCUREMENT: RiskReviewData["procurementData"] = null;

const DEFAULT_ITC: RiskReviewData["itcData"] = {
	creditScore: 0,
	scoreBand: "—",
	judgements: 0,
	defaults: 0,
	defaultDetails: "—",
	tradeReferences: "—",
	recentEnquiries: "—",
};

const DEFAULT_SANCTIONS: RiskReviewData["sanctionsData"] = {
	sanctionsMatch: "Pending",
	pepHits: 0,
	adverseMedia: 0,
	alerts: [],
};

const DEFAULT_FICA: RiskReviewData["ficaData"] = {
	identity: [],
	residence: {
		address: "—",
		documentType: "—",
		ageInDays: "—",
		status: "—",
	},
	lastVerified: "—",
	banking: {
		bankName: "—",
		accountNumber: "—",
		avsStatus: "—",
		avsDetails: "—",
	},
	documentAiResult: undefined,
	vatVerification: {
		checked: false,
		status: "not_checked",
	},
};

function safeJsonParse<T>(raw: string | null, fallback: T): T {
	if (!raw || typeof raw !== "string") return fallback;
	try {
		const parsed = JSON.parse(raw) as T;
		return typeof parsed === "object" && parsed !== null ? parsed : fallback;
	} catch {
		return fallback;
	}
}

function mergeProcurement(raw: string | null): ProcurementData | null {
	if (!raw) return DEFAULT_PROCUREMENT;
	const parsed = safeJsonParse<Record<string, unknown>>(raw, null);
	if (!parsed) return DEFAULT_PROCUREMENT;
	const result = ProcurementDataSchema.safeParse(parsed);
	if (!result.success) {
		console.warn("[buildReportData] Invalid procurement payload:", result.error.message);
		return DEFAULT_PROCUREMENT;
	}
	return result.data;
}

function mergeItc(
	parsed: Partial<RiskReviewData["itcData"]> | null
): RiskReviewData["itcData"] {
	if (!parsed) return DEFAULT_ITC;
	return {
		creditScore:
			typeof parsed.creditScore === "number"
				? parsed.creditScore
				: DEFAULT_ITC.creditScore,
		scoreBand: parsed.scoreBand ?? DEFAULT_ITC.scoreBand,
		judgements: parsed.judgements ?? DEFAULT_ITC.judgements,
		defaults: parsed.defaults ?? DEFAULT_ITC.defaults,
		defaultDetails: parsed.defaultDetails ?? DEFAULT_ITC.defaultDetails,
		tradeReferences: parsed.tradeReferences ?? DEFAULT_ITC.tradeReferences,
		recentEnquiries: parsed.recentEnquiries ?? DEFAULT_ITC.recentEnquiries,
	};
}

function mergeSanctions(
	parsed: Partial<RiskReviewData["sanctionsData"]> | null
): RiskReviewData["sanctionsData"] {
	if (!parsed) return DEFAULT_SANCTIONS;
	return {
		sanctionsMatch: parsed.sanctionsMatch ?? DEFAULT_SANCTIONS.sanctionsMatch,
		pepHits: parsed.pepHits ?? DEFAULT_SANCTIONS.pepHits,
		adverseMedia: parsed.adverseMedia ?? DEFAULT_SANCTIONS.adverseMedia,
		alerts: Array.isArray(parsed.alerts) ? parsed.alerts : DEFAULT_SANCTIONS.alerts,
	};
}

function mergeFica(
	parsed: Partial<RiskReviewData["ficaData"]> | null
): RiskReviewData["ficaData"] {
	if (!parsed) return DEFAULT_FICA;
	return {
		identity: Array.isArray(parsed.identity) ? parsed.identity : DEFAULT_FICA.identity,
		residence: parsed.residence
			? {
					address: parsed.residence.address ?? DEFAULT_FICA.residence.address,
					documentType:
						parsed.residence.documentType ?? DEFAULT_FICA.residence.documentType,
					ageInDays: parsed.residence.ageInDays ?? DEFAULT_FICA.residence.ageInDays,
					status: parsed.residence.status ?? DEFAULT_FICA.residence.status,
				}
			: DEFAULT_FICA.residence,
		lastVerified: parsed.lastVerified ?? DEFAULT_FICA.lastVerified,
		banking: parsed.banking
			? {
					bankName: parsed.banking.bankName ?? DEFAULT_FICA.banking.bankName,
					accountNumber:
						parsed.banking.accountNumber ?? DEFAULT_FICA.banking.accountNumber,
					avsStatus: parsed.banking.avsStatus ?? DEFAULT_FICA.banking.avsStatus,
					avsDetails: parsed.banking.avsDetails ?? DEFAULT_FICA.banking.avsDetails,
				}
			: DEFAULT_FICA.banking,
		documentAiResult: Array.isArray(parsed.documentAiResult)
			? parsed.documentAiResult
			: undefined,
		vatVerification: parsed.vatVerification
			? {
					checked: parsed.vatVerification.checked ?? false,
					status: parsed.vatVerification.status ?? "not_checked",
					errorState: parsed.vatVerification.errorState,
					vatNumber: parsed.vatVerification.vatNumber,
					tradingName: parsed.vatVerification.tradingName,
					office: parsed.vatVerification.office,
					message: parsed.vatVerification.message,
					checkedAt: parsed.vatVerification.checkedAt,
				}
			: DEFAULT_FICA.vatVerification,
	};
}

function extractVatVerificationFromAiAnalysis(
	aiAnalysisRaw?: string | null
): RiskReviewData["ficaData"]["vatVerification"] {
	const parseResult = parseAiAnalysisSnapshot(aiAnalysisRaw ?? null);
	if (!parseResult.ok) {
		return DEFAULT_FICA.vatVerification;
	}

	const snapshot = parseResult.value;
	const vatCheck = snapshot.externalChecks?.sarsVatSearch;
	if (!vatCheck) {
		return DEFAULT_FICA.vatVerification;
	}

	const firecrawlStatus = vatCheck.status === "live" ? "live" : "offline";
	const runtimeState = vatCheck.result?.runtimeState;
	const verified = vatCheck.result?.verified;
	const vatStatus = parseVatStatus(firecrawlStatus, runtimeState, verified);

	const isServiceDown = vatStatus === "service_down";
	const isErrorState =
		vatStatus === "timeout" || vatStatus === "error" || vatStatus === "manual_review";

	return {
		checked: !isServiceDown,
		status: vatStatus,
		errorState: isErrorState || isServiceDown ? vatStatus : undefined,
		vatNumber: vatCheck.result?.vatNumber,
		tradingName: vatCheck.result?.tradingName,
		office: vatCheck.result?.office,
		message: vatCheck.result?.successMessage || vatCheck.result?.failureMessage,
		checkedAt: snapshot.metadata?.analyzedAt,
	};
}

function buildSectionStatus(check: RiskCheckRow | undefined): SectionStatus {
	if (!check) return DEFAULT_SECTION_STATUS;
	return {
		machineState: parseMachineState(check.machineState),
		reviewState: parseReviewState(check.reviewState),
		provider: check.provider ?? undefined,
		errorDetails: check.errorDetails ?? undefined,
	};
}

function parseFinancialRiskRawOutput(
	raw: string | null | undefined
): RiskReviewData["bankStatementAnalysis"] {
	if (!raw?.trim()) return undefined;
	const parsed = safeJsonParse<FinancialRiskAgentResult | null>(raw, null);
	if (!parsed || typeof parsed !== "object" || !("available" in parsed)) {
		return undefined;
	}
	if (parsed.available === true) {
		return parsed;
	}
	return undefined;
}

function extractOverallSummary(
	assessment?: RiskAssessmentSnapshot | null
): Pick<RiskReviewData["globalData"], "overallRiskScore" | "overallStatus"> {
	const fallback = {
		overallRiskScore: 0,
		overallStatus: "PENDING",
	};

	if (!assessment) return fallback;

	const fromColumns = {
		overallRiskScore:
			typeof assessment.overallScore === "number"
				? assessment.overallScore
				: fallback.overallRiskScore,
		overallStatus: assessment.overallStatus?.trim() || fallback.overallStatus,
	};

	if (
		fromColumns.overallRiskScore !== fallback.overallRiskScore ||
		fromColumns.overallStatus !== fallback.overallStatus
	) {
		return fromColumns;
	}

	const parsed = safeJsonParse<Record<string, unknown> | null>(
		assessment.aiAnalysis ?? null,
		null
	);
	if (!parsed) return fallback;

	const scores =
		typeof parsed.scores === "object" && parsed.scores !== null
			? (parsed.scores as Record<string, unknown>)
			: null;
	const aggregatedScore =
		typeof scores?.aggregatedScore === "number"
			? scores.aggregatedScore
			: fallback.overallRiskScore;
	const recommendation =
		typeof parsed.recommendation === "string" && parsed.recommendation.trim()
			? parsed.recommendation.trim()
			: fallback.overallStatus;

	return {
		overallRiskScore: aggregatedScore,
		overallStatus: recommendation,
	};
}

export function buildReportData(
	applicant: ApplicantRow | null,
	workflow: WorkflowRow | null,
	riskChecks: RiskCheckRow[],
	financialRiskRawOutput?: string | null,
	assessment?: RiskAssessmentSnapshot | null
): RiskReviewData {
	const applicantId = applicant?.id ?? 0;
	const transactionId = workflow?.id ? `workflow-${workflow.id}` : `risk-${applicantId}`;
	const generatedAt = workflow?.startedAt
		? new Date(workflow.startedAt).toISOString()
		: new Date().toISOString();

	const checkMap = new Map(riskChecks.map(c => [c.checkType, c]));

	const procCheck = checkMap.get("PROCUREMENT");

	const itcCheck = checkMap.get("ITC");
	const itcParsed = itcCheck?.payload
		? safeJsonParse<Partial<RiskReviewData["itcData"]>>(itcCheck.payload, null)
		: null;

	const sancCheck = checkMap.get("SANCTIONS");
	const sanctionsParsed = sancCheck?.payload
		? safeJsonParse<Partial<RiskReviewData["sanctionsData"]>>(sancCheck.payload, null)
		: null;

	const ficaCheck = checkMap.get("FICA");
	const ficaParsed = ficaCheck?.payload
		? safeJsonParse<Partial<RiskReviewData["ficaData"]>>(ficaCheck.payload, null)
		: null;
	const vatVerification = extractVatVerificationFromAiAnalysis(
		assessment?.aiAnalysis ?? null
	);
	const mergedFica = mergeFica(ficaParsed);
	const mergedProcurement = mergeProcurement(procCheck?.payload ?? null);
	const overallSummary = extractOverallSummary(assessment);

	return {
		workflowId: workflow?.id ?? 0,
		applicantId,
		globalData: {
			transactionId,
			generatedAt,
			overallStatus: overallSummary.overallStatus,
			overallRiskScore: overallSummary.overallRiskScore,
			entity: {
				name: applicant?.companyName ?? "Unknown",
				tradingAs: applicant?.tradingName ?? undefined,
				registrationNumber: applicant?.registrationNumber ?? undefined,
				entityType: applicant?.entityType ?? undefined,
				registeredAddress: mergedProcurement?.vendor.registeredAddress || "—",
			},
		},
		sectionStatuses: {
			procurement: buildSectionStatus(procCheck),
			itc: buildSectionStatus(itcCheck),
			sanctions: buildSectionStatus(sancCheck),
			fica: buildSectionStatus(ficaCheck),
		},
		procurementData: mergedProcurement,
		itcData: mergeItc(itcParsed),
		sanctionsData: mergeSanctions(sanctionsParsed),
		ficaData: {
			...mergedFica,
			vatVerification,
		},
		bankStatementAnalysis: parseFinancialRiskRawOutput(financialRiskRawOutput),
		externalScreeningUi: { industryRegulator: false, socialReputation: false },
	};
}
