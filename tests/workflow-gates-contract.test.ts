import { describe, expect, it } from "bun:test";
import {
	buildAbsaConfirmEndpoint,
	buildContractReviewEndpoint,
	canConfirmAbsa,
	canPerformGateActions,
} from "@/lib/config/workflow-gates";
import type {
	AbsaConfirmBody,
	ContractReviewBody,
} from "@/lib/config/workflow-gates";

describe("workflow gates contract", () => {
	it("contract review gate builds correct API endpoint", () => {
		expect(buildContractReviewEndpoint(42)).toBe(
			"/api/workflows/42/contract/review"
		);
	});

	it("absa confirm gate builds correct API endpoint", () => {
		expect(buildAbsaConfirmEndpoint(42)).toBe(
			"/api/workflows/42/absa/confirm"
		);
	});

	it("contract review request body includes applicantId", () => {
		const body: ContractReviewBody = {
			applicantId: 10,
			reviewNotes: "Looks good",
		};
		expect(body).toHaveProperty("applicantId");
		expect(typeof body.applicantId).toBe("number");
	});

	it("absa confirm request body includes applicantId and optional notes", () => {
		const body: AbsaConfirmBody = {
			applicantId: 10,
			notes: "ABSA approved ref #123",
		};
		expect(body).toHaveProperty("applicantId");
		expect(typeof body.applicantId).toBe("number");
	});

	it("gates are only active at workflow stage 5 with non-terminated status", () => {
		expect(canPerformGateActions(5, "awaiting_human")).toBe(true);
		expect(canPerformGateActions(5, "active")).toBe(true);
		expect(canPerformGateActions(4, "awaiting_human")).toBe(false);
		expect(canPerformGateActions(6, "awaiting_human")).toBe(false);
		expect(canPerformGateActions(null, "awaiting_human")).toBe(false);
		expect(canPerformGateActions(5, "terminated")).toBe(false);
	});

	it("absa confirm gate requires absaPacketSent", () => {
		expect(canConfirmAbsa(5, "awaiting_human", true)).toBe(true);
		expect(canConfirmAbsa(5, "awaiting_human", false)).toBe(false);
		expect(canConfirmAbsa(4, "awaiting_human", true)).toBe(false);
	});
});
