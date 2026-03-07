/**
 * Company Profile Screening Agent (Disabled)
 *
 * Broad web research agent for screening company reputation, public records,
 * news, and compliance signals. Uses Gemini 3.1 Pro with Firecrawl tools.
 * Intended to replace the narrow HelloPeter-only social reputation check.
 *
 * NOT wired into workflow — kept disabled for evaluation.
 */

import type { FunctionDeclaration } from "@google/genai";
import Firecrawl from "@mendable/firecrawl-js";
import {
	getCompanyScreeningModel,
	getGenAIClient,
	isAIConfigured,
} from "@/lib/ai/models";
import type { ApplicantData } from "@/lib/services/agents/contracts/firecrawl-check.contracts";

// Lazy initialization for Vercel deployment (v2 client: scrape + search)
let firecrawl: Firecrawl | null = null;

function getFirecrawlClient(): Firecrawl {
	if (!firecrawl) {
		const apiKey = process.env.FIRECRAWL_API_KEY;
		if (!apiKey) {
			throw new Error("FIRECRAWL_API_KEY environment variable is not set");
		}
		firecrawl = new Firecrawl({ apiKey });
	}
	return firecrawl;
}

// v2 Firecrawl SearchData: web is Array<SearchResultWeb | Document>
interface SearchResultItem {
	url?: string;
	title?: string;
	description?: string;
	markdown?: string;
	links?: string[];
	screenshot?: string;
	metadata?: { title?: string; description?: string };
}

// Gemini tool format (functionDeclarations)
const GEMINI_TOOLS: FunctionDeclaration[] = [
	{
		name: "web_search",
		description:
			"Search the web for company reviews, complaints, news, regulatory mentions, or sanctions. Use site: operators (e.g. site:hellopeter.com, site:trustpilot.com) for review sites. Set scrape_content=true to extract full page content when needed.",
		parametersJsonSchema: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description: "Search query (include company name and search intent)",
				},
				limit: {
					type: "number",
					description: "Number of results to return (default 5)",
				},
				scrape_content: {
					type: "boolean",
					description: "Whether to scrape the content of search results",
				},
				tbs: {
					type: "string",
					description: "Time-based search filter (e.g. qdr:w for past week)",
					enum: ["qdr:h", "qdr:d", "qdr:w", "qdr:m", "qdr:y"],
				},
			},
			required: ["query"],
		},
	},
	{
		name: "deep_scrape",
		description:
			"Scrape a single URL for detailed content. Use for company websites, HelloPeter/Trustpilot review pages, or news articles. Optionally follow links with link_filter for deeper analysis.",
		parametersJsonSchema: {
			type: "object",
			properties: {
				source_url: {
					type: "string",
					description: "The URL to scrape",
				},
				link_filter: {
					type: "string",
					description:
						"Regex pattern to filter which links to scrape (e.g. /reviews/, /complaints/)",
				},
				max_depth: {
					type: "number",
					description: "Maximum depth of links to follow (1 = direct links only)",
				},
				max_links: {
					type: "number",
					description: "Maximum number of links to scrape per level",
				},
				formats: {
					type: "array",
					description: "Output formats for scraped content",
				},
			},
			required: ["source_url"],
		},
	},
	{
		name: "analyze_content",
		description:
			"Analyze scraped content to extract reputation signals, risk factors, compliance indicators, or sentiment. Use after fetching content with web_search or deep_scrape.",
		parametersJsonSchema: {
			type: "object",
			properties: {
				content: {
					type: "string",
					description: "Content to analyze",
				},
				analysis_type: {
					type: "string",
					description: "Type of analysis",
					enum: [
						"sentiment",
						"key_facts",
						"trends",
						"summary",
						"credibility",
						"company_reputation",
						"compliance_signals",
						"risk_factors",
						"news_sentiment",
					],
				},
				context: {
					type: "string",
					description: "Additional context for the analysis",
				},
			},
			required: ["content", "analysis_type"],
		},
	},
];

