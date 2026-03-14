// lib/procurecheck.ts

import {
	getMockProcureCheckVendorCreation,
	getMockProcureCheckVendorResults,
} from "@/lib/mock-integrations";
import { isMockEnvironmentEnabled } from "@/lib/mock-environment";

/**
 * ProcureCheck Integration
 * Sandbox Credentials from documentation:
 * Username: pgup@uj.ac.za
 * Password: PCTestadev1
 */

interface ProcureCheckConfig {
	baseUrl: string;
	username: string;
	password?: string;
}

const config: ProcureCheckConfig = {
	baseUrl: process.env.PROCURECHECK_BASE_URL?.includes("api/api")
		? process.env.PROCURECHECK_BASE_URL
		: "https://xdev.procurecheck.co.za/api/api/v1/",
	username: process.env.PROCURECHECK_USERNAME || "pgup@uj.ac.za",
	password: process.env.PROCURECHECK_PASSWORD || "PCTestadev1",
};

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Authenticate with ProcureCheck and get JWT
 * Caches token for valid duration (token usually lasts 20m)
 */
async function getJwt(): Promise<string> {
	if (cachedToken && Date.now() < tokenExpiry) {
		return cachedToken;
	}

	const res = await fetch(`${config.baseUrl}authenticate`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			username: config.username,
			password: config.password,
		}),
	});

	if (!res.ok) {
		const text = await res.text();
		console.error(`[ProcureCheck] Auth failed: ${res.status} ${text}`);
		throw new Error(`ProcureCheck Auth failed: ${res.status}`);
	}

	const data = await res.json();

	// Assuming response format { token: "..." } based on typical usage
	// Data might vary based on actual API response, but screenshots imply a token is returned
	const token = data.token || data.accessToken;

	if (!token) {
		console.error("[ProcureCheck] No token in auth response", data);
		throw new Error("ProcureCheck Auth: No token received");
	}

	cachedToken = token;
	// Set expiry to 18 minutes from now (conservative buffer for 20m expiry)
	tokenExpiry = Date.now() + 18 * 60 * 1000;

	return token;
}

export async function createTestVendor(vendorData: {
	vendorName: string;
	registrationNumber?: string | null;
	idNumber?: string | null;
	applicantId: number; // Used as external ID
	isProprietor?: boolean;
}) {
	if (isMockEnvironmentEnabled()) {
		return getMockProcureCheckVendorCreation(vendorData);
	}

	const token = await getJwt();

	if (vendorData.isProprietor) {
		if (!vendorData.idNumber) {
			throw new Error("ProcureCheck requires an ID number for Proprietors");
		}
	} else {
		if (!vendorData.registrationNumber) {
			throw new Error("ProcureCheck requires a registration number for Companies");
		}
	}

	// Sandbox specific: Use the GUID from screenshots for South Africa / Test
	// nationality_Id: "153A0FB2-CC8D-4805-80D2-5F996720FED9"
	const payload: Record<string, string | boolean> = {
		vendor_Name: vendorData.vendorName,
		vendorExternalID: `STC-${vendorData.applicantId}`, // Unique ID for our system
		nationality_Id: "153A0FB2-CC8D-4805-80D2-5F996720FED9",
		processBeeInfo: false,
	};

	let endpoint = "api/vendors/cipc?processBeeInfo=false";

	if (vendorData.isProprietor) {
		payload.idNumber = vendorData.idNumber;
		payload.entityType = "Individual";
		endpoint = "api/vendors/individual"; // Assumed endpoint for natural persons
	} else {
		payload.vendor_RegNum = vendorData.registrationNumber;
		payload.entityType = "Company";
	}

	const res = await fetch(`${config.baseUrl}${endpoint}`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`ProcureCheck CreateVendor failed: ${res.status} - ${text}`);
	}

	// Expecting JSON with a vendor ID or reference
	const responseData = await res.json();
	return responseData;
}

/**
 * Poll or Fetch Vendor Check Results
 */
export async function getVendorResults(vendorId: string | number) {
	if (isMockEnvironmentEnabled()) {
		return getMockProcureCheckVendorResults(vendorId);
	}

	const token = await getJwt();

	// URL construction based on standard REST patterns in docs/examples
	// Endpoint might be /vendorresults/?id=... or similar
	const url = `${config.baseUrl}vendorresults/?id=${vendorId}`;

	const res = await fetch(url, {
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
	});

	if (!res.ok) {
		// 404 might mean not ready yet? catch and return null or throw
		if (res.status === 404) return null;
		const text = await res.text();
		throw new Error(`ProcureCheck GetResults failed: ${res.status} - ${text}`);
	}

	return await res.json();
}
