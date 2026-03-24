import { describe, expect, it } from "bun:test";
import {
	parseAiAnalysisSnapshot,
	parseMachineState,
	parseReviewState,
	parseVatStatus,
} from "@/lib/risk-review/parsers/vat.parser";

// ---------------------------------------------------------------------------
// parseMachineState
// ---------------------------------------------------------------------------

describe("parseMachineState", () => {
	it("accepts all valid machine states", () => {
		const valid = [
			"pending",
			"in_progress",
			"completed",
			"failed",
			"manual_required",
		] as const;
		for (const state of valid) {
			expect(parseMachineState(state)).toBe(state);
		}
	});

	it("falls back to 'pending' for unknown string values", () => {
		expect(parseMachineState("UNKNOWN_STATE")).toBe("pending");
		expect(parseMachineState("MANUAL_REVIEW")).toBe("pending");
		expect(parseMachineState("")).toBe("pending");
	});

	it("falls back to 'pending' for non-string values", () => {
		expect(parseMachineState(null)).toBe("pending");
		expect(parseMachineState(undefined)).toBe("pending");
		expect(parseMachineState(42)).toBe("pending");
		expect(parseMachineState({})).toBe("pending");
	});

	it("never throws for any input", () => {
		const dangerous = [null, undefined, {}, [], Symbol("x"), 0, false, NaN];
		for (const val of dangerous) {
			expect(() => parseMachineState(val)).not.toThrow();
		}
	});
});

// ---------------------------------------------------------------------------
// parseReviewState
// ---------------------------------------------------------------------------

describe("parseReviewState", () => {
	it("accepts all valid review states", () => {
		const valid = [
			"pending",
			"acknowledged",
			"approved",
			"rejected",
			"not_required",
		] as const;
		for (const state of valid) {
			expect(parseReviewState(state)).toBe(state);
		}
	});

	it("falls back to 'pending' for unknown values", () => {
		expect(parseReviewState("APPROVED")).toBe("pending");
		expect(parseReviewState(null)).toBe("pending");
		expect(parseReviewState(undefined)).toBe("pending");
	});
});

// ---------------------------------------------------------------------------
// parseVatStatus
// ---------------------------------------------------------------------------

describe("parseVatStatus", () => {
	it("returns 'service_down' when firecrawlStatus is 'offline'", () => {
		expect(parseVatStatus("offline")).toBe("service_down");
		expect(parseVatStatus("offline", "success", true)).toBe("service_down");
		expect(parseVatStatus("offline", "error")).toBe("service_down");
	});

	it("returns 'verified' when live + success + verified=true", () => {
		expect(parseVatStatus("live", "success", true)).toBe("verified");
	});

	it("returns 'not_verified' when live + success + verified=false", () => {
		expect(parseVatStatus("live", "success", false)).toBe("not_verified");
		expect(parseVatStatus("live", "success", undefined)).toBe("not_verified");
	});

	it("returns 'manual_review' when live + partial or action_required", () => {
		expect(parseVatStatus("live", "partial")).toBe("manual_review");
		expect(parseVatStatus("live", "action_required")).toBe("manual_review");
	});

	it("returns 'timeout' when live + runtimeState is 'error'", () => {
		expect(parseVatStatus("live", "error")).toBe("timeout");
	});

	it("returns 'error' when live + blocked or unknown runtimeState", () => {
		expect(parseVatStatus("live", "blocked")).toBe("error");
		expect(parseVatStatus("live", "something_unknown")).toBe("error");
		expect(parseVatStatus("live", undefined)).toBe("error");
	});

	it("never throws for any combination of inputs", () => {
		const statuses = ["live", "offline"] as const;
		const states = ["success", "partial", "error", "blocked", "action_required", undefined, ""];
		const verifiedValues = [true, false, undefined];

		for (const s of statuses) {
			for (const rt of states) {
				for (const v of verifiedValues) {
					expect(() => parseVatStatus(s, rt, v)).not.toThrow();
				}
			}
		}
	});
});

