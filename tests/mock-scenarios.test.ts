import { describe, expect, it } from "bun:test";
import {
	buildScenarioFacilityPayload,
	getMockScenarioDefinition,
	mergeMockScenarioIntoMetadata,
	readMockScenarioFromMetadata,
	type MockScenarioId,
} from "@/lib/mock-scenarios";

describe("mock scenario model", () => {
	it("round-trips persisted workflow metadata", () => {
		const metadata = mergeMockScenarioIntoMetadata(null, {
			id: "green_lane",
			selectedAt: "2026-03-14T10:00:00.000Z",
			autoRun: true,
			source: "overlay",
		});

		expect(readMockScenarioFromMetadata(metadata)).toEqual({
			id: "green_lane",
			selectedAt: "2026-03-14T10:00:00.000Z",
			autoRun: true,
			source: "overlay",
		});
	});

	it("defines deterministic outcomes for each scenario", () => {
		const scenarios: MockScenarioId[] = [
			"straight_through",
			"green_lane",
			"pre_risk_approve",
			"pre_risk_reject",
			"itc_red",
			"sanctions_red",
			"fica_red",
		];

		for (const scenarioId of scenarios) {
			const scenario = getMockScenarioDefinition(scenarioId);
			expect(scenario).not.toBeNull();
			expect(scenario?.label.length).toBeGreaterThan(0);
			expect(scenario?.description.length).toBeGreaterThan(0);
		}
	});

	it("forces pre-risk inputs only for pre-risk scenarios", () => {
		const preRiskPayload = buildScenarioFacilityPayload("pre_risk_approve");
		const standardPayload = buildScenarioFacilityPayload("straight_through");

		expect(preRiskPayload.mandateVolume).toBeGreaterThan(standardPayload.mandateVolume);
		expect(preRiskPayload.mandateVolume).toBeGreaterThan(
			preRiskPayload.annualTurnover * 0.75
		);
		expect(standardPayload.annualTurnover).toBeGreaterThan(standardPayload.mandateVolume);
	});
});