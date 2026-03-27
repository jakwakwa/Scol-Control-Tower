import { desc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { applicants, riskAssessments, workflows } from "@/db/schema";
import type {
	ApplicantData,
	IndustryRegulatorCheckResult,
	SocialReputationCheckResult,
} from "@/lib/services/agents/contracts/firecrawl-check.contracts";
import { isFirecrawlConfigured } from "@/lib/services/firecrawl";
import type * as schema from "@/db/schema";

export type ManualFirecrawlCheckKind = "industry" | "social";

export type ExternalCheckPersistSlot = {
	status: "live" | "offline";
	result: Record<string, unknown>;
};

function safeJsonRecord(value: unknown): Record<string, unknown> {
	return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

/**
 * Industry / social checks may run when Firecrawl is configured and either the
 * per-check pipeline flag is set or ops enables manual-only screening.
 */
export function assertManualFirecrawlAllowed(
	kind: ManualFirecrawlCheckKind
): { ok: true } | { ok: false; status: number; error: string } {
	if (!isFirecrawlConfigured()) {
		return { ok: false, status: 503, error: "Firecrawl is not configured" };
	}
	const manual = process.env.ENABLE_MANUAL_FIRECRAWL_SCREENING === "true";
	const industryOn = process.env.ENABLE_FIRECRAWL_INDUSTRY_REG === "true";
	const socialOn = process.env.ENABLE_FIRECRAWL_SOCIAL_REP === "true";
	if (kind === "industry" && !manual && !industryOn) {
		return {
			ok: false,
			status: 403,
			error: "Industry regulator checks are disabled (enable ENABLE_FIRECRAWL_INDUSTRY_REG or ENABLE_MANUAL_FIRECRAWL_SCREENING)",
		};
	}
	if (kind === "social" && !manual && !socialOn) {
		return {
			ok: false,
			status: 403,
			error: "Social reputation checks are disabled (enable ENABLE_FIRECRAWL_SOCIAL_REP or ENABLE_MANUAL_FIRECRAWL_SCREENING)",
		};
	}
	return { ok: true };
}

/**
 * Whether each external screening action should appear in the risk review UI.
 * Matches {@link assertManualFirecrawlAllowed} (Firecrawl configured + env flags).
 */
export function getExternalScreeningUiAvailability(): {
	industryRegulator: boolean;
	socialReputation: boolean;
} {
	if (!isFirecrawlConfigured()) {
		return { industryRegulator: false, socialReputation: false };
	}
	const manual = process.env.ENABLE_MANUAL_FIRECRAWL_SCREENING === "true";
	const industryOn = process.env.ENABLE_FIRECRAWL_INDUSTRY_REG === "true";
	const socialOn = process.env.ENABLE_FIRECRAWL_SOCIAL_REP === "true";
	return {
		industryRegulator: manual || industryOn,
		socialReputation: manual || socialOn,
	};
}

export function industryResultToExternalSlot(
	fc: IndustryRegulatorCheckResult
): ExternalCheckPersistSlot {
	return {
		status: fc.status === "live" ? "live" : "offline",
		result: {
			...safeJsonRecord(fc.result),
			runtimeState: fc.runtimeState,
			metadata: safeJsonRecord(fc.metadata),
		},
	};
}

export function socialResultToExternalSlot(
	fc: SocialReputationCheckResult
): ExternalCheckPersistSlot {
	return {
		status: fc.status === "live" ? "live" : "offline",
		result: {
			...safeJsonRecord(fc.result),
			runtimeState: fc.runtimeState,
			metadata: safeJsonRecord(fc.metadata),
		},
	};
}

function parseAiAnalysisObject(raw: string | null | undefined): Record<string, unknown> {
	if (!raw || typeof raw !== "string" || raw.trim() === "") {
		return {};
	}
	try {
		const parsed: unknown = JSON.parse(raw);
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			return parsed as Record<string, unknown>;
		}
	} catch {
		// fall through
	}
	return {};
}

/**
 * Merges one externalChecks slot into risk_assessments.aiAnalysis JSON.
 */
export function mergeExternalCheckIntoAiAnalysisJson(
	currentJson: string | null | undefined,
	slotKey: "industryRegulator" | "socialReputation",
	slot: ExternalCheckPersistSlot
): string {
	const root = parseAiAnalysisObject(currentJson ?? null);
	const externalChecks =
		root.externalChecks && typeof root.externalChecks === "object" && !Array.isArray(root.externalChecks)
			? { ...(root.externalChecks as Record<string, unknown>) }
			: {};
	externalChecks[slotKey] = slot;
	root.externalChecks = externalChecks;
	const meta =
		root.metadata && typeof root.metadata === "object" && !Array.isArray(root.metadata)
			? { ...(root.metadata as Record<string, unknown>) }
			: {};
	meta.analyzedAt = new Date().toISOString();
	meta.lastManualExternalCheckAt = meta.analyzedAt;
	root.metadata = meta;
	return JSON.stringify(root);
}

type Db = LibSQLDatabase<typeof schema>;

export async function loadApplicantAndWorkflowId(
	db: Db,
	applicantId: number
): Promise<{
	applicant: typeof applicants.$inferSelect | null;
	workflowId: number;
}> {
	const applicantRows = await db
		.select()
		.from(applicants)
		.where(eq(applicants.id, applicantId))
		.limit(1);
	const applicant = applicantRows[0] ?? null;

	const workflowRows = await db
		.select({ id: workflows.id })
		.from(workflows)
		.where(eq(workflows.applicantId, applicantId))
		.orderBy(desc(workflows.startedAt))
		.limit(1);

	const workflowId = workflowRows[0]?.id ?? 0;

	return { applicant, workflowId };
}

export function applicantRowToApplicantData(
	row: typeof applicants.$inferSelect
): ApplicantData {
	return {
		companyName: row.companyName,
		contactName: row.contactName,
		registrationNumber: row.registrationNumber ?? undefined,
		industry: row.industry ?? undefined,
		countryCode: "ZA",
	};
}

/**
 * Upserts merged aiAnalysis onto the latest risk_assessments row for the applicant.
 */
export async function persistMergedAiAnalysis(
	db: Db,
	applicantId: number,
	mergedJson: string
): Promise<void> {
	const rows = await db
		.select({ id: riskAssessments.id })
		.from(riskAssessments)
		.where(eq(riskAssessments.applicantId, applicantId))
		.orderBy(desc(riskAssessments.createdAt))
		.limit(1);

	if (rows.length > 0) {
		await db
			.update(riskAssessments)
			.set({ aiAnalysis: mergedJson })
			.where(eq(riskAssessments.id, rows[0].id));
	} else {
		await db.insert(riskAssessments).values({
			applicantId,
			aiAnalysis: mergedJson,
			overallRisk: "amber",
		});
	}
}
