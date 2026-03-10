"use server";

import { auth } from "@clerk/nextjs/server";
import {
	AI_CONFIG,
	getGenAIClient,
	getThinkingModel,
	isAIConfigured,
} from "@/lib/ai/models";

const withRetryAndTimeout = async <T>(
	operation: () => Promise<T>,
	timeoutMs: number = 20000
): Promise<T> => {
	const delays = [1000, 2000, 4000, 8000, 16000];
	let retries = 0;

	// Respect the project max retries limit
	const maxAttempts = AI_CONFIG?.MAX_RETRIES || 3;

	while (retries < maxAttempts) {
		try {
			// Create a promise that rejects after timeout
			let timeoutId: ReturnType<typeof setTimeout> | undefined;
			const timeoutPromise = new Promise<never>((_, reject) => {
				timeoutId = setTimeout(
					() => reject(new Error("AI operation timed out.")),
					timeoutMs
				);
			});

			try {
				return await Promise.race([operation(), timeoutPromise]);
			} finally {
				if (timeoutId !== undefined) {
					clearTimeout(timeoutId);
				}
			}
		} catch (error: unknown) {
			// Check if it's a rate limit or service unavailable
			const status =
				error && typeof error === "object" && "status" in error
					? (error as any).status
					: undefined;
			const message = error instanceof Error ? error.message : "";

			const isTransient =
				status === 429 || status === 503 || message.includes("timed out");

			if (retries === maxAttempts - 1 || !isTransient) {
				throw error;
			}
			await new Promise(res => setTimeout(res, delays[retries]));
			retries++;
		}
	}
	throw new Error("AI operation failed after retries.");
};

export async function generateRiskBriefing(dataContext: string): Promise<string> {
	const { userId } = await auth();
	if (!userId) {
		throw new Error("Authentication required to use AI features");
	}

	if (!isAIConfigured()) {
		return "AI Service is not configured (Missing GOOGLE_GENAI_KEY). Analysis unavailable.";
	}

	const systemPrompt =
		"You are an expert South African Procurement & Compliance Risk Analyst.";
	const prompt = `Review the provided compliance data payload.
    Write a concise, professional executive summary (max 3 short paragraphs) detailing:
    1. The primary identified risks (e.g., the specific conflict of interest, the payment default, adverse media).
    2. The compliance strengths (e.g., FICA is solid, B-BBEE is Level 2).
    3. A definitive final recommendation (e.g., "Refer for manual review before proceeding").

    Do not use markdown headers (#). Use simple text formatting or standard bullet points if necessary. Keep it highly analytical and objective.

    Data Payload: ${dataContext}`;

	try {
		return await withRetryAndTimeout(async () => {
			const ai = getGenAIClient();
			const response = await ai.models.generateContent({
				model: getThinkingModel(),
				contents: prompt,
				config: {
					systemInstruction: systemPrompt,
					temperature: AI_CONFIG?.ANALYSIS_TEMPERATURE || 0.1,
				},
			});

			return response.text || "No AI briefing generated.";
		}, 20000); // 20-second timeout
	} catch (error) {
		console.error("AI Risk Briefing Error:", error);
		throw new Error("Failed to generate AI insights. Please try again.");
	}
}

export async function analyzeMediaRisk(
	alertTitle: string,
	alertSource: string,
	alertSeverity: string
): Promise<string> {
	const { userId } = await auth();
	if (!userId) {
		throw new Error("Authentication required to use AI features");
	}

	if (!isAIConfigured()) {
		return "AI Service is not configured. Analysis unavailable.";
	}

	const systemPrompt =
		"You are a Risk Analyst specializing in Anti-Money Laundering (AML) and Reputational Risk in South Africa.";
	const prompt = `Analyze the following adverse media alert for a potential supplier:
    Title: "${alertTitle}"
    Source: "${alertSource}"
    Severity: "${alertSeverity}"

    Provide a brief (3-4 sentences) explanation of what this kind of alert typically entails in a South African context and what specific further investigation the procurement officer should conduct regarding this alert.`;

	try {
		return await withRetryAndTimeout(async () => {
			const ai = getGenAIClient();
			const response = await ai.models.generateContent({
				model: getThinkingModel(),
				contents: prompt,
				config: {
					systemInstruction: systemPrompt,
					temperature: AI_CONFIG?.ANALYSIS_TEMPERATURE || 0.1,
				},
			});

			return response.text || "No analysis provided.";
		}, 15000); // 15-second timeout for a smaller request
	} catch (error) {
		console.error("AI Media Analysis Error:", error);
		throw new Error("Analysis failed to load.");
	}
}
