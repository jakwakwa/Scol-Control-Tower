import { z } from "zod";
import { agentWithSchema } from "../firecrawl.client";

const VAT_SEARCH_URL = "https://www.vatsearch.co.za/vat-search";

const VatSearchResultSchema = z.object({
	vatsearch_success_message: z.string().optional(),
	vatsearch_success_message_citation: z.string().optional(),
	vatsearch_table_data: z
		.array(
			z.object({
				vat_trading_name: z.string(),
				vat_trading_name_citation: z.string().optional(),
				vat_registration_number: z.string(),
				vat_registration_number_citation: z.string().optional(),
				office: z.string(),
				office_citation: z.string().optional(),
			})
		)
		.optional(),
	vatsearch_failure_message: z.string().optional(),
	vatsearch_failure_message_citation: z.string().optional(),
});

export interface VatVerificationInput {
	vatNumber: string;
	companyName?: string;
	workflowId: number;
	applicantId: number;
}

export interface VatVerificationResult {
	status: "live" | "offline";
	result?: {
		verified: boolean;
		vatNumber: string;
		tradingName?: string;
		office?: string;
		successMessage?: string;
		failureMessage?: string;
		sourceUrl: string;
		latencyMs: number;
		runtimeState: "success" | "partial" | "error" | "blocked" | "action_required";
	};
}

export async function runVatVerificationCheck(
	input: VatVerificationInput
): Promise<VatVerificationResult> {
	const vatNumber = input.vatNumber.trim();
	if (!/^\d{10}$/.test(vatNumber)) {
		throw new Error("VAT number must be exactly 10 digits");
	}

	const entityHint = input.companyName?.trim()
		? ` for ${input.companyName.trim()}`
		: "";

	const prompt = `Extract VAT registration details${entityHint} (VAT number ${vatNumber}) from the provided website. Capture the success message "Search produced folowing results..." and the table data containing VAT Trading Name, VAT Registration Number, and Office. If the search fails, capture the "Invalid Vat Number" message.`;

	const agentResult = await agentWithSchema({
		prompt,
		schema: VatSearchResultSchema,
		urls: [VAT_SEARCH_URL],
		model: "spark-1-mini",
		timeoutMs: 120_000,
	});

	const data = agentResult.data;
	const firstMatch = data?.vatsearch_table_data?.[0];
	const hasSuccessfulTable = Boolean(firstMatch);
	const hasFailureMessage = Boolean(data?.vatsearch_failure_message);
	const verified = hasSuccessfulTable && !hasFailureMessage;

	return {
		status: agentResult.success ? "live" : "offline",
		result: {
			verified,
			vatNumber,
			tradingName: firstMatch?.vat_trading_name,
			office: firstMatch?.office,
			successMessage: data?.vatsearch_success_message,
			failureMessage: data?.vatsearch_failure_message,
			sourceUrl: agentResult.sourceUrl,
			latencyMs: agentResult.latencyMs,
			runtimeState: agentResult.runtimeState,
		},
	};
}