// Execute Firecrawl v2 search
async function executeWebSearch(
	query: string,
	limit: number = 5,
	scrapeContent: boolean = false,
	tbs?: string
): Promise<{
	content: string;
	screenshots: Array<{ url: string; screenshot?: string }>;
}> {
	const screenshots: Array<{ url: string; screenshot?: string }> = [];

	try {
		const searchReq: {
			limit?: number;
			scrapeOptions?: { formats: ("markdown" | "links")[] };
			tbs?: string;
		} = {
			limit,
		};
		if (tbs) searchReq.tbs = tbs;

		const searchData = await getFirecrawlClient().search(query, searchReq);
		const webResults = searchData.web ?? [];

		if (webResults.length === 0) {
			return { content: "No search results found.", screenshots: [] };
		}

		let output = `Found ${webResults.length} results:\n\n`;
		for (const [index, result] of webResults.entries()) {
			const item = result as SearchResultItem;
			const title = item.title ?? item.metadata?.title ?? "Unknown";
			const url = item.url ?? item.metadata?.title ?? "";
			const desc = item.description ?? item.metadata?.description ?? "";
			output += `[${index + 1}] ${title}\n`;
			output += `URL: ${url}\n`;
			output += `Description: ${desc}\n\n`;
		}

		if (scrapeContent && webResults.length > 0) {
			// Re-run search with scrape to get full content
			const scrapeReq: {
				limit?: number;
				scrapeOptions?: { formats: ("markdown" | "links")[] };
				tbs?: string;
			} = {
				limit,
				scrapeOptions: { formats: ["markdown"] },
			};
			if (tbs) scrapeReq.tbs = tbs;

			const scrapedData = await getFirecrawlClient().search(query, scrapeReq);
			const scrapedWeb = scrapedData.web ?? [];

			output += `\n--- SCRAPED CONTENT ---\n\n`;
			for (const [index, result] of scrapedWeb.entries()) {
				const item = result as SearchResultItem;
				if (item.markdown) {
					if (item.screenshot) {
						screenshots.push({ url: item.url ?? "", screenshot: item.screenshot });
					}
					const title = item.title ?? item.metadata?.title ?? "Unknown";
					const url = item.url ?? "";
					const preview = item.markdown.substring(0, 500).replace(/\n+/g, " ");
					output += `[${index + 1}] ${title} (SCRAPED)\n`;
					output += `URL: ${url}\n`;
					output += `Content preview: ${preview}...\n\n`;
				}
			}
		}

		return { content: output, screenshots };
	} catch (error) {
		return {
			content: `Error performing search: ${error instanceof Error ? error.message : "Unknown error"}`,
			screenshots: [],
		};
	}
}

