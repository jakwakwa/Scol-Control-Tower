export const MOCK_SCENARIO_COOKIE_NAME = "sc_mock_scenario";

export type MockScenarioEntityType =
	| "proprietor"
	| "company"
	| "close_corporation"
	| "partnership"
	| "npo"
	| "trust"
	| "body_corporate"
	| "other";

export type MockScenarioId =
	| "straight_through"
	| "green_lane"
	| "pre_risk_approve"
	| "pre_risk_reject"
	| "itc_red"
	| "sanctions_red"
	| "fica_red";

export type MockDelayFamily =
	| "facility"
	| "quoteApproval"
	| "quoteSignature"
	| "mandateUpload"
	| "preRisk"
	| "procurement"
	| "itc"
	| "sanctions"
	| "fica"
	| "stage4"
	| "stage5"
	| "stage6";

export type MockPreRiskOutcome = "skip" | "approve" | "reject";
export type MockRiskPath = "standard" | "green_lane";
export type MockItcOutcome = "green" | "red";
export type MockSanctionsOutcome = "clear" | "blocked";
export type MockFicaOutcome = "verified" | "rejected";

export interface MockScenarioDefinition {
	id: MockScenarioId;
	label: string;
	description: string;
	lockedEntityType?: MockScenarioEntityType;
	riskPath: MockRiskPath;
	preRisk: MockPreRiskOutcome;
	itc: MockItcOutcome;
	sanctions: MockSanctionsOutcome;
	fica: MockFicaOutcome;
	delays: Record<MockDelayFamily, number>;
}

export interface PersistedMockScenario {
	id: MockScenarioId;
	selectedAt?: string;
	autoRun?: boolean;
	source?: "overlay" | "api";
}

const DEFAULT_DELAYS: Record<MockDelayFamily, number> = {
	facility: 1200,
	quoteApproval: 900,
	quoteSignature: 1100,
	mandateUpload: 1500,
	preRisk: 1000,
	procurement: 1300,
	itc: 900,
	sanctions: 1400,
	fica: 1000,
	stage4: 1200,
	stage5: 900,
	stage6: 1000,
};

export const MOCK_SCENARIOS: Record<MockScenarioId, MockScenarioDefinition> = {
	straight_through: {
		id: "straight_through",
		label: "Straight Through",
		description:
			"Clean path from Stage 1 to Stage 6 with green outcomes across all checks.",
		lockedEntityType: "company",
		riskPath: "standard",
		preRisk: "skip",
		itc: "green",
		sanctions: "clear",
		fica: "verified",
		delays: DEFAULT_DELAYS,
	},
	green_lane: {
		id: "green_lane",
		label: "Green Lane",
		description: "Straight-through approvals with a manual Green Lane bypass at Stage 4.",
		lockedEntityType: "company",
		riskPath: "green_lane",
		preRisk: "skip",
		itc: "green",
		sanctions: "clear",
		fica: "verified",
		delays: DEFAULT_DELAYS,
	},
	pre_risk_approve: {
		id: "pre_risk_approve",
		label: "Pre-Risk Approved",
		description: "Forces the pre-risk branch in Stage 2 and approves it after a delay.",
		lockedEntityType: "company",
		riskPath: "standard",
		preRisk: "approve",
		itc: "green",
		sanctions: "clear",
		fica: "verified",
		delays: DEFAULT_DELAYS,
	},
	pre_risk_reject: {
		id: "pre_risk_reject",
		label: "Pre-Risk Rejected",
		description:
			"Forces the pre-risk branch in Stage 2 and terminates the workflow there.",
		lockedEntityType: "company",
		riskPath: "standard",
		preRisk: "reject",
		itc: "green",
		sanctions: "clear",
		fica: "verified",
		delays: DEFAULT_DELAYS,
	},
	itc_red: {
		id: "itc_red",
		label: "ITC Red",
		description: "Runs the normal workflow but returns a failed ITC result in Stage 3.",
		lockedEntityType: "company",
		riskPath: "standard",
		preRisk: "skip",
		itc: "red",
		sanctions: "clear",
		fica: "verified",
		delays: DEFAULT_DELAYS,
	},
	sanctions_red: {
		id: "sanctions_red",
		label: "Sanctions Red",
		description:
			"Produces a sanctions block in Stage 3 and pauses for adjudication before confirmation.",
		lockedEntityType: "company",
		riskPath: "standard",
		preRisk: "skip",
		itc: "green",
		sanctions: "blocked",
		fica: "verified",
		delays: DEFAULT_DELAYS,
	},
	fica_red: {
		id: "fica_red",
		label: "FICA Red",
		description:
			"Runs a clean workflow until Stage 3, then forces a rejected FICA validation result.",
		lockedEntityType: "npo",
		riskPath: "standard",
		preRisk: "skip",
		itc: "green",
		sanctions: "clear",
		fica: "rejected",
		delays: DEFAULT_DELAYS,
	},
};

