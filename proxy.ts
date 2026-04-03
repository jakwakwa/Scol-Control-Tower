import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Routes that must bypass Clerk entirely.
 * The Inngest serve endpoint receives server-to-server requests from
 * the Inngest platform that carry no Clerk auth — running middleware
 * on it can interfere with request parsing and function invocation.
 */
const isInngestRoute = createRouteMatcher(["/api/inngest(.*)"]);

/**
 * Public routes that do not require authentication.
 * All other routes are treated as protected — this allows Clerk to perform
 * server-side JWT rotation for authenticated users before the route handler
 * runs, preventing the auth() → null → redirect-to-sign-in loop that occurs
 * when the short-lived JWT expires between client and server.
 */
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/"]);

export default clerkMiddleware(async (auth, req) => {
	// Inngest server-to-server requests — skip Clerk processing entirely
	if (isInngestRoute(req)) {
		return NextResponse.next();
	}

	// E2E Test Mode Bypass - Skip Clerk auth when test cookie is present
	const isE2ETestMode = req.cookies.get("__e2e_test_mode")?.value === "true";
	if (isE2ETestMode) {
		return NextResponse.next();
	}

	// Protect all non-public routes. This is the critical step that enables
	// Clerk to rotate the short-lived JWT server-side before route handlers
	// call auth(). Without this, an expired JWT causes auth() to return null
	// even when the Clerk session cookie is still valid, triggering an
	// infinite dashboard → sign-in → dashboard redirect loop.
	if (!isPublicRoute(req)) {
		await auth.protect();
	}
});

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		// Always run for API routes
		"/(api|trpc)(.*)",
	],
};
