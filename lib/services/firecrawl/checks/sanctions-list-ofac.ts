/**
 * OFAC Sanctions List Search (Firecrawl Agent)
 *
 * Searches the US Treasury OFAC Specially Designated Nationals (SDN) list
 * and Consolidated sanctions list via the OFAC Sanctions List Search application.
 * OFAC XML is available through the Sanctions List Service; the agent searches
 * the web application for matches.
 */

import { z } from "zod";

import { agentWithSchema } from "../firecrawl.client";

const OFACMatchSchema = z.object({
	name: z.string(),
	firstId: z.string().optional(),
	program: z.string().optional(),
	score: z.number().optional(),
	entityType: z.string().optional(),
	firstName: z.string().optional(),
	lastName: z.string().optional(),
});

export const OFACSanctionsSearchSchema = z.object({
	matchesFound: z.boolean(),
	matches: z.array(OFACMatchSchema).optional(),
});

export type OFACMatch = z.infer<typeof OFACMatchSchema>;
export type OFACSanctionsSearchResult = z.infer<typeof OFACSanctionsSearchSchema>;

const OFAC_SEARCH_URL = "https://sanctionssearch.ofac.treas.gov/";

interface SanctionsTelemetryContext {
	workflowId: number;
	applicantId: number;
	stage?: 2 | 3 | "async";
}

/**
 * Search the OFAC sanctions list for individuals or entities
 * matching any of the given search terms.
 */
export async function searchOFACSanctionsList(
	searchTerms: string[],
	telemetry?: SanctionsTelemetryContext
): Promise<OFACSanctionsSearchResult> {
	if (searchTerms.length === 0) {
		return { matchesFound: false, matches: [] };
	}

	const termsList = searchTerms.map(t => `'${t}'`).join(", ");
	const prompt = `Search the OFAC Specially Designated Nationals (SDN) and Consolidated sanctions list at ${OFAC_SEARCH_URL} for individuals or entities matching any of these names: ${termsList}. Extract any matches found including: name, firstId (SDN list entry ID), program (sanctions program), match score, entityType, firstName, lastName. If no matches are found, set matchesFound to false and matches to an empty array.`;

	const result = await agentWithSchema({
		prompt,
		schema: OFACSanctionsSearchSchema,
		urls: [OFAC_SEARCH_URL],
		model: "spark-1-mini",
		timeoutMs: 90_000,
		telemetry: telemetry
			? {
					vendor: "firecrawl_sanctions",
					workflowId: telemetry.workflowId,
					applicantId: telemetry.applicantId,
					stage: telemetry.stage ?? 3,
				}
			: undefined,
	});

	if (!result.success || result.runtimeState !== "success" || !result.data) {
		return { matchesFound: false, matches: [] };
	}

	return {
		matchesFound: result.data.matchesFound ?? false,
		matches: result.data.matches ?? [],
	};
}
