/**
 * FIC TFS Sanctions List Search (Firecrawl Agent)
 *
 * Searches the South African Financial Intelligence Centre (FIC)
 * Targeted Financial Sanctions (TFS) list. The list is UN-derived and
 * available at the FIC TFS download/search pages.
 */

import { z } from "zod";

import { agentWithSchema } from "../firecrawl.client";

const FICTFSMatchSchema = z.object({
	name: z.string(),
	noticeId: z.string().optional(),
	noticeNumber: z.string().optional(),
	entityType: z.string().optional(),
	referenceNumber: z.string().optional(),
});

export const FICTFSSanctionsSearchSchema = z.object({
	matchesFound: z.boolean(),
	matches: z.array(FICTFSMatchSchema).optional(),
});

export type FICTFSMatch = z.infer<typeof FICTFSMatchSchema>;
export type FICTFSSanctionsSearchResult = z.infer<typeof FICTFSSanctionsSearchSchema>;

const FIC_TFS_URL = "https://www.fic.gov.za/targeted-financial-sanctions/";

/**
 * Search the FIC Targeted Financial Sanctions list for individuals or entities
 * matching any of the given search terms.
 */
export async function searchFICTFSSanctionsList(
	searchTerms: string[]
): Promise<FICTFSSanctionsSearchResult> {
	if (searchTerms.length === 0) {
		return { matchesFound: false, matches: [] };
	}

	const termsList = searchTerms.map(t => `'${t}'`).join(", ");
	const prompt = `Search the FIC (Financial Intelligence Centre) Targeted Financial Sanctions list at ${FIC_TFS_URL} for individuals or entities matching any of these names: ${termsList}. Extract any matches found including: name, noticeId, noticeNumber, entityType, referenceNumber. If no matches are found, set matchesFound to false and matches to an empty array.`;

	const result = await agentWithSchema({
		prompt,
		schema: FICTFSSanctionsSearchSchema,
		urls: [FIC_TFS_URL],
		model: "spark-1-mini",
		timeoutMs: 90_000,
	});

	if (!result.success || result.runtimeState !== "success" || !result.data) {
		return { matchesFound: false, matches: [] };
	}

	return {
		matchesFound: result.data.matchesFound ?? false,
		matches: result.data.matches ?? [],
	};
}
