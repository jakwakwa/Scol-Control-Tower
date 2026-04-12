/**
 * Validation Agent - Real AI Implementation
 *
 * This agent performs document authenticity verification including:
 * - Document authenticity verification
 * - Data integrity checks
 * - Date validation
 * - Cross-reference verification
 * - Proof of residence legitimacy
 *
 * Uses Gemini AI for intelligent document analysis.
 */

import { z } from "zod";
import {
	getGenAIClient,
	getHighStakesModel,
	isAIConfigured,
} from "@/lib/ai/models";
import { ficaComparisonResultSchema } from "@/lib/validations/onboarding/fica-documents";

// ============================================
// Types & Schemas
// ============================================

export const ValidationResultSchema = z.object({
	// Document Authenticity
	isAuthentic: z.boolean().describe("Whether the document appears authentic"),
	authenticityScore: z
		.number()
		.min(0)
		.max(100)
		.describe("Confidence score for authenticity (0-100)"),
	authenticityFlags: z.array(z.string()).describe("Any red flags regarding authenticity"),

	// Data Integrity
	dataIntegrityPassed: z.boolean().describe("Whether data integrity checks passed"),
	dataIntegrityIssues: z
		.array(z.string())
		.describe("List of data integrity issues found"),

	// Date Validation
	documentDate: z.string().optional().describe("Date found on document (YYYY-MM-DD)"),
	dateValid: z.boolean().describe("Whether the document date is within acceptable range"),
	dateIssues: z.array(z.string()).describe("Any date-related issues"),

	// Cross-Reference Verification
	crossReferenceVerified: z.boolean().describe("Whether cross-references match"),
	crossReferenceDetails: z
		.object({
			nameMatch: z.boolean().describe("Name matches applicant records"),
			addressMatch: z.boolean().describe("Address matches provided details"),
			accountMatch: z.boolean().optional().describe("Account number matches"),
			idMatch: z.boolean().optional().describe("ID number matches"),
		})
		.describe("Cross-reference verification details"),

	// Proof of Residence Specifics
	isValidProofOfResidence: z
		.boolean()
		.optional()
		.describe("For address documents: is it valid proof of residence"),
	addressExtractionConfidence: z
		.number()
		.min(0)
		.max(100)
		.optional()
		.describe("Confidence in extracted address"),
	extractedAddress: z
		.object({
			street: z.string().optional(),
			city: z.string().optional(),
			province: z.string().optional(),
			postalCode: z.string().optional(),
		})
		.optional()
		.describe("Extracted address details"),

	// Overall Assessment
	overallValid: z.boolean().describe("Overall validation result"),
	overallScore: z.number().min(0).max(100).describe("Overall validation score"),
	recommendation: z
		.enum(["ACCEPT", "REVIEW", "REJECT", "REQUEST_NEW_DOCUMENT"])
		.describe("Recommended action"),
	reasoning: z.string().describe("Detailed reasoning for the validation result"),
	ficaComparison: ficaComparisonResultSchema
		.optional()
		.describe("Structured comparison between document evidence and applicant-provided FICA-relevant fields"),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema> & {
	dataSource: string;
};

export interface ValidationInput {
	documentType: string;
	documentContent: string; // Base64 or text content
	contentType: "text" | "base64";
	referenceDate?: string; // YYYY-MM-DD
	applicantData?: {
		companyName?: string;
		contactName?: string;
		idNumber?: string;
		registrationNumber?: string;
		address?: string;
		accountNumber?: string;
	};
	ficaComparisonContext?: {
		companyName?: string;
		tradingName?: string;
		registrationNumber?: string;
		idNumber?: string;
		contactName?: string;
		email?: string;
		phone?: string;
		accountNumber?: string;
		bankName?: string;
		branchCode?: string;
		address?: string;
	};
	workflowId: number;
}

// ============================================
// Validation Agent Implementation
// ============================================

/**
 * Validate a document using AI analysis
 */
export async function validateDocument(
	input: ValidationInput
): Promise<ValidationResult> {
	if (!isAIConfigured()) {
		throw new Error(
			"[ValidationAgent] AI is not configured. Set GOOGLE_GENAI_KEY to enable document validation."
		);
	}
	const prompt = buildValidationPrompt(input);
	const ai = getGenAIClient();

	try {
		const response = await ai.models.generateContent({
			model: getHighStakesModel(),
			config: {
				responseMimeType: "application/json",
				responseJsonSchema: z.toJSONSchema(ValidationResultSchema),
			},
			contents:
				input.contentType === "base64"
					? [
							{ text: prompt },
							{
								inlineData: {
									mimeType: "application/pdf",
									data: normalizeBase64Pdf(input.documentContent),
								},
							},
						]
					: prompt,
		});
		const rawText = response.text;
		if (process.env.LOG_LEVEL === "debug" || process.env.DEBUG_FIX) {
		}
		const parsed = JSON.parse(rawText);
		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
			console.error("[FIX:validation-agent] AI returned non-object JSON:", typeof parsed, JSON.stringify(parsed).slice(0, 300));
			throw new Error(`[ValidationAgent] AI returned ${typeof parsed} instead of expected object`);
		}
		const analysis = ValidationResultSchema.parse(parsed);
		const reconciledDateValidation = reconcileDateValidationAgainstReference(
			analysis,
			input.referenceDate
		);
		return { ...reconciledDateValidation, dataSource: "Gemini AI" };
	} catch (error) {
		console.error("[ValidationAgent] AI generation failed:", error);
		return {
			isAuthentic: false,
			authenticityScore: 0,
			authenticityFlags: ["AI Verification Failed"],
			dataIntegrityPassed: false,
			dataIntegrityIssues: ["System Error processing document"],
			dateValid: false,
			dateIssues: ["Could not verify date"],
			crossReferenceVerified: false,
			crossReferenceDetails: {
				nameMatch: false,
				addressMatch: false,
			},
			overallValid: false,
			overallScore: 0,
			recommendation: "REVIEW",
			reasoning:
				"AI Verification Failed. Manual review is required due to system error processing document.",
			ficaComparison: {
				documentType: input.documentType,
				fields: {},
				summary: {
					overallStatus: "INSUFFICIENT_DATA",
					mismatchCount: 0,
					criticalMismatchCount: 0,
					keyDiscrepancies: ["Validation service unavailable"],
				},
			},
			dataSource: "AI Error — Manual Escalation",
		};
	}
}

/**
 * Build the AI prompt for document validation
 */
function buildValidationPrompt(input: ValidationInput): string {
	const {
		documentType,
		documentContent,
		applicantData,
		ficaComparisonContext,
		referenceDate,
	} = input;
	const documentContentForPrompt =
		input.contentType === "base64"
			? "[PDF provided as inline document data. Analyze the attached document.]"
			: documentContent;

	let applicantContext = "";
	if (applicantData) {
		applicantContext = `
APPLICANT INFORMATION FOR CROSS-REFERENCE:
${applicantData.companyName ? `- Company Name: ${applicantData.companyName}` : ""}
${applicantData.contactName ? `- Contact Name: ${applicantData.contactName}` : ""}
${applicantData.idNumber ? `- ID Number: ${applicantData.idNumber}` : ""}
${applicantData.registrationNumber ? `- Registration Number: ${applicantData.registrationNumber}` : ""}
${applicantData.address ? `- Address: ${applicantData.address}` : ""}
${applicantData.accountNumber ? `- Account Number: ${applicantData.accountNumber}` : ""}
`;
	}

	let ficaContext = "";
	if (ficaComparisonContext) {
		ficaContext = `
FICA COMPARISON CONTEXT (APPLICANT-ENTERED DATA):
${ficaComparisonContext.companyName ? `- Company Name: ${ficaComparisonContext.companyName}` : ""}
${ficaComparisonContext.tradingName ? `- Trading Name: ${ficaComparisonContext.tradingName}` : ""}
${ficaComparisonContext.registrationNumber ? `- Registration Number: ${ficaComparisonContext.registrationNumber}` : ""}
${ficaComparisonContext.idNumber ? `- ID Number: ${ficaComparisonContext.idNumber}` : ""}
${ficaComparisonContext.contactName ? `- Contact Name: ${ficaComparisonContext.contactName}` : ""}
${ficaComparisonContext.email ? `- Email: ${ficaComparisonContext.email}` : ""}
${ficaComparisonContext.phone ? `- Telephone: ${ficaComparisonContext.phone}` : ""}
${ficaComparisonContext.accountNumber ? `- Account Number: ${ficaComparisonContext.accountNumber}` : ""}
${ficaComparisonContext.bankName ? `- Bank Name: ${ficaComparisonContext.bankName}` : ""}
${ficaComparisonContext.branchCode ? `- Branch Code: ${ficaComparisonContext.branchCode}` : ""}
${ficaComparisonContext.address ? `- Address: ${ficaComparisonContext.address}` : ""}
`;
	}

	return `You are a document verification specialist for StratCol, a financial services company.
Your task is to validate the authenticity and accuracy of submitted documents.

DOCUMENT TYPE: ${documentType}

${applicantContext}
${ficaContext}

DOCUMENT CONTENT:
${documentContentForPrompt}

VALIDATION REQUIREMENTS:
1. AUTHENTICITY CHECK:
   - Look for signs of document manipulation or forgery
   - Check if letterhead, formatting, and layout are consistent with legitimate documents
   - Verify official stamps, signatures, or watermarks are present where expected

2. DATA INTEGRITY:
   - Check for inconsistent fonts or formatting within the document
   - Look for mathematical errors in financial documents
   - Verify all required fields are present and readable

3. DATE VALIDATION:
   - REFERENCE DATE (sole temporal source): ${referenceDate ?? "not provided"}
   - Extract date values exactly as written in the document, then normalize to YYYY-MM-DD when possible.
   - Do NOT use your internal clock, current date knowledge, or assumptions about "today."
   - Do NOT independently infer whether a date is recent/old/future unless it is compared to REFERENCE DATE.
   - If REFERENCE DATE is missing or invalid, still extract dates but avoid relative-time judgments and explain uncertainty.
   - When comparing dates, use only document evidence + REFERENCE DATE.
   - For bank statements and proof of address, flag if older than 3 months relative to REFERENCE DATE.
   - For dateIssues, report concrete evidence (for example: "Document date 2025-01-04 is in the future vs reference 2024-12-31").

4. CROSS-REFERENCE:
   - Compare names, addresses, and account numbers against applicant data
   - Flag any discrepancies

6. FICA-SPECIFIC COMPARISON OUTPUT (MANDATORY):
   - Return a structured ficaComparison object.
   - Compare only fields relevant to this document type:
     - Bank statements: account holder, account number, bank name, branch code, company/trading name
     - ID docs: person name, ID number
     - Proof of address: address and person/company identifiers
     - Registration/corporate docs: company name and registration number
   - Use statuses: match, mismatch, not_provided, not_found, uncertain
   - Populate keyDiscrepancies with concrete mismatch statements.

5. PROOF OF RESIDENCE (if applicable):
   - Verify this is an acceptable proof of residence document
   - Acceptable: utility bills, bank statements, official government correspondence
   - Not acceptable: personal letters, receipts without address

SCORING GUIDELINES:
- 90-100: Document is clearly authentic with no issues
- 70-89: Minor issues but acceptable
- 50-69: Significant concerns, manual review required
- Below 50: Major issues, likely reject or request new document

GROUNDING RULES (CRITICAL):
- Use only evidence that is explicitly present in the document content or applicant context.
- Do NOT invent names, addresses, account details, dates, mandate amounts, or any missing field.
- If a field cannot be verified from evidence, mark the related checks as failed/review and explain why evidence is insufficient.
- For unreadable, blurry, or corrupted content, set recommendation to REVIEW or REQUEST_NEW_DOCUMENT.

Be thorough but fair. Not all minor formatting inconsistencies indicate fraud.`;
}

function normalizeBase64Pdf(raw: string): string {
	return raw.replace(/^data:application\/pdf;base64,/, "").trim();
}

// ============================================
// Batch Validation
// ============================================

export interface BatchValidationInput {
	documents: Array<{
		id: string;
		type: string;
		content: string;
		contentType: "text" | "base64";
	}>;
	applicantData?: ValidationInput["applicantData"];
	ficaComparisonContext?: ValidationInput["ficaComparisonContext"];
	referenceDate?: ValidationInput["referenceDate"];
	workflowId: number;
}

export interface BatchValidationResult {
	results: Array<{
		documentId: string;
		documentType: string;
		validation: ValidationResult;
	}>;
	summary: {
		totalDocuments: number;
		passed: number;
		requiresReview: number;
		failed: number;
		overallRecommendation: "PROCEED" | "REVIEW_REQUIRED" | "STOP";
	};
}

/**
 * Validate multiple documents in batch
 */
export async function validateDocumentsBatch(
	input: BatchValidationInput
): Promise<BatchValidationResult> {
	const results = await Promise.all(
		input.documents.map(async doc => ({
			documentId: doc.id,
			documentType: doc.type,
			validation: await validateDocument({
				documentType: doc.type,
				documentContent: doc.content,
				contentType: doc.contentType,
				referenceDate: input.referenceDate,
				applicantData: input.applicantData,
				ficaComparisonContext: input.ficaComparisonContext,
				workflowId: input.workflowId,
			}),
		}))
	);

	const passed = results.filter(r => r.validation.overallValid).length;
	const requiresReview = results.filter(
		r => r.validation.recommendation === "REVIEW"
	).length;
	const failed = results.filter(
		r =>
			r.validation.recommendation === "REJECT" ||
			r.validation.recommendation === "REQUEST_NEW_DOCUMENT"
	).length;

	let overallRecommendation: "PROCEED" | "REVIEW_REQUIRED" | "STOP";
	if (failed > 0) {
		overallRecommendation = "STOP";
	} else if (requiresReview > 0) {
		overallRecommendation = "REVIEW_REQUIRED";
	} else {
		overallRecommendation = "PROCEED";
	}

	return {
		results,
		summary: {
			totalDocuments: input.documents.length,
			passed,
			requiresReview,
			failed,
			overallRecommendation,
		},
	};
}

function reconcileDateValidationAgainstReference(
	analysis: z.infer<typeof ValidationResultSchema>,
	referenceDate?: string
): z.infer<typeof ValidationResultSchema> {
	if (referenceDate == null) {
		return analysis;
	}
	const documentDate = analysis.documentDate;
	if (documentDate == null) {
		return analysis;
	}

	const reference = parseIsoDate(referenceDate);
	const extracted = parseIsoDate(documentDate);
	if (reference == null || extracted == null) {
		return analysis;
	}

	const isActuallyFuture = extracted.getTime() > reference.getTime();
	if (isActuallyFuture) {
		return analysis;
	}

	const hallucinatedFutureIssue = analysis.dateIssues.some(issue =>
		/(future|ahead of reference|after reference)/i.test(issue)
	);
	if (!hallucinatedFutureIssue) {
		return analysis;
	}

	const normalizedIssues = analysis.dateIssues.filter(
		issue => !/(future|ahead of reference|after reference)/i.test(issue)
	);

	return {
		...analysis,
		dateIssues: normalizedIssues,
		dateValid: normalizedIssues.length === 0,
	};
}

function parseIsoDate(value: string): Date | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return null;
	}
	const parsed = new Date(`${value}T00:00:00.000Z`);
	if (Number.isNaN(parsed.getTime())) {
		return null;
	}
	return parsed;
}
