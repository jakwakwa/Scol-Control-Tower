import { describe, expect, it } from "bun:test";
import { formContent } from "@/app/(unauthenticated)/forms/[token]/content";
import { DecisionEnabledFormTypeSchema, FormDecisionOutcomeSchema } from "@/lib/types";

describe("decision contracts", () => {
	it("accepts only approved/declined decision outcomes", () => {
		expect(FormDecisionOutcomeSchema.parse("APPROVED")).toBe("APPROVED");
		expect(FormDecisionOutcomeSchema.parse("DECLINED")).toBe("DECLINED");
		expect(() => FormDecisionOutcomeSchema.parse("PENDING")).toThrow();
	});

	it("enforces supported decision-enabled form types", () => {
		expect(DecisionEnabledFormTypeSchema.parse("SIGNED_QUOTATION")).toBe(
			"SIGNED_QUOTATION"
		);
		expect(DecisionEnabledFormTypeSchema.parse("STRATCOL_CONTRACT")).toBe(
			"STRATCOL_CONTRACT"
		);
		expect(DecisionEnabledFormTypeSchema.parse("CALL_CENTRE_APPLICATION")).toBe(
			"CALL_CENTRE_APPLICATION"
		);
		expect(() => DecisionEnabledFormTypeSchema.parse("FACILITY_APPLICATION")).toThrow();
	});

	it("keeps decision metadata defined for every decision-enabled applicant form", () => {
		expect(formContent.SIGNED_QUOTATION.decision?.enabled).toBe(true);
		expect(formContent.STRATCOL_CONTRACT.decision?.enabled).toBe(true);
		expect(formContent.CALL_CENTRE_APPLICATION.decision?.enabled).toBe(true);
	});
});
