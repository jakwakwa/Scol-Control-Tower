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

/**
 * Get thinking model for complex analysis tasks
 * - FICA document verification
 * - Risk flag detection
 * - AI trust score calculation
 */
export function getThinkingModel() {
	return "gemini-3-flash";
}

/**
 * High-stakes model for risk and document verification.
 */
export function getHighStakesModel() {
	return "google/gemini-3-flash";
}

/**
 * Get fast model for simple extraction tasks
 * - Document metadata extraction
 * - Quick validation checks
 */
export function getFastModel() {
	return "google/gemini-2.5-flash-preview-09-2025";
}

/**
 * Get the appropriate model based on task complexity
 */
export function getModel(complexity: "fast" | "thinking" = "thinking") {
	return complexity === "fast" ? getFastModel() : getThinkingModel();
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

/**
 * AI configuration constants
 */
export const AI_CONFIG = {
	/** Temperature for deterministic outputs */
	ANALYSIS_TEMPERATURE: 0.1,
	/** Retry attempts for failed AI calls */
	MAX_RETRIES: 3,
} as const;