// Analyze content with various methods
async function analyzeContent(
	content: string,
	analysisType: string,
	context?: string
): Promise<string> {
	switch (analysisType) {
		case "sentiment": {
			const positiveWords = [
				"success",
				"growth",
				"improve",
				"innovation",
				"breakthrough",
				"leading",
				"advanced",
			];
			const negativeWords = [
				"challenge",
				"risk",
				"concern",
				"threat",
				"decline",
				"issue",
				"problem",
			];
			const contentLower = content.toLowerCase();
			const positiveMatches = positiveWords.filter(word => contentLower.includes(word));
			const negativeMatches = negativeWords.filter(word => contentLower.includes(word));
			const sentiment =
				positiveMatches.length > negativeMatches.length
					? "Positive"
					: negativeMatches.length > positiveMatches.length
						? "Negative"
						: "Neutral";
			return (
				`Sentiment Analysis:\n` +
				`- Overall: ${sentiment}\n` +
				`- Positive indicators: ${positiveMatches.join(", ") || "none"}\n` +
				`- Negative indicators: ${negativeMatches.join(", ") || "none"}\n` +
				`- Context: ${context || "general analysis"}`
			);
		}

		case "key_facts": {
			const sentences = content.split(/[.!?]/).filter(s => s.trim());
			const keyFacts = sentences
				.filter(s => /\d+%|\$\d+|\d+ (million|billion)|first|largest|leading/i.test(s))
				.slice(0, 5)
				.map(s => s.trim());
			return `Key Facts Extracted:\n${keyFacts.map((fact, i) => `${i + 1}. ${fact}`).join("\n")}`;
		}

		case "trends": {
			const trendPatterns: Record<string, RegExp> = {
				Growth: /increas|grow|rise|expand|surge/i,
				Decline: /decreas|fall|drop|declin|reduc/i,
				Innovation: /new|innovat|breakthrough|cutting-edge|advanced/i,
				Adoption: /adopt|implement|deploy|integrat|using/i,
			};
			const identifiedTrends: string[] = [];
			for (const [trend, pattern] of Object.entries(trendPatterns)) {
				if (pattern.test(content)) identifiedTrends.push(trend);
			}
			return (
				`Trend Analysis:\n` +
				`- Identified trends: ${identifiedTrends.join(", ") || "No clear trends"}\n` +
				`- Market direction: ${identifiedTrends.includes("Growth") ? "Positive" : "Mixed"}`
			);
		}

		case "summary": {
			const allSentences = content.split(/[.!?]/).filter(s => s.trim().length > 20);
			const importantSentences = allSentences
				.filter(s => /announc|launch|report|study|research|found|develop/i.test(s))
				.slice(0, 3);
			return `Executive Summary:\n${importantSentences.join(". ")}.`;
		}

		case "credibility": {
			const credibilityFactors: Record<string, boolean> = {
				"Has citations": /according to|study|research|report|survey/i.test(content),
				"Includes data": /\d+%|\$\d+|statistics|data/i.test(content),
				"Official source": /\.gov|\.edu|official|announce/i.test(content),
				"Recent info": /2024|2025|recent|latest|new/i.test(content),
			};
			const credibilityScore = Object.values(credibilityFactors).filter(v => v).length;
			return (
				`Credibility Assessment:\n` +
				Object.entries(credibilityFactors)
					.map(([factor, present]) => `- ${factor}: ${present ? "✓" : "✗"}`)
					.join("\n") +
				`\n- Credibility score: ${credibilityScore}/4`
			);
		}

		case "company_reputation": {
			const repSignals = {
				"Positive reviews": /positive|satisfied|recommend|excellent|great service/i.test(
					content
				),
				Complaints: /complaint|dissatisfied|poor|bad experience|refund/i.test(content),
				"Trust indicators": /trust|verified|accredited|registered/i.test(content),
				"Legal issues": /lawsuit|litigation|court|investigation/i.test(content),
			};
			return (
				`Company Reputation Signals:\n` +
				Object.entries(repSignals)
					.map(([signal, present]) => `- ${signal}: ${present ? "✓" : "✗"}`)
					.join("\n")
			);
		}

		case "compliance_signals": {
			const complianceTerms = [
				"NCR",
				"FSCA",
				"CIPC",
				"FICA",
				"OFAC",
				"sanctions",
				"registered",
				"licensed",
				"compliance",
				"regulator",
			];
			const found = complianceTerms.filter(term => new RegExp(term, "i").test(content));
			return (
				`Compliance Signals:\n` +
				`- Regulatory terms found: ${found.join(", ") || "none"}\n` +
				`- Context: ${context || "general"}`
			);
		}

		case "risk_factors": {
			const riskPatterns: Record<string, RegExp> = {
				Fraud: /fraud|scam|ponzi|embezzlement/i,
				Litigation: /lawsuit|litigation|court|sued|investigation/i,
				Bankruptcy: /bankruptcy|liquidation|insolvent/i,
				Sanctions: /sanctions|OFAC|blacklist|prohibited/i,
				Complaints: /complaint|dissatisfied|refund|dispute/i,
			};
			const risks: string[] = [];
			for (const [risk, pattern] of Object.entries(riskPatterns)) {
				if (pattern.test(content)) risks.push(risk);
			}
			return `Risk Factors:\n- Identified: ${risks.join(", ") || "None detected"}\n- Severity: ${risks.length > 2 ? "Elevated" : risks.length > 0 ? "Moderate" : "Low"}`;
		}

		case "news_sentiment": {
			const positive = /growth|success|expansion|partnership|award/i.test(content);
			const negative = /decline|layoff|closure|investigation|fraud|scandal/i.test(
				content
			);
			const sentiment =
				positive && !negative ? "Positive" : negative && !positive ? "Negative" : "Mixed";
			return (
				`News Sentiment:\n` +
				`- Overall: ${sentiment}\n` +
				`- Positive signals: ${positive ? "Yes" : "No"}\n` +
				`- Negative signals: ${negative ? "Yes" : "No"}`
			);
		}

		default:
			return `Analysis type "${analysisType}" completed.`;
	}
}

