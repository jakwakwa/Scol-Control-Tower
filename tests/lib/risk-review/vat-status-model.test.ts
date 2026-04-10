import { describe, expect, test } from "bun:test";
import {
	parseVatStatusValue,
	parseVatVerificationPersisted,
	VatStatusSchema,
} from "@/lib/risk-review/vat-status";

describe("VatStatusSchema", () => {
	test("rejects invalid literals", () => {
		expect(VatStatusSchema.safeParse("nope").success).toBe(false);
		expect(VatStatusSchema.safeParse("verified").success).toBe(true);
	});
});

describe("parseVatVerificationPersisted", () => {
	test("parses valid persisted shape", () => {
		const r = parseVatVerificationPersisted({
			checked: true,
			status: "verified",
			vatNumber: "4123456789",
		});
		expect(r).not.toBeNull();
		expect(r?.status).toBe("verified");
		expect(r?.vatNumber).toBe("4123456789");
	});

	test("coerces unknown status strings via parseVatStatusValue", () => {
		const r = parseVatVerificationPersisted({ status: "garbage" });
		expect(r?.status).toBe("not_checked");
	});

	test("returns null for non-objects", () => {
		expect(parseVatVerificationPersisted(null)).toBeNull();
		expect(parseVatVerificationPersisted("x")).toBeNull();
		expect(parseVatVerificationPersisted([1, 2])).toBeNull();
	});
});

describe("parseVatStatusValue", () => {
	test("matches parseStoredVatStatus behavior for strings", () => {
		expect(parseVatStatusValue("manual_review")).toBe("manual_review");
		expect(parseVatStatusValue("bad", "error")).toBe("error");
	});
});
