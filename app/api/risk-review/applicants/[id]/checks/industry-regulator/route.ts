import { NextResponse } from "next/server";

/**
 * POST /api/risk-review/applicants/[id]/checks/industry-regulator
 *
 * DEPRECATED — Industry regulator Firecrawl checks have been removed.
 * The underlying scrape-based implementation targeted hallucinated URLs
 * and never produced reliable results. A future regulator-check architecture
 * may be designed from scratch in a separate effort.
 */
export function POST() {
	return NextResponse.json(
		{
			error:
				"Gone — industry regulator Firecrawl checks have been deprecated and removed.",
		},
		{ status: 410 }
	);
}
