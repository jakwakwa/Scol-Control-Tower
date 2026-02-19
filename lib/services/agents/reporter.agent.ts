/**
 * Reporter Agent Service
 *
 * Synthesizes findings from Validation, Risk, and Sanctions agents
 * into a cohesive narrative and weighted recommendation.
 */

import { execSync } from "node:child_process";
import { generateObject } from "ai";
import { z } from "zod";
import { getThinkingModel } from "@/lib/ai/models";

// ============================================
// Types & Schemas
// ============================================

export interface ReporterInput {
	applicantData: {
		companyName: string;
		industry?: string;
	};
	validationSummary: {
		passed: number;
		failed: number;
		total: number;
	};
	riskSummary: {
		score: number;
		category: string;
		flags: string[];
	};
	sanctionsSummary: {
		isBlocked: boolean;
		flags: string[];
	};
	aggregatedScore: number;
}

export const ReporterOutputSchema = z.object({
	recommendation: z.enum(["APPROVE", "CONDITIONAL_APPROVE", "MANUAL_REVIEW", "DECLINE"]),
	confidence_score: z.number().min(0).max(100),
	narrative: z.string().describe("A strict 2-paragraph summary of the analysis."),
	key_reasoning: z.array(z.string()),
});

export type ReporterOutput = z.infer<typeof ReporterOutputSchema> & {
	dataSource: string;
};

// ============================================
// Helper: Git Version
// ============================================

function getPromptVersionId(): string {
	try {
		// Vercel environment variable
		if (process.env.VERCEL_GIT_COMMIT_SHA) {
			return process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7);
		}
		// Local git fallback
		const hash = execSync("git rev-parse --short HEAD").toString().trim();
		return hash;
	} catch (_e) {
		return "unknown-version";
	}
}

// ============================================
// Agent Logic
// ============================================

export async function generateReporterAnalysis(
	input: ReporterInput
): Promise<ReporterOutput & { promptVersionId: string }> {
	const promptVersionId = getPromptVersionId();

	const prompt = `
    You are the Senior Risk Reporter Agent for a financial onboarding platform.
    Your goal is to synthesize data from three sub-agents (Validation, Risk, Sanctions) into a final recommendation.

    INPUT DATA:
    - Applicant: ${input.applicantData.companyName} (${input.applicantData.industry || "Unknown Industry"})
    - Aggregated Score: ${input.aggregatedScore}/100
    - Validation Agent: ${input.validationSummary.passed}/${input.validationSummary.total} docs passed.
    - Risk Agent: Score ${input.riskSummary.score}, Category ${input.riskSummary.category}. Flags: ${input.riskSummary.flags.join(", ") || "None"}.
    - Sanctions Agent: Blocked: ${input.sanctionsSummary.isBlocked}. Flags: ${input.sanctionsSummary.flags.join(", ") || "None"}.

    YOUR TASK:
    1. Analyze the input data to determine a final recommendation (APPROVE, CONDITIONAL_APPROVE, MANUAL_REVIEW, DECLINE).
    2. Assign a confidence score (0-100) to your recommendation.
    3. Write a strictly formatted 2-paragraph narrative:
       - Paragraph 1: Summary of the applicant's profile and key strengths/weaknesses.
       - Paragraph 2: Justification for the recommendation, highlighting specific risks or mitigations.
    
    CONSTRAINTS:
    - Narrative MUST be exactly 2 paragraphs.
    - Be objective and professional.
    - Highlight discrepancies between agents if any.
    `;

	try {
		const { object } = await generateObject({
			model: getThinkingModel(),
			schema: ReporterOutputSchema,
			prompt,
			temperature: 0.2, // Low temperature for consistent reporting
		});

		return {
			...object,
			dataSource: "Gemini AI",
			promptVersionId,
		};
	} catch (error) {
		console.error("[ReporterAgent] Analysis failed", error);
		// AI failed — escalate to human review (not a mock, a genuine error path)
		return {
			recommendation: "MANUAL_REVIEW",
			confidence_score: 0,
			narrative:
				"AI Analysis failed to generate a report. Manual review is required.\n\nSystem encountered an error during report generation.",
			key_reasoning: ["System Error: Report generation failed"],
			dataSource: "AI Error — Manual Escalation",
			promptVersionId,
		};
	}
}
