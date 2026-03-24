/**
 * Financial Risk Agent — bank statement analysis (Gemini structured JSON).
 *
 * Multi-stage: pass `stage` when invoking (e.g. 4 today; stage 1+ later).
 * Persists every outcome to `ai_analysis_logs` (including no-document / errors).
 * Never throws: callers (e.g. Inngest) always proceed.
 */

import { and, desc, eq, inArray } from "drizzle-orm";
import { MediaResolution, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { aiAnalysisLogs, documents } from "@/db/schema";
import { getGenAIClient, isAIConfigured } from "@/lib/ai/models";

export const FINANCIAL_RISK_AGENT_NAME = "financial-risk-agent" as const;

const BANK_DOCUMENT_TYPES = ["BANK_STATEMENT", "BANK_STATEMENT_3_MONTH"] as const;

const FINANCIAL_RISK_MODEL =
	process.env.FINANCIAL_RISK_GEMINI_MODEL ?? "gemini-3-flash-preview";

// Core schema from playground (structured output) — validated after model response
const FinancialRiskCoreSchema = z.object({
	bankAnalysis: z.object({
		accountType: z.string(),
		bankName: z.string(),
		averageBalance: z.number(),
		minimumBalance: z.number(),
		maximumBalance: z.number(),
		volatilityScore: z.number(),
	}),
	cashFlow: z.object({
		totalCredits: z.number(),
		totalDebits: z.number(),
		netCashFlow: z.number(),
		regularIncomeDetected: z.boolean(),
		consistencyScore: z.number(),
	}),
	stability: z.object({
		overallScore: z.number(),
		debtIndicators: z.array(z.string()),
		gamblingIndicators: z.array(z.string()),
		loanRepayments: z.number(),
		hasBounced: z.boolean(),
		bouncedCount: z.number(),
		bouncedAmount: z.number(),
	}),
	creditRisk: z.object({
		riskCategory: z.enum(["LOW", "MEDIUM", "HIGH", "VERY_HIGH"]),
		riskScore: z.number(),
		affordabilityRatio: z.number(),
		redFlags: z.array(z.string()),
		positiveIndicators: z.array(z.string()),
	}),
	overall: z.object({
		score: z.number(),
	}),
});

export interface FinancialRiskAgentInput {
	workflowId: number;
	applicantId: number;
	stage: 1 | 2 | 3 | 4 | 5 | 6;
	bankStatementBase64?: string;
	bankStatementText?: string;
	bankStatementMimeType?: string;
}

export interface FinancialRiskAnalysisResult {
	available: true;
	bankAnalysis: z.infer<typeof FinancialRiskCoreSchema>["bankAnalysis"];
	cashFlow: z.infer<typeof FinancialRiskCoreSchema>["cashFlow"];
	stability: z.infer<typeof FinancialRiskCoreSchema>["stability"];
	creditRisk: z.infer<typeof FinancialRiskCoreSchema>["creditRisk"];
	overall: z.infer<typeof FinancialRiskCoreSchema>["overall"];
}

export type FinancialRiskAgentResult =
	| FinancialRiskAnalysisResult
	| { available: false; reason: string };

function normalizeBase64(raw: string): string {
	return raw.replace(/^data:application\/pdf;base64,/, "").trim();
}

async function insertLog(
	input: FinancialRiskAgentInput,
	result: FinancialRiskAgentResult
): Promise<void> {
	const db = getDatabaseClient();
	if (!db) {
		console.warn("[FinancialRiskAgent] No DB — cannot persist ai_analysis_logs");
		return;
	}

	const narrative =
		result.available === true
			? `Risk: ${result.creditRisk.riskCategory} | Score: ${result.overall.score}`
			: `Unavailable: ${result.reason}`;

	await db.insert(aiAnalysisLogs).values({
		applicantId: input.applicantId,
		workflowId: input.workflowId,
		agentName: FINANCIAL_RISK_AGENT_NAME,
		promptVersionId: `stage-${input.stage}-v1`,
		confidenceScore:
			result.available === true ? Math.round(result.overall.score) : 0,
		narrative,
		rawOutput: JSON.stringify(result),
		createdAt: new Date(),
	});
}

async function resolveBankStatementContent(
	input: FinancialRiskAgentInput
): Promise<{
	base64?: string;
	text?: string;
	mimeType: string;
} | null> {
	if (input.bankStatementText?.trim()) {
		return { text: input.bankStatementText, mimeType: "text/plain" };
	}
	if (input.bankStatementBase64?.trim()) {
		return {
			base64: normalizeBase64(input.bankStatementBase64),
			mimeType: input.bankStatementMimeType ?? "application/pdf",
		};
	}

	const db = getDatabaseClient();
	if (!db) return null;

	const rows = await db
		.select({
			fileContent: documents.fileContent,
			mimeType: documents.mimeType,
		})
		.from(documents)
		.where(
			and(
				eq(documents.applicantId, input.applicantId),
				inArray(documents.type, [...BANK_DOCUMENT_TYPES])
			)
		)
		.orderBy(desc(documents.uploadedAt))
		.limit(1);

	const row = rows[0];
	if (!row?.fileContent?.trim()) return null;

	const mime = row.mimeType?.trim() || "application/pdf";
	if (mime === "application/pdf" || mime.startsWith("image/")) {
		return { base64: normalizeBase64(row.fileContent), mimeType: mime };
	}
	// Fallback: treat as plain text (e.g. extracted text stored)
	return { text: row.fileContent, mimeType: mime };
}

const SYSTEM_INSTRUCTION = `You are an expert Financial Risk Analyst evaluating a company for a debit order mandate facility.
Your goal is to assess their financial stability, cash flow consistency, and overall credit risk based on the provided data.

- Use only data explicitly present in the provided statement/applicant context.
- Do NOT infer or invent requested mandate values, addresses, balances, transaction details, or business facts.
- If a value cannot be proven from the evidence, set it to 0/UNKNOWN and include a red flag explaining missing evidence.`;

const USER_PROMPT = `Analyse the attached bank statement (or extracted content) and return JSON matching the required schema. Monetary amounts must be in cents.`;

async function runGeminiAnalysis(params: {
	base64?: string;
	text?: string;
	mimeType: string;
}): Promise<FinancialRiskAnalysisResult> {
	const ai = getGenAIClient();

	const contents =
		params.base64 != null
			? [
					{ text: USER_PROMPT },
					{
						inlineData: {
							mimeType: params.mimeType,
							data: params.base64,
						},
					},
				]
			: [
					{
						text: `${USER_PROMPT}\n\nBANK STATEMENT TEXT:\n${(params.text ?? "").slice(0, 50000)}`,
					},
				];

	const stream = await ai.models.generateContentStream({
		model: FINANCIAL_RISK_MODEL,
		config: {
			systemInstruction: SYSTEM_INSTRUCTION,
			responseMimeType: "application/json",
			responseJsonSchema: z.toJSONSchema(FinancialRiskCoreSchema),
			mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
			thinkingConfig: {
				thinkingLevel: ThinkingLevel.HIGH,
			},
		},
		contents,
	});

	let raw = "";
	for await (const chunk of stream) {
		const t = typeof chunk.text === "string" ? chunk.text : "";
		raw += t;
	}

	const parsed = FinancialRiskCoreSchema.parse(JSON.parse(raw));
	return { available: true, ...parsed };
}

/**
 * Loads bank statement (DB or overrides), runs Gemini analysis, persists to `ai_analysis_logs`.
 * Does not throw — failures are logged and stored as `{ available: false, reason }`.
 */
export async function runFinancialRiskAgent(input: FinancialRiskAgentInput): Promise<void> {
	try {
		if (!isAIConfigured()) {
			await insertLog(input, {
				available: false,
				reason: "AI not configured (GOOGLE_GENAI_KEY missing)",
			});
			return;
		}

		const resolved = await resolveBankStatementContent(input);
		if (!resolved) {
			await insertLog(input, {
				available: false,
				reason: "No bank statement document found for applicant",
			});
			return;
		}

		const result = await runGeminiAnalysis(resolved);
		await insertLog(input, result);
	} catch (error) {
		console.error("[FinancialRiskAgent] run failed:", error);
		const message =
			error instanceof Error ? error.message : String(error);
		try {
			await insertLog(input, {
				available: false,
				reason: `Analysis failed: ${message}`,
			});
		} catch (persistErr) {
			console.error("[FinancialRiskAgent] Failed to persist error log:", persistErr);
		}
	}
}
