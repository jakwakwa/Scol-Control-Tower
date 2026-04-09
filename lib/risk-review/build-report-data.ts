import { type ProcurementData, ProcurementDataSchema } from "@/lib/procurecheck/types";
import {
	parseAiAnalysisSnapshot,
	parseMachineState,
	parseReviewState,
	parseStoredVatStatus,
	parseVatStatus,
} from "@/lib/risk-review/parsers/vat.parser";
import type {
	DocumentAiProofingEntity,
	RiskReviewData,
	SectionStatus,
} from "@/lib/risk-review/types";
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

/**
 * Parse JSON to a plain object for report merges. Arrays and primitives yield null.
 */
export function parseReportJsonObject(raw: string | null): Record<string, unknown> | null {
	if (!raw || typeof raw !== "string") return null;
	try {
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
			return null;
		}
		return parsed as Record<string, unknown>;
	} catch {
		return null;
	}
}

function mergeProcurement(raw: string | null): ProcurementData | null {
	if (!raw) return DEFAULT_PROCUREMENT;
	const parsed = parseReportJsonObject(raw);
	if (!parsed) return DEFAULT_PROCUREMENT;
	const result = ProcurementDataSchema.safeParse(parsed);
	if (!result.success) {
		console.warn("[buildReportData] Invalid procurement payload:", result.error.message);
		return DEFAULT_PROCUREMENT;
	}
	return result.data;
}

function mergeItcNumberOrString(
	raw: unknown,
	fallback: number | string
): number | string {
	if (typeof raw === "number" || typeof raw === "string") return raw;
	return fallback;
}

function mergeItc(parsed: Record<string, unknown> | null): RiskReviewData["itcData"] {
	if (!parsed) return DEFAULT_ITC;
	return {
		creditScore:
			typeof parsed.creditScore === "number"
				? parsed.creditScore
				: DEFAULT_ITC.creditScore,
		scoreBand:
			typeof parsed.scoreBand === "string" ? parsed.scoreBand : DEFAULT_ITC.scoreBand,
		judgements: mergeItcNumberOrString(parsed.judgements, DEFAULT_ITC.judgements),
		defaults: mergeItcNumberOrString(parsed.defaults, DEFAULT_ITC.defaults),
		defaultDetails:
			typeof parsed.defaultDetails === "string"
				? parsed.defaultDetails
				: DEFAULT_ITC.defaultDetails,
		tradeReferences: mergeItcNumberOrString(
			parsed.tradeReferences,
			DEFAULT_ITC.tradeReferences
		),
		recentEnquiries: mergeItcNumberOrString(
			parsed.recentEnquiries,
			DEFAULT_ITC.recentEnquiries
		),
	};
}

function mergeSanctions(parsed: Record<string, unknown> | null): RiskReviewData["sanctionsData"] {
	if (!parsed) return DEFAULT_SANCTIONS;
	return {
		sanctionsMatch:
			typeof parsed.sanctionsMatch === "string"
				? parsed.sanctionsMatch
				: DEFAULT_SANCTIONS.sanctionsMatch,
		pepHits: mergeItcNumberOrString(parsed.pepHits, DEFAULT_SANCTIONS.pepHits),
		adverseMedia: mergeItcNumberOrString(
			parsed.adverseMedia,
			DEFAULT_SANCTIONS.adverseMedia
		),
		alerts: Array.isArray(parsed.alerts)
			? (parsed.alerts as RiskReviewData["sanctionsData"]["alerts"])
			: DEFAULT_SANCTIONS.alerts,
	};
}