// Deep scrape functionality
async function executeDeepScrape(
	sourceUrl: string,
	linkFilter?: string,
	_maxDepth: number = 1,
	maxLinks: number = 5,
	_formats: string[] = ["markdown"]
): Promise<{
	content: string;
	screenshots: Array<{ url: string; screenshot?: string }>;
}> {
	const screenshots: Array<{ url: string; screenshot?: string }> = [];

	try {
		type ScrapedDoc = {
			markdown?: string;
			links?: string[];
			metadata?: { title?: string; description?: string };
			screenshot?: string;
		};
		let data: ScrapedDoc;
		try {
			data = (await getFirecrawlClient().scrape(sourceUrl, {
				formats: ["markdown", "links", { type: "screenshot", fullPage: true }],
			})) as ScrapedDoc;
		} catch (scrapeError) {
			return {
				content: `Failed to scrape URL: ${scrapeError instanceof Error ? scrapeError.message : "Unknown error"}`,
				screenshots: [],
			};
		}

		if (!data.markdown) {
			return {
				content: `Failed to scrape source URL: No content found\n\nTip: Try using web_search with scrape_content=true for better results.`,
				screenshots: [],
			};
		}

		if (data.screenshot) {
			screenshots.push({ url: sourceUrl, screenshot: data.screenshot });
		}

		let output = `Source page scraped successfully\n`;
		output = `${output}Title: ${data.metadata?.title || "Unknown"}\n\n`;
		if (data.markdown) {
			const contentPreview =
				data.markdown.length > 3000
					? `${data.markdown.substring(0, 3000)}...\n[Content truncated]`
					: data.markdown;
			output = `${output}Page content:\n${contentPreview}\n\n`;
		}

		if (!linkFilter) {
			output = `${output}\nFound ${data.links?.length || 0} links on this page.\n`;
			output = `${output}To follow specific links, use the link_filter parameter.\n`;
			return { content: output, screenshots };
		}

		const allLinks: string[] = data.links || [];
		const filterRegex = new RegExp(linkFilter, "i");
		const filteredLinks = allLinks.filter((link: string) => filterRegex.test(link));
		output = `${output}Filtered to ${filteredLinks.length} links matching pattern "${linkFilter}"\n\n`;

		const linksToScrape = filteredLinks.slice(0, maxLinks);
		if (linksToScrape.length === 0) {
			output = `${output}No links to scrape after filtering.\n`;
			return { content: output, screenshots };
		}

		output = `${output}Following ${linksToScrape.length} links:\n`;
		const scrapePromises = linksToScrape.map(async (link: string) => {
			try {
				const result = await getFirecrawlClient().scrape(link, {
					formats: ["markdown", { type: "screenshot", fullPage: true }],
				});
				const resultData = result as {
					markdown?: string;
					metadata?: { title?: string; description?: string };
					links?: string[];
					screenshot?: string;
				};
				if (resultData.markdown) {
					if (resultData.screenshot) {
						screenshots.push({ url: link, screenshot: resultData.screenshot });
					}
					return {
						url: link,
						title: resultData.metadata?.title ?? "Unknown",
						description: resultData.metadata?.description ?? "",
						content: resultData.markdown?.substring(0, 500) ?? "",
						links: resultData.links?.length ?? 0,
						hasScreenshot: !!resultData.screenshot,
					};
				}
				return null;
			} catch {
				return null;
			}
		});

		const results = await Promise.all(scrapePromises);
		const successfulScrapes = results.filter(
			(r): r is NonNullable<typeof r> => r !== null
		);
		output = `${output}\nSuccessfully scraped ${successfulScrapes.length} pages:\n\n`;
		for (const [index, result] of successfulScrapes.entries()) {
			output = `${output}[${index + 1}] ${result.title}\n`;
			output = `${output}URL: ${result.url}\n`;
			output = `${output}Description: ${result.description}\n`;
			output = `${output}Content preview: ${result.content}...\n\n`;
		}

		return { content: output, screenshots };
	} catch (error) {
		return {
			content: `Error performing deep scrape: ${error instanceof Error ? error.message : "Unknown error"}`,
			screenshots: [],
		};
	}
}

// Execute tool based on name
export async function executeTool(
	toolName: string,
	input: Record<string, unknown>
): Promise<{
	content: string;
	screenshots?: Array<{ url: string; screenshot?: string }>;
}> {
	switch (toolName) {
		case "web_search":
			return await executeWebSearch(
				input.query as string,
				(input.limit as number) || 5,
				input.scrape_content as boolean,
				input.tbs as string | undefined
			);
		case "deep_scrape":
			return await executeDeepScrape(
				input.source_url as string,
				input.link_filter as string | undefined,
				(input.max_depth as number) || 1,
				(input.max_links as number) || 5,
				(input.formats as string[]) || ["markdown"]
			);
		case "analyze_content":
			return {
				content: await analyzeContent(
					input.content as string,
					input.analysis_type as string,
					input.context as string | undefined
				),
			};
		default:
			return { content: `Unknown tool: ${toolName}` };
	}
}

