import { describe, expect, it } from "bun:test";
import {
	RISK_CHECK_TYPES,
	RISK_CHECK_MACHINE_STATES,
	RISK_CHECK_REVIEW_STATES,
} from "../db/schema";

describe("Risk Check Schema Enums", () => {
	it("should define exactly 4 check types", () => {
		expect(RISK_CHECK_TYPES.length).toBe(4);
		expect(RISK_CHECK_TYPES).toContain("PROCUREMENT");
		expect(RISK_CHECK_TYPES).toContain("ITC");
		expect(RISK_CHECK_TYPES).toContain("SANCTIONS");
		expect(RISK_CHECK_TYPES).toContain("FICA");
	});

	it("should define the correct machine states", () => {
		expect(RISK_CHECK_MACHINE_STATES).toContain("pending");
		expect(RISK_CHECK_MACHINE_STATES).toContain("in_progress");
		expect(RISK_CHECK_MACHINE_STATES).toContain("completed");
		expect(RISK_CHECK_MACHINE_STATES).toContain("failed");
		expect(RISK_CHECK_MACHINE_STATES).toContain("manual_required");
	});

	it("should define the correct review states", () => {
		expect(RISK_CHECK_REVIEW_STATES).toContain("pending");
		expect(RISK_CHECK_REVIEW_STATES).toContain("acknowledged");
		expect(RISK_CHECK_REVIEW_STATES).toContain("approved");
		expect(RISK_CHECK_REVIEW_STATES).toContain("rejected");
		expect(RISK_CHECK_REVIEW_STATES).toContain("not_required");
	});

	it("should not allow a fifth check type", () => {
		const types: readonly string[] = RISK_CHECK_TYPES;
		expect(types).not.toContain("CREDIT");
		expect(types).not.toContain("AML");
	});
});
