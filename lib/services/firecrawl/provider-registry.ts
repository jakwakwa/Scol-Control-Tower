/**
 * Provider Registry
 *
 * Maps each provider code to a base URL, query-parameter builder,
 * extraction Zod schema, and an LLM prompt that guides Firecrawl
 * JSON extraction.
 */

import { z } from "zod";

import type {
	IndustryRegulatorProvider,
	SanctionsProvider,
	SocialReputationProvider,
} from "@/lib/services/agents/contracts/firecrawl-check.contracts";

// ============================================
// Shared types
// ============================================

export interface ProviderConfig {
	buildUrl: (params: QueryParams) => string;
	extractionSchema: z.ZodType;
	prompt: string;
	/** TTL in days for caching/expiresAt */
	ttlDays: number;
}

export interface QueryParams {
	companyName: string;
	registrationNumber?: string;
	contactName?: string;
	industry?: string;
}

// ============================================
// Extraction micro-schemas (JSON mode output)
// ============================================

const NcrExtractionSchema = z.object({
	found: z.boolean().describe("Whether the entity was found on the register"),
	registrationStatus: z
		.string()
		.optional()
		.describe("e.g. Registered, Lapsed, Cancelled"),
	category: z
		.string()
		.optional()
		.describe("debt_counsellor, credit_provider, credit_bureau, adr, pda"),
	entityName: z.string().optional(),
	registrationNumber: z.string().optional(),
});

const CfdcExtractionSchema = z.object({
	found: z.boolean(),
	registrationStatus: z.string().optional(),
	entityName: z.string().optional(),
});

const SaicaExtractionSchema = z.object({
	found: z.boolean(),
	designation: z.string().optional().describe("CA(SA), AGA(SA), AT(SA)"),
	memberNumber: z.string().optional(),
	memberName: z.string().optional(),
});

const CibaExtractionSchema = z.object({
	found: z.boolean(),
	memberNumber: z.string().optional(),
	status: z.string().optional(),
	memberName: z.string().optional(),
});

const FpiExtractionSchema = z.object({
	found: z.boolean(),
	practiceAreas: z.array(z.string()).optional(),
	province: z.string().optional(),
	city: z.string().optional(),
	memberName: z.string().optional(),
});

const FisaExtractionSchema = z.object({
	found: z.boolean(),
	memberNumber: z.string().optional(),
	company: z.string().optional(),
	fpsaStatus: z.string().optional(),
});

const RmiExtractionSchema = z.object({
	found: z.boolean(),
	province: z.string().optional(),
	category: z.string().optional(),
	association: z.string().optional(),
	entityName: z.string().optional(),
});

const PsiraExtractionSchema = z.object({
	found: z.boolean(),
	registrationNumber: z.string().optional(),
	status: z.string().optional(),
	entityName: z.string().optional(),
});

const SaceExtractionSchema = z.object({
	found: z.boolean(),
	registrationStatus: z.string().optional(),
	entityName: z.string().optional(),
});

const DoeExtractionSchema = z.object({
	found: z.boolean(),
	programme: z.string().optional().describe("ECD or EMIS"),
	entityName: z.string().optional(),
});

const OfacExtractionSchema = z.object({
	matchesFound: z.boolean().describe("Whether any sanctions matches were found"),
	matches: z
		.array(
			z.object({
				name: z.string(),
				listEntryId: z.string().optional(),
				program: z.string().optional(),
				score: z.number().optional(),
				entityType: z.string().optional(),
			})
		)
		.optional(),
});

const Un1267ExtractionSchema = z.object({
	matchesFound: z.boolean(),
	matches: z
		.array(
			z.object({
				name: z.string(),
				permanentRefNum: z.string().optional(),
				listedOn: z.string().optional(),
				entityType: z.string().optional(),
			})
		)
		.optional(),
});

const FicTfsExtractionSchema = z.object({
	matchesFound: z.boolean(),
	matches: z
		.array(
			z.object({
				name: z.string(),
				noticeId: z.string().optional(),
				noticeNumber: z.string().optional(),
				entityType: z.string().optional(),
			})
		)
		.optional(),
});

const HelloPeterExtractionSchema = z.object({
	found: z.boolean().describe("Whether the business was found on HelloPeter"),
	businessName: z.string().optional(),
	trustIndex: z.number().optional().describe("Trust index score 0-10"),
	totalReviews: z.number().optional(),
	complaintCount: z.number().optional(),
	complimentCount: z.number().optional(),
	starRating: z.number().optional().describe("Star rating out of 5"),
	recentComplaints: z
		.array(z.string())
		.optional()
		.describe("Headlines of recent complaints"),
});

// ============================================
// Industry Regulator Providers
// ============================================

function enc(s: string): string {
	return encodeURIComponent(s);
}

export const INDUSTRY_REGULATOR_PROVIDERS: Record<
	IndustryRegulatorProvider,
	ProviderConfig
