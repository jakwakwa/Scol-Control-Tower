import { describe, expect, it } from "bun:test";
import {
	checkFlagsEligibility,
	checkRiskLevelEligibility,
	checkScoreEligibility,
	evaluateGreenLaneEligibility,
	GREEN_LANE_RISK_LEVEL,
	GREEN_LANE_SCORE_THRESHOLD,
	type GreenLaneEligibilityInput,
} from "../lib/services/green-lane.service";

describe("Green Lane Eligibility Service", () => {
	describe("checkScoreEligibility", () => {
		it("should pass for score exactly at threshold (85%)", () => {
			const result = checkScoreEligibility(85);
			expect(result.passed).toBe(true);
			expect(result.value).toBe(85);
			expect(result.threshold).toBe(GREEN_LANE_SCORE_THRESHOLD);
		});

		it("should pass for score above threshold", () => {
			const result = checkScoreEligibility(95);
			expect(result.passed).toBe(true);
		});

		it("should fail for score just below threshold (84%)", () => {
			const result = checkScoreEligibility(84);
			expect(result.passed).toBe(false);
			expect(result.value).toBe(84);
		});

		it("should fail for score of 0", () => {
			const result = checkScoreEligibility(0);
			expect(result.passed).toBe(false);
		});

		it("should pass for perfect score (100%)", () => {
			const result = checkScoreEligibility(100);
			expect(result.passed).toBe(true);
		});
	});

	describe("checkRiskLevelEligibility", () => {
		it("should pass for 'green' risk level (case-insensitive)", () => {
			const result = checkRiskLevelEligibility("green");
			expect(result.passed).toBe(true);
			expect(result.value).toBe("green");
			expect(result.required).toBe(GREEN_LANE_RISK_LEVEL);
		});

		it("should pass for 'GREEN' risk level (uppercase)", () => {
			const result = checkRiskLevelEligibility("GREEN");
			expect(result.passed).toBe(true);
		});

		it("should pass for 'Green' risk level (mixed case)", () => {
			const result = checkRiskLevelEligibility("Green");
			expect(result.passed).toBe(true);
		});

		it("should fail for 'amber' risk level", () => {
			const result = checkRiskLevelEligibility("amber");
			expect(result.passed).toBe(false);
			expect(result.value).toBe("amber");
		});

		it("should fail for 'red' risk level", () => {
			const result = checkRiskLevelEligibility("red");
			expect(result.passed).toBe(false);
		});

		it("should fail for null risk level", () => {
			const result = checkRiskLevelEligibility(null);
			expect(result.passed).toBe(false);
			expect(result.value).toBeNull();
		});

		it("should fail for undefined risk level", () => {
			const result = checkRiskLevelEligibility(undefined);
			expect(result.passed).toBe(false);
		});
	});

	describe("checkFlagsEligibility", () => {
		it("should pass for zero flags", () => {
			const result = checkFlagsEligibility([]);
			expect(result.passed).toBe(true);
			expect(result.count).toBe(0);
			expect(result.flags).toEqual([]);
		});

		it("should fail for one flag", () => {
			const result = checkFlagsEligibility(["PEP identified"]);
			expect(result.passed).toBe(false);
			expect(result.count).toBe(1);
			expect(result.flags).toEqual(["PEP identified"]);
		});

		it("should fail for multiple flags", () => {
			const flags = ["Bounced transactions", "Gambling detected", "PEP identified"];
			const result = checkFlagsEligibility(flags);
			expect(result.passed).toBe(false);
			expect(result.count).toBe(3);
			expect(result.flags).toEqual(flags);
		});
	});

	describe("evaluateGreenLaneEligibility", () => {
		it("should be eligible when all criteria are met", () => {
			const input: GreenLaneEligibilityInput = {
				aggregatedScore: 90,
				riskLevel: "green",
				flags: [],
			};
			const result = evaluateGreenLaneEligibility(input);

			expect(result.isEligible).toBe(true);
			expect(result.reasons).toContain("All Green Lane criteria met");
			expect(result.criteria.scoreCheck.passed).toBe(true);
			expect(result.criteria.riskLevelCheck.passed).toBe(true);
			expect(result.criteria.flagsCheck.passed).toBe(true);
		});

		it("should be eligible at exact boundary (85%, green, 0 flags)", () => {
			const input: GreenLaneEligibilityInput = {
				aggregatedScore: 85,
				riskLevel: "green",
				flags: [],
			};
			const result = evaluateGreenLaneEligibility(input);

			expect(result.isEligible).toBe(true);
		});

		it("should not be eligible when score is too low", () => {
			const input: GreenLaneEligibilityInput = {
				aggregatedScore: 84,
				riskLevel: "green",
				flags: [],
			};
			const result = evaluateGreenLaneEligibility(input);

			expect(result.isEligible).toBe(false);
			expect(result.reasons.length).toBeGreaterThan(0);
			expect(result.reasons[0]).toContain("84%");
			expect(result.reasons[0]).toContain("85%");
		});

		it("should not be eligible when risk level is not green", () => {
			const input: GreenLaneEligibilityInput = {
				aggregatedScore: 90,
				riskLevel: "amber",
				flags: [],
			};
			const result = evaluateGreenLaneEligibility(input);

			expect(result.isEligible).toBe(false);
			expect(result.reasons.some(r => r.includes("amber"))).toBe(true);
		});

		it("should not be eligible when flags are present", () => {
			const input: GreenLaneEligibilityInput = {
				aggregatedScore: 90,
				riskLevel: "green",
				flags: ["Gambling indicators detected"],
			};
			const result = evaluateGreenLaneEligibility(input);

			expect(result.isEligible).toBe(false);
			expect(result.reasons.some(r => r.includes("1 flag(s) present"))).toBe(true);
		});

		it("should report all failing criteria when multiple fail", () => {
			const input: GreenLaneEligibilityInput = {
				aggregatedScore: 70,
				riskLevel: "red",
				flags: ["Flag 1", "Flag 2"],
			};
			const result = evaluateGreenLaneEligibility(input);

			expect(result.isEligible).toBe(false);
			expect(result.reasons.length).toBe(3);
			expect(result.criteria.scoreCheck.passed).toBe(false);
			expect(result.criteria.riskLevelCheck.passed).toBe(false);
			expect(result.criteria.flagsCheck.passed).toBe(false);
		});

		it("should handle missing/null risk level", () => {
			const input: GreenLaneEligibilityInput = {
				aggregatedScore: 90,
				riskLevel: null,
				flags: [],
			};
			const result = evaluateGreenLaneEligibility(input);

			expect(result.isEligible).toBe(false);
			expect(result.criteria.riskLevelCheck.passed).toBe(false);
		});

		it("should handle 100% perfect score", () => {
			const input: GreenLaneEligibilityInput = {
				aggregatedScore: 100,
				riskLevel: "green",
				flags: [],
			};
			const result = evaluateGreenLaneEligibility(input);

			expect(result.isEligible).toBe(true);
		});
	});

	describe("Edge Cases", () => {
		it("should handle 0% score", () => {
			const input: GreenLaneEligibilityInput = {
				aggregatedScore: 0,
				riskLevel: "green",
				flags: [],
			};
			const result = evaluateGreenLaneEligibility(input);

			expect(result.isEligible).toBe(false);
			expect(result.criteria.scoreCheck.value).toBe(0);
		});

		it("should handle negative score (edge case)", () => {
			const input: GreenLaneEligibilityInput = {
				aggregatedScore: -5,
				riskLevel: "green",
				flags: [],
			};
			const result = evaluateGreenLaneEligibility(input);

			expect(result.isEligible).toBe(false);
		});

		it("should handle score above 100 (edge case)", () => {
			const input: GreenLaneEligibilityInput = {
				aggregatedScore: 105,
				riskLevel: "green",
				flags: [],
			};
			const result = evaluateGreenLaneEligibility(input);

			expect(result.isEligible).toBe(true);
		});

		it("should handle empty string risk level", () => {
			const input: GreenLaneEligibilityInput = {
				aggregatedScore: 90,
				riskLevel: "",
				flags: [],
			};
			const result = evaluateGreenLaneEligibility(input);

			expect(result.isEligible).toBe(false);
		});

		it("should handle very long flag list", () => {
			const flags = Array.from({ length: 100 }, (_, i) => `Flag ${i + 1}`);
			const input: GreenLaneEligibilityInput = {
				aggregatedScore: 90,
				riskLevel: "green",
				flags,
			};
			const result = evaluateGreenLaneEligibility(input);

			expect(result.isEligible).toBe(false);
			expect(result.criteria.flagsCheck.count).toBe(100);
		});
	});
});
