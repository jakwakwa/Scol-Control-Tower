import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

type AuthSuccess = { userId: string };
type BearerAuthSuccess = {
	source: "bearer";
};
type ClerkAuthSuccess = {
	source: "clerk";
	userId: string;
};

export type RequireAuthResult = AuthSuccess | NextResponse;
export type RequireAuthOrBearerResult =
	| ClerkAuthSuccess
	| BearerAuthSuccess
	| NextResponse;

const getAuthTokenFromHeader = (request: Request): string | null => {
	const authHeader = request.headers.get("authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		return null;
	}
	return authHeader.slice("Bearer ".length).trim();
};

const getExpectedToken = (): string | null =>
	process.env.GAS_WEBHOOK_SECRET || process.env.CRON_SECRET || null;

export async function requireAuth(): Promise<RequireAuthResult> {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json(
			{ error: "Unauthorized - Authentication required" },
			{ status: 401 }
		);
	}
	return { userId };
}

export function validateBearerToken(request: Request): boolean {
	const token = getAuthTokenFromHeader(request);
	const expectedToken = getExpectedToken();
	return !!token && !!expectedToken && token === expectedToken;
}

export async function requireAuthOrBearer(
	request: Request
): Promise<RequireAuthOrBearerResult> {
	const { userId } = await auth();
	if (userId) {
		return { source: "clerk", userId };
	}
	if (validateBearerToken(request)) {
		return { source: "bearer" };
	}
	return NextResponse.json(
		{ error: "Unauthorized - Authentication or valid API token required" },
		{ status: 401 }
	);
}
