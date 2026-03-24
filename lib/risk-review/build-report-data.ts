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

const DEFAULT_SECTION_STATUS: SectionStatus = {
	machineState: "pending",
	reviewState: "pending",
};

const DEFAULT_PROCUREMENT: RiskReviewData["procurementData"] = {
	cipcStatus: "Pending",
	taxStatus: "Pending",
	taxExpiry: "—",
	beeLevel: "—",
	beeExpiry: "—",
	riskAlerts: [],
	checks: [],
	directors: [],
};

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

function mergeProcurement(
	parsed: Partial<RiskReviewData["procurementData"]> | null
): RiskReviewData["procurementData"] {
	if (!parsed) return DEFAULT_PROCUREMENT;
	return {
		cipcStatus: parsed.cipcStatus ?? DEFAULT_PROCUREMENT.cipcStatus,
		taxStatus: parsed.taxStatus ?? DEFAULT_PROCUREMENT.taxStatus,
		taxExpiry: parsed.taxExpiry ?? DEFAULT_PROCUREMENT.taxExpiry,
		beeLevel: parsed.beeLevel ?? DEFAULT_PROCUREMENT.beeLevel,
		beeExpiry: parsed.beeExpiry ?? DEFAULT_PROCUREMENT.beeExpiry,
		riskAlerts: Array.isArray(parsed.riskAlerts)
			? parsed.riskAlerts
			: DEFAULT_PROCUREMENT.riskAlerts,
		checks: Array.isArray(parsed.checks) ? parsed.checks : DEFAULT_PROCUREMENT.checks,
		directors: Array.isArray(parsed.directors)
			? parsed.directors
			: DEFAULT_PROCUREMENT.directors,
	};
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
	};
}

function buildSectionStatus(check: RiskCheckRow | undefined): SectionStatus {
	if (!check) return DEFAULT_SECTION_STATUS;
	return {
		machineState: check.machineState as SectionStatus["machineState"],
		reviewState: check.reviewState as SectionStatus["reviewState"],
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

export function buildReportData(
	applicant: ApplicantRow | null,
	workflow: WorkflowRow | null,
	riskChecks: RiskCheckRow[],
	financialRiskRawOutput?: string | null
): RiskReviewData {
	const applicantId = applicant?.id ?? 0;
	const transactionId = workflow?.id ? `workflow-${workflow.id}` : `risk-${applicantId}`;
	const generatedAt = workflow?.startedAt
		? new Date(workflow.startedAt).toISOString()
		: new Date().toISOString();

	const checkMap = new Map(
		riskChecks.map(c => [c.checkType, c])
	);

	const procCheck = checkMap.get("PROCUREMENT");
	const procurementParsed = procCheck?.payload
		? safeJsonParse<Partial<RiskReviewData["procurementData"]>>(procCheck.payload, null)
		: null;

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

	return {
		workflowId: workflow?.id ?? 0,
		applicantId,
		globalData: {
			transactionId,
			generatedAt,
			overallStatus: "PENDING",
			overallRiskScore: 0,
			entity: {
				name: applicant?.companyName ?? "Unknown",
				tradingAs: applicant?.tradingName ?? undefined,
				registrationNumber: applicant?.registrationNumber ?? undefined,
				entityType: applicant?.entityType ?? undefined,
				registeredAddress: "—",
			},
		},
		sectionStatuses: {
			procurement: buildSectionStatus(procCheck),
			itc: buildSectionStatus(itcCheck),
			sanctions: buildSectionStatus(sancCheck),
			fica: buildSectionStatus(ficaCheck),
		},
		procurementData: mergeProcurement(procurementParsed),
		itcData: mergeItc(itcParsed),
		sanctionsData: mergeSanctions(sanctionsParsed),
		ficaData: mergeFica(ficaParsed),
		bankStatementAnalysis: parseFinancialRiskRawOutput(financialRiskRawOutput),
	};
}