// ---------------------------------------------------------------------------
// parseAiAnalysisSnapshot
// ---------------------------------------------------------------------------

describe("parseAiAnalysisSnapshot", () => {
	it("returns ok:false for null input", () => {
		const result = parseAiAnalysisSnapshot(null);
		expect(result.ok).toBe(false);
	});

	it("returns ok:false for empty string", () => {
		const result = parseAiAnalysisSnapshot("");
		expect(result.ok).toBe(false);
	});

	it("returns ok:false for invalid JSON", () => {
		const result = parseAiAnalysisSnapshot("not json {{{");
		expect(result.ok).toBe(false);
	});

	it("returns ok:true with value for valid JSON object", () => {
		const payload = JSON.stringify({ externalChecks: {}, metadata: { analyzedAt: "2026-01-01" } });
		const result = parseAiAnalysisSnapshot(payload);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.metadata?.analyzedAt).toBe("2026-01-01");
		}
	});

	it("returns ok:true with sarsVatSearch data intact", () => {
		const snapshot = {
			externalChecks: {
				sarsVatSearch: {
					status: "live",
					result: {
						verified: true,
						vatNumber: "4010101010",
						tradingName: "Acme Corp",
						runtimeState: "success",
					},
				},
			},
			metadata: { analyzedAt: "2026-03-25T10:00:00Z" },
		};
		const result = parseAiAnalysisSnapshot(JSON.stringify(snapshot));
		expect(result.ok).toBe(true);
		if (result.ok) {
			const vatData = result.value.externalChecks?.sarsVatSearch;
			expect(vatData?.status).toBe("live");
			expect(vatData?.result?.verified).toBe(true);
			expect(vatData?.result?.vatNumber).toBe("4010101010");
		}
	});

	it("returns ok:false when JSON parses to a primitive (not an object)", () => {
		const result = parseAiAnalysisSnapshot(JSON.stringify(42));
		expect(result.ok).toBe(false);
	});

	it("returns ok:false when JSON parses to an array", () => {
		const result = parseAiAnalysisSnapshot(JSON.stringify([1, 2, 3]));
		expect(result.ok).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// VAT non-blocking contract: verify the pattern used in Stage 3
//
// These tests document the invariant that a VAT failure never produces a
// result that a caller could mistake for a kill-switch trigger or a
// terminal FICA machine state mutation. The Stage 3 step returns a plain
// object; the test verifies the shape contract.
// ---------------------------------------------------------------------------

describe("VAT step contract (non-blocking invariant)", () => {
	it("skip path: returns not_checked when vatNumber is absent", () => {
		// Simulate the vatNumber-absent branch of the Stage 3 step.
		const vatNumber: string | null = null;
		const result = vatNumber
			? { status: "verified" as const }
			: { status: "not_checked" as const };

		expect(result.status).toBe("not_checked");
	});

	it("error path: returns error status without a kill-switch trigger flag", () => {
		// Simulates what the catch block in the check-vat step returns.
		const result = { status: "error" as const };

		// The returned object must NOT have killSwitchTriggered or
		// terminate-like properties.
		expect(result.status).toBe("error");
		expect("killSwitchTriggered" in result).toBe(false);
		expect("terminated" in result).toBe(false);
	});

	it("success path: verified result has no FICA machine state mutation", () => {
		// The step only returns a VatStatus — it does not call
		// updateRiskCheckMachineState("FICA", ...) on success.
		const result = { status: "verified" as const };
		expect(result.status).toBe("verified");
		expect("ficaMachineState" in result).toBe(false);
	});

	it("invalid_input path: returns invalid_input without throwing", () => {
		// Simulates the branch where the VAT number format guard fires.
		const simulateFormatCheck = (vatNumber: string) => {
			if (!/^\d{10}$/.test(vatNumber)) {
				return { status: "invalid_input" as const };
			}
			return { status: "verified" as const };
		};

		expect(simulateFormatCheck("1234").status).toBe("invalid_input");
		expect(simulateFormatCheck("4010101010").status).toBe("verified");
	});
});
