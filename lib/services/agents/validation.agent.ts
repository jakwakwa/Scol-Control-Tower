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

import { generateObject } from "ai";
import { z } from "zod";
import { AI_CONFIG, getThinkingModel, isAIConfigured } from "@/lib/ai/models";

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
});

export type ValidationResult = z.infer<typeof ValidationResultSchema> & {
	dataSource: string;
};

export interface ValidationInput {
	documentType: string;
	documentContent: string; // Base64 or text content
	contentType: "text" | "base64";
	applicantData?: {
		companyName?: string;
		contactName?: string;
		idNumber?: string;
		registrationNumber?: string;
		address?: string;
		accountNumber?: string;
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
			"[ValidationAgent] AI is not configured. Set GOOGLE_GENERATIVE_AI_API_KEY to enable document validation."
		);
	}

	const prompt = buildValidationPrompt(input);

	const { object } = await generateObject({
		model: getThinkingModel(),
		schema: ValidationResultSchema,
		schemaName: "DocumentValidation",
		schemaDescription: "Document authenticity and validation analysis",
		prompt,
		temperature: AI_CONFIG.ANALYSIS_TEMPERATURE,
	});
	return { ...object, dataSource: "Gemini AI" };
}

/**
 * Build the AI prompt for document validation
 */
function buildValidationPrompt(input: ValidationInput): string {
	const { documentType, documentContent, applicantData } = input;

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

	return `You are a document verification specialist for StratCol, a financial services company.
Your task is to validate the authenticity and accuracy of submitted documents.

DOCUMENT TYPE: ${documentType}

${applicantContext}

DOCUMENT CONTENT:
${documentContent}

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
   - Extract the document date
   - For bank statements: must be within last 3 months
   - For proof of address: must be within last 3 months
   - For ID documents: check expiry date if applicable
   - For registration certificates: note if renewal is needed

4. CROSS-REFERENCE:
   - Compare names, addresses, and account numbers against applicant data
   - Flag any discrepancies

5. PROOF OF RESIDENCE (if applicable):
   - Verify this is an acceptable proof of residence document
   - Acceptable: utility bills, bank statements, official government correspondence
   - Not acceptable: personal letters, receipts without address

SCORING GUIDELINES:
- 90-100: Document is clearly authentic with no issues
- 70-89: Minor issues but acceptable
- 50-69: Significant concerns, manual review required
- Below 50: Major issues, likely reject or request new document

Be thorough but fair. Not all minor formatting inconsistencies indicate fraud.`;
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
				applicantData: input.applicantData,
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