function mergeFica(parsed: Record<string, unknown> | null): RiskReviewData["ficaData"] {
	if (!parsed) return DEFAULT_FICA;
	const residenceRaw = parsed.residence;
	const residence =
		residenceRaw &&
		typeof residenceRaw === "object" &&
		!Array.isArray(residenceRaw)
			? (() => {
					const r = residenceRaw as Record<string, unknown>;
					return {
						address:
							typeof r.address === "string" ? r.address : DEFAULT_FICA.residence.address,
						documentType:
							typeof r.documentType === "string"
								? r.documentType
								: DEFAULT_FICA.residence.documentType,
						ageInDays:
							typeof r.ageInDays === "number" || typeof r.ageInDays === "string"
								? r.ageInDays
								: DEFAULT_FICA.residence.ageInDays,
						status:
							typeof r.status === "string" ? r.status : DEFAULT_FICA.residence.status,
					};
				})()
			: DEFAULT_FICA.residence;

	const bankingRaw = parsed.banking;
	const banking =
		bankingRaw && typeof bankingRaw === "object" && !Array.isArray(bankingRaw)
			? (() => {
					const b = bankingRaw as Record<string, unknown>;
					return {
						bankName:
							typeof b.bankName === "string" ? b.bankName : DEFAULT_FICA.banking.bankName,
						accountNumber:
							typeof b.accountNumber === "string"
								? b.accountNumber
								: DEFAULT_FICA.banking.accountNumber,
						avsStatus:
							typeof b.avsStatus === "string"
								? b.avsStatus
								: DEFAULT_FICA.banking.avsStatus,
						avsDetails:
							typeof b.avsDetails === "string"
								? b.avsDetails
								: DEFAULT_FICA.banking.avsDetails,
					};
				})()
			: DEFAULT_FICA.banking;

	return {
		identity: Array.isArray(parsed.identity) ? parsed.identity : DEFAULT_FICA.identity,
		residence,
		lastVerified:
			typeof parsed.lastVerified === "string"
				? parsed.lastVerified
				: DEFAULT_FICA.lastVerified,
		banking,
		documentAiResult: Array.isArray(parsed.documentAiResult)
			? (parsed.documentAiResult as RiskReviewData["ficaData"]["documentAiResult"])
			: undefined,
		vatVerification: (() => {
			const vv = parsed.vatVerification;
			if (!vv || typeof vv !== "object" || Array.isArray(vv)) {
				return DEFAULT_FICA.vatVerification;
			}
			const v = vv as Record<string, unknown>;
			return {
				checked: typeof v.checked === "boolean" ? v.checked : false,
				status: parseStoredVatStatus(v.status),
				errorState:
					v.errorState !== undefined ? parseStoredVatStatus(v.errorState) : undefined,
				vatNumber: typeof v.vatNumber === "string" ? v.vatNumber : undefined,
				tradingName: typeof v.tradingName === "string" ? v.tradingName : undefined,
				office: typeof v.office === "string" ? v.office : undefined,
				message: typeof v.message === "string" ? v.message : undefined,
				checkedAt: typeof v.checkedAt === "string" ? v.checkedAt : undefined,
			};
		})(),
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
	const parsed = parseReportJsonObject(raw);
	if (!parsed) {
		return undefined;
	}
	if (!("available" in parsed)) {
		return undefined;
	}
	const candidate = parsed as unknown as FinancialRiskAgentResult;
	if (candidate.available === true) {
		return candidate;
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

	const parsed = parseReportJsonObject(assessment.aiAnalysis ?? null);
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
	assessment?: RiskAssessmentSnapshot | null,
	documentAiResult?: DocumentAiProofingEntity[]
): RiskReviewData {
	const applicantId = applicant?.id ?? 0;
	const transactionId = workflow?.id ? `workflow-${workflow.id}` : `risk-${applicantId}`;
	const generatedAt = workflow?.startedAt
		? new Date(workflow.startedAt).toISOString()
		: new Date().toISOString();

	const checkMap = new Map(riskChecks.map(c => [c.checkType, c]));

	const procCheck = checkMap.get("PROCUREMENT");

	const itcCheck = checkMap.get("ITC");
	const itcParsed = itcCheck?.payload ? parseReportJsonObject(itcCheck.payload) : null;

	const sancCheck = checkMap.get("SANCTIONS");
	const sanctionsParsed = sancCheck?.payload
		? parseReportJsonObject(sancCheck.payload)
		: null;

	const ficaCheck = checkMap.get("FICA");
	const ficaParsed = ficaCheck?.payload ? parseReportJsonObject(ficaCheck.payload) : null;
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
			documentAiResult: mergedFica.documentAiResult ?? documentAiResult,
			vatVerification,
		},
		bankStatementAnalysis: parseFinancialRiskRawOutput(financialRiskRawOutput),
		externalScreeningUi: { industryRegulator: false, socialReputation: false },
	};
}