export function isMockScenarioId(value: unknown): value is MockScenarioId {
	return typeof value === "string" && value in MOCK_SCENARIOS;
}

export function getMockScenarioDefinition(
	value?: MockScenarioId | null
): MockScenarioDefinition | null {
	if (!(value && isMockScenarioId(value))) {
		return null;
	}

	return MOCK_SCENARIOS[value];
}

export function parsePersistedMockScenario(value: unknown): PersistedMockScenario | null {
	if (!value || typeof value !== "object") {
		return null;
	}

	const scenario = value as Record<string, unknown>;
	if (!isMockScenarioId(scenario.id)) {
		return null;
	}

	return {
		id: scenario.id,
		selectedAt: typeof scenario.selectedAt === "string" ? scenario.selectedAt : undefined,
		autoRun: scenario.autoRun !== false,
		source:
			scenario.source === "api" || scenario.source === "overlay"
				? scenario.source
				: undefined,
	};
}

export function parseWorkflowMetadata(metadata?: string | null): Record<string, unknown> {
	if (!metadata) {
		return {};
	}

	try {
		const parsed = JSON.parse(metadata) as Record<string, unknown>;
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}

export function readMockScenarioFromMetadata(
	metadata?: string | null
): PersistedMockScenario | null {
	const parsed = parseWorkflowMetadata(metadata);
	return parsePersistedMockScenario(parsed.mockScenario);
}

export function mergeMockScenarioIntoMetadata(
	metadata: string | null | undefined,
	scenario: PersistedMockScenario
): string {
	const parsed = parseWorkflowMetadata(metadata);
	return JSON.stringify({
		...parsed,
		mockScenario: {
			id: scenario.id,
			selectedAt: scenario.selectedAt ?? new Date().toISOString(),
			autoRun: scenario.autoRun ?? true,
			source: scenario.source ?? "overlay",
		},
	});
}

export function getMockDelayMs(
	scenarioId: MockScenarioId | null | undefined,
	family: MockDelayFamily
): number {
	return getMockScenarioDefinition(scenarioId)?.delays[family] ?? 0;
}

export async function sleepForMockDelay(
	scenarioId: MockScenarioId | null | undefined,
	family: MockDelayFamily
): Promise<void> {
	const delay = getMockDelayMs(scenarioId, family);
	if (delay <= 0) {
		return;
	}

	await new Promise(resolve => setTimeout(resolve, delay));
}

export function buildScenarioFacilityPayload(scenarioId: MockScenarioId) {
	const scenario = MOCK_SCENARIOS[scenarioId];
	const requiresPreRisk = scenario.preRisk === "approve" || scenario.preRisk === "reject";

	return {
		mandateVolume: requiresPreRisk ? 950000000 : 180000000,
		mandateType: "DEBIT_ORDER" as const,
		businessType: "COMPANY",
		annualTurnover: requiresPreRisk ? 1000000000 : 4200000000,
		facilityApplicationData: {
			scenarioId,
			requestedBy: "mock_scenario_runner",
		},
		ficaComparisonContext: {
			companyName: `Mock Scenario ${scenario.label}`,
			contactName: "Scenario Tester",
			email: "scenario@test.local",
		},
	};
}
