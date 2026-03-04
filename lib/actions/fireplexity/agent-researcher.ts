// Common company name to ticker symbol mappings

// Market-related keywords that indicate user wants stock/market information
const marketKeywords = [
	"stock",
	"share",
	"price",
	"market",
	"trading",
	"trade",
	"invest",
	"ticker",
	"chart",
	"technical analysis",
	"market cap",
	"valuation",
	"earnings",
	"revenue",
	"profit",
	"loss",
	"p/e",
	"dividend",
	"performance",
	"quote",
	"$",
	"nasdaq",
	"nyse",
	"doing",
	"up",
	"down",
];

// Function to detect company ticker from text - STRICT VERSION
export function detectCompanyTicker(text: string): string | null {
	const lowerText = text.toLowerCase();

	// First check if the query is actually about market/stock information
	const isMarketQuery = marketKeywords.some(keyword => lowerText.includes(keyword));

	// Also check for common patterns like "how is X doing"
	const marketPatterns = [
		/how\s+is\s+\w+\s+doing/i,
		/what('s|\s+is)\s+\w+\s+stock/i,
		/\$[A-Z]+/, // Stock symbols with $
	];

	const hasMarketPattern = marketPatterns.some(pattern => pattern.test(text));

	// If not a market query, return null
	if (!(isMarketQuery || hasMarketPattern)) {
		return null;
	}

	// Check for direct ticker mentions (e.g., $AAPL, AAPL stock, NASDAQ:AAPL)
	const tickerPatterns = [
		/\$([A-Z]{1,5})\b/, // $AAPL
		/\b([A-Z]{1,5})\s+(?:stock|share|price|chart)/i, // AAPL stock/share/price/chart
		/\b(NYSE|NASDAQ|AMEX):([A-Z.]{1,5})\b/i, // NASDAQ:AAPL
	];

	for (const pattern of tickerPatterns) {
		const match = text.match(pattern);
		if (match) {
			if (pattern.source.includes("NYSE|NASDAQ")) {
				return match[0].toUpperCase();
			} else if (match[1]) {
				const ticker = match[1].toUpperCase();
				// Validate it's a known ticker
				const foundTicker = Object.values(companyTickerMap).find(t => t.includes(ticker));
				if (foundTicker) {
					return foundTicker;
				}
			}
		}
	}

	// Check for explicit company name + market keyword combinations
	// Sort entries by length (longer names first) to avoid partial matches
	const sortedEntries = Object.entries(companyTickerMap).sort(
		(a, b) => b[0].length - a[0].length
	);

	for (const [company, ticker] of sortedEntries) {
		// Escape special regex characters in company name
		const escapedCompany = company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

		// Check if the query mentions this company with market context
		// More flexible pattern: company name anywhere in text with market keywords
		const companyRegex = new RegExp(`\\b${escapedCompany}\\b`, "i");

		if (companyRegex.test(lowerText)) {
			return ticker;
		}
	}

	return null;
}