// Input/Output types
export interface CompanyProfileScreeningInput {
	applicantId: number;
	workflowId: number;
	applicantData: ApplicantData;
}

export interface CompanyProfileScreeningResult {
	passed: boolean;
	summaryRating?: number;
	evidence: Array<{
		source: string;
		sourceUrl?: string;
		details: Record<string, unknown>;
	}>;
	riskFlags: string[];
	sourcesChecked: string[];
	reasoning: string;
}

const SYSTEM_PROMPT = `You are a company profile screening specialist for StratCol, a financial services company conducting onboarding due diligence.

Your goal is to perform broad screening of company reputation, public records, news, and compliance signals for a given company.

SEARCH STRATEGY:
1. Reviews: Use site:hellopeter.com, site:trustpilot.com, or general search for "[company name] reviews"
2. Complaints: Search "[company name] complaints" or "site:hellopeter.com [company name]"
3. News: Search "[company name] news", "[company name] lawsuit", "[company name] fraud"
4. Regulatory: Search CIPC, NCR, FSCA, or industry-specific regulators with the company name
5. Sanctions: If relevant, search OFAC, UN, FIC with company or director names

Be thorough but efficient. Start with high-signal searches. Use scrape_content=true or deep_scrape only when metadata is insufficient. Prefer web_search with scrape_content=false first to assess relevance.

OUTPUT:
Provide a structured summary with:
- Evidence found (sources, URLs, key findings)
- Risk flags (complaints, litigation, sanctions, negative news)
- Pass/fail recommendation (pass if no significant red flags; fail or review if concerns)
- Reasoning for your conclusion

Use the tools to gather information, then synthesize your findings.`;

function buildUserPrompt(applicantData: ApplicantData): string {
	const parts = [`Screen company: ${applicantData.companyName}.`];
	if (applicantData.contactName) {
		parts.push(`Contact: ${applicantData.contactName}.`);
	}
	if (applicantData.industry) {
		parts.push(`Industry: ${applicantData.industry}.`);
	}
	parts.push(
		"Search for reviews, complaints, news, regulatory status, and any red flags. Provide a structured screening summary with evidence, risk flags, and pass/fail recommendation."
	);
	return parts.join(" ");
}

// Convert Gemini parameters to executeTool input (handle camelCase from API)
function normalizeToolInput(
	_name: string,
	args: Record<string, unknown>
): Record<string, unknown> {
	const {
		scrapeContent,
		sourceUrl,
		linkFilter,
		maxDepth,
		maxLinks,
		analysisType,
		...rest
	} = args;
	return {
		...rest,
		...(scrapeContent !== undefined && { scrape_content: scrapeContent }),
		...(sourceUrl !== undefined && { source_url: sourceUrl }),
		...(linkFilter !== undefined && { link_filter: linkFilter }),
		...(maxDepth !== undefined && { max_depth: maxDepth }),
		...(maxLinks !== undefined && { max_links: maxLinks }),
		...(analysisType !== undefined && { analysis_type: analysisType }),
	};
}

/**
 * Perform company profile screening using Gemini 3.1 Pro and Firecrawl tools.
 * Non-streaming background agent — returns final text summary.
 */
