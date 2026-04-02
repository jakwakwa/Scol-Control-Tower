import { type NextRequest, NextResponse } from "next/server";
import { requireAuthOrBearer } from "@/lib/auth/api-auth";
import {
	authenticate,
	getProcureCheckProxyOption,
	getProcureCheckRuntimeConfig,
	getVendorsList,
	withProcureCheckProxy,
} from "@/lib/procurecheck";

type PublicIpResponse = {
	ip: string;
};

async function getObservedPublicIp(): Promise<string | null> {
	try {
		const response = await fetch(
			"https://api.ipify.org?format=json",
			withProcureCheckProxy({
				method: "GET",
				cache: "no-store",
			})
		);
		if (!response.ok) {
			return null;
		}
		const json = (await response.json()) as PublicIpResponse;
		return typeof json.ip === "string" ? json.ip : null;
	} catch {
		return null;
	}
}

export async function GET(request: NextRequest) {
	try {
		const authResult = await requireAuthOrBearer(request);
		if (authResult instanceof NextResponse) {
			return authResult;
		}

		const runtimeConfig = getProcureCheckRuntimeConfig();
		const observedPublicIpPromise = getObservedPublicIp();

		const token = await authenticate();
		const vendors = await getVendorsList(token);
		const observedPublicIp = await observedPublicIpPromise;
		const proxyConfigured = Boolean(getProcureCheckProxyOption());
		const listedRecords = Array.isArray(vendors.Data) ? vendors.Data.length : 0;

		return NextResponse.json({
			ok: true,
			environment: runtimeConfig.environment,
			baseUrl: runtimeConfig.baseUrl,
			egressOwner: runtimeConfig.egressOwner,
			observedPublicIp,
			proxyConfigured,
			tokenIssued: true,
			vendorsGetListOk: true,
			listedRecords,
			checkedAt: new Date().toISOString(),
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				error:
					error instanceof Error
						? error.message
						: "Unknown ProcureCheck network check error",
				checkedAt: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
