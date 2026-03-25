/**
 * XDS Connect Web Service Types and XML Helpers
 *
 * XDS exposes SOAP XML web service operations for login, ticket validation,
 * business match, and result retrieval.
 */

export const XDS_SOAP_NAMESPACE = "http://www.w3.org/2003/05/soap-envelope";
export const XDS_SERVICE_NAMESPACE = "http://www.web.xds.co.za/XDSConnectWS";
export const XDS_DEFAULT_PRODUCT_ID = "41";
export const XDS_DEFAULT_REPORT_ID = "18";

export interface XDSLoginResult {
	ticket: string;
}

export interface XDSTicketValidationResult {
	isValid: boolean;
}

export interface XDSBusinessMatchResult {
	resultText: string;
	resultId: string | null;
}

export interface XDSGetResultResponse {
	resultText: string;
}

export interface XDSFault {
	code?: string;
	reason: string;
	detail?: string;
}

export function decodeXmlEntities(value: string): string {
	return value
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&quot;", '"')
		.replaceAll("&apos;", "'")
		.replaceAll("&amp;", "&");
}

export function getXmlTagValue(xml: string, tagName: string): string | null {
	const patterns = [
		new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "i"),
		new RegExp(`<\\w+:${tagName}>([\\s\\S]*?)</\\w+:${tagName}>`, "i"),
	];

	for (const pattern of patterns) {
		const match = xml.match(pattern);
		if (match?.[1]) {
			return decodeXmlEntities(match[1].trim());
		}
	}

	return null;
}

export function parseBooleanString(value: string | null): boolean {
	if (!value) return false;
	return value.trim().toLowerCase() === "true";
}

export function extractSoapFault(xml: string): XDSFault | null {
	const faultNode = xml.match(/<(?:\w+:)?Fault>([\s\S]*?)<\/(?:\w+:)?Fault>/i);
	if (!faultNode?.[1]) {
		return null;
	}

	const body = faultNode[1];
	const code = getXmlTagValue(body, "Value") ?? getXmlTagValue(body, "faultcode") ?? undefined;
	const reason =
		getXmlTagValue(body, "Text") ??
		getXmlTagValue(body, "faultstring") ??
		"Unknown SOAP fault";
	const detail = getXmlTagValue(body, "detail") ?? undefined;

	return { code, reason, detail };
}

export function parseResultIdFromText(value: string): string | null {
	const patterns = [
		/<(?:\w+:)?ResultId>([\s\S]*?)<\/(?:\w+:)?ResultId>/i,
		/\bresult(?:\s|_)?id\b[^A-Za-z0-9]*([A-Za-z0-9-]{6,})/i,
		/\bid\b[^A-Za-z0-9]*([A-Za-z0-9-]{6,})/i,
	];

	for (const pattern of patterns) {
		const match = value.match(pattern);
		if (match?.[1]) {
			return decodeXmlEntities(match[1].trim());
		}
	}

	return null;
}

export function mapXDSRiskCategory(
	value: string | null | undefined
): "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH" {
	const normalized = (value ?? "").trim().toLowerCase();

	if (
		normalized.includes("very low") ||
		normalized === "low" ||
		normalized.includes("minimal")
	) {
		return "LOW";
	}

	if (normalized.includes("medium") || normalized.includes("moderate")) {
		return "MEDIUM";
	}

	if (normalized.includes("very high") || normalized.includes("severe")) {
		return "VERY_HIGH";
	}

	if (normalized.includes("high")) {
		return "HIGH";
	}

	return "MEDIUM";
}

export function mapXDSScoreToITCScore(score: number | null | undefined): number {
	if (typeof score !== "number" || Number.isNaN(score)) {
		return 0;
	}

	// XDS score scales can vary by report type. Clamp to the common 0-999 range.
	if (score <= 999) {
		return Math.max(0, Math.min(999, Math.round(score)));
	}

	// If a provider gives a percentage-like scale, map to 0-999.
	if (score <= 100) {
		return Math.round((score / 100) * 999);
	}

	return 999;
}

export function extractNumericField(resultText: string, fieldNames: string[]): number | null {
	for (const field of fieldNames) {
		const tagPattern = new RegExp(
			`<(?:\\w+:)?${field}>([\\s\\S]*?)<\\/(?:\\w+:)?${field}>`,
			"i"
		);
		const inlinePattern = new RegExp(`${field}[^\\d-]*(-?\\d+(?:\\.\\d+)?)`, "i");
		const tagMatch = resultText.match(tagPattern);
		const inlineMatch = resultText.match(inlinePattern);
		const rawValue = tagMatch?.[1] ?? inlineMatch?.[1];

		if (rawValue) {
			const parsed = Number.parseFloat(rawValue.trim());
			if (!Number.isNaN(parsed)) {
				return parsed;
			}
		}
	}

	return null;
}

export function extractTextField(resultText: string, fieldNames: string[]): string | null {
	for (const field of fieldNames) {
		const tagPattern = new RegExp(
			`<(?:\\w+:)?${field}>([\\s\\S]*?)<\\/(?:\\w+:)?${field}>`,
			"i"
		);
		const inlinePattern = new RegExp(`${field}[^A-Za-z]*([A-Za-z_\\s-]{3,})`, "i");
		const tagMatch = resultText.match(tagPattern);
		const inlineMatch = resultText.match(inlinePattern);
		const rawValue = tagMatch?.[1] ?? inlineMatch?.[1];

		if (rawValue) {
			return decodeXmlEntities(rawValue.trim());
		}
	}

	return null;
}