> = {
	NCR: {
		buildUrl: p => `https://www.ncr.org.za/register-search/?search=${enc(p.companyName)}`,
		extractionSchema: NcrExtractionSchema,
		prompt:
			"Extract registration details from the NCR (National Credit Regulator) register search results. Look for the entity name, registration status (Registered/Lapsed/Cancelled), category (debt_counsellor/credit_provider/credit_bureau/adr/pda), and registration number.",
		ttlDays: 30,
	},
	CFDC: {
		buildUrl: p =>
			`https://cfdc.org.za/find-a-debt-counsellor/?search=${enc(p.companyName)}`,
		extractionSchema: CfdcExtractionSchema,
		prompt:
			"Extract registration details from the CFDC (Council for Debt Collectors) search results. Look for entity name and registration status.",
		ttlDays: 30,
	},
	SAICA: {
		buildUrl: p =>
			`https://www.saica.org.za/members/find-a-ca/?q=${enc(p.contactName ?? p.companyName)}`,
		extractionSchema: SaicaExtractionSchema,
		prompt:
			"Extract member details from the SAICA (South African Institute of Chartered Accountants) member directory. Look for designation (CA(SA), AGA(SA), AT(SA)), member number, and member name.",
		ttlDays: 30,
	},
	CIBA: {
		buildUrl: p =>
			`https://www.ciba.org/verify-member/?search=${enc(p.contactName ?? p.companyName)}`,
		extractionSchema: CibaExtractionSchema,
		prompt:
			"Extract member verification details from CIBA (Chartered Institute of Business Accountants). Look for member number, status, and member name.",
		ttlDays: 30,
	},
	FPI: {
		buildUrl: p =>
			`https://www.fpi.co.za/fpi-member-search/?q=${enc(p.contactName ?? p.companyName)}`,
		extractionSchema: FpiExtractionSchema,
		prompt:
			"Extract financial planner details from the FPI (Financial Planning Institute) member search. Look for practice areas, province, city, and member name.",
		ttlDays: 30,
	},
	FISA: {
		buildUrl: p =>
			`https://www.fisa.net.za/find-a-member/?search=${enc(p.contactName ?? p.companyName)}`,
		extractionSchema: FisaExtractionSchema,
		prompt:
			"Extract member details from FISA (Fiduciary Institute of Southern Africa). Look for member number, company, FPSA status.",
		ttlDays: 30,
	},
	RMI: {
		buildUrl: p =>
			`https://www.rmi.org.za/find-an-rmi-accredited-motor-body-repairer/?search=${enc(p.companyName)}`,
		extractionSchema: RmiExtractionSchema,
		prompt:
			"Extract member details from the RMI (Retail Motor Industry Organisation) directory. Look for entity name, province, category, and association.",
		ttlDays: 30,
	},
	PSIRA: {
		buildUrl: p =>
			`https://www.psira.co.za/psira/dnn/RegisterVerification.aspx?name=${enc(p.companyName)}`,
		extractionSchema: PsiraExtractionSchema,
		prompt:
			"Extract registration details from PSIRA (Private Security Industry Regulatory Authority). Look for registration number, status, and entity name.",
		ttlDays: 30,
	},
	SACE: {
		buildUrl: p =>
			`https://www.sace.org.za/pages/verify-educator?name=${enc(p.contactName ?? p.companyName)}`,
		extractionSchema: SaceExtractionSchema,
		prompt:
			"Extract educator verification details from SACE (South African Council for Educators). Look for registration status and entity name.",
		ttlDays: 30,
	},
	DOE: {
		buildUrl: p =>
			`https://www.education.gov.za/Informationfor/EMIS.aspx?q=${enc(p.companyName)}`,
		extractionSchema: DoeExtractionSchema,
		prompt:
			"Extract details from the Department of Education (DOE) EMIS system. Look for programme type (ECD/EMIS) and entity name.",
		ttlDays: 30,
	},
};

// ============================================
// Sanctions Evidence Providers
// ============================================

export const SANCTIONS_PROVIDERS: Record<SanctionsProvider, ProviderConfig> = {
	OFAC: {
		buildUrl: p =>
			`https://sanctionssearch.ofac.treas.gov/Details.aspx?id=${enc(p.companyName)}`,
		extractionSchema: OfacExtractionSchema,
		prompt: `Search the OFAC Specially Designated Nationals list for "${"{companyName}"}". Extract any matches found including name, SDN list entry ID, sanctions program, match score, and entity type. If no matches, set matchesFound to false.`,
		ttlDays: 7,
	},
	UN_1267: {
		buildUrl: p =>
			`https://www.un.org/securitycouncil/sanctions/1267/aq_sanctions_list/summaries?search=${enc(p.companyName)}`,
		extractionSchema: Un1267ExtractionSchema,
		prompt: `Search the UN Security Council 1267 sanctions list for "${"{companyName}"}". Extract any matches including name, permanent reference number, date listed, and entity type. If no matches, set matchesFound to false.`,
		ttlDays: 7,
	},
	FIC_TFS: {
		buildUrl: p =>
			`https://www.fic.gov.za/targeted-financial-sanctions/?search=${enc(p.companyName)}`,
		extractionSchema: FicTfsExtractionSchema,
		prompt: `Search the FIC (Financial Intelligence Centre) Targeted Financial Sanctions list for "${"{companyName}"}". Extract any matches including name, notice ID, notice number, and entity type. If no matches, set matchesFound to false.`,
		ttlDays: 7,
	},
};

// ============================================
// Social Reputation Providers
// ============================================

export const SOCIAL_REPUTATION_PROVIDERS: Record<
	SocialReputationProvider,
	ProviderConfig
> = {
	HELLOPETER: {
		buildUrl: p => {
			const slug = p.companyName
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-|-$/g, "");
			return `https://www.hellopeter.com/${slug}/reviews`;
		},
		extractionSchema: HelloPeterExtractionSchema,
		prompt:
			"Extract the business reputation data from this HelloPeter page. Look for the business name, trust index (0-10), total number of reviews, number of complaints, number of compliments, star rating (out of 5), and headlines of the most recent complaints if visible.",
		ttlDays: 14,
	},
};
