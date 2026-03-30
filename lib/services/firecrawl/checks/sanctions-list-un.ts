/**
 * UN Consolidated Sanctions List Search (Firecrawl Agent)
 *
 * Searches the UN Security Council consolidated XML at
 * https://scsanctions.un.org/resources/xml/en/consolidated.xml
 * for individuals and entities matching the given search terms.
 */

import { z } from "zod";

import { agentWithSchema } from "../firecrawl.client";

const UN_INDIVIDUAL_ALIAS_SCHEMA = z.object({
	ALIAS_NAME: z.string(),
});

const UN_INDIVIDUAL_DOCUMENT_SCHEMA = z.object({
	TYPE_OF_DOCUMENT: z.string().optional(),
	NUMBER: z.string().optional(),
	ISSUING_COUNTRY: z.string().optional(),
});

export const UNIndividualSchema = z.object({
	DATAID: z.string(),
	REFERENCE_NUMBER: z.string(),
	UN_LIST_TYPE: z.string(),
	FIRST_NAME: z.string(),
	SECOND_NAME: z.string().optional(),
	THIRD_NAME: z.string().optional(),
	NATIONALITY: z.string().optional(),
	INDIVIDUAL_ALIAS: z.array(UN_INDIVIDUAL_ALIAS_SCHEMA).optional(),
	INDIVIDUAL_DOCUMENT: z.array(UN_INDIVIDUAL_DOCUMENT_SCHEMA).optional(),
});

export const UNEntitySchema = z.object({
	DATAID: z.string(),
	REFERENCE_NUMBER: z.string(),
	UN_LIST_TYPE: z.string(),
	FIRST_NAME: z.string(),
	ENTITY_ALIAS: z.array(z.object({ ALIAS_NAME: z.string() })),
});

export const UNSanctionsSearchSchema = z.object({
	individuals: z.array(UNIndividualSchema).optional(),
	entities: z.array(UNEntitySchema).optional(),
});

export type UNIndividualMatch = z.infer<typeof UNIndividualSchema>;
export type UNEntityMatch = z.infer<typeof UNEntitySchema>;
export type UNSanctionsSearchResult = z.infer<typeof UNSanctionsSearchSchema>;

const UN_CONSOLIDATED_XML_URL =
	"https://scsanctions.un.org/resources/xml/en/consolidated.xml";

interface SanctionsTelemetryContext {
	workflowId: number;
	applicantId: number;
	stage?: 2 | 3 | "async";
}

/**
 * Search the UN consolidated sanctions list for individuals or entities
 * matching any of the given search terms (company name, contact name, directors).
 */
export async function searchUNSanctionsList(
	searchTerms: string[],
	telemetry?: SanctionsTelemetryContext
): Promise<UNSanctionsSearchResult> {
	if (searchTerms.length === 0) {
		return { individuals: [], entities: [] };
	}

	const termsList = searchTerms.map(t => `'${t}'`).join(", ");
	const prompt = `From the UN Sanctions XML at ${UN_CONSOLIDATED_XML_URL}, search for and extract data for individuals or entities matching any of these names or aliases: ${termsList}. Search both INDIVIDUALS and ENTITIES sections. For each match, extract: DATAID, REFERENCE_NUMBER, UN_LIST_TYPE, FIRST_NAME, SECOND_NAME (for individuals), THIRD_NAME (if present), NATIONALITY (for individuals), INDIVIDUAL_ALIAS (extract ALIAS_NAME) or ENTITY_ALIAS (extract ALIAS_NAME), and INDIVIDUAL_DOCUMENT (TYPE_OF_DOCUMENT, NUMBER, ISSUING_COUNTRY) for individuals. If no matches are found, return empty arrays for individuals and entities.`;

	const result = await agentWithSchema({
		prompt,
		schema: UNSanctionsSearchSchema,
		urls: [UN_CONSOLIDATED_XML_URL],
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
		return { individuals: [], entities: [] };
	}

	return {
		individuals: result.data.individuals ?? [],
		entities: result.data.entities ?? [],
	};
}