export async function performCompanyProfileScreening(
	input: CompanyProfileScreeningInput
): Promise<string> {
	if (!isAIConfigured()) {
		throw new Error(
			"[CompanyProfileScreening] AI is not configured. Set GOOGLE_GENAI_KEY to enable."
		);
	}

	const ai = getGenAIClient();
	const userPrompt = buildUserPrompt(input.applicantData);

	const toolsConfig = {
		tools: [
			{
				functionDeclarations: GEMINI_TOOLS.map(t => ({
					name: t.name,
					description: t.description,
					parameters: t.parameters,
				})),
			},
		],
	};

	const contents: Array<{
		role: "user" | "model";
		parts: Array<
			| { text: string }
			| { functionCall: { name: string; args: Record<string, unknown> } }
			| { functionResponse: { name: string; response: { result: unknown } } }
		>;
	}> = [
		{
			role: "user",
			parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }],
		},
	];

	const maxToolRounds = 10;
	let round = 0;
	let finalResponse = "";

	while (round < maxToolRounds) {
		round++;

		const response = await ai.models.generateContent({
			model: getCompanyScreeningModel(),
			contents,
			config: toolsConfig,
		});

		// Check for function calls
		const functionCalls = response.functionCalls ?? [];
		if (functionCalls.length === 0) {
			// No tool calls — we have the final text response
			finalResponse = response.text ?? "";
			break;
		}

		// Add model response (with function calls) to contents
		contents.push({
			role: "model",
			parts: functionCalls.map(fc => ({
				functionCall: {
					name: fc.name,
					args: (fc.args as Record<string, unknown>) ?? {},
				},
			})),
		});

		// Execute each tool and collect responses
		const functionResponses: Array<{
			functionResponse: { name: string; response: { result: unknown } };
		}> = [];

		for (const fc of functionCalls) {
			const name = fc.name ?? "";
			const args = (fc.args as Record<string, unknown>) ?? {};
			const normalized = normalizeToolInput(name, args);
			const result = await executeTool(name, normalized);
			functionResponses.push({
				functionResponse: {
					name,
					response: { result: result.content },
				},
			});
		}

		// Add user message with tool results
		contents.push({
			role: "user",
			parts: functionResponses,
		});
	}

	if (!finalResponse && round >= maxToolRounds) {
		finalResponse =
			"Screening incomplete: maximum tool call rounds reached. Manual review recommended.";
	}

	return finalResponse;
}

export const ErrorMessages = {
	401: {
		title: "Authentication Required",
		message: "Please check your API key is valid and properly configured.",
		action: "Get your API key",
		actionUrl: "https://www.firecrawl.dev/app/api-keys",
	},
	402: {
		title: "Credits Exhausted",
		message: "You've run out of Firecrawl credits for this billing period.",
		action: "Upgrade your plan",
		actionUrl: "https://firecrawl.dev/pricing",
	},
	429: {
		title: "Rate Limit Reached",
		message: "Too many requests. Please wait a moment before trying again.",
		action: "Learn about rate limits",
		actionUrl: "https://docs.firecrawl.dev/rate-limits",
	},
	500: {
		title: "Something went wrong",
		message: "We encountered an unexpected error. Please try again.",
		action: "Contact support",
		actionUrl: "https://firecrawl.dev/support",
	},
	504: {
		title: "Request Timeout",
		message:
			"This request is taking longer than expected. Try with fewer pages or simpler content.",
		action: "Optimize your request",
		actionUrl: "https://docs.firecrawl.dev/best-practices",
	},
} as const;

export function getErrorMessage(
	statusCode: number
): (typeof ErrorMessages)[keyof typeof ErrorMessages] {
	return ErrorMessages[statusCode as keyof typeof ErrorMessages] ?? ErrorMessages[500];
}

export function selectRelevantContent(
	content: string,
	query: string,
	maxLength = 2000
): string {
	const paragraphs = content.split("\n\n").filter(p => p.trim());
	const intro = paragraphs.slice(0, 2).join("\n\n");
	const keywords = query
		.toLowerCase()
		.split(/\s+/)
		.filter(word => word.length > 3)
		.filter(
			word =>
				![
					"what",
					"when",
					"where",
					"which",
					"how",
					"why",
					"does",
					"with",
					"from",
					"about",
				].includes(word)
		);
	const relevantParagraphs = paragraphs
		.slice(2, -2)
		.map((paragraph, index) => ({
			text: paragraph,
			score: keywords.filter(kw => paragraph.toLowerCase().includes(kw)).length,
			index,
		}))
		.filter(p => p.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, 3)
		.sort((a, b) => a.index - b.index)
		.map(p => p.text);
	const conclusion = paragraphs.length > 2 ? paragraphs[paragraphs.length - 1] : "";
	let result = intro;
	if (relevantParagraphs.length > 0) {
		result = `${result}\n\n${relevantParagraphs.join("\n\n")}`;
	}
	if (conclusion) {
		result = `${result}\n\n${conclusion}`;
	}
	if (result.length > maxLength) {
		result = `${result.substring(0, maxLength - 3)}...`;
	}
	return result;
}
