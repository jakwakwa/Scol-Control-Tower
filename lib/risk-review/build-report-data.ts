import type { RiskReviewData } from "@/components/dashboard/risk-review/risk-review-detail";

type ApplicantRow = {
	id: number;
	companyName: string;
	tradingName: string | null;
	registrationNumber: string | null;
	contactName: string;
	entityType: string | null;
};

type RiskAssessmentRow = {
	overallScore: number | null;
	overallStatus: string | null;
	procurementData: string | null;
	itcData: string | null;
	sanctionsData: string | null;
	ficaData: string | null;
	createdAt: Date | null;
};

type WorkflowRow = {
	id: number;
	applicantId: number;
	startedAt: Date | null;
};

const DEFAULT_PROCUREMENT = {
	cipcStatus: "Pending",
	taxStatus: "Pending",
	taxExpiry: "—",
	beeLevel: "—",
	beeExpiry: "—",
	riskAlerts: [] as RiskReviewData["procurementData"]["riskAlerts"],
	checks: [] as RiskReviewData["procurementData"]["checks"],
	directors: [] as RiskReviewData["procurementData"]["directors"],
};

const DEFAULT_ITC = {
	creditScore: 0,
	scoreBand: "—",
	judgements: 0,
	defaults: 0,
	defaultDetails: "—",
	tradeReferences: "—",
	recentEnquiries: "—",
};

const DEFAULT_SANCTIONS = {
	sanctionsMatch: "Pending",
	pepHits: 0,
	adverseMedia: 0,
	alerts: [] as RiskReviewData["sanctionsData"]["alerts"],
};

const DEFAULT_FICA = {
	identity: [] as RiskReviewData["ficaData"]["identity"],
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

export function buildReportData(
	applicant: ApplicantRow | null,
	riskAssessment: RiskAssessmentRow | null,
	workflow: WorkflowRow | null
): RiskReviewData {
	const applicantId = applicant?.id ?? 0;
	const transactionId = workflow?.id ? `workflow-${workflow.id}` : `risk-${applicantId}`;
	const generatedAt = (() => {
		const ts = riskAssessment?.createdAt ?? workflow?.startedAt;
		return ts ? new Date(ts).toISOString() : new Date().toISOString();
	})();
	const overallStatus = riskAssessment?.overallStatus ?? "PENDING";
	const overallRiskScore = riskAssessment?.overallScore ?? 0;

	const procurementParsed = safeJsonParse<Partial<
		RiskReviewData["procurementData"]
	> | null>(riskAssessment?.procurementData ?? null, null);
	const itcParsed = safeJsonParse<Partial<RiskReviewData["itcData"]> | null>(
		riskAssessment?.itcData ?? null,
		null
	);
	const sanctionsParsed = safeJsonParse<Partial<RiskReviewData["sanctionsData"]> | null>(
		riskAssessment?.sanctionsData ?? null,
		null
	);
	const ficaParsed = safeJsonParse<Partial<RiskReviewData["ficaData"]> | null>(
		riskAssessment?.ficaData ?? null,
		null
	);

	return {
		globalData: {
			transactionId,
			generatedAt,
			overallStatus,
			overallRiskScore,
			entity: {
				name: applicant?.companyName ?? "Unknown",
				tradingAs: applicant?.tradingName ?? undefined,
				registrationNumber: applicant?.registrationNumber ?? undefined,
				entityType: applicant?.entityType ?? undefined,
				registeredAddress: "—",
			},
		},
		procurementData: mergeProcurement(procurementParsed),
		itcData: mergeItc(itcParsed),
		sanctionsData: mergeSanctions(sanctionsParsed),
		ficaData: mergeFica(ficaParsed),
	};
}
