/**
 * AI Models Configuration
 *
 * Uses GoogleGenAI for centralized model access.
 * Requires GOOGLE_GENAI_KEY environment variable.
 *
 * Available models through the GoogleGenAI:
 * - anthropic/claude-sonnet-4: Complex analysis, risk scoring
 * - google/gemini-2.0-flash: Fast document parsing
 */
import { GoogleGenAI as GoogleGenAISdk } from "@google/genai";
import { z } from "zod";

function requireGoogleGenAIKey(): string {
	const apiKey = process.env.GOOGLE_GENAI_KEY;
	if (!apiKey) {
		throw new Error(
			"GOOGLE_GENAI_KEY is required for AI operations. Add it to environment variables."
		);
	}
	return apiKey;
}

/**
 * Raw @google/genai client for APIs not wrapped by @posthog/ai (e.g. `interactions`).
 * PostHog still captures `models.generateContent` via {@link getGenAIClient}.
 */
function getGoogleGenAISdkClient(): GoogleGenAISdk {
	return new GoogleGenAISdk({ apiKey: requireGoogleGenAIKey() });
}

/**
 * Get thinking model for complex analysis tasks
 * - FICA document verification
 * - Risk flag detection
 * - AI trust score calculation
 */
export function getThinkingModel() {
	return "gemini-3-flash-preview";
}

/**
 * High-stakes model for risk and document verification.
 */
export function getHighStakesModel() {
	return "gemini-3.1-pro-preview";
}

/**
 * Get fast model for simple extraction tasks
 * - Document metadata extraction
 * - Quick validation checks
 */
export function getFastModel() {
	return "gemini-3-flash-preview";
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
 * (model, latency, token usage) for all models.generateContent() calls.
 */
export function getGenAIClient(): GoogleGenAISdk {
	return new GoogleGenAISdk({
		apiKey: requireGoogleGenAIKey(),
	});
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
	const ai = getGoogleGenAISdkClient();
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

export const AI_CONFIG = {
	ANALYSIS_TEMPERATURE: 0.1,
	MAX_RETRIES: 3,
} as const;
