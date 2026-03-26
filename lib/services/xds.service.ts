import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { applicants } from "@/db/schema";
import { ITC_THRESHOLDS, type ITCCheckResult } from "@/lib/types";
import {
	XDS_DEFAULT_PRODUCT_ID,
	XDS_DEFAULT_REPORT_ID,
	XDS_SERVICE_NAMESPACE,
	type XDSBusinessMatchResult,
	type XDSGetResultResponse,
	type XDSLoginResult,
	type XDSTicketValidationResult,
	extractNumericField,
	extractSoapFault,
	extractTextField,
	getXmlTagValue,
	mapXDSRiskCategory,
	mapXDSScoreToITCScore,
	parseBooleanString,
	parseResultIdFromText,
} from "./xds.types";

interface XDSCheckOptions {
	applicantId: number;
	workflowId: number;
	registrationNumber?: string;
}

const XDS_CONFIG = {
	username: process.env.XDS_USERNAME,
	password: process.env.XDS_PASSWORD,
	baseUrl: process.env.XDS_BASE_URL || "http://www.web.xds.co.za/XDSConnectWS",
	productId: process.env.XDS_PRODUCT_ID || XDS_DEFAULT_PRODUCT_ID,
	reportId: process.env.XDS_REPORT_ID || XDS_DEFAULT_REPORT_ID,
};

let cachedTicket: { ticket: string; expiresAt: number } | null = null;

export async function performXDSCreditCheck(
	options: XDSCheckOptions
): Promise<ITCCheckResult> {
	const { applicantId, registrationNumber } = options;

	if (!isXDSConfigured()) {
		return createManualRequiredResult(
			applicantId,
			"XDS API is not configured",
			"configuration"
		);
	}

	const applicantData = await fetchApplicant(applicantId);
	if (!applicantData) {
		throw new Error(`[XDSService] Applicant ${applicantId} not found`);
	}

	const identifier = registrationNumber || extractRegistrationNumber(applicantData);
	if (!identifier) {
		return createManualRequiredResult(
			applicantId,
			"No registration number found for XDS lookup",
			"registration_data"
		);
	}

	try {
		const ticket = await getValidTicket();
		const matchResult = await connectBusinessMatch(ticket, identifier);
		const getResult = await connectGetResult(ticket, matchResult.resultId ?? matchResult.resultText);
		return mapXDSResultToITCCheckResult(applicantId, getResult.resultText);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error("[XDSService] XDS check failed:", error);
		return createManualRequiredResult(applicantId, `XDS API failed: ${message}`, "xds");
	}
}

function isXDSConfigured(): boolean {
	return Boolean(XDS_CONFIG.username && XDS_CONFIG.password && XDS_CONFIG.baseUrl);
}

async function fetchApplicant(applicantId: number): Promise<{
	registrationNumber?: string | null;
	notes?: string | null;
} | null> {
	const db = getDatabaseClient();
	if (!db) return null;

	const rows = await db
		.select({
			registrationNumber: applicants.registrationNumber,
			notes: applicants.notes,
		})
		.from(applicants)
		.where(eq(applicants.id, applicantId));

	return rows[0] ?? null;
}

function getEndpointUrl(): string {
	return XDS_CONFIG.baseUrl.replace(/\?wsdl$/i, "");
}

