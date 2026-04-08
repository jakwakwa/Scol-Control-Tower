import { describe, expect, it } from "bun:test";
import { parsePrintModeParam } from "../print-mode-from-params";

describe("parsePrintModeParam", () => {
	describe("valid values", () => {
		it("returns 'procurement' for ?printMode=procurement", () => {
			expect(parsePrintModeParam("?printMode=procurement")).toBe("procurement");
		});

		it("returns 'credit-compliance' for ?printMode=credit-compliance", () => {
			expect(parsePrintModeParam("?printMode=credit-compliance")).toBe("credit-compliance");
		});

		it("handles search string without leading '?'", () => {
			expect(parsePrintModeParam("printMode=procurement")).toBe("procurement");
		});

		it("extracts printMode when other params are present", () => {
			expect(parsePrintModeParam("?tab=risk&printMode=procurement&foo=bar")).toBe(
				"procurement",
			);
		});
	});

	describe("invalid / missing values", () => {
		it("returns null for an unrecognised value", () => {
			expect(parsePrintModeParam("?printMode=unknown")).toBeNull();
		});

		it("returns null for empty string search", () => {
			expect(parsePrintModeParam("")).toBeNull();
		});

		it("returns null when printMode param is absent", () => {
			expect(parsePrintModeParam("?tab=risk")).toBeNull();
		});

		it("returns null for partial match (case-sensitive)", () => {
			expect(parsePrintModeParam("?printMode=Procurement")).toBeNull();
			expect(parsePrintModeParam("?printMode=CREDIT-COMPLIANCE")).toBeNull();
		});

		it("returns null for empty printMode value", () => {
			expect(parsePrintModeParam("?printMode=")).toBeNull();
		});

		it("returns null for '?' only", () => {
			expect(parsePrintModeParam("?")).toBeNull();
		});
	});
});
