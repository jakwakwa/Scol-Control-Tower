/**
 * AI Models Configuration
 *
 * Uses Vercel AI SDK v6 with AI Gateway for centralized model access.
 * Requires AI_GATEWAY_API_KEY environment variable.
 *
 * Available models through the gateway:
 * - anthropic/claude-sonnet-4: Complex analysis, risk scoring
 * - google/gemini-2.0-flash: Fast document parsing
 */

import { gateway } from "@ai-sdk/gateway";

/**
 * Get thinking model for complex analysis tasks
 * - FICA document verification
 * - Risk flag detection
 * - AI trust score calculation
 */
export function getThinkingModel() {
	return gateway("google/gemini-3-flash");
}

/**
 * High-stakes model for risk and document verification.
 */
export function getHighStakesModel() {
	return gateway("google/gemini-3.1-pro-preview");
}

/**
 * Get fast model for simple extraction tasks
 * - Document metadata extraction
 * - Quick validation checks
 */
export function getFastModel() {
	return gateway("google/gemini-2.0-flash");
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
	return !!process.env.AI_GATEWAY_API_KEY;
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
