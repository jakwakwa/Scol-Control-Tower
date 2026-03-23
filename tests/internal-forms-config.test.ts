import { describe, expect, it } from "bun:test";
import { FORM_TYPES } from "@/db/schema";
import { INTERNAL_FORM_CONFIGS } from "@/lib/config/internal-forms";

describe("internal forms hub config", () => {
	it("only exposes stratcol_agreement and absa_6995 as internal form types", () => {
		const allowedTypes = INTERNAL_FORM_CONFIGS.map((c) => c.type);
		expect(allowedTypes).toEqual(["stratcol_agreement", "absa_6995"]);
	});

	it("internal form types are a subset of the DB schema enum", () => {
		for (const config of INTERNAL_FORM_CONFIGS) {
			expect(FORM_TYPES).toContain(config.type);
		}
	});

	it("does not include external-only form types", () => {
		const types = INTERNAL_FORM_CONFIGS.map((c) => c.type);
		expect(types).not.toContain("facility_application");
		expect(types).not.toContain("fica_documents");
	});
});