function buildSoapEnvelope(method: string, params: string): string {
	return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:xds="${XDS_SERVICE_NAMESPACE}">
	<soap:Header/>
	<soap:Body>
		<xds:${method}>
${params}
		</xds:${method}>
	</soap:Body>
</soap:Envelope>`;
}

function escapeXml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

async function postSoap(method: string, envelope: string): Promise<string> {
	const endpoint = getEndpointUrl();
	const response = await fetch(endpoint, {
		method: "POST",
		headers: {
			"Content-Type": `application/soap+xml; charset=utf-8; action="${XDS_SERVICE_NAMESPACE}/${method}"`,
		},
		body: envelope,
	});

	const raw = await response.text();
	const fault = extractSoapFault(raw);
	if (fault) {
		throw new Error(
			`XDS SOAP fault (${method}): ${fault.code ? `${fault.code} - ` : ""}${fault.reason}${fault.detail ? ` (${fault.detail})` : ""}`
		);
	}

	if (!response.ok) {
		throw new Error(`XDS HTTP error (${method}): ${response.status} - ${raw}`);
	}

	return raw;
}

async function login(): Promise<XDSLoginResult> {
	const envelope = buildSoapEnvelope(
		"Login",
		`\t\t\t<xds:strUser>${escapeXml(XDS_CONFIG.username!)}</xds:strUser>
\t\t\t<xds:strPwd>${escapeXml(XDS_CONFIG.password!)}</xds:strPwd>`
	);
	const xml = await postSoap("Login", envelope);
	const ticket = getXmlTagValue(xml, "LoginResult");

	if (!ticket) {
		throw new Error("XDS login did not return LoginResult ticket");
	}

	return { ticket };
}

async function isTicketValid(ticket: string): Promise<XDSTicketValidationResult> {
	const envelope = buildSoapEnvelope(
		"IsTicketValid",
		`\t\t\t<xds:XDSConnectTicket>${escapeXml(ticket)}</xds:XDSConnectTicket>`
	);
	const xml = await postSoap("IsTicketValid", envelope);
	const result = getXmlTagValue(xml, "IsTicketValidResult");
	return { isValid: parseBooleanString(result) };
}

async function getValidTicket(): Promise<string> {
	if (cachedTicket && cachedTicket.expiresAt > Date.now()) {
		const cachedValidity = await isTicketValid(cachedTicket.ticket);
		if (cachedValidity.isValid) {
			return cachedTicket.ticket;
		}
		cachedTicket = null;
	}

	const { ticket } = await login();
	const validation = await isTicketValid(ticket);
	if (!validation.isValid) {
		throw new Error("XDS returned an invalid ticket immediately after login");
	}

	cachedTicket = {
		ticket,
		expiresAt: Date.now() + 5 * 60 * 60 * 1000,
	};

	return ticket;
}

async function connectBusinessMatch(
	ticket: string,
	registrationNumber: string
): Promise<XDSBusinessMatchResult> {
	const envelope = buildSoapEnvelope(
		"ConnectBusinessMatch",
		`\t\t\t<xds:XDSConnectTicket>${escapeXml(ticket)}</xds:XDSConnectTicket>
\t\t\t<xds:ProductID>${escapeXml(XDS_CONFIG.productId)}</xds:ProductID>
\t\t\t<xds:ReportID>${escapeXml(XDS_CONFIG.reportId)}</xds:ReportID>
\t\t\t<xds:RegistrationNumber>${escapeXml(registrationNumber)}</xds:RegistrationNumber>`
	);
	const xml = await postSoap("ConnectBusinessMatch", envelope);
	const resultText = getXmlTagValue(xml, "ConnectBusinessMatchResult");

	if (!resultText) {
		throw new Error("XDS ConnectBusinessMatch returned empty result");
	}

	return {
		resultText,
		resultId: parseResultIdFromText(resultText),
	};
}

async function connectGetResult(
	ticket: string,
	resultReference: string
): Promise<XDSGetResultResponse> {
	const envelope = buildSoapEnvelope(
		"ConnectGetResult",
		`\t\t\t<xds:XDSConnectTicket>${escapeXml(ticket)}</xds:XDSConnectTicket>
\t\t\t<xds:ResultID>${escapeXml(resultReference)}</xds:ResultID>`
	);
	const xml = await postSoap("ConnectGetResult", envelope);
	const resultText = getXmlTagValue(xml, "ConnectGetResultResult");

	if (!resultText) {
		throw new Error("XDS ConnectGetResult returned empty result");
	}

	return { resultText };
}

function mapXDSResultToITCCheckResult(
	applicantId: number,
	resultText: string
): ITCCheckResult {
	const rawScore = extractNumericField(resultText, [
		"CreditScore",
		"Score",
		"TotalScore",
		"ITCScore",
	]);
	const mappedScore = mapXDSScoreToITCScore(rawScore);
	const riskCategoryText = extractTextField(resultText, [
		"RiskCategory",
		"RiskClass",
		"RiskBand",
		"DelphiBand",
	]);
	const riskCategory = mapXDSRiskCategory(riskCategoryText);

	return {
		creditScore: mappedScore,
		riskCategory,
		passed: mappedScore >= ITC_THRESHOLDS.AUTO_DECLINE,
		recommendation: getRecommendation(mappedScore),
		adverseListings: [],
		checkedAt: new Date(),
		referenceNumber: `XDS-${applicantId}-${Date.now()}`,
		rawResponse: {
			provider: "xds",
			scoreSource: rawScore,
			riskCategorySource: riskCategoryText,
			resultText,
		},
	};
}

function getRecommendation(
	score: number
): "AUTO_APPROVE" | "MANUAL_REVIEW" | "AUTO_DECLINE" | "ENHANCED_DUE_DILIGENCE" {
	if (score >= ITC_THRESHOLDS.AUTO_APPROVE) return "AUTO_APPROVE";
	if (score >= ITC_THRESHOLDS.MANUAL_REVIEW) return "MANUAL_REVIEW";
	if (score >= ITC_THRESHOLDS.AUTO_DECLINE) return "ENHANCED_DUE_DILIGENCE";
	return "AUTO_DECLINE";
}

function extractRegistrationNumber(applicantData: {
	registrationNumber?: string | null;
	notes?: string | null;
}): string | null {
	if (applicantData.registrationNumber) {
		return applicantData.registrationNumber;
	}

	if (applicantData.notes) {
		const regMatch = applicantData.notes.match(/\d{4}\/\d+\/\d{2}/);
		if (regMatch) {
			return regMatch[0];
		}
	}

	return null;
}

function createManualRequiredResult(
	applicantId: number,
	reason: string,
	source: "xds" | "configuration" | "registration_data"
): ITCCheckResult {
	return {
		creditScore: 0,
		riskCategory: "HIGH",
		passed: false,
		recommendation: "MANUAL_REVIEW",
		adverseListings: [],
		checkedAt: new Date(),
		referenceNumber: `ITC-MANUAL-XDS-${applicantId}-${Date.now()}`,
		rawResponse: {
			status: "manual_required",
			source,
			reason,
		},
	};
}
