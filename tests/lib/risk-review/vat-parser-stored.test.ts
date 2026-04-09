import { describe, expect, test } from "bun:test";
import { parseStoredVatStatus } from "@/lib/risk-review/parsers/vat.parser";

describe("parseStoredVatStatus", () => {
	test("accepts canonical VAT status strings", () => {
		expect(parseStoredVatStatus("verified")).toBe("verified");
		expect(parseStoredVatStatus("manual_review")).toBe("manual_review");
	});

	test("rejects unknown strings", () => {
		expect(parseStoredVatStatus("nope")).toBe("not_checked");
		expect(parseStoredVatStatus(null)).toBe("not_checked");
	});
});
