import { NextResponse } from "next/server";

/**
 * POST /api/risk-review/applicants/[id]/checks/social-reputation
 *
 * DEPRECATED — Social reputation (HelloPeter) Firecrawl checks have been removed.
 * The underlying scrape-based implementation targeted hallucinated URLs
 * and never produced reliable results. A future social-check architecture
 * may be designed from scratch in a separate effort.
 */
export function POST() {
	return NextResponse.json(
		{
			error:
				"Gone — social reputation Firecrawl checks have been deprecated and removed.",
		},
		{ status: 410 }
	);
}
