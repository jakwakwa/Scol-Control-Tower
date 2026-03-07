/**
 * AI Models Configuration
 *
 * Uses Vercel AI SDK v6 with AI GoogleGenAI for centralized model access.
 * Requires GOOGLE_GENAI_KEY environment variable.
 *
 * Available models through the GoogleGenAI:
 * - anthropic/claude-sonnet-4: Complex analysis, risk scoring
 * - google/gemini-2.0-flash: Fast document parsing
 */
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

/**
 * Get thinking model for complex analysis tasks
 * - FICA document verification
 * - Risk flag detection
 * - AI trust score calculation
 */
export function getThinkingModel() {
	return "gemini-2.5-flash";
}

/**
 * High-stakes model for risk and document verification.
 */
export function getHighStakesModel() {
	return "gemini-2.5-pro";
}

/**
 * Get fast model for simple extraction tasks
 * - Document metadata extraction
 * - Quick validation checks
 */
export function getFastModel() {
	return "gemini-2.5-flash-lite";
}

/**
 * Get the appropriate model based on task complexity
 */
export function getModel(complexity: "fast" | "thinking" = "thinking") {
	return complexity === "fast" ? getFastModel() : getThinkingModel();
}

/**
 * Model for company profile screening (broad web research with tool calling).
 */
export function getCompanyScreeningModel() {
	return "gemini-3.1-pro-preview";
}

/**
 * Check if AI is configured
 */
export function isAIConfigured(): boolean {
	return !!process.env.GOOGLE_GENAI_KEY;
}

/**
 * Create a Google GenAI client using project-standard env key.
 */
export function getGenAIClient(): GoogleGenAI {
	const apiKey = process.env.GOOGLE_GENAI_KEY;
	if (!apiKey) {
		throw new Error(
			"GOOGLE_GENAI_KEY is required for AI operations. Add it to environment variables."
		);
	}

	return new GoogleGenAI({ apiKey });
}

interface StructuredInteractionOptions<TSchema extends z.ZodTypeAny> {
	model: string;
	input: string;
	schema: TSchema;
	temperature?: number;
}

/**
 * Run a structured Interactions API call and return validated JSON.
 */
export async function runStructuredInteraction<TSchema extends z.ZodTypeAny>(
	options: StructuredInteractionOptions<TSchema>
): Promise<z.infer<TSchema>> {
	const ai = getGenAIClient();
	const interaction = await ai.interactions.create({
		model: options.model,
		input: options.input,
		response_format: z.toJSONSchema(options.schema),
		...(options.temperature !== undefined
			? { generation_config: { temperature: options.temperature } }
			: {}),
	});

	const textOutput = interaction.outputs.find(output => output.type === "text");
	if (!(textOutput && "text" in textOutput && typeof textOutput.text === "string")) {
		throw new Error("Interactions API returned no text output for structured response.");
	}

	return options.schema.parse(JSON.parse(textOutput.text));
}

/**
 * AI configuration constants
 */
export const AI_CONFIG = {
	/** Temperature for deterministic outputs */
	ANALYSIS_TEMPERATURE: 0.1,
	/** Retry attempts for failed AI calls */
	MAX_RETRIES: 3,
} as const;
