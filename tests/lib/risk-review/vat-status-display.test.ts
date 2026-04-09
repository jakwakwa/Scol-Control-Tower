import { describe, expect, test } from "bun:test";
import {
	formatVatStatus,
	getVatStatusExplanation,
} from "@/lib/risk-review/vat-status-display";

describe("vat-status-display", () => {
	test("four headline labels for primary outcomes", () => {
		expect(formatVatStatus("verified")).toBe("VERIFIED");
		expect(formatVatStatus("not_verified")).toBe("NOT VERIFIED");
		expect(formatVatStatus("not_checked")).toBe("NOT CHECKED");
		expect(formatVatStatus("error")).toBe("ERROR");
		expect(formatVatStatus("manual_review")).toBe("ERROR");
	});

	test("explanation mentions informational / non-blocking stance for verified", () => {
		expect(getVatStatusExplanation("verified")).toContain("does not by itself approve");
	});
});
