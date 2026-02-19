/**
 * Quote service - quote generation operations
 */
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { applicants, quotes } from "@/db/schema";
import { AI_CONFIG, getThinkingModel, isAIConfigured } from "@/lib/ai/models";
import type { QuoteGenerationResult } from "@/lib/validations/quotes";
import { quoteGenerationSchema } from "@/lib/validations/quotes";

type ApplicantRow = typeof applicants.$inferSelect;

export interface Quote {
	quoteId: string;
	amount: number;
	baseFeePercent: number;
	adjustedFeePercent?: number | null;
	rationale?: string | null;
	details?: string | null;
	terms?: string;
}

/**
 * Generate a quote for an applicant using external quote service
 */
export interface QuoteResult {
	success: boolean;
	quote?: Quote;
	error?: string;
	recoverable?: boolean;
	async?: boolean;
}

/**
 * Generate a quote for an applicant using internal Gemini AI
 */
export async function generateQuote(
	applicantId: number,
	workflowId: number
): Promise<QuoteResult> {
	const db = getDatabaseClient();
	if (!db) {
		return {
			success: false,
			error: "Database connection failed",
			recoverable: true,
		};
	}

	let applicantData: ApplicantRow | null = null;
	try {
		const applicantResults = await db
			.select()
			.from(applicants)
			.where(eq(applicants.id, applicantId));
		if (applicantResults.length > 0) {
			applicantData = applicantResults[0];
		}
	} catch (err) {
		console.error("[QuoteService] Failed to fetch applicant:", err);
		return {
			success: false,
			error: `Database Error: ${err instanceof Error ? err.message : String(err)}`,
			recoverable: true,
		};
	}

	if (!applicantData) {
		return {
			success: false,
			error: `Applicant ${applicantId} not found`,
			recoverable: false,
		};
	}

	try {
		const quoteDetails = await generateQuoteWithAI(applicantData, workflowId);
		const detailsJson = JSON.stringify({
			riskFactors: quoteDetails.riskFactors,
			recommendation: quoteDetails.recommendation,
			source: "gemini",
			generatedAt: new Date().toISOString(),
		});

		const quoteResults = await db
			.insert(quotes)
			.values({
				workflowId,
				applicantId,
				amount: quoteDetails.amount,
				baseFeePercent: quoteDetails.baseFeePercent,
				adjustedFeePercent: quoteDetails.adjustedFeePercent,
				rationale: quoteDetails.rationale,
				details: detailsJson,
				generatedBy: "gemini",
				status: "draft",
			})
			.returning();

		const createdQuote = quoteResults[0];
		const quote: Quote = {
			quoteId: String(createdQuote.id),
			amount: createdQuote.amount,
			baseFeePercent: createdQuote.baseFeePercent,
			adjustedFeePercent: createdQuote.adjustedFeePercent ?? null,
			rationale: createdQuote.rationale ?? null,
			details: createdQuote.details ?? null,
			terms: "Standard terms",
		};

		await notifyQuoteGenerated({
			applicantId,
			workflowId,
			companyName: applicantData.companyName,
			quote,
		});

		return {
			success: true,
			quote,
		};
	} catch (error) {
		console.error("[QuoteService] Quote generation failed:", error);
		return {
			success: false,
			error: `Quote Generation Error: ${error instanceof Error ? error.message : String(error)}`,
			recoverable: true,
		};
	}
}

async function generateQuoteWithAI(
	applicantData: ApplicantRow,
	_workflowId: number
): Promise<QuoteGenerationResult> {
	const prompt = `You are a pricing analyst generating a merchant services quote for StratCol.

APPLICANT DETAILS:
- Company: ${applicantData.companyName}
- Industry: ${applicantData.industry || "Not provided"}
- Employee count: ${applicantData.employeeCount ?? "Not provided"}
- Mandate volume (cents): ${applicantData.mandateVolume ?? "Not provided"}
- ITC score: ${applicantData.itcScore ?? "Not provided"}
- Mandate type: ${applicantData.mandateType ?? "Not provided"}

OUTPUT REQUIREMENTS:
- amount: integer in cents (ZAR)
- baseFeePercent: basis points (e.g. 150 = 1.5%)
- adjustedFeePercent: basis points (risk adjusted)
- rationale: 3-6 sentences explaining pricing logic
- riskFactors: list of short risk notes
- recommendation: STANDARD, PREMIUM, or HIGH_RISK

RULES:
- If mandate volume is missing, assume 5,000,000 cents (R50,000).
- Keep adjustedFeePercent within 50-500 bps.
- Use ITC score to adjust risk and pricing.`;

	if (!isAIConfigured()) {
		throw new Error(
			"[QuoteService] AI is not configured. Set GOOGLE_GENERATIVE_AI_API_KEY to enable quote generation."
		);
	}

	const { object } = await generateObject({
		model: getThinkingModel(),
		schema: quoteGenerationSchema,
		schemaName: "QuoteGeneration",
		schemaDescription: "Generated pricing for StratCol merchant services",
		prompt,
		temperature: AI_CONFIG.ANALYSIS_TEMPERATURE,
	});

	return object;
}

async function notifyQuoteGenerated({
	applicantId,
	workflowId,
	companyName,
	quote,
}: {
	applicantId: number;
	workflowId: number;
	companyName: string;
	quote: Quote;
}) {
	const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/callbacks/quotes`;

	try {
		const response = await fetch(callbackUrl, {
			method: "POST",
			body: JSON.stringify({
				applicantId,
				workflowId,
				companyName,
				quoteId: quote.quoteId,
				amount: quote.amount,
				terms: quote.terms || "Standard terms",
			}),
			headers: { "Content-Type": "application/json" },
		});

		if (!response.ok) {
			console.warn(
				"[QuoteService] Callback returned non-200:",
				response.status,
				response.statusText
			);
		}
	} catch (error) {
		console.warn("[QuoteService] Failed to call quote callback:", error);
	}
}
